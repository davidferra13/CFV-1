# Spec: OpenClaw Goal Governor and KPI Contract

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `openclaw-canonical-scope-and-sequence.md`, `openclaw-non-goals-and-never-do-rules.md`
> **Estimated complexity:** medium (3-6 files)

## Timeline

| Event         | Date                | Agent/Session | Commit |
| ------------- | ------------------- | ------------- | ------ |
| Created       | 2026-04-03 00:08 ET | Codex         |        |
| Status: ready | 2026-04-03 00:08 ET | Codex         |        |

---

## Developer Notes

### Raw Signal

The developer said it is imperative to establish a dedicated individual, or agent, singularly focused on the project's ultimate goal and on the exact statistical targets that define success.

This role must:

- care about the final outcome, not just local implementation progress
- understand the exact KPIs that represent that outcome
- anticipate those KPI targets across all relevant aspects of the build
- be formally responsible for this from the beginning, not added as an afterthought

They also made the build-process requirement explicit:

- before implementation, exact statistical benchmarks must be defined
- that responsibility must be vested in the designated agent
- the role must be integrated into the build process from inception
- this should reinforce alignment throughout development

They also raised a follow-up concern:

- they want help identifying additional questions that still matter
- they want to know whether the KPI numbers should be set now or later
- they do not want to choose heroic numbers too early and accidentally throw the build off course
- they want a grounded way to establish baseline truth now, while still admitting which metrics are not yet reliable enough to lock

### Developer Intent

- **Core goal:** Give OpenClaw one explicit goal-governor role that owns the success contract, not just task execution.
- **Key constraints:** This role must be bounded, measurable, founder-aligned, and present before major implementation slices begin.
- **Motivation:** Without a single owner for final-outcome metrics, the runtime can optimize local activity while drifting away from what success actually means.
- **Success from the developer's perspective:** Every meaningful OpenClaw slice starts with a KPI contract, one agent owns the measurement truth, and the founder can see whether the project is converging toward the actual target state rather than just producing more activity.

---

## What This Does (Plain English)

This spec creates a dedicated internal role: the `goal-governor-agent`.

Its job is not to crawl, scrape, infer prices, or enrich metadata directly.

Its job is to:

- hold the canonical success contract
- require exact KPI targets before major build slices begin
- monitor actual progress against those targets
- surface drift, underperformance, and false progress
- keep the runtime aligned to the real objective rather than to vanity activity

---

## Why It Matters

OpenClaw is becoming large enough that it can look busy without actually converging toward the founder's goal.

Examples of false progress:

- expanding coverage that adds little chef-facing value
- improving raw counts while recipe completion is still weak
- increasing concurrency without improving useful outcomes
- building more agents without improving the actual scorecard

The system needs one role that is explicitly loyal to the final objective and its measurable representation.

---

## Core Decisions

1. OpenClaw will have a dedicated `goal-governor-agent`.
2. No major implementation slice should begin without a written KPI contract.
3. The KPI contract must include exact statistical targets, not only qualitative goals.
4. The `goal-governor-agent` owns measurement truth and KPI drift detection, but it does not replace founder judgment.
5. The meta-agent does not own success criteria. It routes work. The goal governor owns whether the work is actually converging on the objective.
6. A slice can be technically complete and still fail if its KPI contract is not met.
7. Founder visibility must include both activity metrics and objective metrics. Activity alone is not enough.

---

## Goal Governor Responsibilities

The `goal-governor-agent` is responsible for:

1. Maintaining the canonical KPI contract for each active OpenClaw slice.
2. Refusing to mark a slice as ready-to-build when exact KPI targets are still undefined.
3. Monitoring actual performance against those targets over defined windows.
4. Flagging KPI drift, vanity progress, or misleading local wins.
5. Creating bounded evaluation or corrective tasks such as:
   - `evaluate_kpi_drift`
   - `recompute_goal_scorecard`
   - `escalate_underperforming_slice`
   - `reprioritize_for_goal_alignment`
6. Publishing a founder-facing scorecard that distinguishes:
   - current status
   - warning state
   - failure state
   - unknown or not-yet-measurable state
7. Explaining whether a slice is improving the actual target outcome or merely increasing system activity.

What it does **not** own:

- scraping itself
- product UX itself
- arbitrary roadmap changes
- corporate-finance strategy
- final founder decisions

---

## KPI Contract Requirements

Every serious OpenClaw build slice must define a KPI contract before implementation starts.

Each KPI contract must include:

- `metric_name`
- `why_it_matters`
- `formula`
- `target_value`
- `warning_threshold`
- `failure_threshold`
- `measurement_window`
- `data_source`
- `owner`
- `review_cadence`
- `slice_phase`
- `leading_or_lagging`
- `baseline_value`
- `baseline_window`
- `minimum_sample_size`
- `calibration_status`

If any of these are missing, the slice is not KPI-ready.

---

## Target-Setting Method

Do not set KPI numbers by vibes, optimism, or fear.

Every KPI should be set in this order:

### 1. Define the metric precisely

Before choosing a number, define:

- numerator
- denominator
- inclusion rules
- exclusion rules
- time window
- data source

If the formula is ambiguous, the number is not yet meaningful.

### 2. Capture the baseline first

Before locking a target, collect a baseline over a real window.

The baseline should record:

- current measured value
- measurement window
- minimum sample size
- data quality caveats
- whether the metric is trustworthy enough to compare over time

### 3. Set three levels, not one

Each serious KPI should have:

- `failure_threshold`
- `warning_threshold`
- `target_value`

Optional:

- `stretch_value`

This avoids the mistake of pretending every metric is either perfect or failed.

### 4. Mark the calibration state honestly

Each KPI should be one of:

- `pending` if the formula exists but baseline capture is not yet trustworthy
- `provisional` if the baseline exists but the metric still needs more sample stability
- `locked` if the metric has enough evidence to be used as a real build gate

### 5. Ratchet by evidence

Targets should only be tightened when:

- the metric has enough volume
- the measurement is stable across multiple review windows
- the stronger target does not simply reward vanity activity

Do not raise the target just because the last number was high once.

---

## Ground Truth We Can Set Now vs Later

We should absolutely define the KPI framework now, but we should not pretend every number is equally trustworthy today.

### High-confidence now

These are usually realistic to baseline early because they come from direct runtime facts or additive instrumentation:

- source count
- stale-source count
- source freshness rate
- source health rate
- incident count
- queue lag
- dead-letter rate
- direct coverage breadth
- direct coverage depth
- image coverage
- source URL coverage
- classification completeness

### Medium-confidence after short calibration

These are worth defining now, but should usually start as provisional until we have a stronger sample:

- recipe ingredient price-resolution rate
- recipe completion success rate
- inferred-price usefulness
- blank-result rate
- nutrition evidence coverage
- allergen evidence coverage
- reliable pingability coverage
- stale-source recovery rate

### Low-confidence until broader instrumentation or longer windows exist

These should still be named now, but their numeric targets should usually remain provisional until the system has enough history:

- conversion-supporting coverage
- retention-supporting usefulness
- marginal value per expansion slice
- maintenance cost efficiency by source family
- national completeness claims
- long-term operator workflow lift

Planning rule:

- define the metric family now
- baseline what we can now
- lock only what is evidence-ready
- keep the rest provisional until the ground truth is strong enough

---

## KPI Families

This spec does not force one universal numeric target for everything today, but it does define the metric families that must be considered.

### Coverage and observation

- direct coverage breadth
- direct coverage depth
- covered cells by status
- source freshness rate
- source health rate

### Price usefulness

- recipe ingredient price-resolution rate
- recipe completion success rate
- inferred-price acceptance rate
- blank-result rate
- freshness-weighted price usefulness

### Metadata completeness

- image coverage
- source URL coverage
- classification completeness
- nutrition evidence coverage
- allergen evidence coverage
- reliable pingability coverage

### Runtime quality

- incident rate
- stale-source recovery rate
- queue lag
- dead-letter rate
- inference recompute lag
- capacity utilization against safe bounds

### Product outcome value

- chef lookup success rate
- recipe-pricing success rate
- high-value geography coverage
- likely conversion-supporting coverage
- likely retention-supporting usefulness

### Economic grounding

- marginal value per expansion slice
- maintenance cost per source or geography family
- low-value repeated refresh rate

This is where practical economics enter the runtime. This is not a substitute for full corporate-finance modeling.

---

## Build-Process Integration

This role must exist from inception of the build lane, not later.

### Pre-implementation gate

Before a builder starts a meaningful OpenClaw slice:

1. the slice must name its objective plainly
2. the KPI contract must define exact statistical targets or explicitly mark them `provisional` with a real baseline plan
3. the `goal-governor-agent` must own the scorecard for that slice
4. the founder must be able to tell what success and failure look like
5. the builder must know which metrics are already trustworthy and which still need calibration

If that does not exist, implementation should pause until it does.

### During implementation

The goal governor must:

- track whether implementation is improving the defined metrics
- surface drift early
- keep local wins from being mistaken for actual success

### After implementation

The goal governor must:

- mark the slice as `on_target`, `warning`, `failed`, or `unknown`
- explain why
- recommend whether the next slice should continue, repair, or reprioritize

---

## Founder Console Requirements

The founder-facing runtime console must eventually include a KPI scorecard that shows:

- active slices
- their target metrics
- current measured values
- warning and failure states
- trend direction
- whether the slice is actually moving toward the objective

This scorecard should not be hidden behind raw activity metrics.

---

## Files to Create

| File                                               | Purpose                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `.openclaw-build/services/goal-governor-agent.mjs` | Dedicated runtime evaluator that owns KPI contracts, scorecards, and drift detection   |
| `lib/openclaw/goal-governor-actions.ts`            | Founder-only server actions to read KPI contracts, scorecards, and drift incidents     |
| `components/admin/openclaw-kpi-scorecard.tsx`      | Founder-only scorecard surface for KPI contracts, current values, and target alignment |

---

## Files to Modify

| File                                                               | What to Change                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md`   | Add the goal-governor role to the ideal runtime, success criteria, and implementation order |
| `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`     | Make KPI contract creation a build gate before implementation slices start                  |
| `docs/research/openclaw-open-questions-decision-log-2026-04-02.md` | Record that KPI ownership is decided even though some numeric targets remain open           |

---

## Verification Steps

1. Confirm the `goal-governor-agent` is named explicitly in the runtime planning docs.
2. Confirm the builder handoff says no major slice starts without a KPI contract.
3. Confirm the KPI contract requires exact statistical targets and not just qualitative language.
4. Confirm the KPI contract also requires baseline, sample-size, and calibration-state fields.
5. Confirm the founder can eventually see KPI alignment separately from raw runtime activity.
6. Confirm the meta-agent is not mistaken for the KPI owner.

---

## Out of Scope

- Setting every exact KPI number in this document
- Replacing founder judgment with automation
- Turning OpenClaw into a corporate-finance model
- Product-wide KPI policy outside the OpenClaw lane

This spec establishes the role, the gate, and the calibration method. Exact numeric benchmarks still need to be filled in per slice, but they should now be filled in with a baseline-first process rather than guesswork.

---

## Notes for Builder Agent

1. Do not start a meaningful OpenClaw slice if the KPI contract is vague.
2. Do not confuse activity metrics with objective metrics.
3. Do not let the meta-agent quietly become the success-governor by accident.
4. If a slice has no measurable success definition, it is not ready.
5. Do not lock heroic KPI targets before baseline evidence exists.
