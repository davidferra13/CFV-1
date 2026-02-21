import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const in90d = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    let alerts = 0

    // Check insurance policies expiring within 30 and 7 days
    const { data: expiringPolicies } = await supabaseAdmin
      .from('chef_insurance_policies')
      .select('id, tenant_id, policy_type, expiry_date')
      .gte('expiry_date', today)
      .lte('expiry_date', in30d)

    for (const policy of expiringPolicies ?? []) {
      const daysLeft = Math.ceil(
        (new Date(policy.expiry_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      )
      const action = daysLeft <= 7 ? 'insurance_expiring_7d' : 'insurance_expiring_30d'
      console.log(
        `[renewal] Insurance ${policy.policy_type} for ${policy.tenant_id} expires in ${daysLeft}d (${action})`
      )
      alerts++
    }

    // Check certifications expiring within 90, 30, and 7 days
    const { data: expiringCerts } = await supabaseAdmin
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
      console.log(
        `[renewal] Cert ${cert.cert_name} for ${cert.tenant_id} expires in ${daysLeft}d (${action})`
      )
      alerts++
    }

    return NextResponse.json({ message: `Processed ${alerts} renewal alerts` })
  } catch (err) {
    console.error('[renewal-reminders] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
