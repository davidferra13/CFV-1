import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'
import { getMyDefaultKnowledgeSettings } from '@/lib/clients/client-default-knowledge-actions'
import {
  buildClientDefaultKnowledgeApplication,
  buildClientDefaultKnowledgeRestatementContract,
} from '@/lib/clients/client-default-knowledge'

export const metadata: Metadata = {
  title: 'Book Now',
}

export default async function BookNowPage({
  searchParams,
}: {
  searchParams: Promise<{ circleId?: string }>
}) {
  const params = await searchParams
  const user = await requireClient()
  const db: any = createServerClient()

  // Look up the chef's name and slug from the client's tenant
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, public_slug')
    .eq('id', user.tenantId!)
    .single()

  // Look up the client profile for pre-fill
  const { data: clientProfile } = await db
    .from('clients')
    .select('full_name, email, phone, address, dietary_restrictions, allergies')
    .eq('id', user.entityId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const chefData = chef as Record<string, unknown> | null
  const chefName =
    (chefData?.display_name as string) ?? (chefData?.business_name as string) ?? 'Your Chef'
  const chefSlug = (chefData?.public_slug as string) ?? ''

  const profile = clientProfile as Record<string, unknown> | null
  const defaultKnowledge = await getMyDefaultKnowledgeSettings()
  const bookingDefaults = buildClientDefaultKnowledgeApplication(defaultKnowledge, 'booking')
  const bookingRestatementContract = buildClientDefaultKnowledgeRestatementContract(
    defaultKnowledge,
    'booking'
  )
  const defaultByFormField = new Map(
    bookingDefaults.appliedFields.map((field) => [field.formField, field.value])
  )
  const dietaryNotes = [
    formatListValue(profile?.dietary_restrictions),
    formatListValue(profile?.allergies),
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <div className="max-w-2xl mx-auto">
      <PublicInquiryForm
        chefSlug={chefSlug}
        chefName={chefName}
        primaryColor="#1c1917"
        circleId={params.circleId}
        defaultValues={{
          full_name: (profile?.full_name as string) ?? '',
          email: (profile?.email as string) ?? user.email ?? '',
          phone: (profile?.phone as string) ?? '',
          address: (profile?.address as string) ?? '',
          dietary_notes: dietaryNotes || defaultByFormField.get('dietary_notes') || '',
          guest_count: defaultByFormField.get('guest_count') ?? '',
          budget: defaultByFormField.get('budget') ?? '',
          known_defaults: bookingDefaults.bannerItems,
        }}
        defaultKnowledgeContract={bookingRestatementContract}
      />
    </div>
  )
}

function formatListValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ')
  }
  return typeof value === 'string' ? value.trim() : ''
}
