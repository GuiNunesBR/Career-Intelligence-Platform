import * as cheerio from 'cheerio';
import type { WorkMode } from '../../src/shared/searchPlan.js';

// LinkedIn public "jobs-guest" client (no login, no API key), same endpoints as the
// linkedin-jobs-search extension. Keep volume low: automated access may conflict with
// LinkedIn's Terms of Service. Every request is spaced and the run has a request budget.

export interface JobCard {
  linkedinId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  /** ISO date from the card, when LinkedIn shows it. */
  postedAt?: string;
}

export interface JobDetail {
  linkedinId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  seniority?: string;
  employmentType?: string;
  jobFunction?: string;
  industries?: string;
  applicants?: string;
  postedAgo?: string;
}

export interface CardSearch {
  keywords: string;
  location: string;
  postedWithinDays: number;
  modes: WorkMode[];
  /** Number of 10-card pages to read (stops early when LinkedIn runs out). */
  pages: number;
}

const SEARCH_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const DETAIL_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting';
const PAGE_SIZE = 10;
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};
const WORK_MODE_CODE: Record<WorkMode, string> = { 'On-site': '1', Remote: '2', Hybrid: '3' };

/** Pause between requests, to stay polite and avoid blocks. */
const REQUEST_DELAY_MS = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class LinkedInRateLimitError extends Error {
  constructor() {
    super('O LinkedIn está limitando as requisições (HTTP 429). Espere alguns minutos e rode a busca de novo.');
  }
}

export function buildSearchUrl(search: Omit<CardSearch, 'pages'>, start: number): string {
  const params = new URLSearchParams({ keywords: search.keywords, location: search.location });
  if (search.postedWithinDays > 0) params.set('f_TPR', `r${Math.round(search.postedWithinDays * 86400)}`);
  if (search.modes.length) params.set('f_WT', search.modes.map((m) => WORK_MODE_CODE[m]).join(','));
  params.set('start', String(start));
  return `${SEARCH_URL}?${params}`;
}

/** LinkedIn numeric job id from a URL, URN or id. */
export function linkedinJobId(input: string): string | null {
  const s = String(input || '').trim();
  const m =
    s.match(/urn:li:jobPosting:(\d+)/) ||
    s.match(/[?&]currentJobId=(\d{6,})/) ||
    s.match(/-(\d{6,})\/?(?:\?|$)/) ||
    s.match(/\/(\d{6,})\/?(?:\?|$)/);
  if (m) return m[1];
  return /^\d{6,}$/.test(s) ? s : null;
}

export function parseCards(html: string): JobCard[] {
  const $ = cheerio.load(html);
  const cards: JobCard[] = [];
  $('[data-entity-urn*="jobPosting"]').each((_, el) => {
    const card = $(el);
    const linkedinId = linkedinJobId(card.attr('data-entity-urn') || '');
    // Some cards nest location/contract lines inside the title element: keep the first line
    const title = (card.find('.base-search-card__title').text().trim() || card.find('.sr-only').first().text().trim()).split('\n')[0].trim();
    const company = card.find('.base-search-card__subtitle').text().replace(/\s+/g, ' ').trim();
    if (!linkedinId || !title) return;
    cards.push({
      linkedinId,
      title,
      company,
      location: card.find('.job-search-card__location').text().trim(),
      url: `https://www.linkedin.com/jobs/view/${linkedinId}`,
      postedAt: card.find('time').attr('datetime') || undefined,
    });
  });
  return cards;
}

export function parseDetail(html: string, linkedinId: string): JobDetail {
  const $ = cheerio.load(html);
  const markup = $('.show-more-less-html__markup').first().length
    ? $('.show-more-less-html__markup').first()
    : $('.description__text').first();
  // Keep line breaks between paragraphs/list items so requirements stay separable
  markup.find('br').replaceWith('\n');
  markup.find('li').each((_, el) => {
    $(el).prepend('• ').append('\n');
  });
  markup.find('p, ul, ol, div, h1, h2, h3, h4').each((_, el) => {
    $(el).append('\n');
  });
  const description = markup
    .text()
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const criteria: Record<string, string> = {};
  $('.description__job-criteria-item').each((_, el) => {
    const key = $(el).find('.description__job-criteria-subheader').text().trim().toLowerCase();
    const value = $(el).find('.description__job-criteria-text').text().trim();
    if (key) criteria[key] = value;
  });
  const pick = (...keys: string[]) => keys.map((k) => criteria[k]).find(Boolean);

  return {
    linkedinId,
    title: $('.top-card-layout__title, .topcard__title').first().text().trim(),
    company: $('.topcard__org-name-link').first().text().trim(),
    location: $('.topcard__flavor--bullet').first().text().trim(),
    description,
    seniority: pick('seniority level', 'nível de experiência'),
    employmentType: pick('employment type', 'tipo de emprego'),
    jobFunction: pick('job function', 'função', 'função de trabalho'),
    industries: pick('industries', 'setores'),
    applicants: $('.num-applicants__caption').first().text().trim() || undefined,
    postedAgo: $('.posted-time-ago__text').first().text().trim() || undefined,
  };
}

export class JobScraperService {
  /** Requests made by this instance (one instance per search run). */
  public requests = 0;

  constructor(private readonly maxRequests = 90) {}

  /** GET with backoff on 429/5xx; "" on 404 or when the request budget is spent. */
  private async fetchHtml(url: string): Promise<string> {
    if (this.requests >= this.maxRequests) return '';
    let delay = 2000;
    for (let attempt = 0; attempt < 4; attempt++) {
      // Spaced and jittered: bursts are what trigger LinkedIn's 429s
      if (this.requests > 0) await sleep(REQUEST_DELAY_MS + Math.random() * 800);
      this.requests++;
      let response: Response;
      try {
        response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
      } catch (err) {
        console.warn(`[JobScraper] network error (${attempt + 1}/4): ${(err as Error).message}`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      if (response.status === 404) return '';
      if (response.status === 429 || response.status >= 500) {
        console.warn(`[JobScraper] HTTP ${response.status} (${attempt + 1}/4)`);
        if (attempt === 3 && response.status === 429) throw new LinkedInRateLimitError();
        await sleep(delay + Math.random() * 500);
        delay *= 2;
        continue;
      }
      if (!response.ok) {
        console.warn(`[JobScraper] HTTP ${response.status} for ${url}`);
        return '';
      }
      return response.text();
    }
    return '';
  }

  /** Reads up to `pages` pages of cards for one keyword/location; de-duplicated by job id. */
  async searchCards(search: CardSearch): Promise<JobCard[]> {
    const seen = new Set<string>();
    const cards: JobCard[] = [];
    for (let page = 0; page < search.pages; page++) {
      const html = await this.fetchHtml(buildSearchUrl(search, page * PAGE_SIZE));
      const pageCards = parseCards(html);
      if (!pageCards.length) break;
      for (const c of pageCards) {
        if (seen.has(c.linkedinId)) continue;
        seen.add(c.linkedinId);
        cards.push(c);
      }
      if (pageCards.length < PAGE_SIZE) break;
    }
    return cards;
  }

  /** Full posting (description + LinkedIn criteria); null when it is gone or unreadable. */
  async fetchDetail(linkedinId: string): Promise<JobDetail | null> {
    const html = await this.fetchHtml(`${DETAIL_URL}/${linkedinId}`);
    if (!html) return null;
    const detail = parseDetail(html, linkedinId);
    return detail.description ? detail : null;
  }
}
