'use client'

import { Badge } from '@/components/ui/badge'
import type { WeatherRiskLevel } from '@/lib/formulas/weather-risk'

type WeatherAlertBadgeProps = {
  riskLevel: WeatherRiskLevel
  className?: string
}

const BADGE_CONFIG: Record<
  WeatherRiskLevel,
  { label: string; variant: 'warning' | 'error' } | null
> = {
  low: null,
  moderate: { label: 'Weather: Moderate', variant: 'warning' },
  high: { label: 'Weather: Caution', variant: 'warning' },
  severe: { label: 'Weather: Severe', variant: 'error' },
}

export function WeatherAlertBadge({ riskLevel, className }: WeatherAlertBadgeProps) {
  const config = BADGE_CONFIG[riskLevel]
  if (!config) return null

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
