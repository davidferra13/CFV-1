# Trivia Game Upgrade — Sources, Timer, & Business Mode

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`

---

## What Changed

### 1. Timer is Now Optional (Off by Default)

- **Before:** Every question had a mandatory 15-second countdown. Time running out counted as a wrong answer.
- **After:** Timer is **off by default**. A toggle switch in the setup phase lets the chef enable "Timed Mode" if they want the challenge. When off, chefs can take their time thinking through each question — no rush, no penalty.
- **When enabled:** Timer works exactly as before (15s per question, time bonus points, red pulse at 5s).
- **When disabled:** No timer displayed, no time bonus points, no auto-fail on timeout.

### 2. Full Source Citations on Every Answer

Every trivia question now includes:

- **`source`** — A readable label naming the reference (e.g., "Wikipedia: Mother sauce", "On Food and Cooking — Harold McGee", "ChefFlow — Client: Jane Smith")
- **`sourceUrl`** — A clickable link to the exact source
  - External culinary questions: links to Wikipedia, Serious Eats, FDA, King Arthur Baking, Wine Folly, etc.
  - Internal business questions: links directly to the ChefFlow client/event page (e.g., `/clients/abc123`)
- **Sources appear in two places:**
  1. After answering each question (inline, below the fun fact)
  2. In the full Answer Review report at the end of the game

### 3. Confidence Meter (Anti-Hallucination)

- Every question includes a **confidence score** (1–5 scale)
- Ollama is instructed to ONLY generate questions it rates 4 or 5 (high confidence)
- Any questions rated below 4 are **filtered out** before they reach the player
- Confidence badges appear next to sources:
  - 5 = "Verified" (green badge)
  - 4 = "High confidence" (blue badge)
  - 3 = "Moderate" (yellow badge, shouldn't appear due to filtering)
- This prevents the AI from quizzing chefs on hallucinated or uncertain facts

### 4. "My Business" Game Mode (Internal Data Trivia)

New game mode that quizzes the chef on **their own data** from ChefFlow:

- **Upcoming Events** — dates, guest counts, dietary restrictions, occasions, service styles
- **My Clients** — preferences, allergies, favorite cuisines, spice tolerance, birthdays
- **Everything** — events + clients + menus combined

Data is fetched from Supabase (tenant-scoped via `requireChef()`), summarized, and sent to Ollama to generate questions. All sources link directly to ChefFlow pages where the chef can verify the answer.

### 5. Full Answer Review Report

**Before:** End screen showed only score + best streak + play again buttons.
**After:** Complete review of every question:

- Green/red card per question (correct/incorrect)
- The question text
- Correct answer (always shown)
- Your answer (if wrong) or "Time ran out"
- Fun fact
- Clickable source with confidence badge
- Score summary at top (X/Y correct, best streak)

---

## Files Changed

| File                               | Change                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/trivia-actions.ts`      | Added `source`, `sourceUrl`, `confidence` to schema. Added `generateInternalTriviaQuestions()` server action. Confidence filtering (4+ only). |
| `app/(chef)/games/trivia/page.tsx` | Rewrote UI: game mode toggle, optional timer, per-question answer tracking, full results report with sources, confidence badges.              |

## Architecture Notes

- **No database changes** — trivia remains client-side + Ollama, no migrations needed
- **No billing tier changes** — both game modes use local Ollama, remain free for all users
- **Privacy:** Internal data mode uses `requireChef()` + tenant scoping. Client data stays local (Ollama only).
- **Backward compatible** — high scores in localStorage still work. Seen question IDs still tracked.

## Testing

- Automated Playwright test (`test-trivia-upgrade.mjs`) verifies:
  - Game mode toggle (Culinary Knowledge / My Business)
  - Timer toggle (off by default, shows "Take your time, no rush")
  - Internal focus options (Upcoming Events, My Clients, Everything)
  - Topic selection and start button enable/disable
  - Timer on state ("earn time bonuses")
- Full game flow (questions, answers, results) requires Ollama to be running

## Future Recommendations

1. **Recipes trivia** — Add a "My Recipes" focus option to quiz on recipe details (prep times, ingredients, yields)
2. **Spaced repetition** — Track which questions the chef gets wrong and resurface them more often
3. **Session history** — Save quiz results to the database so chefs can track learning progress over time
4. **Share mode** — Let chefs share trivia links with their team for staff training
5. **Leaderboard** — Multi-chef leaderboard for competitive learning across a team
