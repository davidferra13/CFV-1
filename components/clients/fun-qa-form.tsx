'use client'

// Fun Q&A Form - optional personality questions for clients
// Lives on the /my-profile page. Completely opt-in, zero pressure copy.

import { useState, useTransition } from 'react'
import { FUN_QA_QUESTIONS, type FunQAAnswers, type FunQAKey } from '@/lib/clients/fun-qa-constants'
import { updateMyFunQA } from '@/lib/clients/client-profile-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'

interface FunQAFormProps {
  initialAnswers: FunQAAnswers
}

export function FunQAForm({ initialAnswers }: FunQAFormProps) {
  const [answers, setAnswers] = useState<FunQAAnswers>(initialAnswers)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filledCount = FUN_QA_QUESTIONS.filter((q) => answers[q.key]?.trim()).length

  function handleChange(key: FunQAKey, value: string) {
    setSaved(false)
    setError(null)
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateMyFunQA(answers)
        setSaved(true)
        setError(null)
      } catch {
        setError('Something went wrong - please try again.')
      }
    })
  }

  return (
    <Card className="border-dashed border-2 border-stone-700">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Just for Fun</CardTitle>
            <p className="text-sm text-stone-500 mt-1">
              No pressure at all - answer as many or as few as you like. Your chef uses these to
              make every experience feel a little more you.
            </p>
          </div>
          {filledCount > 0 && (
            <span className="shrink-0 text-xs font-medium bg-brand-950 text-brand-400 border border-brand-700 rounded-full px-2.5 py-1">
              {filledCount}/{FUN_QA_QUESTIONS.length} answered
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {FUN_QA_QUESTIONS.map((q) => (
          <div key={q.key} className="space-y-2">
            <label className="flex items-start gap-2 text-sm font-medium text-stone-300">
              <span className="text-xl leading-snug">{q.emoji}</span>
              <span>{q.question}</span>
            </label>
            <Textarea
              value={answers[q.key] ?? ''}
              onChange={(e) => handleChange(q.key, e.target.value)}
              placeholder={q.placeholder}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        ))}

        {saved && (
          <Alert variant="success" className="text-sm">
            Saved - your chef will love getting to know you better!
          </Alert>
        )}
        {error && (
          <Alert variant="error" className="text-sm">
            {error}
          </Alert>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={isPending}>
            {isPending ? 'Saving…' : 'Save Answers'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
