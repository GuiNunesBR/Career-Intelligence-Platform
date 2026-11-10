import assert from 'assert';
import { atsCheck, buildCvHtml, renderPdf } from '../server/services/cv-render.service.js';
import type { TailoredCV, UserCareerLake } from '../src/shared/types.js';

// Round trip of the ATS CV export: build the HTML, render it with Puppeteer and read the PDF
// back the way an ATS does (text layer only). Needs a Chrome for Puppeteer; CI installs one.

const LAKE: UserCareerLake = {
  profile: {
    headline: 'Analista de QA',
    contact: {
      fullName: 'Ana Teste',
      email: 'ana.teste@example.com',
      phone: '(11) 91234-5678',
      city: 'São Paulo',
      state: 'SP',
    },
    education: [
      { degree: 'Bacharelado', field: 'Sistemas de Informação', institution: 'Universidade Exemplo', year: '2020' },
    ],
    languages: [{ language: 'Inglês', proficiency: 'Avançado' }],
    certifications: [{ name: 'ISTQB CTFL', issuer: 'ISTQB', year: '2022' }],
  } as any,
  experiences: [
    {
      title: 'Analista de QA',
      company: 'Empresa Exemplo',
      description: 'Automação de testes ponta a ponta com Playwright',
      startDate: '2021-01',
    } as any,
  ],
  projects: [],
  skills: [{ name: 'Playwright', category: 'Tool' } as any],
  evidences: [],
} as any;

const CV: TailoredCV = {
  id: 'cv1',
  userId: 'u1',
  jobId: 'j1',
  mode: 'balanced' as any,
  language: 'pt-br',
  headline: 'Analista de QA',
  summary: 'Analista de QA com foco em automação de testes.',
  selectedExperiences: [
    {
      experienceId: 'e1',
      company: 'Empresa Exemplo',
      title: 'Analista de QA',
      period: '2021 - atual',
      bullets: ['Automatizei a regressão diária com Playwright'],
      evidenceCitations: [],
    },
  ],
  selectedSkills: [{ name: 'Playwright', category: 'Tool', evidenceRef: 's1' }],
  selectedProjects: [{ name: 'Monitor de preços', description: 'Alertas de preço', outcomes: ['Alertas no Telegram'] }],
  atsKeywordsMatched: [],
  honestyAuditNotes: [],
  jobKeywords: ['Playwright', 'Kubernetes'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

const PT_SECTIONS = [
  'Resumo Profissional',
  'Experiência Profissional',
  'Formação Acadêmica',
  'Habilidades',
  'Idiomas',
  'Certificações',
  'Projetos',
];

export async function runCvPdfTests() {
  console.log('  - HTML escapes user content');
  const hostile = { ...CV, headline: '<script>alert(1)</script>' };
  const html = buildCvHtml(hostile, LAKE, 'Fallback');
  assert.ok(!html.includes('<script>alert(1)</script>'), 'headline must be escaped');
  assert.ok(html.includes('&lt;script&gt;'), 'escaped headline must be present');

  console.log('  - Renders a one-page PDF with a text layer');
  const pdf = await renderPdf(buildCvHtml(CV, LAKE, 'Fallback'));
  assert.strictEqual(pdf.subarray(0, 5).toString('latin1'), '%PDF-');

  const ats = await atsCheck(pdf, CV, LAKE);
  assert.strictEqual(ats.pages, 1);
  assert.ok(ats.extractedText.includes('Ana Teste'), 'name must be in the text layer');

  console.log('  - ATS reads every section, in order');
  assert.deepStrictEqual(ats.sectionsFound, PT_SECTIONS);
  assert.strictEqual(ats.sectionsInOrder, true);

  console.log('  - ATS finds the contact data in the body');
  assert.deepStrictEqual(ats.contactFound, { email: true, phone: true });

  console.log('  - Keywords: backed by the Lake vs. missing from it');
  assert.deepStrictEqual(ats.keywordsYouHave, [{ keyword: 'Playwright', inCv: true }]);
  assert.deepStrictEqual(ats.keywordsMissingFromLake, ['Kubernetes']);
  assert.strictEqual(ats.keywordCoverage, 100);
}
