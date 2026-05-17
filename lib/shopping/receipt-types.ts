// Shopping Receipt & Inventory types

export interface ReceiptItem {
  name: string
  quantity: number
  unit: string
  price_cents: number
  category: string
}

export interface ShoppingReceipt {
  id: string
  tenant_id: string
  store_name: string
  receipt_date: string
  total_cents: number
  tax_cents: number
  items: ReceiptItem[]
  event_id: string | null
  photo_url: string | null
  notes: string | null
  created_at: string
}

export interface ReceiptSummary {
  total_spend_cents: number
  store_breakdown: { store_name: string; total_cents: number; receipt_count: number }[]
  category_breakdown: { category: string; total_cents: number }[]
}

export interface InventoryEntry {
  id: string
  tenant_id: string
  ingredient_id: string | null
  ingredient_name: string
  quantity_on_hand: number
  unit: string
  last_purchased_at: string | null
  expiry_date: string | null
  location: string | null
  created_at: string
  updated_at: string
}
