// IRS GDS useful life defaults by equipment category
// Source: IRS Publication 946, Table B-1 (MACRS Asset Classes)

export const IRS_USEFUL_LIFE_DEFAULTS: Record<string, number> = {
  cookware: 5,
  knives: 5,
  smallwares: 5,
  appliances: 7,
  serving: 7,
  transport: 5,
  linen: 3,
  other: 7,
}

// Section 179 annual deduction limit (2024)
// Consult current IRS limits — this is for informational display only
export const SECTION_179_ANNUAL_LIMIT_CENTS = 123000000 // $1,230,000 (2024)

export const DEPRECIATION_METHOD_LABELS: Record<string, string> = {
  section_179: 'Section 179 (Full deduction in year of purchase)',
  straight_line: 'Straight-Line (Spread over useful life)',
}
