'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChefHat, Save, CheckCircle } from 'lucide-react'
import { getCulinaryProfile, saveCulinaryProfileBulk } from '@/lib/ai/chef-profile-actions'
import type { CulinaryProfileAnswer } from '@/lib/ai/chef-profile-constants'

export default function CulinaryProfilePage() {
  const [answers, setAnswers] = useState<CulinaryProfileAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      const profile = await getCulinaryProfile()
      setAnswers(profile)
    } catch (err) {
      console.error('Failed to load culinary profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleChange = (questionKey: string, value: string) => {
    setAnswers((prev) =>
      prev.map((a) => (a.questionKey === questionKey ? { ...a, answer: value } : a))
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const data: Record<string, string> = {}
      for (const a of answers) {
        if (a.answer.trim()) {
          data[a.questionKey] = a.answer
        }
      }
      const result = await saveCulinaryProfileBulk(data)
      if (result.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Failed to save culinary profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const answeredCount = answers.filter((a) => a.answer.trim().length > 0).length
  const totalCount = answers.length

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-700 rounded w-1/3" />
          <div className="h-4 bg-stone-700 rounded w-2/3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-stone-700 rounded w-1/2" />
              <div className="h-20 bg-stone-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ChefHat className="h-7 w-7 text-brand-500" />
        <h1 className="text-2xl font-bold">Culinary Profile</h1>
      </div>

      <p className="text-stone-400 mb-6">
        Help Remy understand your food identity. These answers shape how Remy talks about food,
        suggests dishes, and understands your style. Answer as many or as few as you like — you can
        always come back.
      </p>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-stone-400 mb-1">
          <span>
            {answeredCount} of {totalCount} answered
          </span>
          <span>{Math.round((answeredCount / totalCount) * 100)}%</span>
        </div>
        <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${(answeredCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {answers.map((a, i) => (
          <div key={a.questionKey} className="space-y-2">
            <label htmlFor={a.questionKey} className="block text-sm font-medium text-stone-300">
              {i + 1}. {a.question}
            </label>
            <textarea
              id={a.questionKey}
              value={a.answer}
              onChange={(e) => handleChange(a.questionKey, e.target.value)}
              placeholder="Type your answer..."
              rows={3}
              className="w-full rounded-lg border border-stone-700 px-4 py-3 text-sm
                         focus:border-brand-500 focus:ring-1 focus:ring-brand-500
                         placeholder:text-stone-500 resize-none"
            />
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5
                     text-sm font-medium text-white hover:bg-brand-600
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Profile
            </>
          )}
        </button>

        {saved && (
          <span className="text-sm text-green-600">
            Remy will use your updated profile in future conversations.
          </span>
        )}
      </div>
    </div>
  )
}
