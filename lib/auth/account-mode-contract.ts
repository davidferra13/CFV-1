export const ACCOUNT_MODES = [
  'public',
  'guest',
  'chef_workspace',
  'team_workspace',
  'support_console',
  'admin_console',
] as const

export type AccountMode = (typeof ACCOUNT_MODES)[number]

export const ACCOUNT_ROLES = [
  'public_visitor',
  'guest_client',
  'chef_owner',
  'chef_team_member',
  'support_operator',
  'admin_operator',
] as const

export type AccountRole = (typeof ACCOUNT_ROLES)[number]

export const ACCOUNT_LIFECYCLE_STATES = [
  'anonymous',
  'invited',
  'pending_onboarding',
  'approved',
  'verified',
  'rejected',
  'suspended',
  'deleted',
  'deactivated',
  'limited_access',
] as const

export type AccountLifecycleState = (typeof ACCOUNT_LIFECYCLE_STATES)[number]

export type AccountCapability =
  | 'public.discovery.view'
  | 'account.mode.switch'
  | 'personal.profile.read'
  | 'personal.profile.write'
  | 'personal.booking.create'
  | 'personal.review.create'
  | 'personal.message.send'
  | 'personal.payment_method.manage'
  | 'personal.calendar.read'
  | 'chef.dashboard.view'
  | 'chef.client_record.read'
  | 'chef.client_record.write'
  | 'chef.message.send'
  | 'chef.calendar.manage'
  | 'chef.review.respond'
  | 'chef.payout.manage'
  | 'team.task.update'
  | 'support.account.inspect'
  | 'admin.account.manage'
  | 'notifications.read'

export type AccountDataBoundary =
  | 'public_catalog'
  | 'personal_client'
  | 'chef_business'
  | 'team_business_delegate'
  | 'support_observable'
  | 'platform_admin'
  | 'cross_context_projection'
  | 'none'

export type AccountFinancialRail =
  | 'guest_payment_method'
  | 'chef_payment_receivable'
  | 'chef_payout'

export type AccountDetailLevel = 'full' | 'metadata' | 'busy_only' | 'none'

export type AccountModeContext = {
  userId: string | null
  mode: AccountMode
  roles: AccountRole[]
  state: AccountLifecycleState
  personalProfileId?: string | null
  chefAccountId?: string | null
  teamMembershipId?: string | null
}

export type AccountModeDenyReason =
  | 'unauthenticated'
  | 'inactive_account'
  | 'onboarding_required'
  | 'limited_access'
  | 'wrong_context'
  | 'insufficient_role'
  | 'unknown_route'

export type AccountModeRecovery = {
  label: string
  href: string
  mode: AccountMode
}

export type AccountModeAuditEventType =
  | 'account_mode.action_allowed'
  | 'account_mode.action_denied'
  | 'account_mode.wrong_context'
  | 'account_mode.route_hidden'
  | 'account_mode.data_projection'
  | 'account_mode.financial_boundary'

export type AccountModeAuditEvent = {
  type: AccountModeAuditEventType
  userId: string | null
  mode: AccountMode
  roles: AccountRole[]
  state: AccountLifecycleState
  capability?: AccountCapability
  routeId?: AccountRouteId
  boundary: AccountDataBoundary
  reason?: AccountModeDenyReason
  suggestedMode?: AccountMode
  writeAllowed: boolean
}

export type AccountModeAllowedDecision = {
  allowed: true
  capability: AccountCapability
  mode: AccountMode
  boundary: AccountDataBoundary
  writeAllowed: boolean
  auditEvent: AccountModeAuditEvent
}

export type AccountModeDeniedDecision = {
  allowed: false
  capability: AccountCapability
  mode: AccountMode
  boundary: 'none'
  reason: AccountModeDenyReason
  recovery: AccountModeRecovery | null
  suggestedMode: AccountMode | null
  writeAllowed: false
  auditEvent: AccountModeAuditEvent
}

export type AccountModeDecision = AccountModeAllowedDecision | AccountModeDeniedDecision

type CapabilitySpec = {
  modes: readonly AccountMode[]
  roles: readonly AccountRole[]
  boundary: AccountDataBoundary
  write: boolean
}

const ALL_MODES = ACCOUNT_MODES

const CAPABILITY_SPECS: Record<AccountCapability, CapabilitySpec> = {
  'public.discovery.view': {
    modes: ALL_MODES,
    roles: ACCOUNT_ROLES,
    boundary: 'public_catalog',
    write: false,
  },
  'account.mode.switch': {
    modes: ['guest', 'chef_workspace', 'team_workspace', 'support_console', 'admin_console'],
    roles: ['guest_client', 'chef_owner', 'chef_team_member', 'support_operator', 'admin_operator'],
    boundary: 'none',
    write: false,
  },
  'personal.profile.read': {
    modes: ['guest'],
    roles: ['guest_client', 'chef_owner'],
    boundary: 'personal_client',
    write: false,
  },
  'personal.profile.write': {
    modes: ['guest'],
    roles: ['guest_client', 'chef_owner'],
    boundary: 'personal_client',
    write: true,
  },
  'personal.booking.create': {
    modes: ['guest'],
    roles: ['guest_client', 'chef_owner'],
    boundary: 'personal_client',
    write: true,
  },
  'personal.review.create': {
    modes: ['guest'],
    roles: ['guest_client', 'chef_owner'],
    boundary: 'personal_client',
    write: true,
  },
  'personal.message.send': {
    modes: ['guest'],
    roles: ['guest_client', 'chef_owner'],
    boundary: 'personal_client',
    write: true,
  },
  'personal.payment_method.manage': {
    modes: ['guest'],
    roles: ['guest_client', 'chef_owner'],
    boundary: 'personal_client',
    write: true,
  },
  'personal.calendar.read': {
    modes: ['guest'],
    roles: ['guest_client', 'chef_owner'],
    boundary: 'personal_client',
    write: false,
  },
  'chef.dashboard.view': {
    modes: ['chef_workspace'],
    roles: ['chef_owner'],
    boundary: 'chef_business',
    write: false,
  },
  'chef.client_record.read': {
    modes: ['chef_workspace'],
    roles: ['chef_owner'],
    boundary: 'chef_business',
    write: false,
  },
  'chef.client_record.write': {
    modes: ['chef_workspace'],
    roles: ['chef_owner'],
    boundary: 'chef_business',
    write: true,
  },
  'chef.message.send': {
    modes: ['chef_workspace'],
    roles: ['chef_owner'],
    boundary: 'chef_business',
    write: true,
  },
  'chef.calendar.manage': {
    modes: ['chef_workspace'],
    roles: ['chef_owner'],
    boundary: 'chef_business',
    write: true,
  },
  'chef.review.respond': {
    modes: ['chef_workspace'],
    roles: ['chef_owner'],
    boundary: 'chef_business',
    write: true,
  },
  'chef.payout.manage': {
    modes: ['chef_workspace'],
    roles: ['chef_owner'],
    boundary: 'chef_business',
    write: true,
  },
  'team.task.update': {
    modes: ['team_workspace'],
    roles: ['chef_team_member', 'chef_owner'],
    boundary: 'team_business_delegate',
    write: true,
  },
  'support.account.inspect': {
    modes: ['support_console'],
    roles: ['support_operator', 'admin_operator'],
    boundary: 'support_observable',
    write: false,
  },
  'admin.account.manage': {
    modes: ['admin_console'],
    roles: ['admin_operator'],
    boundary: 'platform_admin',
    write: true,
  },
  'notifications.read': {
    modes: ['guest', 'chef_workspace', 'team_workspace', 'support_console', 'admin_console'],
    roles: ['guest_client', 'chef_owner', 'chef_team_member', 'support_operator', 'admin_operator'],
    boundary: 'none',
    write: false,
  },
}

const MODE_ENTRY_PATHS: Record<AccountMode, string> = {
  public: '/eat',
  guest: '/my-events',
  chef_workspace: '/dashboard',
  team_workspace: '/staff-dashboard',
  support_console: '/admin/support',
  admin_console: '/admin',
}

const MODE_LABELS: Record<AccountMode, string> = {
  public: 'Public',
  guest: 'Guest Mode',
  chef_workspace: 'Chef Workspace',
  team_workspace: 'Team Workspace',
  support_console: 'Support Console',
  admin_console: 'Admin Console',
}

export function evaluateAccountModeAction(
  context: AccountModeContext,
  capability: AccountCapability
): AccountModeDecision {
  const spec = CAPABILITY_SPECS[capability]
  const stateGate = getAccountStateDenyReason(context, capability, spec)
  if (stateGate) {
    return deny(context, capability, stateGate, null)
  }

  if (!spec.modes.includes(context.mode)) {
    const suggestedMode = findFirstCompatibleMode(context, spec)
    return deny(context, capability, 'wrong_context', suggestedMode)
  }

  if (!hasAnyRole(context.roles, spec.roles)) {
    return deny(context, capability, 'insufficient_role', null)
  }

  if (spec.write && context.state === 'limited_access') {
    return deny(context, capability, 'limited_access', null)
  }

  return {
    allowed: true,
    capability,
    mode: context.mode,
    boundary: spec.boundary,
    writeAllowed: spec.write,
    auditEvent: createAccountModeAuditEvent('account_mode.action_allowed', context, {
      capability,
      boundary: spec.boundary,
      writeAllowed: spec.write,
    }),
  }
}

function deny(
  context: AccountModeContext,
  capability: AccountCapability,
  reason: AccountModeDenyReason,
  suggestedMode: AccountMode | null
): AccountModeDeniedDecision {
  const recovery = suggestedMode ? buildRecovery(suggestedMode) : null
  const type: AccountModeAuditEventType =
    reason === 'wrong_context' ? 'account_mode.wrong_context' : 'account_mode.action_denied'

  return {
    allowed: false,
    capability,
    mode: context.mode,
    boundary: 'none',
    reason,
    recovery,
    suggestedMode,
    writeAllowed: false,
    auditEvent: createAccountModeAuditEvent(type, context, {
      capability,
      boundary: 'none',
      reason,
      suggestedMode,
      writeAllowed: false,
    }),
  }
}

function getAccountStateDenyReason(
  context: AccountModeContext,
  capability: AccountCapability,
  spec: CapabilitySpec
): AccountModeDenyReason | null {
  if (context.state === 'anonymous') {
    return context.mode === 'public' && spec.boundary === 'public_catalog'
      ? null
      : 'unauthenticated'
  }

  if (context.state === 'rejected' || context.state === 'suspended') return 'inactive_account'
  if (context.state === 'deleted' || context.state === 'deactivated') return 'inactive_account'

  if (context.state === 'invited' || context.state === 'pending_onboarding') {
    if (capability === 'public.discovery.view' || capability === 'account.mode.switch') {
      return null
    }
    return 'onboarding_required'
  }

  return null
}

function findFirstCompatibleMode(
  context: AccountModeContext,
  spec: CapabilitySpec
): AccountMode | null {
  return (
    spec.modes.find((mode) => hasAnyRole(context.roles, spec.roles) && mode !== context.mode) ??
    null
  )
}

function hasAnyRole(
  userRoles: readonly AccountRole[],
  requiredRoles: readonly AccountRole[]
): boolean {
  return requiredRoles.some((role) => userRoles.includes(role))
}

function buildRecovery(mode: AccountMode): AccountModeRecovery {
  return {
    label: `Switch to ${MODE_LABELS[mode]}`,
    href: MODE_ENTRY_PATHS[mode],
    mode,
  }
}

export type AccountDataResource =
  | 'public_discovery_catalog'
  | 'personal_profile'
  | 'personal_booking'
  | 'personal_calendar_hold'
  | 'personal_message'
  | 'personal_review'
  | 'personal_payment_method'
  | 'chef_client_record'
  | 'chef_business_calendar'
  | 'chef_business_message'
  | 'chef_business_review'
  | 'chef_payment_receivable'
  | 'chef_payout_account'
  | 'support_case'
  | 'platform_user_record'

export type AccountDataBoundaryDecision = {
  resource: AccountDataResource
  boundary: AccountDataBoundary
  ownerMode: AccountMode
  detailLevel: AccountDetailLevel
  writeAllowed: boolean
  financialRail: AccountFinancialRail | null
  auditEvent: AccountModeAuditEvent
}

export function classifyAccountDataBoundary(
  context: AccountModeContext,
  resource: AccountDataResource
): AccountDataBoundaryDecision {
  const base = RESOURCE_BOUNDARIES[resource]
  let boundary = base.boundary
  let detailLevel = base.detailLevel
  let writeAllowed = base.writeModes.includes(context.mode)

  if (resource === 'personal_calendar_hold' && context.mode === 'chef_workspace') {
    boundary = 'cross_context_projection'
    detailLevel = 'busy_only'
    writeAllowed = false
  } else if (!base.readModes.includes(context.mode)) {
    boundary = 'none'
    detailLevel = 'none'
    writeAllowed = false
  }

  const eventType: AccountModeAuditEventType =
    boundary === 'cross_context_projection'
      ? 'account_mode.data_projection'
      : base.financialRail
        ? 'account_mode.financial_boundary'
        : 'account_mode.action_allowed'

  return {
    resource,
    boundary,
    ownerMode: base.ownerMode,
    detailLevel,
    writeAllowed,
    financialRail: base.financialRail,
    auditEvent: createAccountModeAuditEvent(eventType, context, {
      boundary,
      writeAllowed,
    }),
  }
}

type ResourceBoundarySpec = {
  boundary: AccountDataBoundary
  ownerMode: AccountMode
  readModes: readonly AccountMode[]
  writeModes: readonly AccountMode[]
  detailLevel: AccountDetailLevel
  financialRail: AccountFinancialRail | null
}

const RESOURCE_BOUNDARIES: Record<AccountDataResource, ResourceBoundarySpec> = {
  public_discovery_catalog: {
    boundary: 'public_catalog',
    ownerMode: 'public',
    readModes: ALL_MODES,
    writeModes: [],
    detailLevel: 'full',
    financialRail: null,
  },
  personal_profile: personalResource(['guest']),
  personal_booking: personalResource(['guest']),
  personal_calendar_hold: personalResource(['guest', 'chef_workspace']),
  personal_message: personalResource(['guest']),
  personal_review: personalResource(['guest']),
  personal_payment_method: personalResource(['guest'], 'guest_payment_method'),
  chef_client_record: chefResource(['chef_workspace']),
  chef_business_calendar: chefResource(['chef_workspace']),
  chef_business_message: chefResource(['chef_workspace']),
  chef_business_review: chefResource(['chef_workspace']),
  chef_payment_receivable: chefResource(['chef_workspace'], 'chef_payment_receivable'),
  chef_payout_account: chefResource(['chef_workspace'], 'chef_payout'),
  support_case: {
    boundary: 'support_observable',
    ownerMode: 'support_console',
    readModes: ['support_console', 'admin_console'],
    writeModes: ['support_console'],
    detailLevel: 'metadata',
    financialRail: null,
  },
  platform_user_record: {
    boundary: 'platform_admin',
    ownerMode: 'admin_console',
    readModes: ['admin_console'],
    writeModes: ['admin_console'],
    detailLevel: 'full',
    financialRail: null,
  },
}

function personalResource(
  modes: readonly AccountMode[],
  financialRail: AccountFinancialRail | null = null
): ResourceBoundarySpec {
  return {
    boundary: 'personal_client',
    ownerMode: 'guest',
    readModes: modes,
    writeModes: modes.filter((mode) => mode === 'guest'),
    detailLevel: 'full',
    financialRail,
  }
}

function chefResource(
  modes: readonly AccountMode[],
  financialRail: AccountFinancialRail | null = null
): ResourceBoundarySpec {
  return {
    boundary: 'chef_business',
    ownerMode: 'chef_workspace',
    readModes: modes,
    writeModes: modes,
    detailLevel: 'full',
    financialRail,
  }
}

export type AccountRouteId =
  | 'public.discovery'
  | 'guest.bookings'
  | 'guest.profile'
  | 'guest.messages'
  | 'guest.payments'
  | 'chef.dashboard'
  | 'chef.clients'
  | 'chef.calendar'
  | 'chef.reviews'
  | 'chef.payouts'
  | 'team.tasks'
  | 'support.accounts'
  | 'admin.accounts'

export type AccountModeRoute = {
  id: AccountRouteId
  href: string
  label: string
  capability: AccountCapability
  navModes: readonly AccountMode[]
}

export const ACCOUNT_MODE_ROUTES: readonly AccountModeRoute[] = [
  {
    id: 'public.discovery',
    href: '/eat',
    label: 'Explore ChefFlow',
    capability: 'public.discovery.view',
    navModes: ['public', 'guest', 'chef_workspace', 'team_workspace'],
  },
  {
    id: 'guest.bookings',
    href: '/my-events',
    label: 'My Events',
    capability: 'personal.booking.create',
    navModes: ['guest'],
  },
  {
    id: 'guest.profile',
    href: '/my-profile',
    label: 'My Profile',
    capability: 'personal.profile.read',
    navModes: ['guest'],
  },
  {
    id: 'guest.messages',
    href: '/my-chat',
    label: 'Messages',
    capability: 'personal.message.send',
    navModes: ['guest'],
  },
  {
    id: 'guest.payments',
    href: '/my-spending',
    label: 'Payment Methods',
    capability: 'personal.payment_method.manage',
    navModes: ['guest'],
  },
  {
    id: 'chef.dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    capability: 'chef.dashboard.view',
    navModes: ['chef_workspace'],
  },
  {
    id: 'chef.clients',
    href: '/clients',
    label: 'Clients',
    capability: 'chef.client_record.read',
    navModes: ['chef_workspace'],
  },
  {
    id: 'chef.calendar',
    href: '/calendar',
    label: 'Calendar',
    capability: 'chef.calendar.manage',
    navModes: ['chef_workspace'],
  },
  {
    id: 'chef.reviews',
    href: '/reviews',
    label: 'Reviews',
    capability: 'chef.review.respond',
    navModes: ['chef_workspace'],
  },
  {
    id: 'chef.payouts',
    href: '/payments',
    label: 'Payouts',
    capability: 'chef.payout.manage',
    navModes: ['chef_workspace'],
  },
  {
    id: 'team.tasks',
    href: '/staff-tasks',
    label: 'Tasks',
    capability: 'team.task.update',
    navModes: ['team_workspace'],
  },
  {
    id: 'support.accounts',
    href: '/admin/support',
    label: 'Support',
    capability: 'support.account.inspect',
    navModes: ['support_console'],
  },
  {
    id: 'admin.accounts',
    href: '/admin',
    label: 'Admin',
    capability: 'admin.account.manage',
    navModes: ['admin_console'],
  },
]

export type AccountRouteDecision = {
  route: AccountModeRoute | null
  allowed: boolean
  visibleInNav: boolean
  reason: AccountModeDenyReason | null
  recovery: AccountModeRecovery | null
  auditEvent: AccountModeAuditEvent
}

export function resolveAccountModeRouteDecision(
  context: AccountModeContext,
  hrefOrRouteId: string
): AccountRouteDecision {
  const route = findAccountModeRoute(hrefOrRouteId)
  if (!route) {
    return {
      route: null,
      allowed: false,
      visibleInNav: false,
      reason: 'unknown_route',
      recovery: null,
      auditEvent: createAccountModeAuditEvent('account_mode.route_hidden', context, {
        boundary: 'none',
        reason: 'unknown_route',
        writeAllowed: false,
      }),
    }
  }

  const actionDecision = evaluateAccountModeAction(context, route.capability)
  const visibleInNav = route.navModes.includes(context.mode) && actionDecision.allowed

  return {
    route,
    allowed: actionDecision.allowed,
    visibleInNav,
    reason: actionDecision.allowed ? null : actionDecision.reason,
    recovery: actionDecision.allowed ? null : actionDecision.recovery,
    auditEvent: actionDecision.allowed
      ? actionDecision.auditEvent
      : createAccountModeAuditEvent(
          actionDecision.reason === 'wrong_context'
            ? 'account_mode.wrong_context'
            : 'account_mode.route_hidden',
          context,
          {
            capability: route.capability,
            routeId: route.id,
            boundary: 'none',
            reason: actionDecision.reason,
            suggestedMode: actionDecision.suggestedMode,
            writeAllowed: false,
          }
        ),
  }
}

export function getVisibleAccountModeNavItems(context: AccountModeContext): AccountModeRoute[] {
  return ACCOUNT_MODE_ROUTES.filter(
    (route) => resolveAccountModeRouteDecision(context, route.id).visibleInNav
  )
}

function findAccountModeRoute(hrefOrRouteId: string): AccountModeRoute | null {
  return (
    ACCOUNT_MODE_ROUTES.find((route) => route.id === hrefOrRouteId) ??
    ACCOUNT_MODE_ROUTES.find(
      (route) => hrefOrRouteId === route.href || hrefOrRouteId.startsWith(`${route.href}/`)
    ) ??
    null
  )
}

export function createAccountModeAuditEvent(
  type: AccountModeAuditEventType,
  context: AccountModeContext,
  details: {
    capability?: AccountCapability
    routeId?: AccountRouteId
    boundary: AccountDataBoundary
    reason?: AccountModeDenyReason
    suggestedMode?: AccountMode | null
    writeAllowed: boolean
  }
): AccountModeAuditEvent {
  return {
    type,
    userId: context.userId,
    mode: context.mode,
    roles: [...context.roles],
    state: context.state,
    capability: details.capability,
    routeId: details.routeId,
    boundary: details.boundary,
    reason: details.reason,
    suggestedMode: details.suggestedMode ?? undefined,
    writeAllowed: details.writeAllowed,
  }
}
