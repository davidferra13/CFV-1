import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  closeDiningCheck,
  createDiningTable,
  createDiningZone,
  listDiningLayout,
  listOpenDiningChecks,
  openDiningCheck,
  setDiningTableStatus,
} from '@/lib/commerce/table-service-actions'
import { getCurrentRegisterSession } from '@/lib/commerce/register-actions'
import type { DiningTableStatus } from '@/lib/commerce/table-service-types'

export const metadata: Metadata = { title: 'Table Service' }

function statusVariant(status: DiningTableStatus): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'available') return 'success'
  if (status === 'out_of_service') return 'error'
  if (status === 'reserved') return 'warning'
  return 'default'
}

function statusLabel(status: DiningTableStatus) {
  if (status === 'out_of_service') return 'Out Of Service'
  if (status === 'reserved') return 'Reserved'
  if (status === 'seated') return 'Seated'
  return 'Available'
}

function parseIntOrDefault(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isInteger(parsed)) return fallback
  return parsed
}

export default async function TableServicePage() {
  await requireChef()
  await requirePro('commerce')

  async function createZoneAction(formData: FormData) {
    'use server'
    await createDiningZone({
      name: String(formData.get('zoneName') ?? ''),
      sortOrder: parseIntOrDefault(formData.get('zoneSortOrder'), 0),
    })
  }

  async function createTableAction(formData: FormData) {
    'use server'
    await createDiningTable({
      zoneId: String(formData.get('zoneId') ?? ''),
      tableLabel: String(formData.get('tableLabel') ?? ''),
      seatCapacity: parseIntOrDefault(formData.get('seatCapacity'), 2),
      sortOrder: parseIntOrDefault(formData.get('tableSortOrder'), 0),
    })
  }

  async function openCheckAction(formData: FormData) {
    'use server'
    const guestCountRaw = String(formData.get('guestCount') ?? '').trim()
    await openDiningCheck({
      tableId: String(formData.get('tableId') ?? ''),
      registerSessionId: String(formData.get('registerSessionId') ?? '') || undefined,
      guestName: String(formData.get('guestName') ?? ''),
      guestCount: guestCountRaw ? Number.parseInt(guestCountRaw, 10) : undefined,
      notes: String(formData.get('openCheckNotes') ?? ''),
    })
  }

  async function closeCheckAction(formData: FormData) {
    'use server'
    await closeDiningCheck({
      checkId: String(formData.get('checkId') ?? ''),
      notes: String(formData.get('closeCheckNotes') ?? ''),
    })
  }

  async function setTableStatusAction(formData: FormData) {
    'use server'
    await setDiningTableStatus({
      tableId: String(formData.get('tableId') ?? ''),
      status: String(formData.get('tableStatus') ?? '') as DiningTableStatus,
    })
  }

  const [layout, openChecks, registerSession] = await Promise.all([
    listDiningLayout(),
    listOpenDiningChecks({ limit: 100 }),
    getCurrentRegisterSession().catch(() => null),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Table Service</h1>
        <p className="text-sm text-stone-400 mt-1">
          Manage dining zones, tables, and open checks for dine-in operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Create Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createZoneAction} className="space-y-3">
              <Input name="zoneName" placeholder="Dining Room" required />
              <Input name="zoneSortOrder" type="number" min="0" defaultValue="0" />
              <Button variant="primary" type="submit">
                Add Zone
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Table</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTableAction} className="space-y-3">
              <select
                name="zoneId"
                required
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
              >
                <option value="">Select zone</option>
                {layout.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
              <Input name="tableLabel" placeholder="T1 / Patio-2" required />
              <Input name="seatCapacity" type="number" min="1" max="30" defaultValue="2" required />
              <Input name="tableSortOrder" type="number" min="0" defaultValue="0" />
              <Button variant="primary" type="submit">
                Add Table
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Checks ({openChecks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {openChecks.length === 0 ? (
            <p className="text-sm text-stone-500">No open checks.</p>
          ) : (
            openChecks.map((check) => (
              <div
                key={check.id}
                className="rounded-lg border border-stone-800 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm text-stone-100 font-medium">
                    {check.tableLabel}
                    {check.guestName ? ` - ${check.guestName}` : ''}
                  </p>
                  <p className="text-xs text-stone-500">
                    Opened {new Date(check.openedAt).toLocaleString()}
                    {check.guestCount ? ` - ${check.guestCount} guests` : ''}
                  </p>
                </div>
                <form action={closeCheckAction} className="flex items-center gap-2">
                  <input type="hidden" name="checkId" value={check.id} />
                  <Input
                    name="closeCheckNotes"
                    placeholder="Close note (optional)"
                    className="w-56"
                  />
                  <Button variant="secondary" size="sm" type="submit">
                    Close
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {layout.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{zone.name}</span>
                <Badge variant="default">{zone.tables.length} tables</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {zone.tables.length === 0 ? (
                <p className="text-sm text-stone-500">No tables in this zone.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {zone.tables.map((table) => (
                    <div
                      key={table.id}
                      className="rounded-lg border border-stone-800 p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-stone-100 font-medium">{table.tableLabel}</p>
                          <p className="text-xs text-stone-500">{table.seatCapacity} seats</p>
                        </div>
                        <Badge variant={statusVariant(table.status)}>
                          {statusLabel(table.status)}
                        </Badge>
                      </div>

                      {table.openCheckId && (
                        <p className="text-xs text-amber-400">
                          Open check:{' '}
                          {table.openGuestName ? table.openGuestName : table.openCheckId}
                        </p>
                      )}

                      <form action={setTableStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="tableId" value={table.id} />
                        <select
                          name="tableStatus"
                          defaultValue={table.status}
                          className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
                        >
                          <option value="available">Available</option>
                          <option value="seated">Seated</option>
                          <option value="reserved">Reserved</option>
                          <option value="out_of_service">Out of Service</option>
                        </select>
                        <Button variant="ghost" size="sm" type="submit">
                          Save
                        </Button>
                      </form>

                      {!table.openCheckId && table.status !== 'out_of_service' && (
                        <form action={openCheckAction} className="grid grid-cols-1 gap-2">
                          <input type="hidden" name="tableId" value={table.id} />
                          <input
                            type="hidden"
                            name="registerSessionId"
                            value={registerSession?.id ?? ''}
                          />
                          <Input name="guestName" placeholder="Guest / tab name" />
                          <Input
                            name="guestCount"
                            type="number"
                            min="1"
                            max="30"
                            placeholder="Guest count"
                          />
                          <Input name="openCheckNotes" placeholder="Open check notes" />
                          <Button variant="primary" size="sm" type="submit">
                            Open Check
                          </Button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
