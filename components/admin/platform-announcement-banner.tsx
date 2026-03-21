'use client'

// Platform Announcement Banner - shown at the top of the chef portal when set by admin.
// Dismissable per session (stored in sessionStorage).

import { useState, useEffect } from 'react'
import { X, Info, AlertTriangle, AlertOctagon } from '@/components/ui/icons'
import type { AnnouncementType } from '@/lib/admin/platform-actions'

type Props = {
  text: string
  type: AnnouncementType
}

const STYLES: Record<AnnouncementType, { wrapper: string; icon: React.ReactNode }> = {
  info: {
    wrapper:
      'bg-brand-100 border-b border-brand-200 text-brand-900 dark:bg-brand-950 dark:border-brand-800 dark:text-brand-100',
    icon: <Info size={15} className="text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />,
  },
  warning: {
    wrapper:
      'bg-amber-100 border-b border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100',
    icon: (
      <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
    ),
  },
  critical: {
    wrapper:
      'bg-red-100 border-b border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
    icon: <AlertOctagon size={15} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />,
  },
}

export function PlatformAnnouncementBanner({ text, type }: Props) {
  const dismissKey = `announcement_dismissed_${btoa(text).slice(0, 16)}`
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if not dismissed this session
    const dismissed = sessionStorage.getItem(dismissKey)
    if (!dismissed) setVisible(true)
  }, [dismissKey])

  if (!visible) return null

  const { wrapper, icon } = STYLES[type] ?? STYLES.info

  function dismiss() {
    sessionStorage.setItem(dismissKey, '1')
    setVisible(false)
  }

  return (
    <div className={`w-full px-4 py-2.5 flex items-start gap-3 ${wrapper}`}>
      {icon}
      <p className="flex-1 text-sm font-medium">{text}</p>
      <button
        onClick={dismiss}
        className="p-0.5 rounded hover:bg-black/10 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
