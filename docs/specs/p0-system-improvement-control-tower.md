# Spec: System Improvement Control Tower

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** small (1-2 files)
> **Implementation result:** canonical output delivered at `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` and indexed from `docs/research/README.md`

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                  | Date                 | Agent/Session   | Commit  |
| ---------------------- | -------------------- | --------------- | ------- |
| Created                | 2026-04-03 00:15 EDT | Planner (Codex) |         |
| Status: ready          | 2026-04-03 00:15 EDT | Planner (Codex) |         |
| Docs output created    | 2026-04-03           | Codex           | pending |
| Research index updated | 2026-04-03           | Codex           | pending |
| Status: verified       | 2026-04-03           | Codex           | pending |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

_The developer's actual words, cleaned up for readability but faithful to what they said. Remove filler and repetition, keep the passion and reasoning. This is the "why behind the why." If the developer was on a voice-to-text rant, capture the gold._

- We need to synthesize all research into a cross-reference document.
- This should let us leverage the findings together with the existing specification documents.
- The goal is to guide implementation or modification of the current website build so performance and user experience improve.
- Is there anything else we can synthesize to improve our system.
- Do not build, just write a spec.
- Proceed with the most intelligent decisions on my behalf, in the correct order.

### Developer Intent

_Translate the raw signal into clear system-level requirements. What were they actually trying to achieve beneath what they said? Preserve reasoning, not just outcomes._

- **Core goal:** create one system-level planning surface that sits above the current research and spec library so future builders and planners can tell what is already verified, what still needs verification, what should be consolidated, and what should happen next without re-synthesizing the repo from scratch.
- **Key constraints:** docs-only; do not start a runtime build; do not create another scattered memo set; preserve the existing website cross-reference and underlying research as source material instead of replacing them.
- **Motivation:** the repo already has strong raw research, but it is distributed across audit docs, queue docs, website synthesis, and large forward-looking specs. That distribution still leaves room for duplicate planning, overbuilding, and feature work that jumps ahead of validation.
- **Success from the developer's perspective:** a future agent can open one canonical control document and immediately see which workstreams are verified foundations, built-but-unverified debt, ready-spec build candidates, research-backed but unspecced opportunities, dead zones, redundancy targets, and validation-blocked bets.

---

## What This Does (Plain English)

This spec creates a canonical system-improvement control-tower document under `docs/research/foundations/` and adds it to the research index. After it is implemented, a planner or builder should be able to open one document and understand the current system posture, the highest-value next work, the major things that must not be restarted, and the exact difference between verified foundations, verification debt, research-backed opportunity, and work that is blocked on real evidence.

---

## Why It Matters

ChefFlow is no longer missing raw research. The problem is that the current truth is split across multiple good documents, which still lets future work drift. This control tower turns those documents into one execution-facing decision surface so the next move is chosen from evidence instead of momentum.

---

## Files to Create

| File                                                                       | Purpose                                                                                                                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` | Canonical system-level planning and prioritization reference that cross-links audit findings, queue state, research posture, and next-action order. |

---

## Files to Modify

| File                      | What to Change                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `docs/research/README.md` | Add the new control-tower document under canonical foundational references and the recent research set. |

---

## Database Changes

None.

---

## Data Model

This is a documentation feature, so it does not add schema. It does define a canonical decision model that the control-tower document must use consistently.

Each control-tower row represents one workstream and must include:

- **Workstream**: short name for the domain being decided
- **Current repo truth**: what is already true today
- **Primary evidence**: the canonical source docs or specs that support the claim
- **Status**: one of the fixed decision statuses below
- **Next action**: what should happen next, in plain language
- **Should a builder code now?**: `yes`, `no`, or `only after a narrow spec`
- **Dependencies / prerequisites**: what must be true first
- **No-touch boundary**: what not to restart or accidentally widen
- **Unverified / blocked note**: what still requires real evidence

Allowed status values:

- `verified-foundation`
- `built-unverified`
- `ready-spec`
- `research-backed-unspecced`
- `blocked-on-evidence`
- `dead-zone`
- `redundant-needs-consolidation`
- `validation-required`
- `long-horizon-in-progress`

The document must not invent new status vocabulary outside this list.

---

## Server Actions

None.

---

## UI / Component Spec

### Page Layout

The deliverable is a canonical research document, not a runtime page. Its structure must be explicit and decision-first:

1. **Purpose and scope**
   - State that this is the canonical system-level decision surface for improvement work.
   - State that it does not replace the underlying research and specs.
2. **Current system posture**
   - Summarize the high-level truths from build state, feature saturation, verification debt, and anti-clutter rules.
3. **Decision status legend**
   - Define the fixed status vocabulary once, before the matrix.
4. **System improvement matrix**
   - Required columns:
     - workstream
     - current repo truth
     - primary evidence
     - status
     - next action
     - should a builder code now
     - dependencies / prerequisites
     - no-touch boundary
     - unverified / blocked note
5. **Recommended execution order**
   - Give the correct system-wide order for next work, not just a list of possibilities.
6. **Workstream sections**
   - At minimum include:
     - verified public and product foundations
     - built-but-unverified queue work
     - ready-spec work that is safe to build
     - research-backed but unspecced gaps
     - dead zones to gate or hide
     - redundancy / consolidation targets
     - assumption debt and validation tasks
     - long-horizon platform or parity work that should not outrank nearer obligations
7. **No-touch boundaries**
   - Spell out what future builders must not restart or fake.
8. **Maintenance rule**
   - Explain how the document stays current when a queue item, foundational doc, or large spec changes.

### States

- **Loading:** not applicable.
- **Empty:** not allowed. If any of the major workstream classes above are missing, the document is incomplete.
- **Error:** broken links, stale status labels, or missing evidence references count as documentation bugs.
- **Populated:** every major system-improvement domain is mapped to evidence, current status, and the correct next move.

### Interactions

- A future agent should be able to open this one document, then click outward to the underlying audit, queue, website cross-reference, or implementation spec without re-synthesizing the repo.
- The document must make it obvious when the next move is verification, consolidation, gating, survey validation, or writing a new narrow spec.
- The document must never imply that a large in-progress plan or research-backed idea is the same thing as a verified production foundation.

---

## Edge Cases and Error Handling

| Scenario                                              | Correct Behavior                                                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A workstream appears in multiple source docs          | Pick one canonical evidence source, list the others as supporting docs, and do not let the row contradict them.               |
| A workstream is built but still unverified            | Mark it `built-unverified`; do not treat it as safe baseline.                                                                 |
| A workstream is research-backed but has no build spec | Mark it `research-backed-unspecced` and say "write a narrow spec before code."                                                |
| A workstream is blocked on proof or user validation   | Mark it `blocked-on-evidence` or `validation-required`; do not promote it into current product truth.                         |
| A workstream is a dead zone or redundancy problem     | Do not frame it as new feature opportunity. Frame it as gate, hide, merge, or clarify.                                        |
| A source doc changes later                            | Update the control-tower row and the affected status in the same pass so the synthesis does not drift from the evidence base. |

---

## Verification Steps

1. Create `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`.
2. Confirm the new document presents itself as the canonical system-level improvement decision surface, not as a replacement for the underlying research library.
3. Confirm the document includes a fixed decision-status legend using only the statuses defined in this spec.
4. Confirm the matrix includes, at minimum, rows for:
   - verified public and product foundations
   - active built-but-unverified specs
   - ready-spec work
   - research-backed but unspecced website gaps
   - dead zones
   - redundancy / consolidation targets
   - assumption debt / validation-required work
   - long-horizon platform-intelligence work
5. Confirm every row contains primary evidence, current status, next action, builder-do-now guidance, and a no-touch or blocked note.
6. Confirm the recommended order prioritizes verification, dead-zone gating, and consolidation before broad new feature expansion when the source docs require that.
7. Confirm `docs/research/README.md` links the new foundational document in both the canonical foundational references section and the recent research set.

---

## Out of Scope

- Not changing runtime code, routes, components, schema, or queue status.
- Not verifying any built feature in this planning slice.
- Not rewriting the website cross-reference, phase-shift audit, or verification queue into one mega-document.
- Not replacing the platform-intelligence spec with a shorter doc.
- Not inventing product truth where the source docs still say validation or evidence is required.

---

## Notes for Builder Agent

- This is a synthesis job, not a product design rewrite.
- Keep the new document stable and high-signal. It should point outward to source docs, not duplicate whole sections of them.
- Prefer path-stable references to source documents. Use line numbers in the spec and planner validation, but do not make the control-tower document itself depend on brittle line references.
- If a workstream changes status later, update the control tower and the research index in the same pass.
- If a source doc contains an explicit anti-overbuild or anti-fabrication rule, preserve it in the control-tower row instead of smoothing it away.

---

## Spec Validation (Planner Gate)

### 1. What exists today that this touches?

- The research library already distinguishes foundational references from topical research and expects foundational docs to synthesize system-level truth and stay stable over time at `docs/research/README.md:21-30`.
- The current foundational set includes a website-only cross-reference, but not a system-wide control surface, at `docs/research/README.md:45-49`.
- The recent-research index already points planners toward the website cross-reference, competitor work, gap-closure handoff, and platform workflow research, but these are still separate documents at `docs/research/README.md:62-78`.
- The existing website cross-reference is explicitly limited to website-build work only and explicitly says it does not replace narrower specs or the platform-intelligence product spec at `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:22-29` and `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:42-66`.
- The system audit already states the core system posture: ChefFlow is structurally complete but unvalidated, with dead zones, redundancy, built-but-unverified specs, and assumption debt at `docs/research/phase-shift-system-audit-and-validation.md:11-13`, `docs/research/phase-shift-system-audit-and-validation.md:39-48`, `docs/research/phase-shift-system-audit-and-validation.md:52-84`, `docs/research/phase-shift-system-audit-and-validation.md:101-117`, and `docs/research/phase-shift-system-audit-and-validation.md:189-239`.
- The verification queue already tracks active built-but-unverified implementation debt and says verification may proceed on the current green dirty checkout at `docs/research/built-specs-verification-queue.md:7-24` and `docs/research/built-specs-verification-queue.md:28-120`.
- The platform-intelligence spec already exists as a large, in-progress long-horizon product plan and explicitly warns that the first believable win is email-first, source-tracking-first capture, not full deep integration at `docs/specs/platform-intelligence-hub.md:3-6`, `docs/specs/platform-intelligence-hub.md:19-27`, and `docs/specs/platform-intelligence-hub.md:37-48`.
- The competitor gap-closure handoff already imposes evidence discipline with `Observed`, `Documented`, and `Inferred` and warns against updating a spec without updating the evidence base at `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md:311-339`.
- The current build state is green but explicitly tied to a dirty checkout, which matters for how future builders interpret "ready to build" versus "safe to build right now" at `docs/build-state.md:13-33`.

### 2. What exactly changes?

- Create one new foundational research document at `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` that sits above the existing system audit, verification queue, website cross-reference, and long-horizon platform spec.
- Update `docs/research/README.md` so the new control-tower document appears in the canonical foundational references section and the recent research set, following the existing archival and retrieval rules at `docs/research/README.md:43-78` and `docs/research/README.md:104-108`.
- The new document does not replace the current website cross-reference or phase-shift audit. It converts their scattered guidance into one system-level decision matrix, which the current repo does not already have. Evidence for the gap: the website cross-reference is explicitly website-only at `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:22-29` and `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:42-66`, while the phase-shift audit is broad but not execution-ordered across spec/readiness classes at `docs/research/phase-shift-system-audit-and-validation.md:11-13` and `docs/research/phase-shift-system-audit-and-validation.md:223-239`.

### 3. What assumptions are you making?

- **Verified:** the research library wants stable foundational synthesis documents rather than more isolated memos, per `docs/research/README.md:21-30`.
- **Verified:** there is already a website-only foundational cross-reference, so the missing layer is broader system prioritization, not another website handoff, per `docs/research/README.md:45-49` and `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:22-29`.
- **Verified:** the system audit still frames the next categories of work as verification, consolidation, dead-zone cleanup, and validation, not broad net-new feature work, per `docs/research/phase-shift-system-audit-and-validation.md:223-239`.
- **Verified:** built-but-unverified debt is still active and should not be silently treated as done, per `docs/research/built-specs-verification-queue.md:7-24`.
- **Unverified but safe:** whether the developer wants this control tower to become the first doc for all future non-website work, or just a high-value additional foundational doc. This does not affect correctness because the spec keeps it additive and does not demote the existing foundational docs.
- **Unverified but safe:** whether the exact status names above are the permanent long-term vocabulary. The repo does not define a cross-document status taxonomy for research control towers today, so this spec defines one explicitly to prevent builder guessing.

### 4. Where will this most likely break?

1. **Duplication instead of synthesis.** A builder could copy large chunks of the audit, queue, and website doc into the new file, producing a noisy mega-doc instead of a decision surface. The source docs themselves already have distinct jobs, so duplication would weaken maintenance and truth discipline (`docs/research/README.md:12-17`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:24-29`).
2. **Status inflation.** A builder could mark large in-progress or built-but-unverified work as safe foundation, especially around platform intelligence or recently built trust work. The queue and platform spec both argue against that (`docs/research/built-specs-verification-queue.md:7-24`, `docs/specs/platform-intelligence-hub.md:37-48`).
3. **Losing evidence hygiene.** A builder could summarize conclusions without preserving whether they came from direct observation, documentation, or inference. The gap-closure handoff explicitly forbids that (`docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md:311-339`).

### 5. What is underspecified?

- The exact final markdown presentation of the control matrix is still a builder choice, but the required columns in this spec remove the dangerous ambiguity.
- The exact set of workstream rows can vary slightly as long as every required class in `## Verification Steps` is represented.
- The document title is fixed by this spec, but the section heading names can be adjusted if the meaning stays intact.

Nothing that affects correctness is left vague. The remaining flexibility is presentational, not architectural.

### 6. What dependencies or prerequisites exist?

- No code, schema, or runtime prerequisite exists because this is docs-only.
- The builder must use the current foundational and supporting docs as inputs, especially:
  - `docs/research/phase-shift-system-audit-and-validation.md`
  - `docs/research/built-specs-verification-queue.md`
  - `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
  - `docs/specs/platform-intelligence-hub.md`
  - `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`
- The builder should respect the current dirty-checkout warning in `docs/build-state.md:13-33` when describing what is safe to build next.

### 7. What existing logic could this conflict with?

- It could conflict with the current website cross-reference if the new control tower tries to absorb website-specific sequencing instead of linking outward. That website doc is intentionally scoped and should stay that way (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:42-66`).
- It could conflict with the verification queue if the control tower restates queue status inaccurately or turns queue items into completed foundations (`docs/research/built-specs-verification-queue.md:7-24`).
- It could conflict with the anti-clutter rule if it reframes speculative work as greenlit feature expansion (`docs/research/phase-shift-system-audit-and-validation.md:223-239`).
- It could conflict with the platform-intelligence spec if it pretends long-horizon platform capture should outrank nearer reliability and validation work (`docs/specs/platform-intelligence-hub.md:37-48`).

### 8. What is the end-to-end data flow?

This is a documentation flow, not an application data flow:

1. planner reads foundational docs, audit docs, queue docs, and large in-progress specs
2. planner creates the control-tower synthesis document
3. planner updates the research index
4. future builder or planner opens the control tower first
5. the control tower routes them to the correct underlying source doc or spec before any build decision is made

There is no DB write, runtime route, or user-facing UI update in this slice.

### 9. What is the correct implementation order?

1. read the source documents listed in this spec
2. create `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
3. populate the document with the fixed status legend and control matrix
4. add the ordered next-step section and no-touch boundaries
5. update `docs/research/README.md`
6. verify that the new foundational doc points outward cleanly and does not duplicate the source docs wholesale

### 10. What are the exact success criteria?

- One new foundational control-tower document exists at the exact path above.
- The research index links it in the two required sections.
- The document clearly distinguishes:
  - verified foundations
  - built-but-unverified work
  - ready-spec work
  - research-backed but unspecced work
  - dead zones
  - redundancy / consolidation targets
  - validation-required assumptions
  - long-horizon in-progress work
- The document gives one explicit next-step order.
- The document preserves evidence discipline and no-touch boundaries.
- The document does not replace the underlying audit, website cross-reference, queue, or platform-intelligence spec.

### 11. What are the non-negotiable constraints?

- Docs-only. No runtime code, schema, queue-status edits, or build-state edits.
- Do not invent product truth or queue state.
- Do not collapse `Observed`, `Documented`, and `Inferred` into one voice.
- Do not present built-but-unverified work as verified foundation.
- Do not let speculative platform or parity work outrank validation, consolidation, or dead-zone cleanup without evidence.

### 12. What should NOT be touched?

- Do not touch runtime files.
- Do not rewrite the existing website cross-reference.
- Do not alter the contents of the phase-shift audit except by future dedicated research work.
- Do not reclassify the verification queue inside the queue doc itself.
- Do not update `docs/build-state.md`, `docs/session-log.md`, or source research conclusions as part of this spec's implementation.

### 13. Is this the simplest complete version?

Yes. One foundational control-tower document plus one research-index update is the smallest complete artifact that closes the current synthesis gap without creating another planning sprawl problem.

### 14. If implemented exactly as written, what would still be wrong?

- The repo would still need real verification, consolidation work, and user validation. This spec only improves decision quality; it does not resolve the underlying product debt.
- The control tower would still age if future agents update queue docs, foundational docs, or major specs without updating it. That is why the maintenance rule is mandatory.

---

## Final Check

**This spec is production-ready for a docs-only synthesis pass.**

The remaining uncertainty is operational freshness, not correctness:

- queue composition can change as specs get verified
- build-state posture can change
- large in-progress plans can evolve

Those are normal maintenance concerns, not reasons to block this spec. The implementation remains correct as long as the builder uses the current source docs in the same pass and preserves the evidence boundaries defined above.
