/**
 * Whole numbers in a text, as written ("12%" → "12", "R$ 1.200,50" → "1.200,50", "10k" → "10").
 * Digits glued after a letter are part of a name, not a quantity ("B2B", "Web3", "G4").
 */
export function numberTokens(text: string): string[] {
  return text.match(/(?<![\p{L}\d])\d+(?:[.,]\d+)*/gu) || [];
}

/** Numbers in `text` that are not, as whole numbers, in any of the source texts. */
export function ungroundedNumbers(text: string, sources: string[], allowed: Set<string> = new Set()): string[] {
  const known = new Set(sources.flatMap(numberTokens));
  return numberTokens(text).filter((n) => !allowed.has(n) && !known.has(n));
}

/** Lowercase, accent-insensitive, punctuation-free text for fuzzy matching and dedupe keys. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%$]+/gu, ' ')
    .trim();
}

const PT_MARKERS = /\b(vaga|experiência|experiencia|requisitos|conhecimento|desejável|desejavel|atividades|responsabilidades|você|para|com|não)\b/gi;
const ES_MARKERS = /\b(experiencia|requisitos|conocimientos|deseable|usted|empresa|puesto|trabajo|nosotros|para|con|y)\b/gi;
const EN_MARKERS = /\b(the|and|with|experience|requirements|you|we|our|for|skills|role|team)\b/gi;

/** Rough language guess of a job posting: 'pt-br' | 'en' | 'es'. */
export function detectLanguage(text: string): 'pt-br' | 'en' | 'es' {
  const pt = (text.match(PT_MARKERS) || []).length;
  const es = (text.match(ES_MARKERS) || []).length * 0.8;
  const en = (text.match(EN_MARKERS) || []).length;
  if (en > pt && en > es) return 'en';
  if (es > pt && es > en && /\b(usted|conocimientos|puesto|nosotros)\b/i.test(text)) return 'es';
  return 'pt-br';
}
