import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TOAST_ORDER_ADAPTER,
  ToastAdapterError,
  createToastOrder,
  getToastOrder,
  updateToastDelivery,
} from '@/lib/order-operations/adapters/toast'
import { getOrderOpsAdapterDefinition } from '@/lib/order-operations/adapters/catalog'
import type { OrderOpsHttpRequest, OrderOpsTransport } from '@/lib/order-operations/adapters/types'

const context = {
  baseUrl: 'https://toast.example/orders/v2',
  accessToken: 'secret-token',
  restaurantExternalId: 'restaurant-123',
}

function queueTransport(
  responses: Array<{ status: number; data: unknown }>,
  requests: OrderOpsHttpRequest[]
): OrderOpsTransport {
  return async <T>(request: OrderOpsHttpRequest) => {
    requests.push(request)
    const next = responses.shift()
    if (!next) throw new Error('Unexpected request')
    return { status: next.status, ok: next.status >= 200 && next.status < 300, data: next.data as T }
  }
}

test('Toast read and delivery commands use the documented order paths', async () => {
  const requests: OrderOpsHttpRequest[] = []
  const transport = queueTransport([
    { status: 200, data: { guid: 'abc' } },
    { status: 200, data: { guid: 'abc', deliveryInfo: { deliveryState: 'IN_PROGRESS' } } },
  ], requests)

  await getToastOrder(context, 'abc', transport)
  await updateToastDelivery(context, 'abc', { deliveryState: 'IN_PROGRESS' }, transport)

  assert.equal(requests[0]?.url, 'https://toast.example/orders/v2/orders/abc')
  assert.equal(requests[0]?.method, 'GET')
  assert.equal(requests[1]?.url, 'https://toast.example/orders/v2/orders/abc/deliveryInfo')
  assert.equal(requests[1]?.method, 'PATCH')
})

test('Toast adapter errors never include credentials', async () => {
  const requests: OrderOpsHttpRequest[] = []
  const transport = queueTransport([{ status: 403, data: { message: 'forbidden' } }], requests)

  await assert.rejects(
    () => getToastOrder(context, 'abc', transport),
    (error: unknown) => error instanceof ToastAdapterError && error.status === 403 && !error.message.includes(context.accessToken)
  )
})

test('Toast adapter prices an order before it creates the persistent order', async () => {
  const requests: OrderOpsHttpRequest[] = []
  const transport = queueTransport([
    { status: 200, data: { checks: [{ totalAmount: 42 }] } },
    { status: 200, data: { guid: 'toast-order-1', checks: [{ totalAmount: 42 }] } },
  ], requests)

  const result = await createToastOrder(context, { checks: [{ selections: [{ itemGuid: 'item-1' }] }] }, transport)

  assert.equal(result.command, 'CREATE_ORDER')
  assert.equal(result.requestCount, 2)
  assert.equal(requests[0]?.method, 'POST')
  assert.equal(requests[0]?.url, 'https://toast.example/orders/v2/prices')
  assert.equal(requests[1]?.url, 'https://toast.example/orders/v2/orders')
  assert.deepEqual(requests[1]?.body, { checks: [{ totalAmount: 42 }] })
  assert.equal(requests[0]?.headers['Toast-Restaurant-External-ID'], 'restaurant-123')
  assert.equal(requests[0]?.headers.Authorization, 'Bearer secret-token')
})

test('adapter catalog distinguishes implemented code from partnership-gated integrations', () => {
  assert.equal(TOAST_ORDER_ADAPTER.maturity, 'IMPLEMENTED_UNVERIFIED')
  assert.equal(getOrderOpsAdapterDefinition('opentable')?.maturity, 'PARTNERSHIP_REQUIRED')
  assert.equal(getOrderOpsAdapterDefinition('doordash')?.maturity, 'PARTNERSHIP_REQUIRED')
  assert.equal(getOrderOpsAdapterDefinition('deliverect')?.maturity, 'CONTRACT_ONLY')
})
