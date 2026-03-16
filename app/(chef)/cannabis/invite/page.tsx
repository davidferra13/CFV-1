// Cannabis Invite Page - Chef Portal
// Submit an invitation request. All invites are routed through admin approval first.

import { getMySentCannabisInvites } from '@/lib/chef/cannabis-actions'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import { CannabisInviteForm } from '@/components/cannabis/invite-form'

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Processing', color: '#e6a862' },
  approved: { label: 'Sent', color: '#8bc34a' },
  rejected: { label: 'Declined', color: '#ef9a9a' },
}

export default async function CannabisInvitePage() {
  const sentInvites = await getMySentCannabisInvites().catch(() => [])

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-xl mx-auto">
        <CannabisPortalHeader
          title="Invite to Cannabis Dining"
          subtitle="Bring a trusted guest into the cannabis tier"
          backHref="/cannabis"
          backLabel="Cannabis Hub"
        />

        {/* Invite form */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
            border: '1px solid rgba(74, 124, 78, 0.2)',
            boxShadow: '0 0 20px rgba(74, 124, 78, 0.08)',
          }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#e8f5e9' }}>
            New Invitation
          </h2>
          <CannabisInviteForm />
        </div>

        {/* Sent invites history */}
        {sentInvites.length > 0 && (
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#4a7c4e' }}
            >
              Your Invitations
            </h3>
            <div className="space-y-2">
              {sentInvites.map((inv) => {
                const style = STATUS_STYLES[inv.admin_approval_status] ?? STATUS_STYLES.pending
                return (
                  <div
                    key={inv.id}
                    className="rounded-lg p-3 flex items-center justify-between gap-3"
                    style={{
                      background: '#0a130a',
                      border: '1px solid rgba(74, 124, 78, 0.12)',
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: '#e8f5e9' }}>
                        {inv.invitee_email}
                      </p>
                      {inv.invitee_name && (
                        <p className="text-xs" style={{ color: '#4a7c4e' }}>
                          {inv.invitee_name}
                        </p>
                      )}
                      <p className="text-xs" style={{ color: '#2d5a30' }}>
                        {new Date(inv.created_at).toLocaleDateString()}
                        {inv.claimed_at ? ' · Accepted' : ''}
                      </p>
                    </div>
                    <span className="text-xs font-medium shrink-0" style={{ color: style.color }}>
                      {inv.claimed_at ? '✓ Accepted' : style.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </CannabisPageWrapper>
  )
}
