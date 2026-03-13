# Pixel Kitchen V2 - Live Data Upgrade

**Date:** 2026-03-13
**Branch:** feature/risk-gap-closure

## What Changed

The Pixel Kitchen in Mission Control was upgraded from a mostly decorative visualization to a **live, data-driven operations dashboard** where every pixel maps to real business data.

## New Features

### 1. Live Business Data (HIGH IMPACT)

- **API endpoint:** `/api/pixel/data` in `server.mjs` - aggregates events, revenue, inquiries, clients, agent status, git activity in one call
- **Polled every 15 seconds** from Supabase via existing `supabaseQuery` helper
- **Business Pulse panel:** Revenue, Profit, Events, Clients - all real numbers from Supabase
- **Event Pipeline:** Visual pipeline bar showing event counts by FSM state (draft through completed)
- **Upcoming events** listed with status dots, dates, and client names

### 2. Live Agent State Animations

- Agents animate based on real system state:
  - **Working** (fast arm animation, sparkles): file changes happening, commits flowing
  - **Idle** (slow breathing animation): quiet period
  - **Stuck** (hands on head, X eyes, question marks): Ollama offline, service down
- State derived from: git commit rate, file watcher activity, Ollama/dev server status

### 3. Kitchen Environment Reflects Business State

- **Stove flame intensity** proportional to active (in_progress) events
- **Steam volume** increases with event activity
- **Plates on pass** count matches completed events
- **Ticket rail** shows real upcoming events (colored by status) instead of fake orders
- **Cold station temp display** shows green "38 degrees" when Ollama is online, red "OFF" when down
- **Dining room tables** fill proportionally to revenue ($5k per table, max 6)
- **Outstanding invoice plates** stack up in red at the edge (visible debt)

### 4. SLA Breach Hazards

- **Smoke effect** rises from the pass when inquiries are overdue (>24h without response)
- Smoke intensity proportional to overdue count
- **Red pulsing alert** in the Alerts panel for overdue inquiries

### 5. Notification Animations

- **Delivery truck** drives in when a new inquiry arrives
- **Red alarm pulse** when SLA breach count increases
- **Bell sound** on new inquiry (when sound enabled)
- **Alarm tone** on SLA breach (when sound enabled)
- Notifications fade out over ~5 seconds

### 6. Chef Avatar Progression

- Larry's hat band color changes based on revenue milestones
- Stars appear on hat at higher levels
- **6 levels:** Commis ($0) -> Demi Chef ($5k) -> Chef de Partie ($10k) -> Sous Chef ($25k) -> Chef de Cuisine ($50k) -> Grand Chef ($100k)
- XP progress bar in the dashboard shows distance to next level

### 7. Day/Night Cycle

- Kitchen lighting tint changes based on actual time of day
- **5 phases:** Morning (warm), Day (neutral), Golden hour (orange), Evening (blue), Night (dark blue)
- Phase indicator in bottom HUD bar

### 8. Seasonal Kitchen Decor

- Shelf items change by season:
  - **Spring:** Flowers, herbs
  - **Summer:** Tomatoes, corn, basil
  - **Fall:** Pumpkins, cinnamon
  - **Winter:** Snowflakes, cranberries
- Season indicator in bottom HUD

### 9. Click-Through Interactivity

- Click any agent to open ChefFlow in browser
- Sound toggle button in bottom HUD bar
- Clickable regions system with pointer cursor on hover
- Extensible: easy to add more click targets

### 10. Ambient Sound System

- **Sizzle** when stove activity is high (2+ active events)
- **Chop** when file change rate is high (5+ recent changes)
- **Bell** on new inquiry notification
- **Alarm** on SLA breach
- Muted by default - click speaker icon in HUD to enable
- Uses Web Audio API (no audio files needed)

### 11. Service Health in Brigade Panel

- Agent status dots now reflect real service health:
  - Green: service online and responsive
  - Red: Ollama offline (for local model agents)
- Ollama/Dev Server/Beta Server status in alerts panel

## Files Changed

| File                                   | Change                                       |
| -------------------------------------- | -------------------------------------------- |
| `scripts/launcher/server.mjs`          | Added `/api/pixel/data` endpoint             |
| `scripts/launcher/index.html`          | Replaced old pixel kitchen IIFE with V2      |
| `scripts/launcher/pixel-kitchen-v2.js` | New standalone source file for pixel kitchen |

## Architecture

The pixel kitchen polls two endpoints:

1. `/api/activity/summary` (every 10s) - file watcher data (existing)
2. `/api/pixel/data` (every 15s) - aggregated business data (new)

The `/api/pixel/data` endpoint uses `Promise.allSettled` to fetch all data sources in parallel, so a single slow/failed source doesn't block the others. All existing `supabaseQuery`, `getUpcomingEvents`, `getEventsByStatus`, `getRevenueSummary`, `getOpenInquiries`, `getClients`, `getAllStatus` functions are reused.
