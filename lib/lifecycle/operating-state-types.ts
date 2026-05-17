// ---------------------------------------------------------------------------
// Event Current Operating State Card (LIFECYCLE #10)
// ---------------------------------------------------------------------------

export type ServicePhase =
  | 'setup'
  | 'prep'
  | 'cooking'
  | 'plating'
  | 'service'
  | 'cleanup'
  | 'complete'

export interface TeamMember {
  name: string
  role: string
  position?: string
  status: 'active' | 'on-break' | 'done'
}

export interface EquipmentItem {
  name: string
  status: 'ready' | 'in-use' | 'needs-attention' | 'offline'
  notes?: string
}

export interface OperatingState {
  id: string
  tenantId: string
  eventId: string
  phase: ServicePhase
  activeTasks: string[]
  teamMembers: TeamMember[]
  equipmentStatus: EquipmentItem[]
  notes: string | null
  startedAt: Date
  updatedAt: Date
}

export interface OperatingStateLog {
  id: string
  tenantId: string
  eventId: string
  fromPhase: ServicePhase | null
  toPhase: ServicePhase
  changedBy: string | null
  reason: string | null
  createdAt: Date
}

export interface OperatingStateSummary {
  eventId: string
  currentPhase: ServicePhase
  totalTransitions: number
  avgPhaseDurationMinutes: number | null
  lastUpdated: Date
}

export interface CreateOperatingStateLogParams {
  eventId: string
  fromPhase: ServicePhase | null
  toPhase: ServicePhase
  changedBy?: string
  reason?: string
}

export interface UpdateOperatingStateParams {
  phase?: ServicePhase
  activeTasks?: string[]
  teamMembers?: TeamMember[]
  equipmentStatus?: EquipmentItem[]
  notes?: string | null
}
