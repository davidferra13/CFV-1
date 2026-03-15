// Public Intake Form Page (no auth required)
// Clients access this via a share link. Renders the form dynamically
// from the JSONB field config and submits responses.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getShareByToken } from '@/lib/clients/intake-actions'
import { IntakeFormPublic } from './intake-form-public'

interface Props {
  params: { token: string }
}

export const metadata: Metadata = {
  title: 'Client Intake Form - ChefFlow',
  robots: { index: false, follow: false },
}

export default async function IntakeFormPage({ params }: Props) {
  const shareData = await getShareByToken(params.token)

  if (!shareData) {
    notFound()
  }

  if (shareData.already_submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-stone-900">Already Submitted</h1>
          <p className="mt-2 text-stone-500">
            A response has already been submitted for this form. If you need to make changes, please
            contact your chef directly.
          </p>
        </div>
        <p className="mt-6 text-xs text-stone-400">Powered by ChefFlow</p>
      </div>
    )
  }

  const form = shareData.form

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <IntakeFormPublic
        token={params.token}
        form={form}
        prefillName={shareData.client_name || ''}
        prefillEmail={shareData.client_email || ''}
      />
      <p className="mt-8 text-center text-xs text-stone-400">Powered by ChefFlow</p>
    </div>
  )
}
