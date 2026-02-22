import { requireAdmin } from '@/lib/auth/admin'
import { getCallScripts } from '@/lib/prospecting/script-actions'
import { ScriptsPageClient } from './scripts-client'

export default async function ProspectingScriptsPage() {
  await requireAdmin()
  const scripts = await getCallScripts()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1>Call Scripts</h1>
        <p className="text-sm text-stone-500 mt-1">
          Reusable cold-calling scripts. Assign scripts to prospect categories for auto-suggest
          during calls.
        </p>
      </div>

      <ScriptsPageClient scripts={scripts} />
    </div>
  )
}
