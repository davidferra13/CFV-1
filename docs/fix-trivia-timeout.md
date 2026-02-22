# Fix: Trivia Game Timeout Crash

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`

## Problem

The trivia game never worked because it **always timed out**. The root cause:

- The game asked Ollama to generate **10 trivia questions** with the `qwen3-coder:30b` model
- Generating 10 detailed questions with fun facts took **~71 seconds** (1038 tokens)
- The timeout was set to **60 seconds** — every single attempt timed out
- The UI correctly showed "Remy is cooking up your questions..." but would always end with an error

Additionally, Ollama could get stuck running in the background after a cancelled or timed-out request, consuming ~15GB of RAM across 3 processes.

## Fix

### 1. Reduced questions from 10 to 5 (`lib/games/trivia-actions.ts`)

- 5 questions generate in ~35 seconds — well within timeout
- Game is still fun and educational (5 questions × up to 45 points each = 225 max)
- Faster rounds encourage replay

### 2. Increased timeout from 60s to 120s (`lib/games/trivia-actions.ts`)

- Gives a safety margin for slower model loads or cold starts
- Combined with fewer questions, the game reliably finishes in 30-40s

### 3. Adjusted score thresholds (`app/(chef)/games/trivia/page.tsx`)

- Trophy emoji: 200 → 150 points (scaled for 5 questions)
- Star emoji: 100 → 75 points

### 4. Killed stuck Ollama processes and restarted cleanly

- 3 Ollama processes were consuming ~15GB RAM
- Force-killed all processes and restarted fresh

## Testing

Full end-to-end Playwright test verified:

- Setup page loads correctly
- Questions generate and display (5 questions, "1/5" progress)
- Answering works (tap choice → show correct/incorrect + fun fact)
- "Next Question" navigation works through all 5 questions
- Results screen shows score, best streak, Play Again / New Topic

Screenshots saved to `test-screenshots/trivia-01-setup.png` through `trivia-06-results.png`.

## Files Changed

| File                               | Change                                    |
| ---------------------------------- | ----------------------------------------- |
| `lib/games/trivia-actions.ts`      | 10→5 questions, 60s→120s timeout          |
| `app/(chef)/games/trivia/page.tsx` | Score thresholds adjusted for 5 questions |
