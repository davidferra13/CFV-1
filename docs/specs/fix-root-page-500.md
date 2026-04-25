# Fix Root Page 500

> The production homepage returns 500 Internal Server Error. Fix it.

## Problem

`curl http://localhost:3000/` returns `500 Internal Server Error`. The health endpoint (`/api/health`) returns OK with all checks passing (DB, env, circuit breakers). So the database and server are fine; it's a rendering error in the public homepage.

## Investigation Steps

1. Read `app/(public)/page.tsx` - this is the root page component. It has uncommitted modifications (shown in git status). The error is likely in these modifications.

2. Check the server logs for the actual error. Run:

   ```
   curl -v http://localhost:3000/ 2>&1
   ```

   And check the Next.js server terminal output for the stack trace.

3. If the server isn't running in a visible terminal, read the page component and trace the rendering path:
   - What data does it fetch?
   - What components does it render?
   - Are any imports broken?
   - Are any server actions failing?

4. Check `app/(public)/layout.tsx` as well - layout errors bubble up as page 500s.

## Likely Causes

Based on the git status showing `M app/(public)/page.tsx` (modified by prior Codex work, never reviewed):

- Broken import (component renamed or moved)
- Server component calling a function that throws
- Data fetch returning unexpected shape (null where object expected)
- Missing environment variable used in the page

## Fix Requirements

- The root page (`/`) must return 200 with rendered HTML
- No other pages should break as a result of the fix
- Do not add new features or refactor; just fix the 500
- If the Codex modifications are the cause and they're incomplete/broken work, revert them to the last working state from git rather than trying to fix half-built features

## Scope

Only modify files in:

- `app/(public)/page.tsx`
- `app/(public)/layout.tsx`
- Any component imported directly by the page that is also broken

Do NOT modify:

- `app/(chef)/` (chef portal)
- `app/(client)/` (client portal)
- `lib/auth/` (authentication)
- `database/` (no migrations)

## Guardrails

- No em dashes
- No OpenClaw in UI text
- If reverting Codex changes, use `git checkout main -- <file>` for surgical revert of specific files, not broad reverts
- Test the fix by hitting `curl http://localhost:3000/` and confirming 200

## Acceptance Criteria

- [ ] `curl -o /dev/null -w "%{http_code}" http://localhost:3000/` returns `200`
- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] The page renders meaningful content (not a blank page)
- [ ] No other routes broken (spot-check `/signin`, `/book`, `/chefs`)
