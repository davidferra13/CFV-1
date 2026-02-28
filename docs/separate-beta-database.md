# Separating the Beta Database from Dev

**Status:** TODO — waiting for developer to execute
**Risk if not done:** A stray mutation on beta corrupts dev data, or vice versa.

## Why This Matters

Dev and beta currently share the same Supabase instance (`luefkpakzvxcsqroxyhz`). This means:

- Testing destructive operations on beta affects dev
- Seed data or test data on dev shows up on beta
- A bad migration rehearsal on one breaks the other
- No way to test migrations safely before applying to dev

## Steps to Separate

### 1. Create a New Supabase Project (free tier)

1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Name it `chefflow-beta` (or similar)
4. Choose the same region as the dev project
5. Save the new project's credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Apply All Migrations to the New Project

```bash
# Link to the new project
npx supabase link --project-ref <new-project-id>

# Push all migrations
npx supabase db push

# Re-link back to the dev project when done
npx supabase link --project-ref luefkpakzvxcsqroxyhz
```

### 3. Update `.env.local.beta`

Replace the three Supabase variables with the new project's credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<new-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
```

### 4. Seed the Beta Database

The beta database will start empty. You'll need to:

- Create the agent test account (run `npm run agent:setup` against beta)
- Create the developer's admin account
- Optionally seed demo data

### 5. Deploy to Beta

```bash
bash scripts/deploy-beta.sh
```

The deploy script already copies `.env.local.beta` to the Pi as `.env.local`, so the new database credentials will take effect automatically.

### 6. Verify

- Visit `https://beta.cheflowhq.com` and confirm it loads
- Check that dev data is NOT showing on beta
- Check that beta actions don't affect dev

## Ongoing Maintenance

After separation:

- **Migrations** must be applied to both databases. Run `supabase db push` against each project when adding new migrations.
- **Backups** run per-project. The `scripts/backup-db.sh` script backs up whichever project is currently linked.
- **The deploy script doesn't touch the database** — it only deploys code. Database changes are always manual.

## Cost

Supabase free tier includes 2 projects. If you already have 2, the third is $25/month (Pro plan). Check your dashboard.
