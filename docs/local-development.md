# Local Development with Docker

## What This Is

When you develop the app on your computer, it normally connects to the **live production database** — the one with real chefs and real clients. That's risky.

With Docker running, you can spin up a **private copy of the entire database** on your own machine. This copy is completely separate from production. You can:

- Test new features without affecting real users
- Break things and reset without consequences
- Try database changes before applying them to the live system

The Supabase CLI manages Docker automatically — you just run one command and it handles starting Postgres, Auth, file storage, and everything else.

---

## One-Time Setup (Do This Once)

### Step 1 — Make sure Docker is running

Open Docker Desktop. It should show a green status. (You said it's already running — you're good.)

### Step 2 — Start local Supabase

In your terminal, from the project folder:

```bash
npm run supabase:start
```

The **first time** you run this, Docker downloads the Supabase images. This can take 5-10 minutes depending on your internet speed. After that, it's instant.

When it finishes, you'll see a status table printed in the terminal.

### Step 3 — Get your local keys

```bash
supabase status
```

Look for two values in the output:

- `anon key` — a long string starting with `eyJ...`
- `service_role key` — another long string starting with `eyJ...`

### Step 4 — Add your local keys to the config file

Open the file [`.env.local.dev`](../.env.local.dev) in your editor.

Find these two lines:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=PASTE_LOCAL_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=PASTE_LOCAL_SERVICE_ROLE_KEY_HERE
```

Replace the placeholder text with the values you copied from `supabase status`. Save the file.

Also fill in your other API keys (Stripe, Google, Resend) — they're the same keys you use in production, just copied here.

### Step 5 — Load all migrations into the local database

```bash
npm run supabase:reset
```

This runs all 127+ migration files against your local database, building the complete schema. Takes about 1-2 minutes.

### Step 6 — Add demo data (optional)

```bash
npm run seed:local
```

This creates some sample chefs, clients, and events so you have something to look at when you open the app locally.

---

## Daily Workflow

Every day you want to develop locally:

**Morning — Start Docker Supabase:**

```bash
npm run supabase:start
```

**Switch your app to point at local database:**

```bash
npm run env:use-local
```

This automatically backs up your production connection file and replaces it with the local one. Your production credentials are never lost.

**Start the app:**

```bash
npm run dev
```

Open <http://localhost:3100> in your browser.

**View your local database (optional):**
Open <http://127.0.0.1:54323> in your browser — this is Supabase Studio, a visual database browser for your local copy.

**Evening — Stop Docker when done:**

```bash
npm run supabase:stop
```

**Restore production connection when done:**

```bash
npm run env:use-prod
```

---

## Applying a New Migration Locally

When a new database migration is added (a new `.sql` file in `supabase/migrations/`):

```bash
npm run supabase:reset
```

This replays all migrations from scratch. Your local database gets rebuilt with the new schema. (Note: this wipes your local data — that's fine, it's just test data. Run `npm run seed:local` again if you want demo data back.)

---

## Regenerating TypeScript Types Locally

After running a migration locally, regenerate the TypeScript types from your local database:

```bash
npm run supabase:types:local
```

Use `npm run supabase:types` (without `:local`) only when you want to sync types from the production database.

---

## Switching Between Local and Production

| What you want       | Command                 |
| ------------------- | ----------------------- |
| Use local Docker DB | `npm run env:use-local` |
| Use production DB   | `npm run env:use-prod`  |

These commands swap the `.env.local` file. Your production credentials are always safely backed up in `.env.local.prod.backup` (which is listed in `.gitignore` — it will never be accidentally committed).

---

## Checking Email Locally

The local Supabase setup includes a fake email inbox. Any emails the app tries to send (login links, confirmations, etc.) are captured here instead of actually being sent:

<http://127.0.0.1:54324>

Open that URL to see the emails.

---

## Troubleshooting

**"supabase start" fails or hangs**
Make sure Docker Desktop is open and the Docker engine is running (green status in Docker Desktop).

**App shows a connection error after switching to local**
Double-check that you filled in the correct keys in `.env.local.dev` and ran `npm run env:use-local` again after saving.

**Local database is missing tables**
Run `npm run supabase:reset` to apply all migrations.

**I accidentally messed up my local database**
Run `npm run supabase:reset` — it wipes and rebuilds. That's the whole point.

**I want to go back to production**
Run `npm run env:use-prod` — your production `.env.local` is instantly restored.

---

## Ports Reference

| Service                     | URL                      |
| --------------------------- | ------------------------ |
| App (local dev)             | <http://localhost:3100>  |
| Supabase API                | <http://127.0.0.1:54321> |
| Supabase Studio (DB viewer) | <http://127.0.0.1:54323> |
| Email inbox (fake)          | <http://127.0.0.1:54324> |
| Postgres (direct)           | localhost:54322          |
