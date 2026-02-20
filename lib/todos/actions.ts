'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

export type ChefTodo = {
  id: string
  text: string
  completed: boolean
  completed_at: string | null
  sort_order: number
  created_at: string
}

export async function getTodos(): Promise<ChefTodo[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_todos')
    .select('id, text, completed, completed_at, sort_order, created_at')
    .eq('chef_id', user.entityId)
    .order('completed', { ascending: true })   // incomplete first
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Todos] getTodos failed:', error)
    return []
  }

  return data ?? []
}

export async function createTodo(text: string): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()

  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 500) {
    return { success: false, error: 'Todo text must be 1–500 characters' }
  }

  const supabase = createServerClient()

  // Append at the end of incomplete items
  const { data: last } = await (supabase as any)
    .from('chef_todos')
    .select('sort_order')
    .eq('chef_id', user.entityId)
    .eq('completed', false)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (last?.sort_order ?? -1) + 1

  const { data: created, error } = await (supabase as any)
    .from('chef_todos')
    .insert({
      chef_id: user.entityId,
      text: trimmed,
      completed: false,
      sort_order: nextOrder,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('[Todos] createTodo failed:', error)
    return { success: false, error: 'Failed to create todo' }
  }

  revalidatePath('/dashboard')
  return { success: true, id: created.id }
}

export async function toggleTodo(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch current state scoped to this chef
  const { data: todo, error: fetchError } = await (supabase as any)
    .from('chef_todos')
    .select('id, completed')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !todo) {
    return { success: false, error: 'Todo not found' }
  }

  const nowCompleted = !todo.completed

  const { error } = await (supabase as any)
    .from('chef_todos')
    .update({
      completed: nowCompleted,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[Todos] toggleTodo failed:', error)
    return { success: false, error: 'Failed to update todo' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTodo(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('chef_todos')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[Todos] deleteTodo failed:', error)
    return { success: false, error: 'Failed to delete todo' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
