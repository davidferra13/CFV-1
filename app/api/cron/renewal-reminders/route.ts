import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import type { NotificationAction } from '@/lib/notifications/types'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'

const dbAdmin = createAdminClient()

const RENEWAL_SYSTEM_KEY = 'renewal_reminder'

type RenewalNotificationInput = {
  tenantId: string
  action: NotificationAction
  renewalId: string
  expiryDate: string
}

async function hasRenewalNotification({
  tenantId,
  action,
  renewalId,
  expiryDate,
}: RenewalNotificationInput): Promise<boolean> {
  const { data, error } = await dbAdmin
    .from('notifications')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('action', action)
    .contains('metadata', {
      system_key: RENEWAL_SYSTEM_KEY,
      renewal_id: renewalId,
      expiry_date: expiryDate,
    })
    .limit(1)

  if (error) {
    console.error('[renewal-reminders] Dedupe lookup failed:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startedAt = Date.now()

  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const now = new Date()
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const in90d = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    let notified = 0
    let skipped = 0
    const recipientCache = new Map<string, string | null>()

    const getRecipient = async (tenantId: string) => {
      if (recipientCache.has(tenantId)) return recipientCache.get(tenantId) ?? null
      const recipientId = await getChefAuthUserId(tenantId)
      recipientCache.set(tenantId, recipientId)
      return recipientId
    }

    // Check insurance policies expiring within 30 and 7 days
    const { data: expiringPolicies } = await dbAdmin
      .from('chef_insurance_policies')
      .select('id, tenant_id, policy_type, expiry_date')
      .gte('expiry_date', today)
      .lte('expiry_date', in30d)

    for (const policy of expiringPolicies ?? []) {
      const daysLeft = Math.ceil(
        (new Date(policy.expiry_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      )
      const action = daysLeft <= 7 ? 'insurance_expiring_7d' : 'insurance_expiring_30d'
      const recipientId = await getRecipient(policy.tenant_id)
      if (!recipientId) {
        skipped++
        continue
      }
      const alreadyNotified = await hasRenewalNotification({
        tenantId: policy.tenant_id,
        action,
        renewalId: policy.id,
        expiryDate: policy.expiry_date,
      })
      if (alreadyNotified) {
        skipped++
        continue
      }

      await createNotification({
        tenantId: policy.tenant_id,
        recipientId,
        category: 'protection',
        action,
        title:
          daysLeft <= 7 ? `Insurance expires in ${daysLeft} days` : 'Insurance renewal coming up',
        body: `${policy.policy_type} policy expires on ${policy.expiry_date}.`,
        actionUrl: '/settings/protection/insurance',
        metadata: {
          system_key: RENEWAL_SYSTEM_KEY,
          renewal_type: 'insurance',
          renewal_id: policy.id,
          policy_type: policy.policy_type,
          expiry_date: policy.expiry_date,
          days_left: daysLeft,
        },
      })

      console.log(
        `[renewal] Insurance ${policy.policy_type} for ${policy.tenant_id} expires in ${daysLeft}d (${action})`
      )
      notified++
    }

    // Check certifications expiring within 90, 30, and 7 days
    const { data: expiringCerts } = await dbAdmin
      .from('chef_certifications')
      .select('id, tenant_id, cert_type, cert_name, expiry_date')
      .eq('is_active', true)
      .gte('expiry_date', today)
      .lte('expiry_date', in90d)

    for (const cert of expiringCerts ?? []) {
      const daysLeft = Math.ceil(
        (new Date(cert.expiry_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      )
      const action =
        daysLeft <= 7
          ? 'cert_expiring_7d'
          : daysLeft <= 30
            ? 'cert_expiring_30d'
            : 'cert_expiring_90d'
      const recipientId = await getRecipient(cert.tenant_id)
      if (!recipientId) {
        skipped++
        continue
      }
      const alreadyNotified = await hasRenewalNotification({
        tenantId: cert.tenant_id,
        action,
        renewalId: cert.id,
        expiryDate: cert.expiry_date,
      })
      if (alreadyNotified) {
        skipped++
        continue
      }

      await createNotification({
        tenantId: cert.tenant_id,
        recipientId,
        category: 'protection',
        action,
        title:
          daysLeft <= 7
            ? `Certification expires in ${daysLeft} days`
            : 'Certification renewal coming up',
        body: `${cert.cert_name} expires on ${cert.expiry_date}.`,
        actionUrl: '/settings/protection/certifications',
        metadata: {
          system_key: RENEWAL_SYSTEM_KEY,
          renewal_type: 'certification',
          renewal_id: cert.id,
          cert_type: cert.cert_type,
          cert_name: cert.cert_name,
          expiry_date: cert.expiry_date,
          days_left: daysLeft,
        },
      })

      console.log(
        `[renewal] Cert ${cert.cert_name} for ${cert.tenant_id} expires in ${daysLeft}d (${action})`
      )
      notified++
    }

    const result = { message: `Processed ${notified} renewal alerts`, notified, skipped }
    await recordCronHeartbeat('renewal-reminders', result, Date.now() - startedAt)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await recordCronError('renewal-reminders', message, Date.now() - startedAt)
    console.error('[renewal-reminders] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
