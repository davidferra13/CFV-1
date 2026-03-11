import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { CreativeProjectCard } from '@/components/professional/creative-project-card'
import { CreativeProjectForm } from '@/components/professional/creative-project-form'

export default async function MyKitchenPage() {
  const chef = await requireChef()
  const supabase: any = createServerClient()
  const { data: projects } = await supabase
    .from('chef_creative_projects')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: false })

  const experimenting = (projects ?? []).filter((p: any) => p.status === 'experimenting')
  const nearlyThere = (projects ?? []).filter((p: any) => p.status === 'nearly_there')
  const mastered = (projects ?? []).filter((p: any) => p.status === 'mastered')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">My Kitchen</h1>
        <p className="text-sm text-stone-500 mt-1">
          Your creative space for experimenting with new dishes and techniques.
        </p>
      </div>

      <CreativeProjectForm />

      {experimenting.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-200 mb-3">Experimenting</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {experimenting.map((p: any) => (
              <CreativeProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      {nearlyThere.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-200 mb-3">Nearly There</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {nearlyThere.map((p: any) => (
              <CreativeProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      {mastered.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-amber-200 mb-3">Mastered</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {mastered.map((p: any) => (
              <CreativeProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      {(projects ?? []).length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg">No creative projects yet.</p>
          <p className="text-sm mt-1">Use the form above to start experimenting with a new dish.</p>
        </div>
      )}
    </div>
  )
}
