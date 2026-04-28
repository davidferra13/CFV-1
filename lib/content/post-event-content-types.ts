export type ContentPlatform = 'instagram' | 'story' | 'blog'

export type ContentDraft = {
  id: string
  event_id: string
  tenant_id: string
  platform: ContentPlatform
  draft_text: string
  status: 'draft' | 'approved' | 'posted'
  photo_ids: string[]
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export type ContentReadyEvent = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number
  photo_count: number
  client_name: string
  has_nda: boolean
  photo_permission: string | null
  draft_count: number
}
