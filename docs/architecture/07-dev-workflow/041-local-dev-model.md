# Local Development Model

**Document ID**: 041
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the standard local development workflow for ChefFlow V1 developers.

---

## Daily Workflow

### 1. Start Supabase

```bash
supabase start
```

**Output**: Copy `anon key` and `service_role key` to `.env.local`

---

### 2. Apply Migrations

```bash
supabase db reset
```

**Effect**: Fresh database with all migrations applied

---

### 3. Start Next.js

```bash
npm run dev
```

**URL**: `http://localhost:3000`

---

### 4. Generate Types (After Schema Changes)

```bash
npm run types:generate
```

**Effect**: Updates `types/database.ts`

---

## Hot Reload

**File Changes**: Auto-detected, page refreshes

**Schema Changes**: Requires `supabase db reset` and `npm run types:generate`

---

## Testing Payments Locally

### Start Stripe CLI

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

**Output**: Copy webhook secret to `.env.local`

---

### Trigger Test Payment

```bash
stripe trigger payment_intent.succeeded
```

---

## References

- **Local Environment**: `014-local-environment.md`
- **Supabase CLI Model**: `043-supabase-cli-model.md`
