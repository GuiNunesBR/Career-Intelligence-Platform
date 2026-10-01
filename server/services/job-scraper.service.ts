import fetch from 'node-fetch';

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
   * Busca vagas reais usando a API do JSearch (RapidAPI).
   * O JSearch agrega dados do LinkedIn, Indeed e Glassdoor com alta confiabilidade.
   * Se a chave RAPID_API_KEY não estiver configurada no .env, usará vagas simuladas (Mock).
   */
  public async searchJobs(roles: string, location: string, mode: string): Promise<ScrapedJob[]> {
    const apiKey = process.env.RAPID_API_KEY;

    if (!apiKey || apiKey === 'sua_chave_aqui') {
      console.log('[JobScraper] Chave RAPID_API_KEY ausente. Usando dados simulados.');
      return this.getMockJobs(roles, location, mode);
    }

    try {
      console.log(`[JobScraper] Buscando vagas reais na API para: ${roles} em ${location} (${mode})`);
      
      const query = `${roles} ${mode === 'Remote' ? 'Remote' : ''} in ${location}`;
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`API JSearch retornou erro: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Mapeia os resultados da API para o nosso formato interno
      return (result.data || []).map((job: any) => ({
        title: job.job_title,
        company: job.employer_name,
        location: job.job_city ? `${job.job_city}, ${job.job_state || job.job_country}` : (location || 'Remote'),
        seniority: job.job_required_experience?.required_experience_in_months > 60 ? 'Senior' : 'Mid/Pleno',
        url: job.job_apply_link || job.job_google_link,
        employmentType: job.job_employment_type || mode,
        description: job.job_description,
        rawText: `${job.job_title} at ${job.employer_name}. ${job.job_description}`
      }));
    } catch (err) {
      console.error('[JobScraper] Falha ao buscar na API real, caindo para mock:', err);
      return this.getMockJobs(roles, location, mode);
    }
  }

  private getMockJobs(roles: string, location: string, mode: string): ScrapedJob[] {
    const roleArray = roles.split(',').map((r: string) => r.trim());
    const targetRole = roleArray[0] || 'Software Engineer';
    
    return [
      {
        title: targetRole,
        company: "TechNova " + Math.floor(Math.random() * 100),
        location: location || "Remote",
        seniority: "Senior",
        url: "https://linkedin.com/jobs/view/" + Math.floor(Math.random() * 1000000),
        employmentType: mode === 'Remote' ? 'Remote' : 'Full-time',
        description: `Looking for an experienced ${targetRole} to lead our initiatives in ${location || 'a remote setting'}.`,
        rawText: `Looking for an experienced ${targetRole} to lead our initiatives. 5+ years experience required.`
      },
      {
        title: roleArray[1] || `Senior ${targetRole}`,
        company: "DataCorp",
        location: location || "New York",
        seniority: "Lead",
        url: "https://linkedin.com/jobs/view/" + Math.floor(Math.random() * 1000000),
        employmentType: mode || "Hybrid",
        description: `Seeking a skilled ${roleArray[1] || targetRole} with strong analytical skills.`,
        rawText: `Seeking a skilled ${roleArray[1] || targetRole} with strong analytical skills. Requirements: Leadership, Stakeholder management.`
      },
      {
        title: targetRole + " Specialist",
        company: "Innovate INC",
        location: "Remote",
        seniority: "Mid",
        url: "https://linkedin.com/jobs/view/" + Math.floor(Math.random() * 1000000),
        employmentType: "Full-time",
        description: `Join us as a ${targetRole} to revolutionize our platform.`,
        rawText: `Join us as a ${targetRole} to revolutionize our platform. Must have domain expertise.`
      }
    ];
  }
}

export const jobScraperService = new JobScraperService();
