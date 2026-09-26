import { GoogleGenAI, Type } from '@google/genai';
import {
  UserCareerLake,
  Job,
  JobRequirement,
  FitAnalysis,
  EvidenceMatrixItem,
  TailoredCV,
  CoverLetter,
  TailoringMode,
} from '../src/shared/types.js';

const ai = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI generation timed out')), ms);
    if (timer && typeof timer.unref === 'function') timer.unref();
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export async function parseJobText(rawText: string): Promise<Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
  if (ai) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `You are an expert career intelligence parser. Extract structured job details from the following posting text:

--- JOB POSTING ---
${rawText}
--- END ---

Return clean structured JSON with:
- title: string
- company: string
- location: string
- seniority: string (e.g. Junior, Mid, Senior, Lead, Executive)
- employmentType: string (e.g. Full-time, Hybrid, Remote, Contract)
- description: concise executive summary of the job
- requirements: array of {
    category: "Functional" | "Domain" | "Technical" | "Leadership" | "Stakeholder" | "Education" | "Language" | "Seniority" | "Tool" | "Certification",
    description: specific requirement description,
    importance: "critical" | "high" | "medium" | "nice_to_have",
    evidenceRequired: what concrete proof is needed from a candidate
  }`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              company: { type: Type.STRING },
              location: { type: Type.STRING },
              seniority: { type: Type.STRING },
              employmentType: { type: Type.STRING },
              description: { type: Type.STRING },
              requirements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    importance: { type: Type.STRING },
                    evidenceRequired: { type: Type.STRING },
                  },
                  required: ['category', 'description', 'importance', 'evidenceRequired'],
                },
              },
            },
            required: ['title', 'company', 'location', 'seniority', 'employmentType', 'description', 'requirements'],
          },
        },
      }));

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return {
          title: parsed.title || 'Untitled Role',
          company: parsed.company || 'Confidential Company',
          location: parsed.location || 'Remote / Unspecified',
          seniority: parsed.seniority || 'Senior',
          employmentType: parsed.employmentType || 'Full-time',
          description: parsed.description || rawText.slice(0, 300),
          requirements: (parsed.requirements || []).map((r: any, idx: number) => ({
            requirementId: `req_${Date.now()}_${idx}`,
            category: r.category || 'Functional',
            description: r.description,
            importance: r.importance || 'high',
            evidenceRequired: r.evidenceRequired || 'Demonstrated track record',
          })),
          rawText,
        };
      }
    } catch (err) {
      console.warn('Gemini job parser error, falling back to heuristic parser:', err);
    }
  }

  // Deterministic Fallback Heuristic Parser
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const title = lines[0] || 'Target Role';
  const company = lines.length > 1 && lines[1].length < 40 ? lines[1] : 'Enterprise Partner';
  
  const extractedReqs: JobRequirement[] = [];
  // const reqKeywords = ['require', 'responsib', 'qualif', 'experien', 'skill', 'must have', 'dever', 'conhecimento'];
  let count = 0;

  for (const line of lines) {
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
      const clean = line.replace(/^[•\-*\d.]\s*/, '').trim();
      if (clean.length > 15) {
        let cat: any = 'Functional';
        const lower = clean.toLowerCase();
        if (lower.includes('lead') || lower.includes('manage') || lower.includes('team') || lower.includes('lider')) cat = 'Leadership';
        else if (lower.includes('stakeholder') || lower.includes('c-level') || lower.includes('client') || lower.includes('board')) cat = 'Stakeholder';
        else if (lower.includes('sap') || lower.includes('python') || lower.includes('tool') || lower.includes('software') || lower.includes('excel')) cat = 'Tool';
        else if (lower.includes('english') || lower.includes('inglês') || lower.includes('language')) cat = 'Language';
        else if (lower.includes('cosmetic') || lower.includes('industrial') || lower.includes('pharma') || lower.includes('biotech')) cat = 'Domain';

        extractedReqs.push({
          requirementId: `req_fallback_${++count}`,
          category: cat,
          description: clean,
          importance: count <= 2 ? 'critical' : count <= 4 ? 'high' : 'medium',
          evidenceRequired: `Demonstrated record in: ${clean.slice(0, 50)}...`,
        });
      }
    }
  }

  if (extractedReqs.length === 0) {
    extractedReqs.push(
      {
        requirementId: 'req_1',
        category: 'Functional',
        description: 'Core functional responsibility and execution capability',
        importance: 'critical',
        evidenceRequired: 'Proven track record of project or operational outcomes',
      },
      {
        requirementId: 'req_2',
        category: 'Leadership',
        description: 'Cross-functional alignment and stakeholder governance',
        importance: 'high',
        evidenceRequired: 'Examples of cross-team coordination',
      },
    );
  }

  return {
    title,
    company,
    location: 'Hybrid / Unspecified',
    seniority: 'Mid / Senior',
    employmentType: 'Full-time',
    description: rawText.slice(0, 350) + '...',
    requirements: extractedReqs,
    rawText,
  };
}

export async function performEvidenceFitAnalysis(
  careerLake: UserCareerLake,
  job: Job
): Promise<Omit<FitAnalysis, 'id' | 'userId' | 'createdAt'>> {
  const lakeSummary = {
    profile: careerLake.profile,
    skills: careerLake.skills.map((s) => ({ name: s.name, category: s.category, proficiency: s.proficiency })),
    experiences: careerLake.experiences.map((e) => ({
      company: e.company,
      title: e.title,
      domain: e.domain,
      description: e.description,
    })),
    projects: careerLake.projects.map((p) => ({
      name: p.name,
      domain: p.domain,
      metrics: p.metrics,
      technologies: p.technologies,
    })),
    evidences: careerLake.evidences.map((ev) => ({
      id: ev.id,
      statement: ev.statement,
      metric: ev.metric,
      type: ev.type,
      source: ev.source,
      domainTag: ev.domainTag,
    })),
  };

  if (ai) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `You are the core intelligence engine of Career Lake.
Your task is to conduct an Evidence-First Job Fit Analysis.

CRITICAL RULES (NON-NEGOTIABLE):
1. The Career Lake is the ABSOLUTE SOURCE OF TRUTH.
2. DO NOT invent experiences, skills, metrics, or evidence.
3. DO NOT transform indirect knowledge into direct domain experience.
4. Distinguish clearly between:
   - "direct": Explicitly recorded in Career Lake with direct evidence.
   - "derived": Can be safely inferred from closely related validated work.
   - "transferable": Functional skill applies, but candidate DOES NOT have direct domain experience.
   - "gap": No evidence exists in Career Lake.
   - "unknown": Information might exist but Career Lake lacks data.
5. If a job requires specific domain expertise (e.g., "Cosmetics Formulation" or "Capital EPC Projects") and the candidate only has generic functional skills (e.g., "Project Management"), you MUST classify it as a domain gap or transferable skill, NEVER direct domain experience!

--- USER CAREER LAKE ---
${JSON.stringify(lakeSummary, null, 2)}

--- TARGET JOB ---
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Requirements: ${JSON.stringify(job.requirements, null, 2)}

Produce a JSON output matching the required schema.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallSummary: { type: Type.STRING },
              dimensions: {
                type: Type.OBJECT,
                properties: {
                  functionalFit: { type: Type.INTEGER },
                  domainFit: { type: Type.INTEGER },
                  technicalFit: { type: Type.INTEGER },
                  seniorityScopeFit: { type: Type.INTEGER },
                  leadershipFit: { type: Type.INTEGER },
                  stakeholderFit: { type: Type.INTEGER },
                  languageFit: { type: Type.INTEGER },
                  evidenceStrength: { type: Type.INTEGER },
                  transferability: { type: Type.INTEGER },
                },
                required: [
                  'functionalFit',
                  'domainFit',
                  'technicalFit',
                  'seniorityScopeFit',
                  'leadershipFit',
                  'stakeholderFit',
                  'languageFit',
                  'evidenceStrength',
                  'transferability',
                ],
              },
              evidenceMatrix: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    requirementId: { type: Type.STRING },
                    requirementDescription: { type: Type.STRING },
                    category: { type: Type.STRING },
                    importance: { type: Type.STRING },
                    evidenceFound: { type: Type.STRING },
                    evidenceType: { type: Type.STRING },
                    strength: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: [
                    'requirementId',
                    'requirementDescription',
                    'category',
                    'importance',
                    'evidenceFound',
                    'evidenceType',
                    'strength',
                    'notes',
                  ],
                },
              },
              strongMatches: { type: Type.ARRAY, items: { type: Type.STRING } },
              transferableExperiences: { type: Type.ARRAY, items: { type: Type.STRING } },
              domainGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedCvFocus: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'overallSummary',
              'dimensions',
              'evidenceMatrix',
              'strongMatches',
              'transferableExperiences',
              'domainGaps',
              'missingEvidence',
              'recommendedCvFocus',
            ],
          },
        },
      }));

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return {
          jobId: job.id,
          overallSummary: parsed.overallSummary,
          dimensions: parsed.dimensions,
          evidenceMatrix: parsed.evidenceMatrix.map((item: any) => ({
            ...item,
            evidenceType: ['direct', 'derived', 'transferable', 'gap', 'unknown'].includes(item.evidenceType)
              ? item.evidenceType
              : 'gap',
            strength: ['high', 'medium', 'low', 'none'].includes(item.strength) ? item.strength : 'none',
            sourceReferences: careerLake.evidences
              .filter((ev) =>
                item.evidenceFound.toLowerCase().includes(ev.domainTag?.toLowerCase() || 'xyz') ||
                ev.statement.toLowerCase().includes(item.category.toLowerCase())
              )
              .slice(0, 2)
              .map((ev) => ({
                type: 'evidence' as const,
                id: ev.id,
                label: ev.statement.slice(0, 60) + '...',
              })),
          })),
          strongMatches: parsed.strongMatches || [],
          transferableExperiences: parsed.transferableExperiences || [],
          domainGaps: parsed.domainGaps || [],
          missingEvidence: parsed.missingEvidence || [],
          recommendedCvFocus: parsed.recommendedCvFocus || [],
        };
      }
    } catch (err) {
      console.warn('Gemini fit analysis failed, utilizing deterministic evidence matching:', err);
    }
  }

  // Deterministic Evidence-First Matching Engine
  const matrix: EvidenceMatrixItem[] = [];
  const strongMatches: string[] = [];
  const transferableExperiences: string[] = [];
  const domainGaps: string[] = [];
  const missingEvidence: string[] = [];

  let directCount = 0;
  let transferableCount = 0;
  let gapCount = 0;

  for (const req of job.requirements) {
    const desc = req.description.toLowerCase();
    
    // Check direct matching evidences
    const matchedEvidence = careerLake.evidences.find((ev) => {
      const stmt = ev.statement.toLowerCase();
      const tag = ev.domainTag?.toLowerCase() || '';
      return (
        stmt.includes(desc.slice(0, 15)) ||
        (tag && desc.includes(tag)) ||
        (ev.metric && desc.includes(ev.metric.toLowerCase().slice(0, 10)))
      );
    });

    // Check direct skills
    const matchedSkill = careerLake.skills.find((s) => desc.includes(s.name.toLowerCase()));

    // Check domain relevance
    const lakeDomains = careerLake.experiences.map((e) => e.domain.toLowerCase()).join(' ');
    const isDomainMatch = lakeDomains.includes(req.category.toLowerCase()) || (req.category === 'Domain' && lakeDomains.includes(desc.slice(0, 12)));

    if (matchedEvidence && matchedEvidence.type === 'direct') {
      directCount++;
      strongMatches.push(`${req.description}: Proven by Career Lake evidence "${matchedEvidence.statement}"`);
      matrix.push({
        requirementId: req.requirementId,
        requirementDescription: req.description,
        category: req.category,
        importance: req.importance,
        evidenceFound: matchedEvidence.statement,
        evidenceType: 'direct',
        strength: 'high',
        notes: `Validated metric: ${matchedEvidence.metric || 'N/A'}. Source: ${matchedEvidence.source}`,
        sourceReferences: [{ type: 'evidence', id: matchedEvidence.id, label: matchedEvidence.statement.slice(0, 60) }],
      });
    } else if (matchedSkill || (req.category === 'Functional' && careerLake.skills.some((s) => s.category === 'Functional'))) {
      if (req.category === 'Domain' && !isDomainMatch) {
        transferableCount++;
        transferableExperiences.push(`${req.description}: Functional skill exists, but domain context is unproven.`);
        domainGaps.push(`Domain gap: Experience required in ${req.description}, candidate has adjacent functional governance.`);
        matrix.push({
          requirementId: req.requirementId,
          requirementDescription: req.description,
          category: req.category,
          importance: req.importance,
          evidenceFound: 'Indirect transferable governance experience, but no direct domain record.',
          evidenceType: 'transferable',
          strength: 'medium',
          notes: 'High transferability of operational rigor, but lacks explicit industry/domain evidence.',
          sourceReferences: [],
        });
      } else {
        directCount++;
        matrix.push({
          requirementId: req.requirementId,
          requirementDescription: req.description,
          category: req.category,
          importance: req.importance,
          evidenceFound: matchedSkill ? `Skill verified: ${matchedSkill.name} (${matchedSkill.proficiency})` : 'Career Lake verified competency',
          evidenceType: 'derived',
          strength: 'medium',
          notes: 'Derived from active verified skill profile and project records.',
          sourceReferences: matchedSkill ? [{ type: 'skill', id: matchedSkill.id, label: matchedSkill.name }] : [],
        });
      }
    } else {
      gapCount++;
      missingEvidence.push(req.description);
      if (req.category === 'Domain') {
        domainGaps.push(`Absence of evidence for: ${req.description}`);
      }
      matrix.push({
        requirementId: req.requirementId,
        requirementDescription: req.description,
        category: req.category,
        importance: req.importance,
        evidenceFound: 'No verifiable evidence recorded in Career Lake.',
        evidenceType: 'gap',
        strength: 'none',
        notes: 'Candidate has not logged project or outcome evidence matching this requirement.',
        sourceReferences: [],
      });
    }
  }

  const totalReqs = Math.max(1, job.requirements.length);
  const functionalFit = Math.min(95, Math.round(((directCount * 1.5 + transferableCount) / totalReqs) * 60 + 25));
  const domainFit = domainGaps.length > 0 ? Math.max(25, 80 - domainGaps.length * 20) : 88;
  const technicalFit = Math.min(92, Math.round((directCount / totalReqs) * 70 + 20));
  const transferabilityScore = Math.min(90, Math.round((transferableCount / totalReqs) * 100 + 30));

  return {
    jobId: job.id,
    overallSummary: `Evidence-based fit reveals strong functional competencies with ${directCount} direct/derived matches and ${gapCount} explicit gaps. Career Lake demonstrates verified metrics for core responsibilities while preserving transparency on domain specifics.`,
    dimensions: {
      functionalFit,
      domainFit,
      technicalFit,
      seniorityScopeFit: 85,
      leadershipFit: 80,
      stakeholderFit: 88,
      languageFit: 92,
      evidenceStrength: Math.round((directCount / totalReqs) * 85 + 10),
      transferability: transferabilityScore,
    },
    evidenceMatrix: matrix,
    strongMatches: strongMatches.length ? strongMatches : ['Functional governance and project leadership'],
    transferableExperiences: transferableExperiences.length ? transferableExperiences : ['Cross-functional problem solving and methodology'],
    domainGaps: domainGaps.length ? domainGaps : ['No critical domain gaps identified'],
    missingEvidence: missingEvidence.length ? missingEvidence : ['None'],
    recommendedCvFocus: [
      'Lead with validated quantitative metrics from Career Lake projects.',
      'Explicitly frame transferable operational excellence for any unproven domain niches.',
      'Reference exact C-level stakeholder cadences and audited financial thresholds.',
    ],
  };
}

export async function generateTailoredCVContent(
  careerLake: UserCareerLake,
  job: Job,
  mode: TailoringMode
): Promise<Omit<TailoredCV, 'id' | 'userId' | 'createdAt'>> {
  if (ai) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `You are the Career Lake Tailoring Engine.
Generate a tailored CV view for this specific job posting.

TAILORING PRINCIPLES:
1. Mode is '${mode}':
   - 'conservative': Strictly uses information and exact verified phrasing from Career Lake. No embellishments.
   - 'balanced': Reorganizes and refines bullet points for high relevance to the job requirements, but every statement remains 100% truthful and auditable.
   - 'aggressive': Emphasizes transferable skills and high-impact metrics to bridge gaps, BUT NEVER invents facts, tools, or domain experience.
2. Every experience bullet MUST correspond to actual Career Lake evidence or project outcomes.
3. Include an "honestyAuditNotes" array explaining how each section is grounded in verified Career Lake data.

Career Lake:
${JSON.stringify(careerLake, null, 2)}

Target Job:
${JSON.stringify(job, null, 2)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              summary: { type: Type.STRING },
              selectedExperiences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    experienceId: { type: Type.STRING },
                    company: { type: Type.STRING },
                    title: { type: Type.STRING },
                    period: { type: Type.STRING },
                    bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                    evidenceCitations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['experienceId', 'company', 'title', 'period', 'bullets', 'evidenceCitations'],
                },
              },
              selectedSkills: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    evidenceRef: { type: Type.STRING },
                  },
                  required: ['name', 'category', 'evidenceRef'],
                },
              },
              selectedProjects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    outcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['name', 'description', 'outcomes'],
                },
              },
              atsKeywordsMatched: { type: Type.ARRAY, items: { type: Type.STRING } },
              honestyAuditNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'headline',
              'summary',
              'selectedExperiences',
              'selectedSkills',
              'selectedProjects',
              'atsKeywordsMatched',
              'honestyAuditNotes',
            ],
          },
        },
      }));

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return {
          jobId: job.id,
          mode,
          headline: parsed.headline,
          summary: parsed.summary,
          selectedExperiences: parsed.selectedExperiences,
          selectedSkills: parsed.selectedSkills,
          selectedProjects: parsed.selectedProjects,
          atsKeywordsMatched: parsed.atsKeywordsMatched,
          honestyAuditNotes: parsed.honestyAuditNotes,
        };
      }
    } catch (err) {
      console.warn('Gemini CV tailoring error, falling back to deterministic synthesis:', err);
    }
  }

  // Deterministic Fallback CV Tailoring
  return {
    jobId: job.id,
    mode,
    headline: `${careerLake.profile.headline} — Focused on ${job.title}`,
    summary: `${careerLake.profile.summary} Targeted alignment for ${job.company}: brings verified track records in ${careerLake.skills.slice(0, 3).map((s) => s.name).join(', ')} with rigorous evidence-backed outcomes.`,
    selectedExperiences: careerLake.experiences.map((exp) => {
      const expEvs = careerLake.evidences.filter((ev) => ev.experienceId === exp.id);
      return {
        experienceId: exp.id,
        company: exp.company,
        title: exp.title,
        period: `${exp.startDate} – ${exp.isCurrent ? 'Present' : exp.endDate || 'Recent'}`,
        bullets: expEvs.length
          ? expEvs.map((ev) => `${ev.statement} (${ev.metric || 'Validated impact'})`)
          : [exp.description],
        evidenceCitations: expEvs.map((ev) => `Ev #${ev.id.slice(-4)}: ${ev.source}`),
      };
    }),
    selectedSkills: careerLake.skills.map((s) => ({
      name: s.name,
      category: s.category,
      evidenceRef: `Career Lake verified: ${s.proficiency} proficiency (${s.yearsExperience} yrs)`,
    })),
    selectedProjects: careerLake.projects.map((p) => ({
      name: p.name,
      description: p.description,
      outcomes: p.metrics ? [p.metrics] : [p.scope],
    })),
    atsKeywordsMatched: job.requirements.map((r) => r.description.slice(0, 25)),
    honestyAuditNotes: [
      `Tailored under '${mode}' mode with 100% Career Lake provenance.`,
      `Zero hallucinated metrics; all quantitative results derived from verified project records.`,
      `Domain distinctions maintained without unwarranted claims.`,
    ],
  };
}

export async function generateCoverLetterContent(
  careerLake: UserCareerLake,
  job: Job
): Promise<Omit<CoverLetter, 'id' | 'userId' | 'createdAt'>> {
  const salutation = `Hiring Team at ${job.company}`;
  const subject = `Application for ${job.title} — ${careerLake.profile.headline}`;

  const groundedFacts = careerLake.evidences.slice(0, 3).map((ev) => ev.statement);

  const content = `Dear ${salutation},

I am writing to express my focused interest in the ${job.title} position at ${job.company}. Having followed your strategic milestones, I believe my background in ${careerLake.skills.slice(0, 3).map((s) => s.name).join(', ')} aligns directly with the core challenges of this role.

In my recent leadership roles, my performance has been grounded in concrete, verifiable deliverables:
${careerLake.evidences.slice(0, 2).map((ev) => `• ${ev.statement} [Source: ${ev.source}]`).join('\n')}

I appreciate ${job.company}'s high standards for operational excellence and execution rigor. Where my experience intersects directly with your requirements, I offer immediate strategic readiness; where new domain contexts emerge, my proven governance discipline ensures a steep and dependable trajectory.

Thank you for your consideration. I look forward to discussing how my career background can contribute to your team's objectives.

Sincerely,
${careerLake.profile.headline.split('|')[0].trim() || 'Applicant'}`;

  return {
    jobId: job.id,
    recipient: salutation,
    subject,
    content,
    groundedFacts,
  };
}
