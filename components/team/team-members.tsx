import {
  inviteTeamMember,
  removeTeamMember,
  updateTeamMember,
  type TeamMember,
} from '@/lib/team/team-management'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function TeamMembers({ members }: { members: TeamMember[] }) {
  async function inviteMemberAction(formData: FormData) {
    'use server'

    const name = String(formData.get('name') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const role = String(formData.get('role') || 'sous_chef')

    await inviteTeamMember({
      name,
      email,
      role: role as 'owner' | 'lead_chef' | 'sous_chef' | 'prep_chef' | 'admin',
    })
  }

  async function updateMemberAction(formData: FormData) {
    'use server'

    const memberId = String(formData.get('member_id') || '')
    const role = String(formData.get('role') || '')
    const status = String(formData.get('status') || '')

    await updateTeamMember(memberId, {
      role: role as 'owner' | 'lead_chef' | 'sous_chef' | 'prep_chef' | 'admin',
      status: status as 'invited' | 'active' | 'inactive' | 'removed',
    })
  }

  async function removeMemberAction(formData: FormData) {
    'use server'
    const memberId = String(formData.get('member_id') || '')
    await removeTeamMember(memberId)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={inviteMemberAction} className="grid gap-3 md:grid-cols-4">
            <input
              name="name"
              required
              placeholder="Full name"
              className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="email@example.com"
              className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
            />
            <select
              name="role"
              defaultValue="sous_chef"
              className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
            >
              <option value="owner">Owner</option>
              <option value="lead_chef">Lead Chef</option>
              <option value="sous_chef">Sous Chef</option>
              <option value="prep_chef">Prep Chef</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit">Invite</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-stone-400">No team members yet.</p>
          ) : (
            members.map((member) => (
              <div key={member.id} className="rounded-md border border-stone-700 bg-stone-900 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-stone-100">{member.name}</p>
                    <p className="text-xs text-stone-400">{member.email}</p>
                  </div>
                  <span className="text-xs text-stone-400">
                    {member.source === 'team_table' ? 'Team' : 'Staff fallback'}
                  </span>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <form action={updateMemberAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="member_id" value={member.id} />
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="h-9 rounded-md border border-stone-700 bg-stone-900 px-2 text-xs text-stone-100"
                    >
                      <option value="owner">Owner</option>
                      <option value="lead_chef">Lead Chef</option>
                      <option value="sous_chef">Sous Chef</option>
                      <option value="prep_chef">Prep Chef</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select
                      name="status"
                      defaultValue={member.status}
                      className="h-9 rounded-md border border-stone-700 bg-stone-900 px-2 text-xs text-stone-100"
                    >
                      <option value="invited">Invited</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="removed">Removed</option>
                    </select>
                    <Button type="submit" size="sm" variant="secondary">
                      Save
                    </Button>
                  </form>

                  <form action={removeMemberAction}>
                    <input type="hidden" name="member_id" value={member.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      Remove
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
