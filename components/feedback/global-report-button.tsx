'use client'

import { useState } from 'react'
import { Flag } from '@/components/ui/icons'
import { ReportIssueDialog } from './report-issue-dialog'

/**
 * Issue report trigger for portal shells.
 * Rendered inline by navigation surfaces so it stays reachable without floating over the app.
 */
export function GlobalReportButton({
  collapsed = false,
  className,
}: {
  collapsed?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const buttonClassName = collapsed
    ? 'mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-800 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-900'
    : 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-800 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-900'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={collapsed ? 'Report an issue' : undefined}
        title="Report an issue"
        className={`${buttonClassName} ${className ?? ''}`}
      >
        <Flag className="h-[18px] w-[18px] flex-shrink-0" />
        {!collapsed && <span>Report Issue</span>}
      </button>
      <ReportIssueDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
