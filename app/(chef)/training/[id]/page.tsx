import { getSOP } from '@/lib/training/sop-actions'
import { SOPViewer } from '@/components/training/sop-viewer'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'SOP | ChefFlow',
}

export default async function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sop, error } = await getSOP(id)

  if (!sop) {
    redirect('/training')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {error ? (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          Could not load SOP: {error}
        </div>
      ) : (
        <SOPViewer sop={sop} />
      )}
    </div>
  )
}
