import type {
  AdapterCommandResult,
  OrderOpsAdapterDefinition,
  OrderOpsHttpRequest,
  OrderOpsTransport,
} from './types'

export type ToastAdapterContext = {
  baseUrl: string
  accessToken: string
  restaurantExternalId: string
}

export type ToastOrder = Record<string, unknown>
export type ToastDeliveryInfo = {
  deliveredDate?: string
  dispatchedDate?: string
  deliveryState?: 'PENDING' | 'IN_PROGRESS' | 'PICKED_UP' | 'DELIVERED'
  deliveryEmployee?: string
  notes?: string
}

export const TOAST_ORDER_ADAPTER: OrderOpsAdapterDefinition = {
  provider: 'toast',
  label: 'Toast',
  category: 'pos',
  maturity: 'IMPLEMENTED_UNVERIFIED',
  requiresPartnerApproval: true,
  capabilities: ['INGEST', 'GET_ORDER', 'PRICE_ORDER', 'CREATE_ORDER', 'VOID_ORDER', 'UPDATE_DELIVERY'],
  documentation: 'https://doc.toasttab.com/openapi/orders/overview/',
  notes: [
    'Create-order flow must price the order before posting it.',
    'Write access depends on Toast API client scopes and restaurant authorization.',
  ],
}

export class ToastAdapterError extends Error {
  constructor(
    message: string,
    readonly operation: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'ToastAdapterError'
  }
}

function baseUrl(context: ToastAdapterContext) {
  return context.baseUrl.replace(/\/$/, '')
}

function headers(context: ToastAdapterContext): Record<string, string> {
  return {
    Authorization: `Bearer ${context.accessToken}`,
    'Toast-Restaurant-External-ID': context.restaurantExternalId,
    'Content-Type': 'application/json',
  }
}
async function request<T>(
  context: ToastAdapterContext,
  transport: OrderOpsTransport,
  operation: string,
  path: string,
  method: OrderOpsHttpRequest['method'],
  body?: unknown
): Promise<T> {
  const response = await transport<T>({
    url: `${baseUrl(context)}${path}`,
    method,
    headers: headers(context),
    ...(body === undefined ? {} : { body }),
  })

  if (!response.ok) {
    throw new ToastAdapterError(`Toast ${operation} failed with HTTP ${response.status}`, operation, response.status)
  }
  return response.data
}

export async function getToastOrder(
  context: ToastAdapterContext,
  orderGuid: string,
  transport: OrderOpsTransport
): Promise<AdapterCommandResult<ToastOrder>> {
  const data = await request<ToastOrder>(context, transport, 'get order', `/orders/${encodeURIComponent(orderGuid)}`, 'GET')
  return { provider: 'toast', command: 'GET_ORDER', data, requestCount: 1 }
}

export async function priceToastOrder(
  context: ToastAdapterContext,
  order: ToastOrder,
  transport: OrderOpsTransport
): Promise<AdapterCommandResult<ToastOrder>> {
  const data = await request<ToastOrder>(context, transport, 'price order', '/prices', 'POST', order)
  return { provider: 'toast', command: 'PRICE_ORDER', data, requestCount: 1 }
}

export async function createToastOrder(
  context: ToastAdapterContext,
  order: ToastOrder,
  transport: OrderOpsTransport
): Promise<AdapterCommandResult<ToastOrder>> {
  const priced = await priceToastOrder(context, order, transport)
  const data = await request<ToastOrder>(context, transport, 'create order', '/orders', 'POST', priced.data)
  return { provider: 'toast', command: 'CREATE_ORDER', data, requestCount: 2 }
}

export async function voidToastOrder(
  context: ToastAdapterContext,
  orderGuid: string,
  transport: OrderOpsTransport,
  options: { voidSelections?: boolean; voidPayments?: boolean } = {}
): Promise<AdapterCommandResult<ToastOrder>> {
  const data = await request<ToastOrder>(context, transport, 'void order', `/orders/${encodeURIComponent(orderGuid)}/void`, 'POST', {
    selections: { voidAll: options.voidSelections ?? true },
    payments: { voidAll: options.voidPayments ?? true },
  })
  return { provider: 'toast', command: 'VOID_ORDER', data, requestCount: 1 }
}

export async function updateToastDelivery(
  context: ToastAdapterContext,
  orderGuid: string,
  deliveryInfo: ToastDeliveryInfo,
  transport: OrderOpsTransport
): Promise<AdapterCommandResult<ToastOrder>> {
  const data = await request<ToastOrder>(
    context,
    transport,
    'update delivery',
    `/orders/${encodeURIComponent(orderGuid)}/deliveryInfo`,
    'PATCH',
    deliveryInfo
  )
  return { provider: 'toast', command: 'UPDATE_DELIVERY', data, requestCount: 1 }
}
