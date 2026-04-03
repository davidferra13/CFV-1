# Spec: OpenClaw Non-Goals and Never-Do Rules

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `openclaw-canonical-scope-and-sequence.md`, `openclaw-internal-only-boundary-and-debranding.md`
> **Estimated complexity:** small (1-3 files)

## Timeline

| Event         | Date                | Agent/Session | Commit |
| ------------- | ------------------- | ------------- | ------ |
| Created       | 2026-04-02 23:59 ET | Codex         |        |
| Status: ready | 2026-04-02 23:59 ET | Codex         |        |

---

## Developer Notes

### Raw Signal

The developer asked a simple but important question: do we have one clear document that says what OpenClaw should never do?

The concern is valid. The repo already has good guardrails, but many of them are spread across multiple specs. That makes it too easy for a future builder to absorb the ambition and miss the hard boundaries.

The developer wants a clear policy artifact that says, in plain language, what OpenClaw must not become, must not expose, must not claim, and must not do, even if those things seem technically possible.

### Developer Intent

- **Core goal:** Create one explicit guardrail document that builders can read before expanding OpenClaw.
- **Key constraints:** This is a policy and sequencing spec, not an implementation project. Keep it short, clear, and forceful.
- **Motivation:** OpenClaw has grown from a narrow runtime into a broader intelligence plan, which increases the risk of scope drift, boundary drift, and hype-driven implementation.
- **Success from the developer's perspective:** A future builder can answer "what must OpenClaw never do?" without scanning five other specs.

---

## What This Does (Plain English)

This spec defines the non-negotiable things OpenClaw must not do.

It exists so that future expansion stays useful, internal, truthful, and bounded.

---

## Why It Matters

OpenClaw is ambitious enough that a builder can accidentally drift into:

- public exposure
- fake certainty
- wrong ownership
- runtime overreach
- fragile infrastructure decisions
- compliance problems

This spec is the stop sign.

---

## Core Rule

If a proposed OpenClaw change violates any rule in this document, stop and write or update a narrower spec before building.

Do not treat these rules as suggestions.

---

## Never-Do Rules

### 1. Never expose OpenClaw as a public product

OpenClaw must never become a public-facing product, route, or branded experience for ordinary users.

Allowed:

- founder-only internal tools
- internal documentation
- internal runtime consoles

Not allowed:

- public OpenClaw pages
- chef-facing OpenClaw branding
- user-visible "talk directly to OpenClaw" behavior

### 2. Never let public or chef-facing users talk directly to the runtime

No browser or public route should directly call OpenClaw runtime APIs.

ChefFlow owns the user-facing surface.
OpenClaw stays behind ChefFlow-owned storage, rules, and presentation.

### 3. Never silently present inferred data as observed truth

Inferred prices, partial metadata, or degraded freshness must never masquerade as directly observed facts.

If data is inferred, partial, degraded, or stale, the system must know that internally and present it according to the product boundary rules.

### 4. Never invent unsupported claims

OpenClaw must never invent:

- allergy or gluten-free claims
- nutrition facts
- stock certainty
- expiration dates
- retailer relationships
- pricing certainty

without explicit upstream evidence.

### 5. Never let the runtime own ChefFlow workflow UX

OpenClaw must never become the owner of:

- recipe scaling
- chef workflow UX
- saved-list behavior
- public presentation logic
- consumer booking flow behavior

Those belong to ChefFlow.

### 6. Never let ChefFlow quietly become the owner of runtime truth

ChefFlow must not quietly become the long-term owner of:

- scraping
- source health
- canonical metadata enrichment
- inference truth
- source pingability truth

Bridges are acceptable. Silent ownership drift is not.

### 7. Never optimize for crawling volume over value

OpenClaw must not behave like a vanity crawler that expands because it can.

It must not prioritize low-value scanning over:

- repair
- freshness
- recipe-completion lift
- chef-facing usefulness
- operational value

### 8. Never assume spare CPU means safe spare throughput

Low CPU alone is not permission to multiply work.

The runtime must not increase concurrency without considering:

- RAM
- disk I/O
- SQLite contention
- network pressure
- rate limits
- queue stability

### 9. Never allow unbounded agent spawning or arbitrary code-writing behavior

The meta-agent is a bounded task router, not a self-authoring autonomous coding system.

OpenClaw agents must never:

- fork uncontrolled processes
- spawn infinite repair loops
- create arbitrary new agent classes on their own
- write or deploy runtime code autonomously

### 10. Never destroy the current runtime without verified replacement

Do not wipe the Pi database.
Do not delete current scrapers just because a cleaner architecture exists on paper.
Do not break sync or health behavior before the replacement path is verified.

Additive before substitutive.

### 11. Never claim completeness the system has not earned

OpenClaw must not claim:

- national completeness
- all-states coverage
- full category coverage
- universal recipe-pricing reliability

unless the underlying evidence truly supports it.

### 12. Never commercialize scraped retailer content casually

OpenClaw must not be used to casually publish or commercialize:

- scraped retailer images
- raw retailer-branded content
- unsupported inventory assertions
- unsupported dietary or health claims

without explicit rights, compliance, and substantiation review.

### 13. Never fabricate trust just to make the product feel more complete

If proof, freshness, or completeness is weak, the answer is:

- improve the system
- label reality honestly

not:

- fake confidence
- synthetic proof
- inflated claims

### 14. Never treat the current heuristic set as permanent truth

The builder must not assume the first frontier score, first inference formula, or first repair heuristic is final.

OpenClaw should improve by evidence, but it must improve through controlled iteration rather than chaotic redesign.

### 15. Never start a major slice without a KPI contract

OpenClaw must not begin a meaningful runtime slice when success is still vague.

If a slice does not have:

- an objective summary
- exact KPI targets
- warning and failure thresholds
- one dedicated goal-governor owner

then it is not ready to start.

---

## Builder Interpretation

When evaluating a proposed feature, ask these questions in order:

1. Does this keep OpenClaw internal?
2. Does it preserve the OpenClaw/ChefFlow ownership boundary?
3. Does it increase truthful usefulness rather than fake completeness?
4. Does it preserve direct-observation authority?
5. Is it bounded operationally?
6. Is it worth the maintenance and compliance cost?

If the answer to any of those is "no" or "unclear," stop and escalate to spec clarification.

---

## Verification Steps

1. Read this document before expanding OpenClaw scope.
2. Cross-check any new OpenClaw task against the Never-Do Rules.
3. If the task touches chef-facing or public-facing surfaces, also read `openclaw-internal-only-boundary-and-debranding.md`.
4. If the task expands runtime behavior, also read `openclaw-ideal-runtime-and-national-intelligence.md`.
5. If the task conflicts with this spec, this spec blocks implementation until the conflict is resolved explicitly.

---

## Out of Scope

- New runtime services
- Product code changes
- Raspberry Pi changes
- Database migrations
- Rewriting the broader OpenClaw vision

This spec is a guardrail artifact only.

---

## Notes for Builder Agent

1. Read this after the canonical scope spec and before major runtime expansion.
2. If a future spec accidentally pushes OpenClaw past these boundaries, stop and flag it.
3. This document is intentionally negative. Its job is to stop bad expansion, not to describe the whole positive vision.
