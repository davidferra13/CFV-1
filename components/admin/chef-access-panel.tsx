'use client'

// Admin Chef Access Panel - manage VIP and comp status for a chef account.
// VIP = inner circle (all features, focus mode bypass, no admin panel).
// Comped = pro-level access without payment.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { compChef, revokeComp, setVIPAccess } from '@/lib/admin/chef-admin-actions'
import { useRouter } from 'next/navigation'
import { Shield, Star, Zap, CheckCircle2 } from '@/components/ui/icons'

type Props = {
  chefId: string
  chefName: string
  subscriptionStatus: string | null
  accessLevel: string | null
}

export function ChefAccessPanel({ chefId, chefName, subscriptionStatus, accessLevel }: Props) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [reason, setReason] = useState('')
  const [vipNotes, setVipNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const isComped = subscriptionStatus === 'comped'
  const isVIP = accessLevel === 'vip'
  const isAdmin = accessLevel === 'admin'
  const isOwner = accessLevel === 'owner'
  const isPlatformPrivileged = isVIP || isAdmin || isOwner

  function handleComp() {
    if (!reason.trim()) {
      setFeedback({ ok: false, msg: 'Reason required.' })
      return
    }
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await compChef(chefId, reason)
        if (result.success) {
          setFeedback({ ok: true, msg: `${chefName} is now comped. Pro features unlocked, $0.` })
          setReason('')
          router.refresh()
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed.' })
        }
      } catch {
        toast.error('Failed to comp account')
      }
    })
  }

  function handleRevokeComp() {
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await revokeComp(chefId)
        if (result.success) {
          setFeedback({ ok: true, msg: 'Comp revoked. Dropped to free tier.' })
          router.refresh()
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed.' })
        }
      } catch {
        toast.error('Failed to revoke comp')
      }
    })
  }

  function handleGrantVIP() {
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await setVIPAccess(chefId, true, vipNotes || undefined)
        if (result.success) {
          setFeedback({ ok: true, msg: `${chefName} granted VIP access.` })
          setVipNotes('')
          router.refresh()
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed.' })
        }
      } catch {
        toast.error('Failed to grant VIP access')
      }
    })
  }

  function handleRevokeVIP() {
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await setVIPAccess(chefId, false)
        if (result.success) {
          setFeedback({ ok: true, msg: 'VIP access revoked.' })
          router.refresh()
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed.' })
        }
      } catch {
        toast.error('Failed to revoke VIP access')
      }
    })
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-700 bg-stone-800/50 flex items-center gap-2">
        <Shield size={14} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-stone-200">Access Management</h2>
      </div>

      <div className="p-4 space-y-5">
        {/* Current status display */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={subscriptionStatus ?? 'free'}
            color={
              isComped
                ? 'text-green-400 bg-green-950 border-green-800'
                : subscriptionStatus === 'active'
                  ? 'text-green-400 bg-green-950 border-green-800'
                  : subscriptionStatus === 'grandfathered'
                    ? 'text-blue-400 bg-blue-950 border-blue-800'
                    : 'text-stone-400 bg-stone-800 border-stone-700'
            }
            icon={<Zap size={10} />}
          />
          {isPlatformPrivileged && (
            <StatusBadge
              label={accessLevel!}
              color={
                isOwner
                  ? 'text-amber-400 bg-amber-950 border-amber-800'
                  : isAdmin
                    ? 'text-red-400 bg-red-950 border-red-800'
                    : 'text-purple-400 bg-purple-950 border-purple-800'
              }
              icon={<Star size={10} />}
            />
          )}
        </div>

        {/* Comp section */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Billing Tier
          </h3>
          {isComped ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-green-400">
                <CheckCircle2 size={14} />
                <span>Comped (Pro access, $0)</span>
              </div>
              <button
                onClick={handleRevokeComp}
                disabled={isPending}
                className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-800 rounded-lg hover:bg-red-950 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Revoking...' : 'Revoke Comp'}
              </button>
            </div>
          ) : subscriptionStatus === 'active' || subscriptionStatus === 'grandfathered' ? (
            <p className="text-sm text-stone-400">
              Already has paid/grandfathered access. Comping would cancel their Stripe subscription.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for comping (required)"
                  className="flex-1 max-w-sm px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  disabled={isPending}
                />
                <button
                  onClick={handleComp}
                  disabled={isPending || !reason.trim()}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Comping...' : 'Grant Comp'}
                </button>
              </div>
              <p className="text-xs text-stone-500">
                Unlocks all Pro features without payment. If they have a Stripe subscription, it
                will be canceled first.
              </p>
            </div>
          )}
        </div>

        {/* VIP section */}
        <div className="space-y-2 pt-3 border-t border-stone-800">
          <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Platform Access
          </h3>
          {isOwner || isAdmin ? (
            <p className="text-sm text-stone-400">
              {isOwner ? 'Owner' : 'Admin'} access. Cannot be changed to VIP from here.
            </p>
          ) : isVIP ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-purple-400">
                <Star size={14} />
                <span>VIP (all features, focus mode bypass)</span>
              </div>
              <button
                onClick={handleRevokeVIP}
                disabled={isPending}
                className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-800 rounded-lg hover:bg-red-950 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Revoking...' : 'Revoke VIP'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vipNotes}
                  onChange={(e) => setVipNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="flex-1 max-w-sm px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  disabled={isPending}
                />
                <button
                  onClick={handleGrantVIP}
                  disabled={isPending}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Granting...' : 'Grant VIP'}
                </button>
              </div>
              <p className="text-xs text-stone-500">
                Inner circle access. All features unlocked, focus mode bypassed. No admin panel.
              </p>
            </div>
          )}
        </div>

        {/* Feedback */}
        {feedback && (
          <p className={`text-xs ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({
  label,
  color,
  icon,
}: {
  label: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${color}`}
    >
      {icon}
      {label}
    </span>
  )
}
