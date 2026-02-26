# Build Health — Final Status

## Date

2026-02-20

## Branch

`fix/grade-improvements`

## Build Result

```
✓ Compiled successfully
✓ Checking validity of types ...
✓ Generating static pages (288/288)
Exit code: 0
```

All 288 pages compile and pass type-checking. Zero TypeScript errors. Zero fatal warnings.

---

## What Was Fixed (This Branch)

### TypeScript Errors (commits 17197f3, earlier)

- `lib/surveys/actions.ts`: removed non-async `computeSurveyStats` from `'use server'` file; added missing `sendClientSurvey` and `submitSurveyResponse` exports
- `app/(chef)/surveys/page.tsx`: fixed `computeSurveyStats` import path → `lib/surveys/survey-utils`
- `app/(client)/survey/[token]/page.tsx`: fixed field names on `SurveyPublic` type (`event`/`chef`/`submitted_at` instead of `events`/`chefs`/`responded_at`)
- `app/(admin)/admin/events/page.tsx`: fixed `e.total_amount` → `e.quoted_price_cents` to match `PlatformEventRow` type
- Deleted stale `tsconfig.tsbuildinfo` that was causing phantom `.next/types/` file-not-found errors

### Build Stabilization (commit aeb3a1b)

- `pages/500.tsx`: gitignored (via `/pages/` rule) — Next.js default 500 page used during build
- `next.config.js`: PWA plugin set to `disable: true` unconditionally; removed `fallbacks` option that triggered dual-pipeline RSC manifest corruption on Windows
- See `docs/build-500-fix.md` for full root-cause analysis

### Schema & Types (commits aeb3a1b, 810f32e)

- `20260307000001_fix_events_rls_recursion.sql`: SECURITY DEFINER function breaks RLS cycle between `events` and `event_collaborators` tables
- `20260307000002_catchup_missing_schema.sql`: applies SQL from 4 previously-repair-marked migrations (onboarding, surveys, chef logo, dish photos) with full IF NOT EXISTS guards
- `types/database.ts`: regenerated from current remote schema (521 new lines from schema additions)

---

## Health Check Commands

```bash
npx tsc --noEmit --skipLibCheck     # exit 0, zero errors
npx next build --no-lint            # exit 0, 288/288 pages
git status                          # clean working tree
```

---

## Pages Router Note

The project uses Next.js App Router exclusively. The `/pages/` directory is gitignored.
`pages/_app.tsx` and `pages/500.tsx` exist locally on the developer's machine but are
not tracked in git. The build uses Next.js built-in 500/error page behavior.

If cloning on a new machine and the build shows a `/500` export error:

1. Check that `pages/` is gitignored (`.gitignore` has `/pages/`)
2. If a `pages/500.tsx` is needed locally, create it with `export async function getStaticProps() { return { props: {} } }`
3. Clear `.next/` cache and rebuild
