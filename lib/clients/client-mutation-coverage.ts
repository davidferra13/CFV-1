import {
  buildClientSyncPlans,
  summarizeClientSyncPlans,
  type ClientSyncActor,
  type ClientSyncPlan,
  type ClientSyncTrigger,
} from '@/lib/clients/client-sync-contracts'
import type {
  ClientKnowledgeFieldKey,
  ClientKnowledgeSyncTarget,
} from '@/lib/clients/client-knowledge-contract'

export type ClientMutationPathKey =
  | 'client_self_service_profile'
  | 'chef_client_profile'
  | 'public_booking_intake'
  | 'client_intake_form'
  | 'dietary_dashboard'

export interface ClientMutationPathContract {
  key: ClientMutationPathKey
  label: string
  actor: ClientSyncActor
  trigger: ClientSyncTrigger
  implementationFiles: string[]
  fields: ClientKnowledgeFieldKey[]
  implementedTargets: ClientKnowledgeSyncTarget[]
}

export interface ClientMutationPathCoverage {
  path: ClientMutationPathContract
  plans: ClientSyncPlan[]
  requiredTargets: ClientKnowledgeSyncTarget[]
  implementedTargets: ClientKnowledgeSyncTarget[]
  missingRequiredTargets: ClientKnowledgeSyncTarget[]
  summary: ReturnType<typeof summarizeClientSyncPlans>
}

const MUTATION_PATHS: ClientMutationPathContract[] = [
  {
    key: 'client_self_service_profile',
    label: 'Client self-service profile save',
    actor: 'client',
    trigger: 'client_profile_update',
    implementationFiles: ['lib/clients/client-profile-actions.ts'],
    fields: [
      'full_name',
      'preferred_name',
      'phone',
      'address',
      'parking_instructions',
      'access_instructions',
      'kitchen_constraints',
      'allergies',
      'dietary_restrictions',
      'dietary_protocols',
      'dislikes',
      'favorite_cuisines',
      'favorite_dishes',
      'spice_tolerance',
      'wine_beverage_preferences',
    ],
    implementedTargets: [
      'client_profile',
      'chef_client_profile',
      'active_events',
      'menu_safety',
      'remy_context_cache',
      'client_dashboard',
      'notifications',
      'audit_log',
      'loyalty',
    ],
  },
  {
    key: 'chef_client_profile',
    label: 'Chef client profile save',
    actor: 'chef',
    trigger: 'chef_client_update',
    implementationFiles: ['lib/clients/actions.ts'],
    fields: [
      'full_name',
      'preferred_name',
      'email',
      'phone',
      'address',
      'parking_instructions',
      'access_instructions',
      'kitchen_constraints',
      'allergies',
      'dietary_restrictions',
      'dietary_protocols',
      'dislikes',
      'favorite_cuisines',
      'favorite_dishes',
      'spice_tolerance',
      'wine_beverage_preferences',
    ],
    implementedTargets: [
      'client_profile',
      'chef_client_profile',
      'active_events',
      'menu_safety',
      'remy_context_cache',
      'notifications',
      'audit_log',
    ],
  },
  {
    key: 'public_booking_intake',
    label: 'Public booking intake',
    actor: 'client',
    trigger: 'booking_intake',
    implementationFiles: ['app/api/book/route.ts'],
    fields: ['full_name', 'email', 'phone', 'address', 'allergies', 'dietary_restrictions'],
    implementedTargets: [
      'client_profile',
      'chef_client_profile',
      'active_events',
      'menu_safety',
      'notifications',
    ],
  },
  {
    key: 'client_intake_form',
    label: 'Client intake form',
    actor: 'client',
    trigger: 'client_profile_update',
    implementationFiles: ['lib/clients/intake-actions.ts'],
    fields: ['allergies', 'dietary_restrictions', 'favorite_cuisines', 'favorite_dishes'],
    implementedTargets: [
      'client_profile',
      'chef_client_profile',
      'active_events',
      'menu_safety',
      'remy_context_cache',
      'notifications',
      'audit_log',
    ],
  },
  {
    key: 'dietary_dashboard',
    label: 'Dietary dashboard update',
    actor: 'chef',
    trigger: 'chef_client_update',
    implementationFiles: ['lib/clients/dietary-dashboard-actions.ts'],
    fields: ['allergies', 'dietary_restrictions', 'dietary_protocols'],
    implementedTargets: [
      'client_profile',
      'chef_client_profile',
      'active_events',
      'menu_safety',
      'audit_log',
    ],
  },
]

export function getClientMutationPathContracts(): ClientMutationPathContract[] {
  return MUTATION_PATHS.map(cloneMutationPath)
}

export function getClientMutationPathContract(
  key: ClientMutationPathKey
): ClientMutationPathContract {
  const contract = MUTATION_PATHS.find((path) => path.key === key)
  if (!contract) {
    throw new Error(`Unknown client mutation path: ${key}`)
  }
  return cloneMutationPath(contract)
}

export function getClientMutationCoverage(): ClientMutationPathCoverage[] {
  return MUTATION_PATHS.map((path) => buildCoverage(path))
}

export function getClientMutationCoverageGaps(): ClientMutationPathCoverage[] {
  return getClientMutationCoverage().filter(
    (coverage) => coverage.missingRequiredTargets.length > 0
  )
}

function buildCoverage(path: ClientMutationPathContract): ClientMutationPathCoverage {
  const plans = buildClientSyncPlans(
    path.fields.map((field) => ({
      field,
      actor: path.actor,
      trigger: path.trigger,
      changed: true,
    }))
  )
  const requiredTargets = uniqueTargets(
    plans.flatMap((plan) =>
      plan.steps.filter((step) => step.status === 'required').map((step) => step.target)
    )
  )
  const implementedTargets = uniqueTargets(path.implementedTargets)

  return {
    path: cloneMutationPath(path),
    plans,
    requiredTargets,
    implementedTargets,
    missingRequiredTargets: requiredTargets.filter(
      (target) => !implementedTargets.includes(target)
    ),
    summary: summarizeClientSyncPlans(plans),
  }
}

function cloneMutationPath(path: ClientMutationPathContract): ClientMutationPathContract {
  return {
    ...path,
    implementationFiles: [...path.implementationFiles],
    fields: [...path.fields],
    implementedTargets: [...path.implementedTargets],
  }
}

function uniqueTargets(targets: ClientKnowledgeSyncTarget[]): ClientKnowledgeSyncTarget[] {
  return Array.from(new Set(targets)).sort()
}
