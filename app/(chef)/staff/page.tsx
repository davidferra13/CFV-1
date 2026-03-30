// Staff Roster Page
// Chef manages their team: sous chefs, kitchen assistants, service staff.
// Supports search by name, filter by role, filter by status via URL params.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { searchStaffMembers, deactivateStaffMember } from '@/lib/staff/actions'
import { StaffMemberForm } from '@/components/staff/staff-member-form'
import { StaffSearchFilter } from '@/components/staff/staff-search-filter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Staff Roster | ChefFlow' }

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

export default async function StaffRosterPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; status?: string }
}) {
  const user = await requireChef()
  await requireFocusAccess()

  const search = searchParams.q ?? ''
  const role = searchParams.role ?? 'all'
  const status = searchParams.status ?? 'active'

  const staff = await searchStaffMembers({
    search: search || undefined,
    role,
    status: status === 'all' ? undefined : status,
  })

  const active = staff.filter((s: any) => s.status === 'active')
  const inactive = staff.filter((s: any) => s.status === 'inactive')
  const showAll = status === 'all' || status === 'inactive'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Staff Roster</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage your sous chefs, kitchen assistants, and service staff. Click any name to see their
          full profile, assignment history, and performance.
        </p>
      </div>

      {/* Search & Filter */}
      <StaffSearchFilter initialSearch={search} initialRole={role} initialStatus={status} />

      {/* Staff List */}
      <div className="space-y-3">
        {staff.length === 0 ? (
          <p className="text-sm text-stone-500">
            {search || role !== 'all'
              ? 'No staff members match your search.'
              : 'No active staff yet. Add your first team member below.'}
          </p>
        ) : (
          staff.map((member: any) => (
            <Card key={member.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <Link href={`/staff/${member.id}`} className="group flex-1">
                    <div className="flex items-center gap-2">
                      {member.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.photo_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-stone-800 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-stone-500">
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="font-medium text-stone-100 group-hover:text-amber-500 transition-colors">
                        {member.name}
                      </span>
                      <Badge variant="default">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                      <Badge variant={member.status === 'active' ? 'success' : 'error'}>
                        {member.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-stone-500">
                      {member.hourly_rate_cents > 0 && (
                        <span>${(member.hourly_rate_cents / 100).toFixed(2)}/hr</span>
                      )}
                      {member.phone && <span>{member.phone}</span>}
                      {member.email && <span>{member.email}</span>}
                    </div>
                    {member.notes && <p className="mt-1 text-xs text-stone-400">{member.notes}</p>}
                  </Link>
                  {member.status === 'active' && (
                    <form
                      action={async () => {
                        'use server'
                        await deactivateStaffMember(member.id)
                      }}
                    >
                      <Button type="submit" variant="ghost" size="sm" className="text-stone-400">
                        Deactivate
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add new */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffMemberForm chefId={user.entityId} />
        </CardContent>
      </Card>
    </div>
  )
}
