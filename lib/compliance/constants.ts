// Food Safety Compliance Constants
// Lives in a separate file (no 'use server') so it can be imported by client components.

// Safe temperature ranges per phase (reference only - chef-assessed is_safe field).
export const SAFE_TEMP_RANGES: Record<string, { min?: number; max?: number; label: string }> = {
  receiving: { max: 41, label: '≤ 41°F for cold; ≥ 135°F for hot' },
  cold_holding: { max: 41, label: '≤ 41°F' },
  hot_holding: { min: 135, label: '≥ 135°F' },
  cooling: { label: '135°F → 70°F within 2h; → 41°F within 6h' },
  reheating: { min: 165, label: '≥ 165°F within 2 hours' },
}
