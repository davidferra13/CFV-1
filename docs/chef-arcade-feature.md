# Chef Arcade — Feature Documentation

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`
**Status:** Complete

## Overview

Chef Arcade is a collection of food-themed mini-games embedded in ChefFlow. Designed as a break-time feature for chefs experiencing writer's block or needing a quick mental reset.

## Games

### 1. Chef Snake (`/games/snake`)

Classic snake game with a recipe-completion twist.

- Collect food emoji ingredients on a 20x20 grid
- Current recipe shown above the canvas (e.g. "Steak Dinner: 🥩🧅🥕")
- Complete a recipe = +50 bonus points + new recipe
- Speed increases every 5 items collected
- Controls: Arrow keys or WASD, Space to restart
- High score saved to localStorage

### 2. Food Galaga (`/games/galaga`)

Space-invader style shooter, food-themed.

- Player is a spatula (🍳) at the bottom
- Waves of rogue ingredients descend in formation and dive-bomb
- Power-ups: 🔪 (spread shot), 🥄 (rapid fire) — 15% drop chance
- 3 lives, waves escalate in difficulty
- Controls: Arrow keys or A/D to move, Space to shoot
- High score saved to localStorage

### 3. Remy's Kitchen Trivia (`/games/trivia`)

AI-powered culinary trivia using Ollama/Remy.

- Pick from 15 preset culinary topics or type a custom topic
- Choose difficulty: Easy / Medium / Hard
- Remy generates 10 unique multiple-choice questions per round
- 15-second timer per question, time bonus for fast answers
- Streak tracking, fun facts after each question
- Previously seen question IDs stored to avoid repeats
- Graceful "Start Ollama" message if Ollama is offline
- High score saved to localStorage

### 4. Tic-Tac-Toe vs Remy (`/games/tic-tac-toe`)

Food-themed tic-tac-toe against an AI opponent.

- Player is 🍳, Remy is 🧑‍🍳
- Grid sizes: 3x3 (minimax AI — very smart), 4x4, 5x5 (heuristic AI)
- Remy taunts during gameplay ("Not bad, chef... but can you keep up?")
- Win/loss/draw tracking persists during session
- Remy has a thinking delay for immersion

## Files Created

- `app/(chef)/games/page.tsx` — Arcade landing page (4 game cards)
- `app/(chef)/games/snake/page.tsx` — Chef Snake game
- `app/(chef)/games/galaga/page.tsx` — Food Galaga game
- `app/(chef)/games/trivia/page.tsx` — Remy's Kitchen Trivia
- `app/(chef)/games/tic-tac-toe/page.tsx` — Tic-Tac-Toe vs Remy
- `lib/games/trivia-actions.ts` — Server action for Ollama trivia generation

## Files Modified

- `components/navigation/nav-config.tsx` — Added `Gamepad2` icon import + "Games" entry in `standaloneBottom` (near Sign Out)

## Technical Notes

- Snake + Galaga: pure client-side HTML5 Canvas, `requestAnimationFrame` loops
- Trivia: `'use server'` action → `parseWithOllama` → Zod-validated JSON
- Tic-Tac-Toe: client-side minimax (3x3) / heuristic (4x4+) AI
- No database tables, no migrations, no billing tier needed
- All high scores use localStorage with `chefflow-` prefix
- Zero API costs (except Ollama compute for trivia)

## Future Ideas

- Event-specific trivia ("Quiz me about my next event")
- More games: memory match, ingredient word scramble, recipe builder puzzle
