# Event Detail Wiring & Nav Additions

## What Changed
Two follow-up tasks after the 14-gap closure:
1. Four new event-level components wired into the event detail page
2. New pages added to chef navigation

---

## Task 1 — Event Detail Page Wiring

**File:** `app/(chef)/events/[id]/page.tsx`

### New Components Added

| Component | Source | Shown When |
|-----------|--------|-----------|
| `MenuApprovalStatus` | `components/events/menu-approval-status.tsx` | Event has menus + not cancelled |
| `EventStaffPanel` | `components/events/event-staff-panel.tsx` | Not draft/cancelled |
| `TempLogPanel` | `components/events/temp-log-panel.tsx` | `in_progress` or `completed` status |
| `ContingencyPanel` | `components/events/contingency-panel.tsx` | Not cancelled |

### Data Fetching

A third parallel `Promise.all` block was added after the existing guest/photo fetch:

```typescript
const [contingencyNotes, emergencyContacts, tempLogs, staffMembers, staffAssignments, menuApprovalData] = await Promise.all([
  getEventContingencyNotes(params.id),   // lib/contingency/actions
  listEmergencyContacts(),               // lib/contingency/actions
  getEventTempLog(params.id),            // lib/compliance/actions
  listStaffMembers(),                    // lib/staff/actions
  getEventStaffRoster(params.id),        // lib/staff/actions
  getMenuApprovalStatus(params.id),      // lib/events/menu-approval-actions
])
```

All six calls are wrapped in `.catch(() => [])` / `.catch(() => null)` so the event detail page continues to function even if the relevant migrations haven't been applied to the remote database yet.

### Placement in Page Flow

```
...Communication Log
↓ MenuApprovalStatus     ← new (client confirmation of the menu)
↓ Financial Summary
↓ Record Payment
↓ Expenses
↓ Profit Summary
↓ Time Tracking
↓ EventStaffPanel        ← new (who's working this event)
↓ TempLogPanel           ← new (food safety readings, in_progress/completed only)
↓ Shopping Substitutions
↓ Menu Modifications
↓ Unused Ingredients
↓ ContingencyPanel       ← new (collapsible "What if..." section)
↓ Document Section
↓ Event Transitions
...
```

### Why This Placement
- **MenuApprovalStatus** sits near Communication because it's a client-facing approval loop — like messaging, it involves back-and-forth with the client.
- **EventStaffPanel** follows Time Tracking because both concern labor on the event.
- **TempLogPanel** follows staff because it's operational (active/day-of data capture).
- **ContingencyPanel** sits just before Documents because contingency planning is preparation work — you write these plans *before* the event, similar to how you prepare documents.

---

## Task 2 — Nav Config Additions

**File:** `components/navigation/nav-config.tsx`

### New Icon
Added `Mail` from `lucide-react` for the Marketing nav item.

### Items Added to Existing Groups

| Group | Section | New Entry |
|-------|---------|-----------|
| Events > Menus & Recipes | children (advanced) | `/culinary/vendors` — Vendor Directory |
| Events > Operations Tools | children (advanced) | `/operations/kitchen-rentals` — Kitchen Rentals |
| Events > Operations Tools | children (advanced) | `/operations/equipment` — Equipment Inventory |
| Finance > Financial Hub | children (advanced) | `/finance/tax` — Tax Center |
| More | top-level item | `/marketing` — Marketing (Mail icon) |

### Items Added to Settings Shortcuts

| href | label |
|------|-------|
| `/settings/compliance` | Food Safety & Certifications |
| `/settings/emergency` | Emergency Contacts |
| `/settings/professional` | Professional Development |

These settings shortcuts appear in the "Customize navigation" modal and can be pinned to the chef's primary sidebar by the chef themselves.

### Why `visibility: 'advanced'`
Kitchen Rentals, Vendor Directory, and Tax Center are marked `advanced` — they show in expanded flyouts but don't appear in the default collapsed rail. These are power-user pages relevant to a subset of chefs. Marketing and the settings shortcuts have no visibility restriction, making them readily accessible to all chefs.

---

## Migration Note
The four wired components depend on migrations that may not yet be applied to the remote database:
- `20260303000005_staff_management.sql` → EventStaffPanel
- `20260303000004_menu_approval_workflow.sql` → MenuApprovalStatus
- `20260303000016_contingency_planning.sql` → ContingencyPanel
- `20260303000011_food_safety_compliance.sql` → TempLogPanel

The `.catch()` wrappers on all new data fetches ensure the event detail page renders correctly with empty data before migrations are applied. After running `supabase db push --linked`, all four panels will populate with live data.
