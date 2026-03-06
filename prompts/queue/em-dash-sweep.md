# Em Dash Sweep: Remove ALL em dashes from the codebase

## Priority: CRITICAL

## Type: Codebase-wide find-and-replace

## Mode: Multi-agent (you are the only agent on this task)

---

## The Rule

Em dashes (the character `—`, Unicode U+2014) are **permanently banned** from ChefFlow. They are the #1 tell that text was written by AI. They destroy credibility. Zero tolerance.

This rule is now in CLAUDE.md under "NO EM DASHES (ABSOLUTE RULE)".

---

## Your Job

Find and replace every em dash (`—`) in every `.ts`, `.tsx`, `.js`, `.jsx` file in the codebase. Do NOT touch `.md` files (CLAUDE.md uses them in section headers as a formatting convention, and docs are internal-only).

---

## How to Replace

Em dashes appear in different contexts. Replace them based on what reads naturally:

**In UI strings, labels, descriptions, error messages, toasts:**

- "No events — check back later" -> "No events. Check back later." (two sentences)
- "Pro feature — upgrade to unlock" -> "Pro feature: upgrade to unlock" (colon)
- "Loading — please wait" -> "Loading, please wait" (comma)
- "Draft — not yet sent" -> "Draft (not yet sent)" (parentheses)
- "Events — Calendar" -> "Events / Calendar" or "Events - Calendar" (slash or hyphen)

**In code comments:**

- Same rules. Restructure to avoid needing the dash at all.

**In template literals and AI prompt strings (Remy, Gustav, etc.):**

- These are the MOST important. Any AI-generated text seen by users must be clean.
- Search `lib/ai/` thoroughly. Search `components/ai/` thoroughly.

**General principle:** If you're unsure, use a period and make it two sentences. That's always safe.

---

## Files to Search

Run this to find all occurrences:

```
grep -r "—" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
```

The initial scan found 100+ files with em dashes. Hit every single one.

---

## What NOT to Do

- Do NOT touch `types/database.ts` (auto-generated, never manually edit)
- Do NOT touch `.md` files (internal docs, not user-facing)
- Do NOT touch `node_modules/` or `.next/`
- Do NOT run `npx tsc` or `npx next build` (multi-agent mode, no builds)
- Do NOT change any logic or functionality. This is a text-only sweep. If a string has an em dash, replace the em dash. Don't refactor the code around it.

---

## Verification

After you're done, run the grep again. The count should be 0 across all `.ts`, `.tsx`, `.js`, `.jsx` files (excluding `node_modules`, `.next`, `types/database.ts`).

---

## When Done

`git add` and `git commit` with message: `style: remove all em dashes from codebase (AI voice cleanup)`

Do not push. Do not build. Just commit and report what you changed.
