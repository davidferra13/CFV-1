import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { checkRateLimit } from '@/lib/rateLimit'
import { getMenuByToken } from '@/lib/menus/menu-share-actions'
import { MenuPickClient } from './menu-pick-client'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const menu = await getMenuByToken(token)

  if (!menu) {
    return { title: 'Menu Not Found' }
  }

  const chefLabel = menu.chefName || 'Your Chef'

  return {
    title: `Pick Your Menu - ${chefLabel}`,
    description: `Select your dishes for ${menu.eventOccasion || 'the event'}`,
    robots: { index: false, follow: false },
  }
}

export default async function MenuPickPage({ params }: Props) {
  const { token } = await params
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`menu-pick-page:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const menu = await getMenuByToken(token)

  if (!menu) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-stone-950 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <MenuPickClient menu={menu} token={token} />
      </div>
    </div>
  )
}
