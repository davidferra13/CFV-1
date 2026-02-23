// Public Unsubscribe Page
// No authentication required. Uses campaign_recipient ID as the unsubscribe token.
// URL: /unsubscribe?rid=<campaign_recipient_id>

import { recordUnsubscribeByRecipientId } from '@/lib/marketing/actions'

interface UnsubscribePageProps {
  searchParams: { rid?: string }
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const rid = searchParams.rid

  if (!rid) {
    return <UnsubscribeResult state="invalid" />
  }

  try {
    const result = await recordUnsubscribeByRecipientId(rid)
    return <UnsubscribeResult state="success" chefName={result?.chefName} />
  } catch {
    return <UnsubscribeResult state="invalid" />
  }
}

function UnsubscribeResult({
  state,
  chefName,
}: {
  state: 'success' | 'invalid'
  chefName?: string
}) {
  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#f6f9fc',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '48px 40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            backgroundColor: '#18181b',
            borderRadius: '8px',
            display: 'inline-block',
            padding: '8px 16px',
            marginBottom: '32px',
          }}
        >
          <span
            style={{ color: '#ffffff', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}
          >
            ChefFlow
          </span>
        </div>

        {state === 'success' ? (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#18181b', margin: '0 0 12px' }}>
              You&apos;ve been unsubscribed
            </h1>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#6b7280', margin: '0 0 8px' }}>
              You will no longer receive marketing emails from{' '}
              {chefName ? <strong>{chefName}</strong> : 'this chef'}.
            </p>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0' }}>
              You&apos;ll still receive important emails about events you&apos;ve booked, quotes,
              and payments.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#18181b', margin: '0 0 12px' }}>
              Invalid link
            </h1>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#6b7280', margin: '0' }}>
              This unsubscribe link is invalid or has already been used. If you&apos;re still
              receiving unwanted emails, please reply to the email directly.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
