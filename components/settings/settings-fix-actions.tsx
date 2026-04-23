import Link from 'next/link'
import { ArrowRight } from '@/components/ui/icons'
import { SETTINGS_TONE_STYLES } from '@/components/settings/settings-tone'
import type { SettingsFixTask } from '@/lib/interface/action-layer'

function TaskCard({
  task,
  primary = false,
}: {
  task: SettingsFixTask
  primary?: boolean
}) {
  const toneStyles = SETTINGS_TONE_STYLES[task.tone]

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border bg-[image:var(--card-gradient)] shadow-[var(--shadow-card)] ${toneStyles.panel}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneStyles.accentBar}`} />
      <div className={primary ? 'p-5 sm:p-6' : 'p-4 sm:p-5'}>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneStyles.pill}`}
        >
          Fix This Setting
        </span>
        <div className="mt-4 space-y-2">
          <h2 className={primary ? 'text-2xl font-semibold text-stone-50' : 'text-lg font-semibold text-stone-50'}>
            {task.title}
          </h2>
          <p className="text-sm leading-6 text-stone-300">{task.description}</p>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-stone-200">{task.currentState}</p>
          <p className="text-sm text-stone-400">{task.impact}</p>
        </div>
        <Link
          href={task.href}
          className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${toneStyles.cta}`}
        >
          <span>{task.ctaLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

export function SettingsFixActions({ tasks }: { tasks: SettingsFixTask[] }) {
  if (tasks.length === 0) {
    return (
      <section className="rounded-[24px] border border-stone-700/80 bg-[var(--glass-subtle-bg)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="section-label mb-3">Fix This Setting</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-stone-50">Core configuration looks healthy.</h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-300">
            No missing profile, intake, availability, booking, or review blockers were detected from the current settings state.
          </p>
        </div>
        <Link
          href="#settings-directory"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-stone-100"
        >
          <span>Open full settings directory</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    )
  }

  const [primaryTask, ...secondaryTasks] = tasks

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="section-label mb-2">Fix This Setting</div>
          <h2 className="text-2xl font-semibold text-stone-50 sm:text-3xl">
            Resolve the next configuration blocker.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
            These actions come from missing or broken setup state, so you can fix the exact setting instead of opening a directory first.
          </p>
        </div>
        <Link
          href="#settings-directory"
          className="text-sm font-semibold text-stone-100 hover:text-white"
        >
          Open full directory
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
        <TaskCard task={primaryTask} primary />
        <div className="space-y-4">
          {secondaryTasks.slice(0, 3).map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </section>
  )
}
