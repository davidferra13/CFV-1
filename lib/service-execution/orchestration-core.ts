export type ComponentRole =
  | 'protein'
  | 'sauce'
  | 'garnish'
  | 'texture'
  | 'vegetable'
  | 'starch'
  | 'dessert'
  | 'beverage'
  | 'other'

export type PrepStage = 'two_days_before' | 'day_before' | 'day_of' | 'during_service'

export type ServiceTemperature = 'hot' | 'cold' | 'room_temp' | 'frozen'

export type ServiceWindow = {
  startMinute: number
  endMinute: number
}

export type ServiceResourceRequirement = {
  resourceId: string
  label?: string
  window: ServiceWindow
  units?: number
}

export type ServiceResource = {
  id: string
  label: string
  capacity: number
}

export type TastingMenuComponent = {
  id: string
  name: string
  role: ComponentRole
  prepStage: PrepStage
  dependsOnComponentIds?: string[]
  requiredResources?: ServiceResourceRequirement[]
  readyMinute?: number | null
  neededMinute?: number | null
  holdLimitMinutes?: number | null
  costCents?: number | null
  laborMinutes?: number | null
  reusableKey?: string | null
}

export type TastingMenuCourse = {
  id: string
  courseNumber: number
  name: string
  targetServeMinute: number
  targetPaceMinutes?: number | null
  temperature?: ServiceTemperature | null
  narrativeTags?: string[]
  components: TastingMenuComponent[]
}

export type PricingModel = {
  guestCount: number
  quotedPriceCents: number
  targetMarginPercent: number
  fixedCostCents?: number | null
  laborCostCents?: number | null
}

export type DependencyRisk = {
  type: 'missing_dependency' | 'late_dependency' | 'hold_limit'
  courseNumber: number
  componentName: string
  dependencyName?: string
  detail: string
}

export type ResourceConflict = {
  resourceId: string
  label: string
  window: ServiceWindow
  requiredUnits: number
  capacity: number
  componentNames: string[]
}

export type PrepTimelineGroup = {
  stage: PrepStage
  tasks: Array<{
    courseNumber: number
    courseName: string
    componentName: string
    role: ComponentRole
    laborMinutes: number
  }>
  totalLaborMinutes: number
}

export type MenuFlowWarning = {
  type: 'repeated_role' | 'repeated_temperature' | 'repeated_narrative_tag'
  courseNumbers: number[]
  detail: string
}

export type PricingSummary = {
  quotedPriceCents: number
  totalCostCents: number
  foodCostCents: number
  laborCostCents: number
  fixedCostCents: number
  grossMarginPercent: number | null
  targetMarginPercent: number
  status: 'unknown' | 'on_target' | 'margin_risk'
}

export type ServiceOrchestrationPlan = {
  courses: Array<{
    id: string
    courseNumber: number
    name: string
    targetServeMinute: number
    targetPaceMinutes: number | null
    componentCount: number
    plannedFireMinute: number
  }>
  prepTimeline: PrepTimelineGroup[]
  dependencyRisks: DependencyRisk[]
  resourceConflicts: ResourceConflict[]
  menuFlowWarnings: MenuFlowWarning[]
  pricing: PricingSummary | null
  reusableComponents: Array<{
    key: string
    componentNames: string[]
    courseNumbers: number[]
  }>
  complexity: {
    courseCount: number
    componentCount: number
    makeAheadCount: number
    duringServiceCount: number
    dependencyRiskCount: number
    resourceConflictCount: number
    score: number
  }
  serviceReady: boolean
}

const PREP_STAGE_ORDER: PrepStage[] = ['two_days_before', 'day_before', 'day_of', 'during_service']

function sortCourses(courses: TastingMenuCourse[]): TastingMenuCourse[] {
  return [...courses].sort((left, right) => left.courseNumber - right.courseNumber)
}

function overlap(left: ServiceWindow, right: ServiceWindow): ServiceWindow | null {
  const startMinute = Math.max(left.startMinute, right.startMinute)
  const endMinute = Math.min(left.endMinute, right.endMinute)
  return startMinute < endMinute ? { startMinute, endMinute } : null
}

function normalizeUnits(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1
}

function cents(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function minutes(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function buildPrepTimeline(courses: TastingMenuCourse[]): PrepTimelineGroup[] {
  const groups = new Map<PrepStage, PrepTimelineGroup>()

  for (const stage of PREP_STAGE_ORDER) {
    groups.set(stage, { stage, tasks: [], totalLaborMinutes: 0 })
  }

  for (const course of sortCourses(courses)) {
    for (const component of course.components) {
      const group = groups.get(component.prepStage)
      if (!group) continue
      const laborMinutes = minutes(component.laborMinutes)
      group.tasks.push({
        courseNumber: course.courseNumber,
        courseName: course.name,
        componentName: component.name,
        role: component.role,
        laborMinutes,
      })
      group.totalLaborMinutes += laborMinutes
    }
  }

  return PREP_STAGE_ORDER.map((stage) => groups.get(stage)!).filter((group) => group.tasks.length)
}

function buildDependencyRisks(courses: TastingMenuCourse[]): DependencyRisk[] {
  const risks: DependencyRisk[] = []
  const componentIndex = new Map<
    string,
    { course: TastingMenuCourse; component: TastingMenuComponent }
  >()

  for (const course of courses) {
    for (const component of course.components) {
      componentIndex.set(component.id, { course, component })
    }
  }

  for (const course of courses) {
    for (const component of course.components) {
      for (const dependencyId of component.dependsOnComponentIds ?? []) {
        const dependency = componentIndex.get(dependencyId)
        if (!dependency) {
          risks.push({
            type: 'missing_dependency',
            courseNumber: course.courseNumber,
            componentName: component.name,
            detail: `${component.name} references a dependency that is not in the menu plan.`,
          })
          continue
        }

        const dependencyReadyMinute = dependency.component.readyMinute
        const neededMinute = component.neededMinute
        if (
          dependencyReadyMinute != null &&
          neededMinute != null &&
          dependencyReadyMinute > neededMinute
        ) {
          risks.push({
            type: 'late_dependency',
            courseNumber: course.courseNumber,
            componentName: component.name,
            dependencyName: dependency.component.name,
            detail: `${dependency.component.name} is ready at minute ${dependencyReadyMinute}, after ${component.name} needs it at minute ${neededMinute}.`,
          })
        }

        const holdLimit = dependency.component.holdLimitMinutes
        if (
          dependencyReadyMinute != null &&
          neededMinute != null &&
          holdLimit != null &&
          neededMinute - dependencyReadyMinute > holdLimit
        ) {
          risks.push({
            type: 'hold_limit',
            courseNumber: course.courseNumber,
            componentName: component.name,
            dependencyName: dependency.component.name,
            detail: `${dependency.component.name} would hold for ${neededMinute - dependencyReadyMinute} minutes, beyond its ${holdLimit} minute limit.`,
          })
        }
      }
    }
  }

  return risks
}

function buildResourceConflicts(
  courses: TastingMenuCourse[],
  resources: ServiceResource[]
): ResourceConflict[] {
  const resourceMap = new Map(resources.map((resource) => [resource.id, resource]))
  const requirementsByResource = new Map<
    string,
    Array<{
      componentName: string
      label: string
      units: number
      window: ServiceWindow
    }>
  >()

  for (const course of courses) {
    for (const component of course.components) {
      for (const requirement of component.requiredResources ?? []) {
        const resource = resourceMap.get(requirement.resourceId)
        const label = requirement.label ?? resource?.label ?? requirement.resourceId
        const entries = requirementsByResource.get(requirement.resourceId) ?? []
        entries.push({
          componentName: `${course.courseNumber}. ${component.name}`,
          label,
          units: normalizeUnits(requirement.units),
          window: requirement.window,
        })
        requirementsByResource.set(requirement.resourceId, entries)
      }
    }
  }

  const conflicts: ResourceConflict[] = []
  for (const [resourceId, requirements] of requirementsByResource.entries()) {
    const resource = resourceMap.get(resourceId)
    const capacity = resource?.capacity ?? 1
    const markers = requirements.flatMap((requirement) => [
      requirement.window.startMinute,
      requirement.window.endMinute,
    ])
    const sortedMarkers = [...new Set(markers)].sort((left, right) => left - right)

    for (let index = 0; index < sortedMarkers.length - 1; index += 1) {
      const window = { startMinute: sortedMarkers[index], endMinute: sortedMarkers[index + 1] }
      const active = requirements.filter((requirement) => overlap(requirement.window, window))
      const requiredUnits = active.reduce((sum, requirement) => sum + requirement.units, 0)
      if (requiredUnits <= capacity) continue

      const last = conflicts[conflicts.length - 1]
      const componentNames = [...new Set(active.map((requirement) => requirement.componentName))]
      if (
        last?.resourceId === resourceId &&
        last.window.endMinute === window.startMinute &&
        last.requiredUnits === requiredUnits &&
        componentNames.every((name) => last.componentNames.includes(name))
      ) {
        last.window.endMinute = window.endMinute
        continue
      }

      conflicts.push({
        resourceId,
        label: active[0]?.label ?? resource?.label ?? resourceId,
        window,
        requiredUnits,
        capacity,
        componentNames,
      })
    }
  }

  return conflicts
}

function buildMenuFlowWarnings(courses: TastingMenuCourse[]): MenuFlowWarning[] {
  const warnings: MenuFlowWarning[] = []
  const sorted = sortCourses(courses)

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    if (previous.temperature && previous.temperature === current.temperature) {
      warnings.push({
        type: 'repeated_temperature',
        courseNumbers: [previous.courseNumber, current.courseNumber],
        detail: `Courses ${previous.courseNumber} and ${current.courseNumber} are both ${current.temperature}.`,
      })
    }

    const previousRoles = new Set(previous.components.map((component) => component.role))
    const currentRoles = new Set(current.components.map((component) => component.role))
    for (const role of currentRoles) {
      if (role !== 'other' && previousRoles.has(role)) {
        warnings.push({
          type: 'repeated_role',
          courseNumbers: [previous.courseNumber, current.courseNumber],
          detail: `Courses ${previous.courseNumber} and ${current.courseNumber} both lean on ${role}.`,
        })
      }
    }

    const previousTags = new Set(previous.narrativeTags ?? [])
    for (const tag of current.narrativeTags ?? []) {
      if (previousTags.has(tag)) {
        warnings.push({
          type: 'repeated_narrative_tag',
          courseNumbers: [previous.courseNumber, current.courseNumber],
          detail: `Courses ${previous.courseNumber} and ${current.courseNumber} repeat the ${tag} note.`,
        })
      }
    }
  }

  return warnings
}

function buildPricingSummary(
  courses: TastingMenuCourse[],
  pricing?: PricingModel | null
): PricingSummary | null {
  if (!pricing) return null

  const foodCostCents = courses.reduce(
    (sum, course) =>
      sum +
      course.components.reduce((courseSum, component) => courseSum + cents(component.costCents), 0),
    0
  )
  const laborCostCents = cents(pricing.laborCostCents)
  const fixedCostCents = cents(pricing.fixedCostCents)
  const totalCostCents = foodCostCents + laborCostCents + fixedCostCents
  const quotedPriceCents = cents(pricing.quotedPriceCents)
  const grossMarginPercent =
    quotedPriceCents > 0 ? ((quotedPriceCents - totalCostCents) / quotedPriceCents) * 100 : null
  const targetMarginPercent = Math.max(0, pricing.targetMarginPercent)
  const status =
    grossMarginPercent == null
      ? 'unknown'
      : grossMarginPercent >= targetMarginPercent
        ? 'on_target'
        : 'margin_risk'

  return {
    quotedPriceCents,
    totalCostCents,
    foodCostCents,
    laborCostCents,
    fixedCostCents,
    grossMarginPercent:
      grossMarginPercent == null ? null : Math.round(grossMarginPercent * 10) / 10,
    targetMarginPercent,
    status,
  }
}

function buildReusableComponents(courses: TastingMenuCourse[]) {
  const groups = new Map<
    string,
    { key: string; componentNames: Set<string>; courseNumbers: Set<number> }
  >()

  for (const course of courses) {
    for (const component of course.components) {
      const key = component.reusableKey?.trim()
      if (!key) continue
      const group = groups.get(key) ?? {
        key,
        componentNames: new Set<string>(),
        courseNumbers: new Set<number>(),
      }
      group.componentNames.add(component.name)
      group.courseNumbers.add(course.courseNumber)
      groups.set(key, group)
    }
  }

  return [...groups.values()]
    .filter((group) => group.courseNumbers.size > 1)
    .map((group) => ({
      key: group.key,
      componentNames: [...group.componentNames],
      courseNumbers: [...group.courseNumbers].sort((left, right) => left - right),
    }))
}

export function buildServiceOrchestrationPlan(params: {
  courses: TastingMenuCourse[]
  resources?: ServiceResource[]
  pricing?: PricingModel | null
}): ServiceOrchestrationPlan {
  const courses = sortCourses(params.courses)
  const dependencyRisks = buildDependencyRisks(courses)
  const resourceConflicts = buildResourceConflicts(courses, params.resources ?? [])
  const menuFlowWarnings = buildMenuFlowWarnings(courses)
  const prepTimeline = buildPrepTimeline(courses)
  const pricing = buildPricingSummary(courses, params.pricing)
  const reusableComponents = buildReusableComponents(courses)
  const componentCount = courses.reduce((sum, course) => sum + course.components.length, 0)
  const makeAheadCount = courses.reduce(
    (sum, course) =>
      sum +
      course.components.filter((component) =>
        ['two_days_before', 'day_before'].includes(component.prepStage)
      ).length,
    0
  )
  const duringServiceCount = courses.reduce(
    (sum, course) =>
      sum +
      course.components.filter((component) => component.prepStage === 'during_service').length,
    0
  )
  const score =
    courses.length * 2 +
    componentCount +
    makeAheadCount +
    duringServiceCount * 2 +
    dependencyRisks.length * 4 +
    resourceConflicts.length * 5

  return {
    courses: courses.map((course, index) => ({
      id: course.id,
      courseNumber: course.courseNumber,
      name: course.name,
      targetServeMinute: course.targetServeMinute,
      targetPaceMinutes: course.targetPaceMinutes ?? null,
      componentCount: course.components.length,
      plannedFireMinute:
        index === 0
          ? Math.max(0, course.targetServeMinute - (course.targetPaceMinutes ?? 8))
          : Math.max(
              courses[index - 1].targetServeMinute,
              course.targetServeMinute - (course.targetPaceMinutes ?? 8)
            ),
    })),
    prepTimeline,
    dependencyRisks,
    resourceConflicts,
    menuFlowWarnings,
    pricing,
    reusableComponents,
    complexity: {
      courseCount: courses.length,
      componentCount,
      makeAheadCount,
      duringServiceCount,
      dependencyRiskCount: dependencyRisks.length,
      resourceConflictCount: resourceConflicts.length,
      score,
    },
    serviceReady:
      dependencyRisks.length === 0 &&
      resourceConflicts.length === 0 &&
      (!pricing || pricing.status !== 'margin_risk'),
  }
}
