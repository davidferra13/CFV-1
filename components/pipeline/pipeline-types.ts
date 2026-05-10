// Shared types for pipeline components

export type PipelineStageName = 'leads' | 'quoted' | 'proposals' | 'contracts' | 'events'

export type PipelineStageData = {
  stage: PipelineStageName
  label: string
  count: number
  valueCents: number
  items: PipelineItem[]
}

export type PipelineItem = {
  id: string
  type: 'inquiry' | 'proposal' | 'contract' | 'event'
  clientName: string | null
  occasion: string | null
  date: string | null
  valueCents: number
  status: string
  createdAt: string
  score?: number
  scoreLabel?: 'hot' | 'warm' | 'cold'
  channel?: string
  expiresAt?: string | null
}

export type PipelineConversion = {
  from: string
  to: string
  rate: number
}

export type PipelineAlert = {
  type: 'stale_lead' | 'expiring_contract' | 'hot_lead'
  message: string
  itemId: string
  href: string
}
