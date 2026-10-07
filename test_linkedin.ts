import * as cheerio from 'cheerio';

async function run() {
  const url = `https://www.linkedin.com/jobs/search/?keywords=Analista%20de%20Marketing&location=RJ%2C%20Brasil&f_TPR=r86400`;
  console.log('Fetching', url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    }
  });
  
  if (!response.ok) {
    console.error('Failed', response.status);
    return;
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const jobs: any[] = [];
  $('.jobs-search__results-list > li').each((_, el) => {
    const jobCard = $(el).find('.base-search-card');
    const title = jobCard.find('h3.base-search-card__title').text().trim();
    const company = jobCard.find('h4.base-search-card__subtitle').text().trim();
    const jobLocation = jobCard.find('.job-search-card__location').text().trim();
    const link = jobCard.find('.base-card__full-link').attr('href') || jobCard.attr('href') || '';
    
    jobs.push({ title, company, jobLocation, link });
  });
  
  console.log(JSON.stringify(jobs, null, 2));
}

run();
