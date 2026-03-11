'use client'

// Admin Chef Danger Zone — suspend or reactivate a chef account
// Requires typing the chef name to confirm before suspending.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { suspendChef, reactivateChef } from '@/lib/admin/chef-admin-actions'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from '@/components/ui/icons'

type Props = {
  chefId: string
  chefName: string
  currentStatus: 'active' | 'suspended'
}

export function ChefDangerZone({ chefId, chefName, currentStatus }: Props) {
  const [confirmText, setConfirmText] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const isSuspended = currentStatus === 'suspended'
  const confirmMatch = confirmText.trim().toLowerCase() === chefName.trim().toLowerCase()

  function handleSuspend() {
    if (!confirmMatch) return
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await suspendChef(chefId)
        if (result.success) {
          setFeedback({ ok: true, msg: 'Chef account suspended. They can no longer log in.' })
          setConfirmText('')
          router.refresh()
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed.' })
        }
      } catch (err) {
        toast.error('Failed to suspend chef account')
      }
    })
  }

  function handleReactivate() {
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await reactivateChef(chefId)
        if (result.success) {
          setFeedback({ ok: true, msg: 'Chef account reactivated.' })
          router.refresh()
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed.' })
        }
      } catch (err) {
        toast.error('Failed to reactivate chef account')
      }
    })
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-red-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-red-100 bg-red-950 flex items-center gap-2">
        <AlertTriangle size={14} className="text-red-500" />
        <h2 className="text-sm font-semibold text-red-200">Danger Zone</h2>
      </div>
      <div className="p-4 space-y-4">
        {isSuspended ? (
          <div className="space-y-3">
            <div className="bg-amber-950 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-200">
              This account is currently <strong>suspended</strong>. The chef cannot log in.
            </div>
            <button
              onClick={handleReactivate}
              disabled={isPending}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Reactivating…' : 'Reactivate Account'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Suspending this account will immediately block <strong>{chefName}</strong> from
              logging in. Their data is preserved. You can reactivate at any time.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Type <strong>{chefName}</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={chefName}
                className="w-full max-w-xs px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800"
                disabled={isPending}
              />
            </div>
            <button
              onClick={handleSuspend}
              disabled={isPending || !confirmMatch}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Suspending…' : 'Suspend Account'}
            </button>
          </div>
        )}
        {feedback && (
          <p className={`text-xs mt-1 ${feedback.ok ? 'text-green-600' : 'text-red-600'}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </div>
  )
}
