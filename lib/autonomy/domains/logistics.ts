import { detectSituation, processSituation } from '@/lib/autonomy/engine'
import type {
  AutonomyAction,
  AutonomyDraft,
  AutonomyEntityRef,
  AutonomyExecutor,
  AutonomyPreferences,
  ExecutionResult,
} from '@/lib/autonomy/types'

export type LogisticsDraftKind =
  | 'prep_timeline'
  | 'shopping_list'
  | 'equipment_checklist'
  | 'day_of_timeline'
  | 'full_packet'

export interface LogisticsIngredientInput {
  name: string
  quantity?: number
  unit?: string
  category?: string
  vendor?: string
  baseServings?: number
  notes?: string
  required?: boolean
}

export interface LogisticsPrepTaskInput {
  label: string
  startOffsetMinutes?: number
  durationMinutes?: number
  station?: string
  ownerRole?: string
  notes?: string
}

export interface LogisticsEquipmentInput {
  name: string
  quantity?: number
  category?: string
  notes?: string
  source?: string
}

export interface LogisticsDishInput {
  id?: string
  name: string
  courseName?: string
  station?: string
  baseServings?: number
  prepMinutes?: number
  serviceOffsetMinutes?: number
  ingredients?: LogisticsIngredientInput[]
  equipment?: LogisticsEquipmentInput[]
  prepTasks?: LogisticsPrepTaskInput[]
}

export interface LogisticsCourseInput {
  id?: string
  name: string
  serviceOffsetMinutes?: number
  dishes?: LogisticsDishInput[]
}

export interface LogisticsDraftInput {
  tenantId: string
  chefId?: string
  eventId?: string
  menuId?: string
  eventName?: string
  eventDate?: string
  serviceStartAt?: string
  serviceDurationMinutes?: number
  guestCount?: number
  venueName?: string
  venueAddress?: string
  serviceStyle?: string
  courses?: LogisticsCourseInput[]
  dishes?: LogisticsDishInput[]
  ingredients?: LogisticsIngredientInput[]
  equipment?: LogisticsEquipmentInput[]
  pantryItems?: string[]
  notes?: string[]
}

export interface LogisticsTriggerInput extends LogisticsDraftInput {
  triggerType: LogisticsDraftKind
  source?: string
  title?: string
  detail?: string
  urgency?: number
  confidenceScore?: number
}

export interface LogisticsTimelineItem {
  id: string
  title: string
  section: string
  startOffsetMinutes: number
  startsAt?: string
  durationMinutes: number
  ownerRole: string
  station?: string
  sourceRefs: string[]
  notes?: string
  dependsOn?: string[]
}

export interface PrepTimelineDraft {
  tenantId: string
  eventId?: string
  menuId?: string
  kind: 'prep_timeline'
  generatedFrom: LogisticsDraftSource
  items: LogisticsTimelineItem[]
  assumptions: string[]
}

export interface ShoppingListItem {
  id: string
  name: string
  category: string
  vendor: string
  unit: string
  quantity: number | null
  status: 'needed' | 'on_hand'
  requiredBy: string[]
  notes?: string
}

export interface ShoppingListDraft {
  tenantId: string
  eventId?: string
  menuId?: string
  kind: 'shopping_list'
  generatedFrom: LogisticsDraftSource
  items: ShoppingListItem[]
  assumptions: string[]
}

export interface EquipmentChecklistItem {
  id: string
  name: string
  category: string
  quantity: number
  sourceRefs: string[]
  packed: boolean
  notes?: string
}

export interface EquipmentChecklistDraft {
  tenantId: string
  eventId?: string
  menuId?: string
  kind: 'equipment_checklist'
  generatedFrom: LogisticsDraftSource
  items: EquipmentChecklistItem[]
  assumptions: string[]
}

export interface DayOfTimelineDraft {
  tenantId: string
  eventId?: string
  menuId?: string
  kind: 'day_of_timeline'
  generatedFrom: LogisticsDraftSource
  items: LogisticsTimelineItem[]
  assumptions: string[]
}

export interface FullLogisticsPacketDraft {
  tenantId: string
  eventId?: string
  menuId?: string
  kind: 'full_packet'
  generatedFrom: LogisticsDraftSource
  prepTimeline: PrepTimelineDraft
  shoppingList: ShoppingListDraft
  equipmentChecklist: EquipmentChecklistDraft
  dayOfTimeline: DayOfTimelineDraft
}

export type LogisticsActionPayload =
  | PrepTimelineDraft
  | ShoppingListDraft
  | EquipmentChecklistDraft
  | DayOfTimelineDraft
  | FullLogisticsPacketDraft

export interface LogisticsDraftSource {
  guestCount: number
  serviceStartAt?: string
  eventDate?: string
  serviceStyle: string
  venueName?: string
  dishCount: number
  courseCount: number
}

export interface ProcessLogisticsTriggerOptions {
  preferences?: AutonomyPreferences
  executor?: AutonomyExecutor
}

export interface ProcessLogisticsTriggerResult {
  action: AutonomyAction
  draft: LogisticsActionPayload
  execution: ExecutionResult
}

const DEFAULT_CONFIDENCE_SCORE = 0.96
const DEFAULT_SERVICE_STYLE = 'private dining'
const DEFAULT_VENDOR = 'unassigned'
const DEFAULT_UNIT = 'each'

export function buildPrepTimelineDraft(input: LogisticsDraftInput): PrepTimelineDraft {
  const source = buildDraftSource(input)
  const serviceStart = parseServiceStart(input)
  const items: LogisticsTimelineItem[] = [
    buildTimelineItem({
      idParts: ['prep', 'confirm-counts'],
      title: 'Confirm guest count, menu, allergies, and venue constraints',
      section: 'planning',
      startOffsetMinutes: -4320,
      serviceStart,
      durationMinutes: 30,
      ownerRole: 'chef',
      sourceRefs: buildScopeRefs(input),
    }),
    buildTimelineItem({
      idParts: ['prep', 'procurement-check'],
      title: 'Confirm ingredient orders and substitutions',
      section: 'procurement',
      startOffsetMinutes: -2880,
      serviceStart,
      durationMinutes: 45,
      ownerRole: 'chef',
      sourceRefs: buildScopeRefs(input),
    }),
    buildTimelineItem({
      idParts: ['prep', 'equipment-pack'],
      title: 'Stage equipment, smallwares, disposables, and transport bins',
      section: 'pack',
      startOffsetMinutes: -1440,
      serviceStart,
      durationMinutes: 60,
      ownerRole: 'ops',
      sourceRefs: buildScopeRefs(input),
    }),
  ]

  for (const dish of collectDishes(input)) {
    const dishRef = dish.id ? `dish:${dish.id}` : `dish:${slugify(dish.name)}`

    if (dish.prepTasks?.length) {
      dish.prepTasks.forEach((task, index) => {
        items.push(
          buildTimelineItem({
            idParts: ['prep', dishRef, task.label, String(index)],
            title: `${task.label}: ${dish.name}`,
            section: 'dish prep',
            startOffsetMinutes: task.startOffsetMinutes ?? inferPrepOffset(dish),
            serviceStart,
            durationMinutes: task.durationMinutes ?? dish.prepMinutes ?? 45,
            ownerRole: task.ownerRole ?? 'prep cook',
            station: task.station ?? dish.station,
            sourceRefs: [dishRef],
            notes: task.notes,
          })
        )
      })
      continue
    }

    items.push(
      buildTimelineItem({
        idParts: ['prep', dishRef, 'mise'],
        title: `Prep mise en place for ${dish.name}`,
        section: 'dish prep',
        startOffsetMinutes: inferPrepOffset(dish),
        serviceStart,
        durationMinutes: dish.prepMinutes ?? inferPrepMinutes(dish),
        ownerRole: 'prep cook',
        station: dish.station,
        sourceRefs: [dishRef],
      })
    )
  }

  return {
    tenantId: input.tenantId,
    eventId: input.eventId,
    menuId: input.menuId,
    kind: 'prep_timeline',
    generatedFrom: source,
    items: sortTimeline(items),
    assumptions: buildAssumptions(input, [
      'Prep tasks are scheduled relative to service start when an exact service time is available.',
      'Dish prep defaults use deterministic station and complexity heuristics when recipe tasks are absent.',
    ]),
  }
}

export function buildShoppingListDraft(input: LogisticsDraftInput): ShoppingListDraft {
  const source = buildDraftSource(input)
  const pantry = new Set((input.pantryItems ?? []).map((item) => normalizeName(item)))
  const grouped = new Map<string, ShoppingListItem>()

  for (const ingredient of collectIngredients(input)) {
    const name = ingredient.name.trim()
    if (!name) continue

    const unit = normalizeUnit(ingredient.unit)
    const category = normalizeCategory(ingredient.category)
    const vendor = ingredient.vendor?.trim() || DEFAULT_VENDOR
    const key = [normalizeName(name), unit, category, vendor].join('|')
    const current =
      grouped.get(key) ??
      ({
        id: `shop-${slugify([category, vendor, name, unit].join('-'))}`,
        name,
        category,
        vendor,
        unit,
        quantity: null,
        status: pantry.has(normalizeName(name)) ? 'on_hand' : 'needed',
        requiredBy: [],
      } satisfies ShoppingListItem)

    const scaledQuantity = scaleIngredientQuantity(ingredient, source.guestCount)
    if (scaledQuantity !== null) {
      current.quantity = roundQuantity((current.quantity ?? 0) + scaledQuantity)
    }

    if (ingredient.notes) current.notes = joinNotes(current.notes, ingredient.notes)
    current.requiredBy = uniqueSorted([...current.requiredBy, ...ingredientRefs(ingredient)])
    grouped.set(key, current)
  }

  return {
    tenantId: input.tenantId,
    eventId: input.eventId,
    menuId: input.menuId,
    kind: 'shopping_list',
    generatedFrom: source,
    items: [...grouped.values()].sort(compareShoppingItems),
    assumptions: buildAssumptions(input, [
      'Ingredient quantities are scaled by guest count when base servings are provided.',
      'Ingredients without a quantity remain on the list as qualitative purchase reminders.',
    ]),
  }
}

export function buildEquipmentChecklistDraft(input: LogisticsDraftInput): EquipmentChecklistDraft {
  const source = buildDraftSource(input)
  const grouped = new Map<string, EquipmentChecklistItem>()

  for (const item of [...buildDefaultEquipment(input), ...collectEquipment(input)]) {
    const name = item.name.trim()
    if (!name) continue

    const category = item.category?.trim() || 'general'
    const key = [normalizeName(name), category].join('|')
    const current =
      grouped.get(key) ??
      ({
        id: `gear-${slugify([category, name].join('-'))}`,
        name,
        category,
        quantity: 0,
        sourceRefs: [],
        packed: false,
      } satisfies EquipmentChecklistItem)

    current.quantity += Math.max(1, Math.ceil(item.quantity ?? 1))
    current.sourceRefs = uniqueSorted([...current.sourceRefs, item.source ?? 'logistics'])
    if (item.notes) current.notes = joinNotes(current.notes, item.notes)
    grouped.set(key, current)
  }

  return {
    tenantId: input.tenantId,
    eventId: input.eventId,
    menuId: input.menuId,
    kind: 'equipment_checklist',
    generatedFrom: source,
    items: [...grouped.values()].sort(compareEquipmentItems),
    assumptions: buildAssumptions(input, [
      'Default gear is derived from guest count, service style, and offsite venue signals.',
      'Checklist items are additive and start unpacked so event code can persist pack status later.',
    ]),
  }
}

export function buildDayOfTimelineDraft(input: LogisticsDraftInput): DayOfTimelineDraft {
  const source = buildDraftSource(input)
  const serviceStart = parseServiceStart(input)
  const serviceDuration = normalizePositive(input.serviceDurationMinutes, 180)
  const items: LogisticsTimelineItem[] = [
    buildTimelineItem({
      idParts: ['day-of', 'final-pack-check'],
      title: 'Run final pack check against equipment, shopping, and menu lists',
      section: 'pack',
      startOffsetMinutes: -300,
      serviceStart,
      durationMinutes: 30,
      ownerRole: 'chef',
      sourceRefs: buildScopeRefs(input),
    }),
    buildTimelineItem({
      idParts: ['day-of', 'load-out'],
      title: 'Load food, equipment, signage, and disposables',
      section: 'transport',
      startOffsetMinutes: -240,
      serviceStart,
      durationMinutes: 45,
      ownerRole: 'ops',
      sourceRefs: buildScopeRefs(input),
    }),
    buildTimelineItem({
      idParts: ['day-of', 'arrival'],
      title: input.venueName ? `Arrive at ${input.venueName}` : 'Arrive onsite',
      section: 'onsite',
      startOffsetMinutes: -180,
      serviceStart,
      durationMinutes: 30,
      ownerRole: 'chef',
      sourceRefs: buildScopeRefs(input),
      notes: input.venueAddress,
    }),
    buildTimelineItem({
      idParts: ['day-of', 'setup'],
      title: 'Set stations, verify power, confirm water, and stage service path',
      section: 'onsite',
      startOffsetMinutes: -150,
      serviceStart,
      durationMinutes: 60,
      ownerRole: 'team',
      sourceRefs: buildScopeRefs(input),
    }),
    buildTimelineItem({
      idParts: ['day-of', 'briefing'],
      title: 'Team briefing and service sequence review',
      section: 'service',
      startOffsetMinutes: -75,
      serviceStart,
      durationMinutes: 15,
      ownerRole: 'chef',
      sourceRefs: buildScopeRefs(input),
    }),
    buildTimelineItem({
      idParts: ['day-of', 'final-fire'],
      title: 'Final fire, garnish, temperature check, and plating setup',
      section: 'service',
      startOffsetMinutes: -45,
      serviceStart,
      durationMinutes: 45,
      ownerRole: 'chef',
      sourceRefs: buildScopeRefs(input),
    }),
    buildTimelineItem({
      idParts: ['day-of', 'service-start'],
      title: 'Service starts',
      section: 'service',
      startOffsetMinutes: 0,
      serviceStart,
      durationMinutes: 15,
      ownerRole: 'team',
      sourceRefs: buildScopeRefs(input),
    }),
    buildTimelineItem({
      idParts: ['day-of', 'breakdown'],
      title: 'Breakdown, pack out, venue sweep, and client closeout',
      section: 'closeout',
      startOffsetMinutes: serviceDuration,
      serviceStart,
      durationMinutes: 60,
      ownerRole: 'ops',
      sourceRefs: buildScopeRefs(input),
    }),
  ]

  for (const course of collectCourses(input)) {
    const offset = course.serviceOffsetMinutes ?? inferCourseOffset(input, course)
    items.push(
      buildTimelineItem({
        idParts: ['day-of', 'course', course.name],
        title: `Serve ${course.name}`,
        section: 'courses',
        startOffsetMinutes: offset,
        serviceStart,
        durationMinutes: 20,
        ownerRole: 'service',
        sourceRefs: course.id ? [`course:${course.id}`] : [`course:${slugify(course.name)}`],
      })
    )
  }

  return {
    tenantId: input.tenantId,
    eventId: input.eventId,
    menuId: input.menuId,
    kind: 'day_of_timeline',
    generatedFrom: source,
    items: sortTimeline(items),
    assumptions: buildAssumptions(input, [
      'Day-of timeline anchors to service start when provided, otherwise it remains relative.',
      'Course pacing defaults to deterministic 25 minute intervals when explicit offsets are absent.',
    ]),
  }
}

export function buildFullLogisticsPacketDraft(
  input: LogisticsDraftInput
): FullLogisticsPacketDraft {
  return {
    tenantId: input.tenantId,
    eventId: input.eventId,
    menuId: input.menuId,
    kind: 'full_packet',
    generatedFrom: buildDraftSource(input),
    prepTimeline: buildPrepTimelineDraft(input),
    shoppingList: buildShoppingListDraft(input),
    equipmentChecklist: buildEquipmentChecklistDraft(input),
    dayOfTimeline: buildDayOfTimelineDraft(input),
  }
}

export function draftLogisticsAction(input: LogisticsTriggerInput): AutonomyAction {
  const payload = buildLogisticsDraftPayload(input)
  const actionType = `logistics.${input.triggerType}.draft`
  const title = input.title ?? buildActionTitle(input.triggerType, input.eventName)
  const detail =
    input.detail ??
    `Draft ${humanizeDraftKind(input.triggerType)} logistics from deterministic event and menu payload data.`
  const situation = detectSituation({
    tenantId: input.tenantId,
    domain: 'logistics',
    source: input.source ?? 'logistics_autonomy_adapter',
    signalType: actionType,
    title,
    detail,
    urgency: input.urgency ?? 2,
    confidenceScore: input.confidenceScore ?? DEFAULT_CONFIDENCE_SCORE,
    entityRefs: buildEntityRefs(input),
    payload: buildAutonomyPayload(input, payload),
  })
  const draft = buildAutonomyDraft(input, payload, title)

  return {
    tenantId: input.tenantId,
    domain: 'logistics',
    actionType,
    title,
    description: detail,
    riskLevel: 'low',
    confidenceScore: situation.confidenceScore,
    draftMethod: 'formula',
    draft,
    source: situation.source,
    situation,
    entityRefs: situation.entityRefs,
    dedupKey: buildDedupKey(input),
    status: 'drafted',
    createdAt: situation.detectedAt,
  }
}

export async function processLogisticsTrigger(
  input: LogisticsTriggerInput,
  options: ProcessLogisticsTriggerOptions = {}
): Promise<ProcessLogisticsTriggerResult> {
  const action = draftLogisticsAction(input)
  const draft = buildLogisticsDraftPayload(input)
  const execution = await processSituation(
    {
      tenantId: input.tenantId,
      domain: 'logistics',
      source: action.source,
      signalType: action.actionType,
      title: action.title,
      detail: action.description,
      urgency: input.urgency ?? 2,
      confidenceScore: action.confidenceScore,
      entityRefs: action.entityRefs,
      payload: action.draft.payload,
    },
    {
      preferences: options.preferences,
      executor: options.executor ?? buildLogisticsExecutor(input.triggerType),
    }
  )

  return {
    action,
    draft,
    execution,
  }
}

function buildLogisticsDraftPayload(input: LogisticsTriggerInput): LogisticsActionPayload {
  if (input.triggerType === 'prep_timeline') return buildPrepTimelineDraft(input)
  if (input.triggerType === 'shopping_list') return buildShoppingListDraft(input)
  if (input.triggerType === 'equipment_checklist') return buildEquipmentChecklistDraft(input)
  if (input.triggerType === 'day_of_timeline') return buildDayOfTimelineDraft(input)
  return buildFullLogisticsPacketDraft(input)
}

function buildAutonomyDraft(
  input: LogisticsTriggerInput,
  payload: LogisticsActionPayload,
  summary: string
): AutonomyDraft {
  return {
    summary,
    preview: buildPreview(payload),
    payload: buildAutonomyPayload(input, payload),
    reversible: true,
    evidence: [
      {
        label: 'Tenant scope',
        value: input.tenantId,
      },
      {
        label: 'Draft method',
        value: 'deterministic logistics formula',
        confidence: input.confidenceScore ?? DEFAULT_CONFIDENCE_SCORE,
      },
      {
        label: 'Guest count',
        value: String(buildDraftSource(input).guestCount),
      },
    ],
    nextStepLabel: 'Record logistics draft',
  }
}

function buildAutonomyPayload(
  input: LogisticsTriggerInput,
  draft: LogisticsActionPayload
): Record<string, unknown> {
  return {
    triggerType: input.triggerType,
    tenantId: input.tenantId,
    chefId: input.chefId,
    eventId: input.eventId,
    menuId: input.menuId,
    logisticsDraft: draft,
  }
}

function buildLogisticsExecutor(triggerType: LogisticsDraftKind): AutonomyExecutor {
  return {
    async execute() {
      return {
        success: true,
        message: `${humanizeDraftKind(triggerType)} logistics draft auto-executed and recorded.`,
      }
    },
  }
}

function buildDraftSource(input: LogisticsDraftInput): LogisticsDraftSource {
  const dishes = collectDishes(input)
  const courses = collectCourses(input)

  return {
    guestCount: normalizePositive(input.guestCount, 1),
    serviceStartAt: input.serviceStartAt,
    eventDate: input.eventDate,
    serviceStyle: input.serviceStyle?.trim() || DEFAULT_SERVICE_STYLE,
    venueName: input.venueName,
    dishCount: dishes.length,
    courseCount: courses.length,
  }
}

function collectCourses(input: LogisticsDraftInput): LogisticsCourseInput[] {
  if (input.courses?.length) return input.courses
  const dishes = input.dishes ?? []
  const courseNames = uniqueSorted(
    dishes.map((dish) => dish.courseName).filter((name): name is string => Boolean(name))
  )

  return courseNames.map((name, index) => ({
    id: slugify(name),
    name,
    serviceOffsetMinutes: index * 25,
    dishes: dishes.filter((dish) => dish.courseName === name),
  }))
}

function collectDishes(input: LogisticsDraftInput): LogisticsDishInput[] {
  const courseDishes = (input.courses ?? []).flatMap((course) =>
    (course.dishes ?? []).map((dish) => ({
      ...dish,
      courseName: dish.courseName ?? course.name,
    }))
  )

  return [...courseDishes, ...(input.dishes ?? [])]
}

function collectIngredients(
  input: LogisticsDraftInput
): Array<LogisticsIngredientInput & { refs?: string[] }> {
  const rootIngredients = (input.ingredients ?? []).map((ingredient) => ({
    ...ingredient,
    refs: buildScopeRefs(input),
  }))
  const dishIngredients = collectDishes(input).flatMap((dish) => {
    const ref = dish.id ? `dish:${dish.id}` : `dish:${slugify(dish.name)}`
    return (dish.ingredients ?? []).map((ingredient) => ({
      ...ingredient,
      baseServings: ingredient.baseServings ?? dish.baseServings,
      refs: [ref],
    }))
  })

  return [...rootIngredients, ...dishIngredients]
}

function collectEquipment(input: LogisticsDraftInput): LogisticsEquipmentInput[] {
  const rootEquipment = input.equipment ?? []
  const dishEquipment = collectDishes(input).flatMap((dish) => {
    const source = dish.id ? `dish:${dish.id}` : `dish:${slugify(dish.name)}`
    return (dish.equipment ?? []).map((item) => ({
      ...item,
      source: item.source ?? source,
    }))
  })

  return [...rootEquipment, ...dishEquipment]
}

function buildDefaultEquipment(input: LogisticsDraftInput): LogisticsEquipmentInput[] {
  const guestCount = normalizePositive(input.guestCount, 1)
  const serviceStyle = (input.serviceStyle ?? DEFAULT_SERVICE_STYLE).toLowerCase()
  const isOffsite = Boolean(input.venueName || input.venueAddress)
  const defaults: LogisticsEquipmentInput[] = [
    {
      name: 'Sheet pans',
      quantity: Math.max(2, Math.ceil(guestCount / 20)),
      category: 'kitchen',
      source: 'default',
    },
    {
      name: 'Labels and painter tape',
      quantity: 1,
      category: 'admin',
      source: 'default',
    },
    {
      name: 'Sanitizer bucket kit',
      quantity: 1,
      category: 'sanitation',
      source: 'default',
    },
  ]

  if (isOffsite) {
    defaults.push(
      {
        name: 'Insulated transport bins',
        quantity: Math.max(1, Math.ceil(guestCount / 25)),
        category: 'transport',
        source: 'default',
      },
      {
        name: 'Extension cords',
        quantity: 2,
        category: 'power',
        source: 'default',
      }
    )
  }

  if (serviceStyle.includes('buffet')) {
    defaults.push(
      {
        name: 'Chafing dishes',
        quantity: Math.max(2, Math.ceil(guestCount / 30)),
        category: 'service',
        source: 'default',
      },
      {
        name: 'Sterno sets',
        quantity: Math.max(2, Math.ceil(guestCount / 20)),
        category: 'service',
        source: 'default',
      }
    )
  }

  if (serviceStyle.includes('plated') || serviceStyle.includes('tasting')) {
    defaults.push(
      {
        name: 'Plating spoons',
        quantity: 4,
        category: 'service',
        source: 'default',
      },
      {
        name: 'Squeeze bottles',
        quantity: 4,
        category: 'service',
        source: 'default',
      }
    )
  }

  return defaults
}

function buildTimelineItem(input: {
  idParts: string[]
  title: string
  section: string
  startOffsetMinutes: number
  serviceStart: Date | null
  durationMinutes: number
  ownerRole: string
  sourceRefs: string[]
  station?: string
  notes?: string
  dependsOn?: string[]
}): LogisticsTimelineItem {
  const startsAt = input.serviceStart
    ? new Date(input.serviceStart.getTime() + input.startOffsetMinutes * 60_000).toISOString()
    : undefined

  return {
    id: slugify(input.idParts.join('-')),
    title: input.title,
    section: input.section,
    startOffsetMinutes: input.startOffsetMinutes,
    startsAt,
    durationMinutes: Math.max(5, Math.round(input.durationMinutes)),
    ownerRole: input.ownerRole,
    station: input.station,
    sourceRefs: uniqueSorted(input.sourceRefs),
    notes: input.notes,
    dependsOn: input.dependsOn,
  }
}

function parseServiceStart(input: LogisticsDraftInput): Date | null {
  const candidate = input.serviceStartAt ?? input.eventDate
  if (!candidate) return null

  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function inferPrepOffset(dish: LogisticsDishInput): number {
  const name = dish.name.toLowerCase()
  if (name.includes('braise') || name.includes('stock') || name.includes('marinade')) return -2880
  if (name.includes('dessert') || name.includes('cake') || name.includes('custard')) return -1440
  if (dish.prepMinutes && dish.prepMinutes >= 90) return -1440
  return -360
}

function inferPrepMinutes(dish: LogisticsDishInput): number {
  const ingredientCount = dish.ingredients?.length ?? 0
  const equipmentCount = dish.equipment?.length ?? 0
  return Math.min(180, Math.max(30, 30 + ingredientCount * 5 + equipmentCount * 10))
}

function inferCourseOffset(input: LogisticsDraftInput, course: LogisticsCourseInput): number {
  const courses = collectCourses(input)
  const index = Math.max(
    0,
    courses.findIndex((candidate) => candidate.name === course.name)
  )
  return index * 25
}

function scaleIngredientQuantity(
  ingredient: LogisticsIngredientInput,
  guestCount: number
): number | null {
  if (typeof ingredient.quantity !== 'number' || !Number.isFinite(ingredient.quantity)) return null
  const baseServings = normalizePositive(ingredient.baseServings, guestCount)
  return (ingredient.quantity * guestCount) / baseServings
}

function buildEntityRefs(input: LogisticsDraftInput): AutonomyEntityRef[] {
  return [
    input.eventId
      ? {
          type: 'event',
          id: input.eventId,
          label: input.eventName,
        }
      : null,
    input.menuId
      ? {
          type: 'menu',
          id: input.menuId,
        }
      : null,
    input.chefId
      ? {
          type: 'chef',
          id: input.chefId,
        }
      : null,
  ].filter((ref): ref is AutonomyEntityRef => Boolean(ref))
}

function buildScopeRefs(input: LogisticsDraftInput): string[] {
  return [
    `tenant:${input.tenantId}`,
    input.eventId ? `event:${input.eventId}` : null,
    input.menuId ? `menu:${input.menuId}` : null,
  ].filter((ref): ref is string => Boolean(ref))
}

function buildDedupKey(input: LogisticsTriggerInput): string {
  return [
    'logistics',
    input.triggerType,
    `tenant:${input.tenantId}`,
    input.eventId ? `event:${input.eventId}` : 'event:none',
    input.menuId ? `menu:${input.menuId}` : 'menu:none',
  ].join(':')
}

function buildActionTitle(kind: LogisticsDraftKind, eventName?: string): string {
  const scope = eventName ? ` for ${eventName}` : ''
  return `Draft ${humanizeDraftKind(kind)}${scope}`
}

function buildPreview(payload: LogisticsActionPayload): string {
  if (payload.kind === 'prep_timeline') {
    return `Prep timeline with ${payload.items.length} scheduled items.`
  }

  if (payload.kind === 'shopping_list') {
    const needed = payload.items.filter((item) => item.status === 'needed').length
    return `Shopping list with ${needed} needed items and ${payload.items.length} total items.`
  }

  if (payload.kind === 'equipment_checklist') {
    return `Equipment checklist with ${payload.items.length} pack items.`
  }

  if (payload.kind === 'day_of_timeline') {
    return `Day-of timeline with ${payload.items.length} service items.`
  }

  return [
    buildPreview(payload.prepTimeline),
    buildPreview(payload.shoppingList),
    buildPreview(payload.equipmentChecklist),
    buildPreview(payload.dayOfTimeline),
  ].join(' ')
}

function buildAssumptions(input: LogisticsDraftInput, defaults: string[]): string[] {
  const assumptions = [...defaults]
  if (!input.serviceStartAt)
    assumptions.push('No service start time was supplied, so timeline times remain relative.')
  if (!input.guestCount)
    assumptions.push('No guest count was supplied, so quantities default to one guest.')
  if (input.notes?.length) assumptions.push(...input.notes)
  return uniqueSorted(assumptions)
}

function humanizeDraftKind(kind: LogisticsDraftKind): string {
  return kind.replaceAll('_', ' ')
}

function normalizePositive(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback
  return value
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeUnit(unit: string | undefined): string {
  return unit?.trim().toLowerCase() || DEFAULT_UNIT
}

function normalizeCategory(category: string | undefined): string {
  return category?.trim().toLowerCase() || 'uncategorized'
}

function ingredientRefs(ingredient: LogisticsIngredientInput & { refs?: string[] }): string[] {
  return ingredient.refs?.length ? ingredient.refs : ['menu']
}

function roundQuantity(value: number): number {
  return Math.round(value * 100) / 100
}

function joinNotes(existing: string | undefined, next: string): string {
  return existing ? `${existing}; ${next}` : next
}

function sortTimeline(items: LogisticsTimelineItem[]): LogisticsTimelineItem[] {
  return [...items].sort((a, b) => {
    if (a.startOffsetMinutes !== b.startOffsetMinutes) {
      return a.startOffsetMinutes - b.startOffsetMinutes
    }
    return a.title.localeCompare(b.title)
  })
}

function compareShoppingItems(a: ShoppingListItem, b: ShoppingListItem): number {
  return (
    a.status.localeCompare(b.status) ||
    a.category.localeCompare(b.category) ||
    a.vendor.localeCompare(b.vendor) ||
    a.name.localeCompare(b.name)
  )
}

function compareEquipmentItems(a: EquipmentChecklistItem, b: EquipmentChecklistItem): number {
  return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'item'
}
