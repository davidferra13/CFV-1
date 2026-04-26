import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { checkRateLimit } from '@/lib/rateLimit'
import { getSplitByToken } from '@/lib/payments/split-share-actions'
import { SplitBreakdownView } from '@/components/payments/split-breakdown-view'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const data = await getSplitByToken(token)

  if (!data) {
    return { title: 'Split Not Found' }
  }

  return {
    title: `Group Split: ${data.eventName}`,
    description: `Split the cost for ${data.eventName}. ${data.guestCount} people, per person amount available.`,
    robots: { index: false, follow: false },
  }
}

export default async function PublicSplitPage({ params }: Props) {
  const { token } = await params
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`split:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const data = await getSplitByToken(token)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <SplitBreakdownView data={data} />
    </div>
  )
}
