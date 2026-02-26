import { recordQolMetricEvent } from '@/lib/qol/metrics'

type IdempotentExecutionArgs<T> = {
  supabase: any
  tenantId: string
  actorId?: string | null
  actionName: string
  idempotencyKey?: string | null
  execute: () => Promise<T>
}

export async function executeWithIdempotency<T>({
  supabase,
  tenantId,
  actorId = null,
  actionName,
  idempotencyKey,
  execute,
}: IdempotentExecutionArgs<T>): Promise<T> {
  if (!idempotencyKey) {
    return execute()
  }

  const { data: existing } = await supabase
    .from('mutation_idempotency')
    .select('response_data')
    .eq('tenant_id', tenantId)
    .eq('action_name', actionName)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existing?.response_data) {
    if (actionName.toLowerCase().includes('create')) {
      await recordQolMetricEvent(supabase, {
        tenantId,
        actorId,
        metricKey: 'duplicate_create_prevented',
        entityType: actionName,
        metadata: { idempotency_key: idempotencyKey },
      })
    }
    return existing.response_data as T
  }

  const response = await execute()

  await supabase.from('mutation_idempotency').upsert(
    {
      tenant_id: tenantId,
      actor_id: actorId,
      action_name: actionName,
      idempotency_key: idempotencyKey,
      response_data: response as any,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,action_name,idempotency_key' }
  )

  return response
}
