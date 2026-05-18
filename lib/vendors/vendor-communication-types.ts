export type VendorCommunicationChannel = 'email' | 'phone' | 'sms' | 'portal' | 'in_person'

export type VendorOrderStatus =
  | 'draft'
  | 'ready_to_send'
  | 'sent'
  | 'confirmed'
  | 'received'
  | 'cancelled'

export interface VendorProfileSummary {
  id: string
  chefId: string
  name: string
  category: string | null
  vendorType: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  isPreferred: boolean
  minimumOrderCents: number | null
  reliabilityScore: number | null
}

export interface VendorCommunicationPreference {
  id: string
  chefId: string
  vendorId: string
  preferredChannel: VendorCommunicationChannel
  orderCutoffTime: string | null
  leadTimeHours: number | null
  minimumOrderCents: number | null
  ingredientCategories: string[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ShoppingListItemForVendorDraft {
  ingredientName: string
  ingredientCategory?: string | null
  quantity: number
  unit: string
  notes?: string | null
  preferredVendorId?: string | null
  estimatedUnitCostCents?: number | null
}

export interface VendorOrderDraftGroup {
  vendorId: string | null
  vendorName: string
  preferredChannel: VendorCommunicationChannel
  items: ShoppingListItemForVendorDraft[]
  estimatedTotalCents: number | null
  orderSummary: string
}

export interface VendorOrderDraft {
  chefId: string
  eventId?: string | null
  groups: VendorOrderDraftGroup[]
  unassignedItems: ShoppingListItemForVendorDraft[]
  createdAt: string
}

export interface VendorOrderRecord {
  id: string
  chefId: string
  vendorId: string | null
  eventId: string | null
  status: VendorOrderStatus
  channel: VendorCommunicationChannel
  orderSummary: string
  estimatedTotalCents: number | null
  sentAt: string | null
  confirmedAt: string | null
  receivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface VendorOrderItemRecord {
  id: string
  orderId: string
  chefId: string
  ingredientName: string
  ingredientCategory: string | null
  quantity: number
  unit: string
  estimatedUnitCostCents: number | null
  estimatedTotalCents: number | null
  notes: string | null
  createdAt: string
}

export interface RecordVendorOrderInput {
  vendorId?: string | null
  eventId?: string | null
  status?: VendorOrderStatus
  channel?: VendorCommunicationChannel
  orderSummary: string
  estimatedTotalCents?: number | null
  items: ShoppingListItemForVendorDraft[]
}
