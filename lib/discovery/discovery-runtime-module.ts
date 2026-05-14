export interface DiscoveryRuntimeInput {
  surface: 'homepage' | 'eat' | 'chef_profile' | 'circle'
  actor: 'public' | 'client' | 'guest' | 'chef' | 'system'
  query?: string
  sessionId?: string
  preferenceSignals?: string[]
  circleId?: string
}

export interface DiscoveryRuntimePlan {
  surface: DiscoveryRuntimeInput['surface']
  privacyMode: 'public' | 'personal' | 'circle_safe' | 'chef_owned'
  handoffs: Array<'rail' | 'filters' | 'shortlist' | 'remy' | 'circle'>
  mustNotLeak: string[]
}

export function buildDiscoveryRuntimePlan(input: DiscoveryRuntimeInput): DiscoveryRuntimePlan {
  const circleMode = input.surface === 'circle' || Boolean(input.circleId)
  const privacyMode = circleMode
    ? 'circle_safe'
    : input.actor === 'public'
      ? 'public'
      : input.actor === 'chef'
        ? 'chef_owned'
        : 'personal'

  return {
    surface: input.surface,
    privacyMode,
    handoffs: [
      'rail',
      input.query ? 'filters' : 'shortlist',
      input.actor === 'system' ? 'remy' : 'shortlist',
      circleMode ? 'circle' : 'rail',
    ],
    mustNotLeak: [
      'private_dietary_data',
      'chef_only_notes',
      'hidden_ranking_internals',
      circleMode ? 'other_circle_member_private_preferences' : 'cross_user_profile_data',
    ],
  }
}
