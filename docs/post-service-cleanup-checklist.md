# Post-Service Cleanup Checklist

## What It Does

After cooking at a client's home, the chef uses this standardized cleanup protocol to make sure everything is handled before leaving: surfaces cleaned, equipment packed and accounted for, appliances off, client notified. Prevents the "I left my immersion blender at the Smith's house" problem.

## How It Works

### Storage

All state is in `localStorage` (ephemeral, day-of use only):

- **Per-event checked items:** `cleanup-checklist-{eventId}` (array of checked item IDs)
- **Chef's custom default:** `cleanup-checklist-defaults` (full section/item structure)

No database table needed. This data is only relevant during the service day.

### Default Sections (19 items)

1. **Kitchen Cleanup** (7 items): surfaces, stovetop, oven, sink, floors, trash, dishwasher
2. **Equipment Pack-Out** (6 items): knives, cookware, serving pieces, tools, coolers, fridge check
3. **Final Checks** (4 items): appliances off, kitchen restored, leftovers packaged, inventory match
4. **Client Sign-Off** (2 items): photo of clean kitchen, client notified

### Customization

- **Add items:** In edit mode, pick a section and type a description
- **Remove items:** In edit mode, click the X next to any item
- **Save as default:** Persists the customized checklist as the chef's personal default for all future events
- **Reset to standard:** Reverts to the built-in 19-item checklist

### Integration

- Appears on the **Ops tab** of the event detail page
- Visible when event status is `in_progress` or `completed`
- Opens as a full-screen modal overlay (mobile-optimized with large touch targets)
- Shows progress indicator on the Ops tab card (e.g., "8 of 19 items checked")
- "Service Complete" overlay when all items are checked

## Files

| File | Purpose |
|------|---------|
| `components/events/post-service-checklist.tsx` | Main checklist component (items, sections, customization) |
| `components/events/post-service-checklist-button.tsx` | Ops tab card with progress + modal wrapper |
| `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx` | Integration point (renders the button) |

## Design Decisions

- **localStorage over database:** Cleanup state is ephemeral. It matters on event day, not weeks later. No need to store "did I wipe the counter" in Supabase.
- **Full-screen modal:** Chefs use this while standing in a kitchen, possibly with one hand. Large checkboxes (24px on mobile), full-width tap targets, scrollable content.
- **Follows pre-service checklist pattern:** Uses the same visual language (progress bar, checkmarks, completion badge) as `pre-service-checklist.tsx`.
- **Custom defaults:** Every chef's workflow is different. Some always bring a sous vide, some never use a dishwasher. Customization persists across events.
