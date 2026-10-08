import pdfParse from 'pdf-parse/lib/pdf-parse.js';

// Layout-aware text extraction for resumes. Plain pdf-parse output reads two-column
// resumes line by line across both columns, mixing the sidebar into the experience text.
// Here every text item keeps its coordinates, columns are detected per page, and each
// column is read top to bottom.

export class PdfExtractionError extends Error {
  readonly status = 422;
  constructor(
    readonly code: 'PDF_INVALID' | 'PDF_NO_TEXT' | 'PDF_TOO_LARGE' | 'PDF_TIMEOUT',
    message: string
  ) {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

export interface PdfExtractionResult {
  text: string;
  pages: number;
  /** Pages where a two-column layout was detected and read column by column. */
  multiColumnPages: number;
  warnings: string[];
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_TEXT_CHARS = 200;
const EXTRACTION_TIMEOUT_MS = 20_000;

/** Finds a vertical gutter that splits the page into two columns, or null for single-column pages. */
function findGutter(items: TextItem[], pageWidth: number): number | null {
  const totalChars = items.reduce((n, i) => n + i.str.length, 0);
  if (items.length < 10 || totalChars === 0) return null;

  let best: { x: number; balance: number } | null = null;
  for (let pct = 0.2; pct <= 0.8; pct += 0.01) {
    const g = pageWidth * pct;
    // A few crossing items are tolerated (e.g. a full-width name/header at the top)
    const crossing = items.filter((i) => i.x < g - 2 && i.x + i.width > g + 2);
    if (crossing.length > Math.max(2, items.length * 0.05)) continue;

    const leftChars = items.filter((i) => i.x + i.width <= g + 2).reduce((n, i) => n + i.str.length, 0);
    const rightChars = items.filter((i) => i.x >= g - 2).reduce((n, i) => n + i.str.length, 0);
    const balance = Math.min(leftChars, rightChars) / totalChars;
    if (balance < 0.15) continue;
    if (!best || balance > best.balance) best = { x: g, balance };
  }
  return best ? best.x : null;
}

/** Groups items into lines (top to bottom) and joins them into text with paragraph breaks. */
function itemsToText(items: TextItem[]): string {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextItem[][] = [];
  for (const item of sorted) {
    const line = lines[lines.length - 1];
    const tolerance = Math.max(2, item.height * 0.5);
    if (line && Math.abs(line[0].y - item.y) <= tolerance) line.push(item);
    else lines.push([item]);
  }

  const out: string[] = [];
  let prevY: number | null = null;
  let prevHeight = 0;
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    let text = '';
    let lastEnd: number | null = null;
    for (const item of line) {
      const gap = lastEnd === null ? 0 : item.x - lastEnd;
      if (lastEnd !== null && gap > item.height * 0.15 && !text.endsWith(' ') && !item.str.startsWith(' ')) text += ' ';
      text += item.str;
      lastEnd = item.x + item.width;
    }
    const y = line[0].y;
    const height = Math.max(...line.map((i) => i.height));
    // A vertical gap clearly larger than the line height starts a new block
    if (prevY !== null && prevY - y > Math.max(prevHeight, height) * 1.8) out.push('');
    out.push(text.trim());
    prevY = y;
    prevHeight = height;
  }
  return out.join('\n');
}

/**
 * Reads a two-column page top to bottom in bands: full-width lines (title, footer) stay in
 * place and split the page into regions; inside each region the left column is read, then the right.
 */
function readColumns(items: TextItem[], gutter: number): string {
  const crosses = (i: TextItem) => i.x < gutter - 2 && i.x + i.width > gutter + 2;
  const isRight = (i: TextItem) => i.x >= gutter - 2;

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextItem[][] = [];
  for (const item of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - item.y) <= Math.max(2, item.height * 0.5)) line.push(item);
    else lines.push([item]);
  }

  const blocks: string[] = [];
  let region: TextItem[] = [];
  const flushRegion = () => {
    if (!region.length) return;
    blocks.push(itemsToText(region.filter((i) => !isRight(i))), itemsToText(region.filter(isRight)));
    region = [];
  };

  let prevFull: TextItem[] | null = null;
  for (const line of lines) {
    const height = Math.max(...line.map((i) => i.height));
    // Wrapped continuation of a full-width paragraph (short last line on the left side)
    const continuation =
      prevFull !== null && prevFull[0].y - line[0].y <= height * 1.6 && !line.some(isRight);
    if (line.some(crosses) || continuation) {
      flushRegion();
      if (continuation && blocks.length) blocks[blocks.length - 1] += '\n' + itemsToText(line);
      else blocks.push(itemsToText(line));
      prevFull = line;
    } else {
      region.push(...line);
      prevFull = null;
    }
  }
  flushRegion();
  return blocks.filter(Boolean).join('\n\n');
}

function normalize(text: string): string {
  return text
    .normalize('NFC')
    .replace(/(\p{Ll})-\n(\p{Ll})/gu, '$1$2') // words hyphenated across lines
    .replace(/^[ \t]*[•▪◦●■□➢►–·*][ \t]*/gm, '• ') // consistent bullets
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Removes lines repeated on every page (headers/footers such as name or page numbers). */
function removeRepeatedLines(pages: string[]): string[] {
  if (pages.length < 2) return pages;
  const counts = new Map<string, number>();
  for (const page of pages) {
    for (const line of new Set(page.split('\n').map((l) => l.trim()).filter(Boolean))) {
      counts.set(line, (counts.get(line) || 0) + 1);
    }
  }
  const repeated = new Set([...counts].filter(([line, n]) => n === pages.length && line.length < 80).map(([line]) => line));
  // Keep the first occurrence (it may be the candidate's name)
  return pages.map((page, idx) =>
    idx === 0 ? page : page.split('\n').filter((l) => !repeated.has(l.trim())).join('\n')
  );
}

export async function extractResumeText(buffer: Buffer): Promise<PdfExtractionResult> {
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new PdfExtractionError('PDF_INVALID', 'O arquivo enviado não é um PDF válido.');
  }

  const pageTexts: string[] = [];
  let multiColumnPages = 0;

  const pagerender = async (pageData: any): Promise<string> => {
    const content = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    const viewport = pageData.getViewport(1);
    const items: TextItem[] = content.items
      .filter((i: any) => i.str && i.str.trim())
      .map((i: any) => ({
        str: i.str,
        x: i.transform[4],
        y: i.transform[5],
        width: i.width,
        height: Math.abs(i.transform[3]) || i.height || 10,
      }));

    const gutter = findGutter(items, viewport.width);
    let text: string;
    if (gutter === null) {
      text = itemsToText(items);
    } else {
      multiColumnPages++;
      text = readColumns(items, gutter);
    }
    pageTexts[pageData.pageIndex] = text;
    return text;
  };

  let pages: number;
  let timer: NodeJS.Timeout | undefined;
  try {
    const result = await Promise.race([
      // pdf-parse awaits the promise returned by pagerender; its typings declare a sync return
      pdfParse(buffer, { pagerender: pagerender as unknown as (pageData: any) => string }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new PdfExtractionError('PDF_TIMEOUT', 'A leitura do PDF demorou demais. Tente exportar o arquivo novamente.')),
          EXTRACTION_TIMEOUT_MS
        );
      }),
    ]);
    pages = result.numpages;
  } catch (err) {
    if (err instanceof PdfExtractionError) throw err;
    throw new PdfExtractionError('PDF_INVALID', 'Não foi possível ler o PDF (arquivo corrompido ou protegido).');
  } finally {
    clearTimeout(timer);
  }

  const text = normalize(removeRepeatedLines(pageTexts.filter((t) => t !== undefined)).join('\n\n'));
  const warnings: string[] = [];

  if (text.replace(/\s/g, '').length < MIN_TEXT_CHARS) {
    throw new PdfExtractionError(
      'PDF_NO_TEXT',
      'O PDF quase não tem texto selecionável (provavelmente é uma imagem ou digitalização). Exporte o currículo como PDF de texto (ex.: "Salvar como PDF" no Word/Google Docs) e envie novamente.'
    );
  }
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (letters / text.replace(/\s/g, '').length < 0.6) {
    warnings.push('Muitos caracteres não reconhecidos no PDF: confira os dados importados.');
  }
  if (multiColumnPages > 0) {
    warnings.push(`Layout em colunas detectado em ${multiColumnPages} página(s): cada coluna foi lida separadamente.`);
  }

  return { text, pages, multiColumnPages, warnings };
}
