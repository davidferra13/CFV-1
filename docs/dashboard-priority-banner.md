# Dashboard Persistent Priority Banner

## What Changed
`app/(chef)/dashboard/page.tsx` — added always-visible priority banner

## Context
`getPriorityQueue()` already returns urgency-ranked items including `queue.nextAction`.
The queue data was already fetched in `Promise.all()` alongside 27 other queries.

## Change
Added a persistent banner above all widgets (above the scheduling gap banner) that:
- Always renders — not part of the widget system, not hideable
- If `queue.nextAction` exists: shows urgency indicator (🔴/🟡/🟢), title, context labels, and "Go →" link
- If queue is empty: shows "All caught up — nothing urgent right now." in green
- Color-coded by urgency: critical (red), high (amber), normal/low (brand blue)
- Entire banner is a clickable link to `queue.nextAction.href`

## Why
The existing `NextActionCard` widget was hideable via widget preferences. The priority banner
answers "What should I do right now?" immediately on every login, without scrolling.

## Files Modified
- `app/(chef)/dashboard/page.tsx`
