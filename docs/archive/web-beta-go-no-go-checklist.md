# Web Beta Go / No-Go Checklist

Status date: `2026-03-16`

Current decision: `NO-GO`

## Why The Current Build Is Not Ready

- `npm run build` fails, so there is no reliable production artifact for external users.
- `npm run test:unit` still has widespread failures, so regressions are not contained.
- `npm run verify:release:web-beta` now blocks on the public health contract, a beta-flavored production build, and packaged beta smoke tests.

## Hard Decision Rule

Do not invite external users unless the release candidate commit passes all of these:

1. `npm run build`
2. `npm run test:unit`
3. `npm run verify:release:web-beta`

If any one of the three is red, the decision is `NO-GO`.

## Required Release Evidence

### Product Truthfulness

- Homepage, pricing, and beta waitlist language all describe the same offer.
- External users are not promised a self-serve flow that the product does not actually support yet.

### Release Gate

- `npm run verify:release:web-beta` passes on the exact commit being deployed.
- The command runs the beta secrets check, beta typecheck and lint, critical tests, the public health contract test, a beta production build, and beta release smoke.

### Environment And Auth

- Beta `.env.local` matches the beta domain and services.
- PostgreSQL redirects, Google OAuth callbacks, and Stripe settings are correct for beta.

### Health And Observability

- External uptime monitors hit `/api/health/readiness?strict=1`.
- Sentry receives beta errors under the beta environment.
- PostHog captures the activation funnel for beta users.

### Core Workflow Proof

- A chef can sign in, complete onboarding, and finish one meaningful workflow.
- A client can reach the intended profile or feedback path.
- Feedback submission is live and routed to an owner.

### Operations

- `bash scripts/deploy-beta.sh` works on the release candidate.
- `bash scripts/rollback-beta.sh` has been verified recently.
- One named owner is watching beta support and incident alerts.

## Build, Package, And Distribute

1. Freeze the release candidate commit.
2. Run `npm install`.
3. Run `npm run verify:release:web-beta`.
4. If it passes, deploy to the beta host with `bash scripts/deploy-beta.sh`.
5. After deploy, verify `https://beta.cheflowhq.com/api/health/readiness?strict=1`.
6. Manually smoke the home page, pricing page, sign-in, one chef workflow, and feedback flow.
7. Distribute only the hosted beta URL to external users.

## What Easy Install Should Mean Right Now

- Primary path: open the hosted beta URL in a browser.
- Secondary path: add the web app to the home screen after PWA update behavior is verified.
- Not ready: desktop installers, store-distributed mobile apps, or self-hosted source installs for external users.
