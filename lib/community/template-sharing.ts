'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type CommunityTemplateType = 'menu' | 'recipe' | 'message' | 'quote'

export interface CommunityTemplate {
  id: string
  template_type: CommunityTemplateType
  title: string
  description: string | null
  content: Record<string, unknown>
  tags: string[]
  cuisine_type: string | null
  occasion_type: string | null
  dietary_tags: string[]
  is_published: boolean
  download_count: number
  created_at: string
}

export async function getCommunityTemplates(
  type?: CommunityTemplateType
): Promise<CommunityTemplate[]> {
  const db: any = createServerClient()
  let query = db
    .from('community_templates' as any)
    .select(
      'id, template_type, title, description, tags, cuisine_type, occasion_type, dietary_tags, is_published, download_count, created_at'
    )
    .eq('is_published', true)
    .order('download_count', { ascending: false })
    .limit(50)

  if (type) query = query.eq('template_type', type)

  const { data } = await query
  return (data as unknown as CommunityTemplate[]) || []
}

export async function getMyTemplates(): Promise<CommunityTemplate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('community_templates' as any)
    .select('*')
    .eq('author_tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  return (data as unknown as CommunityTemplate[]) || []
}

export async function publishTemplate(input: {
  template_type: CommunityTemplateType
  title: string
  description?: string
  content: Record<string, unknown>
  tags?: string[]
  cuisine_type?: string
  occasion_type?: string
  dietary_tags?: string[]
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db.from('community_templates' as any).insert({
    author_tenant_id: user.entityId,
    ...input,
    is_published: true,
    tags: input.tags || [],
    dietary_tags: input.dietary_tags || [],
  })

  revalidatePath('/community/templates')
}

export async function incrementDownloadCount(templateId: string): Promise<void> {
  const db = createServerClient({ admin: true })
  try {
    await (db.rpc as any)('increment_template_downloads', { template_id: templateId })
  } catch {
    // Fallback: fetch current count and increment
    const { data } = await db
      .from('community_templates' as any)
      .select('download_count')
      .eq('id', templateId)
      .single()
    const current = (data as any)?.download_count || 0
    await db
      .from('community_templates' as any)
      .update({ download_count: current + 1 })
      .eq('id', templateId)
  }
}
