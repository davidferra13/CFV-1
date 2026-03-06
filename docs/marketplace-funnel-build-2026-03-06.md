# Marketplace Funnel Build - 2026-03-06

## What Changed

Built out the marketplace funnel system that turns ChefFlow into the ops layer underneath every chef marketplace platform (Take a Chef, Yhangry, Cozymeal, Bark, Thumbtack, GigSalad, The Knot).

## New Files Created

| File                                                       | Purpose                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `lib/marketplace/platforms.ts`                             | Central registry of all marketplace platforms with channel values, labels, commission rates |
| `lib/marketplace/conversion-actions.ts`                    | Generalized marketplace conversion detection (any platform, not just TAC)                   |
| `lib/marketplace/command-center-actions.ts`                | Cross-platform marketplace lead and booking queries                                         |
| `lib/marketplace/roi-actions.ts`                           | Commission savings calculator across all platforms                                          |
| `lib/marketplace/worksheet-actions.ts`                     | Pre-dinner client worksheet CRUD (create, submit, list)                                     |
| `components/events/marketplace-convert-banner.tsx`         | Generalized "convert to direct" banner for any marketplace platform                         |
| `components/events/send-worksheet-button.tsx`              | Button to create and share a client worksheet from event detail                             |
| `app/(public)/worksheet/[token]/page.tsx`                  | Public worksheet page (no auth required)                                                    |
| `app/(public)/worksheet/[token]/worksheet-form.tsx`        | Client-facing worksheet form                                                                |
| `app/api/public/client-lookup/route.ts`                    | Public API for returning client detection (email lookup)                                    |
| `supabase/migrations/20260330000061_client_worksheets.sql` | Database table for client worksheets                                                        |
| `docs/marketplace-funnel-strategy.md`                      | Strategy doc (created and updated)                                                          |

## Files Modified

| File                                                               | Change                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `app/(chef)/events/[id]/page.tsx`                                  | Added generalized marketplace conversion banner (replaces TAC-only) |
| `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` | Added "Send Client Worksheet" button                                |
| `app/(chef)/marketplace/page.tsx`                                  | Added cross-platform leads, ROI dashboard, other-platform sections  |
| `components/public/public-inquiry-form.tsx`                        | Added returning client auto-detection on email blur                 |

## How the Funnel Works (End to End)

1. **Client finds chef** on Take a Chef, Yhangry, Cozymeal, etc.
2. **Chef captures booking** into ChefFlow (Smart Fill, TAC capture, email forwarding, or manual)
3. **Chef sends worksheet** to client before dinner (shareable link, client fills out preferences/allergies)
4. **Chef runs dinner** through ChefFlow (menu, costing, prep, compliance, event management)
5. **After dinner**, convert banner prompts chef to send client a direct booking link
6. **Client rebooks direct** via `/chef/[slug]/inquire` (preferences auto-filled from CRM)
7. **ROI dashboard** shows chef how much commission they've saved by going direct
8. **Chef never pays commission** on that client again

## Migration Required

The `client_worksheets` table migration needs to be applied:

```sql
-- File: supabase/migrations/20260330000061_client_worksheets.sql
```

**Remember to back up before applying:**

```bash
supabase db dump --linked > backup-$(date +%Y%m%d).sql
```
