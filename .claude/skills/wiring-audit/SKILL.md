---
name: wiring-audit
description: Diagnostic scan for disconnected code. Runs wiring-audit scripts to find exports with no consumers, actions with no triggers, components with no mounts. Read-only analysis. Use when user says /wiring-audit, "what's disconnected", "find orphans", "dead code check", or before a /wire pass.
---

# WIRING-AUDIT (Diagnostic Disconnection Scan)

## Purpose

Read-only analysis of what's built but not connected. Feeds into `/wire` for action.

## Procedure

### Phase 1: Run Existing Scripts

```bash
node scripts/wiring-audit.mjs
```

If script errors or is outdated, fall back to manual scan:

### Phase 2: Manual Scan (if needed)

Spawn parallel agents to check:

1. **Unused exports in lib/:**
   - Find all `export` statements in `lib/`
   - Grep for each exported name across `app/` and `components/`
   - Flag any with zero imports

2. **Server actions with no caller:**
   - Find files with `'use server'`
   - For each exported function, check if it's imported anywhere
   - Flag uncalled actions

3. **Routes with no inbound link:**
   - List all `page.tsx` in `app/`
   - Check for `<Link href=`, `router.push(`, `redirect(` pointing to each
   - Flag unreachable routes

4. **Migrations not applied:**
   - List `database/migrations/*.sql`
   - Compare to applied migrations in DB
   - Flag pending

### Phase 3: Categorize Results

```
## Wiring Audit [date]

### Critical (built for queue items, never connected)
| Orphan | Type | Queue Item | Priority |
|--------|------|-----------|----------|

### Notable (useful code, no consumer yet)
| Orphan | Type | Potential Consumer |
|--------|------|--------------------|

### Intentional (WIP, future, or internal-only)
| Orphan | Type | Reason |
|--------|------|--------|
```

### Phase 4: Recommendations

- "Run /wire to connect X critical orphans"
- "Y items are WIP from other agents, leave alone"
- "Z items may be dead code (no queue item, no obvious consumer)"

## Constraints

- Read-only. Never modify code.
- Never flag test utilities, scripts, or tooling as orphans
- Never flag things in `types/` (type exports are often used implicitly)
- Cross-reference with build queue to distinguish "not wired yet" from "truly dead"
