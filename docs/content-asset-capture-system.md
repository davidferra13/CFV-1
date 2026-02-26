# Content Asset Capture Sheet

**Feature branch:** `feature/packing-list-system`
**Status:** Complete

---

## What Was Built

A printable PDF document — the **Content Asset Capture Sheet** — that a chef brings to every event alongside their other operational sheets. It provides a structured shot list organized by event phase, a platform specs cheat sheet, brand consistency reminders, and solo-chef setup tips.

The sheet is designed to help a one-person operation systematically capture **20+ usable marketing assets per event** — photos and videos suitable for TikTok, Instagram Reels, Instagram Feed, Instagram Stories, and Facebook — without disrupting the cooking service.

---

## Why It Exists

Every private dinner is a content opportunity. A single event can yield enough material for 20+ distinct posts across platforms, which represents a meaningful fraction of annual marketing output. The problem for a solo chef is that capturing this content requires **remembering to do it while running a full service** — which is hard without a checklist.

This sheet solves the same problem the Prep Sheet and Non-Negotiables Checklist solve for operations: it turns a complex, multi-step task into a simple per-event checklist the chef can verify against.

---

## Document Structure (One Page)

```
CONTENT ASSET CAPTURE SHEET
Event | Date | Client | Target: 20+ assets

★ NEVER-MISS FIVE (amber highlight box)
  1. Knife work video — overhead, 10 sec
  2. Pan sizzle — side angle, 8 sec, keep sound
  3. Hero plate — overhead flat lay
  4. Hands placing final garnish — 3–5 sec slow-mo
  5. Ingredient flat lay — at store or home

PRE-EVENT — GROCERY & PREP (4 checkboxes)
  □ Grocery haul flat lay
  □ Hero ingredient close-up
  □ Knife roll / tools laid out
  □ Mise en place spread

ACTIVE COOKING (5 checkboxes)
  □ Knife work (overhead mount, 10–15 sec)
  □ Pan sizzle / sear (side angle, keep sound)
  □ Sauce / reduction close-up
  □ Hands seasoning / finishing touch
  □ Raw → finished time-lapse

PLATING — plate one dish for camera first (5 checkboxes)
  □ Hero plate overhead flat lay
  □ Hero plate low 30° angle
  □ Hands placing final garnish
  □ Full table at service
  □ Texture detail / close-up

SERVICE & WRAP (4 checkboxes)
  □ Empty plate (social proof)
  □ Client reaction (with permission)
  □ Chef self-capture (optional)
  □ Clean kitchen

PLATFORM SPECS
  TikTok + Reels: 9:16 vertical | 15–60 sec | Hook in 3 sec
  Instagram Feed: 4:5 portrait | Same preset every post
  Instagram Stories: 9:16 | Avoid top/bottom 14% for text
  Facebook: Square or 4:5 | Photos + video both work

BRAND CONSISTENCY (4 checkboxes)
  □ Same plate angle every event (overhead OR low 30°)
  □ Same 2–3 surface props in every photo
  □ Same editing preset on every photo
  □ Same opening shot type for every Reel/TikTok

SOLO SETUP
  3 mount positions: overhead board / side stove / tabletop plating
  Gear to bring: overhead arm + Gorilla Pod + bluetooth shutter (~$50)
```

---

## Files Changed

| File                                          | Change                                                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/documents/generate-content-shot-list.ts` | **New.** Generator following the fetch → render → generate pattern used by all other document generators. Minimal DB fetch (event name, date, client name for header). Static content everywhere else. |
| `app/api/documents/[eventId]/route.ts`        | Added `case 'shots'` to the switch. Route: `GET /api/documents/[eventId]?type=shots`                                                                                                                   |
| `components/documents/document-section.tsx`   | Added a new "Content Asset Capture Sheet" card below the Travel Route card. Always shows as "Always ready" since no menu data is required. Supports inline PDF viewer modal and new-tab ↗ link.        |

---

## Design Decisions

### Static content, dynamic header

The shot list is identical every event. Only the header changes (event name, date, client). This is intentional — the value of the sheet is its repeatability. A chef who follows the same shot list at every dinner builds a consistent, recognizable content library over time.

### Not included in the "all" combined PDF

The eight operational sheets (`all` type) cover cooking execution. The shot list is a marketing tool. Mixing it into the operational packet would blur that boundary. It gets its own card in the UI and its own `?type=shots` route.

### "Never-Miss Five" amber box

The five highest-ROI captures are called out visually at the top of the sheet so a chef who gets behind during service knows which shots to prioritize above all others. These five were selected based on research into what performs best on TikTok and Instagram Reels for food/cooking content:

- **Knife work** (overhead) — most reliable view-driver for cooking content
- **Pan sizzle** (side, with sound) — audio alone drives engagement; no editing needed
- **Hero plate overhead** — primary portfolio asset, books the next client
- **Final garnish hands** — simultaneous craft + care signal; excellent in slow-mo
- **Ingredient flat lay** — behind-the-scenes format, strong shareability, zero service interference

### Solo-first design

Every shot and tip assumes a one-person operation. The document:

- Recommends only 3 phone mount positions (more = distraction)
- Recommends specific affordable gear (~$50 total)
- Emphasizes pre-mounting before service rather than during
- Advises filming first and reviewing after guests leave

### Brand consistency section

Consistent visuals across events compound over time — a recognizable feed looks like a portfolio rather than a random collection. The four checkboxes lock in the decisions that have the highest visual impact: plate angle, surface props, edit preset, opening shot type.

---

## Platform Specs (Researched February 2026)

| Platform          | Format               | Aspect Ratio              | Video Length        |
| ----------------- | -------------------- | ------------------------- | ------------------- |
| TikTok            | Vertical video       | 9:16 (1080×1920)          | 15 sec – 10 min     |
| Instagram Reels   | Vertical video       | 9:16 (1080×1920)          | Up to 20 min        |
| Instagram Stories | Vertical photo/video | 9:16                      | Max 60 sec per card |
| Instagram Feed    | Photo or video       | 4:5 preferred (1080×1350) | Up to 60 sec        |
| Facebook          | Photo or video       | 1:1 or 4:5                | Up to 240 min       |

**Universal rule:** Shoot everything in 9:16 vertical at max quality. Crop vertical → square or 4:5 freely. Cannot go the other direction.

---

## Accessing the Sheet

From any event detail page → Documents section → **Content Asset Capture Sheet** card → "View PDF" or ↗ to open in a new tab.

Direct URL: `/api/documents/[eventId]?type=shots`
