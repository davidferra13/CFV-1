# Pricing Calculator

## What It Is

A client-side pricing tool that helps private chefs determine what to charge for events. No database, no server actions. Pure calculation.

## Files

| File | Purpose |
|------|---------|
| `lib/finance/pricing-calculator.ts` | Calculation engine (pure TypeScript, no server dependency) |
| `app/(chef)/finance/pricing-calculator/page.tsx` | Interactive calculator page |
| `components/navigation/nav-config.tsx` | Nav link added under Finance > Financial Hub |
| `components/quotes/quote-form.tsx` | "Pricing Help" link added above inline calculator |

## How It Works

The calculator uses cost-plus pricing:

1. **Ingredients**: Raw cost * 3.0 (industry standard 33% food cost ratio)
2. **Labor**: Total hours * hourly rate (adjusted for experience + market)
3. **Travel**: Miles * $0.67 (2026 IRS mileage rate)
4. **Overhead**: 15-20% of subtotal
5. **Profit margin**: 20-40% depending on experience level

### Rate Tables

**Base hourly rates by experience:**
- New: $35-50/hr
- Established: $50-85/hr
- Premium: $85-150/hr

**Market multipliers:**
- Rural: 0.75x
- Suburban: 1.0x (baseline)
- Urban: 1.3x
- Luxury: 1.6x

**Event type complexity:**
- Meal prep: 0.8x
- Intimate/Custom: 1.0x
- Dinner party: 1.1x
- Corporate: 1.2x
- Cooking class: 1.3x

### Output

- Price range (low/mid/high) based on rate bands
- Per-guest cost
- Visual cost breakdown (ingredients, labor, travel, overhead, profit)
- Effective hourly rate
- Contextual insights (food cost ratio warnings, travel advice, experience tips)

## Integration Points

- **Nav**: Listed under Finance > Financial Hub as "Pricing Calculator"
- **Quote form**: "Not sure what to charge? Open the full Pricing Calculator" link appears above the inline rate-sheet calculator
- **No persistence**: This is a utility. The chef's rate card and quotes handle saving data.

## Design Decisions

- Client-side only (no server round-trips needed for calculations)
- All amounts in cents internally, displayed as dollars
- Real-time calculation via `useMemo` (updates as inputs change)
- Three-tier output (low/mid/high) gives chefs a range, not a single number
- Course complexity bonus: each course beyond 3 adds 10% to labor cost
