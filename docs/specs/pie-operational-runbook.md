# PIE Operational Runbook

> How the 8-skill PIE suite coordinates to build America's food pricing
> truth layer. This is the playbook for daily, weekly, and triggered operations.

---

## The PIE Skill Suite

```
┌─────────────────────────────────────────────────────────────┐
│                    PIE SKILL ECOSYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OBSERVE          IMPROVE          PROTECT         EXPAND   │
│  ───────          ───────          ───────         ──────   │
│  /pie-measure     /pie-ratchet     /pie-alert      /pie-census │
│  /pie-accuracy    /pie-forecast    /pie-fix                 │
│                                                             │
│  "Where are we?"  "Make it better" "Keep it safe"  "Grow"  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| Skill           | Purpose                                | Frequency           | Duration  |
| --------------- | -------------------------------------- | ------------------- | --------- |
| `/pie-measure`  | Read-only snapshot of all metrics      | Daily + on-demand   | < 10s     |
| `/pie-accuracy` | Spot-check prices against ground truth | Weekly              | 5-15 min  |
| `/pie-ratchet`  | Find and fix highest-ROI gap           | Daily + after sync  | 5-30 min  |
| `/pie-forecast` | Build Layer 2 intelligence             | Weekly (when ready) | 10-30 min |
| `/pie-alert`    | Detect regressions and failures        | Every 6 hours       | < 30s     |
| `/pie-fix`      | Fix worst PIE Law violation            | After pricing edits | 5-15 min  |
| `/pie-census`   | Expand the ingredient manifest         | Weekly + after sync | 5-20 min  |

---

## Daily Schedule (Hermes Cron)

```
02:00  OpenClaw sync (Pi -> PG)
02:30  /pie-alert (post-sync validation)
02:35  /pie-census (expand from new products discovered in sync)
02:45  /pie-ratchet (1-3 cycles, highest ROI improvement)
03:15  /pie-measure (log daily snapshot)
06:00  /pie-alert (6-hour check)
12:00  /pie-alert (6-hour check)
18:00  /pie-alert (6-hour check)
```

## Weekly Schedule

```
Sunday 22:00  /pie-accuracy (full validation run)
Monday 02:00  /pie-census (USDA gap check, category analysis)
Monday 02:30  /pie-forecast (Layer 2 build, when gate passes)
```

## Triggered Operations

| Trigger                      | Skill fired                           | Why                                        |
| ---------------------------- | ------------------------------------- | ------------------------------------------ |
| OpenClaw sync completes      | /pie-alert, /pie-census, /pie-ratchet | Validate, expand, improve                  |
| New chain added              | /pie-census, /pie-ratchet             | New products = new census entries + prices |
| Chef edits pricing           | /pie-fix                              | Ensure no Law violation introduced         |
| Accuracy drops > 5%          | /pie-alert -> /pie-ratchet (focused)  | Regression detected, fix immediately       |
| Source goes dark             | /pie-alert -> auto-heal               | Law 5: Self-Healing                        |
| Coverage > 80% reached       | /pie-forecast (unlocked)              | Layer 2 gate passes                        |
| Developer says "improve PIE" | /pie-ratchet                          | Manual trigger                             |
| Morning briefing             | /pie-measure (condensed)              | Daily awareness                            |

---

## Skill Dependency Graph

```
                    /pie-measure
                         │
              ┌──────────┼──────────┐
              │          │          │
         /pie-ratchet  /pie-accuracy  /pie-alert
              │          │          │
              │     (validates)  (detects)
              │          │          │
              ▼          ▼          ▼
         /pie-census   calibration   auto-heal
              │                       │
              ▼                       ▼
         /pie-forecast           /pie-fix
         (Layer 2, gated)    (reactive repair)
```

**Data flow:**

1. `/pie-measure` provides the baseline numbers
2. `/pie-ratchet` uses those numbers to pick highest-ROI action
3. `/pie-accuracy` validates that improvements are real
4. `/pie-alert` watches for regressions between runs
5. `/pie-census` grows the denominator
6. `/pie-forecast` builds on top when foundation is solid
7. `/pie-fix` handles emergency repairs

---

## Escalation Protocol

```
Auto-heal succeeds     -> Log, continue
Auto-heal fails        -> Morning briefing, developer decides
Regression detected    -> /pie-ratchet targets it next
Accuracy below 75%     -> CRITICAL: prioritize over feature work
Source dark > 24h      -> Developer manual intervention needed
Pi unreachable > 1h    -> Check physical hardware
Census shrinking       -> Bug, investigate immediately (ratchet only goes forward)
```

---

## Metrics Dashboard (what to watch)

**Daily (from /pie-measure):**

- Coverage % (must trend up)
- Naked ingredient count (must trend down)
- Stale price count (must stay below threshold)
- States covered (must trend up)

**Weekly (from /pie-accuracy):**

- Accuracy % (must trend up)
- Confidence tier calibration (HIGH > 95%, MEDIUM > 80%, LOW > 60%)
- Worst offender list (should get shorter)

**Real-time (from /pie-alert):**

- Active alerts: should be 0
- Last sync age: should be < 48h
- Source health: all green

---

## Phase-Gated Behavior

The skill suite behaves differently depending on PIE's maturity:

### Phase 0 (NOW): Foundation

- `/pie-ratchet` runs ONLY Layer 1 playbooks (coverage, freshness, normalization)
- `/pie-forecast` is LOCKED (gate check fails)
- `/pie-accuracy` may report "unmeasured" for many metrics
- `/pie-census` is the highest-leverage skill (bigger denominator = better targeting)
- Focus: get to 80% coverage

### Phase 1 (+3 months): Intelligence

- `/pie-forecast` UNLOCKS (coverage > 80%)
- `/pie-ratchet` starts including Layer 2 opportunities
- `/pie-accuracy` becomes the quality gatekeeper
- Focus: make prices trustworthy AND intelligent

### Phase 2 (+6 months): API

- All skills optimized for external consumers
- `/pie-alert` adds webhook firing for API subscribers
- `/pie-measure` feeds public status page
- Focus: reliability at scale

### Phase 3 (+12 months): Network Effect

- Receipt OCR passive signals feed back into accuracy
- `/pie-forecast` runs continuously (not just weekly)
- Regional accuracy auto-improves from user density
- Focus: compound learning accelerates

---

## Anti-Patterns (what NOT to do)

1. **Don't run /pie-forecast before Layer 1 is solid.** Intelligence on bad data = confident lies.
2. **Don't ignore /pie-alert.** A suppressed alert is a future crisis.
3. **Don't expand census without follow-through.** Adding 10K ingredients with no prices just tanks coverage %.
4. **Don't run /pie-ratchet on stale data.** Sync first, then improve.
5. **Don't skip /pie-accuracy.** It's the only skill that proves PIE works.
6. **Don't manually fix what /pie-alert should auto-heal.** Build the auto-heal, don't be the auto-heal.

---

## Key Principle: Compound Progress

Every skill invocation leaves PIE measurably better than before.
No skill should ever make PIE worse. The ratchet only turns forward.

After 365 days of daily operations:

- 365+ ratchet cycles (coverage, freshness, accuracy improvements)
- 52 accuracy validations (confidence calibration, worst-offender fixes)
- 52 census expansions (growing toward 200K+ ingredients)
- 52 forecast builds (deepening intelligence layer)
- 1,460 alert checks (catching problems in hours, not days)

Compound effect: PIE at month 12 is unrecognizable from PIE at month 0.
That's the vision. The runbook makes it mechanical.
