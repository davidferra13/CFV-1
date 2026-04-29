export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted'
  | 'partially_received'
  | 'received'
  | 'cancelled'

export type PurchaseOrder = {
  id: string
  chefId: string
  vendorId: string | null
  eventId: string | null
  poNumber: string | null
  status: PurchaseOrderStatus
  orderDate: string | null
  expectedDelivery: string | null
  deliveryLocationId: string | null
  estimatedTotalCents: number
  actualTotalCents: number | null
  photoUrl: string | null
  notes: string | null
  submittedAt: string | null
  receivedAt: string | null
  createdAt: string
  vendorName?: string
  eventTitle?: string
  itemCount?: number
}

export type POItem = {
  id: string
  purchaseOrderId: string
  ingredientId: string | null
  ingredientName: string
  orderedQty: number
  unit: string
  estimatedUnitPriceCents: number | null
  estimatedTotalCents: number | null
  receivedQty: number | null
  actualUnitPriceCents: number | null
  actualTotalCents: number | null
  isReceived: boolean
  isShorted: boolean
  isDamaged: boolean
  damageNotes: string | null
  expiryDate: string | null
  lotNumber: string | null
  notes: string | null
}

export type CreatePOInput = {
  vendorId?: string
  eventId?: string
  poNumber?: string
  orderDate?: string
  expectedDelivery?: string
  deliveryLocationId?: string
  notes?: string
  photoUrl?: string
}

export type AddPOItemInput = {
  ingredientId?: string
  ingredientName: string
  orderedQty: number
  unit: string
  estimatedUnitPriceCents?: number
  notes?: string
}

export type UpdatePOItemInput = {
  ingredientName?: string
  orderedQty?: number
  unit?: string
  estimatedUnitPriceCents?: number | null
  notes?: string | null
}

export type ReceiveItemInput = {
  itemId: string
  receivedQty: number
  actualUnitPriceCents?: number
  isShorted?: boolean
  isDamaged?: boolean
  damageNotes?: string
  expiryDate?: string
  lotNumber?: string
}
