// Scheduled Follow-ups Cron Endpoint
// POST /api/scheduled/follow-ups — notifies chefs about overdue inquiry follow-ups.
// Secured with CRON_SECRET bearer token (same pattern as Gmail sync).

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true })

  // Find inquiries with overdue follow-ups
  const { data: overdueInquiries, error } = await supabase
    .from('inquiries')
    .select(`
      id, tenant_id, status, follow_up_due_at, confirmed_occasion,
      client:clients(id, full_name)
    `)
    .eq('status', 'awaiting_client')
    .not('follow_up_due_at', 'is', null)
    .lte('follow_up_due_at', new Date().toISOString())

  if (error) {
    console.error('[Follow-ups Cron] Query failed:', error)
    return NextResponse.json(
      { error: 'Failed to query overdue follow-ups' },
      { status: 500 },
    )
  }

  if (!overdueInquiries || overdueInquiries.length === 0) {
    return NextResponse.json({ message: 'No overdue follow-ups', processed: 0 })
  }

  const { createNotification, getChefAuthUserId } = await import(
    '@/lib/notifications/actions'
  )

  let notified = 0
  let errors = 0

  for (const inquiry of overdueInquiries) {
    try {
      const chefUserId = await getChefAuthUserId(inquiry.tenant_id)
      if (!chefUserId) continue

      const clientName =
        (inquiry.client as { full_name: string } | null)?.full_name ?? 'Unknown contact'
      const occasion = inquiry.confirmed_occasion || 'inquiry'

      await createNotification({
        tenantId: inquiry.tenant_id,
        recipientId: chefUserId,
        category: 'inquiry',
        action: 'follow_up_due',
        title: 'Follow-up due',
        body: `Time to follow up with ${clientName} about their ${occasion}`,
        actionUrl: `/inquiries/${inquiry.id}`,
        inquiryId: inquiry.id,
        clientId: (inquiry.client as { id: string } | null)?.id || undefined,
      })

      // Set next follow-up 48h from now (repeating until resolved)
      await supabase
        .from('inquiries')
        .update({
          follow_up_due_at: new Date(
            Date.now() + 48 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .eq('id', inquiry.id)
        .eq('tenant_id', inquiry.tenant_id)

      notified++
    } catch (err) {
      const error = err as Error
      console.error(
        `[Follow-ups Cron] Failed for inquiry ${inquiry.id}:`,
        error.message,
      )
      errors++
    }
  }

  return NextResponse.json({
    processed: overdueInquiries.length,
    notified,
    errors,
  })
}
