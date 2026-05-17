import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { resolveJoinToken } from '@/lib/dinner-circles/qr-join-actions'
import { checkRateLimit } from '@/lib/rateLimit'
import { JoinCircleForm } from './join-circle-form'

interface Props {
  params: Promise<{ token: string }>
}

export default async function QRCircleJoinPage({ params }: Props) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'

  try {
    await checkRateLimit(`qr-join:${ip}`, 30, 15 * 60 * 1000)
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4">
        <p className="text-sm text-stone-400">Too many requests. Please try again later.</p>
      </div>
    )
  }

  const { token } = await params
  const resolved = await resolveJoinToken(token)

  if (!resolved.valid) {
    if (resolved.reason === 'expired') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4">
          <div className="mx-auto max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-semibold text-stone-100">This event has ended</h1>
            <p className="text-sm text-stone-400">
              The link you scanned has expired. Contact the chef directly to get connected.
            </p>
          </div>
        </div>
      )
    }

    if (resolved.reason === 'maxed') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4">
          <div className="mx-auto max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-semibold text-stone-100">Circle is full</h1>
            <p className="text-sm text-stone-400">
              This link has reached its join limit. Contact the chef directly to get connected.
            </p>
          </div>
        </div>
      )
    }

    notFound()
  }

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left: info panel */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-stone-950/55 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-white/5 blur-3xl" />

          <div className="relative space-y-6">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-200">
                {resolved.tokenType === 'event' ? 'Dinner Circle' : 'Chef Circle'}
              </span>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
                  {resolved.event?.title || `${resolved.chefName}'s Circle`}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300 sm:text-base">
                  {resolved.tokenType === 'event'
                    ? `${resolved.chefName} is hosting this dinner. Join the circle to stay in the loop.`
                    : `Join ${resolved.chefName}'s circle for updates on future dinners and events.`}
                </p>
              </div>
            </div>

            {resolved.event?.eventDate && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Event Date
                </p>
                <p className="mt-2 text-lg font-semibold text-stone-50">
                  {new Date(resolved.event.eventDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Chef
                </p>
                <p className="mt-2 text-sm font-medium text-stone-100">{resolved.chefName}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Access
                </p>
                <p className="mt-2 text-sm font-medium text-stone-100">No app needed</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Join Time
                </p>
                <p className="mt-2 text-sm font-medium text-stone-100">About 10 seconds</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {['Live updates', 'Event details', 'Direct from chef'].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: join form */}
        <section className="rounded-[32px] border border-white/10 bg-stone-900/85 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8">
          <JoinCircleForm
            token={token}
            chefName={resolved.chefName}
            eventTitle={resolved.event?.title}
          />
        </section>
      </div>

      <p className="mt-5 text-center text-xs text-stone-500">
        Powered by <span className="font-medium text-amber-500">ChefFlow</span>
      </p>
    </div>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const resolved = await resolveJoinToken(token)

  if (!resolved.valid) {
    return { title: 'Join Circle', robots: { index: false, follow: false } }
  }

  const title = resolved.event?.title
    ? `Join ${resolved.event.title}`
    : `Join ${resolved.chefName}'s Circle`

  const description =
    resolved.tokenType === 'event'
      ? `${resolved.chefName} is hosting a dinner. Scan the QR code to join the circle.`
      : `Join ${resolved.chefName}'s circle on ChefFlow for dinner updates and events.`

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', siteName: 'ChefFlow' },
    twitter: { card: 'summary', title, description },
  }
}

export const dynamic = 'force-dynamic'
