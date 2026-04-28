export type UnifiedSearchFilters = {
  query?: string
  dateFrom?: string
  dateTo?: string
  amountMinCents?: number
  amountMaxCents?: number
  eventId?: string
  clientId?: string
  sourceType?: 'all' | 'receipt' | 'document' | 'expense'
  limit?: number
  offset?: number
}

export type UnifiedSearchResult = {
  id: string
  source: 'receipt' | 'document' | 'expense'
  title: string
  summary: string | null
  date: string | null
  amountCents: number | null
  eventId: string | null
  eventName: string | null
  clientId: string | null
  clientName: string | null
  status: string | null
  documentType: string | null
  folderName: string | null
}

export type UnifiedSearchResponse = {
  results: UnifiedSearchResult[]
  total: number
  hasMore: boolean
}
