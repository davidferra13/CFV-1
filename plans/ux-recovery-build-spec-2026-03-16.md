# UX Recovery Build Spec

Date: 2026-03-16
Owner: Embedded build recovery
Scope: public funnel stability, onboarding-shell orchestration, asset/auth boundaries, launch verification

## Why this build exists

The current build has three launch-blocking problems:

1. Server-rendered routes import icons through a client-oriented package entrypoint and crash on first render.
2. Public runtime assets are still flowing through auth middleware, so browser platform features fail before the user even signs in.
3. The chef shell allows multiple onboarding and growth prompts to compete on first run, which makes the product feel noisy and brittle even when the underlying workflows are strong.

This build fixes those defects without widening the blast radius into unrelated feature work.

## Build goals

1. Restore stability for `/marketplace-chefs`, `/beta`, and authenticated chef landing routes.
2. Guarantee that platform assets such as `manifest.json`, `robots.txt`, `sitemap.xml`, and service workers bypass auth consistently.
3. Give onboarding exclusive control of first-run attention until the welcome flow, checklist, or guided tour is finished or dismissed.
4. Verify core public, chef, and client flows after a clean restart and prove that no data-layer regressions were introduced.

## Architecture changes

### 1. Server-safe icon boundary

Problem:
`components/ui/icons.ts` is the shared icon adapter for the app, but it currently re-exports from `@phosphor-icons/react`. That entrypoint is safe for client rendering, not for React Server Components in this app.

Change:

- Move the shared icon adapter to `@phosphor-icons/react/ssr`.
- Keep the adapter contract unchanged so the rest of the codebase does not need churn.

Result:

- Server-rendered routes keep using the same import path.
- The SSR/client boundary is fixed at the adapter instead of patched route by route.

### 2. Public asset route policy

Problem:
`middleware.ts` and `lib/auth/route-policy.ts` treat page routes and runtime assets as if they are the same class of request. That causes `/manifest.json` to redirect to auth, which breaks browser install metadata and produces visible runtime errors.

Change:

- Add explicit public-asset classification in the route policy layer.
- Short-circuit auth in middleware for those assets.
- Narrow the middleware matcher so the edge function avoids static asset traffic where possible.

Protected assets in this build:

- `/manifest.json`
- `/robots.txt`
- `/sitemap.xml`
- `/sw.js`
- `/inbox-sw.js`

Result:

- Browser metadata and worker bootstrapping no longer depend on app auth.
- Route-policy tests become the source of truth for public assets, not just public pages.

### 3. Onboarding shell orchestration

Problem:
Onboarding currently owns only the welcome modal, checklist, and spotlight tour. Other shell surfaces decide independently whether to appear, so new chefs can see the tour, checklist, survey banner, push prompt, quick capture, and feedback prompt in the same session.

Change:

- Introduce a small client-side onboarding peripheral visibility module.
- Treat `showWelcome`, `showChecklist`, and `isTourActive` as blocking states for non-essential shell prompts.
- Broadcast state changes through local storage plus a browser event so sibling shell components can react without moving large layout sections across server/client boundaries.
- Subscribe the following components to onboarding visibility:
  - beta survey banner
  - push permission prompt
  - feedback nudge modal
  - mobile quick capture
  - milestone overlay
- Adjust the floating checklist so it:
  - defaults collapsed on small screens
  - clears the mobile bottom nav area
  - remains expanded by default on desktop

Result:

- Onboarding becomes the attention controller for first-run sessions.
- Existing layout composition stays intact.
- The fix is additive and low-risk because it does not change server auth, route structure, or data writes.

## Testing contract

### Automated

- Route policy unit tests
  - public pages remain uncovered by auth
  - public runtime assets remain uncovered by auth
  - API skip paths still behave as before
- Onboarding visibility unit tests
  - visibility logic is deterministic for welcome-not-seen, onboarding-active, and onboarding-cleared states
- Existing onboarding contract tests remain green

### Runtime verification

- Public routes
  - `/`
  - `/pricing`
  - `/marketplace-chefs`
  - `/beta`
  - `/manifest.json`
- Authenticated chef routes
  - `/dashboard`
  - `/inquiries`
  - `/events`
  - `/inbox`
- Authenticated client routes
  - `/my-events`

### Data integrity verification

Focus for this build:

- authenticated role routing still lands each actor on the correct portal
- seeded chef and client sessions still load their existing records
- no server errors are introduced in dashboard and listing routes
- no auth redirect mutates or blocks public metadata endpoints

## Rollout timeline

### Phase 0: same-day recovery, 2026-03-16

- Patch shared icon adapter to SSR-safe exports.
- Patch public asset middleware handling.
- Add focused route-policy coverage for public assets.
- Restart the app cleanly and verify the previously failing routes.

Exit criteria:

- no `createContext is not a function` crashes on audited routes
- `GET /manifest.json` returns `200`

### Phase 1: onboarding shell stabilization, 2026-03-16 to 2026-03-17

- Add onboarding peripheral visibility coordinator.
- Gate non-essential shell prompts behind onboarding completion or dismissal.
- Improve mobile checklist placement and default collapse behavior.

Exit criteria:

- fresh chef session shows one onboarding surface at a time
- mobile task surface remains usable on first load

### Phase 2: funnel proof and launch hardening, 2026-03-17 to 2026-03-19

- Populate public proof surfaces with stable sample data or screenshots.
- Add smoke coverage for public proof routes and chef/client landing routes.
- Run a broader launch verification pass after the UX recovery build is stable.

Exit criteria:

- public marketing flow demonstrates product credibility without broken or empty states
- launch smoke suite passes on restarted app

## Out of scope for this build

- redesigning the entire chef navigation model
- changing billing, onboarding data model, or Supabase schema
- removing compliance prompts entirely
- broad copy or brand refactors outside the verified friction points

## Acceptance criteria

1. The previously broken public and chef routes render without server exceptions.
2. Public browser assets are reachable without auth.
3. Onboarding suppresses secondary prompts until the user has cleared the primary onboarding flow.
4. Mobile checklist placement no longer blocks the bottom navigation area.
5. Focused automated tests pass.
6. Clean restart verification confirms public, chef, and client core routes still load and seeded data still appears intact.
