---
name: deep-pass
description: Combined intensify + over-the-shoulder in one invocation. Mines depth moves then validates them against expert public methods. Use when user says /deep-pass, wants to go deep AND get expert validation, or uses intensify and over-the-shoulder together.
---

# /deep-pass

Chains `/intensify` then `/over-the-shoulder` into a single flow. Mines the zone for high-yield depth moves, then holds those moves up against expert public methods for validation, critique, and refinement.

## Input

`/deep-pass [zone] [--quick|--deep]`

- Zone: optional. Infer from conversation context if omitted.
- Depth: controls intensify agent count (quick/normal/deep). Over-the-shoulder lens count scales to match (3/5/7).

## Execution

### Phase 1: Intensify

Run the full `/intensify` workflow for the zone:

1. Check `docs/intensify/{zone}.md` for prior runs
2. Spawn agents per depth (quick=1, normal=2+1, deep=2+1+cross-domain)
3. Produce ranked move list with saturation status

Do NOT present results yet. Hold the output for Phase 2.

### Phase 2: Over-the-Shoulder

Feed intensify output as context to `/over-the-shoulder`:

1. Infer work type from the zone + moves surfaced
2. Select lenses (3 for quick, 5 for normal, 7 for deep)
3. For each ranked move from Phase 1:
   - Would selected experts endorse this move?
   - What would they add or reject?
   - What failure mode would they flag?
4. Re-rank moves incorporating expert perspective

### Phase 3: Combined Output

Present unified results:

```md
## /deep-pass: {zone}

**Status:** {saturation} | **Trend:** {yield trend} | **Run:** #{n}

### Selected Lenses

- {Lens} - {reason} - {source basis}

### Moves (Expert-Validated)

1. {action} - {reason} - {expert endorsement or caveat}
2. ...
3. ...

### Expert Additions

- {move experts surfaced that intensify missed}

### Rejected

- {item}: {expert reason for rejection}

### Skip

- {premature items}

### Pause When

{concrete trigger that resets saturation}

### Best Next Move

{single highest-leverage action now}
```

Then persist to `docs/intensify/{zone}.md` using the extended format:

```md
## Deep-Pass Run {date}

STATUS: {saturation status}
DEPTH: {quick|normal|deep}

SURFACED:

- {finding 1}
- {finding 2}

LENSES_USED:

- {Lens}: {reason selected}

EXPERT_VALIDATION:

- {move}: {endorsed|cautioned|rejected} - {expert rationale}

EXPERT_ADDITIONS:

- {move experts surfaced that intensify missed}

REJECTED:

- {item}: {expert reason}

ACTED ON: (filled when user picks moves)

- {move chosen}

SKIPPED:

- {item}: {why}

CROSS_REFS:

- [[{other-zone}]]: {what this run found that relates to that zone}

NEXT TRIGGER: {what resets saturation}
```

On subsequent runs, read `LENSES_USED` and `EXPERT_VALIDATION` from prior entries. Pass to Phase 2 so OTS can either reuse validated lenses (consistency) or deliberately rotate (fresh perspective). Prior rejections skip re-evaluation unless fresh data invalidates them.

## Phase 1→2 Handoff Shape

Intensify output flows to OTS in this structure:

```
ZONE: {name}
YIELD_TREND: {increasing|stable|declining}
SATURATION: {fresh|partially-mined|near-saturated|saturated-until-reset}
PRIOR_LENSES: {from zone log, or "none"}
PRIOR_REJECTIONS: {from zone log, or "none"}

MOVES:
- rank: {n}, action: {x}, yield: {HIGH|MED}, stable: {yes|no}, reason: {why}

ARCHITECTURAL_INSIGHTS: (if any surfaced organically)
- {insight}
```

OTS receives this and attaches per-move: `endorsement|caveat|failure_mode`. Architectural insights become primary critique targets.

When `YIELD_TREND` is "declining", OTS focuses lenses on "what would reset saturation" rather than validating existing moves.

## Rules

- All intensify anti-patterns apply (never suggest new features, cosmetic polish, documentation)
- All over-the-shoulder hard rules apply (source first, cite public methods, no impersonation)
- Do NOT auto-execute moves. Present list. User picks.
- Expert lenses must be relevant to the zone. Chef/food/event zones get ChefFlow-native lenses.
- If intensify returns "saturated" status, over-the-shoulder still runs but focuses on "what would reset saturation" rather than forcing new moves.
