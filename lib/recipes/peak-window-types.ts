// Recipe Peak Windows: quality peaks, safety ceilings, and reverse prep timelines.
// See memory/project_recipe_peak_windows.md for product context.

/**
 * The optimal serving window for a recipe: temperature, hold time,
 * quality decay rate, and absolute safety ceiling.
 */
export interface PeakWindow {
  id: string
  recipe_id: string
  /** Ideal serving temperature in Fahrenheit */
  peak_temp_f: number
  /** Maximum minutes the dish holds at peak quality */
  max_hold_minutes: number
  /**
   * Rate at which quality drops per minute past peak (0-1 scale).
   * 0.01 = slow decay (stew), 0.05 = fast decay (souffle).
   */
  quality_decay_rate: number
  /** Absolute safety ceiling in minutes at serving temp (food safety, not quality) */
  safety_ceiling_minutes: number
  tenant_id: string
  created_at: string
  updated_at: string
}

/**
 * A single step in a reverse prep timeline, anchored to a service time.
 */
export interface PrepTimelineStep {
  /** Human-readable step name, e.g. "Sear protein" */
  step_name: string
  /** Minutes before service this step must start */
  minutes_before_service: number
  /** Duration of this step in minutes */
  duration_minutes: number
}

/**
 * A complete reverse timeline for a recipe, built from a target service time.
 */
export interface ReverseTimeline {
  recipe_id: string
  /** ISO datetime string for planned service */
  service_time: string
  /** Ordered steps from earliest to latest (first step = furthest from service) */
  steps: PrepTimelineStep[]
  /** ISO datetime string: when prep must begin */
  prep_start_time: string
  /** Total minutes from first step to service */
  total_prep_minutes: number
}

/**
 * Input for setting or updating a peak window on a recipe.
 */
export interface SetPeakWindowInput {
  recipe_id: string
  peak_temp_f: number
  max_hold_minutes: number
  quality_decay_rate: number
  safety_ceiling_minutes: number
  /** Optional prep steps for reverse timeline generation */
  prep_steps?: PrepTimelineStep[]
}
