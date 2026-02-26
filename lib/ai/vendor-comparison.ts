'use server'

// Vendor Price Comparison Narrative
// AI analyzes multiple vendor entries for the same ingredient/supply category
// and generates a plain-English best-value recommendation.
// Routed to Gemini (purchasing analysis, not PII).
// Output is SUGGESTION ONLY — chef decides which vendor to use.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface VendorEntry {
  vendorName: string
  itemDescription: string
  priceCents: number
  unit: string
  quality: 'premium' | 'standard' | 'budget' | 'unknown'
  notes: string | null
  lastPurchased: string | null
}

export interface VendorComparisonResult {
  category: string
  bestValueVendor: string
  bestValueRationale: string
  vendorRankings: {
    rank: number
    vendorName: string
    pricePer100g: number | null
    valueScore: number // 0-100 (price + quality adjusted)
    pros: string[]
    cons: string[]
  }[]
  recommendation: string // one actionable sentence
  priceDifferenceNote: string // e.g. "Top vendor costs 23% more but quality premium may justify it"
  generatedAt: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function compareVendors(
  vendors: VendorEntry[],
  category: string
): Promise<VendorComparisonResult> {
  await requireChef()

  if (vendors.length < 2) {
    throw new Error('Need at least 2 vendor entries to compare')
  }

  const prompt = `You are a procurement advisor for a private chef business.
Compare these vendor options for "${category}" and recommend the best value.
Consider: price per unit, quality tier, reliability (last purchase date), and overall value.
Be specific about the price differential and when a premium product is worth it.

Vendors:
${vendors
  .map(
    (v, i) => `${i + 1}. ${v.vendorName}
   Item: ${v.itemDescription}
   Price: $${(v.priceCents / 100).toFixed(2)} per ${v.unit}
   Quality tier: ${v.quality}
   Last purchased: ${v.lastPurchased ?? 'Unknown'}
   Notes: ${v.notes ?? 'None'}`
  )
  .join('\n\n')}

Return JSON: {
  "bestValueVendor": "vendor name",
  "bestValueRationale": "one sentence why",
  "vendorRankings": [{
    "rank": 1,
    "vendorName": "...",
    "pricePer100g": number|null,
    "valueScore": 0-100,
    "pros": ["..."],
    "cons": ["..."]
  }],
  "recommendation": "one actionable sentence for the chef",
  "priceDifferenceNote": "..."
}

Return ONLY valid JSON.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.3, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(text)
    return { category, ...parsed, generatedAt: new Date().toISOString() }
  } catch (err) {
    console.error('[vendor-comparison] Failed:', err)
    throw new Error('Could not compare vendors. Please try again.')
  }
}
