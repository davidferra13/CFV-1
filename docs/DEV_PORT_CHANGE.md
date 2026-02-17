# Dev Server Port Change

**Date:** 2026-02-16

## What Changed
- `package.json` `"dev"` script updated from `next dev -p 3333` to `next dev -p 3100`.

## Why
- User requested the dev server always run on port 3100.

## Scope
- Only the `dev` script was modified. The `start` script and all other scripts remain unchanged.
