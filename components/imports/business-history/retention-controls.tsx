import { deleteBusinessHistoryFindings } from '@/lib/business-history-import/actions'

export function BusinessHistoryRetentionControls() {
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-100">Retention and deletion</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500">
            Staged email findings stay tenant-scoped. Use these controls to remove reviewed findings
            after import decisions. Pending findings are intentionally excluded so active review
            work cannot be deleted by accident.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={deleteBusinessHistoryFindings}>
            <input type="hidden" name="status" value="dismissed" />
            <input type="hidden" name="olderThanDays" value="0" />
            <button className="rounded-md border border-stone-700 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800">
              Delete dismissed
            </button>
          </form>
          <form action={deleteBusinessHistoryFindings}>
            <input type="hidden" name="status" value="imported" />
            <input type="hidden" name="olderThanDays" value="30" />
            <button className="rounded-md border border-stone-700 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800">
              Delete imported older than 30 days
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
