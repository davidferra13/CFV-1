import Link from 'next/link'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import { UnlockAgreementCard } from '@/components/cannabis/unlock-agreement-card'
import {
  getCannabisHostAgreement,
  requireCannabisInviteAccess,
} from '@/lib/chef/cannabis-access-guards'

export default async function CannabisUnlockPage() {
  const user = await requireCannabisInviteAccess()
  const agreement = await getCannabisHostAgreement(user.id)

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <CannabisPortalHeader
          title="Cannabis Portal Unlock"
          subtitle="One-time host acknowledgment for cannabis tools"
          backHref="/cannabis/about"
          backLabel="About This Portal"
        />

        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, #0a130a 0%, #0f1a0f 100%)',
            border: '1px solid rgba(74, 124, 78, 0.15)',
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: '#6aaa6e' }}>
            This unlock agreement is signed once and stays on file for your account. You can view
            your signed copy any time.
          </p>
        </div>

        <UnlockAgreementCard initialAgreement={agreement} />

        <p className="text-center text-xs mt-6" style={{ color: '#4a7c4e' }}>
          Want context before signing?{' '}
          <Link href="/cannabis/about" className="underline underline-offset-2">
            Read about the Cannabis Portal
          </Link>
          .
        </p>
      </div>
    </CannabisPageWrapper>
  )
}
