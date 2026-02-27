import { requireAdmin } from '@/lib/auth/admin'
import { getProspect, getProspectNotes } from '@/lib/prospecting/actions'
import { getScriptForCategory } from '@/lib/prospecting/script-actions'
import { getOutreachLog } from '@/lib/prospecting/pipeline-actions'
import { notFound } from 'next/navigation'
import { ProspectDossierClient } from './dossier-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProspectDossierPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const [prospect, notes, outreachLog] = await Promise.all([
    getProspect(id),
    getProspectNotes(id),
    getOutreachLog(id),
  ])

  if (!prospect) notFound()

  // Try to load a matching call script
  let script = null
  try {
    script = await getScriptForCategory(prospect.category)
  } catch {
    // No script available
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ProspectDossierClient
        prospect={prospect}
        notes={notes}
        script={script}
        outreachLog={outreachLog}
      />
    </div>
  )
}
