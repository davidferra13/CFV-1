# ChefFlow Homepage Improvement Framework - 2026-04-22

Purpose: constrain homepage and landing-page research so it only produces improvements that help ChefFlow.

This is not a general "best websites" document. It is a filter for deciding which external homepage patterns should influence ChefFlow, which should be adapted carefully, and which should be ignored.

## Canonical Constraint

ChefFlow's canonical identity is:

- a chef-first operating system for independent and small culinary businesses
- centered on the authenticated operator workspace
- supported by public discovery, client, staff, partner, admin, and API surfaces

That means homepage research is only valid when it improves one of these outcomes:

1. More qualified operators understand ChefFlow faster.
2. More qualified operators trust ChefFlow enough to sign up or request access.
3. More qualified operators can see real product proof before they bounce.
4. More visitors move from public pages into the operator system.
5. Consumer-facing public pages strengthen the operator brand without confusing the product identity.

If a research finding does not improve one of those outcomes, it is out of scope.

## Current ChefFlow Surface Map

These surfaces do different jobs and must not be judged by one generic homepage standard:

| Surface            | Route            | Primary audience                               | Primary job                                      |
| ------------------ | ---------------- | ---------------------------------------------- | ------------------------------------------------ |
| Consumer homepage  | `/`              | consumers looking for chefs                    | browse, compare, request, book                   |
| Operator landing   | `/for-operators` | chefs and small culinary operators             | explain the operator system and drive signup     |
| Beta / access page | `/beta`          | operators evaluating early access              | capture access requests and walkthrough interest |
| Compare pages      | `/compare/*`     | operators switching from another tool or stack | sharpen migration clarity and category framing   |

Core rule:

- Research about operator acquisition should primarily map to `/for-operators`, `/beta`, and `/compare/*`.
- Research about the root homepage `/` only matters when it improves consumer trust, clearer product architecture, or cleaner routing into operator entry points.

## What Success Looks Like

Homepage and landing-page research should improve these ChefFlow metrics:

| Outcome                       | Primary KPI                                   | Supporting KPI                            |
| ----------------------------- | --------------------------------------------- | ----------------------------------------- |
| Faster operator comprehension | hero CTA click-through                        | bounce rate, first 10-second retention    |
| Stronger operator trust       | demo play rate, walkthrough click rate        | scroll depth to proof sections            |
| Better conversion             | signup start rate, access-request submit rate | form completion rate, CTA split by device |
| Better mobile usability       | mobile signup start rate                      | mobile bounce, rage click reduction       |
| Better page discipline        | conversion without page bloat                 | LCP, INP, CLS, page weight                |

Research should never end at "this looks premium." It must land on a ChefFlow KPI.

## Research Questions

Every studied homepage should help answer at least one of these:

1. How does the page explain the product in five seconds?
2. How does it prove the product is real?
3. How does it show the right workflow, not just abstract brand language?
4. How does it reduce anxiety for a small-business operator making a software decision?
5. How does it make the next step obvious?
6. How does it stay usable on mobile for a busy, distracted operator?
7. How does it stay fast and readable without hiding important proof?

## Inclusion Criteria

A site is worth studying when it matches at least one of these:

- The buyer is a solo operator, founder, owner-operator, or small team lead.
- The product solves operational fragmentation, scheduling, finance, client management, workflow, or service delivery.
- The page must sell a high-consideration workflow product or professional service with trust and proof.
- The mobile experience is important because the audience often works away from a desk.
- The site shows strong product proof, onboarding framing, or conversion architecture relevant to ChefFlow.

Good sample pools:

- operator software
- scheduling and workflow tools
- small-business operating software
- premium service marketplaces
- chef-specific or event-specific competitors
- product pages that use real screens, real proof, and direct CTA structure

## Exclusion Criteria

Do not copy or over-weight patterns from sites that are mainly:

- prestige branding with weak product explanation
- pure entertainment, media, or campaign pages
- giant consumer brands whose trust comes mostly from market dominance
- expensive motion-first experiences that add weight without helping conversion
- enterprise procurement pages built for committee buying
- luxury storytelling pages with no clear operator task or proof model

Important rule:

- Company wealth, market cap, or brand fame is not a score input.
- A rich company only matters if its page solves a problem ChefFlow also has.

## ChefFlow-Specific Scoring Model

Each studied page should be scored out of 100 using these weighted categories:

| Category              | Weight | What to look for                                                                   |
| --------------------- | -----: | ---------------------------------------------------------------------------------- |
| Persona fit           |     15 | Does this page speak to the same kind of decision-maker ChefFlow needs?            |
| Message clarity       |     20 | Can a busy operator understand the offer and value quickly?                        |
| Proof and trust       |     15 | Are there real screens, numbers, workflow proof, testimonials, or grounded claims? |
| Product visibility    |     15 | Can the visitor actually see the software or workflow?                             |
| CTA and flow          |     15 | Is the next step obvious, low-friction, and well matched to intent?                |
| Mobile scanability    |     10 | Can the page be scanned and acted on quickly on a phone?                           |
| Performance restraint |     10 | Does the page avoid unnecessary weight, motion, and clutter?                       |

Total score formula:

- `total_score = persona_fit + message_clarity + proof_and_trust + product_visibility + cta_and_flow + mobile_scanability + performance_restraint`

Decision bands:

- `85-100`: strong reference; likely "use" or "adapt"
- `70-84`: useful patterns; adapt selectively
- `50-69`: mixed; harvest only isolated ideas
- `<50`: not useful for ChefFlow homepage work

## Scoring Questions By Category

### 1. Persona fit (15)

- Does the page sell to a founder, operator, or small team rather than a huge enterprise?
- Does it respect time pressure, budget sensitivity, and practical decision-making?
- Would a private chef, caterer, or meal-prep operator recognize themselves in the buying context?

### 2. Message clarity (20)

- Can the page define the product in one sentence?
- Does the headline state the core operational problem or outcome clearly?
- Does the subhead explain what the product actually does?
- Is the language concrete rather than inflated?

### 3. Proof and trust (15)

- Does the page show real product, real workflows, real artifacts, or real metrics?
- Are claims grounded in observable truth?
- Does the page reduce fear around switching, setup, or trust?

### 4. Product visibility (15)

- Are there real screens, workflow steps, demos, or artifacts?
- Is the product shown early enough?
- Does the page explain what happens after signup?

### 5. CTA and flow (15)

- Is there a clear primary CTA?
- Is the CTA matched to the visitor's intent?
- Are competing CTAs reduced or ordered intelligently?
- Is the form or signup step proportionate to the visitor's trust level?

### 6. Mobile scanability (10)

- Can the page be understood in a fast thumb-scroll session?
- Are sections short, legible, and action-oriented?
- Are buttons easy to find and tap?

### 7. Performance restraint (10)

- Does the page feel fast and controlled?
- Does it avoid heavy motion, autoplay clutter, oversized media, or gratuitous scripts?
- Is performance helping conversion instead of fighting it?

## What To Capture For Each Page

Every studied site should produce a structured row, not free-form admiration.

Required capture fields:

- site name
- URL
- audience
- page type
- score by category
- total score
- one pattern observed
- whether ChefFlow should use, adapt, or ignore it
- why it matters for ChefFlow
- which ChefFlow surface it maps to
- the target KPI
- one implementation hypothesis

Use `data/templates/chefflow-homepage-research-scorecard.csv`.

## Leading Metrics Vs Supporting Metrics

For ChefFlow homepage work, these are the leading measures:

- clarity
- trust
- proof
- CTA flow
- form friction
- mobile readability

These are supporting measures:

- total page weight
- image weight
- font count
- request count
- Core Web Vitals

Supporting metrics matter, but they are not the primary reason a page converts. A fast page with weak proof still fails. A beautiful page with high friction still fails.

## Pattern Decision Rules

When a pattern appears on another site, classify it like this:

### Use

Choose `use` when the pattern:

- directly improves comprehension, proof, or CTA flow
- fits ChefFlow's chef-first operator audience
- is technically realistic for ChefFlow
- does not add avoidable complexity or bloat

### Adapt

Choose `adapt` when the pattern is directionally strong but needs adjustment because:

- the source site is more enterprise than ChefFlow
- the source uses too much animation or copy inflation
- the source assumes a larger budget or stronger brand than ChefFlow has
- the pattern works, but ChefFlow needs a chef/operator version of it

### Ignore

Choose `ignore` when the pattern:

- depends on prestige more than clarity
- adds page weight without proof value
- hides the product
- confuses operator vs consumer identity
- suits a different buyer psychology

## ChefFlow Translation Rule

Every valid research finding must be translated into a ChefFlow hypothesis in this form:

- `If we change [surface] by applying [pattern], then [persona] will be more likely to [behavior], measured by [KPI].`

Example:

- `If we move real workflow proof higher on /for-operators, then independent chefs evaluating the product will be more likely to start signup, measured by hero-to-signup CTR and demo play rate.`

If a finding cannot be translated this way, it should not enter the backlog.

## Current ChefFlow Implications

Based on the current public surfaces and canonical product definition, the immediate implications are:

1. `/for-operators` is the main landing page for operator-facing homepage research.
2. `/` should not be forced into a generic B2B software homepage because it is a consumer marketplace surface first.
3. ChefFlow's strongest public proof angle is "real screens, real demo, real product state." Research should amplify that.
4. Research should prioritize solo and micro-team operator trust, not enterprise polish theater.
5. CTA studies should focus on the relationship between `Get Started Free`, walkthrough requests, and access-request flows.

## Research Sprint Method

For a focused homepage study, use this order:

1. Pick 20-30 relevant sites, not 100 generic "best websites."
2. Score each site with the ChefFlow scorecard.
3. Pull only the top 5-10 transferable patterns.
4. Map each pattern to a ChefFlow surface and KPI.
5. Turn each pattern into a specific product or content test.
6. Test on the ChefFlow surface with before/after measurement.

## Deliverables Required From Any Homepage Research

No homepage research is complete until it produces:

- a scored comparison sheet
- a short list of patterns to use
- a short list of patterns to avoid
- a ChefFlow-specific hypothesis for each recommended change
- a target surface
- a target KPI
- a proposed priority

## Hard Stop Rules

Stop or discard research if it starts drifting into:

- "This company is big so their website must be right"
- generic web-design awards logic
- visuals with no connection to operator conversion
- recommendations that do not map to a ChefFlow route and KPI
- consumer-homepage changes that weaken operator-system clarity

## Companion Inputs

This framework should be read alongside:

- `docs/project-definition-and-scope.md`
- `docs/chefflow-product-definition.md`
- `app/(public)/page.tsx`
- `app/(public)/for-operators/page.tsx`
- `app/(public)/beta/page.tsx`

## Short Version

The only homepage research that matters is research that makes ChefFlow clearer, more believable, easier to act on, and more efficient at moving the right operator into the product.
