# Spec: Ingredient Sourcing Intelligence

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none (catalog browser already exists)
> **Estimated complexity:** medium (4-5 files)

## Timeline

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-10 10:00 | spec-request  |        |
| Status: ready | 2026-04-10 10:00 | spec-request  |        |

---

## Developer Notes

### Raw Signal

Private chefs spend hours calling suppliers (farms, butchers, specialty retailers) to check ingredient availability. Its repetitive and just a yes/no answer. The catalog should be good enough that calls become rare. When they do need to call, we show them the vendor contact right in the app, ranked by who they work with most.

The system has four tiers: instant (local catalog), fast (web search), ready (saved vendor contacts with phone), and future (AI auto-calling). This spec covers tier 3 only. Tier 4 (Bland.ai or Vapi.ai) is future work and the UI is stubbed to accept it.

### Developer Intent

- **Core goal:** Give chefs quick access to their vendor phone numbers when the catalog fails, without leaving the app.
- **Key constraints:** Never auto-call vendors without explicit async integration (stubbed for future). Do not create new vendors from here (that's a settings workflow). Only display existing vendors with phone numbers.
- **Motivation:** Sourcing is a daily workflow. Shaving 30 seconds per call across 20+ calls per week adds up. The app should move out of the way and let them work.
- **Success from the developer's perspective:** Chef can see vendor options ranked by relevance within 1 second of hitting an empty result. Tap, copy phone, call. That's it.

---

## What This Does (Plain English)

When a chef searches the ingredient catalog and finds nothing (locally or via web search), they see a panel showing their saved vendor contacts, ranked by whether they are marked as preferred, then by vendor type (specialty retailers first). Each vendor shows the name, type badge, contact person name if available, and phone number with a copy-to-clipboard button. If they have no vendors with phone numbers, the panel doesn't render. A small note hints that AI auto-calling is coming soon.

---

## Why It Matters

Sourcing is the second-largest friction point after recipe entry. Removing the friction of "where is the phone number?" keeps chefs in the app and in control of their workflow.

---

## Files to Create

| File                                           | Purpose                                                      |
| ---------------------------------------------- | ------------------------------------------------------------ |
| lib/vendors/sourcing-actions.ts                | Server action to fetch vendor call queue for an ingredient   |
| components/catalog/vendor-call-queue-panel.tsx | React component to display ranked vendors with phone numbers |

---

## Files to Modify

| File                                                  | What to Change                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| app/(chef)/culinary/price-catalog/page.tsx            | Import and render VendorCallQueuePanel after WebSourcingPanel in empty state |
| app/(chef)/culinary/price-catalog/catalog-browser.tsx | Pass ingredient name to panel, wire empty state logic                        |

---

## Database Changes

None. The vendors table already exists with phone and is_preferred columns.

---

## Data Model

The vendors table (assumed to exist; verify in lib/db/schema/) contains:

- id (primary key)
- chef_id (tenant scope)
- name (vendor name, e.g. "Golden Valley Farm")
- vendor_type (enum: farm, butcher, fishmonger, produce, grocery, specialty, other)
- phone (nullable; only display vendors where this is not null)
- contact_name (nullable; display if present)
- is_preferred (boolean; rank these first)
- is_active (boolean; only fetch active vendors)

The getVendorCallQueue(ingredientName: string) server action returns vendors in this order:

1. Preferred vendors first (is_preferred = true)
2. Then by vendor type priority: farm > butcher > fishmonger > produce > specialty > grocery > other
3. All vendors must have is_active = true and phone is not null

---

## Server Actions

| Action                    | Auth          | Input                      | Output                       | Side Effects |
| ------------------------- | ------------- | -------------------------- | ---------------------------- | ------------ |
| getVendorCallQueue(input) | requireChef() | { ingredientName: string } | { vendors: VendorForCall[] } | None         |

### getVendorCallQueue(input)

**Auth:** requireChef()

**Input:**

- ingredientName: string (for future AI call context, not used in v1)

**Output:**

- vendors: Array of objects with fields: id, name, vendor_type, phone, contact_name, is_preferred

**Behavior:**

- Fetch all vendors where chef_id equals current chef, is_active = true, phone is not null
- Sort by is_preferred DESC, then by vendor_type priority
- Return empty array if no vendors match
- Never throw; log errors and return { vendors: [] }

---

## UI / Component Spec

### VendorCallQueuePanel Component

**Location:** components/catalog/vendor-call-queue-panel.tsx

**Props:**

- ingredientName: string (passed from parent for future AI use)

**Render Location:** Catalog browser empty state, after WebSourcingPanel fails

**States:**

- **Loading:** Show skeleton of 3 vendor cards
- **Empty:** Do not render if vendors array is empty
- **Error:** Show gray text: "Could not load vendor list. Try again later."
- **Populated:** Render vendor cards

### Card Layout

Each vendor displays:

- Vendor Name with Type Badge
- Contact: name (if populated)
- Phone: number with Copy Button

**Type Badge:** Green for Farm, red for Butcher, etc. Use existing badge component.

**Copy Button:** Copies phone to clipboard, shows "Phone copied" toast.

**Preferred Indicator:** Star or "Preferred" label if is_preferred = true.

### Panel Header

"Can't find it in the catalog? Try your suppliers."

### Footer Note

"Tip: AI auto-calling is coming soon. We'll reach out to suppliers for you."

### Interactions

- Copy button: optimistic update, copy to clipboard, show toast
- No call button in v1 (stubbed for Tier 4)

---

## Edge Cases and Error Handling

| Scenario                       | Correct Behavior                             |
| ------------------------------ | -------------------------------------------- |
| Chef has no vendors            | Panel doesn't render                         |
| Chef has vendors but no phones | Panel doesn't render (filtered out)          |
| getVendorCallQueue fails       | Log error, render empty (silent)             |
| Copy fails                     | Show toast "Failed to copy"                  |
| Ingredient name is missing     | Pass empty string; action still runs         |
| Multiple preferred vendors     | Display all; maintain secondary sort by type |
| Contact name very long         | Truncate to 20 chars with ellipsis           |
| Phone format invalid           | Display as-is (validation in settings)       |

---

## Verification Steps

1. Sign in as agent
2. Navigate to /app/culinary/price-catalog
3. Search for ingredient not in catalog (e.g., "unicorn liver")
4. Verify WebSourcingPanel appears and fails
5. Verify VendorCallQueuePanel appears below
6. Verify vendors sorted: preferred first, then by type priority
7. Verify contact name shows only if populated
8. Verify copy button works
9. Verify if no vendors with phones, panel doesn't render
10. Test with 1, 5, 10 vendors to verify scaling
11. Test mobile viewport
12. Screenshot final result

---

## Out of Scope

- Creating or editing vendors (settings workflow)
- Phone number validation or formatting
- Vendor call history or results log
- Automated calling via Bland.ai or Vapi.ai (Tier 4)
- Vendor reputation or rating system
- SMS or email contact fallback

---

## Integration Point for Tier 4

When Bland.ai or Vapi.ai is integrated, add a disabled "Call" button per vendor with tooltip "Auto-calling coming soon (Tier 4)".

Future signature:
triggerSupplierCall({ vendorId, ingredientName })
Returns: { callId, status: 'queued' }
Broadcasts via SSE on vendor-call-{vendorId}

Payload: { type, vendorId, callId, status, result (optional), error (optional) }

---

## Notes for Builder Agent

1. Verify vendors table schema in lib/db/schema/. Expected columns: id, chef_id, name, vendor_type, phone, contact_name, is_preferred, is_active.

2. Vendor type priority (secondary sort):
   - farm: 1
   - butcher: 2
   - fishmonger: 3
   - produce: 4
   - specialty: 5
   - grocery: 6
   - other: 7

3. Reference WebSourcingPanel for styling and layout.

4. Action should never throw. Log DB errors, return empty array.

5. Tenant scope all queries: chef_id from session, never from input.

6. Create 2-3 test vendors if dev has none for verification.

7. Add disabled call button now to mark integration point for Tier 4.
