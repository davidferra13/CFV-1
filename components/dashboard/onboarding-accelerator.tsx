import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  FileSpreadsheet,
  Sparkles,
  Upload,
} from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type OnboardingAcceleratorProps = {
  clientCount: number
  inquiryCount: number
  quoteCount: number
  eventCount: number
}

type Step = {
  id: string
  label: string
  detail: string
  href: string
  done: boolean
}

export function OnboardingAccelerator({
  clientCount,
  inquiryCount,
  quoteCount,
  eventCount,
}: OnboardingAcceleratorProps) {
  const steps: Step[] = [
    {
      id: 'client',
      label: 'Import your contacts',
      detail:
        'Drop a CSV from Google Contacts, iPhone, or any spreadsheet — or paste a brain dump.',
      href: '/import?mode=csv',
      done: clientCount > 0,
    },
    {
      id: 'event',
      label: 'Log your past events',
      detail: 'Bring your history in. Fill in dates, clients, and what you were paid.',
      href: '/import?mode=past-events',
      done: eventCount > 0,
    },
    {
      id: 'inquiry',
      label: 'Capture a live inquiry',
      detail: 'Only channel and client name are required to start.',
      href: '/inquiries/new',
      done: inquiryCount > 0,
    },
    {
      id: 'quote',
      label: 'Send your first quote',
      detail: 'Turn an inquiry into a real proposal.',
      href: '/quotes/new',
      done: quoteCount > 0,
    },
  ]

  const completedCount = steps.filter((step) => step.done).length
  if (completedCount === steps.length) return null

  const nextStep = steps.find((step) => !step.done) ?? steps[0]

  return (
    <Card className="border-brand-700 bg-brand-950/30">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-brand-200">
              <Sparkles className="h-4 w-4" />
              Bring your business in
            </CardTitle>
            <p className="mt-1 text-sm text-stone-300">
              Import your contacts and history first — then use ChefFlow for everything going
              forward.
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-brand-700 bg-stone-900 px-3 py-1 text-xs font-semibold text-brand-400">
            {completedCount}/{steps.length} done
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-start gap-3 rounded-lg border border-stone-700 bg-stone-900 p-3"
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-100">{step.label}</p>
                <p className="text-xs text-stone-400">{step.detail}</p>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className="text-xs font-medium text-brand-400 hover:text-brand-300 shrink-0"
                >
                  Start
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={nextStep.href}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Next: {nextStep.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/import?mode=csv"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Upload CSV
          </Link>
          <Link
            href="/import?mode=past-events"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
          >
            <Clock className="h-3.5 w-3.5" />
            Log Past Events
          </Link>
          <Link
            href="/import?mode=brain-dump"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
          >
            <Upload className="h-3.5 w-3.5" />
            Brain Dump
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
