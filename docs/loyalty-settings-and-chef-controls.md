# Loyalty System: Chef Controls & Settings

## What Was Built in This Pass

### 1. UpdateLoyaltyConfigSchema — Fixed

`lib/loyalty/actions.ts` now includes `welcome_points` and `referral_points` in the
`UpdateLoyaltyConfigSchema`. These were defined in the `LoyaltyConfig` type but were
silently ignored by the server action validator. Now they can be set via the settings UI.

### 2. Loyalty Settings Page (`/loyalty/settings`)

**Files:**

- `app/(chef)/loyalty/settings/page.tsx` — server page, loads config
- `app/(chef)/loyalty/settings/loyalty-settings-form.tsx` — full client-side form

**What the chef can configure:**

| Section           | Controls                                                          |
| ----------------- | ----------------------------------------------------------------- |
| Program Status    | Toggle on/off — pausing stops all future point awards             |
| Earn Rates        | Points per guest, welcome bonus points, referral reference points |
| Large Party Bonus | Enable/disable toggle, guest threshold, bonus points              |
| Milestone Bonuses | Dynamic list — add milestones by dinner count + bonus, remove any |
| Tier Thresholds   | Silver / Gold / Platinum minimum lifetime points                  |

**Milestone Manager UX:**

- Existing milestones shown as cards with "Remove" buttons
- Add form at bottom: enter "After dinner #" + "Bonus points" → click "Add Milestone"
- List auto-sorts by event count
- Prevents duplicate milestone events
- Validates tier ordering before saving (Silver < Gold < Platinum)

### 3. Inline Reward Editing

`app/(chef)/loyalty/reward-actions.tsx` rewritten to support both Edit and Remove:

- Each reward row in the catalog now shows **Edit** and **Remove** buttons
- Clicking **Edit** expands an inline form showing pre-populated fields:
  - Name, description, points required, reward type, discount value
- Changes save immediately via `updateReward()` server action
- Cancel button resets to original values without saving
- **Remove** still soft-deletes (sets `is_active = false`)

The dashboard passes the full `reward` object to `RewardActions` instead of just `rewardId`.

### 4. Navigation

`components/navigation/nav-config.tsx` — added `Program Settings` as the first child
under the Loyalty & Retention section. Now visible without entering advanced mode.

### 5. Dashboard Header

`app/(chef)/loyalty/page.tsx` — header now shows:

- **Program Settings** button (secondary) → `/loyalty/settings`
- **Create Reward** button (primary) → `/loyalty/rewards/new`

Program Settings Summary at the bottom also has an **Edit Settings** shortcut link and
now displays welcome bonus points and milestone badges.

---

## Migration Pending Manual Push

**Migration:** `supabase/migrations/20260305000001_loyalty_welcome_and_delivery.sql`

The Supabase CLI auth circuit breaker tripped due to too many failed connection attempts.
To push the migration manually, run one of the following:

```bash
# Option 1: Set DB password env var (get from Supabase Dashboard → Settings → Database)
SUPABASE_DB_PASSWORD=your_password npx supabase db push --linked

# Option 2: Re-login to Supabase CLI first
npx supabase login
npx supabase db push --linked
```

The migration adds:

- `loyalty_config.welcome_points` (integer, default 25)
- `loyalty_config.referral_points` (integer, default 100)
- `clients.has_received_welcome_points` (boolean, default false)
- `loyalty_reward_redemptions` table (pending delivery queue)

**The app will function without the migration, but:**

- Welcome points won't fire (column missing)
- Pending delivery tracking won't work (table missing)
- Settings form can't save welcome/referral points

---

## How the Chef Manages Points Day-to-Day

### From `/loyalty` (main dashboard)

- **Pending Deliveries panel** (top) — see what rewards need to be honoured
- **Rewards Catalog** — Edit or Remove any reward inline
- **Outreach Opportunities** — see clients approaching tiers/rewards
- **"Program Settings" button** → goes to full settings editor
- **"Create Reward" button** → create a new service reward

### From `/loyalty/settings`

- Configure every earn rule: points per guest, welcome bonus, large party, milestones
- Add/remove milestone events at will
- Set tier thresholds
- Toggle program on/off

### From `/clients/:id` (client profile)

- **Award Bonus Points** — manual bonus with custom description and amount
- **Redeem Reward** — manually apply any reward on behalf of a client
- Full loyalty profile: tier, balance, transaction history, upcoming milestones
