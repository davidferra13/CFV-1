export type PosSloDefinition = {
  id: 'availability' | 'checkout_latency' | 'capture_success' | 'replay_lag'
  label: string
  objective: string
  measurement: string
  source: string
}

export const POS_SLO_DEFINITIONS: PosSloDefinition[] = [
  {
    id: 'availability',
    label: 'POS Availability',
    objective: '>= 99.90% monthly uptime',
    measurement: '(total minutes - unavailable minutes) / total minutes',
    source: 'POS health checks + synthetic canary',
  },
  {
    id: 'checkout_latency',
    label: 'Checkout Latency',
    objective: 'p95 <= 2.0s (server action completion)',
    measurement: '95th percentile checkout request duration',
    source: 'Checkout timing telemetry',
  },
  {
    id: 'capture_success',
    label: 'Capture Success',
    objective: '>= 99.50% successful captures',
    measurement: 'captured payments / payment attempts',
    source: 'commerce_payments + checkout failure alerts',
  },
  {
    id: 'replay_lag',
    label: 'Offline Replay Lag',
    objective: 'p95 <= 5 minutes',
    measurement: 'queued payment age at successful replay',
    source: 'offline queue processor telemetry',
  },
]
