# ChefFlow V1

Ops for Artists. The operating system for chefs.

## Run

```bash
npm install
npm run dev
# Open http://localhost:3100
```

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Drizzle ORM via postgres.js, direct TCP)
- **Auth**: Auth.js v5 (credentials + Google OAuth)
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **AI**: Ollama (local, private data) + Gemini (generic tasks)
- **Realtime**: Server-Sent Events (SSE)

## Structure

```
app/           Next.js routes (670+ pages)
components/    React components (1,394 files)
lib/           Business logic (1,608 modules)
database/      SQL migrations (625 files)
scripts/       Utility scripts
docs/          Documentation
tests/         Playwright test suites
types/         TypeScript definitions
public/        Static assets
```

## Key Commands

- `npm run dev` - Development server (port 3100)
- `npm run build` - Production build
- `npm start` - Serve production build
- `npx tsc --noEmit --skipLibCheck` - Type check
- `npx next build --no-lint` - Build check

## Rules

See `CLAUDE.md` for all project rules and conventions.

## License

Proprietary - All rights reserved
