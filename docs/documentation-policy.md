# Documentation Version Control Policy — ChefFlow V1

**Last reviewed:** 2026-02-20

---

## Overview

ChefFlow has 344+ markdown files in `docs/`. This policy defines how documentation is created, updated, deprecated, and removed — ensuring the docs remain trustworthy rather than becoming a liability.

---

## The Core Rule

**Every code change must have a corresponding documentation change.**

Specifically:

- New features → new or updated docs
- Schema changes → update affected docs (API reference, access control matrix, retention policy)
- Deprecation → mark old behavior as deprecated in the relevant doc
- Bug fixes → update any doc that described the broken behavior

This rule is stated in `CLAUDE.md`:

> "Always create a follow-up `.md` document for every code change."

The pattern for implementation docs: `docs/build-[feature-name].md` — these are "what changed, why, and how it connects to the system."

---

## Document Categories and Owners

| Category             | Pattern                                                            | Owner                        | Review Frequency                |
| -------------------- | ------------------------------------------------------------------ | ---------------------------- | ------------------------------- |
| Build logs           | `docs/build-*.md`                                                  | Engineer who made the change | One-time on creation            |
| Architecture docs    | `docs/*.md` (policy, design)                                       | Platform engineer / founder  | Annually or on change           |
| Operational runbooks | `docs/disaster-recovery.md`, `docs/rollback-plan.md`, etc.         | Platform engineer / founder  | Quarterly + after incidents     |
| API reference        | `docs/api-reference.md`                                            | Platform engineer            | On every API change             |
| Access control       | `docs/access-control-matrix.md`                                    | Platform engineer            | On every role/permission change |
| Security policies    | `docs/key-rotation-policy.md`, `docs/pii-handling-policy.md`, etc. | Platform engineer / founder  | Annually                        |
| Agent workflow       | `docs/AGENT-WORKFLOW.md`                                           | Platform engineer            | When workflow changes           |
| CLAUDE.md            | Root                                                               | Platform engineer / founder  | Ongoing                         |

---

## Naming Conventions

| Document Type              | Convention                 | Example                       |
| -------------------------- | -------------------------- | ----------------------------- |
| Build / implementation log | `build-[kebab-feature].md` | `build-grocery-quote.md`      |
| Policy / process           | `[noun]-policy.md`         | `data-retention-policy.md`    |
| Runbook / procedure        | `[noun].md`                | `disaster-recovery.md`        |
| Planning document          | `[noun]-plan.md`           | `staging-environment-plan.md` |
| Design / architecture      | `[noun].md`                | `domain-events.md`            |
| Reference                  | `[noun]-reference.md`      | `api-reference.md`            |

---

## Staleness Indicators

A document is stale if:

- It references code, table names, or file paths that no longer exist
- The "Last reviewed" date is older than 12 months
- A code change was made that should have updated the doc but didn't

**What to do with stale docs:**

1. If the content is still accurate but undated: update "Last reviewed" date
2. If content is partially wrong: correct the wrong sections, update date
3. If the entire doc is obsolete: add a header `> ⚠️ DEPRECATED: This document is outdated. See [new-doc.md].` and link to replacement
4. If the doc covers a removed feature: delete it from `docs/` (git history preserves it)

---

## Deprecation Process

1. **Mark the doc:** Add this block at the top of the deprecated document:
   ```markdown
   > ⚠️ **DEPRECATED as of YYYY-MM-DD.** This feature/process has been replaced.
   > See [replacement-document.md](replacement-document.md) for current information.
   ```
2. **Update links:** Find all docs that reference the deprecated doc and update them.
3. **Removal:** After 30 days with no objections, delete the file and create a git commit.

---

## Doc Quality Standards

Every document should have:

- **Title** as H1 heading
- **Last reviewed date** (ISO: `YYYY-MM-DD`)
- **Owner** (role or person responsible)
- **Status** if it's a plan: `Implemented`, `Planned`, `Draft`, `Deprecated`
- **No broken internal links** (use relative paths: `[other-doc.md](other-doc.md)`)

Every document should NOT:

- Duplicate content that already exists in another doc (link instead)
- Describe aspirational future behavior as if it's current (use status indicators)
- Contain actual secrets, passwords, or production IDs
- Reference files, tables, or routes that no longer exist

---

## The 10-Minute Doc Rule

When making a code change, estimate how long it would take for another engineer (or your future self) to understand the change from `git diff` alone. If it would take more than 10 minutes to reconstruct the intent — write a doc.

Build logs (`docs/build-*.md`) don't need to be comprehensive essays. They need to answer:

1. What was the problem/gap?
2. What was built?
3. Where is the code?
4. What key decisions were made and why?

---

## Review Log

| Date       | Action                          | Reviewer          |
| ---------- | ------------------------------- | ----------------- |
| 2026-02-20 | Policy created (audit item #79) | Platform engineer |

---

_Next review due: 2027-02-20_
