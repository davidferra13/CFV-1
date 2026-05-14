'use client'

import { toast } from 'sonner'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

const TOAST_STYLE = {
  background: '#3a2115',
  color: '#ffd6a3',
  border: '1px solid rgba(232, 169, 107, 0.25)',
  borderRadius: '10px',
  fontSize: '13px',
}

const UNDO_STYLE = {
  marginLeft: '8px',
  padding: '2px 8px',
  borderRadius: '6px',
  background: 'rgba(232, 169, 107, 0.18)',
  color: '#ffd6a3',
  border: '1px solid rgba(232, 169, 107, 0.3)',
  cursor: 'pointer' as const,
  fontSize: '12px',
  fontWeight: 600,
}

/** Show toast when item is hidden, with undo callback */
export function showDiscoveryHideToast(item: DiscoveryRailItem, onUndo: () => void): void {
  toast(`Hidden "${item.label}"`, {
    duration: 5000,
    style: TOAST_STYLE,
    action: {
      label: 'Undo',
      onClick: onUndo,
    },
    actionButtonStyle: UNDO_STYLE,
  })
}

/** Show toast when item is pinned/unpinned */
export function showDiscoveryPinToast(item: DiscoveryRailItem, pinned: boolean): void {
  toast(pinned ? `Pinned "${item.label}"` : `Unpinned "${item.label}"`, {
    duration: 3000,
    style: TOAST_STYLE,
  })
}

/** Show toast when "more like this" is activated */
export function showDiscoveryLoveToast(item: DiscoveryRailItem): void {
  toast(`Got it, more like "${item.label}"`, {
    duration: 3000,
    style: TOAST_STYLE,
  })
}
