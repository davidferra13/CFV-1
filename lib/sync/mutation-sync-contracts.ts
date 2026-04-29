export type MutationSyncPath = Readonly<{
  path: string
  type?: 'page' | 'layout'
}>

export type MutationSyncPatch = Readonly<Record<string, unknown>>

export type RemyContextInvalidation = Readonly<{
  entities: readonly string[]
  reason: string
}>

export type MutationSyncContract = Readonly<{
  entity: string
  paths: readonly MutationSyncPath[]
  tags: readonly string[]
  liveEntities: readonly string[]
  remyContext?: RemyContextInvalidation
  patch?: MutationSyncPatch
  reason: string
}>

export type MutationSyncPlan = Readonly<{
  entity: string
  paths: readonly MutationSyncPath[]
  tags: readonly string[]
  liveEntities: readonly string[]
  remyContext?: RemyContextInvalidation
  patch: MutationSyncPatch
  reason: string
}>

export type MutationSyncPlanExtra = Readonly<{
  paths?: readonly MutationSyncPath[]
  tags?: readonly string[]
  liveEntities?: readonly string[]
  remyContext?: RemyContextInvalidation
  patch?: MutationSyncPatch
  reason?: string
}>

const MUTATION_SYNC_CONTRACTS = {
  chef_culinary_profiles: {
    entity: 'chef_culinary_profiles',
    paths: [
      { path: '/settings/culinary-profile' },
      { path: '/chef/[slug]', type: 'page' },
      { path: '/chef/[slug]/inquire', type: 'page' },
      { path: '/book/[chefSlug]', type: 'page' },
      { path: '/remy' },
    ],
    tags: ['chef-booking-profile', 'chef-layout:{chefId}'],
    liveEntities: ['chef_culinary_profiles', 'chef_culinary_profile'],
    remyContext: {
      entities: ['chef_culinary_profiles', 'remy_profile_context'],
      reason: 'Culinary profile answers feed public booking context and Remy profile context.',
    },
    patch: { source: 'mutation' },
    reason: 'Culinary profile mutations affect chef profile pages, booking pages, live profile routes, and Remy context.',
  },
  chef_profile_contexts: {
    entity: 'chef_profile_contexts',
    paths: [
      { path: '/settings/my-profile' },
      { path: '/settings/public-profile' },
      { path: '/chef/[slug]', type: 'page' },
      { path: '/remy' },
    ],
    tags: ['chef-layout:{chefId}', 'chef-profile-context:{chefId}'],
    liveEntities: ['chef_profile_contexts', 'chef_profile_context', 'remy_profile_context'],
    remyContext: {
      entities: ['chef_profile_contexts', 'remy_profile_context'],
      reason: 'Profile context mutations update the facts Remy can cite about the chef.',
    },
    patch: { source: 'mutation' },
    reason: 'Chef profile context mutations affect settings, public profile routes, live profile routes, and Remy context.',
  },
} as const satisfies Record<string, MutationSyncContract>

export type MutationSyncEntity = keyof typeof MUTATION_SYNC_CONTRACTS

function uniqueStrings(values: readonly string[]) {
  return Array.from(new Set(values))
}

function uniquePaths(values: readonly MutationSyncPath[]) {
  const seen = new Set<string>()
  const paths: MutationSyncPath[] = []

  for (const value of values) {
    const key = `${value.path}:${value.type ?? ''}`
    if (seen.has(key)) continue

    seen.add(key)
    paths.push({ ...value })
  }

  return paths
}

function cloneRemyContext(value: RemyContextInvalidation | undefined) {
  if (!value) return undefined

  return {
    entities: [...value.entities],
    reason: value.reason,
  }
}

function mergeRemyContext(
  base: RemyContextInvalidation | undefined,
  extra: RemyContextInvalidation | undefined
) {
  if (!base) return cloneRemyContext(extra)
  if (!extra) return cloneRemyContext(base)

  return {
    entities: uniqueStrings([...base.entities, ...extra.entities]),
    reason: [base.reason, extra.reason].filter(Boolean).join(' '),
  }
}

export function listMutationSyncEntities() {
  return Object.keys(MUTATION_SYNC_CONTRACTS) as MutationSyncEntity[]
}

export function hasMutationSyncContract(entity: string): entity is MutationSyncEntity {
  return Object.prototype.hasOwnProperty.call(MUTATION_SYNC_CONTRACTS, entity)
}

export function getMutationSyncContract(entity: MutationSyncEntity) {
  return MUTATION_SYNC_CONTRACTS[entity]
}

export function mergeMutationSyncPlan(
  plan: MutationSyncPlan,
  extra: MutationSyncPlanExtra = {}
): MutationSyncPlan {
  return {
    entity: plan.entity,
    paths: uniquePaths([...plan.paths, ...(extra.paths ?? [])]),
    tags: uniqueStrings([...plan.tags, ...(extra.tags ?? [])]),
    liveEntities: uniqueStrings([...plan.liveEntities, ...(extra.liveEntities ?? [])]),
    remyContext: mergeRemyContext(plan.remyContext, extra.remyContext),
    patch: { ...plan.patch, ...(extra.patch ?? {}) },
    reason: [plan.reason, extra.reason].filter(Boolean).join(' '),
  }
}

export function getMutationSyncPlan(
  entity: MutationSyncEntity,
  extra: MutationSyncPlanExtra = {}
): MutationSyncPlan {
  const contract = getMutationSyncContract(entity)
  const plan: MutationSyncPlan = {
    entity: contract.entity,
    paths: uniquePaths(contract.paths),
    tags: uniqueStrings(contract.tags),
    liveEntities: uniqueStrings(contract.liveEntities),
    remyContext: cloneRemyContext(contract.remyContext),
    patch: { ...(contract.patch ?? {}) },
    reason: contract.reason,
  }

  return mergeMutationSyncPlan(plan, extra)
}
