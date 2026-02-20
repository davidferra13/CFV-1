// Event Contingency Constants
// Lives in a separate file (no 'use server') so it can be imported by client components.

export const SCENARIO_LABELS: Record<string, string> = {
  chef_illness:           'Chef Illness / Incapacitation',
  equipment_failure:      'Equipment Failure',
  ingredient_unavailable: 'Ingredient Unavailable',
  venue_issue:            'Venue Problem',
  weather:                'Severe Weather',
  other:                  'Other Scenario',
}
