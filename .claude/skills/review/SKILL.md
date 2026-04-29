---
name: review
description: Code review on uncommitted changes before shipping. Quality gate between coding and /ship.
user-invocable: true
---

# Code Review

Review all uncommitted changes. This is the quality gate before `/ship`.

## 1. Gather Changes

```bash
git diff --stat
```

```bash
git diff
```

```bash
git diff --cached
```

```bash
git status --short
```

## 2. Review Checklist

For each changed file, check:

- [ ] **Security:** No hardcoded secrets, no SQL injection, no XSS, tenant scoping intact
- [ ] **Data safety:** No unguarded deletes, no silent failures returning zeros, try/catch on optimistic updates
- [ ] **Types:** No `any` casts, no ignore directives added, no ts-nocheck directive
- [ ] **Zero Hallucination:** No success without confirmation, no hidden failures, no non-functional UI
- [ ] **Cache busting:** Mutations bust all related caches (`revalidateTag` for `unstable_cache`)
- [ ] **Auth:** Server actions have `requireChef()`/`requireAuth()`, tenant_id from session not input
- [ ] **Side effects:** Notifications/emails/logs wrapped in try/catch, non-blocking
- [ ] **Em dashes:** None introduced
- [ ] **Forbidden internal name in UI:** Not exposed in user-facing surfaces
- [ ] **Deep modules:** Changes hide meaningful complexity behind stable interfaces instead of adding shallow helper sprawl
- [ ] **Interface tests:** Tests cover stable contracts rather than incidental internals
- [ ] **Boundary leakage:** UI, server actions, DB access, auth, billing, and ledger logic remain in the right layer
- [ ] **AI drift:** No broad speculative rewrites, duplicate abstractions, or inconsistent naming
- [ ] **Design investment:** The change makes the next change easier, faster to verify, or safer to delegate

## 3. Report Format

```
REVIEW - [X] files changed

CLEAN:    [files with no issues]
FLAGS:    [file:line - issue description] (one per line)
DESIGN:   [what got simpler, clearer, better protected, or what design debt remains]
VERDICT:  [ship it / fix first]
```

If verdict is "fix first," list exact fixes needed. Keep terse.
