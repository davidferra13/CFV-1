// Public Open Tables Discovery - browse a chef's open tables without auth
import { createServerClient } from '@/lib/supabase/server'
import { PublicOpenTablesView } from './public-open-tables-view'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ chefId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chefId } = await params
  const supabase = createServerClient({ admin: true })
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', chefId)
    .single()

  return {
    title: `Open Tables${chef ? ` - ${chef.business_name}` : ''} | ChefFlow`,
    description: 'Discover open dinner tables and join the party',
  }
}

export default async function PublicOpenTablesPage({ params }: Props) {
  const { chefId } = await params
  const supabase = createServerClient({ admin: true })

  // Verify chef exists
  const { data: chef } = await supabase
    .from('chefs')
    .select('id, business_name')
    .eq('id', chefId)
    .single()

  if (!chef) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <p className="text-stone-400">Chef not found</p>
      </div>
    )
  }

  // Get open tables for this chef
  const { data: tables } = await supabase
    .from('hub_groups')
    .select(
      `
      id, name, description, display_area, display_vibe, dietary_theme,
      open_seats, emoji, closes_at
    `
    )
    .eq('is_open_table', true)
    .eq('visibility', 'public')
    .eq('consent_status', 'ready')
    .eq('is_active', true)
    .eq('tenant_id', chefId)

  return (
    <PublicOpenTablesView
      chefName={chef.business_name}
      chefId={chef.id}
      tables={(tables || []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        displayArea: t.display_area,
        displayVibe: t.display_vibe || [],
        dietaryTheme: t.dietary_theme || [],
        openSeats: t.open_seats,
        emoji: t.emoji,
        closesAt: t.closes_at,
      }))}
    />
  )
}
