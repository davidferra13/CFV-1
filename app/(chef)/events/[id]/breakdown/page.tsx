// Post-Event Breakdown Checklist Page
// Full-screen mobile-friendly view for teardown/cleanup accountability.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getBreakdownChecklist } from '@/lib/events/breakdown-actions'
import { BreakdownChecklist } from '@/components/events/breakdown-checklist'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Breakdown Checklist - ChefFlow',
  other: {
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  },
}

interface Props {
  params: { id: string }
}

export default async function BreakdownPage({ params }: Props) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify event exists and belongs to this chef
  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  // Get checklist data
  const { items, categories } = await getBreakdownChecklist(params.id)

  // Check if already signed off
  const { data: signoff } = await supabase
    .from('dop_task_completions')
    .select('id')
    .eq('event_id', params.id)
    .eq('tenant_id', user.tenantId!)
    .eq('task_key', 'breakdown_signoff')
    .maybeSingle()

  return (
    <BreakdownChecklist
      eventId={params.id}
      initialItems={items}
      categories={categories}
      isSignedOff={!!signoff}
    />
  )
}
