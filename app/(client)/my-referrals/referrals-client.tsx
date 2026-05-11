'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Gift, UserPlus, CheckCircle, Clock, Trophy } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ClientReferral, ReferralStats } from '@/lib/referrals/client-referral-actions'

const STATUS_CONFIG: Record<
  ClientReferral['status'],
  { label: string; color: string; icon: typeof Clock }
> = {
  invited: { label: 'Invited', color: 'text-stone-400', icon: Clock },
  signed_up: { label: 'Signed Up', color: 'text-blue-400', icon: UserPlus },
  first_event_completed: { label: 'First Event', color: 'text-emerald-400', icon: CheckCircle },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ReferralsClient({
  referrals,
  stats,
}: {
  referrals: ClientReferral[]
  stats: ReferralStats
}) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    if (!stats.referralCode) return
    try {
      await navigator.clipboard.writeText(stats.referralCode)
      setCopied(true)
      toast.success('Referral code copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <UserPlus className="w-6 h-6 text-brand-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-stone-100">{stats.totalReferred}</p>
            <p className="text-xs text-stone-500 mt-1">Friends Invited</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-stone-100">{stats.totalSignedUp}</p>
            <p className="text-xs text-stone-500 mt-1">Signed Up</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-stone-100">{stats.totalPointsEarned}</p>
            <p className="text-xs text-stone-500 mt-1">Points Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code */}
      {stats.referralCode && (
        <Card className="border-brand-600/30 bg-brand-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-400">Your Referral Code</p>
                <p className="text-xl font-mono font-bold text-stone-100 mt-1">
                  {stats.referralCode}
                </p>
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral List */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="py-8 text-center">
              <Gift className="w-10 h-10 text-stone-600 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No referrals yet.</p>
              <p className="text-stone-500 text-xs mt-1">
                Share your code with friends to start earning rewards.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-800">
              {referrals.map((ref) => {
                const config = STATUS_CONFIG[ref.status]
                const StatusIcon = config.icon
                return (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-5 h-5 ${config.color}`} />
                      <div>
                        <p className="text-sm font-medium text-stone-100">
                          {ref.referredName || ref.referredEmail || 'Pending'}
                        </p>
                        <p className="text-xs text-stone-500">{formatDate(ref.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                      {ref.pointsAwarded > 0 && (
                        <span className="text-xs font-medium text-amber-400">
                          +{ref.pointsAwarded} pts
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
