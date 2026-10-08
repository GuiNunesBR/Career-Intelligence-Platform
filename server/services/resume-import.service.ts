import type { ParsedResume } from '../ai.js';
import type {
  CareerProfile,
  Certification,
  ContactInfo,
  Evidence,
  EvidenceConfidence,
  Experience,
  Project,
  Skill,
} from '../../src/shared/types.js';
import { normalizeForMatch, ungroundedNumbers } from '../../src/shared/text.js';

// Turns the model's resume extraction into Lake records and checks it against the
// original text in code: excerpts must exist in the resume, metrics must appear in their
// excerpt, and contact data must stay out of the headline.

/** `source` of evidences created by a CV import (replaced on the next import). */
export const CV_EVIDENCE_SOURCE = 'Currículo importado';

export type ImportedEvidence = Omit<Evidence, 'id' | 'userId' | 'createdAt' | 'experienceId' | 'projectId'>;

export interface ResumeImportPayload {
  profile: Pick<
    CareerProfile,
    'headline' | 'summary' | 'location' | 'targetRoles' | 'languages' | 'education' | 'contact' | 'certifications'
  >;
  experiences: Array<{
    data: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'origin'>;
    evidences: ImportedEvidence[];
  }>;
  projects: Array<{
    data: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'origin' | 'experienceId'>;
    /** Index into `experiences` when the project belongs to one of them. */
    experienceIndex?: number;
    evidences: ImportedEvidence[];
  }>;
  skills: Array<Omit<Skill, 'id' | 'userId' | 'origin'>>;
}

export interface ResumeImportReport {
  experiences: number;
  evidences: number;
  projects: number;
  skills: number;
  /** Evidences whose excerpt could not be found in the resume text. */
  lowConfidence: string[];
  warnings: string[];
}

const HEADLINE_MAX = 120;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[\w.-]+\.(?:com|br|io|net|org)(?:\/\S*)?/gi;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PHONE_RE = /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g;

/** How well an excerpt is supported by the resume text. */
function excerptConfidence(excerpt: string, normalizedResume: string): EvidenceConfidence {
  const norm = normalizeForMatch(excerpt);
  if (!norm) return 'low';
  if (normalizedResume.includes(norm)) return 'high';
  // Excerpts may span a line break or differ in punctuation: fall back to word coverage
  const words = norm.split(' ').filter((w) => w.length > 2);
  if (!words.length) return 'low';
  const found = words.filter((w) => normalizedResume.includes(w)).length / words.length;
  return found >= 0.85 ? 'medium' : 'low';
}

/** Keeps a metric only if its digits appear in the excerpt (no computed or estimated numbers). */
function groundedMetric(metric: string, excerpt: string): string | undefined {
  const m = metric.trim();
  if (!m) return undefined;
  if (!/\d/.test(m)) return undefined;
  return ungroundedNumbers(m, [excerpt]).length === 0 ? m : undefined;
}

function cleanHeadline(headline: string, contact: ContactInfo): string {
  let h = headline.replace(EMAIL_RE, '').replace(URL_RE, '').replace(PHONE_RE, '');
  if (contact.fullName) h = h.replace(new RegExp(contact.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  h = h.replace(/\s*[|·•,;-]\s*(?=[|·•,;-]|$)/g, '').replace(/^\s*[|·•,;-]\s*/, '').replace(/\s{2,}/g, ' ').trim();
  if (h.length <= HEADLINE_MAX) return h;
  const cut = h.slice(0, HEADLINE_MAX);
  const sep = Math.max(cut.lastIndexOf('|'), cut.lastIndexOf('·'), cut.lastIndexOf(','));
  return (sep > 40 ? cut.slice(0, sep) : cut).trim();
}

function cleanTargetRoles(roles: string[], contact: ContactInfo): string[] {
  const name = contact.fullName ? normalizeForMatch(contact.fullName) : '';
  const seen = new Set<string>();
  return roles
    .map((r) => r.trim())
    .filter((r) => r && r.length <= 60 && !r.includes('@') && !/https?:|www\./i.test(r))
    .filter((r) => !name || normalizeForMatch(r) !== name)
    .filter((r) => {
      const key = normalizeForMatch(r);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Bullet/statement lines of a description, used when the model returned no achievements. */
function descriptionLines(description: string): string[] {
  return description
    .split('\n')
    .map((l) => l.replace(/^\s*[•▪◦●■\-*–]\s*/, '').trim())
    .filter((l) => l.length >= 25);
}

export function buildResumeImport(
  parsed: ParsedResume,
  rawText: string,
  extractionWarnings: string[] = []
): { payload: ResumeImportPayload; report: ResumeImportReport } {
  const normalizedResume = normalizeForMatch(rawText);
  const warnings = [...extractionWarnings];
  const lowConfidence: string[] = [];

  const c = parsed.contact;
  const contact: ContactInfo = {
    fullName: c.fullName || undefined,
    email: c.email || undefined,
    phone: c.phone || undefined,
    linkedin: c.linkedin || undefined,
    otherLinks: c.otherLinks.filter(Boolean),
    city: c.city || undefined,
    state: c.state || undefined,
    country: c.country || undefined,
    availability: c.availability || undefined,
    driverLicense: c.driverLicense || undefined,
  };

  const location =
    parsed.profile.location || [contact.city, contact.state, contact.country].filter(Boolean).join(', ');

  const makeEvidence = (excerpt: string, extra: { metric?: string; tools?: string[]; competency?: string }): ImportedEvidence => {
    const confidence = excerptConfidence(excerpt, normalizedResume);
    if (confidence === 'low') lowConfidence.push(excerpt);
    const metric = extra.metric ? groundedMetric(extra.metric, excerpt) : undefined;
    if (extra.metric && !metric) warnings.push(`Métrica descartada por não aparecer no trecho original: "${extra.metric}".`);
    return {
      type: 'direct',
      // PDF line wraps split sentences; the statement is stored as one line
      statement: excerpt.replace(/\s*\n\s*/g, ' ').trim(),
      metric,
      source: CV_EVIDENCE_SOURCE,
      confidence,
      domainTag: extra.competency || undefined,
      tools: (extra.tools || []).filter(Boolean),
    };
  };

  const experiences: ResumeImportPayload['experiences'] = [];
  for (const exp of parsed.experiences) {
    if (!exp.title.trim() || !exp.company.trim()) {
      warnings.push(`Experiência ignorada por falta de cargo ou empresa: "${exp.title || exp.company || 'sem nome'}".`);
      continue;
    }
    let evidences = exp.achievements.map((a) =>
      makeEvidence(a.excerpt, { metric: a.metric, tools: a.tools, competency: a.competency })
    );
    if (!evidences.length) {
      evidences = descriptionLines(exp.description).map((line) => makeEvidence(line, {}));
    }
    if (!evidences.length) warnings.push(`Nenhuma conquista encontrada para "${exp.title} — ${exp.company}". Adicione evidências manualmente.`);

    experiences.push({
      data: {
        company: exp.company.trim(),
        title: exp.title.trim(),
        startDate: exp.startDate,
        endDate: exp.isCurrent ? undefined : exp.endDate || undefined,
        isCurrent: exp.isCurrent,
        employmentType: exp.employmentType as Experience['employmentType'],
        domain: exp.domain,
        location: exp.location,
        description: exp.description,
      },
      evidences,
    });
  }

  const projects: ResumeImportPayload['projects'] = parsed.projects.map((p) => {
    const related = normalizeForMatch(p.relatedCompany);
    const idx = related ? experiences.findIndex((e) => normalizeForMatch(e.data.company) === related) : -1;
    return {
      data: {
        name: p.name.trim(),
        description: p.description,
        domain: '',
        scope: '',
        technologies: p.technologies.filter(Boolean),
        metrics: p.metrics && p.excerpt ? groundedMetric(p.metrics, p.excerpt) : undefined,
      },
      experienceIndex: idx >= 0 ? idx : undefined,
      evidences: p.excerpt ? [makeEvidence(p.excerpt, { metric: p.metrics, tools: p.technologies })] : [],
    };
  });

  const seenSkills = new Set<string>();
  const skills = parsed.skills
    .filter((s) => {
      const key = normalizeForMatch(s.name);
      if (!key || seenSkills.has(key)) return false;
      seenSkills.add(key);
      return true;
    })
    .map((s) => ({
      name: s.name.trim(),
      category: s.category as Skill['category'],
      proficiency: s.proficiency as Skill['proficiency'],
      yearsExperience: s.yearsExperience,
    }));

  const certifications: Certification[] = parsed.profile.certifications.filter((cert) => cert.name.trim());

  const payload: ResumeImportPayload = {
    profile: {
      headline: cleanHeadline(parsed.profile.headline, contact),
      summary: parsed.profile.summary,
      location,
      targetRoles: cleanTargetRoles(parsed.profile.targetRoles, contact),
      languages: parsed.profile.languages.filter((l) => l.language.trim()),
      education: parsed.profile.education.filter((e) => e.institution.trim() || e.degree.trim()),
      contact,
      certifications,
    },
    experiences,
    projects,
    skills,
  };

  const evidenceCount =
    experiences.reduce((n, e) => n + e.evidences.length, 0) + projects.reduce((n, p) => n + p.evidences.length, 0);

  if (!experiences.length) warnings.push('Nenhuma experiência profissional foi identificada no currículo.');
  if (lowConfidence.length) {
    warnings.push(`${lowConfidence.length} evidência(s) não foram encontradas literalmente no currículo e estão marcadas com confiança baixa: revise.`);
  }

  return {
    payload,
    report: {
      experiences: experiences.length,
      evidences: evidenceCount,
      projects: projects.length,
      skills: skills.length,
      lowConfidence,
      warnings,
    },
  };
}
