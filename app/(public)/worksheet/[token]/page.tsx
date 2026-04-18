// Public Client Worksheet Page
// No authentication required. Client accesses via token link.
// Chef sends this link to client before a dinner so they can fill out
// their preferences, allergies, dietary restrictions, and event details.

import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { checkRateLimit } from '@/lib/rateLimit'
import { getWorksheetByToken } from '@/lib/marketplace/worksheet-actions'
import { TokenExpiredPage } from '@/components/ui/token-expired-page'
import { ClientWorksheetForm } from './worksheet-form'

type Props = { params: { token: string } }

export const metadata: Metadata = {
  title: 'Pre-Dinner Details',
  description: 'Share your preferences and dietary needs with your chef before your dinner.',
}

export default async function WorksheetPage({ params }: Props) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  try {
    await checkRateLimit(`worksheet:${ip}`, 30, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const worksheet = await getWorksheetByToken(params.token)
  if (!worksheet) return <TokenExpiredPage reason="not_found" noun="worksheet" />

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-900">Pre-Dinner Details</h1>
          <p className="mt-2 text-sm text-stone-600">
            Help your chef prepare the perfect experience by sharing your preferences below.
          </p>
          {worksheet.occasion && (
            <p className="mt-1 text-sm font-medium text-stone-700">{worksheet.occasion}</p>
          )}
          {worksheet.eventDate && (
            <p className="mt-1 text-sm text-stone-500">
              {new Date(`${worksheet.eventDate}T12:00:00`).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        {worksheet.chefNote && (
          <div className="mb-6 rounded-lg bg-stone-100 p-4 text-sm text-stone-700">
            <p className="font-medium text-stone-800 mb-1">Note from your chef:</p>
            <p>{worksheet.chefNote}</p>
          </div>
        )}

        {worksheet.status === 'completed' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <p className="text-lg font-semibold text-emerald-800">Thank you!</p>
            <p className="mt-2 text-sm text-emerald-700">
              Your details have been submitted. Your chef will use this to prepare for your dinner.
            </p>
          </div>
        ) : (
          <ClientWorksheetForm
            token={params.token}
            prefillName={worksheet.clientName}
            prefillEmail={worksheet.clientEmail}
            prefillPhone={worksheet.clientPhone}
          />
        )}

        <p className="mt-8 text-center text-xs text-stone-400">Powered by ChefFlow</p>
      </div>
    </div>
  )
}
