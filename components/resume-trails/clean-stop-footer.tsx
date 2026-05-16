import { Save } from 'lucide-react'

import type { ResumeTrail } from '@/lib/resume-trails'
import { cn } from '@/lib/utils'

export interface CleanStopFooterProps {
  trail?: ResumeTrail | null
  action?: string
  className?: string
  name?: string
}

export function CleanStopFooter({
  trail,
  action,
  className,
  name = 'next_action',
}: CleanStopFooterProps) {
  if (!trail && !action) {
    return null
  }

  return (
    <form
      action={action}
      className={cn(
        'rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950',
        className
      )}
    >
      {trail ? <input type="hidden" name="resume_trail_id" value={trail.id} /> : null}

      <label
        htmlFor="clean-stop-next-action"
        className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400"
      >
        Next
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <textarea
          id="clean-stop-next-action"
          name={name}
          rows={2}
          defaultValue={trail?.nextAction ?? ''}
          placeholder="Write the first step for next time"
          className="min-h-16 flex-1 resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50 dark:focus:border-stone-600 dark:focus:ring-stone-800"
        />
        <button
          type="submit"
          disabled={!action}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Save
        </button>
      </div>
    </form>
  )
}
