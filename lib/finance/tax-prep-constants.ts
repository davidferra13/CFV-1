// Shared constants for tax preparation display.
// Extracted from tax-prep-actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export const SCHEDULE_C_LINES: Record<
  string,
  { label: string; description: string; deductiblePct: number }
> = {
  line_8: {
    label: 'Line 8: Advertising',
    description: 'Marketing, website, business cards, social media ads',
    deductiblePct: 100,
  },
  line_9: {
    label: 'Line 9: Car/Truck Expenses',
    description: 'Mileage deduction (standard rate) or actual vehicle costs',
    deductiblePct: 100,
  },
  line_11: {
    label: 'Line 11: Contract Labor',
    description: 'Payments to contractors, freelancers, and 1099 workers',
    deductiblePct: 100,
  },
  line_13: {
    label: 'Line 13: Depreciation',
    description: 'Equipment depreciation (ovens, mixers, tools)',
    deductiblePct: 100,
  },
  line_15: {
    label: 'Line 15: Insurance',
    description: 'Business liability, commercial auto, health (if self-employed)',
    deductiblePct: 100,
  },
  line_17: {
    label: 'Line 17: Legal/Professional',
    description: 'Accountant fees, legal counsel, bookkeeping',
    deductiblePct: 100,
  },
  line_18: {
    label: 'Line 18: Office Expense',
    description: 'Office supplies, printer ink, postage',
    deductiblePct: 100,
  },
  line_20b: {
    label: 'Line 20b: Rent - Equipment',
    description: 'Rental of business equipment or machinery',
    deductiblePct: 100,
  },
  line_22: {
    label: 'Line 22: Supplies',
    description: 'Food, ingredients, kitchen supplies, disposables',
    deductiblePct: 100,
  },
  line_24a: {
    label: 'Line 24a: Travel',
    description: 'Flights, hotels, transportation for business trips',
    deductiblePct: 100,
  },
  line_24b: {
    label: 'Line 24b: Meals',
    description: 'Business meals (50% deductible)',
    deductiblePct: 50,
  },
  line_25: {
    label: 'Line 25: Utilities',
    description: 'Home office utilities (proportional)',
    deductiblePct: 100,
  },
  line_26: {
    label: 'Line 26: Wages',
    description: 'Gross wages paid to W-2 employees',
    deductiblePct: 100,
  },
  line_27a: {
    label: 'Line 27a: Other Expenses',
    description: 'Certifications, software subscriptions, uniforms, continuing education',
    deductiblePct: 100,
  },
  cogs: {
    label: 'Cost of Goods Sold',
    description: 'Direct food/ingredient costs for events (Part III)',
    deductiblePct: 100,
  },
}
