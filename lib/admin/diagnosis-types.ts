export type DiagnosisCategory =
  | 'database'
  | 'auth'
  | 'search'
  | 'ai'
  | 'email'
  | 'storage'
  | 'jobs'
  | 'routes'

export type DiagnosisStatus = 'healthy' | 'degraded' | 'failing'

export interface DiagnosisCheck {
  category: DiagnosisCategory
  name: string
  status: DiagnosisStatus
  message: string
  latencyMs?: number
}

export interface SystemDiagnosis {
  checks: DiagnosisCheck[]
  overallHealth: number
  summary: string
}

export interface SystemVitals {
  nodeVersion: string
  uptime: number
  env: string
  platform: string
  memoryUsageMb: number
}
