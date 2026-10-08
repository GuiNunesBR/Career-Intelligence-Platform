import { GoogleGenAI } from '@google/genai';
import type { ZodType } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

// Primary model + a real second model used when the primary is overloaded, rate limited or gone.
// Run `npx tsx list_models.ts` to see which models the API key can use.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
const MAX_ATTEMPTS_PER_MODEL = 3;
const DEFAULT_TIMEOUT_MS = 90_000;

export type AIErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_RATE_LIMIT'
  | 'AI_TIMEOUT'
  | 'AI_MODEL_NOT_FOUND'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_OUTPUT'
  | 'AI_ERROR';

const USER_MESSAGES: Record<AIErrorCode, string> = {
  AI_NOT_CONFIGURED: 'Análise indisponível: a chave do modelo de IA não está configurada no servidor.',
  AI_RATE_LIMIT: 'Análise indisponível: limite de uso do modelo de IA atingido. Tente novamente em alguns minutos.',
  AI_TIMEOUT: 'Análise indisponível: o modelo de IA demorou demais para responder. Tente novamente.',
  AI_MODEL_NOT_FOUND: 'Análise indisponível: o modelo de IA configurado não existe para esta chave (verifique GEMINI_MODEL).',
  AI_UNAVAILABLE: 'Análise indisponível: o modelo de IA está sobrecarregado. Tente novamente em instantes.',
  AI_INVALID_OUTPUT: 'Análise indisponível: o modelo de IA devolveu uma resposta inválida. Tente novamente.',
  AI_ERROR: 'Análise indisponível: erro ao consultar o modelo de IA. Tente novamente.',
};

/** Typed AI failure. `message` is safe to show to the user; `detail` is for logs only. */
export class AIError extends Error {
  readonly status = 503;
  constructor(
    readonly code: AIErrorCode,
    readonly detail?: string
  ) {
    super(USER_MESSAGES[code]);
    this.name = 'AIError';
  }
}

let _client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') throw new AIError('AI_NOT_CONFIGURED');
  if (!_client) _client = new GoogleGenAI({ apiKey: key });
  return _client;
}

function classify(err: any): AIError {
  if (err instanceof AIError) return err;
  const status = err?.status ?? err?.code;
  const detail = String(err?.message || err).slice(0, 300);
  if (status === 429) return new AIError('AI_RATE_LIMIT', detail);
  if (status === 404) return new AIError('AI_MODEL_NOT_FOUND', detail);
  if (status === 500 || status === 502 || status === 503 || status === 504) return new AIError('AI_UNAVAILABLE', detail);
  if (status === 401 || status === 403) return new AIError('AI_NOT_CONFIGURED', detail);
  return new AIError('AI_ERROR', detail);
}

const RETRYABLE: AIErrorCode[] = ['AI_RATE_LIMIT', 'AI_UNAVAILABLE', 'AI_TIMEOUT', 'AI_INVALID_OUTPUT'];

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AIError('AI_TIMEOUT', `timed out after ${ms}ms`)), ms);
    timer.unref?.();
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text: string): unknown {
  let clean = text.trim();
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) clean = fenced[1];
  return JSON.parse(clean);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GeminiJSONRequest<T> {
  /** Short label for logs, e.g. "fit_analysis". */
  task: string;
  contents: string;
  responseSchema: Record<string, unknown>;
  /** Optional Zod schema: output failing validation is retried, then rejected as AI_INVALID_OUTPUT. */
  validate?: ZodType<T>;
  timeoutMs?: number;
}

/**
 * Single entry point for structured Gemini calls: timeout, retry with backoff on
 * 429/503/timeout/invalid output, then the fallback model. Never returns made-up data:
 * on failure it throws an AIError.
 */
export async function callGeminiJSON<T = any>(req: GeminiJSONRequest<T>): Promise<T> {
  const client = getClient();
  const models = PRIMARY_MODEL === FALLBACK_MODEL ? [PRIMARY_MODEL] : [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError: AIError = new AIError('AI_ERROR');

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const started = Date.now();
      try {
        const response = await withTimeout(
          client.models.generateContent({
            model,
            contents: req.contents,
            config: { responseMimeType: 'application/json', responseSchema: req.responseSchema },
          }),
          req.timeoutMs ?? DEFAULT_TIMEOUT_MS
        );
        if (!response.text) throw new AIError('AI_INVALID_OUTPUT', 'empty response');

        let parsed: unknown;
        try {
          parsed = parseJson(response.text);
        } catch {
          throw new AIError('AI_INVALID_OUTPUT', 'response is not valid JSON');
        }
        if (req.validate) {
          const result = req.validate.safeParse(parsed);
          if (!result.success) {
            throw new AIError('AI_INVALID_OUTPUT', result.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
          }
          parsed = result.data;
        }

        console.log(`[AI] task=${req.task} model=${model} attempt=${attempt} ok latency=${Date.now() - started}ms`);
        return parsed as T;
      } catch (err) {
        lastError = classify(err);
        console.warn(
          `[AI] task=${req.task} model=${model} attempt=${attempt} failed code=${lastError.code} latency=${Date.now() - started}ms detail=${lastError.detail ?? ''}`
        );
        if (lastError.code === 'AI_NOT_CONFIGURED') throw lastError;
        if (!RETRYABLE.includes(lastError.code)) break; // e.g. model not found: go to next model
        if (attempt < MAX_ATTEMPTS_PER_MODEL) {
          const base = lastError.code === 'AI_RATE_LIMIT' ? 5000 : 2000;
          await sleep(base * 2 ** (attempt - 1) + Math.random() * 500);
        }
      }
    }
  }

  throw lastError;
}
