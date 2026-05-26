# Exit Eval: Chef / DURING-SERVICE (The Kitchen Boundary)

> **Wave 1 | 3 scenarios | Solo mode | All NEEDS-DEVELOPER-REVIEW**
>
> Evaluated: 2026-05-25
> Source: `docs/research/chef-exit-points-analysis.md` (Category 17)
> Rubric: `.claude/skills/exit-eval/SKILL.md`

---

## Scenario #93: Multiple concurrent kitchen timers

**Original classification:** Permanent exit. Timer apps are purpose-built.
**Reclassified to:** Reducible `NEEDS-DEVELOPER-REVIEW`

**Why chef leaves:** The chef has multiple cooking processes on different clocks (braise at 2.5 hours, bread proofing at 45 minutes, custard at 12 minutes). They need to set, monitor, and be alerted by concurrent independent timers. The operational need is parallel time-awareness across dishes so nothing burns, overcooks, or stalls.

**Context ChefFlow has:**

- Full event menu with all dishes and their recipes
- Recipe cook times per dish (prep_time_minutes, cook_time_minutes, total_time_minutes)
- Kitchen Mode with full-screen dark UI, tab-based navigation (Courses, Timers, Dietary, Notes)
- `useKitchenTimers` hook supporting unlimited concurrent timers with labels, countdowns, and audio beep alerts via Web Audio API
- Timer presets (5m, 10m, 15m, 20m, 30m) plus custom timer with label field
- Voice command integration ("Timer 12 minutes") via `useKitchenVoice` hook (Web Speech API)
- KDS-style voice commands (`lib/voice/kitchen-commands.ts`) with timer parsing
- Prep timers in morning briefing (`components/briefing/prep-timers-section.tsx`) with server-persisted end times
- Course tracking with pending/plating/served status progression

**Data source?** No external data needed. Timer functionality is self-contained computation. The only "source" is the chef's knowledge of cook times, which ChefFlow already stores in recipes.

**Client-collaborative angle:** None. Timers are entirely chef-side operational. Clients have no input on cook times.

**Physical reality:** This is the core kitchen boundary scenario. Hands are wet, greasy, or gloved. Phone is propped on a shelf or counter. The chef needs:

- Audio alerts loud enough to hear over kitchen noise (hood fan, sizzling, music)
- Visual display glanceable from 3+ feet away
- Voice-first timer creation (hands are occupied)
- Large countdown numbers (already implemented at 60-72px in `KitchenTimerDisplay`)
- Color-coded urgency (green > yellow at 30s > red at 0, already implemented)

**Compounding:** Medium. Individual timer durations are one-off, but recipe-linked timers compound: if ChefFlow knows "risotto = 18 min from stock addition," that knowledge persists forever. Pre-populating timers from recipe cook times would eliminate the mental math of remembering durations.

**Solution design:**

- ChefFlow already has this built. `components/kitchen/kitchen-timer.tsx` provides `useKitchenTimers` (unlimited concurrent timers with labels, audio beeps, visual countdowns). `components/kitchen/kitchen-mode-view.tsx` provides a full-screen dark Timers tab with presets and custom input. `lib/hooks/use-kitchen-voice.ts` enables voice-driven timer creation. The core exit is already eliminated.
- Remaining gaps to close:
  - Auto-suggest timers from recipe cook times when entering Kitchen Mode (recipes already have `cook_time_minutes`)
  - Persist timer state server-side so timers survive page refresh/reconnect (currently client-side only via `useState`)
  - Browser notification API integration for alerts when ChefFlow tab is in background
  - Louder/configurable alert sounds (current beep is quiet square wave at 0.3 gain)
  - Vibration API for mobile devices (navigator.vibrate)

**Where it appears:**

- Kitchen Mode Timers tab (`components/kitchen/kitchen-mode-view.tsx`)
- Kitchen Mode step overlay (`components/kitchen/kitchen-mode.tsx`)
- Morning Briefing prep timers (`components/briefing/prep-timers-section.tsx`)

**What remains as permanent exit:**
Very little. A chef who prefers a dedicated physical timer device (a clip-on kitchen timer they can carry between stations) will continue using it. ChefFlow cannot replicate a physical wearable timer that moves with the chef between kitchen zones. But for phone-based timing, ChefFlow already handles this.

**Priority:** High frequency (every service) x Low effort (infrastructure exists, needs polish) = High priority polish item
**Spec needed?** No. The core feature is built. The gaps (recipe-linked auto-suggest, persistence, background notifications) are incremental enhancements to existing code, not a new system.

---

## Scenario #94: Quick recipe glance mid-cook (hands dirty)

**Original classification:** Partially reducible. Could optimize recipe view for glance-able mobile (large text, minimal scroll).
**Reclassified to:** Reducible `NEEDS-DEVELOPER-REVIEW`

**Why chef leaves:** The chef is mid-cook, hands covered in flour or oil, and needs to confirm a ratio ("was it 3:1 or 4:1 stock to rice?"), a temperature ("what temp for the chocolate temper?"), or a technique step they don't have fully memorized. They reach for the phone with a knuckle or elbow to check. The operational need is instant confirmation of a specific detail from a recipe they already know but need to verify one data point.

**Context ChefFlow has:**

- Complete recipe library with structured ingredients (quantities, units, preparation notes)
- Method text (brief and detailed variants) parseable into numbered steps
- Recipe print view (`components/print/recipe-print-view.tsx`) with two-column layout (ingredients left, instructions right), allergen badges, yield/timing metadata, and large checkboxes
- Print actions (`lib/print/print-actions.ts`) to load recipe + ingredients for print
- Kitchen Mode step-by-step overlay (`components/kitchen/kitchen-mode.tsx`) with 48px step titles and 24px descriptions on dark background
- Voice commands for step navigation ("next step," "go back," "what's next")
- Remy voice interface available for hands-free queries
- Menu items linked to recipes linked to events

**Data source?** No. The recipe data is already in ChefFlow. This is a display/access optimization, not a data gap.

**Client-collaborative angle:** None. Recipe details are chef IP. Clients do not contribute to cooking instructions.

**Physical reality:** This is the canonical "messy hands" scenario. The rubric's own rules (from stress-test #94) apply directly:

- **Print is primary.** A laminated or sheet-protector printed recipe on the counter is the zero-friction reference. ChefFlow's `RecipePrintView` already provides this. The chef prints before service, not during.
- **Voice is the hands-free bridge.** "Remy, what's the stock ratio for the risotto?" should work via `useKitchenVoice`. Currently voice handles step navigation but not recipe-content queries.
- **Large text + minimal UI for glance moments.** Kitchen Mode already uses 48px titles and 24px body text on dark background. For a pure recipe glance, a dedicated "recipe card" view (not the full recipe editor) would show only: ingredient list + current step, nothing else.
- **Screen must survive wet knuckle taps.** Large touch targets (already 48px+ buttons in Kitchen Mode).

**Compounding:** High. Every recipe the chef captures is permanently available for mid-cook glance. The more recipes in the library, the more "phone recipe checks" ChefFlow eliminates. A chef with 200 recipes never needs another recipe app.

**Solution design:**

- **Pre-service print.** Already built: `RecipePrintView` with `getRecipePrintData`. Promote "Print recipes for tonight" as a pre-service checklist item. Generate a consolidated multi-recipe PDF for the full menu.
- **Kitchen Mode recipe card.** Add a "Recipe" tab to `KitchenModeView` that shows the current course's recipe in glance format: ingredients in large text, current step highlighted, swipe/voice to navigate steps. No edit controls, no metadata clutter. Just the cooking facts.
- **Voice recipe queries via Remy.** Extend kitchen voice commands to handle "what's the ratio for [dish]" or "ingredients for [dish]" by querying the event's menu recipes. `lib/voice/kitchen-commands.ts` already parses dish names from voice input (fire, 86, all-day commands).
- **Wake-screen glance.** When Kitchen Mode is active, keep the screen on (Wake Lock API) so the chef doesn't have to unlock the phone with dirty hands.
- **Event recipe quick-access.** On the event detail page, add a "Tonight's Recipes" quick-link that opens a minimal, read-only, large-text recipe list for all menu items.

**Where it appears:**

- Kitchen Mode recipe tab (new, in `components/kitchen/kitchen-mode-view.tsx`)
- Print flow (existing `components/print/recipe-print-view.tsx`)
- Pre-service checklist (existing `lib/events/generate-pre-service-checklist.ts`)
- Voice commands (extend `lib/voice/kitchen-commands.ts` and `lib/hooks/use-kitchen-voice.ts`)

**What remains as permanent exit:**

- Recipes not yet captured in ChefFlow (the chef will check a cookbook or photo of handwritten notes for recipes they haven't imported yet)
- Technique questions beyond what the recipe text contains ("how do I actually fold this dough?") require YouTube or similar visual reference. ChefFlow is not a culinary school.

**Priority:** High frequency (multiple times per service) x Medium effort (print exists, Kitchen Mode exists, recipe tab and voice query are incremental) = High priority
**Spec needed?** No. The building blocks exist. The recipe glance tab for Kitchen Mode and voice recipe queries are feature enhancements to existing surfaces, not a new system requiring architectural spec.

---

## Scenario #95: Music/ambiance control

**Original classification:** Permanent exit.
**Reclassified to:** Permanent `NEEDS-DEVELOPER-REVIEW`

**Why chef leaves:** The chef needs to start a playlist, adjust volume, skip a track, or change the mood of background music during service. This might be for client atmosphere (jazz during a dinner party) or personal focus (high-energy music during prep). The operational need is audio environment control.

**Context ChefFlow has:**

- Ambiance notes per event (`lib/events/ambiance-actions.ts`): free-text field for recording music, lighting, table setting, and mood plans
- Ambiance panel on event detail Ops tab (`components/events/event-ambiance-panel.tsx`): editable at any event status
- Placeholder text in the panel suggests: "Music: jazz playlist, low volume" as a format
- Exit link #90 on the execution page for ambiance context
- No music playback, no Spotify/Apple Music API integration, no audio streaming

**Data source?** Yes, in theory. Spotify and Apple Music have APIs for playback control. However:

- Spotify API requires Premium subscription + OAuth + active device
- Apple Music API requires Apple Developer account + MusicKit
- Both require the music service's app running on a device
- Integration is complex, fragile, and serves a non-core use case
- The chef already has the music app open or a smart speaker in the room

**Client-collaborative angle:** Low but present. A Dinner Circle could ask the client about music preferences ("Any music requests for the evening?"), and ChefFlow could store this in the ambiance notes. This already works via the free-text ambiance field. Automating playlist selection from client preferences would require music service integration, which is not justified by the use case.

**Physical reality:** Music control happens via:

- Smart speaker voice commands ("Alexa, play jazz playlist") -- zero friction, already hands-free
- Phone lock screen media controls (play/pause/skip are system-level, work without opening any app)
- Physical speaker/system remote controls
- ChefFlow cannot compete with any of these because it is not the audio playback surface. Even if ChefFlow could send a Spotify API command, the chef would still need Spotify running on a device. The indirection adds friction rather than removing it.

**Compounding:** Low. Music preferences per client could compound (store "Client Smith likes Sinatra"), but the ambiance notes field already captures this. The actual playback control is always ephemeral and device-dependent.

**Solution design:**

- **Keep ambiance notes as-is.** The planning side (what music to play, what mood to set) is already handled by the ambiance panel. This is the compounding part: "Client Smith's dinner parties always start with Chet Baker."
- **Dinner Circle music preferences.** Add a music/atmosphere question to the guest experience questionnaire. Store responses in ambiance notes. This turns a chef guess into a client-informed decision.
- **Do not integrate Spotify/Apple Music APIs.** The complexity-to-value ratio is unfavorable. Smart speakers and lock-screen controls are zero-friction. ChefFlow adding a middleman layer to music playback would increase friction, not reduce it.
- **Pre-service ambiance reminder.** Surface the ambiance notes in the pre-service checklist so the chef remembers to start the right playlist before guests arrive.

**Where it appears:**

- Event Ops tab ambiance panel (existing `components/events/event-ambiance-panel.tsx`)
- Pre-service checklist (existing `lib/events/generate-pre-service-checklist.ts`)
- Dinner Circle guest questionnaire (potential addition for music preferences)

**What remains as permanent exit:**
Everything about actual music playback. Starting, stopping, adjusting volume, skipping tracks, changing playlists. ChefFlow will never be a music player. The chef will always reach for their phone's lock screen, ask a smart speaker, or use a physical remote. This is the correct boundary: ChefFlow handles the _planning_ of ambiance (what to play), not the _execution_ (playing it).

**Priority:** Low frequency (set once before service, occasional adjustments) x High effort (API integration for marginal value) = Low priority, correctly classified as permanent
**Spec needed?** No. The ambiance notes and pre-service checklist already cover the reducible portion. The permanent exit (music playback) requires no spec because ChefFlow should not build it.

---

## Batch Summary

| #   | Title                                      | Reclassified To | Spec Needed?                     | Status                 |
| --- | ------------------------------------------ | --------------- | -------------------------------- | ---------------------- |
| 93  | Multiple concurrent kitchen timers         | Reducible       | No (already built, polish only)  | NEEDS-DEVELOPER-REVIEW |
| 94  | Quick recipe glance mid-cook (hands dirty) | Reducible       | No (building blocks exist)       | NEEDS-DEVELOPER-REVIEW |
| 95  | Music/ambiance control                     | Permanent       | No (planning side already built) | NEEDS-DEVELOPER-REVIEW |

### Key Findings

**ChefFlow's kitchen boundary is stronger than the original analysis suggested.** Two of three scenarios originally classified as Permanent or Partially Reducible are actually Reducible because the infrastructure already exists:

- **Kitchen timers (#93):** Fully built with `useKitchenTimers`, `KitchenTimerDisplay`, `KitchenModeView`, and voice commands. Needs persistence and louder alerts, not new architecture.
- **Recipe glance (#94):** Print view exists, Kitchen Mode exists, voice navigation exists. Needs a recipe tab in Kitchen Mode and voice recipe queries, both incremental additions.
- **Music (#95):** Correctly permanent. ChefFlow plans the ambiance (already built), the chef executes it via their audio device.

**The during-service boundary is well-defined:** ChefFlow is the operations brain (what to cook, when, for whom, with what dietary constraints). It is not the audio playback surface, the physical timer device, or the culinary school. The investments in Kitchen Mode, voice commands, and print views have already collapsed most of the "kitchen boundary" exits.
