# Knowledge Confidence Audit + Research Gap Analysis

**Type:** Strategic research prompt (reusable)
**When to use:** Before major product decisions, quarterly planning, or when entering a new validation cycle.
**Agent:** Research (Claude Code or Codex with web access)
**Output:** `docs/research/YYYY-MM-DD-knowledge-confidence-audit.md`

---

## Context Block (Agent Must Internalize Before Starting)

ChefFlow is a universal food services operations platform ("Ops for Artists") built as a self-hosted Next.js app with PostgreSQL, local AI (Ollama), and zero cloud database dependency.

**Primary target:** Solo/private chefs running client-services businesses (3-8 recurring clients, event-based work, one-person operation handling sourcing through invoicing).

**Secondary targets:** Small catering teams (2-5 people), grazing/artisan producers (charcuterie boards, specialty items), farm-to-table operators (seasonal menus, supplier relationships).

**Explicitly NOT targeting:** Executive chefs (POS-centric, staff of 15-40), sous chefs (zero business tool engagement), QSR/restaurant chains, food trucks (already well-served by existing tools).

**Revenue model:** All features free. Voluntary supporter contributions only. No paywalls, no Pro tier, no locked features.

**Current phase:** Validation (since 2026-04-01). Anti-clutter rule: no new features without validated user feedback. Build phase is over. The question is no longer "can we build it?" but "should we, and does the evidence support it?"

**Research corpus:** 11+ persona research reports, 30+ personas mapped, ~265 app pages/routes, master persona synthesis in `docs/research/2026-04-03-multi-persona-transparency-master-synthesis.md`.

---

## Phase 1: Confidence Inventory

For EVERY persona and target segment below, classify what you know into exactly these tiers:

### TIER 1: VERIFIED

State as fact. Cite the source: research report file path, codebase file path, or market data with URL. This is documented, built, or independently corroborated by multiple sources.

### TIER 2: PARTIALLY VERIFIED

Directional evidence exists but confirmation is incomplete. Cite what exists, flag what's missing. Example: "Research says X, but we have no user data confirming chefs actually do X in our app."

### TIER 3: ASSUMPTION

You would have to guess if the system were live and a user asked about it. State the assumption explicitly and why you're making it. No source exists.

### TIER 4: BLIND SPOT

Zero data. You haven't even formed an assumption. Areas that haven't been researched, discussed, or built, but could materially affect the product if wrong.

### TIER 5: CONTRADICTED

Evidence conflicts with current implementation or stated direction. The research says one thing but the codebase or specs do another. Internal contradictions that need resolution before they cause damage.

---

### Apply These Tiers Across Every Axis

**A. Chef-Side Personas**

| Persona                      | Description                                                           |
| ---------------------------- | --------------------------------------------------------------------- |
| Private chef                 | Solo operator, 3-8 recurring clients, event-based                     |
| Solo chef                    | Identical workflow to private chef, different self-label              |
| Personal/family chef         | Recurring household service, weekly meal prep focus                   |
| Meal prep specialist         | Batch cooking, container labeling, delivery logistics                 |
| Small business (2-5)         | Staff scheduling + payroll needs, 5 min daily input tolerance         |
| Catering team (10+)          | BEO generation, multi-department, staffing allocation                 |
| Grazing/charcuterie operator | Artisan producer, board assembly, event-based delivery                |
| Farm-to-table chef           | Seasonal menus, supplier relationships, dynamic food cost             |
| Cannabis chef                | Legally unstable vertical, exists in app, no changes recommended      |
| Luxury/estate chef           | "House book" per venue, never-repeat-dish logic, premium presentation |

**B. Client-Side Personas**

| Persona                 | Description                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| First-time client       | Needs step-by-step guidance, price transparency, written agreement |
| Repeat client           | "Don't make me repeat myself." Expects chef remembers everything   |
| Event organizer         | Wants BEO, milestone check-ins, delivery tracking                  |
| Corporate client        | Budget approval chains, dietary diversity, headcount changes       |
| Wedding client          | High anxiety, long lead time, vendor coordination                  |
| Weekly meal prep client | Recurring schedule, rotating menus, container/label preferences    |
| Guest/attendee          | Dietary safety, clear labeling, post-event feedback channel        |

**C. Operational Personas**

| Persona           | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| Back office       | AP tied to events, POS reconciliation                               |
| Scheduling        | Project-based (not recurring) scheduling with standby pools         |
| Procurement       | Vendor relationship management, price tracking                      |
| Finance/CPA       | Event-based P&L, Section 179 tracking, per-event expense allocation |
| Employees (staff) | Self-service shift swaps, tip transparency, prep lists              |
| Contractors       | Shift confirmation, pay rate visibility, payment tracking           |
| Admin/manager     | Information bottleneck, 10-15 hrs/week scheduling currently         |

**D. Compliance and Legal**

| Persona            | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| Health/food safety | Private chefs rarely inspected; need defensible safety records  |
| Tax                | Per-event expense allocation is the #1 gap industry-wide        |
| Insurance          | COI tracking per event, allergen docs as liability defense      |
| Contracts/legal    | Service agreements, cancellation terms, liability clauses       |
| Allergen liability | Cross-contamination documentation, dietary restriction tracking |

**E. System and Infrastructure**

| Area                    | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| Payments                | Unified ledger across Stripe/cash/Venmo                   |
| Email                   | Gmail-dominant, templates save 20-40 min per proposal     |
| Calendar                | Structural awareness (not just time blocks)               |
| Files/documents         | Receipt capture + event-linked storage                    |
| AI (Remy)               | Client-facing concierge, Ollama-only, conversation memory |
| Price engine (OpenClaw) | Pi-based scraping, 162K prices, 54K ingredients           |
| Self-hosted ops         | Docker PostgreSQL, local FS storage, Cloudflare tunnel    |
| Database                | Ledger-first financial model, 8-state event FSM           |
| Realtime                | SSE with in-memory EventEmitter bus                       |

**F. Market and Business Model**

| Question                | What to assess                                                  |
| ----------------------- | --------------------------------------------------------------- |
| Pricing strategy        | Is "all free + voluntary contributions" sustainable?            |
| Competitive landscape   | Who else serves solo private chefs? What do they charge?        |
| User acquisition        | How do private chefs discover new tools?                        |
| Retention/churn         | What makes a chef stop using a business tool?                   |
| Monetization validation | Is there evidence chefs will voluntarily pay for a free tool?   |
| Market size             | How many active private/personal chefs exist in the US?         |
| Willingness to pay      | What price points have been tested in this market?              |
| Referral dynamics       | Do chefs recommend tools to other chefs? Through what channels? |

**G. Public-Facing Surfaces**

| Surface               | What to assess                                                  |
| --------------------- | --------------------------------------------------------------- |
| Marketing site        | Does the public site convert visitors to signups?               |
| SEO                   | What terms do private chefs search when looking for tools?      |
| Content strategy      | What content would attract the target persona organically?      |
| Social proof          | What proof points exist (testimonials, case studies, metrics)?  |
| Onboarding funnel     | What is the time-to-value for a new chef signing up?            |
| Embeddable widget     | How effective is the client inquiry widget for lead generation? |
| E-Phone Book (vision) | External food operator directory; distinct from ChefFlow        |

---

## Phase 2: Gap Prioritization

Take every TIER 3, 4, and 5 item from Phase 1 and score it on three dimensions:

| Dimension           | Scale | Description                                                                                                   |
| ------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| **IMPACT**          | 1-5   | How much would being wrong here cost? (user trust, revenue, wasted dev time, legal exposure)                  |
| **URGENCY**         | 1-5   | Does this block current work or a near-term decision?                                                         |
| **RESEARCHABILITY** | 1-5   | Can we answer this with desk research (5), or does it require user interviews, analytics, or experiments (1)? |

**Composite score** = IMPACT x URGENCY x RESEARCHABILITY (higher = research this first)

Rank all gaps by composite score. The Top 10 get full treatment in Phase 3.

---

## Phase 3: Research Recommendations

For each of the Top 10 gaps, provide:

### 1. The Question (one sentence, falsifiable)

Write it so the answer is clearly YES or NO, or a specific measurable value.

### 2. Research Method

Choose the best fit: market research, competitor audit, user interview, analytics review, A/B test, expert consultation, regulatory lookup, codebase audit, survey, or other (specify).

### 3. Multi-Lens Analysis

Answer from each perspective:

- **DEVELOPER lens:** What would a technical founder need to know before building toward this?
- **ENTREPRENEUR lens:** What would a business strategist need to know before investing time here?
- **USER lens:** What would the target persona need to be true for this to matter to them?
- **OPERATOR lens:** What would someone running this platform day-to-day need to know?

### 4. Expected Output Format

Specify: research report, decision matrix, competitive comparison table, user story map, financial model, regulatory checklist, or other.

### 5. Estimated Research Effort

Hours of research work (not dev time). Be realistic.

### 6. Decision Fork

What changes in the product if the answer is YES vs NO? Make the stakes explicit.

---

## Phase 4: Meta-Analysis

Step back from the details and answer these five questions:

1. **Pattern detection:** What pattern do you see across the blind spots? Is there a systematic category of knowledge we're consistently missing?

2. **Over-research audit:** Are we over-researched in any area relative to its actual importance to the product? Where have we spent research time that hasn't (and won't) translate to product decisions?

3. **Most dangerous assumption:** What is the single most dangerous assumption we're currently operating on? The one that, if wrong, invalidates the most work.

4. **Launch readiness:** If ChefFlow launched to 100 private chefs tomorrow with only TIER 1 knowledge, what breaks first? What's the first support ticket, the first churn reason, the first "this doesn't work for me"?

5. **Research ROI:** Of all the research we could do, what single investigation would reduce the most uncertainty per hour invested?

---

## Format Rules

- No em dashes. Use commas, semicolons, colons, or separate sentences.
- No hedging. No filler. No "it's worth noting that" or "it should be mentioned."
- Every claim cites a source (file path, URL, or "no source: assumption").
- Use tables for the confidence inventory. Walls of text fail the 2-minute rule.
- Total output: as long as it needs to be. This is a strategic document, not a summary.
- Section headers must be scannable. A reader should find any persona in under 10 seconds.
