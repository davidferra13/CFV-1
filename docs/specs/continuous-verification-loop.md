# Continuous Verification Loop

> Every feature built has a verified test. Every test that passes is proof. The system never regresses silently.

---

## The Contract

1. **Build it = Test it.** No feature ships without a corresponding test that proves it works.
2. **Tested = Done.** A passing test is permanent proof. Never retest what already passes unless the code changes.
3. **Changed = Reverify.** Any code change triggers re-verification of affected tests. Failures are immediate, not discovered later.
4. **Failed = Fix it.** Test failure is not a report; it is a work order. The loop does not advance until green.
5. **The blueprint mirrors the build.** `test-coverage-blueprint.md` is a 1:1 map of everything that exists and its verification status. If something exists in the app, it exists in the blueprint.

---

## Verification States

Every feature/route/action has exactly one state:

| State          | Meaning                                 | Action Required                      |
| -------------- | --------------------------------------- | ------------------------------------ |
| **VERIFIED**   | Test exists, passes, covers the feature | None. This is done.                  |
| **NEEDS-TEST** | Feature exists but has no test          | Write test, run it, mark VERIFIED    |
| **REGRESSED**  | Test exists but now fails               | Fix code or fix test, then re-verify |
| **EXEMPT**     | Pure layout/config, no testable logic   | None. Document why.                  |

There is no "partial" or "in progress." Either it is verified or it is not.

---

## The Loop (How It Works)

```
BUILD SOMETHING NEW
       |
       v
WRITE THE TEST (before or immediately after)
       |
       v
RUN THE TEST --> FAIL? --> FIX IT --> RUN AGAIN
       |
       v (PASS)
MARK VERIFIED IN BLUEPRINT
       |
       v
RUN FULL SUITE (catch regressions from new code)
       |
       v
ALL GREEN? --> YES --> COMMIT. DONE.
       |
       NO --> FIX REGRESSIONS --> RE-RUN --> COMMIT
```

This loop is mandatory. No exceptions. No "I'll add tests later."

---

## Self-Healing Properties

### When a Bug Occurs

1. Bug is discovered (user report, monitoring, manual testing)
2. Write a test that reproduces the bug (RED)
3. Fix the bug (GREEN)
4. Test now permanently guards against recurrence
5. Mark VERIFIED in blueprint

### When Building New Features

1. Feature is specified
2. Test is written first (or simultaneously)
3. Feature is built until test passes
4. Run full suite to confirm no regressions
5. Blueprint updated: new entry marked VERIFIED

### When Refactoring

1. Existing tests define correct behavior
2. Refactor code
3. All existing tests must still pass (they are the contract)
4. If tests fail, the refactor broke something; fix it
5. No blueprint change needed (same features, same verification)

---

## The Perfect Audit Trail

At any point, anyone can ask:

- **"Is X tested?"** Check the blueprint. VERIFIED = yes. Anything else = no.
- **"Do we need to retest X?"** Only if the code for X changed since last verification.
- **"What's not tested?"** Filter blueprint for NEEDS-TEST. That is the work list.
- **"Does the app work?"** Run `npm run test:full`. All green = yes. Any red = fix it now.

---

## Blueprint Maintenance Rules

1. **New route/feature added** = new row in blueprint, status NEEDS-TEST
2. **Test written and passes** = status changes to VERIFIED
3. **Code changed for verified feature** = re-run its test. Still passes? Still VERIFIED.
4. **Test starts failing** = status changes to REGRESSED. P0 fix.
5. **Feature removed** = row removed from blueprint. Delete orphan test.

---

## Integration with Build System

### Pre-Commit

- `npm run test:affected` runs tests for changed files only
- If any fail, commit is blocked
- This prevents regressions from ever reaching the repo

### Nightly Full Suite

- `npm run test:full` runs everything
- Results compared against blueprint
- Any new failures = REGRESSED, flagged for morning fix

### After Every Build Session

- Agent runs `/test-scan` to reconcile blueprint vs. reality
- New untested routes discovered = added as NEEDS-TEST
- Deleted routes with orphan tests = cleaned up

---

## The Guarantee

If this loop is followed:

- Every feature that exists has been proven to work
- No feature silently breaks without detection
- The blueprint is always accurate (it IS the app, mirrored)
- Testing effort is never wasted (never retest what passes)
- Bugs get caught at the source, not in production
- New builds cannot degrade existing functionality

---

## Commands

| Command                      | What it does                                     |
| ---------------------------- | ------------------------------------------------ |
| `npm run test:full`          | Run every test. The ultimate "does it all work?" |
| `npm run test:affected`      | Run only tests for changed code                  |
| `/test-scan`                 | Reconcile blueprint vs. actual routes/tests      |
| `npm run test:sentinel:full` | Smoke + critical + data regression guards        |

---

## For AI Agents (Claude + Codex)

When building:

1. Check blueprint before starting (know what is/isn't tested)
2. Write tests for what you build (RED/GREEN/REFACTOR)
3. Run `test:affected` before committing
4. Update blueprint with new VERIFIED entries
5. If any test fails that you didn't touch: STOP. Fix the regression first.

When fixing bugs:

1. Write reproducing test first (proves the bug exists)
2. Fix until test passes
3. Run full suite (confirm no side effects)
4. Blueprint entry: VERIFIED

Never:

- Commit without running affected tests
- Mark something VERIFIED without seeing it pass
- Skip a failing test ("we'll fix it later")
- Delete a test to make the suite green
