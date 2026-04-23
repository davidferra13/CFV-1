import { SectionViewTracker } from '@/components/analytics/section-view-tracker'
import { TrackedLink } from '@/components/analytics/tracked-link'
import type { PublicSeasonalMarketPulse } from '@/lib/public/public-seasonal-market-pulse'

type DaypartCopy = {
  label: string
  note: string
}

const clockPartsFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})
const clockDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const seasonalPulseClockScript = `
(() => {
  const getDaypartCopy = (hour) => {
    if (hour < 5) {
      return { label: 'Late-night reset', note: 'Quiet planning hours before the next booking push.' };
    }
    if (hour < 11) {
      return { label: 'Morning prep', note: 'Chefs are confirming details and shaping the day.' };
    }
    if (hour < 15) {
      return { label: 'Midday planning', note: 'A good window to compare chefs and seasonal menus.' };
    }
    if (hour < 18) {
      return { label: 'Afternoon sourcing', note: 'Menus sharpen as operators move toward execution.' };
    }
    if (hour < 23) {
      return { label: 'Dinner service', note: 'The product should feel awake while service is in motion.' };
    }
    return { label: 'Closeout hour', note: 'Service winds down, but discovery stays available.' };
  };

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const zoneFormatter = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  });

  const getSegments = (date) => {
    const parts = timeFormatter.formatToParts(date);
    return {
      hour: parts.find((part) => part.type === 'hour')?.value ?? '--',
      minute: parts.find((part) => part.type === 'minute')?.value ?? '--',
      second: parts.find((part) => part.type === 'second')?.value ?? '--',
      dayPeriod: parts.find((part) => part.type === 'dayPeriod')?.value ?? '',
    };
  };

  const getZone = (date) =>
    zoneFormatter.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value ??
    'Local time';

  const root = document.querySelector('[data-seasonal-live-clock]');
  if (!root) return;

  if (window.__cfSeasonalPulseClockTimer) {
    window.clearInterval(window.__cfSeasonalPulseClockTimer);
  }

  const update = () => {
    const now = new Date();
    const segments = getSegments(now);
    const daypart = getDaypartCopy(now.getHours());
    const secondValue = now.getSeconds();
    const progress = Math.min(100, (secondValue / 59) * 100);

    root.querySelector('[data-seasonal-live-hour]').textContent = segments.hour;
    root.querySelector('[data-seasonal-live-minute]').textContent = segments.minute;
    root.querySelector('[data-seasonal-live-second]').textContent = segments.second;
    root.querySelector('[data-seasonal-live-period]').textContent = segments.dayPeriod;
    root.querySelector('[data-seasonal-live-date]').textContent = dateFormatter.format(now);
    root.querySelector('[data-seasonal-live-zone]').textContent = getZone(now);
    root.querySelector('[data-seasonal-live-daypart]').textContent = daypart.label;
    root.querySelector('[data-seasonal-live-note]').textContent = daypart.note;
    root.querySelector('[data-seasonal-live-seconds]').textContent = secondValue.toString().padStart(2, '0') + 's';
    root.querySelector('[data-seasonal-live-progress]').style.width = progress + '%';

    const beat = root.querySelector('[data-seasonal-live-beat]');
    if (secondValue % 2 === 0) {
      beat.style.transform = 'scale(1)';
      beat.style.boxShadow = '0 0 0 4px rgba(74, 222, 128, 0.12)';
    } else {
      beat.style.transform = 'scale(1.18)';
      beat.style.boxShadow = '0 0 0 7px rgba(74, 222, 128, 0.04)';
    }
  };

  update();
  window.__cfSeasonalPulseClockTimer = window.setInterval(update, 1000);
})();
`

function getDaypartCopy(hour: number): DaypartCopy {
  if (hour < 5) {
    return { label: 'Late-night reset', note: 'Quiet planning hours before the next booking push.' }
  }

  if (hour < 11) {
    return { label: 'Morning prep', note: 'Chefs are confirming details and shaping the day.' }
  }

  if (hour < 15) {
    return { label: 'Midday planning', note: 'A good window to compare chefs and seasonal menus.' }
  }

  if (hour < 18) {
    return {
      label: 'Afternoon sourcing',
      note: 'Menus sharpen as operators move toward execution.',
    }
  }

  if (hour < 23) {
    return {
      label: 'Dinner service',
      note: 'The product should feel awake while service is in motion.',
    }
  }

  return { label: 'Closeout hour', note: 'Service winds down, but discovery stays available.' }
}

function getClockSegments(date: Date) {
  const parts = clockPartsFormatter.formatToParts(date)

  return {
    hour: parts.find((part) => part.type === 'hour')?.value ?? '--',
    minute: parts.find((part) => part.type === 'minute')?.value ?? '--',
    second: parts.find((part) => part.type === 'second')?.value ?? '--',
    dayPeriod: parts.find((part) => part.type === 'dayPeriod')?.value ?? '',
  }
}

export function PublicSeasonalMarketPulse({ pulse }: { pulse: PublicSeasonalMarketPulse }) {
  const now = new Date()
  const clock = getClockSegments(now)
  const daypart = getDaypartCopy(now.getHours())
  const progress = Math.min(100, (now.getSeconds() / 59) * 100)
  const sourceLine = [
    pulse.copy.evidenceLine,
    pulse.copy.freshnessLine,
    pulse.source.note,
    pulse.provenance.scope.note,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6 lg:px-8">
      <SectionViewTracker
        moduleName="seasonal_market_pulse"
        pageName="chef_directory"
        properties={{
          market_spotlight_count: pulse.marketSpotlights.length,
          ...pulse.analytics,
        }}
      />
      <div className="rounded-[1.75rem] border border-stone-800 bg-stone-950/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              <span className="text-emerald-300">{pulse.copy.eyebrow}</span>
              <span>{pulse.season.name}</span>
              <span>{pulse.provenance.scope.shortLabel}</span>
            </div>

            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
              {pulse.copy.headline}
            </h2>

            <p className="mt-3 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
              {pulse.copy.body}
            </p>

            {pulse.copy.urgencyNote && (
              <p className="mt-4 border-l-2 border-emerald-500/50 pl-4 text-sm leading-6 text-stone-200">
                {pulse.copy.urgencyNote}
              </p>
            )}

            <p className="mt-4 max-w-2xl text-xs leading-5 text-stone-500">{sourceLine}</p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <TrackedLink
              href={pulse.booking.href}
              analyticsName="directory_seasonal_market_pulse_cta"
              analyticsProps={{
                section: 'seasonal_market_pulse',
                ...pulse.analytics,
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl gradient-accent px-5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {pulse.copy.primaryCtaLabel}
            </TrackedLink>
            <TrackedLink
              href={pulse.ingredients.href}
              analyticsName="directory_seasonal_market_pulse_ingredients"
              analyticsProps={{
                section: 'seasonal_market_pulse',
                ...pulse.analytics,
              }}
              className="text-sm font-medium text-stone-300 transition-colors hover:text-stone-100"
            >
              Browse the ingredient guide
            </TrackedLink>

            <div
              data-seasonal-live-clock
              className="mt-2 w-full max-w-[320px] rounded-[1.35rem] border border-white/10 bg-black/20 p-4 lg:text-right"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200 lg:ml-auto">
                <span
                  aria-hidden="true"
                  data-seasonal-live-beat
                  className="h-2.5 w-2.5 rounded-full bg-emerald-300 transition-all duration-700"
                  style={{
                    boxShadow: '0 0 0 4px rgba(74, 222, 128, 0.12)',
                    transform: 'scale(1)',
                  }}
                />
                Live rhythm
              </div>

              <p className="mt-3 tabular-nums text-4xl font-semibold tracking-[-0.04em] text-stone-100 sm:text-[2.8rem]">
                <span data-seasonal-live-hour>{clock.hour}</span>
                <span className="px-1 text-stone-500">:</span>
                <span data-seasonal-live-minute>{clock.minute}</span>
                <span data-seasonal-live-second className="ml-2 text-lg text-stone-400 sm:text-xl">
                  {clock.second}
                </span>
                <span
                  data-seasonal-live-period
                  className="ml-2 align-top text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500 sm:text-xs"
                >
                  {clock.dayPeriod}
                </span>
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-400 lg:justify-end">
                <span data-seasonal-live-date>{clockDateFormatter.format(now)}</span>
                <span className="h-1 w-1 rounded-full bg-stone-600" />
                <span data-seasonal-live-zone>Local time</span>
              </div>

              <p data-seasonal-live-daypart className="mt-3 text-sm font-semibold text-stone-100">
                {daypart.label}
              </p>
              <p
                data-seasonal-live-note
                className="mt-1 max-w-[24rem] text-sm leading-6 text-stone-400 lg:ml-auto"
              >
                {daypart.note}
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">
                  <span>Minute progress</span>
                  <span data-seasonal-live-seconds className="tabular-nums text-stone-300">
                    {`${now.getSeconds().toString().padStart(2, '0')}s`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    data-seasonal-live-progress
                    className="h-full rounded-full bg-[linear-gradient(90deg,_rgba(110,231,183,0.4),_rgba(74,222,128,0.9),_rgba(16,185,129,0.85))] transition-[width] duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: seasonalPulseClockScript }} />
    </section>
  )
}
