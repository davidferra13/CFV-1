# Research To Build Reference

## Research Ingestion

Extract core claims, user needs, product opportunities, UX patterns, technical requirements, data/model implications, workflow implications, edge cases, risks, security/privacy concerns, assumptions, contradictions, open questions, and strong evidence vs weak speculation.

Preserve original language when it carries product intent, but avoid long quotes.

Before extraction, normalize messy inputs:

- Collapse exact or near-duplicate pasted sections.
- Preserve separate threads when they represent different ideas.
- Identify the intended center of gravity: feature, domain model, brand thesis, user worldview, operational workflow, or technical constraint.
- Pull out repeated motifs instead of repeating source text.
- Note when the research is expressive or metaphorical rather than evidentiary.

## Conceptual Research Protocol

When research is broad, philosophical, metaphor-heavy, or not tied to a product surface, do not force a full build pack. First extract product primitives:

- Nouns: entities, people, objects, records, signals, systems, tools.
- Verbs: actions, handoffs, transformations, checks, repairs, decisions.
- Loops: recurring cycles, feedback paths, review rituals, capture/retrieve flows.
- States: active, waiting, blocked, complete, uncertain, trusted, stale, private.
- Promises: what the product should make easier, safer, clearer, faster, or calmer.
- Trust rules: what must be labeled, verified, permissioned, private, reversible, or auditable.
- Metaphors: body systems, nervous systems, infrastructure, memory, support networks.
- Constraints: what should not be automated, inferred, exposed, flattened, or overclaimed.

Then state which product decisions are missing before implementation can be responsibly shaped.

## Concept Extraction Output

For broad conceptual research, return this shorter structure instead of the full pack:

1. Distilled thesis
2. Repeated motifs
3. Product primitives
4. Possible product directions
5. What is not build-ready yet
6. Spec questions needed before queueing

Example primitives from conceptual life-systems research:

- Loop: capture -> clarify -> act -> save progress -> review -> resume.
- State: active, waiting, blocked, complete, stale, trusted, uncertain.
- Promise: reduce friction between intention and action.
- Trust rule: label uncertainty instead of pretending full transparency.
- Metaphor: human life as support infrastructure.

## Existing Implementation Map

Determine what already exists, partially exists, exists but is weak or misaligned, exists under another name, is duplicated, is obsolete because the research changes direction, and which systems would be touched by implementation.

Assess whether the current architecture supports the research or fights it.

## Gap Analysis Categories

For each gap, explain what the research says, what the codebase currently does, why the gap matters, what would close it, and how to verify closure.

Use these categories:

- Product gaps: missing user-facing capabilities.
- UX gaps: confusing, slow, incomplete, or low-trust flows.
- Data gaps: missing fields, tables, state, events, audit trails, or derived data.
- Workflow gaps: missing lifecycle steps, approvals, review states, handoffs, or notifications.
- Integration gaps: missing external APIs, webhooks, imports, exports, sync, or background jobs.
- Security gaps: missing auth gates, tenant scoping, permissions, PII handling, or admin guards.
- Reliability gaps: missing error states, retries, idempotency, observability, or logging.
- Test gaps: missing unit, integration, e2e, smoke, regression, or fixture coverage.
- Documentation gaps: missing product docs, ADRs, operator docs, or onboarding docs.
- Architecture gaps: places where implementation would be brittle unless refactored first.
- Research gaps: things requiring more evidence before building.

If a category has no grounded connection to the research or codebase, omit it instead of filling space.

## Opportunity Lenses

After direct gaps are clear, infer:

- Obvious build ideas.
- Non-obvious build ideas.
- Small quality-of-life improvements.
- Big product bets.
- Automation opportunities.
- Internal/admin tooling opportunities.
- Personalization opportunities.
- Data intelligence opportunities.
- Trust/safety improvements.
- Future platform capabilities.
- Features the research implies but does not explicitly request.

Separate grounded ideas from speculative ideas.

## Build Candidate Fields

For each candidate include title, goal, user/persona, problem being solved, research evidence, current codebase state, proposed behavior, scope, out of scope, acceptance criteria, edge cases, dependencies, risks, security/auth requirements, data model changes, files likely touched, verification plan, suggested priority, and suggested batch/wave.

Group candidates into quick wins, foundation work, user-facing features, internal tooling, refactors, tests/verification, documentation, and follow-up research.

## Evidence Labels

Tag important findings with one of:

- `Research fact`
- `Codebase verified`
- `Inference`
- `Speculation`
- `Open question`

## Queue Item Shape

For each ready item, write raw request / research source, goal, scope, acceptance criteria, risks, dependencies, verification steps, and proof required before done.

For underspecified items, list the exact questions needed to make them queue-ready.

## Strict Status Table

Classify each finding as:

- Already implemented.
- Implemented but needs refinement.
- Partially implemented.
- Not implemented.
- Blocked by architecture.
- Blocked by missing research.
- Not worth building yet.

Do not mark something complete just because there is a vaguely similar feature.

For conceptual research, the status table may classify ideas as "not product-shaped yet" or "needs target surface" instead of pretending implementation status can be known.

## Sequencing Rules

Recommend what should happen first, what depends on what, what can be parallelized, what should not be parallelized because files or systems overlap, what should be queued, what needs a design/spec pass before queueing, what needs research before implementation, and what can be a direct hotfix only if explicitly authorized.

Prefer vertical slices that produce visible, verifiable product value.

## Output Compression

Scale the output to the input's readiness:

- For raw or duplicated transcripts, lead with the distilled thesis and top 5 reusable primitives.
- For conceptual research, keep build candidates at the level of possible product directions until a target surface is chosen.
- For product-shaped research, include concrete files, acceptance criteria, and queue-ready drafts.
- For codebase-shaped research, prioritize current implementation map, gaps, and verification.
- For huge research, list only the highest-leverage candidates first and move long-tail ideas into "later/speculative."

## Full Pack Structure

When a full pack is warranted, return:

1. Executive summary
2. Research insights
3. Existing implementation map
4. Gap analysis
5. Dreamed opportunities
6. Build candidates
7. Already-built vs missing table
8. Recommended sequence
9. Queue-ready items
10. Items needing more spec
11. Follow-up research tasks
12. Risks and unresolved questions

## Follow-Up Research Tasks

Only after extracting build value, create research tasks for unverified assumptions, competitive comparisons, UX examples, technical feasibility, API/vendor constraints, security/compliance implications, performance/scaling concerns, user validation, pricing/business-model impact, and data quality requirements.

Each task should explain why it is needed, what decision it will unblock, what evidence would be enough, and what build item it connects to.
