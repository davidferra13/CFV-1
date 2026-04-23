import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

export const ROLE_ORDER = [
  'public',
  'chef',
  'client',
  'admin',
  'staff',
  'partner',
  'mobile-chef',
  'mobile-client',
  'kiosk',
]

export const ROLE_CONFIGS = {
  public: {
    label: 'Public',
    viewport: { width: 1440, height: 900 },
    storageState: '',
    requiresAuth: false,
  },
  chef: {
    label: 'Chef',
    viewport: { width: 1440, height: 900 },
    storageState: '.auth/chef.json',
    requiresAuth: true,
  },
  client: {
    label: 'Client',
    viewport: { width: 1440, height: 900 },
    storageState: '.auth/client.json',
    requiresAuth: true,
  },
  admin: {
    label: 'Admin',
    viewport: { width: 1440, height: 900 },
    storageState: '.auth/admin.json',
    requiresAuth: true,
  },
  staff: {
    label: 'Staff',
    viewport: { width: 1440, height: 900 },
    storageState: '.auth/staff.json',
    requiresAuth: true,
  },
  partner: {
    label: 'Partner',
    viewport: { width: 1440, height: 900 },
    storageState: '.auth/partner.json',
    requiresAuth: true,
  },
  'mobile-chef': {
    label: 'Mobile Chef',
    viewport: { width: 390, height: 844 },
    storageState: '.auth/chef.json',
    requiresAuth: true,
  },
  'mobile-client': {
    label: 'Mobile Client',
    viewport: { width: 390, height: 844 },
    storageState: '.auth/client.json',
    requiresAuth: true,
  },
  kiosk: {
    label: 'Kiosk',
    viewport: { width: 1024, height: 768 },
    storageState: '',
    requiresAuth: false,
  },
}

const DEFAULT_HELP_SLUG = 'onboarding'
const GENERIC_INVALID_TOKEN = 'not-a-real-token'
const UUID_PLACEHOLDER = '00000000-0000-4000-8000-000000000000'
const GENERIC_DYNAMIC_SLUG = 'missing-route-contract'
const GENERIC_DYNAMIC_THREAD = 'missing-thread'
const PUBLIC_NOT_FOUND_SEGMENT_PATTERNS = [
  /\/availability\/\[token\]/,
  /\/beta-survey\/\[token\]/,
  /\/book\/campaign\/\[token\]/,
  /\/cannabis-invite\/\[token\]/,
  /\/client\/\[token\]/,
  /\/event\/\[eventId\]\/guest\/\[secureToken\]/,
  /\/experience\/\[shareToken\]/,
  /\/g\/\[code\]/,
  /\/guest-feedback\/\[token\]/,
  /\/hub\/g\/\[groupToken\]/,
  /\/hub\/join\/\[groupToken\]/,
  /\/hub\/me\/\[profileToken\]/,
  /\/partner-report\/\[token\]/,
  /\/photos\/\[token\]/,
  /\/proposal\/\[token\]/,
  /\/rebook\/\[token\]/,
  /\/refer\/\[chefSlug\]/,
  /\/share\/\[token\](?:\/recap)?$/,
  /\/staff-portal\/\[id\]/,
  /\/survey\/\[token\]/,
  /\/view\/\[token\]/,
  /\/worksheet\/\[token\]/,
]

const EXPLICIT_GUARDED_DYNAMIC_ROUTE_CONTRACTS = {
  '/beta-survey/public/[slug]': {
    expected: {
      type: 'default',
      pattern: null,
      reason: 'missing public survey slug renders an unavailable state instead of a hard failure',
    },
    params: {
      slug: 'missing-public-survey',
    },
    source: 'app/beta-survey/public/[slug]/page.tsx',
  },
  '/chat/[id]': {
    expected: {
      type: 'redirect-ok',
      pattern: /\/chat$/,
      reason: 'missing chef conversation should redirect back to the chat index',
    },
    params: {
      id: UUID_PLACEHOLDER,
    },
    source: 'app/(chef)/chat/[id]/page.tsx',
  },
  '/customers/[slug]': {
    expected: {
      type: 'default',
      pattern: null,
      reason: 'missing customer story slug renders an unavailable state instead of a hard failure',
    },
    params: {
      slug: 'missing-customer-story',
    },
    source: 'app/(public)/customers/[slug]/page.tsx',
  },
  '/my-chat/[id]': {
    expected: {
      type: 'redirect-ok',
      pattern: /\/my-chat$/,
      reason: 'missing client conversation should redirect back to the chat index',
    },
    params: {
      id: UUID_PLACEHOLDER,
    },
    source: 'app/(client)/my-chat/[id]/page.tsx',
  },
  '/settings/journey/[id]': {
    expected: {
      type: 'redirect-ok',
      pattern: /\/settings\/journal\/[^/]+$/,
      reason: 'legacy journey detail routes redirect into the journal detail surface',
    },
    params: {
      id: UUID_PLACEHOLDER,
    },
    source: 'app/(chef)/settings/journey/[id]/page.tsx',
  },
}

const STATIC_PARAM_FALLBACKS = {
  '/compare/[slug]': {
    source: 'lib/marketing/compare-pages.ts#COMPARE_PAGES',
    resolve(loadModule) {
      const module = loadModule('lib/marketing/compare-pages.ts')
      return Array.isArray(module.COMPARE_PAGES)
        ? module.COMPARE_PAGES.map((page) => ({ slug: page.slug }))
        : []
    },
  },
  '/customers/[slug]': {
    source: 'lib/marketing/customer-stories.ts#CUSTOMER_STORIES',
    resolve(loadModule) {
      const module = loadModule('lib/marketing/customer-stories.ts')
      return Array.isArray(module.CUSTOMER_STORIES)
        ? module.CUSTOMER_STORIES.map((story) => ({ slug: story.slug }))
        : []
    },
  },
  '/ingredients/[category]': {
    source: 'lib/openclaw/ingredient-knowledge-queries.ts#INGREDIENT_CATEGORIES',
    resolve(loadModule) {
      const module = loadModule('lib/openclaw/ingredient-knowledge-queries.ts')
      const categories = module.INGREDIENT_CATEGORIES ?? {}
      return Object.keys(categories).map((category) => ({ category }))
    },
  },
  '/nearby/collections/[slug]': {
    source: 'config/nearby-collections.ts#NEARBY_COLLECTIONS',
    resolve(loadModule) {
      const module = loadModule('config/nearby-collections.ts')
      return Array.isArray(module.NEARBY_COLLECTIONS)
        ? module.NEARBY_COLLECTIONS.map((collection) => ({ slug: collection.slug }))
        : []
    },
  },
}

function relativePathFromRoot(rootDir, targetPath) {
  return path.relative(rootDir, targetPath).replace(/\\/g, '/')
}

function toScriptRelativeSpecifier(targetPath) {
  const relativePath = path.relative(SCRIPT_DIR, targetPath).replace(/\\/g, '/')
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

async function withTsxRequire(rootDir, callback) {
  let hook = null

  try {
    const { register } = require('tsx/cjs/api')
    hook = register({ namespace: `site-audit-${process.pid}-${Date.now()}` })

    return await callback((projectRelativePath) =>
      hook.require(
        toScriptRelativeSpecifier(path.resolve(rootDir, projectRelativePath)),
        import.meta.url
      )
    )
  } catch {
    return await callback(() => {
      throw new Error('tsx module loading is unavailable')
    })
  } finally {
    if (hook?.unregister) {
      await hook.unregister()
    }
  }
}

function summarizeByKind(items) {
  return items.reduce((acc, item) => {
    const kind = item?.resolver?.kind ?? 'unknown'
    acc[kind] = (acc[kind] || 0) + 1
    return acc
  }, {})
}

function hasPageGenerateStaticParams(source) {
  return /\bgenerateStaticParams\b/.test(source)
}

function hasPageNotFoundGuard(source) {
  return /\bnotFound\s*\(/.test(source)
}

function extractDynamicSegments(routeTemplate) {
  const segments = routeTemplate.split('/').filter(Boolean)

  return segments.flatMap((segment) => {
    const optionalCatchAllMatch = segment.match(/^\[\[\.\.\.(.+)\]\]$/)
    if (optionalCatchAllMatch) {
      return [{ kind: 'optional-catchall', name: optionalCatchAllMatch[1] }]
    }

    const catchAllMatch = segment.match(/^\[\.\.\.(.+)\]$/)
    if (catchAllMatch) {
      return [{ kind: 'catchall', name: catchAllMatch[1] }]
    }

    const dynamicMatch = segment.match(/^\[(.+)\]$/)
    if (dynamicMatch) {
      return [{ kind: 'single', name: dynamicMatch[1] }]
    }

    return []
  })
}

function normalizeStaticParamEntries(rawEntries, dynamicSegments) {
  if (!Array.isArray(rawEntries) || dynamicSegments.length === 0) {
    return []
  }

  const paramNames = new Set(dynamicSegments.map((segment) => segment.name))

  return rawEntries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const normalized = {}

      for (const [key, value] of Object.entries(entry)) {
        if (!paramNames.has(key)) continue
        if (typeof value === 'string') {
          normalized[key] = value
          continue
        }
        if (Array.isArray(value)) {
          normalized[key] = value.filter((item) => typeof item === 'string')
        }
      }

      return normalized
    })
    .filter((entry) => Object.keys(entry).length > 0)
}

function fillRouteTemplate(routeTemplate, params) {
  const segments = routeTemplate.split('/').filter(Boolean)
  const resolvedSegments = []

  for (const segment of segments) {
    const optionalCatchAllMatch = segment.match(/^\[\[\.\.\.(.+)\]\]$/)
    if (optionalCatchAllMatch) {
      const value = params[optionalCatchAllMatch[1]]
      const parts = Array.isArray(value)
        ? value
        : typeof value === 'string'
          ? value.split('/').filter(Boolean)
          : []
      resolvedSegments.push(...parts)
      continue
    }

    const catchAllMatch = segment.match(/^\[\.\.\.(.+)\]$/)
    if (catchAllMatch) {
      const value = params[catchAllMatch[1]]
      const parts = Array.isArray(value)
        ? value
        : typeof value === 'string'
          ? value.split('/').filter(Boolean)
          : []
      if (parts.length === 0) return null
      resolvedSegments.push(...parts)
      continue
    }

    const dynamicMatch = segment.match(/^\[(.+)\]$/)
    if (!dynamicMatch) {
      resolvedSegments.push(segment)
      continue
    }

    const value = params[dynamicMatch[1]]
    if (!value) return null
    resolvedSegments.push(String(value))
  }

  return `/${resolvedSegments.join('/')}` || '/'
}

function placeholderValueForParam(paramName) {
  if (paramName === 'slug') return GENERIC_DYNAMIC_SLUG
  if (paramName === 'threadId') return GENERIC_DYNAMIC_THREAD
  if (paramName === 'category') return 'missing-category'
  if (paramName === 'code') return GENERIC_INVALID_TOKEN
  if (paramName === 'token' || paramName.endsWith('Token')) return GENERIC_INVALID_TOKEN
  if (paramName === 'id' || /(?:^|[A-Z])[A-Za-z0-9]*Id$/.test(paramName)) {
    return UUID_PLACEHOLDER
  }

  return `missing-${paramName}`
}

function buildPlaceholderParams(dynamicSegments) {
  const params = {}

  for (const segment of dynamicSegments) {
    if (segment.kind !== 'single') return null
    params[segment.name] = placeholderValueForParam(segment.name)
  }

  return params
}

function buildGuardedPlaceholderContract(routeTemplate, source, dynamicSegments) {
  const explicitContract = EXPLICIT_GUARDED_DYNAMIC_ROUTE_CONTRACTS[routeTemplate]
  if (explicitContract) {
    return {
      expected: explicitContract.expected,
      params: explicitContract.params,
      source: explicitContract.source,
    }
  }

  if (!hasPageNotFoundGuard(source)) {
    return null
  }

  const params = buildPlaceholderParams(dynamicSegments)
  if (!params) return null

  return {
    expected: {
      type: 'not-found-ok',
      reason: 'page declares a notFound() guard for unresolved placeholder params',
    },
    params,
    source: 'page-not-found-guard',
  }
}

async function loadStaticParamsContract({
  dynamicSegments,
  rootDir,
  routeTemplate,
  source,
  sourceFile,
  loadModule,
}) {
  const fallback = STATIC_PARAM_FALLBACKS[routeTemplate]
  if (!hasPageGenerateStaticParams(source) && !fallback) {
    return null
  }

  const sourceFileRelativePath = relativePathFromRoot(rootDir, sourceFile)

  if (hasPageGenerateStaticParams(source)) {
    try {
      const pageModule = loadModule(sourceFileRelativePath)
      if (typeof pageModule.generateStaticParams === 'function') {
        const pageParams = normalizeStaticParamEntries(
          await pageModule.generateStaticParams(),
          dynamicSegments
        )

        if (pageParams.length > 0 || !fallback) {
          return {
            paramsList: pageParams,
            source: `${sourceFileRelativePath}#generateStaticParams`,
          }
        }
      }
    } catch {
      // Fall back to known static-param modules when the page module is not directly loadable.
    }
  }

  if (!fallback) {
    return null
  }

  return {
    paramsList: normalizeStaticParamEntries(fallback.resolve(loadModule), dynamicSegments),
    source: fallback.source,
  }
}

function isRouteGroup(segment) {
  return /^\(.+\)$/.test(segment)
}

function isSpecialSegment(segment) {
  return segment.startsWith('@') || segment.includes('(.)') || segment.includes('(..')
}

function stripRouteGroups(segments) {
  return segments.filter((segment) => !isRouteGroup(segment))
}

function findPageFiles(rootDir) {
  const appDir = path.join(rootDir, 'app')
  const files = []

  function walk(currentDir) {
    let entries = []
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === '.next' || entry.name === 'node_modules') {
        continue
      }

      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }

      if (entry.isFile() && entry.name === 'page.tsx') {
        files.push(fullPath)
      }
    }
  }

  walk(appDir)
  return files
}

function deriveRole(originalSegments) {
  if (originalSegments.includes('(chef)')) return 'chef'
  if (originalSegments.includes('(client)')) return 'client'
  if (originalSegments.includes('(admin)')) return 'admin'
  if (originalSegments.includes('(staff)')) return 'staff'
  if (originalSegments.includes('(partner)')) return 'partner'
  if (originalSegments.includes('(mobile)')) {
    if (originalSegments.includes('chef')) return 'mobile-chef'
    if (originalSegments.includes('client')) return 'mobile-client'
    return 'public'
  }
  if (originalSegments[0] === 'kiosk') return 'kiosk'
  return 'public'
}

function normalizeRouteTemplate(originalSegments) {
  const cleaned = stripRouteGroups(originalSegments)
  if (cleaned.length === 0) return '/'
  return `/${cleaned.join('/')}`
}

function pickChefEventId(seedIds, routeTemplate) {
  if (!seedIds?.eventIds) return ''

  if (
    /(\/aar|\/close-out|\/debrief|\/documents|\/guest-card|\/receipts|\/story)(?:\/|$)/.test(
      routeTemplate
    )
  ) {
    return seedIds.eventIds.completed
  }

  if (
    /(\/approve-menu|\/choose-menu|\/contract|\/countdown|\/event-summary|\/invoice|\/pay(?:\/|$)|\/payment-plan|\/pre-event-checklist|\/proposal)(?:\/|$)/.test(
      routeTemplate
    )
  ) {
    return seedIds.eventIds.confirmed
  }

  return seedIds.eventIds.draft || seedIds.eventIds.confirmed || seedIds.eventIds.completed
}

function pickClientEventId(seedIds, routeTemplate) {
  if (!seedIds?.eventIds) return ''

  if (/(\/invoice|\/event-summary)(?:\/|$)/.test(routeTemplate)) {
    return seedIds.eventIds.completed
  }

  return seedIds.eventIds.completed || seedIds.eventIds.draft || seedIds.eventIds.confirmed
}

function pickQuoteId(seedIds, routeTemplate) {
  if (!seedIds?.quoteIds) return ''
  if (/\/accepted(?:\/|$)/.test(routeTemplate)) return seedIds.quoteIds.accepted
  if (/\/sent(?:\/|$)/.test(routeTemplate)) return seedIds.quoteIds.sent
  return seedIds.quoteIds.draft
}

function pickInquiryId(seedIds, routeTemplate) {
  if (!seedIds?.inquiryIds) return ''
  if (/awaiting-client|awaitingClient/i.test(routeTemplate)) return seedIds.inquiryIds.awaitingClient
  return seedIds.inquiryIds.awaitingChef
}

function resolveTokenLikeValue(routeTemplate, seedIds) {
  if (routeTemplate.startsWith('/mobile/client/')) return seedIds?.clientId || ''
  if (routeTemplate.startsWith('/mobile/chef/')) return seedIds?.chefId || ''
  return GENERIC_INVALID_TOKEN
}

function resolveIdByContext({ routeTemplate, seedIds, role }) {
  if (!seedIds) return ''

  if (routeTemplate.startsWith('/cannabis/events/')) return pickChefEventId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/events/')) return pickChefEventId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/my-events/')) return pickClientEventId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/quotes/')) return pickQuoteId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/my-quotes/')) return pickQuoteId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/my-inquiries/')) return pickInquiryId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/inquiries/')) return pickInquiryId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/clients/')) return seedIds.clientIds?.primary || ''
  if (routeTemplate.startsWith('/staff/') && role === 'chef') return seedIds.staffId || ''
  if (routeTemplate.startsWith('/menus/')) return seedIds.menuId || ''
  if (routeTemplate.startsWith('/culinary/menus/')) return seedIds.menuId || ''
  if (routeTemplate.startsWith('/recipes/')) return seedIds.recipeId || ''
  if (routeTemplate.startsWith('/culinary/recipes/')) return seedIds.recipeId || ''
  if (routeTemplate.startsWith('/print/menu/')) return seedIds.menuId || ''
  if (routeTemplate.startsWith('/admin/users/')) return seedIds.chefId || ''
  if (routeTemplate.startsWith('/partner/locations/')) return seedIds.partnerLocationId || ''
  if (routeTemplate.startsWith('/partners/')) return seedIds.partnerId || ''

  if (routeTemplate.startsWith('/staff-portal/')) return GENERIC_INVALID_TOKEN
  if (routeTemplate.startsWith('/view/')) return GENERIC_INVALID_TOKEN

  return ''
}

function resolveDynamicValue({ routeTemplate, paramName, seedIds, role }) {
  if (role === 'mobile-chef' && paramName === 'slug') {
    return seedIds?.chefId || ''
  }

  if (role === 'mobile-client' && paramName === 'token') {
    return seedIds?.clientId || ''
  }

  if (routeTemplate === '/partner/locations/[id]' && paramName === 'id') {
    return seedIds?.partnerLocationId || ''
  }

  if (routeTemplate === '/help/[slug]' && paramName === 'slug') {
    return DEFAULT_HELP_SLUG
  }

  if ((routeTemplate === '/chef/[slug]' || routeTemplate.startsWith('/chef/[slug]/')) && paramName === 'slug') {
    return seedIds?.chefSlug || ''
  }

  if (
    (routeTemplate === '/book/[chefSlug]' || routeTemplate.startsWith('/book/[chefSlug]/')) &&
    paramName === 'chefSlug'
  ) {
    return seedIds?.chefSlug || ''
  }

  if (paramName === 'chefId') return seedIds?.chefId || ''
  if (paramName === 'chefSlug') return seedIds?.chefSlug || ''
  if (paramName === 'eventId') return pickChefEventId(seedIds, routeTemplate)
  if (paramName === 'quoteId') return pickQuoteId(seedIds, routeTemplate)
  if (paramName === 'menuId') return seedIds?.menuId || ''
  if (paramName === 'recipeId') return seedIds?.recipeId || ''
  if (paramName === 'month') return new Date().toISOString().slice(0, 7)
  if (paramName === 'year') return String(new Date().getFullYear())

  if (
    paramName === 'token' ||
    paramName === 'secureToken' ||
    paramName === 'profileToken' ||
    paramName === 'groupToken' ||
    paramName === 'shareToken' ||
    paramName === 'code'
  ) {
    return resolveTokenLikeValue(routeTemplate, seedIds)
  }

  if (paramName === 'slug' && routeTemplate.startsWith('/mobile/chef/')) {
    return seedIds?.chefId || ''
  }

  if (paramName === 'id') {
    return resolveIdByContext({ routeTemplate, seedIds, role })
  }

  return ''
}

function expectedOutcomeForRoute(routeTemplate) {
  if (routeTemplate === '/kiosk') {
    return {
      type: 'redirect-ok',
      pattern: /\/kiosk\/pair$/,
      reason: 'unpaired kiosk should redirect to pairing flow',
    }
  }

  if (PUBLIC_NOT_FOUND_SEGMENT_PATTERNS.some((pattern) => pattern.test(routeTemplate))) {
    return {
      type: 'not-found-ok',
      reason: 'placeholder token/code is expected to render a guarded empty state or 404',
    }
  }

  return {
    type: 'default',
    pattern: null,
    reason: '',
  }
}

function resolveDynamicParamValues({ dynamicSegments, routeTemplate, role, seedIds }) {
  const params = {}
  const missing = []

  for (const segment of dynamicSegments) {
    if (segment.kind !== 'single') {
      missing.push(segment.name)
      continue
    }

    const value = resolveDynamicValue({
      routeTemplate,
      paramName: segment.name,
      role,
      seedIds,
    })

    if (!value) {
      missing.push(segment.name)
      continue
    }

    params[segment.name] = value
  }

  return { missing, params }
}

function buildResolvedRouteEntries({
  expected,
  paramsList,
  resolutionKind,
  resolverSource,
  role,
  routeTemplate,
  sourceFile,
}) {
  return paramsList
    .map((params) => {
      const path = fillRouteTemplate(routeTemplate, params)
      if (!path) return null

      return {
        expected,
        path,
        resolution: 'dynamic',
        resolver: {
          kind: resolutionKind,
          params,
          paramNames: Object.keys(params),
          source: resolverSource,
        },
        role,
        sourceFile,
        template: routeTemplate,
      }
    })
    .filter(Boolean)
}

async function resolveRouteContracts({
  loadModule,
  role,
  rootDir,
  routeTemplate,
  seedIds,
  source,
  sourceFile,
}) {
  const dynamicSegments = extractDynamicSegments(routeTemplate)

  if (dynamicSegments.length === 0) {
    return {
      routes: [
        {
          expected: expectedOutcomeForRoute(routeTemplate),
          path: routeTemplate,
          resolution: 'static',
          resolver: {
            kind: 'static',
            params: {},
            paramNames: [],
            source: 'route-template',
          },
          role,
          sourceFile,
          template: routeTemplate,
        },
      ],
      skipped: [],
    }
  }

  if (dynamicSegments.some((segment) => segment.kind !== 'single')) {
    return {
      routes: [],
      skipped: [
        {
          reason: 'catch-all dynamic route requires interactive discovery',
          resolver: {
            kind: 'interactive-only',
            missingParams: dynamicSegments.map((segment) => segment.name),
            paramNames: dynamicSegments.map((segment) => segment.name),
            source: 'route-template',
          },
          role,
          sourceFile,
          template: routeTemplate,
        },
      ],
    }
  }

  const staticParamsContract = await loadStaticParamsContract({
    dynamicSegments,
    loadModule,
    rootDir,
    routeTemplate,
    source,
    sourceFile,
  })

  if (staticParamsContract && staticParamsContract.paramsList.length > 0) {
    return {
      routes: buildResolvedRouteEntries({
        expected: expectedOutcomeForRoute(routeTemplate),
        paramsList: staticParamsContract.paramsList,
        resolutionKind: 'static-params',
        resolverSource: staticParamsContract.source,
        role,
        routeTemplate,
        sourceFile,
      }),
      skipped: [],
    }
  }

  const seededParams = resolveDynamicParamValues({
    dynamicSegments,
    routeTemplate,
    role,
    seedIds,
  })

  if (seededParams.missing.length === 0) {
    return {
      routes: buildResolvedRouteEntries({
        expected: expectedOutcomeForRoute(routeTemplate),
        paramsList: [seededParams.params],
        resolutionKind: 'seeded-dynamic',
        resolverSource: '.auth/seed-ids.json',
        role,
        routeTemplate,
        sourceFile,
      }),
      skipped: [],
    }
  }

  const guardedPlaceholderContract = buildGuardedPlaceholderContract(
    routeTemplate,
    source,
    dynamicSegments
  )

  if (guardedPlaceholderContract) {
    return {
      routes: buildResolvedRouteEntries({
        expected: guardedPlaceholderContract.expected,
        paramsList: [guardedPlaceholderContract.params],
        resolutionKind: 'guarded-placeholder',
        resolverSource: guardedPlaceholderContract.source,
        role,
        routeTemplate,
        sourceFile,
      }),
      skipped: [],
    }
  }

  return {
    routes: [],
    skipped: [
      {
        reason:
          seededParams.missing.length === 1
            ? `no shared resolver contract for [${seededParams.missing[0]}]`
            : `no shared resolver contract for [${seededParams.missing.join(', ')}]`,
        resolver: {
          hasPageNotFoundGuard: hasPageNotFoundGuard(source),
          kind: 'data-dependent',
          missingParams: seededParams.missing,
          paramNames: dynamicSegments.map((segment) => segment.name),
          source:
            staticParamsContract?.source ??
            (hasPageGenerateStaticParams(source)
              ? `${relativePathFromRoot(rootDir, sourceFile)}#generateStaticParams`
              : '.auth/seed-ids.json'),
          staticParamCount: staticParamsContract?.paramsList?.length ?? 0,
        },
        role,
        sourceFile,
        template: routeTemplate,
      },
    ],
  }
}

export function loadSeedIds(rootDir) {
  const seedPath = path.join(rootDir, '.auth', 'seed-ids.json')
  if (!fs.existsSync(seedPath)) return null
  try {
    return JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  } catch {
    return null
  }
}

export function storageStateHasCookies(rootDir, storageStatePath) {
  if (!storageStatePath) return false
  const absolute = path.resolve(rootDir, storageStatePath)
  if (!fs.existsSync(absolute)) return false
  try {
    const payload = JSON.parse(fs.readFileSync(absolute, 'utf8'))
    return Array.isArray(payload.cookies) && payload.cookies.length > 0
  } catch {
    return false
  }
}

export async function discoverSiteAuditRoutes(rootDir) {
  const appDir = path.join(rootDir, 'app')
  const seedIds = loadSeedIds(rootDir)
  const routes = []
  const skipped = []
  const seen = new Set()

  await withTsxRequire(rootDir, async (loadModule) => {
    for (const filePath of findPageFiles(rootDir)) {
      const relativeDir = path.relative(appDir, path.dirname(filePath))
      const originalSegments =
        relativeDir === '' ? [] : relativeDir.split(path.sep).filter((segment) => segment.length > 0)

      if (
        originalSegments.includes('api') ||
        originalSegments.some((segment) => isSpecialSegment(segment))
      ) {
        skipped.push({
          template: normalizeRouteTemplate(originalSegments),
          sourceFile: filePath,
          reason: 'non-page route, intercepted route, or slot route',
          resolver: {
            kind: 'non-audited',
            source: 'route-discovery',
          },
        })
        continue
      }

      const role = deriveRole(originalSegments)
      const routeTemplate = normalizeRouteTemplate(originalSegments)
      const source = fs.readFileSync(filePath, 'utf8')
      const resolved = await resolveRouteContracts({
        loadModule,
        role,
        rootDir,
        routeTemplate,
        seedIds,
        source,
        sourceFile: filePath,
      })

      for (const route of resolved.routes) {
        const uniqueKey = `${route.role}:${route.path}`
        if (seen.has(uniqueKey)) continue
        seen.add(uniqueKey)
        routes.push(route)
      }

      skipped.push(...resolved.skipped)
    }
  })

  routes.sort((a, b) => {
    const roleIndex = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    if (roleIndex !== 0) return roleIndex
    return a.path.localeCompare(b.path)
  })

  skipped.sort((a, b) => {
    const roleA = a.role ? ROLE_ORDER.indexOf(a.role) : -1
    const roleB = b.role ? ROLE_ORDER.indexOf(b.role) : -1
    if (roleA !== roleB) return roleA - roleB
    return String(a.template).localeCompare(String(b.template))
  })

  const resolvedDynamicRoutes = routes.filter((route) => route.resolution === 'dynamic')
  const resolvedDynamicTemplates = new Set(resolvedDynamicRoutes.map((route) => route.sourceFile))
  const skippedDynamicTemplates = new Set(
    skipped.filter((item) => item.role).map((item) => item.sourceFile)
  )

  return {
    routes,
    skipped,
    seedIds,
    summary: {
      resolvedDynamicPaths: resolvedDynamicRoutes.length,
      resolvedDynamicTemplates: resolvedDynamicTemplates.size,
      resolverKinds: summarizeByKind(resolvedDynamicRoutes),
      skippedDynamicTemplates: skippedDynamicTemplates.size,
      skippedKinds: summarizeByKind(skipped),
      totalRoutes: routes.length,
      totalSkipped: skipped.length,
    },
  }
}
