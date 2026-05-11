import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ClientSummaryPreferences } from '@/lib/reports/client-summary'

export function PreferenceTags({ preferences }: { preferences: ClientSummaryPreferences }) {
  const hasAny =
    preferences.dietaryRestrictions.length > 0 ||
    preferences.allergies.length > 0 ||
    preferences.favoriteDishes.length > 0 ||
    preferences.favoriteCuisines.length > 0 ||
    preferences.preferredServiceStyle ||
    preferences.typicalGuestCount

  if (!hasAny) {
    return (
      <Card className="print:shadow-none print:border-stone-300">
        <CardHeader>
          <CardTitle className="text-base print:text-stone-900">Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">No preferences recorded yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="print:shadow-none print:border-stone-300">
      <CardHeader>
        <CardTitle className="text-base print:text-stone-900">Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dietary restrictions */}
        {preferences.dietaryRestrictions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Dietary Restrictions
            </p>
            <div className="flex flex-wrap gap-2">
              {preferences.dietaryRestrictions.map((item) => (
                <Badge key={item} variant="warning" className="print:border print:border-amber-300">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Allergies */}
        {preferences.allergies.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Allergies
            </p>
            <div className="flex flex-wrap gap-2">
              {preferences.allergies.map((item) => (
                <Badge key={item} variant="error" className="print:border print:border-red-300">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Favorite dishes */}
        {preferences.favoriteDishes.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Favorite Dishes
            </p>
            <div className="flex flex-wrap gap-2">
              {preferences.favoriteDishes.map((item) => (
                <Badge key={item} variant="info" className="print:border print:border-sky-300">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Favorite cuisines */}
        {preferences.favoriteCuisines.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Favorite Cuisines
            </p>
            <div className="flex flex-wrap gap-2">
              {preferences.favoriteCuisines.map((item) => (
                <Badge key={item} variant="default" className="print:border print:border-stone-400">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Service style + guest count */}
        <div className="grid grid-cols-2 gap-4">
          {preferences.preferredServiceStyle && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Service Style
              </p>
              <p className="text-sm text-stone-200 print:text-stone-800 capitalize">
                {preferences.preferredServiceStyle.replace(/_/g, ' ')}
              </p>
            </div>
          )}
          {preferences.typicalGuestCount != null && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Typical Guest Count
              </p>
              <p className="text-sm text-stone-200 print:text-stone-800">
                {preferences.typicalGuestCount}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
