import { createServerClient } from '@/lib/db/server'

const URGENT_KEYWORDS = /\b(emergency|allergic|today|tonight|cancel|asap)\b/i

/**
 * Compute priority score for inbound SMS.
 * 0 = urgent, 1 = known client, 2 = substantial, 3 = low
 */
function computePriority(content: string, resolvedClientId: string | null): number {
  if (URGENT_KEYWORDS.test(content)) return 0
  if (resolvedClientId) return 1
  if (content.length > 50) return 2
  return 3
}

export async function createSmsTriage(params: {
  tenantId: string
  threadId: string
  senderPhone: string
  content: string
  resolvedClientId: string | null
}): Promise<void> {
  try {
    const db: any = createServerClient({ admin: true })
    const priority = computePriority(params.content, params.resolvedClientId)

    // Build client context
    let clientContext: Record<string, unknown> = {
      message_preview: params.content.slice(0, 200),
      received_at: new Date().toISOString(),
    }

    if (params.resolvedClientId) {
      try {
        const { data: client } = await db
          .from('clients' as any)
          .select('full_name, email, phone')
          .eq('id', params.resolvedClientId)
          .eq('tenant_id', params.tenantId)
          .maybeSingle()

        if (client) {
          clientContext = {
            ...clientContext,
            full_name: client.full_name,
            email: client.email,
            phone: client.phone,
          }
        }
      } catch {
        // Client lookup failed; continue with partial context
      }
    }

    // Upsert triage metadata (update priority only if higher/lower number = more urgent)
    await db
      .from('sms_triage_metadata' as any)
      .upsert(
        {
          tenant_id: params.tenantId,
          thread_id: params.threadId,
          priority,
          triage_state: 'pending',
          client_context: clientContext,
        },
        {
          onConflict: 'thread_id',
          ignoreDuplicates: false,
        }
      )
      .then(async () => {
        // If row existed, only update if new priority is more urgent
        await db
          .from('sms_triage_metadata' as any)
          .update({
            priority,
            client_context: clientContext,
            updated_at: new Date().toISOString(),
          })
          .eq('thread_id', params.threadId)
          .gt('priority', priority)
      })
  } catch (err) {
    // Non-fatal: table may not exist yet or other DB issues
    console.error('[sms-triage-gate] failed (non-fatal):', err)
  }
}
