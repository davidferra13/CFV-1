# ChefFlow RL Agent

Autonomous reinforcement learning agent that simulates thousands of diverse users
interacting with ChefFlow through `beta.cheflowhq.com`.

## Quick Start

```bash
# Run 100 episodes
npm run rl:episodes

# Run continuously (Ctrl+C to stop, checkpoints automatically)
npm run rl:start

# Resume from last checkpoint
npm run rl:resume

# Generate report from existing data
npm run rl:report
```

## Prerequisites

1. Agent account credentials in `.auth/agent.json`:

   ```json
   { "email": "...", "password": "..." }
   ```

   Or set `AGENT_EMAIL` and `AGENT_PASSWORD` env vars.

2. Beta server running at `https://beta.cheflowhq.com/`

3. `better-sqlite3` installed (added as devDependency)

## What It Does

- Launches headless Chromium browsers
- Authenticates as the agent test account
- Simulates 6 user archetypes (private chef, caterer, meal prep, client, restaurant, new user)
- Explores the app using Q-learning (tabular, epsilon-greedy with UCB1)
- Records every action, state transition, and anomaly to local SQLite
- Detects dead ends, crashes, slow pages, memory leaks, console errors
- Checkpoints every 100 episodes for crash recovery
- Generates Markdown reports to `docs/rl-reports/`

## Data Storage

All data is local SQLite. Nothing touches Supabase or any cloud service.

```
data/rl-db/chefflow-rl.sqlite    -- Main database
data/rl-checkpoints/              -- Checkpoint snapshots
data/rl-screenshots/              -- Anomaly screenshots
docs/rl-reports/                  -- Generated reports
```

## Full Documentation

See `docs/reinforcement-learning-system.md` for the complete system design.
