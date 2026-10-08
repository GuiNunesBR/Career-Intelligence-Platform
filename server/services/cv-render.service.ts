import type { Browser } from 'puppeteer';
import type { TailoredCV, UserCareerLake } from '../../src/shared/types.js';
import { normalizeForMatch } from '../../src/shared/text.js';
import { extractResumeText } from './pdf-extract.service.js';

// ATS-friendly CV rendering: single column, linear reading order, standard section titles,
// contact data in the body (not in header/footer), standard font, real text layer.

const SECTION_TITLES = {
  'pt-br': {
    summary: 'Resumo Profissional', experience: 'Experiência Profissional', education: 'Formação Acadêmica',
    skills: 'Habilidades', languages: 'Idiomas', certifications: 'Certificações', projects: 'Projetos',
  },
  en: {
    summary: 'Professional Summary', experience: 'Work Experience', education: 'Education',
    skills: 'Skills', languages: 'Languages', certifications: 'Certifications', projects: 'Projects',
  },
  es: {
    summary: 'Resumen Profesional', experience: 'Experiencia Profesional', education: 'Formación Académica',
    skills: 'Habilidades', languages: 'Idiomas', certifications: 'Certificaciones', projects: 'Proyectos',
  },
} as const;

type Lang = keyof typeof SECTION_TITLES;

// Skill categories are stored in English in the Lake; the CV shows them in its own language
const SKILL_CATEGORY_LABELS: Record<Lang, Record<string, string>> = {
  'pt-br': { Tool: 'Ferramentas', Technical: 'Técnicas', Functional: 'Competências', Domain: 'Setor', Leadership: 'Liderança', Soft: 'Comportamentais', Language: 'Idiomas' },
  en: { Tool: 'Tools', Technical: 'Technical', Functional: 'Competencies', Domain: 'Industry', Leadership: 'Leadership', Soft: 'Soft skills', Language: 'Languages' },
  es: { Tool: 'Herramientas', Technical: 'Técnicas', Functional: 'Competencias', Domain: 'Sector', Leadership: 'Liderazgo', Soft: 'Habilidades blandas', Language: 'Idiomas' },
};
const langOf = (cv: TailoredCV): Lang => (cv.language && cv.language in SECTION_TITLES ? cv.language : 'pt-br') as Lang;

const esc = (s: string | undefined) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildCvHtml(cv: TailoredCV, lake: UserCareerLake, fallbackName: string): string {
  const t = SECTION_TITLES[langOf(cv)];
  const c = lake.profile?.contact || {};
  const name = c.fullName || fallbackName;
  const place = [c.city, c.state].filter(Boolean).join('/') || lake.profile?.location;
  const contactLine = [c.email, c.phone, place, c.linkedin].filter(Boolean).map(esc).join(' | ');

  const skillsByCategory = new Map<string, string[]>();
  for (const s of cv.selectedSkills) {
    const cat = SKILL_CATEGORY_LABELS[langOf(cv)][s.category] || s.category || '';
    skillsByCategory.set(cat, [...(skillsByCategory.get(cat) || []), s.name]);
  }

  const section = (title: string, body: string) => (body.trim() ? `<h2>${esc(title)}</h2>${body}` : '');

  const experience = cv.selectedExperiences
    .map(
      (e) => `<div class="item"><p class="role"><b>${esc(e.title)}</b> | ${esc(e.company)}${e.period ? ` | ${esc(e.period)}` : ''}</p>${
        e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''
      }</div>`
    )
    .join('');

  const education = (lake.profile?.education || [])
    .map((ed) => `<p>${esc([ed.degree, ed.field].filter(Boolean).join(', '))} | ${esc(ed.institution)}${ed.year ? ` | ${esc(ed.year)}` : ''}</p>`)
    .join('');

  const skills = [...skillsByCategory]
    .map(([cat, names]) => `<p>${cat ? `<b>${esc(cat)}:</b> ` : ''}${names.map(esc).join(', ')}</p>`)
    .join('');

  const languages = (lake.profile?.languages || [])
    .map((l: any) => (typeof l === 'string' ? esc(l) : `${esc(l.language)}${l.proficiency ? ` (${esc(l.proficiency)})` : ''}`))
    .join(', ');

  const certifications = (lake.profile?.certifications || [])
    .map((cert) => `<p>${esc(cert.name)}${cert.issuer ? ` | ${esc(cert.issuer)}` : ''}${cert.year ? ` | ${esc(cert.year)}` : ''}</p>`)
    .join('');

  const projects = cv.selectedProjects
    .map((p) => `<div class="item"><p><b>${esc(p.name)}</b>${p.description ? ` | ${esc(p.description)}` : ''}</p>${
      p.outcomes.length ? `<ul>${p.outcomes.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''
    }</div>`)
    .join('');

  return `<!doctype html><html lang="${langOf(cv) === 'pt-br' ? 'pt-BR' : langOf(cv)}"><head><meta charset="utf-8"><title>${esc(name)}</title>
<style>
  @page { size: A4; margin: 18mm 18mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.35; color: #000; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 2pt; }
  .headline { font-size: 11pt; font-weight: bold; margin: 0 0 2pt; }
  .contact { margin: 0 0 8pt; }
  h2 { font-size: 11.5pt; text-transform: uppercase; border-bottom: 1px solid #000; margin: 12pt 0 4pt; padding-bottom: 1pt; }
  p { margin: 0 0 3pt; }
  ul { margin: 2pt 0 6pt 16pt; padding: 0; }
  li { margin: 0 0 2pt; }
  .item { margin-bottom: 6pt; page-break-inside: avoid; }
</style></head><body>
<h1>${esc(name)}</h1>
${cv.headline ? `<p class="headline">${esc(cv.headline)}</p>` : ''}
${contactLine ? `<p class="contact">${contactLine}</p>` : ''}
${section(t.summary, cv.summary ? `<p>${esc(cv.summary)}</p>` : '')}
${section(t.experience, experience)}
${section(t.education, education)}
${section(t.skills, skills)}
${section(t.languages, languages ? `<p>${languages}</p>` : '')}
${section(t.certifications, certifications)}
${section(t.projects, projects)}
</body></html>`;
}

let browserPromise: Promise<Browser> | null = null;
async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const puppeteer = (await import('puppeteer')).default;
    browserPromise = puppeteer
      .launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
      .catch((err) => {
        browserPromise = null;
        throw new Error(`Não foi possível iniciar o gerador de PDF (Chrome/Puppeteer): ${err.message}`);
      });
  }
  return browserPromise;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // No network access is needed: the HTML is self-contained
    await page.setJavaScriptEnabled(false);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: false, preferCSSPageSize: true }));
  } finally {
    await page.close();
  }
}

export interface AtsCheck {
  pages: number;
  /** Section titles found in the text extracted from the PDF, in reading order. */
  sectionsFound: string[];
  sectionsInOrder: boolean;
  contactFound: { email: boolean; phone: boolean };
  /** Job keywords the Lake supports, and whether each appears in the CV text. */
  keywordsYouHave: Array<{ keyword: string; inCv: boolean }>;
  /** Job keywords not found anywhere in the Lake. */
  keywordsMissingFromLake: string[];
  keywordCoverage: number | null;
  warnings: string[];
  extractedText: string;
}

/** Reads the generated PDF back like an ATS would (text layer only) and checks it. */
export async function atsCheck(pdf: Buffer, cv: TailoredCV, lake: UserCareerLake): Promise<AtsCheck> {
  const extraction = await extractResumeText(pdf);
  const text = extraction.text;
  const normText = ` ${normalizeForMatch(text)} `;
  const t = SECTION_TITLES[langOf(cv)];

  const expected = [t.summary, t.experience, t.education, t.skills, t.languages, t.certifications, t.projects];
  const positions = expected
    .map((title) => ({ title, pos: text.toUpperCase().indexOf(title.toUpperCase()) }))
    .filter((s) => s.pos >= 0);
  const sectionsInOrder = positions.every((s, i) => i === 0 || s.pos > positions[i - 1].pos);

  const lakeText = ` ${normalizeForMatch(
    [
      lake.profile?.headline, lake.profile?.summary,
      ...lake.experiences.map((e) => `${e.title} ${e.description}`),
      ...lake.evidences.map((ev) => `${ev.statement} ${(ev.tools || []).join(' ')}`),
      ...lake.skills.map((s) => s.name),
      ...(lake.profile?.certifications || []).map((c) => c.name),
      ...(lake.profile?.languages || []).map((l: any) => (typeof l === 'string' ? l : l.language)),
    ].join(' ')
  )} `;
  const has = (haystack: string, kw: string) => haystack.includes(` ${normalizeForMatch(kw)} `);
  // "Inglês intermediário" is covered by any Lake entry for that language (level is reviewed by the user)
  const lakeLanguages = (lake.profile?.languages || []).map((l: any) => normalizeForMatch(typeof l === 'string' ? l : l.language)).filter(Boolean);
  const lakeHas = (kw: string) => has(lakeText, kw) || lakeLanguages.some((lang) => normalizeForMatch(kw).startsWith(`${lang} `));
  const cvHasLanguage = (kw: string) => lakeLanguages.some((lang) => normalizeForMatch(kw).startsWith(`${lang} `) && normText.includes(` ${lang} `));

  const keywords = [...new Set((cv.jobKeywords || []).map((k) => k.trim()).filter(Boolean))];
  const keywordsYouHave = keywords.filter(lakeHas).map((k) => ({ keyword: k, inCv: has(normText, k) || cvHasLanguage(k) }));
  const keywordsMissingFromLake = keywords.filter((k) => !lakeHas(k));
  const keywordCoverage = keywordsYouHave.length
    ? Math.round((keywordsYouHave.filter((k) => k.inCv).length / keywordsYouHave.length) * 100)
    : null;

  const warnings: string[] = [];
  const missingInCv = keywordsYouHave.filter((k) => !k.inCv).map((k) => k.keyword);
  if (missingInCv.length) warnings.push(`Você tem, mas não aparecem no CV: ${missingInCv.join(', ')}.`);
  if (keywordsMissingFromLake.length) {
    warnings.push(`A vaga pede e o Career Lake não comprova: ${keywordsMissingFromLake.join(', ')}. Se você tiver, registre a evidência no Lake.`);
  }
  if (!sectionsInOrder) warnings.push('As seções não foram lidas na ordem esperada.');
  const contactFound = { email: /[\w.+-]+@[\w-]+\.[\w.]+/.test(text), phone: /\d{4,5}[-\s]?\d{4}/.test(text) };
  if (!contactFound.email) warnings.push('E-mail não encontrado no texto do CV (complete o contato no Career Lake).');
  const years = new Set(lake.experiences.map((e) => e.startDate?.slice(0, 4)).filter(Boolean)).size;
  if (extraction.pages > 2) warnings.push(`O CV tem ${extraction.pages} páginas; o recomendado é no máximo 2.`);
  else if (extraction.pages === 2 && years <= 2) warnings.push('Para menos de ~5 anos de experiência, prefira 1 página.');

  return {
    pages: extraction.pages,
    sectionsFound: positions.map((s) => s.title),
    sectionsInOrder,
    contactFound,
    keywordsYouHave,
    keywordsMissingFromLake,
    keywordCoverage,
    warnings,
    extractedText: text,
  };
}
