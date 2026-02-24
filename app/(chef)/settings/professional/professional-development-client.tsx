'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  createAchievement,
  deleteAchievement,
  createLearningGoal,
  completeLearningGoal,
  deleteLearningGoal,
  type AchievementInput,
} from '@/lib/professional/actions'
import { ACHIEVE_TYPE_LABELS, GOAL_CATEGORY_LABELS } from '@/lib/professional/constants'
import { format } from 'date-fns'

type Achievement = {
  id: string
  achieve_type: string
  title: string
  organization: string | null
  achieve_date: string | null
  outcome: string | null
  is_public: boolean
}
type Goal = {
  id: string
  title: string
  category: string
  target_date: string | null
  status: string
  description: string | null
}

const ACHIEVE_TYPES = Object.entries(ACHIEVE_TYPE_LABELS)
const GOAL_CATEGORIES = Object.entries(GOAL_CATEGORY_LABELS)

export function ProfessionalDevelopmentClient({
  initialAchievements,
  initialGoals,
}: {
  initialAchievements: Achievement[]
  initialGoals: Goal[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'achievements' | 'goals'>('achievements')

  // Achievement form
  const [showAchForm, setShowAchForm] = useState(false)
  const [achSaving, setAchSaving] = useState(false)
  const [achError, setAchError] = useState<string | null>(null)
  const [achForm, setAchForm] = useState({
    achieve_type: 'competition',
    title: '',
    organization: '',
    achieve_date: '',
    description: '',
    outcome: '',
    url: '',
    is_public: false,
  })

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    target_date: '',
    category: 'technique',
  })

  function updateAch(field: string, value: string | boolean) {
    setAchForm((prev) => ({ ...prev, [field]: value }))
  }
  function updateGoal(field: string, value: string) {
    setGoalForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAddAchievement(e: React.FormEvent) {
    e.preventDefault()
    setAchSaving(true)
    setAchError(null)
    try {
      await createAchievement({
        achieve_type: achForm.achieve_type as AchievementInput['achieve_type'],
        title: achForm.title,
        organization: achForm.organization || undefined,
        achieve_date: achForm.achieve_date || undefined,
        description: achForm.description || undefined,
        outcome: achForm.outcome || undefined,
        url: achForm.url || undefined,
        is_public: achForm.is_public,
      })
      setAchForm({
        achieve_type: 'competition',
        title: '',
        organization: '',
        achieve_date: '',
        description: '',
        outcome: '',
        url: '',
        is_public: false,
      })
      setShowAchForm(false)
      router.refresh()
    } catch (err) {
      setAchError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setAchSaving(false)
    }
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    setGoalSaving(true)
    setGoalError(null)
    try {
      await createLearningGoal({
        title: goalForm.title,
        description: goalForm.description || undefined,
        target_date: goalForm.target_date || undefined,
        category: goalForm.category as
          | 'technique'
          | 'cuisine'
          | 'business'
          | 'sustainability'
          | 'pastry'
          | 'beverage'
          | 'nutrition'
          | 'other',
        status: 'active' as const,
      })
      setGoalForm({ title: '', description: '', target_date: '', category: 'technique' })
      setShowGoalForm(false)
      router.refresh()
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setGoalSaving(false)
    }
  }

  async function handleCompleteGoal(id: string) {
    try {
      await completeLearningGoal(id)
      router.refresh()
    } catch {
      /* silent */
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-700">
        {(['achievements', 'goals'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-300'
            }`}
          >
            {t === 'achievements' ? 'Achievements' : 'Learning Goals'}
          </button>
        ))}
      </div>

      {tab === 'achievements' && (
        <div className="space-y-4">
          {initialAchievements.length === 0 && !showAchForm && (
            <p className="text-sm text-stone-500">No achievements logged yet.</p>
          )}
          {initialAchievements.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{a.title}</span>
                      <Badge variant="default">
                        {ACHIEVE_TYPE_LABELS[a.achieve_type] ?? a.achieve_type}
                      </Badge>
                      {a.is_public && <Badge variant="success">Public</Badge>}
                    </div>
                    {a.organization && <p className="text-sm text-stone-400">{a.organization}</p>}
                    {a.achieve_date && (
                      <p className="text-xs text-stone-400">
                        {format(new Date(a.achieve_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </p>
                    )}
                    {a.outcome && <p className="text-sm text-stone-300 mt-0.5">{a.outcome}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-stone-400 hover:text-red-600"
                    onClick={() => {
                      deleteAchievement(a.id)
                      router.refresh()
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {!showAchForm ? (
            <Button variant="secondary" size="sm" onClick={() => setShowAchForm(true)}>
              + Log Achievement
            </Button>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-base font-semibold mb-3">Log Achievement</h3>
                <form onSubmit={handleAddAchievement} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">Type</label>
                      <select
                        className="w-full rounded-md border border-stone-700 bg-surface px-3 py-2 text-sm"
                        value={achForm.achieve_type}
                        onChange={(e) => updateAch('achieve_type', e.target.value)}
                      >
                        {ACHIEVE_TYPES.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">Date</label>
                      <Input
                        type="date"
                        value={achForm.achieve_date}
                        onChange={(e) => updateAch('achieve_date', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-400 mb-1">
                        Title *
                      </label>
                      <Input
                        value={achForm.title}
                        onChange={(e) => updateAch('title', e.target.value)}
                        placeholder="e.g. Food & Wine Best New Chef finalist"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">
                        Organization
                      </label>
                      <Input
                        value={achForm.organization}
                        onChange={(e) => updateAch('organization', e.target.value)}
                        placeholder="Food & Wine Magazine"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">
                        Outcome / Result
                      </label>
                      <Input
                        value={achForm.outcome}
                        onChange={(e) => updateAch('outcome', e.target.value)}
                        placeholder="1st place, Featured, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">URL</label>
                      <Input
                        type="url"
                        value={achForm.url}
                        onChange={(e) => updateAch('url', e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={achForm.is_public}
                      onChange={(e) => updateAch('is_public', e.target.checked)}
                      className="rounded border-stone-600"
                    />
                    Show on public profile
                  </label>
                  {achError && <p className="text-xs text-red-600">{achError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={achSaving}>
                      {achSaving ? 'Saving…' : 'Add'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAchForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'goals' && (
        <div className="space-y-4">
          {initialGoals.filter((g) => g.status === 'active').length === 0 && !showGoalForm && (
            <p className="text-sm text-stone-500">No active learning goals.</p>
          )}
          {initialGoals
            .filter((g) => g.status === 'active')
            .map((g) => (
              <Card key={g.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-stone-100">{g.title}</span>
                        <Badge variant="default">
                          {GOAL_CATEGORY_LABELS[g.category] ?? g.category}
                        </Badge>
                      </div>
                      {g.description && <p className="text-sm text-stone-400">{g.description}</p>}
                      {g.target_date && (
                        <p className="text-xs text-stone-400">
                          Target: {format(new Date(g.target_date + 'T00:00:00'), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleCompleteGoal(g.id)}
                      >
                        Complete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-stone-400 hover:text-red-600"
                        onClick={() => {
                          deleteLearningGoal(g.id)
                          router.refresh()
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

          {initialGoals.filter((g) => g.status === 'completed').length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-500">Completed</h3>
              {initialGoals
                .filter((g) => g.status === 'completed')
                .map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-2 py-1 text-sm text-stone-400 line-through"
                  >
                    {g.title}
                  </div>
                ))}
            </div>
          )}

          {!showGoalForm ? (
            <Button variant="secondary" size="sm" onClick={() => setShowGoalForm(true)}>
              + Add Goal
            </Button>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-base font-semibold mb-3">New Learning Goal</h3>
                <form onSubmit={handleAddGoal} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-400 mb-1">
                        Goal *
                      </label>
                      <Input
                        value={goalForm.title}
                        onChange={(e) => updateGoal('title', e.target.value)}
                        placeholder="Master knife skills for butchery"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">
                        Category
                      </label>
                      <select
                        className="w-full rounded-md border border-stone-700 bg-surface px-3 py-2 text-sm"
                        value={goalForm.category}
                        onChange={(e) => updateGoal('category', e.target.value)}
                      >
                        {GOAL_CATEGORIES.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">
                        Target date
                      </label>
                      <Input
                        type="date"
                        value={goalForm.target_date}
                        onChange={(e) => updateGoal('target_date', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-stone-400 mb-1">
                        Description
                      </label>
                      <Input
                        value={goalForm.description}
                        onChange={(e) => updateGoal('description', e.target.value)}
                        placeholder="Optional detail"
                      />
                    </div>
                  </div>
                  {goalError && <p className="text-xs text-red-600">{goalError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={goalSaving}>
                      {goalSaving ? 'Saving…' : 'Add Goal'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGoalForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
