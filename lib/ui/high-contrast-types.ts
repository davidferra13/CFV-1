export type ReadabilityMode = 'standard' | 'high-contrast' | 'kitchen' | 'outdoor' | 'night-service' | 'accessibility'

export type ReadabilityProfile = {
  id: string
  tenantId: string
  mode: ReadabilityMode
  label: string
  bgColor: string
  textColor: string
  accentColor: string
  contrastRatio: number
  fontSize: string
  fontWeight: string
  reducedMotion: boolean
  increasedSpacing: boolean
  autoActivateCondition: Record<string, unknown> | null
  createdAt: Date
}

export type ReadabilityPreference = {
  id: string
  tenantId: string
  activeMode: ReadabilityMode
  autoSwitch: boolean
  scheduledModes: Array<{ mode: ReadabilityMode; startTime: string; endTime: string }> | null
  createdAt: Date
  updatedAt: Date
}

export type ReadabilitySummary = {
  totalProfiles: number
  activeMode: ReadabilityMode | null
  autoSwitchEnabled: boolean
  scheduledCount: number
}
