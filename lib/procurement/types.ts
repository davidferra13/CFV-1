import type { PurchaseOrder } from '@/lib/inventory/purchase-order-types'

export type SupplierDirectoryEntry = {
  id: string
  name: string
  vendorType: string
  phone: string | null
  email: string | null
  address: string | null
  isPreferred: boolean
  itemCount: number
  openOrderCount: number
}

export type ProcurementReferenceData = {
  suppliers: Array<{ id: string; name: string }>
  ingredients: Array<{ id: string; name: string; category: string; defaultUnit: string }>
  events: Array<{ id: string; name: string; date: string }>
}

export type ProcurementOrder = PurchaseOrder & {
  workflowStatus: 'Draft' | 'Sent' | 'Partially Fulfilled' | 'Fulfilled' | 'Cancelled'
}
