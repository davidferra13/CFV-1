// Sales tax constants — NOT 'use server'; safe to import in both client and server contexts

export const COMMON_STATE_RATES_BPS: Record<string, { label: string; rateBps: number }> = {
  AL: { label: 'Alabama', rateBps: 400 },
  AK: { label: 'Alaska (no state tax)', rateBps: 0 },
  AZ: { label: 'Arizona', rateBps: 560 },
  AR: { label: 'Arkansas', rateBps: 650 },
  CA: { label: 'California', rateBps: 725 },
  CO: { label: 'Colorado', rateBps: 290 },
  CT: { label: 'Connecticut', rateBps: 635 },
  DE: { label: 'Delaware (no sales tax)', rateBps: 0 },
  FL: { label: 'Florida', rateBps: 600 },
  GA: { label: 'Georgia', rateBps: 400 },
  HI: { label: 'Hawaii', rateBps: 400 },
  ID: { label: 'Idaho', rateBps: 600 },
  IL: { label: 'Illinois', rateBps: 625 },
  IN: { label: 'Indiana', rateBps: 700 },
  IA: { label: 'Iowa', rateBps: 600 },
  KS: { label: 'Kansas', rateBps: 650 },
  KY: { label: 'Kentucky', rateBps: 600 },
  LA: { label: 'Louisiana', rateBps: 445 },
  ME: { label: 'Maine', rateBps: 550 },
  MD: { label: 'Maryland', rateBps: 600 },
  MA: { label: 'Massachusetts', rateBps: 625 },
  MI: { label: 'Michigan', rateBps: 600 },
  MN: { label: 'Minnesota', rateBps: 688 },
  MS: { label: 'Mississippi', rateBps: 700 },
  MO: { label: 'Missouri', rateBps: 423 },
  MT: { label: 'Montana (no sales tax)', rateBps: 0 },
  NE: { label: 'Nebraska', rateBps: 550 },
  NV: { label: 'Nevada', rateBps: 685 },
  NH: { label: 'New Hampshire (no sales tax)', rateBps: 0 },
  NJ: { label: 'New Jersey', rateBps: 663 },
  NM: { label: 'New Mexico', rateBps: 500 },
  NY: { label: 'New York', rateBps: 400 },
  NC: { label: 'North Carolina', rateBps: 475 },
  ND: { label: 'North Dakota', rateBps: 500 },
  OH: { label: 'Ohio', rateBps: 575 },
  OK: { label: 'Oklahoma', rateBps: 450 },
  OR: { label: 'Oregon (no sales tax)', rateBps: 0 },
  PA: { label: 'Pennsylvania', rateBps: 600 },
  RI: { label: 'Rhode Island', rateBps: 700 },
  SC: { label: 'South Carolina', rateBps: 600 },
  SD: { label: 'South Dakota', rateBps: 450 },
  TN: { label: 'Tennessee', rateBps: 700 },
  TX: { label: 'Texas', rateBps: 625 },
  UT: { label: 'Utah', rateBps: 485 },
  VT: { label: 'Vermont', rateBps: 600 },
  VA: { label: 'Virginia', rateBps: 430 },
  WA: { label: 'Washington', rateBps: 650 },
  WV: { label: 'West Virginia', rateBps: 600 },
  WI: { label: 'Wisconsin', rateBps: 500 },
  WY: { label: 'Wyoming', rateBps: 400 },
  DC: { label: 'Washington D.C.', rateBps: 600 },
}

export const FILING_FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
}

/** Convert basis points to a display percentage string. 625 → "6.25%" */
export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

/** Compute tax collected: ROUND(taxable_cents × rate_bps / 10000) */
export function computeTaxCents(taxableCents: number, rateBps: number): number {
  return Math.round((taxableCents * rateBps) / 10000)
}
