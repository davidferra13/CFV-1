import type { Metadata } from 'next'
import Link from 'next/link'
import { UnsubscribeForm } from './_components/unsubscribe-form'

export const metadata: Metadata = {
  title: 'Unsubscribe - Nearby Alerts',
  robots: { index: false },
}

type PageProps = {
  searchParams?: { t?: string | string[] }
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default function UnsubscribePage({ searchParams }: PageProps) {
  const token = firstParam(searchParams?.t)
  let email = ''

  if (token) {
    try {
      email = Buffer.from(token, 'base64url').toString('utf-8')
    } catch {
      // Invalid token
    }
  }

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-stone-100">Unsubscribe from Nearby alerts</h1>
        <p className="mt-2 text-sm text-stone-400">
          We respect your inbox. Use this page to stop Nearby saved-search and directory update
          emails for this address.
        </p>
        <div className="mt-8">
          <UnsubscribeForm initialEmail={email} />
        </div>
        <p className="mt-8 text-xs text-stone-600">
          <Link href="/nearby" className="hover:text-stone-400">
            Back to Nearby
          </Link>
        </p>
      </div>
    </div>
  )
}
