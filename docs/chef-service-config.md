# Chef Service Configuration

## What This Is

A per-chef settings panel where chefs toggle what services they offer, their policies, and how they operate. Remy reads this config and only talks about what the chef has turned on. If something is off, Remy never mentions it.

## Why It Exists

Every chef runs their business differently. Some do wine pairings, some don't. Some charge travel fees, some cover the whole area. Some do cleanup, some don't. Without this config, Remy would either guess (wrong) or ask generic questions (annoying). With this config, Remy knows exactly what this chef does and doesn't do.

## What Was Built

### Database

- **Table:** `chef_service_config` (one row per chef)
- **Migration:** `20260330000056_chef_service_config.sql`
- 38 boolean toggles across 7 categories
- 6 custom text fields for the chef's own words
- Policy value fields (cancellation terms, travel radius, minimums, etc.)
- RLS scoped to tenant

### Server Actions

- **File:** `lib/chef-services/service-config-actions.ts`
- `getServiceConfig()` - read current chef's config (authenticated)
- `getServiceConfigForTenant(tenantId)` - read for Remy context (server-side)
- `saveServiceConfig(config)` - upsert with cache invalidation
- `formatServiceConfigForPrompt(config)` - formats config into Remy system prompt text

### UI

- **Page:** `app/(chef)/settings/my-services/page.tsx`
- Collapsible sections: Services, Equipment, Staffing, Dietary, Policies, Your Words, Communication, Extras
- Toggle switches with descriptions
- Conditional value fields (appear when toggle is on)
- "Your Words" section with free-text fields for chef's own language
- Linked from Settings main page under "Your Business" group

### Remy Integration

- **Context:** `lib/ai/remy-context.ts` loads service config in Tier 1 (always fresh)
- **Types:** `serviceConfigPrompt` added to `RemyContext` interface
- **Prompt:** Injected into `buildRemySystemPrompt()` in `remy-actions.ts`
- Includes explicit "does NOT offer" list so Remy knows what to avoid
- Chef's custom text fields appear as "CHEF'S OWN WORDS" section with instruction to use their language

## Categories (38 toggles + 6 text fields)

### Services I Offer (10)

Grocery shopping, dessert, cleanup, leftover packaging, table setup, serving, cocktail hour, wine pairings, bartending, tastings

### Equipment & Supplies (4)

Own cookware, dinnerware, linens, rental coordination

### Staffing (4)

Server, sous chef, bartender, additional staff coordination

### Dietary Handling (3)

Allergies, religious diets, medical diets

### Policies (12 toggles + value fields)

Cancellation (+ terms), reschedule (+ terms), guest count deadline (+ days), travel fee (+ radius + amount), minimum spend (+ amount), minimum guests (+ count), gratuity policy (select), grocery cost included, insured

### Your Words (6 text fields)

Intro pitch, what's included, cleanup note, dietary note, gratuity note, travel note

### Communication Preferences (4)

Menu approval, pre-event check-in, final details reminder, post-event follow-up

### Extras (6)

Food photography, social media, NDA, vendor coordination, outdoor events, kid menus

## How Remy Uses It

The formatted prompt includes:

1. What the chef offers (positive list)
2. What the chef does NOT offer (explicit exclusion list)
3. Equipment and staffing details
4. Dietary capabilities
5. All active policies with their values
6. Communication preferences
7. Chef's own words (quoted verbatim when available)
8. Hard instruction: "Only discuss services that are listed. If not listed, never mention it."

## Defaults

Sensible defaults for a typical private chef:

- ON: grocery shopping, dessert, cleanup, leftover packaging, own cookware, allergy handling, cancellation policy, menu approval, pre-event check-in, final details reminder, post-event follow-up
- OFF: everything else (beverages, tastings, serving, linens, staffing, etc.)

## Overlap with Booking Settings

Deposit fields (type, percent, fixed amount) already exist on the `chefs` table via booking settings. They are NOT duplicated here. Remy reads deposit info from booking settings, service config from this table.
