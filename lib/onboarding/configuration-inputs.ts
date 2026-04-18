// Configuration Engine - Input Dimension Definitions
// Pure data: labels, options, icons for the 5-screen interview UI.
// No 'use server', no DB access.

import type { ArchetypeId } from '@/lib/archetypes/presets'

// ─── Scale ────────────────────────────────────────────────────────────────────

export type ScaleId = 'solo' | 'small-team' | 'large-team'

export const SCALE_OPTIONS: { id: ScaleId; label: string; description: string; emoji: string }[] = [
  { id: 'solo', label: 'Just me', description: 'One-person operation', emoji: '👤' },
  {
    id: 'small-team',
    label: 'Small team (2-5)',
    description: 'A few people helping',
    emoji: '👥',
  },
  {
    id: 'large-team',
    label: 'Large team (6+)',
    description: 'Full staff to coordinate',
    emoji: '🏢',
  },
]

// ─── Maturity ─────────────────────────────────────────────────────────────────

export type MaturityId = 'new' | 'established' | 'transitioning'

export const MATURITY_OPTIONS: {
  id: MaturityId
  label: string
  description: string
  emoji: string
}[] = [
  {
    id: 'new',
    label: 'Just starting out',
    description: 'No existing clients or history',
    emoji: '🌱',
  },
  {
    id: 'established',
    label: 'Running business',
    description: 'Existing clients, recipes, pricing',
    emoji: '🏗️',
  },
  {
    id: 'transitioning',
    label: 'Changing direction',
    description: 'Pivoting from another food business',
    emoji: '🔄',
  },
]

// ─── Acquisition ──────────────────────────────────────────────────────────────

export type AcquisitionId = 'word-of-mouth' | 'inquiries' | 'walk-ins' | 'recurring'

export const ACQUISITION_OPTIONS: {
  id: AcquisitionId
  label: string
  description: string
  emoji: string
}[] = [
  {
    id: 'word-of-mouth',
    label: 'Word of mouth',
    description: 'Clients come from personal network',
    emoji: '🗣️',
  },
  {
    id: 'inquiries',
    label: 'Online inquiries',
    description: 'Website, social media, platforms',
    emoji: '🌐',
  },
  {
    id: 'walk-ins',
    label: 'Walk-in / foot traffic',
    description: 'Location-based discovery',
    emoji: '🚶',
  },
  {
    id: 'recurring',
    label: 'Recurring clients only',
    description: 'Steady roster, no new acquisition',
    emoji: '🔁',
  },
]

// ─── Integrations ─────────────────────────────────────────────────────────────

export type IntegrationId = 'gmail' | 'spreadsheets' | 'nothing'

export const INTEGRATION_OPTIONS: {
  id: IntegrationId
  label: string
  description: string
  emoji: string
}[] = [
  {
    id: 'gmail',
    label: 'Gmail / Google Workspace',
    description: 'Email-based workflow',
    emoji: '📧',
  },
  {
    id: 'spreadsheets',
    label: 'Spreadsheets',
    description: 'Tracking in Excel or Google Sheets',
    emoji: '📊',
  },
  {
    id: 'nothing',
    label: 'Nothing formal',
    description: 'Mental tracking, paper, phone notes',
    emoji: '📝',
  },
]

// ─── Combined Input Type ──────────────────────────────────────────────────────

export type ConfigurationInputs = {
  archetype: ArchetypeId
  scale: ScaleId
  maturity: MaturityId
  acquisition: AcquisitionId
  integrations: IntegrationId
}

// ─── Interview Screen Definitions ─────────────────────────────────────────────

export type InterviewScreen = {
  key: keyof ConfigurationInputs
  title: string
  subtitle: string
}

export const INTERVIEW_SCREENS: InterviewScreen[] = [
  {
    key: 'archetype',
    title: 'What kind of food work do you do?',
    subtitle: 'This shapes which tools appear front and center.',
  },
  {
    key: 'scale',
    title: 'How big is your operation?',
    subtitle: 'We will set up collaboration tools if you have a team.',
  },
  {
    key: 'maturity',
    title: 'Where is your business right now?',
    subtitle: 'This determines whether we help you import or start fresh.',
  },
  {
    key: 'acquisition',
    title: 'How do clients find you?',
    subtitle: 'We will prioritize the right pipeline tools.',
  },
  {
    key: 'integrations',
    title: 'What tools do you use today?',
    subtitle: 'We will help you bring your data over.',
  },
]
