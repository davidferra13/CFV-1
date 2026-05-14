export type DiscoveryAccessibilityControl = {
  id: string
  role: 'button' | 'link' | 'tab' | 'switch' | 'combobox' | 'dialog'
  visibleLabel?: string
  ariaLabel?: string
  keyboardReachable: boolean
  focusVisible: boolean
  reducedMotionSafe?: boolean
  textOverflowSafe?: boolean
  activates?: boolean
}

export type DiscoveryAuditViolation = {
  id: string
  rule: string
  severity: 'error' | 'warning'
}

export type DiscoveryAuditReport = {
  passed: boolean
  violations: DiscoveryAuditViolation[]
}

export type DiscoveryPerformanceMetrics = {
  renderTimeMs: number
  hydratedCardCount: number
  totalCardCount: number
  imageBytes: number
  clientJsKb: number
  longestTaskMs: number
  mobileFps: number
}

export type DiscoveryPerformanceBudget = Partial<DiscoveryPerformanceMetrics>

export type DiscoveryPerformanceReport = DiscoveryAuditReport & {
  budget: Required<DiscoveryPerformanceBudget>
}

export type DiscoveryImageQualityInput = {
  id: string
  src?: string | null
  width?: number | null
  height?: number | null
  sharpnessScore?: number | null
  confidence?: number | null
  duplicateOf?: string | null
  focalCoverage?: number | null
}

export type DiscoveryLoadingContract = {
  surface: string
  skeletonCount: number
  reservesAspectRatio: boolean
  minHeightPx: number
  ariaBusy: true
  layoutShiftRisk: 'low' | 'medium'
}

const DEFAULT_PERFORMANCE_BUDGET: Required<DiscoveryPerformanceBudget> = {
  renderTimeMs: 120,
  hydratedCardCount: 80,
  totalCardCount: 160,
  imageBytes: 1_200_000,
  clientJsKb: 90,
  longestTaskMs: 50,
  mobileFps: 50,
}

export function auditDiscoveryAccessibilityControls(
  controls: readonly DiscoveryAccessibilityControl[]
): DiscoveryAuditReport {
  const violations: DiscoveryAuditViolation[] = []

  for (const control of controls) {
    if (!control.visibleLabel && !control.ariaLabel) {
      violations.push({ id: control.id, rule: 'missing-accessible-name', severity: 'error' })
    }
    if (!control.keyboardReachable) {
      violations.push({ id: control.id, rule: 'not-keyboard-reachable', severity: 'error' })
    }
    if (!control.focusVisible) {
      violations.push({ id: control.id, rule: 'missing-visible-focus', severity: 'error' })
    }
    if (control.activates === false) {
      violations.push({ id: control.id, rule: 'inert-control', severity: 'error' })
    }
    if (control.reducedMotionSafe === false) {
      violations.push({ id: control.id, rule: 'no-reduced-motion-contract', severity: 'warning' })
    }
    if (control.textOverflowSafe === false) {
      violations.push({ id: control.id, rule: 'text-overflow-risk', severity: 'warning' })
    }
  }

  return { passed: violations.every((violation) => violation.severity !== 'error'), violations }
}

export function evaluateDiscoveryPerformanceBudget(
  metrics: DiscoveryPerformanceMetrics,
  budget: DiscoveryPerformanceBudget = {}
): DiscoveryPerformanceReport {
  const resolved = { ...DEFAULT_PERFORMANCE_BUDGET, ...budget }
  const violations: DiscoveryAuditViolation[] = []

  for (const key of Object.keys(resolved) as Array<keyof DiscoveryPerformanceMetrics>) {
    const actual = metrics[key]
    const expected = resolved[key]
    const passed = key === 'mobileFps' ? actual >= expected : actual <= expected
    if (!passed) {
      violations.push({
        id: key,
        rule: key === 'mobileFps' ? `below-${expected}` : `above-${expected}`,
        severity: 'error',
      })
    }
  }

  return { passed: violations.length === 0, violations, budget: resolved }
}

export function evaluateDiscoveryImageQuality(
  image: DiscoveryImageQualityInput
): DiscoveryAuditReport {
  const violations: DiscoveryAuditViolation[] = []
  const width = image.width ?? 0
  const height = image.height ?? 0
  const aspect = height > 0 ? width / height : 0

  if (!image.src) violations.push({ id: image.id, rule: 'missing-image-src', severity: 'error' })
  if (width < 480 || height < 320) {
    violations.push({ id: image.id, rule: 'image-too-small', severity: 'error' })
  }
  if (aspect < 0.75 || aspect > 2.2) {
    violations.push({ id: image.id, rule: 'unsafe-crop-aspect-ratio', severity: 'warning' })
  }
  if ((image.sharpnessScore ?? 1) < 0.45) {
    violations.push({ id: image.id, rule: 'blurry-image', severity: 'error' })
  }
  if ((image.confidence ?? 1) < 0.7) {
    violations.push({ id: image.id, rule: 'low-image-confidence', severity: 'warning' })
  }
  if (image.duplicateOf) {
    violations.push({
      id: image.id,
      rule: `duplicate-of:${image.duplicateOf}`,
      severity: 'warning',
    })
  }
  if ((image.focalCoverage ?? 1) < 0.55) {
    violations.push({ id: image.id, rule: 'poor-focal-coverage', severity: 'warning' })
  }

  return { passed: violations.every((violation) => violation.severity !== 'error'), violations }
}

export function buildDiscoveryLoadingContract(input: {
  surface: string
  expectedItems: number
  viewportWidth: number
}): DiscoveryLoadingContract {
  const mobile = input.viewportWidth < 768
  const skeletonCount = Math.max(3, Math.min(input.expectedItems, mobile ? 6 : 12))
  return {
    surface: input.surface,
    skeletonCount,
    reservesAspectRatio: true,
    minHeightPx: mobile ? 280 : 360,
    ariaBusy: true,
    layoutShiftRisk: skeletonCount >= Math.min(input.expectedItems, 3) ? 'low' : 'medium',
  }
}
