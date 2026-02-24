// Fun Q&A Display — chef-facing read-only view of a client's fun answers
// Shown on the client detail page. Helps chefs personalise follow-ups
// and spot rebooking opportunities (see the "rebook_occasion" question).

import { FUN_QA_QUESTIONS, type FunQAAnswers } from '@/lib/clients/fun-qa-constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FunQADisplayProps {
  answers: FunQAAnswers
  clientName: string
}

export function FunQADisplay({ answers, clientName }: FunQADisplayProps) {
  const filled = FUN_QA_QUESTIONS.filter((q) => answers[q.key]?.trim())

  if (filled.length === 0) {
    return (
      <Card className="border-dashed border-2 border-stone-700">
        <CardHeader>
          <CardTitle className="text-lg">Just for Fun</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 italic">
            {clientName.split(' ')[0]} hasn&apos;t answered the fun Q&amp;A yet. Once they do, their
            personality will show up here — great inspiration for tailoring the next invite.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Just for Fun</CardTitle>
          <span className="text-xs font-medium bg-stone-800 text-stone-400 rounded-full px-2.5 py-1">
            {filled.length}/{FUN_QA_QUESTIONS.length} answered
          </span>
        </div>
        <p className="text-sm text-stone-500 mt-1">
          Answered by {clientName.split(' ')[0]} — use these to craft a personalised re-engagement
          message or plan their next experience.
        </p>
      </CardHeader>

      <CardContent>
        <dl className="space-y-5">
          {filled.map((q) => (
            <div key={q.key}>
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                <span>{q.emoji}</span>
                <span>{q.question}</span>
              </dt>
              <dd className="text-sm text-stone-200 bg-stone-800 rounded-lg px-3 py-2">
                {answers[q.key]}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
