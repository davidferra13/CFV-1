# Chef Portal Contrast Proof Pack Template

Use this checklist for contrast/design-system queue items before `build-queue.mjs finish-check`.

## Required Evidence

- Canonical URL verified: `http://localhost:3100`
- Queue item IDs and run ID.
- Routes checked, including theme and viewport for each route.
- Light and dark screenshots or explicit manual visual proof.
- Mobile proof for 390px and 430px widths.
- Browser console, network, and relevant server log notes.
- Static contrast gate output.
- Runtime proof validity: authenticated chef session, redirect, or documented no-runtime-impact case.
- Remaining violations categorized as fixed, blocked, follow-up queued, or documented exception.
- Finish-check command and output.

## Contrast Contract

- Active surfaces use `activeSurface` / `activeForeground`.
- Status surfaces use `statusInfo`, `statusWarning`, `statusSuccess`, or `statusDanger`.
- Muted and disabled functional text use `mutedFunctional` or `disabledFunctional`; avoid opacity stacking for required text.
- Dynamic colors must resolve foreground with `resolveReadableForeground`.
- CTAs use the shared `Button` variants or the role map `ctaForeground` contract.
