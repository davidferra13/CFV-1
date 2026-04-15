// Embeddable inquiry form page - loaded inside an iframe on external websites
// No auth required. Resolves chef by ID, renders a clean booking form.
// Submits to /api/embed/inquiry (CORS-enabled API route)

import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/db/admin'
import { EmbedInquiryForm } from '@/components/embed/embed-inquiry-form'
import { notFound } from 'next/navigation'

interface Props {
  params: { chefId: string }
  searchParams: { accent?: string; theme?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const db: any = createAdminClient()
  const { data: chef } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', params.chefId)
    .single()

  const name = chef?.business_name || chef?.display_name || 'Private Chef'

  return {
    title: `Book ${name} - ChefFlow`,
    robots: { index: false, follow: false },
  }
}

export default async function EmbedInquiryPage({ params, searchParams }: Props) {
  const db: any = createAdminClient()

  const { data: chef, error } = await db
    .from('chefs')
    .select('id, business_name, display_name, profile_image_url')
    .eq('id', params.chefId)
    .single()

  if (error || !chef) {
    notFound()
  }

  const chefName = (chef.business_name as string) || (chef.display_name as string) || 'Your Chef'
  const rawAccent = searchParams.accent || ''
  const isValidHex = /^#?[0-9a-fA-F]{3,8}$/.test(rawAccent)
  const accentColor = isValidHex
    ? rawAccent.startsWith('#')
      ? rawAccent
      : `#${rawAccent}`
    : '#e88f47'
  const theme = searchParams.theme === 'dark' ? 'dark' : 'light'

  return (
    <div className={theme === 'dark' ? 'dark' : undefined}>
      <div
        className="min-h-screen p-4 md:p-6"
        style={{
          backgroundColor: theme === 'dark' ? 'var(--surface-1)' : 'transparent',
        }}
      >
        <EmbedInquiryForm
          chefId={chef.id as string}
          chefName={chefName}
          profileImageUrl={(chef.profile_image_url as string) || null}
          accentColor={accentColor}
          theme={theme}
        />
      </div>
    </div>
  )
}
