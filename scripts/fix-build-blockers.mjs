import fs from 'fs'

// Fix 1: remy-routines-actions.ts - split schema before superRefine
const remyPath = 'lib/ai/remy-routines-actions.ts'
let remy = fs.readFileSync(remyPath, 'utf8')
const oldRemy = `const createRoutineSchema = z
  .object({
    name: z.string().min(1).max(160),
    description: z.string().max(1000).nullable().optional(),
    status: z.enum(['active', 'paused', 'archived']).optional(),
    triggerType: z.enum(['signal', 'event', 'schedule', 'manual', 'webhook']),
    triggerConfig: z.record(z.string(), z.unknown()).optional(),
    conditionGroup: conditionGroupSchema.optional(),
    actions: z.array(actionSchema).min(1).max(25),
    priority: z.number().int().min(-1000).max(1000).optional(),
    approvalRequired: z.boolean().optional(),
    idempotencyWindowSeconds: z.number().int().min(60).max(2592000).optional(),
  })
  .superRefine`
const newRemy = `const routineBaseSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  triggerType: z.enum(['signal', 'event', 'schedule', 'manual', 'webhook']),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  conditionGroup: conditionGroupSchema.optional(),
  actions: z.array(actionSchema).min(1).max(25),
  priority: z.number().int().min(-1000).max(1000).optional(),
  approvalRequired: z.boolean().optional(),
  idempotencyWindowSeconds: z.number().int().min(60).max(2592000).optional(),
})

const createRoutineSchema = routineBaseSchema.superRefine`
if (remy.includes(oldRemy)) {
  remy = remy.replace(oldRemy, newRemy)
  remy = remy.replace('const updateRoutineSchema = createRoutineSchema.partial()', 'const updateRoutineSchema = routineBaseSchema.partial()')
  fs.writeFileSync(remyPath, remy)
  console.log('OK: remy schema split')
} else if (remy.includes('routineBaseSchema')) {
  console.log('SKIP: remy already fixed')
} else {
  console.log('WARN: remy pattern not found')
}

// Fix 2: day-of-service-panel.tsx
const dospPath = 'components/events/day-of-service-panel.tsx'
let dosp = fs.readFileSync(dospPath, 'utf8')
if (dosp.includes("from '@/lib/lifecycle/service-tracker-actions'")) {
  dosp = dosp.replace("from '@/lib/lifecycle/service-tracker-actions'", "from '@/lib/lifecycle/service-tracker-constants'")
  fs.writeFileSync(dospPath, dosp)
  console.log('OK: day-of-service-panel import fixed')
} else {
  console.log('SKIP: day-of-service-panel already fixed')
}

// Fix 3: tsconfig.json
const tscPath = 'tsconfig.json'
let tsc = fs.readFileSync(tscPath, 'utf8')
if (!tsc.includes('components/remotion')) {
  tsc = tsc.replace('"lib/db/migrations",\n    "worker"', '"lib/db/migrations",\n    "worker",\n    "components/remotion",\n    "lib/remotion"')
  fs.writeFileSync(tscPath, tsc)
  console.log('OK: tsconfig remotion excludes')
} else {
  console.log('SKIP: tsconfig already has remotion')
}

// Fix 4: quick-capture-actions.ts
const qcPath = 'lib/recipes/quick-capture-actions.ts'
let qc = fs.readFileSync(qcPath, 'utf8')
if (qc.includes('parsed.error.errors[0]')) {
  qc = qc.replace('parsed.error.errors[0]', 'parsed.error.issues[0]')
  fs.writeFileSync(qcPath, qc)
  console.log('OK: quick-capture .issues')
} else {
  console.log('SKIP: quick-capture already fixed')
}

// Fix 5: quick-reply.tsx
const qrPath = 'components/communication/quick-reply.tsx'
let qr = fs.readFileSync(qrPath, 'utf8')
if (qr.includes("size={compact ? 'sm' : 'default'}")) {
  qr = qr.replace("size={compact ? 'sm' : 'default'}", "size={compact ? 'sm' : undefined}")
  fs.writeFileSync(qrPath, qr)
  console.log('OK: quick-reply size')
} else {
  console.log('SKIP: quick-reply already fixed')
}

// Fix 6: dashboard page.tsx
const dashPath = 'app/(chef)/dashboard/page.tsx'
let dash = fs.readFileSync(dashPath, 'utf8')
if (!dash.includes('HeroMetricsSkeleton')) {
  dash = dash.replace(
    "  IntelligenceCardsSkeleton,\n} from './_sections/section-skeletons'",
    "  IntelligenceCardsSkeleton,\n  HeroMetricsSkeleton,\n} from './_sections/section-skeletons'\nimport { HeroZone } from './_sections/hero-zone'"
  )
  fs.writeFileSync(dashPath, dash)
  console.log('OK: dashboard imports')
} else {
  console.log('SKIP: dashboard already has imports')
}

// Fix 7: event-detail-ops-tab.tsx
const opsPath = 'app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx'
let ops = fs.readFileSync(opsPath, 'utf8')
if (ops.includes("from '@/lib/lifecycle/service-tracker-actions'")) {
  ops = ops.replace("from '@/lib/lifecycle/service-tracker-actions'", "from '@/lib/lifecycle/service-tracker-constants'")
  fs.writeFileSync(opsPath, ops)
  console.log('OK: ops-tab import')
} else {
  console.log('SKIP: ops-tab already fixed')
}

console.log('\nDone. All fixes applied.')
