# Authentication & Identity Hardening (V2.1)

## Current Implementation
The application implements identity authentication with password hashing and session tokens:
- **Password Hashing**: Uses `bcryptjs` (salt rounds: 10). Passwords are never stored or logged in plain text.
- **Session Tokens**: Generates cryptographically secure 128-bit random tokens (`sess_<userId>_<timestamp>_<randomBytes>`).
- **Token Hashing**: Tokens are stored as SHA-256 hashes (`tokenHash`), preventing token misuse in case of persistence leaks.
- **Sanitization**: `SanitizedUser` guarantees that `passwordHash` is stripped before leaving the server.
- **Generic Error Responses**: Failed logins return `401 Unauthorized` with generic message `Invalid credentials` to prevent account enumeration.

## Endpoints
- `POST /api/auth/register`: Validates name, email, and password (min 6 characters), normalizes email, checks duplicates, hashes password, and creates an authenticated session.
- `POST /api/auth/login`: Validates email and password, verifies hash with bcrypt, issues session token.
- `POST /api/auth/logout`: Revokes token immediately.
- `GET /api/auth/me`: Validates Bearer token via `authMiddleware` and returns sanitized user profile.

## Security Assumptions
- TLS termination at ingress encrypts token and credentials in flight.
- Session expiration is set to 30 days with immediate revocation capability.
- Client stores token in localStorage and includes `Authorization: Bearer <token>` on all API requests.

## Known Limitations & Future Evolution
- Multi-factor authentication (MFA / TOTP) can be integrated in V3.
- PostgreSQL session store with sliding refresh tokens can replace in-memory session index.
