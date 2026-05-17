/** Visual QA Matrix types for screenshot-based UI verification. */

export type QAStatus = 'pending' | 'pass' | 'fail' | 'needs_review' | 'skipped'

export type QATheme = 'light' | 'dark'

export interface QAViewport {
  name: string
  width: number
  height: number
}

export const QA_VIEWPORTS: QAViewport[] = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]

export interface QAViolation {
  rule: string
  severity: 'error' | 'warning' | 'info'
  element: string
  description: string
}

export interface VisualQAEntry {
  id: string
  tenantId: string
  route: string
  screenshotPath: string | null
  status: QAStatus
  violations: QAViolation[]
  score: number | null
  viewport: string
  theme: QATheme
  checkedAt: string
  checkedBy: string | null
}

export interface QAMatrix {
  totalRoutes: number
  checked: number
  passed: number
  failed: number
  needsReview: number
  coveragePercent: number
  avgScore: number
}

export interface ScreenshotComparison {
  id: string
  tenantId: string
  route: string
  baselinePath: string
  currentPath: string
  diffPath: string | null
  pixelDiffPercent: number | null
  status: QAStatus
  createdAt: string
}
