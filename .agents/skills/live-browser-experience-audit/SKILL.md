---
name: live-browser-experience-audit
description: Investigate real web, app, search, ChefFlow, or account-personalized flows through an actual browser, screenshots, evidence packs, user-intent modeling, research Markdown, and explicit privacy/action boundaries. Use when the user asks to try, inspect, study, browse, screenshot, compare, or describe what happens in a live site/app/search flow; when logged-in/session/location context matters; when researching Google/SERP/local discovery; or when auditing ChefFlow's running UI.
---

# Live Browser Experience Audit

## Native Behavior In This Repo

When a request depends on what a live page or app actually does, behave as evidence-first by default. Do not answer from memory. Build a user-intent model, pick the right browser context, capture screenshots, evaluate from visible evidence, and produce reusable Markdown research.

This skill applies to third-party sites and to ChefFlow itself. For ChefFlow, use the canonical app URL `http://localhost:3100` unless the user or run context explicitly authorizes a separate test port/worktree.

## Hard Stops

- Do not use logged-in accounts, saved cookies, location, camera, microphone, contacts, email, payment details, or personal context unless the user explicitly authorizes that site and task.
- Never ask for passwords, 2FA codes, recovery codes, payment cards, government IDs, or secrets. If login is required and no active session exists, stop and report the blocker.
- Do not submit purchases, bookings, reservations, reviews, messages, forms, votes, account settings, deletions, public posts, or irreversible actions unless the user separately authorizes the exact final action.
- Do not expose private account data. Redact or summarize emails, phone numbers, addresses, payment details, tokens, private names, order numbers, and account identifiers.
- Do not bypass paywalls, geofencing, bot checks, CAPTCHAs, rate limits, or platform security controls.
- Do not generalize personalized results. Say "in this browser/session/location at this time" when results may vary.

## Mandatory Preflight

Before browsing, confirm or infer:

- Consent: site/app, logged-in/session/location permission, action boundary, screenshot permission, and whether raw screenshots may be shared or must stay local.
- Intent: user goal, persona/audience, evaluation lens, success criteria, and whether the output should be descriptive, strategic, build-ready, or research Markdown.
- Scope: run depth, browser context, viewport/device, comparison set, location sensitivity, final stopping point, and ChefFlow route or third-party URL/query.

Ask up to three concise questions when missing context would change what to click, screenshot, compare, or evaluate. Ask especially when the request could mean personal use vs ChefFlow product learning, quick description vs deep strategy, desktop vs mobile, logged-in vs neutral, or observe-only vs final action. If ambiguity is low-risk, state the assumption and proceed.

## Browser Context Selection

- Use real Chrome/Edge profile when logged-in personalization, Google account state, saved location, or the user's real consumer experience matters and the user authorized it.
- Use Playwright or an equivalent controlled browser when repeatability, screenshots, console logs, network checks, mobile emulation, or ChefFlow QA matters.
- Use VS Code embedded/simple browser only for quick local viewing when session personalization and full DevTools fidelity do not matter.
- Use ordinary web browsing/search only as fallback when a real browser controller is unavailable; mark confidence lower.
- Always state which browser context was used and what that means for confidence.

## Modes

- Quick pass: one viewport, 3-5 screenshots, top-level flow only.
- Standard pass: full main flow, one scroll depth, filters/refinements, one branch, 6-12 screenshots.
- Deep research pass: desktop and mobile when relevant, comparisons, repeated load if volatile, alternatives/competitors, edge states, scoring, and a polished Markdown research pack.
- ChefFlow route study: canonical server, target route, auth/session state, screenshots, console/runtime checks, workflow evaluation, and queue/spec implications without implementation unless authorized.

## Evidence Pack

Create a local evidence folder for every non-trivial run:

```powershell
node .agents/skills/live-browser-experience-audit/scripts/create-evidence-pack.mjs --slug <short-task-name> --mode <quick|standard|deep|chefflow>
```

Use the generated `report.md`, `notes.md`, `redactions.md`, `questions.md`, and `screenshots/` folder. If the script is unavailable, create the same structure manually. Keep raw screenshots local unless the user authorizes sharing.

## Workflow

1. Define observation target, intent model, run mode, browser context, viewport, location sensitivity, comparison set, and success criteria.
2. Ask required clarification questions or state assumptions.
3. Create the evidence pack.
4. Open the chosen browser context and confirm session/auth state without revealing private details.
5. Capture the starting state, then screenshot every meaningful state change with step-numbered names.
6. Inspect the relevant flow: above the fold, scroll depth, filters/refinements, errors, empty states, ads/sponsored items, local/map packs, personalization signals, comparison branches, and stopping points.
7. For ChefFlow/product QA, check console, network, server/runtime errors, responsive behavior, and whether the live app matches the expected route/workflow.
8. Evaluate visible facts first, then user-need fit, trust, friction, actionability, personalization, ranking/placement, missing controls, risks, and product lessons.
9. Record redactions, limitations, "what not to conclude," and open questions.
10. Return a Live Experience Learning Pack or Research Markdown Pack, grounded in screenshot evidence.

## Output

Use `templates/live-browser-report.md`. Always include:

- Setup, browser context, permissions, and confidence impact.
- User Need Learned.
- Questions asked or assumptions made.
- Step-by-step observations with screenshot references.
- Evaluation scores.
- Reusable product lessons and ChefFlow implications when relevant.
- Build/spec/queue candidates when the user wants ChefFlow learning, but do not implement unless authorized by repo rules.
- Evidence pack paths.
- Redactions, limitations, and what not to conclude.
- Recommended next run or open questions.

See [REFERENCE.md](REFERENCE.md) for question triggers, redaction protocol, failure handling, comparison discipline, scoring rubric, ChefFlow mode, Google `food near me`, and research Markdown guidance.
