'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleBetaSurveyActive } from '@/lib/beta-survey/actions'

export function BetaSurveyListActions({
  surveyId,
  isActive,
}: {
  surveyId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      await toggleBetaSurveyActive(surveyId, !isActive)
      router.refresh()
    } catch (err) {
      console.error('[toggleActive]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        isActive
          ? 'bg-red-900/50 text-red-300 hover:bg-red-900'
          : 'bg-green-900/50 text-green-300 hover:bg-green-900'
      }`}
    >
      {loading ? '...' : isActive ? 'Deactivate' : 'Activate'}
    </button>
  )
}
