import { Request, Response, NextFunction } from 'express';

// Services throw plain Errors for missing/foreign records; answer 404 without echoing ids.
const NOT_FOUND_RE = /not found|access denied|forbidden|unauthorized|does not belong/i;

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[API Error]:', err?.message || err);

  let status: number;
  let code: string;
  let message: string;
  if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Corpo da requisição não é um JSON válido.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Requisição grande demais.';
  } else if (err?.status) {
    // Errors that set a status (AIError, PdfExtractionError, multer, body-parser) carry a user-facing message
    status = err.status;
    code = err.code || 'ERROR';
    message = err.expose === false ? 'Erro ao processar a requisição.' : err.message || 'Erro ao processar a requisição.';
  } else if (NOT_FOUND_RE.test(err?.message || '')) {
    status = 404;
    code = 'NOT_FOUND';
    message = 'Registro não encontrado.';
  } else {
    // Unexpected: never send internal details (SQL, stack, paths) to the client
    status = 500;
    code = 'INTERNAL_ERROR';
    message = 'Erro interno. Tente novamente.';
  }

  res.status(status).json({
    error: {
      code,
      message,
    },
    // Backwards-compatibility
    message,
    code,
  });
}
