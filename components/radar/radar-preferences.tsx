import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { updateRadarPreference } from '@/lib/culinary-radar/actions'
import type { RadarPreferenceView } from '@/lib/culinary-radar/view-model'

function label(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function RadarPreferences({ preferences }: { preferences: RadarPreferenceView[] }) {
  async function updatePreferenceAction(input: FormData) {
    'use server'
    const result = await updateRadarPreference(input)
    if (!result.success) throw new Error(result.error ?? 'Could not update radar preference.')
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-100">Radar controls</h2>
          <p className="mt-1 text-sm text-stone-500">
            Keep safety visible, then tune how much opportunity, craft, and sustainability signal
            ChefFlow should surface.
          </p>
        </div>
        <Badge variant="info">
          {preferences.filter((preference) => preference.enabled).length} on
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {preferences.map((preference) => (
          <form
            key={preference.category}
            action={updatePreferenceAction}
            className="rounded-lg border border-stone-800 bg-stone-950/30 p-3"
          >
            <input type="hidden" name="category" value={preference.category} />
            <input type="hidden" name="enabled" value={preference.enabled ? 'false' : 'true'} />
            <input
              type="hidden"
              name="emailEnabled"
              value={preference.emailEnabled ? 'true' : 'false'}
            />
            <input type="hidden" name="minAlertSeverity" value={preference.minAlertSeverity} />
            <input type="hidden" name="digestFrequency" value={preference.digestFrequency} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-stone-200">{label(preference.category)}</p>
                <p className="mt-1 text-xs text-stone-500">
                  Alerts at {preference.minAlertSeverity}, digest {preference.digestFrequency}
                </p>
              </div>
              <Badge variant={preference.enabled ? 'success' : 'default'}>
                {preference.enabled ? 'On' : 'Off'}
              </Badge>
            </div>
            <Button type="submit" variant="ghost" size="sm" className="mt-3 w-full">
              {preference.enabled ? 'Pause category' : 'Resume category'}
            </Button>
          </form>
        ))}
      </div>
    </Card>
  )
}
