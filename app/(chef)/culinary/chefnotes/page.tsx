import { BookOpen } from '@/components/ui/icons'
import { getChefNotes, getChefNoteStats, getNoteTopTags } from '@/lib/chef/knowledge/note-actions'
import { CHEFTIP_CATEGORIES } from '@/lib/chef/knowledge/tip-types'
import { ChefNotesArchive } from './chefnotes-archive'
import { KnowledgeTabs } from '@/components/knowledge/knowledge-tabs'

export const metadata = {
  title: 'ChefNotes | ChefFlow',
}

export default async function ChefNotesPage() {
  const [{ notes, total }, stats, topTags] = await Promise.all([
    getChefNotes({ limit: 20 }),
    getChefNoteStats(),
    getNoteTopTags(),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-semibold text-stone-200">ChefNotes</h1>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Your knowledge library. Journal entries and reference docs.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Journal" value={stats.journal} />
        <StatCard label="Reference" value={stats.reference} />
        <StatCard label="This Month" value={stats.thisMonth} />
      </div>

      <KnowledgeTabs mode="notes" myLabel="My Notes">
        <ChefNotesArchive
          initialNotes={notes}
          initialTotal={total}
          categories={CHEFTIP_CATEGORIES}
          topTags={topTags}
        />
      </KnowledgeTabs>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/30 px-3 py-2 text-center">
      <p className="text-lg font-semibold text-stone-200">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-stone-500">{label}</p>
    </div>
  )
}
