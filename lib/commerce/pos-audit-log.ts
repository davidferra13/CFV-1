import { createServerClient } from '@/lib/supabase/server'

type PosAuditInput = {
  tenantId: string
  action: string
  tableName: string
  recordId: string
  changedBy?: string | null
  summary?: string | null
  beforeValues?: Record<string, unknown> | null
  afterValues?: Record<string, unknown> | null
}

export async function appendPosAuditLog(input: PosAuditInput) {
  const supabase: any = createServerClient()
  const { error } = await (supabase.from('audit_log').insert({
    tenant_id: input.tenantId,
    table_name: input.tableName,
    record_id: input.recordId,
    action: input.action,
    changed_by: input.changedBy ?? null,
    change_summary: input.summary ?? null,
    before_values: input.beforeValues ?? null,
    after_values: input.afterValues ?? null,
  } as any) as any)

  if (error) {
    console.error('[pos-audit] failed to append audit row:', error.message)
  }
}
