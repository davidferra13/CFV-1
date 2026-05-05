import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { checkRateLimit } from '@/lib/rateLimit'
import { getCatalogByToken } from '@/lib/menus/catalog-selection-actions'
import { CatalogPickClient } from './catalog-pick-client'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const catalog = await getCatalogByToken(token).catch(() => null)

  if (!catalog) {
    return { title: 'Menu Not Found' }
  }

  const chefLabel = catalog.chefName || 'Your Chef'

  return {
    title: `Pick Your Courses - ${chefLabel}`,
    description: catalog.description || `Select your courses from ${chefLabel}'s menu`,
    robots: { index: false, follow: false },
  }
}

export default async function CatalogPickPage({ params }: Props) {
  const { token } = await params
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`catalog-pick-page:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const catalog = await getCatalogByToken(token).catch(() => null)

  if (!catalog) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-stone-950 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <CatalogPickClient catalog={catalog} token={token} />
      </div>
    </div>
  )
}
