export type DiningTableStatus = 'available' | 'seated' | 'reserved' | 'out_of_service'

export type DiningCheckStatus = 'open' | 'closed' | 'voided'

export type DiningZone = {
  id: string
  tenantId: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type DiningTable = {
  id: string
  tenantId: string
  zoneId: string
  tableLabel: string
  seatCapacity: number
  sortOrder: number
  status: DiningTableStatus
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type DiningCheck = {
  id: string
  tenantId: string
  tableId: string
  registerSessionId: string | null
  saleId: string | null
  status: DiningCheckStatus
  guestName: string | null
  guestCount: number | null
  notes: string | null
  openedAt: string
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export type DiningLayoutZone = DiningZone & {
  tables: Array<DiningTable & { openCheckId: string | null; openGuestName: string | null }>
}

export type OpenDiningCheckWithTable = DiningCheck & {
  tableLabel: string
  tableStatus: DiningTableStatus
}
