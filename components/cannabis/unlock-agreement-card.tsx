'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  CANNABIS_HOST_AGREEMENT_ACKNOWLEDGMENTS,
  CANNABIS_HOST_AGREEMENT_INTRO,
  CANNABIS_HOST_AGREEMENT_SCOPE,
  CANNABIS_HOST_AGREEMENT_SECTIONS,
  CANNABIS_HOST_AGREEMENT_VERSION,
} from '@/lib/cannabis/host-agreement'
import { signCannabisHostAgreement } from '@/lib/chef/cannabis-host-agreement-actions'

type AgreementRecord = {
  signed_at: string
  signature_name: string
  agreement_version: string
}

type Props = {
  initialAgreement: AgreementRecord | null
}

function formatSignedAt(signedAt: string) {
  const iso = new Date(signedAt).toISOString()
  return iso.replace('T', ' ').replace('.000Z', ' UTC')
}

export function UnlockAgreementCard({ initialAgreement }: Props) {
  const router = useRouter()
  const [agreement, setAgreement] = useState<AgreementRecord | null>(initialAgreement)
  const [confirmAge, setConfirmAge] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'duplicate'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const canSubmit = useMemo(
    () => confirmAge && agreeToTerms && signatureName.trim().length > 0 && status !== 'submitting',
    [agreeToTerms, confirmAge, signatureName, status]
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const result = await signCannabisHostAgreement({
        confirmAge,
        agreeToTerms,
        signatureName,
      })

      if (result.status === 'success') {
        router.push('/cannabis/hub')
        router.refresh()
        return
      }

      if (result.status === 'duplicate') {
        setAgreement(result.agreement)
        setStatus('duplicate')
        return
      }

      setStatus('error')
      setErrorMessage(result.message)
    } catch {
      setStatus('error')
      setErrorMessage('Unable to submit right now. Please try again.')
    }
  }

  if (agreement) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
          border: '1px solid rgba(74, 124, 78, 0.2)',
          boxShadow: '0 0 20px rgba(74, 124, 78, 0.1)',
        }}
      >
        <div
          className="rounded-lg p-4 mb-4"
          style={{
            background: 'rgba(74, 124, 78, 0.18)',
            border: '1px solid rgba(139, 195, 74, 0.35)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: '#e8f5e9' }}>
            Cannabis Portal Access Granted
          </p>
          {status === 'duplicate' && (
            <p className="text-xs mt-1" style={{ color: '#8bc34a' }}>
              An agreement is already on file. Your existing signature remains active.
            </p>
          )}
        </div>

        <div className="space-y-2 mb-5">
          <p className="text-xs uppercase tracking-wider" style={{ color: '#4a7c4e' }}>
            Signed Name
          </p>
          <p className="text-sm font-medium" style={{ color: '#e8f5e9' }}>
            {agreement.signature_name}
          </p>
          <p className="text-xs uppercase tracking-wider mt-3" style={{ color: '#4a7c4e' }}>
            Signed Timestamp
          </p>
          <p className="text-sm font-medium" style={{ color: '#e8f5e9' }}>
            {formatSignedAt(agreement.signed_at)}
          </p>
          <p className="text-xs" style={{ color: '#6aaa6e' }}>
            Agreement version {agreement.agreement_version}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/cannabis/agreement"
            className="flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              color: '#e8f5e9',
              background: 'rgba(74, 124, 78, 0.24)',
              border: '1px solid rgba(74, 124, 78, 0.45)',
            }}
          >
            View Signed Agreement
          </Link>
          <Link
            href="/cannabis/hub"
            className="flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              color: '#e8f5e9',
              background: 'linear-gradient(135deg, #2d5a30 0%, #4a7c4e 100%)',
              boxShadow: '0 0 16px rgba(74, 124, 78, 0.28)',
            }}
          >
            Go to Cannabis Hub
          </Link>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#4a7c4e' }}>
          <Link href="/cannabis/agreement" className="underline underline-offset-2">
            View Signed Agreement
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
        border: '1px solid rgba(74, 124, 78, 0.2)',
        boxShadow: '0 0 20px rgba(74, 124, 78, 0.1)',
      }}
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: '#e8f5e9' }}>
          {CANNABIS_HOST_AGREEMENT_INTRO}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#6aaa6e' }}>
          {CANNABIS_HOST_AGREEMENT_SCOPE}
        </p>

        {CANNABIS_HOST_AGREEMENT_SECTIONS.map((section, sectionIndex) => (
          <section key={section.title} className="space-y-2">
            <h3 className="text-sm font-semibold" style={{ color: '#e8f5e9' }}>
              {sectionIndex + 1}. {section.title}
            </h3>
            <ul className="space-y-1">
              {section.bullets.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm"
                  style={{ color: '#6aaa6e' }}
                >
                  <span className="mt-0.5 shrink-0" style={{ color: '#4a7c4e' }}>
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold" style={{ color: '#e8f5e9' }}>
            5. Acknowledgment
          </h3>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm" style={{ color: '#e8f5e9' }}>
              <input
                type="checkbox"
                checked={confirmAge}
                onChange={(e) => setConfirmAge(e.target.checked)}
                className="mt-0.5"
              />
              <span>{CANNABIS_HOST_AGREEMENT_ACKNOWLEDGMENTS[0]}</span>
            </label>
            <label className="flex items-start gap-2 text-sm" style={{ color: '#e8f5e9' }}>
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="mt-0.5"
              />
              <span>{CANNABIS_HOST_AGREEMENT_ACKNOWLEDGMENTS[1]}</span>
            </label>
          </div>
        </section>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#8bc34a' }}>
            Signature
          </label>
          <input
            type="text"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="Full Name (required field)"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
            style={{
              background: '#0a140a',
              border: '1px solid rgba(74, 124, 78, 0.3)',
              color: '#e8f5e9',
              caretColor: '#8bc34a',
            }}
          />
        </div>

        {status === 'error' && (
          <p className="text-xs" style={{ color: '#d9b07a' }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-45 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #2d5a30 0%, #4a7c4e 100%)',
            color: '#e8f5e9',
            boxShadow: '0 0 16px rgba(74, 124, 78, 0.3)',
          }}
        >
          {status === 'submitting' ? 'Signing...' : 'Sign & Unlock Cannabis Portal'}
        </button>
      </form>

      <p className="text-center text-xs mt-4" style={{ color: '#4a7c4e' }}>
        <Link href="/cannabis/agreement" className="underline underline-offset-2">
          View Signed Agreement
        </Link>
      </p>

      <p className="text-center text-xs mt-2" style={{ color: '#4a7c4e' }}>
        Agreement version {CANNABIS_HOST_AGREEMENT_VERSION}
      </p>
    </div>
  )
}
