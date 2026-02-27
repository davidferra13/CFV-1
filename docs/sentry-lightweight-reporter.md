# Sentry Lightweight Reporter

## What Changed

Replaced the `@sentry/nextjs` SDK dependency for error reporting with a lightweight REST API approach that sends errors directly to Sentry's envelope API. This eliminates the heavy SDK from the critical path while still getting error tracking in production.

## Architecture

```
Browser error boundary          Server action throws UnknownAppError
        |                                    |
        v                                    v
POST /api/monitoring/report-error    Dynamic import of sentry-reporter.ts
        |                                    |
        v                                    v
   sentry-reporter.ts              reportAppError() -> reportError()
        |                                    |
        v                                    v
   Sentry Envelope API (REST)       Sentry Envelope API (REST)
```

## Files

| File                                       | Purpose                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `lib/monitoring/sentry-reporter.ts`        | Core reporter -- parses DSN, builds envelope, sends via fetch                                                       |
| `lib/monitoring/sentry.ts`                 | Facade -- `captureChefError()`, `trackBusinessEvent()`, `setUserContext()` now delegate to the lightweight reporter |
| `app/api/monitoring/report-error/route.ts` | API route for client-side error reporting (keeps DSN server-side)                                                   |
| `app/error.tsx`                            | Error boundary -- now reports via API route instead of `@sentry/nextjs`                                             |
| `app/global-error.tsx`                     | Root layout error boundary -- catches errors `error.tsx` cannot                                                     |
| `lib/errors/app-error.ts`                  | `UnknownAppError` constructor now auto-reports to Sentry                                                            |
| `middleware.ts`                            | `/api/monitoring` added to auth bypass list                                                                         |

## How It Works

### Server-side (automatic)

Every `throw new UnknownAppError(...)` anywhere in the codebase automatically reports to Sentry. The constructor does a dynamic `import('../monitoring/sentry-reporter')` and calls `reportAppError()` fire-and-forget. This covers all 80+ server action files without modifying any of them.

### Client-side (error boundary)

When React catches an unhandled error, `app/error.tsx` (or `app/global-error.tsx` for root layout errors) sends the error details to `POST /api/monitoring/report-error`. The API route reconstructs an Error object and forwards it to Sentry via the reporter.

### DSN Parsing

The reporter reads `SENTRY_DSN` (or `NEXT_PUBLIC_SENTRY_DSN`) and parses it:

- Format: `https://<key>@<host>/<project_id>`
- Extracts public key, host, and project ID
- Caches the parsed result after first use

### Envelope Format

Sentry envelopes are newline-delimited JSON:

1. Envelope header (event_id, sent_at, dsn)
2. Item header (type: "event")
3. Event payload (exception, tags, extra, stack frames)

### Stack Trace Parsing

The reporter parses JS stack traces into Sentry-compatible frames with filename, function name, line/column numbers, and `in_app` flag (false for `node_modules`).

## What's NOT Included (vs full SDK)

- Session replay
- Performance tracing / transactions
- Breadcrumbs (business events log to console in dev)
- Global user context (user info is attached per-error instead)
- Source map uploads (requires SENTRY_AUTH_TOKEN)
- Client-side automatic instrumentation

These can be added later if needed by re-enabling the SDK config files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`).

## Configuration

The only required env var is `SENTRY_DSN`. If not set, all reporting is silently skipped.

```env
SENTRY_DSN=https://<key>@<org>.ingest.us.sentry.io/<project_id>
```

## Design Decisions

1. **No SDK dependency for reporting** -- the `@sentry/nextjs` package is still in `package.json` (used by the config files for the build wrapper), but the actual error reporting path no longer requires it.

2. **Constructor-level hook** -- reporting in `UnknownAppError`'s constructor means every server action is covered with zero code changes to existing files.

3. **DSN stays server-side** -- the client error boundary posts to an API route rather than including the DSN in client bundles. More secure.

4. **Fire-and-forget everywhere** -- every reporting call is wrapped in try/catch, uses `.catch(() => {})` on promises, and never blocks the main operation. If Sentry is down, the app is unaffected.
