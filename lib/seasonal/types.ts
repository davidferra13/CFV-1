// Seasonal Palette — Type Definitions
// Pure types for the seasonal palette engine.

export interface MicroWindow {
  name: string
  ingredient: string
  start_date: string   // MM-DD
  end_date: string     // MM-DD
  urgency: 'high' | 'normal'
  notes: string
}

export interface ContextProfile {
  name: string
  kitchen_reality: string
  menu_guardrails: string
  notes: string
}

export interface ProvenWin {
  dish_name: string
  notes: string
  recipe_id: string | null
}

export interface SeasonalPalette {
  id: string
  tenant_id: string
  season_name: string
  sort_order: number
  is_active: boolean
  start_month_day: string
  end_month_day: string
  sensory_anchor: string | null
  micro_windows: MicroWindow[]
  context_profiles: ContextProfile[]
  pantry_and_preserve: string | null
  chef_energy_reality: string | null
  proven_wins: ProvenWin[]
  created_at: string
  updated_at: string
}

export const DEFAULT_SEASONS: Omit<SeasonalPalette, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[] = [
  {
    season_name: 'Winter',
    sort_order: 0,
    is_active: false,
    start_month_day: '12-01',
    end_month_day: '02-28',
    sensory_anchor: null,
    micro_windows: [],
    context_profiles: [],
    pantry_and_preserve: null,
    chef_energy_reality: null,
    proven_wins: [],
  },
  {
    season_name: 'Spring',
    sort_order: 1,
    is_active: false,
    start_month_day: '03-01',
    end_month_day: '05-31',
    sensory_anchor: null,
    micro_windows: [],
    context_profiles: [],
    pantry_and_preserve: null,
    chef_energy_reality: null,
    proven_wins: [],
  },
  {
    season_name: 'Summer',
    sort_order: 2,
    is_active: false,
    start_month_day: '06-01',
    end_month_day: '08-31',
    sensory_anchor: null,
    micro_windows: [],
    context_profiles: [],
    pantry_and_preserve: null,
    chef_energy_reality: null,
    proven_wins: [],
  },
  {
    season_name: 'Autumn',
    sort_order: 3,
    is_active: false,
    start_month_day: '09-01',
    end_month_day: '11-30',
    sensory_anchor: null,
    micro_windows: [],
    context_profiles: [],
    pantry_and_preserve: null,
    chef_energy_reality: null,
    proven_wins: [],
  },
]
