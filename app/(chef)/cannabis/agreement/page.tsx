import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import {
  getCannabisHostAgreement,
  requireCannabisInviteAccess,
} from '@/lib/chef/cannabis-access-guards'

function formatSignedAt(signedAt: string) {
  return new Date(signedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function CannabisAgreementPage() {
  const user = await requireCannabisInviteAccess()
  const agreement = await getCannabisHostAgreement(user.id)

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <CannabisPortalHeader
          title="Signed Agreement"
          subtitle="Stored host unlock record"
          backHref="/cannabis/unlock"
          backLabel="Unlock"
        />

        {!agreement ? (
          <div
            className="rounded-xl p-6"
            style={{
              background: '#0f1a0f',
              border: '1px solid rgba(74, 124, 78, 0.15)',
            }}
          >
            <p className="text-sm" style={{ color: '#6aaa6e' }}>
              No agreement on file.
            </p>
          </div>
        ) : (
          <>
            <div
              className="rounded-xl p-5 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
              style={{
                background: '#0f1a0f',
                border: '1px solid rgba(74, 124, 78, 0.15)',
              }}
            >
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#4a7c4e' }}>
                  Signed Name
                </p>
                <p className="text-sm font-medium" style={{ color: '#e8f5e9' }}>
                  {agreement.signature_name}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#4a7c4e' }}>
                  Signed Timestamp
                </p>
                <p className="text-sm font-medium" style={{ color: '#e8f5e9' }}>
                  {formatSignedAt(agreement.signed_at)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#4a7c4e' }}>
                  Version
                </p>
                <p className="text-sm font-medium" style={{ color: '#e8f5e9' }}>
                  {agreement.agreement_version}
                </p>
              </div>
            </div>

            <div
              className="rounded-xl p-5"
              style={{
                background: '#0f1a0f',
                border: '1px solid rgba(74, 124, 78, 0.15)',
              }}
            >
              <pre
                className="whitespace-pre-wrap text-sm leading-relaxed m-0"
                style={{ color: '#6aaa6e', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
              >
                {agreement.agreement_text_snapshot}
              </pre>
            </div>
          </>
        )}
      </div>
    </CannabisPageWrapper>
  )
}
