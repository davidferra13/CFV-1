# Hermes Discord Bot Setup

Hermes Discord is a local runtime for the ChefFlow build ledger. Discord is only a command and observability layer; `.agents/build-queue`, proof packs, and `docs/hermes` remain the source of truth.

## Local Environment

Store secrets outside git in `.env.local`:

```text
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=1506721689306665131
DISCORD_GUILD_ID=1388148643533557831
```

Do not paste the bot token into chat, docs, queue items, or proof packs.

## Commands

Run local validation without a token:

```powershell
node scripts/hermes/discord-bot.mjs --self-test
```

Start the Discord runtime after the token is stored locally:

```powershell
npm run hermes:discord
```

The runtime registers `/hermes` guild commands and connects to the Discord gateway.

## Slash Commands

- `/hermes status`: reports runtime, queue counts, morning-report presence, and alert presence.
- `/hermes morning`: summarizes `docs/hermes/morning-report.md`.
- `/hermes ledger`: reports active, in-flight, blocked, done, run, and proof-pack counts.
- `/hermes alerts`: summarizes `docs/hermes/ALERTS.md`.
- `/hermes idea`: captures raw idea intake questions without creating a queue item.
- `/hermes bug`: captures bug/regression intake questions without creating a queue item.
- `/hermes queue-draft`: shapes a build-ready draft without mutating the queue.
- `/hermes decision`: drafts a decision-log entry without writing to the repo.
- `/hermes proof`: lists recent proof packs or matches a queue ID.

## Safety Boundaries

- Hermes reads local repo artifacts and drafts responses.
- Queue creation, queue mutation, and build firing still require explicit human approval.
- No Discord command writes secrets.
- No Discord command writes tenant data.
- No Discord command mutates application data.

## Verification

Before marking the queue item done:

1. Confirm the bot is installed in the target Discord server.
2. Start `npm run hermes:discord` with a local `DISCORD_BOT_TOKEN`.
3. Run each `/hermes` subcommand in Discord.
4. Capture command output or screenshots in the proof pack.
5. Confirm no secrets appear in `git status`, tracked files, logs, or proof notes.
