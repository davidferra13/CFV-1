import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { executeFinalPurge } from '@/lib/compliance/account-deletion-actions'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

function tombstoneClientEmail(clientId: string) {
  return `deleted-client-${clientId}@deleted.cheflowhq.com`
}

function getDbErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Unknown database error'
}

async function expectNoDbError(action: string, query: PromiseLike<{ error: unknown }>) {
  const { error } = await query
  if (error) {
    throw new Error(`${action} failed: ${getDbErrorMessage(error)}`)
  }
}

/**
 * Daily cron endpoint to purge accounts past their 30-day grace period.
 * Handles both chef and client deletions:
 * - Chefs: full purge pipeline (anonymize financials, clean storage, delete auth user)
 * - Clients: soft-delete + anonymize PII (preserve ledger entries for accounting)
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('account-purge', async () => {
      const dbAdmin = createAdminClient()

      // --- Chef account purges ---
      const { data: pendingChefDeletions, error } = await dbAdmin
        .from('chefs')
        .select('id, auth_user_id, email, business_name')
        .lte('deletion_scheduled_for', new Date().toISOString())
        .eq('is_deleted', false)
        .not('deletion_requested_at', 'is', null)

      if (error) {
        console.error('[account-purge] Chef DB query failed:', error.message)
        throw new Error('Failed to query pending chef deletions')
      }

      const chefResults: Array<{ chefId: string; success: boolean; error?: string }> = []

      for (const chef of pendingChefDeletions || []) {
        const purgeResult = await executeFinalPurge(chef.id)
        chefResults.push({ chefId: chef.id, ...purgeResult })
      }

      // --- Client account purges ---
      const { data: pendingClientDeletions, error: clientError } = await dbAdmin
        .from('clients')
        .select('id, auth_user_id, email, full_name, tenant_id')
        .lte('account_deletion_scheduled_for', new Date().toISOString())
        .is('deleted_at', null)
        .not('account_deletion_requested_at', 'is', null)

      if (clientError) {
        console.error('[account-purge] Client DB query failed:', clientError.message)
        throw new Error('Failed to query pending client deletions')
      }

      const clientResults: Array<{ clientId: string; success: boolean; error?: string }> = []

      for (const client of pendingClientDeletions || []) {
        try {
          const tenantId = client.tenant_id
          if (!tenantId) {
            throw new Error('Client is missing tenant context')
          }

          // Anonymize PII but preserve financial records (ledger entries stay intact).
          // Final deleted_at marking happens only after related PII purges finish.
          await expectNoDbError(
            'Client anonymization',
            dbAdmin
              .from('clients')
              .update({
                full_name: '[Deleted Client]',
                email: tombstoneClientEmail(client.id),
                phone: null,
                allergies: null,
                dietary_restrictions: null,
                notes: null,
                gate_code: null,
                wifi_password: null,
                security_notes: null,
                parking_instructions: null,
                access_instructions: null,
                house_rules: null,
                occupation: null,
                company_name: null,
                instagram_handle: null,
                partner_name: null,
                family_notes: null,
                portal_access_token: null,
                portal_access_token_hash: null,
                portal_token_revoked_at: new Date().toISOString(),
              })
              .eq('id', client.id)
              .eq('tenant_id', tenantId)
          )

          // Delete related PII tables
          await expectNoDbError(
            'Client notes purge',
            dbAdmin
              .from('client_notes')
              .delete()
              .eq('client_id', client.id)
              .eq('tenant_id', tenantId)
          )
          await expectNoDbError(
            'Client photos purge',
            dbAdmin
              .from('client_photos')
              .delete()
              .eq('client_id', client.id)
              .eq('tenant_id', tenantId)
          )
          await expectNoDbError(
            'Client taste profile purge',
            dbAdmin
              .from('client_taste_profiles')
              .delete()
              .eq('client_id', client.id)
              .eq('tenant_id', tenantId)
          )
          await expectNoDbError(
            'Client kitchen inventory purge',
            dbAdmin
              .from('client_kitchen_inventory')
              .delete()
              .eq('client_id', client.id)
              .eq('tenant_id', tenantId)
          )
          await expectNoDbError(
            'Client meal requests purge',
            dbAdmin
              .from('client_meal_requests')
              .delete()
              .eq('client_id', client.id)
              .eq('tenant_id', tenantId)
          )
          await expectNoDbError(
            'Client intake responses purge',
            dbAdmin
              .from('client_intake_responses')
              .delete()
              .eq('client_id', client.id)
              .eq('tenant_id', tenantId)
          )
          await expectNoDbError(
            'Client allergy records purge',
            dbAdmin
              .from('client_allergy_records')
              .delete()
              .eq('client_id', client.id)
              .eq('tenant_id', tenantId)
          )

          await expectNoDbError(
            'Client deletion marker',
            dbAdmin
              .from('clients')
              .update({
                deleted_at: new Date().toISOString(),
                deleted_by: 'system:gdpr-purge',
              })
              .eq('id', client.id)
              .eq('tenant_id', tenantId)
          )

          clientResults.push({ clientId: client.id, success: true })
          console.log(`[account-purge] Client ${client.id} purged successfully`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          console.error(`[account-purge] Client ${client.id} purge failed:`, msg)
          clientResults.push({ clientId: client.id, success: false, error: msg })
        }
      }

      return {
        chefs: {
          checked: pendingChefDeletions?.length || 0,
          purged: chefResults.filter((r) => r.success).length,
          failed: chefResults.filter((r) => !r.success).length,
          results: chefResults,
        },
        clients: {
          checked: pendingClientDeletions?.length || 0,
          purged: clientResults.filter((r) => r.success).length,
          failed: clientResults.filter((r) => !r.success).length,
          results: clientResults,
        },
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[account-purge] Unexpected error:', err)
    return NextResponse.json({ error: 'Account purge failed' }, { status: 500 })
  }
}
