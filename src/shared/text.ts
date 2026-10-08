/** Lowercase, accent-insensitive, punctuation-free text for fuzzy matching and dedupe keys. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%$]+/gu, ' ')
    .trim();
}
