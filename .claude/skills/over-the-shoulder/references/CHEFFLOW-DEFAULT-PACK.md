# ChefFlow Default Pack

Use this pack before browsing for common ChefFlow work. Pair it with `SOURCE-CARDS.md`.

## Default Bundles

### Private Chef Booking

Use: Take a Chef, HoneyBook, Tock, Airbnb, Stripe.

Mimic moves:

- Treat the chef-client match as a trust event, not just a form submission.
- Combine proposal, terms, payment, and next steps into one visible clientflow.
- Use deposits or payment states to reduce no-shows and ambiguity.
- Make guest count, date, location, menu, allergies, and service style impossible to miss.

### Chef Business Dashboard

Use: Clover, Toast, QuickBooks, Google Workspace, Linear.

Mimic moves:

- Put today's operational state first: clients, events, prep, payments, issues.
- Expose finance and admin status without forcing accounting language too early.
- Make documents, schedules, contacts, and tasks feel like one operating surface.
- Keep the dashboard dense, scannable, and fast.

### Pricing, Invoice, Tax, And Payments

Use: QuickBooks, TurboTax, Stripe, Restaurant365, Ramp.

Mimic moves:

- Represent every money event as a traceable state.
- Use guided questions for tax/compliance uncertainty.
- Separate estimate, quote, invoice, payment, refund, and reconciliation.
- Show confidence, review, and audit trail before final submission.

### Event And Catering Workflow

Use: Tripleseat, HoneyBook, Tock, SevenRooms, Google Calendar.

Mimic moves:

- Track inquiry to proposal to contract to payment to day-of execution.
- Keep date, venue, guest count, menu, dietary notes, staffing, rentals, and timeline in one place.
- Make client approval and change history visible.

### Guest/Client Memory

Use: SevenRooms, Airbnb, Google Workspace, Notion, Intercom.

Mimic moves:

- Store preferences, allergies, spend history, event history, communication, and open issues.
- Convert memory into next-action guidance, not just notes.
- Keep permissions and tenant boundaries explicit.

### Mobile Polish

Use: Apple, Airbnb, Cash App, Duolingo, Flighty.

Mimic moves:

- Prioritize one primary action per screen.
- Use strong hierarchy, large touch targets, concise status, and native-feeling controls.
- Make money and booking states calm, legible, and trustworthy.
- Use motion only to clarify state changes.

### Reliability And Runtime Proof

Use: Google SRE, Sentry, Datadog, Cloudflare, Netflix.

Mimic moves:

- Define the reliability promise before implementing instrumentation.
- Capture errors with enough context to debug.
- Prove the changed surface in the running app.
- Treat runtime proof as part of done.

### TypeScript And Code Quality

Use: Matt Pocock, Microsoft, GitHub, Stripe, Jane Street.

Mimic moves:

- Prefer explicit domain types over loose strings and anonymous records.
- Use discriminated unions for state machines.
- Let inference work when it improves ergonomics; annotate boundaries.
- Make illegal states harder to represent.

## Default Skips

- NASA: use only for high-risk, irreversible, safety, compliance, or verification-heavy work.
- YouTube/Meta: use only for ranking, feeds, graph, scale, or analytics-heavy systems.
- Tesla/Boston Dynamics/Waymo: use only for real-world autonomy, simulation, physical operations, or field feedback loops.
- Beautiful brand lenses: use only when the work materially touches visual identity, marketing, mobile polish, or perceived premium quality.
