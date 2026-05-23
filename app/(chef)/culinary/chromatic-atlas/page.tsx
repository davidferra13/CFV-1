import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { ChromaticAtlasClient } from './chromatic-atlas-client'

export const metadata: Metadata = {
  title: 'Chromatic Flavor Atlas',
}

export default async function ChromaticFlavorAtlasPage() {
  await requireChef()

  return <ChromaticAtlasClient />
}
