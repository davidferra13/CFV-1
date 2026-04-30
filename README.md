# ChefFlow V1

Ops for Artists. The chef-first operating system for independent and small culinary businesses.

Canonical project identity and scope live in `docs/project-definition-and-scope.md`.

## Run

```bash
npm install
npm run dev
# Open http://localhost:3100
```

Local development runs only on the developer workstation. Public production is served from a dedicated self-hosted production node through Caddy and `systemd`, using immutable release directories under `/srv/chefflow`. See `docs/runbooks/self-hosted-bootstrap.md` and `docs/runbooks/self-hosted-ops.md`.

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Drizzle ORM via postgres.js, direct TCP)
- **Auth**: Auth.js v5 (credentials + Google OAuth)
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **AI**: Single Ollama-compatible endpoint
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
- `powershell -ExecutionPolicy Bypass -File scripts\package-release.ps1` - Package a self-hosted release
- `powershell -ExecutionPolicy Bypass -File scripts\deploy-self-hosted.ps1 -HostName <host>` - Deploy to the self-hosted production node
- `npx tsc --noEmit --skipLibCheck` - Type check
- `npx next build --no-lint` - Build check

## Rules

See `CLAUDE.md` for all project rules and conventions.

## License

Proprietary - All rights reserved
