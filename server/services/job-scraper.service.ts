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
}

export class JobScraperService {
  /**
   * Busca vagas reais usando a busca pública anônima do LinkedIn.
   * Não precisa de conta/senha. Usa o mesmo método do repo linkedin-job-searcher.
   */
  public async searchJobs(roles: string, location: string, mode: string, limit: number = 15): Promise<ScrapedJob[]> {
    try {
      console.log(`[JobScraper] Buscando vagas reais no LinkedIn público para: ${roles} | ${location} | ${mode} (Limite: ${limit})`);
      
      const queryTerm = roles.split(',')[0].trim();
      
      const stateMap: Record<string, string> = {
        'RJ': 'Rio de Janeiro, Brasil',
        'SP': 'São Paulo, Brasil',
        'MG': 'Minas Gerais, Brasil',
        'PR': 'Paraná, Brasil',
        'RS': 'Rio Grande do Sul, Brasil',
        'SC': 'Santa Catarina, Brasil',
        'BA': 'Bahia, Brasil',
        'DF': 'Distrito Federal, Brasil'
      };

      let searchLocation = location;
      const upperLoc = location.trim().toUpperCase();
      
      if (stateMap[upperLoc]) {
        searchLocation = stateMap[upperLoc];
      } else if (location !== 'Anywhere' && location !== 'Brazil' && !location.toLowerCase().includes('brasil')) {
        searchLocation = `${location}, Brasil`;
      } else if (location === 'Anywhere') {
        searchLocation = 'Brazil';
      }
      
      const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(queryTerm)}&location=${encodeURIComponent(searchLocation)}&f_TPR=r86400`;
      
      console.log(`[JobScraper] Acessando URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        }
      });
      
      if (!response.ok) {
        throw new Error(`LinkedIn retornou erro HTTP: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const jobsData: ScrapedJob[] = [];
      
      // Parse public LinkedIn job cards
      $('.jobs-search__results-list > li').each((_, el) => {
        // We will collect as many as the page has (up to 25 usually)
        // Deduplication and limit slicing happens in the worker
        const jobCard = $(el).find('.base-search-card');
        const title = jobCard.find('h3.base-search-card__title').text().trim();
        const company = jobCard.find('h4.base-search-card__subtitle').text().trim();
        const jobLocation = jobCard.find('.job-search-card__location').text().trim();
        let link = jobCard.find('.base-card__full-link').attr('href') || jobCard.attr('href') || '';
        
        if (link && link.includes('?')) {
           link = link.split('?')[0]; // Limpa tracking params
        }

        if (title && company && link) {
          jobsData.push({
            title,
            company,
            location: jobLocation,
            seniority: title.toLowerCase().includes('senior') || title.toLowerCase().includes('sênior') ? 'Senior' : 'Mid/Pleno',
            url: link,
            employmentType: 'Full-time',
            description: `Vaga para ${title} na ${company} localizada em ${jobLocation}. Para mais detalhes e aplicar, acesse o link da vaga.`,
            rawText: `${title} at ${company}. Location: ${jobLocation}\nLink: ${link}\n\nVaga extraída do LinkedIn.`
          });
        }
      });
      
      if (jobsData.length === 0) {
        console.log('[JobScraper] LinkedIn não retornou vagas (possível rate-limit/bloqueio ou 0 resultados).');
      }

      return jobsData;
    } catch (err) {
      console.error('[JobScraper] Falha no scraping do LinkedIn:', err);
      return [];
    }
  }

  async fetchJobDescription(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        }
      });
      if (!response.ok) return '';
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // LinkedIn public job pages usually have the description in .show-more-less-html__markup or similar
      const description = $('.show-more-less-html__markup').text().trim();
      return description || '';
    } catch (e) {
      console.warn(`Failed to fetch description for ${url}:`, e);
      return '';
    }
  }
}

export const jobScraperService = new JobScraperService();
