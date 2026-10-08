import type {
  Experience,
  TailoredCVExperience,
  TailoredCVProject,
  TailoredCVSkill,
  UserCareerLake,
} from '../../src/shared/types.js';
import { normalizeForMatch, ungroundedNumbers } from '../../src/shared/text.js';

// Code-side checks on a generated CV: every bullet must cite Lake records of its own experience,
// every number must exist in the cited sources, skills and projects must exist in the Lake, and
// company/title/dates always come from the Lake (never from the model).

export interface GroundingIssue {
  where: string;
  text: string;
  reason: string;
}

export interface GroundedCV {
  headline: string;
  summary: string;
  selectedExperiences: TailoredCVExperience[];
  selectedSkills: TailoredCVSkill[];
  selectedProjects: TailoredCVProject[];
  issues: GroundingIssue[];
  /** Model-proposed experience ids that do not exist for this user. */
  rejectedExperienceIds: string[];
}

function formatMonth(date: string | undefined): string {
  if (!date) return '';
  const m = date.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[2]}/${m[1]}`;
  return date;
}

export function experiencePeriod(exp: Experience, language: string): string {
  const current = language === 'en' ? 'Present' : 'Atual';
  const start = formatMonth(exp.startDate);
  const end = exp.isCurrent ? current : formatMonth(exp.endDate);
  return [start, end].filter(Boolean).join(' – ');
}

/** Whole years of professional experience derived from Lake dates (allowed in the summary). */
export function yearsOfExperience(lake: UserCareerLake): number {
  const starts = lake.experiences
    .map((e) => e.startDate?.match(/^(\d{4})(?:-(\d{2}))?/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => Number(m[1]) + (Number(m[2] || 1) - 1) / 12);
  if (!starts.length) return 0;
  const now = new Date();
  return Math.max(0, Math.floor(now.getFullYear() + now.getMonth() / 12 - Math.min(...starts)));
}

/** Accepts both bullet shapes: `{ text, evidenceIds }` or plain strings with experience-level citations. */
function normalizeBullets(raw: any): Array<{ text: string; evidenceIds: string[] }> {
  const expCitations: string[] = Array.isArray(raw?.evidenceCitations) ? raw.evidenceCitations : [];
  return (Array.isArray(raw?.bullets) ? raw.bullets : [])
    .map((b: any) =>
      typeof b === 'string'
        ? { text: b, evidenceIds: expCitations }
        : { text: String(b?.text || ''), evidenceIds: Array.isArray(b?.evidenceIds) ? b.evidenceIds : [] }
    )
    .filter((b: { text: string }) => b.text.trim());
}

/** Splits text into sentences and drops those with numbers absent from the sources. */
function dropUngroundedSentences(
  text: string,
  sources: string[],
  allowed: Set<string>,
  where: string,
  issues: GroundingIssue[]
): string {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  return sentences
    .filter((sentence) => {
      const bad = ungroundedNumbers(sentence, sources, allowed);
      if (bad.length) issues.push({ where, text: sentence.trim(), reason: `números sem fonte no Career Lake: ${bad.join(', ')}` });
      return !bad.length;
    })
    .join('')
    .trim();
}

export function groundTailoredCV(raw: any, lake: UserCareerLake, userId: string, language: string): GroundedCV {
  const issues: GroundingIssue[] = [];
  const ownExperiences = new Map(lake.experiences.filter((e) => e.userId === userId).map((e) => [e.id, e]));
  const ownEvidences = lake.evidences.filter((ev) => ev.userId === userId);
  const evidenceById = new Map(ownEvidences.map((ev) => [ev.id, ev]));

  const lakeCorpus = [
    lake.profile?.headline || '',
    lake.profile?.summary || '',
    ...lake.experiences.map((e) => `${e.title} ${e.company} ${e.startDate || ''} ${e.endDate || ''} ${e.description}`),
    ...ownEvidences.map((ev) => `${ev.statement} ${ev.metric || ''}`),
    ...lake.projects.map((p) => `${p.name} ${p.description} ${p.metrics || ''}`),
    ...(lake.profile?.education || []).map((e) => `${e.degree} ${e.field} ${e.institution} ${e.year}`),
    ...(lake.profile?.certifications || []).map((c) => `${c.name} ${c.year}`),
  ];
  const allowedNumbers = new Set([String(yearsOfExperience(lake))]);

  // --- Experiences and bullets ---
  const rejectedExperienceIds: string[] = [];
  const selectedExperiences: TailoredCVExperience[] = [];
  for (const rawExp of Array.isArray(raw?.selectedExperiences) ? raw.selectedExperiences : []) {
    const exp = ownExperiences.get(rawExp?.experienceId);
    if (!exp) {
      rejectedExperienceIds.push(String(rawExp?.experienceId));
      continue;
    }
    const expEvidenceIds = new Set(ownEvidences.filter((ev) => ev.experienceId === exp.id).map((ev) => ev.id));
    const bullets: string[] = [];
    const bulletEvidence: string[][] = [];
    for (const bullet of normalizeBullets(rawExp)) {
      // A bullet may cite evidences of this experience, or the experience itself (its description)
      const cited = bullet.evidenceIds.filter((id) => expEvidenceIds.has(id) || id === exp.id);
      if (!cited.length) {
        issues.push({ where: `${exp.title} — ${exp.company}`, text: bullet.text, reason: 'bullet sem evidência citada desta experiência' });
        continue;
      }
      const sources = cited.map((id) =>
        id === exp.id ? exp.description : `${evidenceById.get(id)!.statement} ${evidenceById.get(id)!.metric || ''}`
      );
      const bad = ungroundedNumbers(bullet.text, sources);
      if (bad.length) {
        issues.push({ where: `${exp.title} — ${exp.company}`, text: bullet.text, reason: `números que não estão nas evidências citadas: ${bad.join(', ')}` });
        continue;
      }
      bullets.push(bullet.text.trim());
      bulletEvidence.push([...new Set(cited)]);
    }
    selectedExperiences.push({
      experienceId: exp.id,
      // Identity fields always come from the Lake
      company: exp.company,
      title: exp.title,
      period: experiencePeriod(exp, language),
      bullets,
      bulletEvidence,
      evidenceCitations: [...new Set(bulletEvidence.flat().filter((id) => evidenceById.has(id)))],
    });
  }
  // Keep the Lake's chronological order (most recent first)
  selectedExperiences.sort((a, b) => {
    const ea = ownExperiences.get(a.experienceId)!;
    const eb = ownExperiences.get(b.experienceId)!;
    if (ea.isCurrent !== eb.isCurrent) return ea.isCurrent ? -1 : 1;
    return (eb.startDate || '').localeCompare(ea.startDate || '');
  });

  // --- Skills: only skills in the Lake (or tools named in its evidences) ---
  const lakeSkillNames = new Map<string, string>();
  for (const s of lake.skills) lakeSkillNames.set(normalizeForMatch(s.name), s.name);
  for (const ev of ownEvidences) for (const t of ev.tools || []) lakeSkillNames.set(normalizeForMatch(t), t);
  const seenSkills = new Set<string>();
  const selectedSkills: TailoredCVSkill[] = [];
  for (const s of Array.isArray(raw?.selectedSkills) ? raw.selectedSkills : []) {
    const key = normalizeForMatch(String(s?.name || ''));
    if (!key || seenSkills.has(key)) continue;
    if (!lakeSkillNames.has(key)) {
      issues.push({ where: 'Habilidades', text: String(s?.name), reason: 'skill não registrada no Career Lake' });
      continue;
    }
    seenSkills.add(key);
    const evidenceRef = s?.evidenceRef && evidenceById.has(s.evidenceRef) ? s.evidenceRef : '';
    selectedSkills.push({ name: lakeSkillNames.get(key)!, category: String(s?.category || ''), evidenceRef });
  }

  // --- Projects: must exist in the Lake ---
  const selectedProjects: TailoredCVProject[] = [];
  for (const p of Array.isArray(raw?.selectedProjects) ? raw.selectedProjects : []) {
    const project = lake.projects.find(
      (lp) => lp.userId === userId && (lp.id === p?.projectId || normalizeForMatch(lp.name) === normalizeForMatch(String(p?.name || '')))
    );
    if (!project) {
      issues.push({ where: 'Projetos', text: String(p?.name), reason: 'projeto não registrado no Career Lake' });
      continue;
    }
    const projectSources = [project.description, project.metrics || '', ...ownEvidences.filter((ev) => ev.projectId === project.id).map((ev) => `${ev.statement} ${ev.metric || ''}`)];
    const outcomes = (Array.isArray(p?.outcomes) ? p.outcomes : []).filter((o: string) => {
      const bad = ungroundedNumbers(o, projectSources);
      if (bad.length) issues.push({ where: `Projeto ${project.name}`, text: o, reason: `números sem fonte: ${bad.join(', ')}` });
      return !bad.length;
    });
    const description = dropUngroundedSentences(String(p?.description || project.description), projectSources, new Set(), `Projeto ${project.name}`, issues);
    selectedProjects.push({ projectId: project.id, name: project.name, description, outcomes });
  }

  return {
    headline: dropUngroundedSentences(String(raw?.headline || ''), lakeCorpus, allowedNumbers, 'Título', issues),
    summary: dropUngroundedSentences(String(raw?.summary || ''), lakeCorpus, allowedNumbers, 'Resumo', issues),
    selectedExperiences,
    selectedSkills,
    selectedProjects,
    issues,
    rejectedExperienceIds,
  };
}
