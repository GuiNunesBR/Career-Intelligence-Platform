# Security Hardening (V2.1)

## Security Controls Implemented

### 1. Zero Trust Client Identity
- Client requests cannot dictate or inject `userId`.
- `req.user` is populated strictly by validating the Bearer token in the `Authorization` header.
- Cross-user queries and operations reject foreign IDs with `401 Unauthorized` or `404 Not Found`.

### 2. Password & Credential Protection
- Passwords hashed with `bcryptjs` (salt rounds: 10).
- Passwords and `passwordHash` are never returned in responses, logs, or exceptions.
- Session tokens are indexed in memory via SHA-256 token hashes.

### 3. Rate Limiting
- `authRateLimiter`: Limits authentication endpoints (`/api/auth/login`, `/api/auth/register`) to 20 requests per minute per IP to mitigate brute force attacks.
- `aiRateLimiter`: Limits intensive AI endpoints (`/api/jobs/parse`, `/api/analysis/*`, `/api/tailor/*`) to 30 requests per minute per IP to protect downstream APIs.

### 4. HTTP Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`

### 5. Sanitized Structured Logging
- Formatted log entries: `[API] method=... path=... status=... duration=...ms userId=...`
- Authorization headers, passwords, and API keys are strictly excluded from all log streams.

### 6. Standardized Error Handling
- Errors are standardized as `{ error: { code: string, message: string } }`.
- Server stack traces are suppressed in production responses.
