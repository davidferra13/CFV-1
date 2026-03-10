export type MaintenanceType =
  | 'oil_change'
  | 'tire_rotation'
  | 'brake_service'
  | 'engine'
  | 'electrical'
  | 'body_work'
  | 'inspection'
  | 'cleaning'
  | 'other'

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  oil_change: 'Oil Change',
  tire_rotation: 'Tire Rotation',
  brake_service: 'Brake Service',
  engine: 'Engine',
  electrical: 'Electrical',
  body_work: 'Body Work',
  inspection: 'Inspection',
  cleaning: 'Cleaning',
  other: 'Other',
}

export function getMaintenanceTypeLabel(type: MaintenanceType): string {
  return MAINTENANCE_TYPE_LABELS[type] ?? type
}
