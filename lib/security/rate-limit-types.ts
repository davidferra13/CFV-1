export interface RateLimitRule {
  id: string
  pathPattern: string
  maxRequests: number
  windowSeconds: number
  action: 'block' | 'throttle' | 'challenge'
  enabled: boolean
  description: string
}

export interface RateLimitEvent {
  id: string
  ipAddress: string
  path: string
  blocked: boolean
  ruleId: string | null
  userAgent: string | null
  timestamp: string
}

export interface RateLimitStats {
  totalRequests: number
  blockedRequests: number
  topPaths: { path: string; count: number }[]
  topIPs: { ip: string; count: number; blocked: number }[]
  hourlyDistribution: { hour: number; count: number }[]
}

export interface RateLimitConfig {
  globalEnabled: boolean
  defaultMaxRequests: number
  defaultWindowSeconds: number
  whitelistedIPs: string[]
  rules: RateLimitRule[]
}
