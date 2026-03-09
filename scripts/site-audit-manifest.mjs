import fs from 'node:fs'
import path from 'node:path'

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

  if (routeTemplate.startsWith('/events/')) return pickChefEventId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/my-events/')) return pickClientEventId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/quotes/')) return pickQuoteId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/my-quotes/')) return pickQuoteId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/my-inquiries/')) return pickInquiryId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/inquiries/')) return pickInquiryId(seedIds, routeTemplate)
  if (routeTemplate.startsWith('/clients/')) return seedIds.clientIds?.primary || ''
  if (routeTemplate.startsWith('/staff/') && role === 'chef') return seedIds.staffId || ''
  if (routeTemplate.startsWith('/menus/')) return seedIds.menuId || ''
  if (routeTemplate.startsWith('/recipes/')) return seedIds.recipeId || ''
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

function resolveRoute(routeTemplate, seedIds, role) {
  const segments = routeTemplate.split('/').filter(Boolean)
  if (segments.length === 0) {
    return {
      ok: true,
      path: '/',
      expected: expectedOutcomeForRoute(routeTemplate),
      resolution: 'static',
    }
  }

  const resolvedSegments = []
  let dynamicCount = 0

  for (const segment of segments) {
    if (/^\[\[?\.\.\..+\]\]$/.test(segment)) {
      return {
        ok: false,
        reason: 'catch-all dynamic route requires interactive discovery',
      }
    }

    const dynamicMatch = segment.match(/^\[(.+)\]$/)
    if (!dynamicMatch) {
      resolvedSegments.push(segment)
      continue
    }

    const paramName = dynamicMatch[1]
    const value = resolveDynamicValue({ routeTemplate, paramName, seedIds, role })
    if (!value) {
      return {
        ok: false,
        reason: `no seeded value available for [${paramName}]`,
      }
    }

    dynamicCount += 1
    resolvedSegments.push(String(value))
  }

  return {
    ok: true,
    path: `/${resolvedSegments.join('/')}`,
    expected: expectedOutcomeForRoute(routeTemplate),
    resolution: dynamicCount > 0 ? 'dynamic' : 'static',
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

export function discoverSiteAuditRoutes(rootDir) {
  const appDir = path.join(rootDir, 'app')
  const seedIds = loadSeedIds(rootDir)
  const routes = []
  const skipped = []
  const seen = new Set()

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
      })
      continue
    }

    const role = deriveRole(originalSegments)
    const routeTemplate = normalizeRouteTemplate(originalSegments)
    const resolved = resolveRoute(routeTemplate, seedIds, role)

    if (!resolved.ok) {
      skipped.push({
        template: routeTemplate,
        sourceFile: filePath,
        role,
        reason: resolved.reason,
      })
      continue
    }

    const uniqueKey = `${role}:${resolved.path}`
    if (seen.has(uniqueKey)) continue
    seen.add(uniqueKey)

    routes.push({
      role,
      template: routeTemplate,
      path: resolved.path,
      expected: resolved.expected,
      resolution: resolved.resolution,
      sourceFile: filePath,
    })
  }

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

  return { routes, skipped, seedIds }
}
