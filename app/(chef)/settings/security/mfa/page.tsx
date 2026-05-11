import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getMfaStatus } from '@/lib/mfa/actions'
import { MfaSetupClient } from '@/components/settings/mfa-setup-client'

export const metadata: Metadata = { title: 'Two-Factor Authentication' }

export default async function MfaPage() {
  await requireChef()
  const status = await getMfaStatus()

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a
          href="/settings/security"
          className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Two-Factor Authentication</h1>
          <p className="mt-0.5 text-sm text-stone-400">
            Protect your account with an authenticator app
          </p>
        </div>
      </div>

      <MfaSetupClient initialStatus={status} />
    </div>
  )
}
