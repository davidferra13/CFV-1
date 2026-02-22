// @ts-nocheck
'use server'

// Equipment Depreciation Plain-Language Explainer
// AI explains each piece of equipment's depreciation schedule in chef-friendly language.
// Routed to Gemini (tax education, not PII).
// Output is INFORMATIONAL ONLY — always recommends consulting a CPA.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface EquipmentExplanation {
  itemName: string
  purchasePriceDollars: number
  purchaseDate: string
  depreciationMethod: string // e.g. "Straight-line over 5 years"
  annualDeductionDollars: number
  yearInSchedule: number // e.g. "Year 2 of 5"
  remainingValueDollars: number
  fullyDepreciatedDate: string
  plainEnglishExplanation: string // what this means in simple terms
  bonusDepreciationNote: string | null // if Section 179 or bonus depreciation applies
}

export interface EquipmentDepreciationReport {
  items: EquipmentExplanation[]
  totalAnnualDeductionDollars: number
  currentYearSummary: string
  disclaimer: string
  generatedAt: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function explainEquipmentDepreciation(): Promise<EquipmentDepreciationReport> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: equipment } = await supabase
    .from('equipment_items')
    .select(
      'name, purchase_price_cents, purchase_date, depreciation_years, depreciation_method, category'
    )
    .eq('tenant_id', user.tenantId!)
    .gt('purchase_price_cents', 0)
    .order('purchase_date', { ascending: false })
    .limit(30)

  if (!equipment || equipment.length === 0) {
    return {
      items: [],
      totalAnnualDeductionDollars: 0,
      currentYearSummary:
        'No equipment items with depreciation tracked yet. Add equipment items in the Equipment section.',
      disclaimer:
        'This is educational information only. Consult a CPA for precise tax treatment of your equipment.',
      generatedAt: new Date().toISOString(),
    }
  }

  const currentYear = new Date().getFullYear()
  const equipmentList = equipment.map((e: any) => ({
    name: e.name,
    priceDollars: (e.purchase_price_cents ?? 0) / 100,
    purchaseDate: e.purchase_date ?? 'Unknown',
    depreciationYears: e.depreciation_years ?? 5,
    method: e.depreciation_method ?? 'straight_line',
  }))

  const prompt = `You are a CPA explaining equipment depreciation to a private chef in plain English.
Explain each item's depreciation schedule without jargon.
Current year: ${currentYear}

Equipment items:
${equipmentList.map((e) => `- ${e.name}: $${e.priceDollars.toFixed(2)}, purchased ${e.purchaseDate}, depreciation: ${e.depreciationYears}-year ${e.method}`).join('\n')}

For each item, calculate and explain:
1. Annual deduction (straight-line = cost / years; other methods as appropriate)
2. What year in the schedule they're in
3. Remaining depreciable value
4. When it's fully depreciated
5. Plain-English explanation the chef can understand
6. Note if Section 179 immediate expensing or bonus depreciation might apply

Return JSON: {
  "items": [{
    "itemName": "...",
    "purchasePriceDollars": number,
    "purchaseDate": "...",
    "depreciationMethod": "...",
    "annualDeductionDollars": number,
    "yearInSchedule": number,
    "remainingValueDollars": number,
    "fullyDepreciatedDate": "YYYY",
    "plainEnglishExplanation": "e.g. 'Your KitchenAid is in year 3 of a 5-year schedule...'",
    "bonusDepreciationNote": "...or null"
  }],
  "totalAnnualDeductionDollars": number,
  "currentYearSummary": "2-3 sentence summary for ${currentYear}"
}

Return ONLY valid JSON.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.2, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(text)
    return {
      ...parsed,
      disclaimer:
        'This is educational information only and does not constitute tax advice. Consult a licensed CPA for precise depreciation treatment for your specific situation.',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[equipment-depreciation-explainer] Failed:', err)
    throw new Error('Could not generate depreciation explanation. Please try again.')
  }
}
