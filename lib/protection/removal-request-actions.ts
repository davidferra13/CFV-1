'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export async function createRemovalRequest(input: { client_id?: string; reason?: string }) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const defaultTasks = [
    {
      id: 'REMOVE_WEBSITE',
      label: 'Remove photos from public website/portfolio',
      completed: false,
      completed_at: null,
    },
    {
      id: 'REMOVE_SOCIAL',
      label: 'Remove or archive social media posts featuring client',
      completed: false,
      completed_at: null,
    },
    {
      id: 'REMOVE_TESTIMONIAL',
      label: 'Remove client testimonial if applicable',
      completed: false,
      completed_at: null,
    },
    {
      id: 'NOTIFY_CLIENT',
      label: 'Notify client of completion in writing',
      completed: false,
      completed_at: null,
    },
    {
      id: 'DOCUMENT_COMPLETION',
      label: 'Document completion date and method',
      completed: false,
      completed_at: null,
    },
  ]
  const { error } = await db.from('chef_portfolio_removal_requests').insert({
    tenant_id: chef.tenantId!,
    client_id: input.client_id ?? null,
    reason: input.reason ?? null,
    tasks: defaultTasks,
    status: 'open',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/settings/protection/portfolio-removal')
}

export async function toggleRemovalTask(requestId: string, taskId: string) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_portfolio_removal_requests')
    .select('tasks')
    .eq('id', requestId)
    .eq('tenant_id', chef.tenantId!)
    .single()
  if (!data) throw new Error('Not found')
  const tasks = (data.tasks as any[]).map((t) =>
    t.id === taskId
      ? {
          ...t,
          completed: !t.completed,
          completed_at: !t.completed ? new Date().toISOString() : null,
        }
      : t
  )
  await db.from('chef_portfolio_removal_requests').update({ tasks }).eq('id', requestId)
  revalidatePath('/settings/protection/portfolio-removal')
}

export async function completeRemovalRequest(requestId: string) {
  const chef = await requireChef()
  const db: any = createServerClient()
  await db
    .from('chef_portfolio_removal_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('tenant_id', chef.tenantId!)
  revalidatePath('/settings/protection/portfolio-removal')
}

export async function getRemovalRequests() {
  const chef = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_portfolio_removal_requests')
    .select('*, clients(full_name)')
    .eq('tenant_id', chef.tenantId!)
    .order('request_date', { ascending: false })
  return data ?? []
}
