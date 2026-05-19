import {
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { DinnerCircleExperienceModules } from '@/lib/dinner-circles/experience-modules'

type Props = {
  modules: DinnerCircleExperienceModules
}

export function DinnerCircleExperienceModulesPanel({ modules }: Props) {
  return (
    <section className="mb-6 space-y-4" aria-labelledby="dinner-circle-experience-title">
      <div className="rounded-xl border border-stone-800 bg-stone-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
              Dinner Circle
            </p>
            <h2
              id="dinner-circle-experience-title"
              className="mt-1 text-xl font-semibold text-stone-100"
            >
              Experience command center
            </h2>
          </div>
          <a
            href={modules.calendarReminders.mainEvent.icsHref}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm font-medium text-stone-100 hover:border-brand-500"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Add dinner
          </a>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Attending"
            value={modules.rsvpCommandCenter.effectiveAttending}
            helper={`${modules.rsvpCommandCenter.pendingCount} pending`}
          />
          <Metric
            label="Dietary ready"
            value={modules.rsvpCommandCenter.dietaryComplete}
            helper={`${modules.rsvpCommandCenter.dietaryMissing} missing`}
          />
          <Metric
            label="Maybe"
            value={modules.rsvpCommandCenter.maybeCount}
            helper={`${modules.rsvpCommandCenter.declinedCount} declined`}
          />
          <Metric
            label="Waitlisted"
            value={modules.rsvpCommandCenter.waitlistedCount}
            helper={`RSVP by ${modules.rsvpCommandCenter.deadlineLabel}`}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <section
          id="dinner-circle-rsvp-command-center"
          className="rounded-xl border border-stone-800 bg-stone-900 p-5"
          aria-labelledby="dinner-circle-rsvp-title"
        >
          <div className="flex items-start gap-3">
            <Users className="mt-1 h-5 w-5 text-brand-300" aria-hidden="true" />
            <div>
              <h3 id="dinner-circle-rsvp-title" className="text-base font-semibold text-stone-100">
                RSVP command center
              </h3>
              <p className="mt-1 text-sm text-stone-400">
                {modules.rsvpCommandCenter.effectiveAttending} confirmed against{' '}
                {modules.rsvpCommandCenter.expectedCount} expected.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {modules.rsvpCommandCenter.rows.length > 0 ? (
              modules.rsvpCommandCenter.rows.slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  className="flex min-h-[48px] items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-950 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-100">
                      {row.name}
                      {row.plusOne ? <span className="text-stone-500"> +1</span> : null}
                    </p>
                    <p className="text-xs text-stone-500">Dietary {row.dietaryStatus}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-stone-800 px-2 py-1 text-xs font-medium text-stone-300">
                    {row.rsvpStatus}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm text-stone-500">
                No guest responses yet.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {modules.rsvpCommandCenter.actions.map((action) => (
              <a
                key={action.id}
                href={action.href}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-medium text-stone-200 hover:border-brand-500"
              >
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {action.label}
              </a>
            ))}
          </div>
        </section>

        <section
          id="dinner-circle-attendee-guide"
          className="rounded-xl border border-stone-800 bg-stone-900 p-5"
          aria-labelledby="dinner-circle-guide-title"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" aria-hidden="true" />
            <div>
              <h3 id="dinner-circle-guide-title" className="text-base font-semibold text-stone-100">
                {modules.attendeeGuide.title}
              </h3>
              <p className="mt-1 text-sm text-stone-400">
                Source-safe arrival, service, privacy, and table expectations.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {modules.attendeeGuide.sections.map((section) => (
              <div key={section.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-100">{section.title}</p>
                  <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[11px] text-stone-400">
                    {section.source}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {section.items.map((item) => (
                    <li key={item} className="text-xs leading-5 text-stone-400">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {modules.attendeeGuide.acknowledgementPrompts.map((prompt) => (
              <span
                key={prompt}
                className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {prompt}
              </span>
            ))}
            <a
              href="#dinner-stewardship-title"
              className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-brand-500"
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {modules.attendeeGuide.correctionAction.label}
            </a>
          </div>
        </section>
      </div>

      <section
        id="dinner-circle-calendar-reminders"
        className="rounded-xl border border-stone-800 bg-stone-900 p-5"
        aria-labelledby="dinner-circle-calendar-title"
      >
        <div className="flex items-start gap-3">
          <CalendarPlus className="mt-1 h-5 w-5 text-brand-300" aria-hidden="true" />
          <div>
            <h3
              id="dinner-circle-calendar-title"
              className="text-base font-semibold text-stone-100"
            >
              Calendar and reminders
            </h3>
            <p className="mt-1 text-sm text-stone-400">
              {modules.calendarReminders.privateDetailsPolicy}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {modules.calendarReminders.reminders.map((reminder) => (
            <a
              key={reminder.id}
              href={reminder.googleHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm hover:border-brand-500"
            >
              <p className="font-medium text-stone-100">{reminder.label}</p>
              <p className="mt-1 text-xs text-stone-500">{reminder.date}</p>
            </a>
          ))}
        </div>
      </section>
    </section>
  )
}

function Metric({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
      <p className="text-lg font-semibold text-stone-100">{value}</p>
      <p className="text-xs font-medium text-stone-400">{label}</p>
      <p className="mt-1 text-xs text-stone-500">{helper}</p>
    </div>
  )
}
