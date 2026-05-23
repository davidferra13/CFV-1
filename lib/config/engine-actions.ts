// Configuration Engine - Server Actions
// Adaptive 5-question onboarding that tailors workspace defaults per tenant.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  ConfigQuestion,
  ConfigAnswer,
  ConfigAnswers,
  WorkspaceConfig,
  TenantConfiguration,
  ServiceType,
} from './engine-types'

// ============================================
// QUESTION GENERATION
// ============================================

const SERVICE_TYPE_OPTIONS = [
  {
    value: 'private-chef',
    label: 'Private Chef',
    description: 'In-home dining experiences for individuals and families',
  },
  { value: 'catering', label: 'Catering', description: 'Events, weddings, corporate functions' },
  { value: 'meal-prep', label: 'Meal Prep', description: 'Weekly meal preparation and delivery' },
  { value: 'food-truck', label: 'Food Truck', description: 'Mobile food service and pop-ups' },
  {
    value: 'restaurant',
    label: 'Restaurant',
    description: 'Brick-and-mortar dining establishment',
  },
  {
    value: 'multi',
    label: 'Multiple Services',
    description: 'I offer more than one type of food service',
  },
]

const CLIENT_VOLUME_OPTIONS = [
  {
    value: 'solo',
    label: '1-5 clients',
    description: 'Just getting started or intentionally small',
  },
  { value: 'small', label: '6-15 clients', description: 'Growing steadily' },
  { value: 'medium', label: '16-40 clients', description: 'Established with a solid roster' },
  { value: 'large', label: '40+ clients', description: 'High-volume operation' },
]

const TEAM_SIZE_OPTIONS = [
  { value: 'solo', label: 'Just me', description: 'Solo operator, no staff' },
  { value: 'with-sous', label: 'Me + sous/assistant', description: 'One or two helpers' },
  { value: 'small-team', label: 'Small team (3-6)', description: 'A handful of regular staff' },
  {
    value: 'large-team',
    label: 'Large team (7+)',
    description: 'Full kitchen brigade or multiple crews',
  },
]

const TECH_COMFORT_OPTIONS = [
  { value: 'beginner', label: 'Keep it simple', description: 'Show me the basics, hide the rest' },
  {
    value: 'intermediate',
    label: 'I can handle it',
    description: 'Give me useful tools without overload',
  },
  { value: 'advanced', label: 'Show me everything', description: 'I want access to every feature' },
]

function getPricingOptions(
  serviceType?: ServiceType
): { value: string; label: string; description?: string }[] {
  if (serviceType === 'meal-prep') {
    return [
      {
        value: 'per-head',
        label: 'Per meal/serving',
        description: 'Price per individual meal or serving',
      },
      { value: 'flat-rate', label: 'Weekly package', description: 'Fixed weekly or monthly rate' },
      { value: 'mixed', label: 'Mixed', description: 'Combination of per-meal and packages' },
    ]
  }

  if (serviceType === 'food-truck') {
    return [
      { value: 'per-head', label: 'Per item', description: 'Individual menu item pricing' },
      {
        value: 'flat-rate',
        label: 'Event flat rate',
        description: 'Fixed price for event bookings',
      },
      { value: 'hourly', label: 'Hourly', description: 'Bill by the hour for private events' },
      { value: 'mixed', label: 'Mixed', description: 'Walk-up and event pricing' },
    ]
  }

  return [
    { value: 'per-head', label: 'Per person', description: 'Price based on guest count' },
    { value: 'flat-rate', label: 'Flat rate', description: 'Fixed price per event or package' },
    { value: 'hourly', label: 'Hourly', description: 'Bill by the hour' },
    { value: 'mixed', label: 'Mixed', description: 'I use different pricing depending on the job' },
  ]
}

function getClientVolumeDescription(serviceType?: ServiceType): string {
  if (serviceType === 'meal-prep') return 'How many recurring meal-prep clients do you serve?'
  if (serviceType === 'catering') return 'How many events do you typically handle per month?'
  if (serviceType === 'food-truck') return 'How many regular stops or events per week?'
  if (serviceType === 'restaurant') return 'What is your typical daily cover count range?'
  return 'How many active clients do you serve regularly?'
}

/**
 * Returns 5 adaptive configuration questions.
 * Each subsequent question adapts based on prior answers when provided.
 */
export async function getConfigQuestions(
  partialAnswers?: Partial<ConfigAnswers>
): Promise<ConfigQuestion[]> {
  await requireChef()

  const serviceType = partialAnswers?.serviceType

  const questions: ConfigQuestion[] = [
    {
      id: 'q-service-type',
      label: 'What type of food service do you run?',
      description: 'This shapes which tools and views appear in your workspace.',
      field: 'serviceType',
      options: SERVICE_TYPE_OPTIONS,
      adaptive: false,
    },
    {
      id: 'q-client-volume',
      label: getClientVolumeDescription(serviceType),
      description: 'Helps us scale your dashboard and communication tools.',
      field: 'clientVolume',
      options: CLIENT_VOLUME_OPTIONS,
      adaptive: true,
    },
    {
      id: 'q-pricing-style',
      label: 'How do you typically price your services?',
      description: 'Sets your default pricing mode for quotes and invoices.',
      field: 'pricingStyle',
      options: getPricingOptions(serviceType),
      adaptive: true,
    },
    {
      id: 'q-team-size',
      label: 'How big is your team?',
      description: 'Controls whether staff management and delegation features are visible.',
      field: 'teamSize',
      options: TEAM_SIZE_OPTIONS,
      adaptive: false,
    },
    {
      id: 'q-tech-comfort',
      label: 'How much do you want to see?',
      description: 'Controls progressive disclosure. You can always change this later.',
      field: 'techComfort',
      options: TECH_COMFORT_OPTIONS,
      adaptive: false,
    },
  ]

  return questions
}

// ============================================
// WORKSPACE CONFIG GENERATION
// ============================================

function deriveWorkspaceConfig(answers: ConfigAnswers): WorkspaceConfig {
  const modules: string[] = ['dashboard', 'events', 'clients', 'recipes', 'menus', 'communication']

  const showStaff = answers.teamSize !== 'solo'
  const showCalendar = answers.clientVolume !== 'solo' || answers.serviceType === 'catering'

  // Service-type specific modules
  if (answers.serviceType === 'meal-prep' || answers.serviceType === 'multi') {
    modules.push('meal-prep')
  }
  if (
    answers.serviceType === 'food-truck' ||
    answers.serviceType === 'restaurant' ||
    answers.serviceType === 'multi'
  ) {
    modules.push('pos')
  }
  if (
    answers.serviceType === 'catering' ||
    answers.serviceType === 'private-chef' ||
    answers.serviceType === 'multi'
  ) {
    modules.push('quotes', 'contracts')
  }

  // Volume-based modules
  if (answers.clientVolume === 'medium' || answers.clientVolume === 'large') {
    modules.push('analytics', 'loyalty')
  }

  // Team-based modules
  if (showStaff) {
    modules.push('staff')
  }

  // Finance always present
  modules.push('finance')

  // Tech comfort sets disclosure level
  let featureDisclosure: 'minimal' | 'standard' | 'full' = 'standard'
  if (answers.techComfort === 'beginner') featureDisclosure = 'minimal'
  if (answers.techComfort === 'advanced') featureDisclosure = 'full'

  // Default service style based on service type
  let defaultServiceStyle = 'plated'
  if (answers.serviceType === 'catering') defaultServiceStyle = 'buffet'
  if (answers.serviceType === 'meal-prep') defaultServiceStyle = 'drop_off'
  if (answers.serviceType === 'food-truck') defaultServiceStyle = 'counter'

  return {
    enabledModules: [...new Set(modules)],
    defaultPricingMode: answers.pricingStyle,
    showStaffManagement: showStaff,
    showCalendarOverview: showCalendar,
    featureDisclosure,
    showMealPrepViews: answers.serviceType === 'meal-prep' || answers.serviceType === 'multi',
    showPosFeatures:
      answers.serviceType === 'food-truck' ||
      answers.serviceType === 'restaurant' ||
      answers.serviceType === 'multi',
    defaultServiceStyle,
  }
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Processes config answers and generates a workspace configuration.
 * Does NOT persist; call applyConfiguration to save.
 */
export async function submitConfigAnswers(
  answers: ConfigAnswers
): Promise<{ success: true; config: WorkspaceConfig } | { success: false; error: string }> {
  try {
    await requireChef()
    const config = deriveWorkspaceConfig(answers)
    return { success: true, config }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Persists the configuration to the tenant_configurations table.
 * Upserts: creates on first run, updates on subsequent calls.
 */
export async function applyConfiguration(
  answers: ConfigAnswer[],
  config: WorkspaceConfig
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    // Check for existing config
    const { data: existing } = await db
      .from('tenant_configurations')
      .select('id')
      .eq('tenant_id', tenantId)
      .single()

    if (existing) {
      const { data, error } = await db
        .from('tenant_configurations')
        .update({
          question_responses: answers,
          applied_config: config,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .select('id')
        .single()

      if (error) throw new Error(error.message)

      revalidatePath('/settings')
      revalidatePath('/dashboard')
      return { success: true, id: data.id }
    }

    const { data, error } = await db
      .from('tenant_configurations')
      .insert({
        tenant_id: tenantId,
        question_responses: answers,
        applied_config: config,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    revalidatePath('/settings')
    revalidatePath('/dashboard')
    return { success: true, id: data.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to apply configuration',
    }
  }
}

/**
 * Retrieves existing tenant configuration, or null if none set.
 */
export async function getTenantConfiguration(): Promise<TenantConfiguration | null> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    const { data, error } = await db
      .from('tenant_configurations')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      tenantId: data.tenant_id,
      questionResponses: data.question_responses ?? [],
      appliedConfig: data.applied_config ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch {
    return null
  }
}
