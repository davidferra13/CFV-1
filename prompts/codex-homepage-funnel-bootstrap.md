# Codex Bootstrap Prompt: ChefFlow Homepage And Funnel Conversion

Use this exact prompt in a fresh Codex context window:

```text
You are working in the ChefFlow repo at `C:\Users\david\Documents\CFv1`.

Your first mandatory step is to read and follow `CLAUDE.md` at the repo root. Do not proceed until you have read it. Treat it as the controlling project rulebook. Preserve unrelated work in the current dirty git tree.

This session is narrowly scoped. You are not designing the full GTM strategy. You are focused on one thing only:

Improve ChefFlow's public homepage and immediate conversion funnel so more qualified visitors understand the product, trust it, and take the next real step.

## Primary objective

Audit the current public acquisition path, choose the highest leverage homepage and CTA improvements, implement them, and verify them in the real UI.

Do not drift into broad product work, backend platform work, or speculative growth systems unless they directly block homepage conversion improvements.

## Mandatory reading

Read these first:
- `CLAUDE.md`
- `docs/product-blueprint.md`
- `docs/definition-of-done.md`
- `project-map/chefflow.md`
- the most relevant `project-map/public/*` files

Then inspect these concrete surfaces in code:
- `app/(public)/page.tsx`
- relevant homepage components under `app/(public)/_components/`
- public nav and header
- public booking and inquiry entry points
- `app/(public)/for-operators/page.tsx`
- `app/(public)/services/page.tsx`
- `app/(public)/how-it-works/page.tsx`
- `app/(public)/contact/page.tsx`
- `app/(public)/book/page.tsx`
- any compare, nearby, chef profile, or proof surfaces that materially affect trust and conversion

Also inspect:
- the forms and actions behind the main CTAs
- source attribution or analytics tied to homepage traffic if present
- existing tests covering these surfaces

## Required audit questions

Answer these from repo evidence before editing:

1. Who is the homepage currently speaking to?
2. Is the value proposition immediately clear?
3. Is the primary CTA obvious?
4. Does the CTA lead to the right next step for the right user?
5. Is there enough trust, proof, and specificity to convert a skeptical operator?
6. Are there confusing branches or dead-end paths?
7. Which route should be the canonical operator conversion path right now?

## Constraints

- Do not add fake testimonials, fake customer counts, fake logos, fake case studies, or fake results.
- Do not add dead buttons or placeholders.
- Do not claim features the product does not actually support.
- Keep source-of-truth behavior honest.
- Follow the repo's interface philosophy and surface grammar rules.
- Preserve unrelated edits already in progress.

## Preferred outcome

Unless your audit strongly disproves it, bias toward shipping one cleaner canonical operator funnel:
- homepage
- one clear CTA path
- one trust/proof layer
- one high-intent landing or inquiry surface

Examples of acceptable work:
- sharpen homepage headline, subhead, and CTA hierarchy
- reduce CTA sprawl
- route operators to the best-fitting conversion surface
- improve proof and objection handling with truthful product evidence
- add or improve comparison / explanation blocks that reduce confusion
- tighten booking or inquiry entry copy so visitors know what happens next
- improve mobile clarity if the funnel breaks down on small screens

## Required outputs

Produce all of the following:

1. A concise diagnosis of the homepage and conversion funnel, with file citations.
2. A single recommended canonical CTA path for operator acquisition.
3. The code changes needed to improve that path.
4. Real UI verification per `CLAUDE.md`.
5. Any required doc updates if project rules require them.

## Definition of success

At the end of the session:
- the homepage speaks more clearly to the target operator
- the primary CTA is more intentional
- the next step is clearer and more trustworthy
- at least one real funnel improvement is shipped
- the change is verified in the browser

Start now. First read `CLAUDE.md`, summarize the relevant repo rules, inspect the current homepage funnel, and then ship the highest leverage improvement.
```
