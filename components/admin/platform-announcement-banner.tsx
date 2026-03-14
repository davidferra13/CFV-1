'use client'

// Platform Announcement Banner — shown at the top of the chef portal when set by admin.
// Dismissable per session (stored in sessionStorage).

import { useState, useEffect } from 'react'
import { X, Info, AlertTriangle, AlertOctagon } from 'lucide-react'
import type { AnnouncementType } from '@/lib/admin/platform-actions'

type Props = {
  text: string
  type: AnnouncementType
}

const STYLES: Record<AnnouncementType, { wrapper: string; icon: React.ReactNode }> = {
  info: {
    wrapper: 'bg-blue-950 border-b border-blue-200 text-blue-800',
    icon: <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />,
  },
  warning: {
    wrapper: 'bg-amber-950 border-b border-amber-200 text-amber-800',
    icon: <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />,
  },
  critical: {
    wrapper: 'bg-red-950 border-b border-red-200 text-red-800',
    icon: <AlertOctagon size={15} className="text-red-500 shrink-0 mt-0.5" />,
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
