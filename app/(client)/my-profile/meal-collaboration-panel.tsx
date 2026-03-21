'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  createMyMealRequest,
  respondToMyRecurringRecommendation,
  updateMyServedDishFeedback,
  withdrawMyMealRequest,
  type CreateMealRequestInput,
  type ServedDishHistoryEntry,
  type ClientMealRequestEntry,
  type RecurringRecommendationEntry,
} from '@/lib/clients/client-profile-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface MealCollaborationPanelProps {
  history: ServedDishHistoryEntry[]
  requests: ClientMealRequestEntry[]
  recommendations: RecurringRecommendationEntry[]
}

const REQUEST_LABELS: Record<ClientMealRequestEntry['request_type'], string> = {
  repeat_dish: 'Request Again',
  new_idea: 'New Dish Idea',
  avoid_dish: 'Avoid This Dish',
}

const STATUS_VARIANTS: Record<
  ClientMealRequestEntry['status'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  requested: 'warning',
  reviewed: 'info',
  scheduled: 'info',
  fulfilled: 'success',
  declined: 'error',
  withdrawn: 'default',
}

const REACTION_COLORS: Record<string, string> = {
  loved: 'text-emerald-400',
  liked: 'text-brand-400',
  neutral: 'text-stone-400',
  disliked: 'text-red-400',
}
const RECOMMENDATION_STATUS_VARIANTS: Record<
  RecurringRecommendationEntry['status'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  sent: 'info',
  approved: 'success',
  revision_requested: 'warning',
}

const REQUEST_TYPE_FIELD_ID = 'meal-request-type'
const PRIORITY_FIELD_ID = 'meal-request-priority'

function formatStatus(status: ClientMealRequestEntry['status']) {
  return status.slice(0, 1).toUpperCase() + status.slice(1)
}

export function MealCollaborationPanel({
  history,
  requests,
  recommendations,
}: MealCollaborationPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [requestType, setRequestType] = useState<CreateMealRequestInput['request_type']>('new_idea')
  const [dishName, setDishName] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<CreateMealRequestInput['priority']>('normal')
  const [weekStart, setWeekStart] = useState('')
  const [recommendationNotes, setRecommendationNotes] = useState<Record<string, string>>({})
  const [historyQuery, setHistoryQuery] = useState('')
  const [historyLimit, setHistoryLimit] = useState(80)

  const filteredHistory = useMemo(() => {
    const query = historyQuery.trim().toLowerCase()
    if (!query) return history
    return history.filter((entry) => entry.dish_name.toLowerCase().includes(query))
  }, [history, historyQuery])
  const visibleHistory = useMemo(
    () => filteredHistory.slice(0, Math.max(20, historyLimit)),
    [filteredHistory, historyLimit]
  )

  const preferenceInsights = useMemo(() => {
    const dishMap = new Map<
      string,
      {
        dishName: string
        servings: number
        loved: number
        liked: number
        disliked: number
      }
    >()

    for (const item of history) {
      const key = item.dish_name.trim().toLowerCase()
      if (!key) continue
      const current = dishMap.get(key) ?? {
        dishName: item.dish_name,
        servings: 0,
        loved: 0,
        liked: 0,
        disliked: 0,
      }
      current.servings += 1
      if (item.client_reaction === 'loved') current.loved += 1
      if (item.client_reaction === 'liked') current.liked += 1
      if (item.client_reaction === 'disliked') current.disliked += 1
      dishMap.set(key, current)
    }

    return Array.from(dishMap.values())
      .sort((a, b) => {
        const scoreA = a.loved * 3 + a.liked * 2 + a.servings - a.disliked * 2
        const scoreB = b.loved * 3 + b.liked * 2 + b.servings - b.disliked * 2
        return scoreB - scoreA
      })
      .slice(0, 6)
  }, [history])

  const repeatRequestLeaders = useMemo(() => {
    const counts = new Map<string, { dishName: string; count: number }>()
    for (const req of requests) {
      if (req.request_type !== 'repeat_dish') continue
      const key = req.dish_name.trim().toLowerCase()
      if (!key) continue
      const current = counts.get(key) ?? { dishName: req.dish_name, count: 0 }
      current.count += 1
      counts.set(key, current)
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [requests])

  const clearMessage = () => {
    setError(null)
    setSuccess(null)
  }

  const submitRequest = (input: CreateMealRequestInput, successMessage: string) => {
    clearMessage()
    startTransition(async () => {
      try {
        await createMyMealRequest(input)
        setSuccess(successMessage)
        setDishName('')
        setNotes('')
        setWeekStart('')
      } catch (err: any) {
        setError(err?.message || 'Could not submit request')
      }
    })
  }

  const submitRecommendationDecision = (
    recommendationId: string,
    decision: 'approved' | 'revision_requested'
  ) => {
    clearMessage()
    startTransition(async () => {
      try {
        await respondToMyRecurringRecommendation({
          recommendation_id: recommendationId,
          decision,
          notes: recommendationNotes[recommendationId]?.trim() || undefined,
        })
        setSuccess(
          decision === 'approved'
            ? 'Recommendation approved and sent to your chef.'
            : 'Revision request sent to your chef.'
        )
        setRecommendationNotes((prev) => ({ ...prev, [recommendationId]: '' }))
      } catch (err: any) {
        setError(err?.message || 'Could not submit your recommendation response')
      }
    })
  }

  const submitDishReaction = (
    historyId: string,
    reaction: 'loved' | 'liked' | 'neutral' | 'disliked'
  ) => {
    clearMessage()
    startTransition(async () => {
      try {
        await updateMyServedDishFeedback({
          history_id: historyId,
          client_reaction: reaction,
        })
        setSuccess('Meal feedback saved for your chef.')
      } catch (err: any) {
        setError(err?.message || 'Could not save meal feedback')
      }
    })
  }

  return (
    <div className="space-y-6">
      {success && (
        <Alert variant="success" role="status" aria-live="polite">
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="error" role="alert" aria-live="assertive">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Weekly Menu Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-400">
            Review your chef&apos;s week-ahead recommendations and approve or request changes.
          </p>
          {recommendations.length === 0 ? (
            <p className="text-sm text-stone-500">No recommendations sent yet.</p>
          ) : (
            <div className="space-y-3">
              {recommendations.slice(0, 8).map((recommendation) => (
                <div
                  key={recommendation.id}
                  className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-stone-500">
                      Sent {format(new Date(recommendation.sent_at), 'MMM d, yyyy')}
                      {recommendation.week_start
                        ? ` • week of ${format(
                            new Date(`${recommendation.week_start}T00:00:00`),
                            'MMM d'
                          )}`
                        : ''}
                    </p>
                    <Badge variant={RECOMMENDATION_STATUS_VARIANTS[recommendation.status]}>
                      {recommendation.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <details>
                    <summary className="cursor-pointer text-sm text-stone-200">
                      View recommendation
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md border border-stone-700 bg-stone-900 p-2 text-xs text-stone-300">
                      {recommendation.recommendation_text}
                    </pre>
                  </details>

                  {recommendation.status === 'sent' ? (
                    <div className="space-y-2">
                      <Textarea
                        label="Response note (optional)"
                        rows={2}
                        value={recommendationNotes[recommendation.id] ?? ''}
                        onChange={(e) =>
                          setRecommendationNotes((prev) => ({
                            ...prev,
                            [recommendation.id]: e.target.value,
                          }))
                        }
                        placeholder="Ask for swaps, additions, or timing changes"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={isPending}
                          onClick={() =>
                            submitRecommendationDecision(recommendation.id, 'approved')
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() =>
                            submitRecommendationDecision(recommendation.id, 'revision_requested')
                          }
                        >
                          Request Changes
                        </Button>
                      </div>
                    </div>
                  ) : recommendation.client_response_notes ? (
                    <p className="text-xs text-stone-400">
                      Your note: {recommendation.client_response_notes}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meal Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-stone-400">
            Ask for repeats, suggest new dishes, or flag items you want to avoid. Your chef gets
            notified automatically.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={REQUEST_TYPE_FIELD_ID}
                className="mb-1 block text-sm font-medium text-stone-300"
              >
                Request Type
              </label>
              <select
                id={REQUEST_TYPE_FIELD_ID}
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                value={requestType}
                onChange={(e) =>
                  setRequestType(e.target.value as CreateMealRequestInput['request_type'])
                }
              >
                <option value="new_idea">New Dish Idea</option>
                <option value="repeat_dish">Request Again</option>
                <option value="avoid_dish">Avoid This Dish</option>
              </select>
            </div>
            <div>
              <label
                htmlFor={PRIORITY_FIELD_ID}
                className="mb-1 block text-sm font-medium text-stone-300"
              >
                Priority
              </label>
              <select
                id={PRIORITY_FIELD_ID}
                className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                value={priority}
                onChange={(e) => setPriority(e.target.value as CreateMealRequestInput['priority'])}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <Input
            label="Dish"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            placeholder="e.g. Mushroom risotto"
            required
          />

          <Input
            label="Target week (optional)"
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
          />

          <Textarea
            label="Notes (optional)"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything your chef should know about this request"
          />

          <Button
            variant="primary"
            onClick={() =>
              submitRequest(
                {
                  request_type: requestType,
                  dish_name: dishName,
                  notes: notes || undefined,
                  priority,
                  requested_for_week_start: weekStart || undefined,
                },
                'Request submitted to your chef.'
              )
            }
            disabled={isPending || !dishName.trim()}
          >
            {isPending ? 'Submitting...' : 'Submit Request'}
          </Button>

          {requests.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-stone-300">Your request history</p>
              <div className="space-y-2">
                {requests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-stone-100">{request.dish_name}</p>
                        <p className="text-xs text-stone-500">
                          {REQUEST_LABELS[request.request_type]} |{' '}
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANTS[request.status]}>
                          {formatStatus(request.status)}
                        </Badge>
                        {request.status === 'requested' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  clearMessage()
                                  await withdrawMyMealRequest(request.id)
                                  setSuccess('Request withdrawn.')
                                } catch (err: any) {
                                  setError(err?.message || 'Could not withdraw request')
                                }
                              })
                            }
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preference Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-400">
            These are the strongest repeat signals from your history and requests.
          </p>
          {preferenceInsights.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {preferenceInsights.map((dish) => (
                <Badge key={dish.dishName} variant="info">
                  {dish.dishName} ({dish.servings}x served)
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">Not enough history yet for insights.</p>
          )}
          {repeatRequestLeaders.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Most requested repeats
              </p>
              <div className="flex flex-wrap gap-2">
                {repeatRequestLeaders.map((item) => (
                  <Badge key={item.dishName} variant="default">
                    {item.dishName} ({item.count} requests)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What You Have Been Served</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-400">
            Full history helps your chef rotate menus intelligently. Request anything you want
            again.
          </p>
          <div className="space-y-2">
            <Input
              label="Search your dish history"
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Type a dish name to find past meals"
            />
            <p className="text-xs text-stone-500">
              Showing {visibleHistory.length} of {filteredHistory.length} matched dishes (
              {history.length} total).
            </p>
          </div>
          {visibleHistory.length === 0 ? (
            <p className="text-sm text-stone-500">No served dish history yet.</p>
          ) : (
            <div className="max-h-[28rem] space-y-2 overflow-auto pr-1">
              {visibleHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-stone-100">{entry.dish_name}</p>
                      <p className="text-xs text-stone-500">
                        {format(new Date(`${entry.served_date}T00:00:00`), 'MMM d, yyyy')}
                        {entry.client_reaction ? (
                          <span className={`ml-2 ${REACTION_COLORS[entry.client_reaction] ?? ''}`}>
                            {entry.client_reaction}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      aria-label={`Request ${entry.dish_name} again`}
                      onClick={() =>
                        submitRequest(
                          {
                            request_type: 'repeat_dish',
                            dish_name: entry.dish_name,
                            priority: 'normal',
                          },
                          `${entry.dish_name} requested again.`
                        )
                      }
                    >
                      Request Again
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-stone-500">Quick feedback:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => submitDishReaction(entry.id, 'loved')}
                    >
                      Loved
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => submitDishReaction(entry.id, 'liked')}
                    >
                      Liked
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => submitDishReaction(entry.id, 'neutral')}
                    >
                      Neutral
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => submitDishReaction(entry.id, 'disliked')}
                    >
                      Disliked
                    </Button>
                  </div>
                </div>
              ))}
              {visibleHistory.length < filteredHistory.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setHistoryLimit((value) => value + 80)}
                >
                  Show More History
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
