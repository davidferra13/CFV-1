import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { MentionFeed } from '@/components/reputation/mention-feed'

export default async function MentionsPage() {
  const chef = await requireChef()
  const supabase = createServerClient()
  const { data } = await (supabase as any)
    .from('chef_brand_mentions')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('found_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Brand Mentions</h1>
        <p className="text-sm text-stone-500 mt-1">
          Monitor where your brand appears online and respond to reviews.
        </p>
      </div>
      <MentionFeed mentions={data ?? []} />
    </div>
  )
}
