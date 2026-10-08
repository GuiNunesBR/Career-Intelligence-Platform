import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  seniority: string;
  url: string;
  employmentType: string;
  description: string;
  rawText: string;
  /** ISO date from the job card, when LinkedIn shows it. */
  postedAt?: string;
}

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

export interface SearchOptions {
  /** Work modes accepted by the user (LinkedIn f_WT filter). */
  modes?: WorkMode[];
  /** LinkedIn experience-level codes (f_E): 1 intern, 2 entry, 3 associate, 4 mid-senior, 5 director, 6 executive. */
  experienceLevels?: number[];
  /** Posting age window. */
  timeWindow?: 'day' | 'week' | 'month';
  /** Number of result pages (25 cards each). */
  pages?: number;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' };

const WORK_MODE_CODE: Record<WorkMode, number> = { 'On-site': 1, Remote: 2, Hybrid: 3 };
const TIME_WINDOW: Record<NonNullable<SearchOptions['timeWindow']>, string> = {
  day: 'r86400',
  week: 'r604800',
  month: 'r2592000',
};

const STATE_MAP: Record<string, string> = {
  RJ: 'Rio de Janeiro, Brasil',
  SP: 'São Paulo, Brasil',
  MG: 'Minas Gerais, Brasil',
  PR: 'Paraná, Brasil',
  RS: 'Rio Grande do Sul, Brasil',
  SC: 'Santa Catarina, Brasil',
  BA: 'Bahia, Brasil',
  DF: 'Distrito Federal, Brasil',
};

/** Pause between requests to LinkedIn, to keep the scraper polite and avoid blocks. */
const REQUEST_DELAY_MS = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function toSearchLocation(location: string | undefined): string {
  const loc = (location || '').trim();
  if (!loc || loc === 'Anywhere') return 'Brazil';
  if (STATE_MAP[loc.toUpperCase()]) return STATE_MAP[loc.toUpperCase()];
  if (loc === 'Brazil' || loc.toLowerCase().includes('brasil')) return loc;
  return `${loc}, Brasil`;
}

export class JobScraperService {
  /**
   * Searches LinkedIn's public (logged-out) job search for one query, applying the work mode,
   * experience level and posting-age filters on LinkedIn's side and paginating.
   */
  public async searchJobs(query: string, location: string | undefined, options: SearchOptions = {}): Promise<ScrapedJob[]> {
    const params = new URLSearchParams({
      keywords: query,
      location: toSearchLocation(location),
      f_TPR: TIME_WINDOW[options.timeWindow || 'week'],
    });
    if (options.modes?.length) params.set('f_WT', options.modes.map((m) => WORK_MODE_CODE[m]).join(','));
    if (options.experienceLevels?.length) params.set('f_E', [...new Set(options.experienceLevels)].sort().join(','));

    const jobs: ScrapedJob[] = [];
    for (let page = 0; page < (options.pages || 1); page++) {
      if (page > 0) params.set('start', String(page * 25));
      // The guest endpoint returns the same cards as the public search page, and paginates
      const url =
        page === 0
          ? `https://www.linkedin.com/jobs/search/?${params}`
          : `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;
      try {
        console.log(`[JobScraper] GET ${url}`);
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) {
          console.warn(`[JobScraper] LinkedIn HTTP ${response.status} for "${query}" (page ${page + 1})`);
          break;
        }
        const pageJobs = this.parseCards(await response.text());
        jobs.push(...pageJobs);
        if (pageJobs.length < 10) break; // last page
      } catch (err) {
        console.error(`[JobScraper] Request failed for "${query}":`, err);
        break;
      }
      await sleep(REQUEST_DELAY_MS);
    }
    return jobs;
  }

  private parseCards(html: string): ScrapedJob[] {
    const $ = cheerio.load(html);
    const jobs: ScrapedJob[] = [];
    $('li').each((_, el) => {
      const card = $(el).find('.base-search-card').addBack('.base-search-card');
      const title = card.find('h3.base-search-card__title').text().trim();
      const company = card.find('h4.base-search-card__subtitle').text().trim();
      const location = card.find('.job-search-card__location').text().trim();
      let link = card.find('.base-card__full-link').attr('href') || card.attr('href') || '';
      if (link.includes('?')) link = link.split('?')[0]; // drop tracking params
      const postedAt = card.find('time').attr('datetime') || undefined;

      if (title && company && link) {
        jobs.push({
          title,
          company,
          location,
          // Real seniority comes from the description (job parser); the card has only the title
          seniority: 'Não informado',
          url: link,
          employmentType: 'Não informado',
          description: '',
          rawText: '',
          postedAt,
        });
      }
    });
    return jobs;
  }

  async fetchJobDescription(url: string): Promise<string> {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) return '';
      const $ = cheerio.load(await response.text());
      // Keep line breaks between paragraphs/list items so requirements stay separable
      const markup = $('.show-more-less-html__markup');
      markup.find('br').replaceWith('\n');
      markup.find('li, p').each((_, el) => {
        $(el).append('\n');
      });
      return markup.text().replace(/\n{3,}/g, '\n\n').trim();
    } catch (e) {
      console.warn(`[JobScraper] Failed to fetch description for ${url}:`, e);
      return '';
    } finally {
      await sleep(REQUEST_DELAY_MS);
    }
  }
}

export const jobScraperService = new JobScraperService();
