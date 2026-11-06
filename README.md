# Career Lake: Career Intelligence Platform

Career Lake keeps your professional history as structured, evidence-backed records and treats it as the single source of truth. Every CV or cover letter it produces is a projection of that history onto a specific job posting, and it never adds a skill, metric or claim that your records can't back up.

## How it works

```text
          +--------------------------------------------------------+
          |                Career Lake (your real data)            |
          |  - Experiences with business context                   |
          |  - Projects with technologies and measurable outcomes  |
          |  - Skills by time and level                            |
          |  - Evidence bank (direct and transferable)             |
          +---------------------------+----------------------------+
                                      |
                                      v
   Job requirements ---> [ Evidence matrix / fit score ] <--- Evidence
                                      |
                                      v
          +--------------------------------------------------------+
          |                    Generated documents                 |
          |  - Tailored ATS CV (PDF), three writing modes          |
          |  - Cover letter grounded in documented facts           |
          |  - Provenance report citing the evidence used          |
          +--------------------------------------------------------+
```

## Features

- **Career Lake:** experiences, projects, skills and an evidence catalogue with metrics and stated confidence. Import from an existing CV (PDF), with layout-aware reading.
- **LinkedIn job search:** describe what you want in plain language. The app turns it into an editable search plan, runs it in stages and scores each job against your evidence.
- **Fit analysis:** requirements are extracted and ranked, then matched to your evidence as direct, derived, transferable or missing. The fit score is deterministic.
- **CV and cover letter generation:** conservative, balanced or aggressive wording. Every statement stays traceable to an evidence ID, and AI output that cites unknown records is discarded. CVs export as ATS-friendly PDFs.
- **Applications:** Kanban board and list of applications by stage, with notes and salary expectations.
- **Background jobs and automations:** async queue with retries and idempotency keys, plus recurring schedules with time zones.
- **Security:** bcrypt password hashing, random session tokens stored only as hashes with expiry, rate limiting, CSP and other security headers, strict per-user data isolation.

## Tech stack

| Area | Technologies |
| --- | --- |
| Front end | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide, Motion |
| Back end | Node.js, Express, TypeScript |
| Data | SQLite / libSQL with Drizzle ORM |
| AI | Google Gemini (`@google/genai`), with a fallback model |
| Validation | Zod |
| PDF | pdf-parse (CV import), Puppeteer (CV export) |

## Getting started

Requirements: Node.js 20 or later, and a [Google Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/GuiNunesBR/Career-Intelligence-Platform.git
cd Career-Intelligence-Platform
npm install
cp .env.example .env   # then set GEMINI_API_KEY
npm run dev            # runs DB migrations, then serves on http://localhost:3000
```

`.env.example` lists every setting. Only `GEMINI_API_KEY` is required. By default the database is `./sqlite.db`; change it with `SQLITE_URL` or `SQLITE_FILE`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (Vite + Express) on port 3000 |
| `npm test` | Test suite, on its own `sqlite.test.db` |
| `npm run lint` | Strict TypeScript check |
| `npm run build` | Builds the front end to `dist/` and the server to `server.js` |
| `npm start` | Runs migrations, then the production server |
| `npm run db:migrate` | Creates or upgrades the database schema |
| `npx tsx scripts/list-models.ts` | Lists the Gemini models your key can use |
| `npx tsx scripts/revoke-all-sessions.ts` | Signs every user out |

## Deployment

`render.yaml` deploys to [Render](https://render.com) as a single web service, with SQLite on a persistent disk (`SQLITE_URL=file:/data/sqlite.db`). Set `GEMINI_API_KEY` in the Render dashboard.

## Project layout

```text
server/          Express app, routes, services, repositories, worker, scheduler
server/db/       SQLite schema, migrations and connection
src/             React client
tests/           Integration and unit tests (npm test)
docs/            Architecture, auth, security, AI validation and testing notes
scripts/         Maintenance scripts
```

See [docs/](docs/) for the architecture and security details.

## Grounding rules

1. **No cross-domain inflation.** Generic management or process skills don't satisfy domain-specific requirements, such as pharma or heavy industry. The app reports these as transferable or missing.
2. **ID validation.** Every `experienceId`, `projectId` or `evidenceId` the model returns is checked against the signed-in user's records, and anything unmatched is dropped before it is saved.
3. **Auditability.** Each generated bullet and paragraph records the evidence or metric it came from.

## License

[MIT](LICENSE) © 2026 Guilherme Nunes
