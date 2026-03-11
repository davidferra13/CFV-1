'use client'

import { useState, useEffect, useTransition } from 'react'
import { Copy, Share2, Gift, Users, CheckCircle2 } from 'lucide-react'
import { getClientReferralStats, type ReferralStats } from '@/lib/referrals/actions'

export function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await getClientReferralStats()
        if (mounted) setStats(data)
      } catch (err) {
        if (mounted) setError('Could not load referral data')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  async function handleCopy() {
    if (!stats?.referralUrl) return
    try {
      await navigator.clipboard.writeText(stats.referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement('textarea')
      textarea.value = stats.referralUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleShare() {
    if (!stats?.referralUrl) return
    if (navigator.share) {
      navigator
        .share({
          title: 'Book your next private chef experience',
          text: 'I had an amazing experience with my private chef. Use my referral link to book!',
          url: stats.referralUrl,
        })
        .catch(() => {
          // User cancelled or share not supported
        })
    } else {
      handleCopy()
    }
  }

  function handleEmailShare() {
    if (!stats?.referralUrl) return
    const subject = encodeURIComponent('You should try this private chef!')
    const body = encodeURIComponent(
      `I had a wonderful private chef experience and wanted to share it with you.\n\n` +
        `Book using my referral link and we both earn rewards:\n${stats.referralUrl}`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-10 bg-gray-200 rounded w-full" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
        {error || 'Referral program not available'}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Refer a Friend</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Share your link and earn rewards when friends book their first event.
        </p>
      </div>

      {/* Referral Link */}
      <div className="px-6 py-4 space-y-4">
        {stats.referralUrl && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Your Referral Link
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                readOnly
                value={stats.referralUrl}
                className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 truncate"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {stats.referralCode && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Referral Code
            </label>
            <p className="mt-1 font-mono text-lg font-bold text-gray-900 tracking-wider">
              {stats.referralCode}
            </p>
          </div>
        )}

        {/* Share Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={handleEmailShare}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Email a Friend
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalReferrals}</p>
            <p className="text-xs text-gray-500">Friends Referred</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completedReferrals}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Gift className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalPointsEarned}</p>
            <p className="text-xs text-gray-500">Points Earned</p>
          </div>
        </div>

        {/* Recent Referrals */}
        {stats.referrals.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Referrals</h4>
            <ul className="space-y-2">
              {stats.referrals.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{r.referredName || 'Friend'}</span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      r.eventCompleted ? 'text-green-200' : 'text-amber-600'
                    }`}
                  >
                    {r.eventCompleted ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />+{r.pointsAwarded} pts
                      </>
                    ) : (
                      'Pending'
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
