# Chef Portal Navigation Acceptance (100/100)

This rubric defines when Chef Portal IA is considered complete and regression-safe.

## Hard gates

1. Primary visibility gate
- No more than 16 always-visible top-level navigation entries (including Settings).

2. Progressive disclosure gate
- Advanced/Admin routes are hidden behind one extra interaction (`Advanced` section) and are never shown by default as first-glance options.

3. Route integrity gate
- Every href in Chef nav resolves to an implemented route in `app/(chef)`.
- Zero broken links.

4. Duplication gate
- No duplicate hrefs in Chef nav after query-string normalization.

5. Discoverability gate
- Every implemented non-contextual Chef page is reachable by navigation (primary, secondary, or advanced).
- Contextual pages (e.g. `/events/[id]`, `/quotes/[id]/edit`) may remain context-only.

6. Placeholder gate
- Placeholder/prototype pages are never exposed as first-glance options.
- If included, they must be under `Advanced`.

## Validation command

Run:

```bash
npm run verify:chef-nav
```

Passing this command is required before merging nav changes.
