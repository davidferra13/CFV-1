// Seasonal Palette — Type Definitions
// Pure types for the seasonal palette system.

export interface MicroWindow {
  ingredient: string
  start_date: string // MM-DD
  end_date: string // MM-DD
  notes: string
  // Legacy fields — kept optional for backward compatibility with existing data
  name?: string
  urgency?: 'high' | 'normal'
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
  proven_wins: ProvenWin[]
  created_at: string
  updated_at: string
}

export const DEFAULT_SEASONS: Omit<
  SeasonalPalette,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
>[] = [
  {
    season_name: 'Winter',
    sort_order: 0,
    is_active: false,
    start_month_day: '12-01',
    end_month_day: '02-28',
    sensory_anchor: null,
    micro_windows: [],
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
    proven_wins: [],
  },
]
