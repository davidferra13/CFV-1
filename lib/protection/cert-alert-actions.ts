'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getExpiringCertifications } from './certification-actions'

// ─── Types ───────────────────────────────────────────────────────

export type CertExpiryAlert = {
  id: string
  certName: string
  certType: string
  expiryDate: string
  daysRemaining: number
  renewalUrl: string | null
  severity: 'critical' | 'warning' | 'info'
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Returns all certifications expiring within 90 days, with severity levels.
 * No notifications fired here (deterministic, read-only).
 */
export async function getCertExpiryAlerts(): Promise<CertExpiryAlert[]> {
  // getExpiringCertifications already calls requireChef internally
  const expiring = await getExpiringCertifications(90)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return expiring.map((cert: any) => {
    const expiryDate = new Date(cert.expiry_date)
    expiryDate.setHours(0, 0, 0, 0)
    const daysRemaining = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    let severity: CertExpiryAlert['severity'] = 'info'
    if (daysRemaining <= 30) severity = 'critical'
    else if (daysRemaining <= 60) severity = 'warning'

    return {
      id: cert.id,
      certName: cert.cert_name,
      certType: cert.cert_type,
      expiryDate: cert.expiry_date,
      daysRemaining,
      renewalUrl: cert.renewal_url || null,
      severity,
    }
  })
}

/**
 * Check certifications and fire notifications for each threshold.
 * Uses sendNotification as a non-blocking side effect.
 */
export async function checkCertificationExpiry() {
  const user = await requireChef()
  const alerts = await getCertExpiryAlerts()

  // Only try to send notifications if there are alerts
  if (alerts.length === 0) return { checked: true, alertCount: 0 }

  // Non-blocking notification dispatch
  try {
    const { sendNotification } = await import('@/lib/notifications/send')
    for (const alert of alerts) {
      try {
        await sendNotification({
          tenantId: user.tenantId!,
          recipientId: user.id,
          type: 'system_alert',
          title: `Certification expiring: ${alert.certName}`,
          message: `Your ${alert.certName} expires in ${alert.daysRemaining} days (${alert.expiryDate}).${alert.renewalUrl ? ' Renew now.' : ''}`,
          link: '/settings/protection/certifications',
        })
      } catch (err) {
        console.error('[non-blocking] Cert expiry notification failed:', err)
      }
    }
  } catch (err) {
    console.error('[non-blocking] Failed to load notification module:', err)
  }

  return { checked: true, alertCount: alerts.length }
}
