'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const SegmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  filters: z.array(
    z.object({ field: z.string(), op: z.string(), value: z.union([z.string(), z.number()]) })
  ),
  color: z.string().optional(),
})

export async function getSegments() {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const { data } = await supabase
    .from('client_segments' as any)
    .select('*')
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function createSegment(input: z.infer<typeof SegmentSchema>) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validated = SegmentSchema.parse(input)
  const { data, error } = await supabase
    .from('client_segments' as any)
    .insert({ ...validated, tenant_id: user.entityId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/clients/segments')
  return data
}

export async function deleteSegment(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  await supabase
    .from('client_segments' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.entityId)
  revalidatePath('/clients/segments')
}
