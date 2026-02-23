// Embeddable inquiry form page — loaded inside an iframe on external websites
// No auth required. Resolves chef by ID, renders a clean booking form.
// Submits to /api/embed/inquiry (CORS-enabled API route)

import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { EmbedInquiryForm } from '@/components/embed/embed-inquiry-form'
import { notFound } from 'next/navigation'

interface Props {
  params: { chefId: string }
  searchParams: { accent?: string; theme?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data: chef } = await supabase
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
  const supabase = createAdminClient()

  const { data: chef, error } = await supabase
    .from('chefs')
    .select('id, business_name, display_name, profile_image_url')
    .eq('id', params.chefId)
    .single()

  if (error || !chef) {
    notFound()
  }

  const chefName = (chef.business_name as string) || (chef.display_name as string) || 'Your Chef'
  const accentColor = searchParams.accent || '#e88f47' // Default to ChefFlow brand color
  const theme = searchParams.theme === 'dark' ? 'dark' : 'light'

  return (
    <div
      className="p-4 md:p-6"
      style={{
        backgroundColor: theme === 'dark' ? '#1c1917' : 'transparent',
        minHeight: '100vh',
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
  )
}
