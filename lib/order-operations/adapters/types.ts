export type OrderOpsProvider =
  | 'toast'
  | 'square'
  | 'clover'
  | 'lightspeed'
  | 'opentable'
  | 'sevenrooms'
  | 'deliverect'
  | 'doordash'
  | 'uber_eats'

export type OrderOpsAdapterCategory = 'pos' | 'reservation' | 'delivery'
export type OrderOpsAdapterMaturity =
  | 'IMPLEMENTED_UNVERIFIED'
  | 'CONTRACT_ONLY'
  | 'PARTNERSHIP_REQUIRED'

export type OrderOpsAdapterCapability =
  | 'INGEST'
  | 'GET_ORDER'
  | 'PRICE_ORDER'
  | 'CREATE_ORDER'
  | 'VOID_ORDER'
  | 'UPDATE_DELIVERY'
  | 'SEARCH_AVAILABILITY'
  | 'CREATE_RESERVATION'
  | 'UPDATE_RESERVATION'
  | 'MENU_SYNC'
export type OrderOpsAdapterDefinition = {
  provider: OrderOpsProvider
  label: string
  category: OrderOpsAdapterCategory
  maturity: OrderOpsAdapterMaturity
  requiresPartnerApproval: boolean
  capabilities: OrderOpsAdapterCapability[]
  documentation: string
  notes: string[]
}

export type OrderOpsHttpRequest = {
  url: string
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  body?: unknown
}

export type OrderOpsHttpResponse<T = unknown> = {
  status: number
  ok: boolean
  data: T
}

export type OrderOpsTransport = <T = unknown>(
  request: OrderOpsHttpRequest
) => Promise<OrderOpsHttpResponse<T>>

export type AdapterCommandResult<T = unknown> = {
  provider: OrderOpsProvider
  command: OrderOpsAdapterCapability
  data: T
  requestCount: number
}
