// SUPERSEDED: This file was an early stub for waste tracking.
// The real implementation lives at:
//   - lib/inventory/waste-actions.ts (inventory waste: logWaste, getWasteDashboard, getWasteTrend, getWasteByEvent)
//   - lib/stations/waste-actions.ts (station clipboard waste: per-station, per-component tracking)
// Schema: waste_logs table (20260312000003_food_cost_intelligence.sql)
//         waste_log table (20260324000001_restaurant_ops_foundation.sql)
//
// Re-exporting from the real module for any imports that still reference this file.
export {
  type WasteReason,
  type WasteEntry,
  type LogWasteInput,
  logWaste,
  getWasteDashboard,
  getWasteTrend,
  getWasteByEvent,
} from '@/lib/inventory/waste-actions'
