'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildCallIntelligenceSnapshot,
  type CallIntelligenceAiCall,
  type CallIntelligenceHumanCall,
  type CallIntelligenceSnapshot,
  type CallIntelligenceSource,
  type CallIntelligenceSourceError,
  type CallIntelligenceSupplierCall,
} from '@/lib/calls/intelligence'

export async function getCallIntelligenceSnapshot(): Promise<{
  success: boolean
  snapshot: CallIntelligenceSnapshot
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const sourceErrors: CallIntelligenceSourceError[] = []

  const [humanCalls, aiCalls, supplierCalls] = await Promise.all([
    readSource<CallIntelligenceHumanCall[]>(
      'scheduled_calls',
      async () => {
        const { data, error } = await db
          .from('scheduled_calls')
          .select(
            [
              'id',
              'client_id',
              'contact_name',
              'contact_phone',
              'contact_company',
              'call_type',
              'scheduled_at',
              'duration_minutes',
              'status',
              'outcome_summary',
              'call_notes',
              'next_action',
              'next_action_due_at',
              'actual_duration_minutes',
              'completed_at',
              'created_at',
            ].join(', ')
          )
          .eq('tenant_id', user.tenantId!)
          .order('scheduled_at', { ascending: false })
          .limit(200)

        if (error) throw error
        return (data ?? []) as CallIntelligenceHumanCall[]
      },
      sourceErrors
    ),
    readSource<CallIntelligenceAiCall[]>(
      'ai_calls',
      async () => {
        const { data, error } = await db
          .from('ai_calls')
          .select(
            [
              'id',
              'direction',
              'role',
              'contact_phone',
              'contact_name',
              'subject',
              'status',
              'result',
              'full_transcript',
              'extracted_data',
              'action_log',
              'recording_url',
              'duration_seconds',
              'created_at',
            ].join(', ')
          )
          .eq('chef_id', user.entityId)
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) throw error
        return (data ?? []) as CallIntelligenceAiCall[]
      },
      sourceErrors
    ),
    readSource<CallIntelligenceSupplierCall[]>(
      'supplier_calls',
      async () => {
        const { data, error } = await db
          .from('supplier_calls')
          .select(
            [
              'id',
              'vendor_name',
              'vendor_phone',
              'ingredient_name',
              'status',
              'result',
              'duration_seconds',
              'recording_url',
              'speech_transcript',
              'created_at',
            ].join(', ')
          )
          .eq('chef_id', user.entityId)
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) throw error
        return (data ?? []) as CallIntelligenceSupplierCall[]
      },
      sourceErrors
    ),
  ])

  return {
    success: sourceErrors.length === 0,
    snapshot: buildCallIntelligenceSnapshot({
      humanCalls,
      aiCalls,
      supplierCalls,
      sourceErrors,
    }),
  }
}

async function readSource<T>(
  source: CallIntelligenceSource,
  reader: () => Promise<T>,
  sourceErrors: CallIntelligenceSourceError[]
): Promise<T | null> {
  try {
    return await reader()
  } catch (error) {
    console.error(`[getCallIntelligenceSnapshot] ${source} failed:`, error)
    sourceErrors.push({
      source,
      error: error instanceof Error ? error.message : 'Unknown read failure',
    })
    return null
  }
}
