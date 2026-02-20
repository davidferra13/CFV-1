# Local Testing Bootstrap

## One-command setup

Run:

```bash
npm run local:bootstrap
```

This does all of the following:

1. Starts local Supabase containers.
2. Resets local DB and applies all migrations.
3. Regenerates `types/database.ts` from local DB.
4. Seeds demo auth users and sample ChefFlow data.
5. Verifies Supabase connectivity.

## Demo credentials

- Chef: `chef.demo@local.chefflow` / `ChefFlowLocal!123`
- Client: `client.demo@local.chefflow` / `ChefFlowLocal!123`

## What gets seeded

- Chef account + role + chef preferences
- Client account + role (attached to demo chef)
- One inquiry
- One draft event linked to the inquiry
- Integration demo rows (connections + events)
- `PLATFORM_OWNER_CHEF_ID` in `.env.local` is set to the seeded chef

## Useful URLs

- App: `http://127.0.0.1:3100`
- Supabase Studio: `http://127.0.0.1:54323`
- Mailpit: `http://127.0.0.1:54324`
- Public chef page: `http://127.0.0.1:3100/chef/chef-demo`

## Routine commands

```bash
npm run dev
npm run supabase:status
npm run supabase:stop
npm run seed:local
```
