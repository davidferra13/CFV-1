# Partner Reports

## Overview

Generate professional, print-ready monthly performance reports for referral partners. These reports are designed to be shared with partners to demonstrate the value of the relationship — showing referral volume, completed events, guests served, and revenue.

---

## Report Data (`lib/partners/report.ts`)

### `getPartnerReportData(partnerId, month?)`

Assembles comprehensive report data for a single partner over a time period.

**Returns:**

```typescript
{
  partner: {
    name: string
    partner_type: string
    contact_name: string | null
  }
  period: {
    label: string        // e.g., "February 2026"
    start: string        // ISO date
    end: string          // ISO date
  }
  summary: {
    totalReferrals: number
    completedEvents: number
    totalGuests: number
    totalRevenue: number  // in cents
  }
  events: Array<{
    date: string
    occasion: string
    guest_count: number
    status: string
    location_name: string | null
  }>
  locationBreakdown: Array<{
    name: string
    referrals: number
    events: number
    revenue: number       // in cents
  }>
}
```

**Data sources:**
- Partner info from `referral_partners`
- Inquiries linked via `referral_partner_id` within the date range
- Events linked via `referral_partner_id` within the date range
- Location stats from `partner_locations` joined with inquiry/event counts
- Revenue from event totals (completed events only)

---

## Report Page (`app/(chef)/partners/[id]/report/page.tsx`)

Server component that fetches report data and renders a print-optimized layout.

### Sections

1. **Header** — Partner name, type, period label
2. **Summary Cards** — Total Referrals, Completed Events, Guests Served, Revenue
3. **Events Table** — Date, Occasion, Guest Count, Status, Location
4. **Location Breakdown** — Per-location referrals, events, revenue (if partner has multiple locations)

### Print Optimization

- Clean layout with `print:` Tailwind classes
- Action buttons hidden when printing
- Designed for A4/Letter paper
- `window.print()` triggered by Print button

### Access

Navigate from partner detail page via "View Report" button, or directly at:
```
/partners/[id]/report
```

---

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `PartnerReportActions` | `components/partners/partner-report-actions.tsx` | Print button (hidden in print) |

---

## Design Decisions

1. **Monthly granularity** — Reports default to the current month. The `month` parameter accepts `YYYY-MM` format for historical reports.

2. **Revenue from events, not ledger** — Uses event `total_amount` rather than ledger computations for simplicity. For finalized financial reporting, the ledger should be the source of truth.

3. **Print-first design** — The primary use case is printing or saving as PDF via the browser's print dialog. A dedicated PDF export using jsPDF can be added later using the existing `PDFLayout` pattern from `lib/documents/pdf-layout.ts`.

4. **Shareable with partners** — The report intentionally shows only data relevant to the partner (their referrals, events, revenue). Internal notes, commission arrangements, and other partners' data are never included.

---

## Future Enhancements

- PDF export via jsPDF (pattern exists in `lib/documents/generate-prep-sheet.ts`)
- Email report directly to partner
- Comparison periods (month-over-month)
- Aggregate annual reports
