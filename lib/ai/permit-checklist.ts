'use server'

// Health Permit Renewal Checklist Generator
// AI generates a step-by-step permit renewal checklist from stored permit type and jurisdiction.
// Routed to local Ollama (Gemma 4). No cloud dependency.
// Output is INFORMATIONAL ONLY - chef verifies with local authority before acting.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'
import { parseWithOllama } from '@/lib/ai/parse-ollama'

const PermitChecklistItemSchema = z.object({
  step: z.number(),
  task: z.string(),
  leadTimeDays: z.number(),
  notes: z.string().nullable(),
  isRequired: z.boolean(),
})

const PermitChecklistResponseSchema = z.object({
  totalLeadTimeDays: z.number(),
  checklist: z.array(PermitChecklistItemSchema).min(1),
  estimatedCostRange: z.string(),
  keyContacts: z.string(),
})

export interface PermitChecklistItem {
  step: number
  task: string
  leadTimeDays: number // how many days before expiry to start this step
  notes: string | null
  isRequired: boolean // vs. recommended
}

export interface PermitChecklistResult {
  permitType: string
  jurisdiction: string
  expiryDate: string | null
  renewalStartDate: string | null // suggested date to begin renewal (leadTime from expiry)
  totalLeadTimeDays: number
  checklist: PermitChecklistItem[]
  estimatedCostRange: string // e.g. "$50-$150 depending on county"
  keyContacts: string // who to contact (health dept, etc.)
  disclaimer: string
  generatedAt: string
}

export async function generatePermitRenewalChecklist(
  permitId?: string
): Promise<PermitChecklistResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Try to fetch permit from health permits table
  let permitData: {
    permit_type?: string
    jurisdiction?: string
    expiry_date?: string
    notes?: string
  } | null = null

  if (permitId) {
    const { data } = await db
      .from('health_permits' as any)
      .select('permit_type, jurisdiction, expiry_date, notes')
      .eq('id', permitId)
      .eq('tenant_id', user.tenantId!)
      .single()
    permitData = data
  } else {
    // Get soonest-expiring permit
    const { data } = await db
      .from('health_permits' as any)
      .select('permit_type, jurisdiction, expiry_date, notes')
      .eq('tenant_id', user.tenantId!)
      .order('expiry_date', { ascending: true })
      .limit(1)
      .single()
    permitData = data
  }

  const permitType = permitData?.permit_type ?? 'Food Handler / Food Service Establishment'
  const jurisdiction = permitData?.jurisdiction ?? 'US (general - verify with your local authority)'
  const expiryDate = permitData?.expiry_date
    ? dateToDateString(permitData.expiry_date as Date | string)
    : null

  // Calculate renewal start date (60 days before expiry is typical)
  let renewalStartDate: string | null = null
  if (expiryDate) {
    const [_ey, _em, _ed] = expiryDate.split('-').map(Number)
    const expiry = new Date(_ey, _em - 1, _ed - 60)
    renewalStartDate = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}-${String(expiry.getDate()).padStart(2, '0')}`
  }

  const systemPrompt = `You are a regulatory compliance consultant for a private chef business.
Generate a step-by-step health permit renewal checklist for this chef.
Be practical and specific. Note lead times for each step.
Flag which steps MUST be done before others (dependencies).

Generate a realistic checklist with:
- All steps needed to renew (typically: gather docs, apply, inspection, payment, receive)
- Realistic lead times per step
- Estimated cost
- Who to contact
- Any pre-inspection prep (equipment calibration, cleaning logs, temp records)`

  const userContent = `Permit Details:
  Type: ${permitType}
  Jurisdiction: ${jurisdiction}
  Expiry date: ${expiryDate ?? 'Unknown - set reminder to check'}
  Any existing notes: ${permitData?.notes ?? 'None'}

Return JSON: {
  "totalLeadTimeDays": number,
  "checklist": [{
    "step": 1,
    "task": "...",
    "leadTimeDays": number,
    "notes": "...or null",
    "isRequired": bool
  }],
  "estimatedCostRange": "$XX-$XX",
  "keyContacts": "one paragraph on who to contact"
}`

  const validated = await parseWithOllama(
    systemPrompt,
    userContent,
    PermitChecklistResponseSchema,
    {
      temperature: 0.3,
      maxTokens: 1024,
    }
  )
  return {
    permitType,
    jurisdiction,
    expiryDate,
    renewalStartDate,
    totalLeadTimeDays: validated.totalLeadTimeDays,
    checklist: validated.checklist,
    estimatedCostRange: validated.estimatedCostRange,
    keyContacts: validated.keyContacts,
    disclaimer:
      'This checklist is AI-generated and may not reflect current local requirements. Always verify permit requirements directly with your local health authority before beginning the renewal process.',
    generatedAt: new Date().toISOString(),
  }
}
