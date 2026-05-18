import type {
  ShoppingListItemForVendorDraft,
  VendorCommunicationPreference,
  VendorOrderDraft,
  VendorOrderDraftGroup,
  VendorProfileSummary,
} from '@/lib/vendors/vendor-communication-types'

function normalizeCategory(value: string | null | undefined): string {
  return (value ?? 'other').trim().toLowerCase()
}

function estimateItemTotalCents(item: ShoppingListItemForVendorDraft): number | null {
  if (typeof item.estimatedUnitCostCents !== 'number') return null
  if (!Number.isFinite(item.estimatedUnitCostCents)) return null
  if (!Number.isFinite(item.quantity)) return null
  return Math.max(0, Math.round(item.estimatedUnitCostCents * item.quantity))
}

function sumEstimatedTotal(items: ShoppingListItemForVendorDraft[]): number | null {
  let total = 0
  let hasAny = false

  for (const item of items) {
    const itemTotal = estimateItemTotalCents(item)
    if (itemTotal == null) continue
    total += itemTotal
    hasAny = true
  }

  return hasAny ? total : null
}

function formatItem(item: ShoppingListItemForVendorDraft): string {
  const quantity = Number.isFinite(item.quantity) ? item.quantity : 0
  const notes = item.notes ? `, ${item.notes}` : ''
  return `${quantity} ${item.unit} ${item.ingredientName}${notes}`
}

export function buildVendorOrderSummary(items: ShoppingListItemForVendorDraft[]): string {
  if (items.length === 0) return 'No items assigned.'
  return items.map(formatItem).join('\n')
}

export function chooseVendorForItem(input: {
  item: ShoppingListItemForVendorDraft
  vendors: VendorProfileSummary[]
  preferences: VendorCommunicationPreference[]
}): VendorProfileSummary | null {
  if (input.item.preferredVendorId) {
    const explicit = input.vendors.find((vendor) => vendor.id === input.item.preferredVendorId)
    if (explicit) return explicit
  }

  const itemCategory = normalizeCategory(input.item.ingredientCategory)
  const preference = input.preferences.find((pref) =>
    pref.ingredientCategories.map(normalizeCategory).includes(itemCategory)
  )
  if (preference) {
    const preferredVendor = input.vendors.find((vendor) => vendor.id === preference.vendorId)
    if (preferredVendor) return preferredVendor
  }

  const preferredByCategory = input.vendors.find(
    (vendor) =>
      vendor.isPreferred &&
      (normalizeCategory(vendor.category) === itemCategory ||
        normalizeCategory(vendor.vendorType) === itemCategory)
  )
  if (preferredByCategory) return preferredByCategory

  return input.vendors.find((vendor) => vendor.isPreferred) ?? input.vendors[0] ?? null
}

export function draftVendorOrders(input: {
  chefId: string
  eventId?: string | null
  items: ShoppingListItemForVendorDraft[]
  vendors: VendorProfileSummary[]
  preferences?: VendorCommunicationPreference[]
}): VendorOrderDraft {
  const preferences = input.preferences ?? []
  const groups = new Map<string, VendorOrderDraftGroup>()
  const unassignedItems: ShoppingListItemForVendorDraft[] = []

  for (const item of input.items) {
    const vendor = chooseVendorForItem({
      item,
      vendors: input.vendors,
      preferences,
    })

    if (!vendor) {
      unassignedItems.push(item)
      continue
    }

    const preference = preferences.find((pref) => pref.vendorId === vendor.id)
    const existing =
      groups.get(vendor.id) ??
      ({
        vendorId: vendor.id,
        vendorName: vendor.name,
        preferredChannel: preference?.preferredChannel ?? 'email',
        items: [],
        estimatedTotalCents: null,
        orderSummary: '',
      } satisfies VendorOrderDraftGroup)

    existing.items.push(item)
    existing.estimatedTotalCents = sumEstimatedTotal(existing.items)
    existing.orderSummary = buildVendorOrderSummary(existing.items)
    groups.set(vendor.id, existing)
  }

  return {
    chefId: input.chefId,
    eventId: input.eventId ?? null,
    groups: Array.from(groups.values()).sort((a, b) => a.vendorName.localeCompare(b.vendorName)),
    unassignedItems,
    createdAt: new Date().toISOString(),
  }
}

export const vendorOrderDraftInternals = {
  normalizeCategory,
  estimateItemTotalCents,
  sumEstimatedTotal,
}
