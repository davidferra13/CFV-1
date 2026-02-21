'use server'

// Health Permit Renewal Checklist Generator
// AI generates a step-by-step permit renewal checklist from stored permit type and jurisdiction.
// Routed to Gemini (regulatory knowledge, not PII).
// Output is INFORMATIONAL ONLY — chef verifies with local authority before acting.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface PermitChecklistItem {
  step: number
  task: string
  leadTimeDays: number  // how many days before expiry to start this step
  notes: string | null
  isRequired: boolean   // vs. recommended
}

export interface PermitChecklistResult {
  permitType: string
  jurisdiction: string
  expiryDate: string | null
  renewalStartDate: string | null  // suggested date to begin renewal (leadTime from expiry)
  totalLeadTimeDays: number
  checklist: PermitChecklistItem[]
  estimatedCostRange: string       // e.g. "$50–$150 depending on county"
  keyContacts: string              // who to contact (health dept, etc.)
  disclaimer: string
  generatedAt: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function generatePermitRenewalChecklist(
  permitId?: string
): Promise<PermitChecklistResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Try to fetch permit from health permits table
  let permitData: { permit_type?: string; jurisdiction?: string; expiry_date?: string; notes?: string } | null = null

  if (permitId) {
    const { data } = await (supabase as any)
      .from('health_permits')
      .select('permit_type, jurisdiction, expiry_date, notes')
      .eq('id', permitId)
      .eq('tenant_id', user.tenantId!)
      .single()
    permitData = data
  } else {
    // Get soonest-expiring permit
    const { data } = await (supabase as any)
      .from('health_permits')
      .select('permit_type, jurisdiction, expiry_date, notes')
      .eq('tenant_id', user.tenantId!)
      .order('expiry_date', { ascending: true })
      .limit(1)
      .single()
    permitData = data
  }

  const permitType = permitData?.permit_type ?? 'Food Handler / Food Service Establishment'
  const jurisdiction = permitData?.jurisdiction ?? 'US (general — verify with your local authority)'
  const expiryDate = permitData?.expiry_date ?? null

  // Calculate renewal start date (60 days before expiry is typical)
  let renewalStartDate: string | null = null
  if (expiryDate) {
    const expiry = new Date(expiryDate)
    expiry.setDate(expiry.getDate() - 60)
    renewalStartDate = expiry.toISOString().split('T')[0]
  }

  const prompt = `You are a regulatory compliance consultant for a private chef business.
Generate a step-by-step health permit renewal checklist for this chef.
Be practical and specific. Note lead times for each step.
Flag which steps MUST be done before others (dependencies).

Permit Details:
  Type: ${permitType}
  Jurisdiction: ${jurisdiction}
  Expiry date: ${expiryDate ?? 'Unknown — set reminder to check'}
  Any existing notes: ${permitData?.notes ?? 'None'}

Generate a realistic checklist with:
- All steps needed to renew (typically: gather docs → apply → inspection → payment → receive)
- Realistic lead times per step
- Estimated cost
- Who to contact
- Any pre-inspection prep (equipment calibration, cleaning logs, temp records)

Return JSON: {
  "totalLeadTimeDays": number,
  "checklist": [{
    "step": 1,
    "task": "...",
    "leadTimeDays": number,
    "notes": "...or null",
    "isRequired": bool
  }],
  "estimatedCostRange": "$XX–$XX",
  "keyContacts": "one paragraph on who to contact"
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
    return {
      permitType,
      jurisdiction,
      expiryDate,
      renewalStartDate,
      totalLeadTimeDays: parsed.totalLeadTimeDays ?? 60,
      checklist: parsed.checklist ?? [],
      estimatedCostRange: parsed.estimatedCostRange ?? 'Varies — check with local health authority',
      keyContacts: parsed.keyContacts ?? 'Contact your local county health department',
      disclaimer: 'This checklist is AI-generated and may not reflect current local requirements. Always verify permit requirements directly with your local health authority before beginning the renewal process.',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[permit-checklist] Failed:', err)
    throw new Error('Could not generate permit checklist. Please try again.')
  }
}
