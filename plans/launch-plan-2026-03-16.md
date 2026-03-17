# ChefFlow Launch Plan - 2026-03-16

Owner: `Product / Platform`
Status: `Draft - recommended path`
Recommended launch mode: `Invite-only web beta first`

## Executive Decision

Do not do a broad public launch yet.

Use this sequence instead:

1. Stabilize the web release gate.
2. Resolve product positioning and pricing contradictions.
3. Launch an invite-only beta on the hosted web app.
4. Add a lightweight PWA install option after web beta is stable.
5. Defer public mobile-store and desktop-app rollout until native release/update paths are intentionally built.

## Why This Is The Right Launch Path

The current repo state supports a controlled web beta, but it does not support a clean broad launch across all channels.

### Evidence in the repo

- Release readiness is explicitly marked not verified in `docs/2026-03-16-release-hardening-status.md`.
- The release hardening note says the repo still fails the release gate because typecheck, build, and unit tests are not green.
- The public pricing page already advertises `$29/month` and a 14-day trial in `app/(public)/pricing/page.tsx`.
- The product direction doc says ChefFlow should be a consumer-first discovery platform with freemium operator revenue and no commission in `docs/consumer-first-vision.md`.
- The current public home page still positions the product as a private-chef operating system in `app/(public)/page.tsx`.
- Tauri is still configured like a development shell in `src-tauri/tauri.conf.json` with version `0.1.0` and `http://localhost:3100`.
- The PWA service worker is active, but the build path is intentionally bypassed on Windows and the repo serves a checked-in `public/sw.js`.

## Launch Strategy

### Phase 0 - Product Decision Lock

Goal: remove public-facing contradictions before inviting real users.

Decisions to make:

- Choose primary motion:
  - `B2B chef operating system first`
  - `Consumer discovery marketplace first`
- Choose initial pricing posture:
  - `Founding cohort free for 60-90 days`
  - `Single paid Pro plan with trial`
  - `Free listing + paid back-office tools`

Recommended choice for the next release:

- Primary motion: `B2B chef operating system first`
- Initial pricing: `Founding cohort free for 60-90 days in exchange for feedback`
- Public pricing page: remove hard commitment to self-serve paid signup until activation and retention are proven

Required repo changes:

- Align `app/(public)/page.tsx` with the chosen launch motion.
- Align `app/(public)/pricing/page.tsx` with the actual pricing decision.
- Align `docs/consumer-first-vision.md` or replace it with the active go-to-market decision if B2B remains primary.

Exit criteria:

- No contradictory homepage, pricing, or strategy messaging remains in the repo.
- A user can understand what ChefFlow is and who it is for in under 10 seconds.

### Phase 1 - Release Gate Stabilization

Goal: make the hosted web app shippable for a controlled beta.

Priority work:

- Make `npm run typecheck` deterministic and bounded.
- Reduce unit-test failures to zero for the beta launch scope, or explicitly quarantine non-blocking suites.
- Get `npm run build` to complete successfully in a normal CI window.
- Make `npm run verify:release` pass, or split it into:
  - `verify:release:web-beta`
  - `verify:release:native`
- Verify the beta deployment flow in `docs/beta-server-setup.md`.
- Standardize the service-worker rebuild process so `public/sw.js` is reproducible and not stale.

Additional launch-blocking checks:

- Verify the client feedback flow end to end.
  - `app/(client)/my-profile/page.tsx` claims clients can submit feedback.
  - The currently inspected feedback actions show multiple feedback entry points with different auth assumptions.
  - This needs one canonical, tested path.
- Verify Stripe mode and environment separation for beta vs production.
- Verify health and cron monitoring behavior with strict failure signaling for external checks.

Exit criteria:

- `verify:release` or an equivalent beta release command passes end to end.
- Hosted beta build is reproducible.
- No known auth, payment, or data-loss blocker remains in the beta scope.

### Phase 2 - Distribution and Update Model

Goal: choose the simplest update path that matches the actual app surfaces.

#### Web

Primary release channel.

- Deploy to hosted web first.
- Use normal production deployments for bug fixes and feature releases.
- This gives the cleanest mass-patch behavior because server-side fixes are immediate and client asset updates can be picked up on refresh.

#### PWA

Secondary convenience install path after web beta stabilizes.

- Keep service worker updates automatic.
- Add a user-facing "new version available" toast if update behavior becomes confusing.
- Treat offline caching as a product feature only after the SW build pipeline is reproducible.

#### Mobile

Do not make App Store / Play Store the primary launch channel yet.

- The Capacitor wrapper currently points at a remote server URL, which is good for shipping web-layer changes quickly.
- Native-shell changes still require store releases.
- Launch mobile publicly only after:
  - push notifications are verified in production
  - auth flows are stable on device
  - update expectations are documented

#### Desktop

Do not publicly ship Tauri yet.

- The current Tauri config is still development-oriented.
- No updater plugin or release feed is wired yet.
- Ship desktop only after the app has:
  - a production Tauri configuration
  - signed builds
  - an updater strategy
  - a tested rollback path

Exit criteria:

- Web is the only required channel for beta.
- Mobile and desktop are explicitly deferred or treated as internal-only until their update paths are productionized.

### Phase 3 - Feedback System

Goal: create one feedback operating loop for beta users.

Use three feedback lanes:

1. In-app product feedback
   - Keep the existing `user_feedback` intake.
   - Route all feedback into the admin inbox.
   - Add structured tags:
     - `bug`
     - `feature_request`
     - `ux_confusion`
     - `billing`
     - `support`

2. Workflow-triggered feedback
   - Send post-event surveys from the event lifecycle.
   - Track response rate, overall rating, and rebook intent.

3. Founder feedback
   - For the first 10-20 beta chefs, run manual onboarding and scheduled calls.
   - Treat calls as primary signal, forms as secondary signal.

Required product work:

- Verify chef feedback flow.
- Verify client feedback flow.
- Add support entry points from:
  - chef settings
  - client profile
  - error states
- Include context automatically on submission:
  - route
  - user role
  - tenant ID if applicable
  - app version / build ID
  - device type

Operational process:

- Review feedback inbox 3 times per week minimum.
- Label every item within 48 hours.
- Reply personally to the highest-value beta users when they submit meaningful feedback.

Exit criteria:

- Every beta user has at least one obvious way to report a bug or request a feature.
- Every feedback item lands in one searchable system.
- Feedback is reviewed on a fixed cadence, not ad hoc.

### Phase 4 - Monitoring and Operational Visibility

Goal: detect breakage before users have to tell you.

Keep the stack split:

- `Sentry` for crashes, exceptions, traces, and replay.
- `PostHog` for product usage, funnels, and retention.
- Uptime checks for public endpoints.

Required dashboards:

1. Reliability dashboard
   - uptime
   - crash-free sessions
   - server error rate
   - slowest routes

2. Product activation dashboard
   - signups
   - onboarding completion
   - first event created
   - first quote sent
   - first payment collected

3. Retention dashboard
   - weekly active chefs
   - returning chefs after week 1, week 2, week 4
   - feature usage concentration

4. Support dashboard
   - feedback volume
   - bug count by route
   - survey response rate

Required fixes before beta:

- External monitors must use a strict health signal, not a route that returns 200 when unhealthy by default.
- Add a deeper health endpoint if needed, but keep `/api/health` fast.
- Confirm Sentry environment separation and sampling settings for beta and production.
- Confirm PostHog events cover the actual activation funnel.

Suggested core metrics:

- crash-free sessions >= 99%
- p95 route transition latency under 1.5s for core pages
- signup -> onboarding completion >= 60%
- onboarding completion -> first meaningful action >= 50%
- week-4 retained beta chefs >= 40%

Exit criteria:

- You can answer "is the app broken?" and "are users getting value?" from dashboards, not guesswork.

### Phase 5 - Beta Cohort Launch

Goal: get real users into the product without opening the floodgates.

Target cohort:

- 10-20 private chefs
- Mix of:
  - solo chefs
  - higher-volume operators
  - one or two "power users" willing to give direct feedback

Recruitment sources:

- personal network
- chef communities
- referrals from early users
- existing contacts using spreadsheets or generic CRM tools today

Offer:

- founding cohort access
- white-glove onboarding
- direct Slack/email/text support
- discounted or free access for the first 60-90 days

Beta process:

1. Recruit
2. Manual onboarding call
3. Import or seed a few real clients/events
4. Observe first workflow completion
5. Collect feedback after week 1 and week 3

Stop-ship conditions during beta:

- payment or ledger integrity issues
- auth / tenant isolation bugs
- lost client/event data
- broken onboarding
- repeated cron or notification failures

Exit criteria:

- At least 5 beta users complete a core workflow without manual rescue.
- At least 3 users express clear willingness to continue using the product.
- The top 5 support requests are understood and prioritized.

### Phase 6 - Public Paid Launch

Goal: open self-serve access only after beta proves product value.

Do this only when:

- release gate is green
- pricing is aligned across product and marketing
- activation funnel is instrumented
- support capacity is defined
- at least one update/rollback drill has been performed on the hosted web app

Recommended paid launch order:

1. Open self-serve web signup
2. Keep pricing simple
   - one plan
   - one trial rule
   - no custom packaging on day one unless required
3. Add public testimonials and two case studies
4. Add a public changelog / release notes page
5. Later, expand to mobile and desktop only if usage justifies the support cost

## Pricing Recommendation

Because pricing is still undecided, use a staged decision:

### Beta pricing

- `Founding cohort: free for 60-90 days`
- In exchange for:
  - at least 2 feedback sessions
  - permission to use anonymized product feedback

### Post-beta pricing

Start with one plan only:

- `Pro`
- monthly subscription
- trial optional, but only after activation flow is stable

Do not start with:

- multiple paid tiers
- a permanent free tier for operators
- custom enterprise packaging
- marketplace commissions

Reason:

- You do not yet have enough evidence to optimize price packaging.
- More tiers will slow launch, complicate onboarding, and muddy analytics.

## First 30 Days

### Week 1

- Lock product motion and pricing posture.
- Remove contradictory public messaging.
- Define `verify:release:web-beta`.

### Week 2

- Fix release blockers.
- Verify feedback flows.
- Set up uptime checks, Sentry, and PostHog dashboards.

### Week 3

- Deploy stable beta build.
- Recruit first 5 users.
- Run manual onboarding for each.

### Week 4

- Review activation and support data.
- Fix the top 3 friction points.
- Decide whether to expand beta to 10-20 users.

## Go / No-Go Checklist

- [ ] Product positioning is consistent across homepage, pricing, and strategy docs.
- [ ] Beta pricing is explicit and truthful.
- [ ] `verify:release` or equivalent web-beta release command passes.
- [ ] Hosted beta deployment is stable and rollback is documented.
- [ ] Health checks and uptime monitors are active.
- [ ] Sentry is receiving production-like beta events.
- [ ] PostHog captures the activation funnel.
- [ ] Feedback flows are verified for chefs and clients.
- [ ] At least one support owner and response-time expectation is defined.
- [ ] First 5 beta users are recruited and scheduled.

## Immediate Next Actions

1. Decide whether ChefFlow is launching first as a B2B chef OS or a consumer discovery marketplace.
2. Remove or rewrite the public pricing page if pricing is not actually locked.
3. Make a `web beta only` release gate and get it green.
4. Verify the feedback, survey, health-check, and monitoring loops end to end.
5. Recruit the first 5 beta chefs and onboard them manually.
