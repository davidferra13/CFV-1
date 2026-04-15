// Staff Roster by Location
// Shows staff members grouped by assigned business location.
// Staff without a location appear under "Unassigned".

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Location Roster' }

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  storefront: 'Storefront',
  truck: 'Food Truck',
  commissary: 'Commissary',
  warehouse: 'Warehouse',
  office: 'Office',
}

export default async function LocationRosterPage() {
  const user = await requireChef()
  await requirePro('staff-management')
  const db: any = createServerClient()

  const [{ data: locations }, { data: staffRows }] = await Promise.all([
    db
      .from('business_locations')
      .select('id, name, location_type, address, is_primary, is_active')
      .eq('tenant_id', user.tenantId!)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('name'),
    db
      .from('staff_members')
      .select('id, name, role, phone, email, status, location_id')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'active')
      .order('name'),
  ])

  const activeLocations: any[] = locations ?? []
  const allStaff: any[] = staffRows ?? []

  // Group staff by location_id
  const byLocation = new Map<string | null, any[]>()
  byLocation.set(null, [])
  for (const loc of activeLocations) {
    byLocation.set(loc.id, [])
  }
  for (const member of allStaff) {
    const key = member.location_id ?? null
    if (!byLocation.has(key)) byLocation.set(null, [...(byLocation.get(null) ?? []), member])
    else byLocation.get(key)!.push(member)
  }

  const totalAssigned = allStaff.filter((s) => s.location_id != null).length
  const totalUnassigned = allStaff.filter((s) => s.location_id == null).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Staff
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Location Roster</h1>
          <p className="text-stone-500 mt-1">
            {allStaff.length} active staff member{allStaff.length !== 1 ? 's' : ''} across{' '}
            {activeLocations.length} location{activeLocations.length !== 1 ? 's' : ''}
            {totalUnassigned > 0 ? ` (${totalUnassigned} unassigned)` : ''}
          </p>
        </div>
        <Link
          href="/staff"
          className="text-sm text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg px-3 py-2"
        >
          Manage Staff
        </Link>
      </div>

      {activeLocations.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-stone-400">No business locations configured yet.</p>
          <p className="text-stone-500 text-sm mt-2">
            Add locations in{' '}
            <Link href="/inventory/locations" className="text-brand-500 hover:underline">
              Storage Locations
            </Link>{' '}
            to start assigning staff.
          </p>
        </Card>
      )}

      {activeLocations.map((loc: any) => {
        const locStaff = byLocation.get(loc.id) ?? []
        return (
          <Card key={loc.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-stone-100">{loc.name}</h2>
                  {loc.is_primary && (
                    <Badge variant="default" className="text-xs">
                      Primary
                    </Badge>
                  )}
                  <Badge variant="info" className="text-xs">
                    {LOCATION_TYPE_LABELS[loc.location_type] ?? loc.location_type}
                  </Badge>
                </div>
                {loc.address && <p className="text-sm text-stone-500 mt-0.5">{loc.address}</p>}
              </div>
              <span className="text-sm text-stone-400">
                {locStaff.length} staff member{locStaff.length !== 1 ? 's' : ''}
              </span>
            </div>

            {locStaff.length === 0 ? (
              <p className="text-sm text-stone-500 italic">No staff assigned to this location.</p>
            ) : (
              <div className="divide-y divide-stone-800">
                {locStaff.map((member: any) => (
                  <div key={member.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <Link
                        href={`/staff/${member.id}`}
                        className="text-sm font-medium text-stone-200 hover:text-stone-100 hover:underline"
                      >
                        {member.name}
                      </Link>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {ROLE_LABELS[member.role] ?? member.role}
                        {member.phone ? ` - ${member.phone}` : ''}
                      </p>
                    </div>
                    <Badge variant="default" className="text-xs shrink-0">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      {totalUnassigned > 0 && (
        <Card className="p-6 border-stone-700/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-400">Unassigned</h2>
              <p className="text-xs text-stone-500 mt-0.5">Staff with no location assigned</p>
            </div>
            <span className="text-sm text-stone-400">
              {totalUnassigned} member{totalUnassigned !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-stone-800">
            {(byLocation.get(null) ?? []).map((member: any) => (
              <div key={member.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <Link
                    href={`/staff/${member.id}`}
                    className="text-sm font-medium text-stone-300 hover:text-stone-100 hover:underline"
                  >
                    {member.name}
                  </Link>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {ROLE_LABELS[member.role] ?? member.role}
                    {member.phone ? ` - ${member.phone}` : ''}
                  </p>
                </div>
                <Link
                  href={`/staff/${member.id}`}
                  className="text-xs text-stone-500 hover:underline"
                >
                  Assign location
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
