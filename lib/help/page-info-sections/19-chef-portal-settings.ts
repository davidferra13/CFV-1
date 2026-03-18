import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_SETTINGS_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/settings': {
    title: 'Settings Hub',
    description: 'Central settings dashboard - configure your ChefFlow experience.',
    features: [
      'Business defaults and profile',
      'AI privacy and Remy controls',
      'Integrations and automations',
      'Billing and subscription',
      'Appearance and navigation',
      'Notifications and templates',
      'Account security',
    ],
  },

  '/settings/my-profile': {
    title: 'My Profile',
    description: 'Your core chef profile - name, image, and details used across the portal.',
    features: [
      'Chef name and image',
      'Review link',
      'Primary business details',
      'AI bio generator',
    ],
  },

  '/settings/profile': {
    title: 'Network Profile',
    description: 'Your directory profile visible to other chefs in the network.',
    features: ['Display name and bio', 'Profile photo', 'Network visibility settings'],
  },

  '/settings/public-profile': {
    title: 'Public Profile',
    description: 'How clients see you - tagline, partner showcase, and branding colors.',
    features: [
      'Tagline',
      'Partner showcase',
      'Primary and background colors',
      'Client view preview',
    ],
  },

  '/settings/client-preview': {
    title: 'Client Preview',
    description:
      'See exactly what your clients see - live preview of your public profile and client portal.',
    features: ['Public profile preview', 'Client portal data preview', 'Read-only view'],
  },

  '/settings/ai-privacy': {
    title: 'AI & Privacy Trust Center',
    description:
      'Complete AI controls and privacy practices - manage Remy features and data handling.',
    features: [
      'Remy onboarding wizard',
      'Data flow schematic',
      'Feature toggles for AI capabilities',
      'Data controls and privacy promise',
    ],
  },

  '/settings/culinary-profile': {
    title: 'Culinary Profile',
    description: 'Your food identity and cooking philosophy - helps Remy understand your style.',
    features: [
      'Cooking philosophy',
      'Signature dishes',
      'Dietary specialties',
      'Progress indicator',
    ],
  },

  '/settings/appearance': {
    title: 'Appearance',
    description: 'Theme and display customization.',
    features: ['Light/dark mode toggle', 'Theme preferences'],
  },

  '/settings/billing': {
    title: 'Subscription & Billing',
    description: 'Manage your ChefFlow subscription - plan details, billing, and upgrades.',
    features: ['Subscription status', 'Plan features', 'Upgrade options', 'Billing history'],
  },

  '/settings/change-password': {
    title: 'Change Password',
    description: 'Update your account password.',
    features: ['Current password verification', 'New password entry', 'Strength requirements'],
  },

  '/settings/delete-account': {
    title: 'Delete Account',
    description: 'Permanently delete your ChefFlow account and all data.',
    features: ['Permanent deletion warning', 'Data export recommendation', 'Confirmation required'],
  },

  '/settings/notifications': {
    title: 'Notification Settings',
    description: 'Control how you receive notifications - email, push, and SMS.',
    features: ['Per-category preferences', 'Email/push/SMS channel selection', 'SMS phone setup'],
  },

  '/settings/health': {
    title: 'System Health',
    description: 'Check the status of all connected services.',
    features: [
      'Stripe payment status',
      'Gmail integration status',
      'Google Calendar status',
      'DOP task engine status',
    ],
  },

  '/settings/dashboard': {
    title: 'Dashboard Widgets',
    description: 'Enable, disable, and reorder your dashboard widgets.',
    features: ['Widget visibility toggles', 'Drag-to-reorder', 'Widget descriptions'],
  },

  '/settings/navigation': {
    title: 'Primary Navigation',
    description: 'Customize your always-visible navigation bar tabs.',
    features: ['Tab selection', 'Tab ordering', 'Quick access configuration'],
  },

  '/settings/templates': {
    title: 'Response Templates',
    description: 'Pre-written message templates for common client communications.',
    features: ['Template list', 'Inline editor', 'Quick copy-and-customize'],
  },

  '/settings/automations': {
    title: 'Automations',
    description: 'Automated workflows - follow-up reminders, expiry rules, and custom triggers.',
    features: ['Built-in automation rules', 'Custom rule creation', 'Execution history'],
  },

  '/settings/integrations': {
    title: 'Integrations',
    description: 'Connect ChefFlow with POS, website, scheduling, and CRM tools.',
    features: ['Integration provider overview', 'Connection status', 'Setup guides'],
  },

  '/settings/contracts': {
    title: 'Contract Templates',
    description: 'Reusable contract templates with merge fields for client agreements.',
    features: [
      'Template list with preview',
      'Inline editor',
      'Version tracking',
      'Default template marker',
    ],
  },

  '/settings/custom-fields': {
    title: 'Custom Fields',
    description: 'Add custom data fields to events, clients, and recipes.',
    features: ['Field builder', 'Entity type selection', 'Custom data capture'],
  },

  '/settings/event-types': {
    title: 'Event Types & Labels',
    description: 'Rename occasion types and status labels to match your business language.',
    features: ['Occasion type customization', 'Status label customization', 'App-wide updates'],
  },

  '/settings/modules': {
    title: 'Feature Modules',
    description: 'Toggle feature modules on/off - control what appears in your sidebar.',
    features: ['Module toggles', 'Pro feature indicators', 'Tier status'],
  },

  '/settings/repertoire': {
    title: 'Seasonal Palettes',
    description:
      'Your creative thesis and seasonal planning - define your culinary identity by season.',
    features: [
      'Seasonal palette creation',
      'Micro-windows',
      'Context profiles',
      'Proven wins per season',
    ],
  },

  '/settings/repertoire/[id]': {
    title: 'Palette Detail',
    description: 'View and edit a specific seasonal palette.',
    features: ['Palette details', 'Micro-windows', 'Ingredient focus'],
  },

  '/settings/journal': {
    title: 'Chef Journal',
    description: 'Travel inspiration and learning record - document your culinary journey.',
    features: [
      'Journal entries',
      'Insights and highlights',
      'Ideas and recipes linked',
      'Destination tracking',
    ],
  },

  '/settings/journal/[id]': {
    title: 'Journal Entry',
    description: 'View and edit a journal entry.',
    features: ['Entry details', 'Photos and media', 'Recipe links', 'Learning notes'],
  },

  '/settings/journey': {
    title: 'Journey',
    description: 'Milestone tracking for your culinary career.',
    features: ['Career milestones', 'Progress tracking', 'Achievement timeline'],
  },

  '/settings/journey/[id]': {
    title: 'Journey Detail',
    description: 'View a specific career milestone or journey entry.',
    features: ['Milestone details', 'Photos', 'Impact notes'],
  },

  '/settings/professional': {
    title: 'Professional Development',
    description: 'Career milestones, competitions, awards, and learning goals.',
    features: [
      'Achievements (competitions, press, awards, courses)',
      'Learning goals',
      'Structured tracking',
    ],
  },

  '/settings/professional/skills': {
    title: 'Capability Inventory',
    description: 'Self-assess your confidence across cuisines, diets, and techniques.',
    features: ['Rating system', 'Capability grid', 'Skill categories'],
  },

  '/settings/professional/momentum': {
    title: 'Professional Momentum',
    description: 'Growth tracking - new dishes, cuisines, education, and creative projects.',
    features: ['Growth snapshot', 'New dish count', 'Education tracking', 'Creative projects'],
  },

  '/settings/protection': {
    title: 'Business Protection',
    description: 'Safeguard your business - insurance, certifications, NDAs, and crisis planning.',
    features: [
      'Business health checklist',
      'Insurance policies',
      'Certifications',
      'Crisis response playbook',
    ],
  },

  '/settings/protection/business-health': {
    title: 'Business Health',
    description: 'Business continuity checklist - ensure your business is protected.',
    features: ['Continuity checklist', 'Gap identification', 'Action items'],
  },

  '/settings/protection/insurance': {
    title: 'Insurance',
    description: 'Track insurance policies - liability, property, workers comp.',
    features: ['Policy list', 'Expiry tracking', 'Coverage details'],
  },

  '/settings/protection/nda': {
    title: 'NDA Management',
    description: 'Non-disclosure agreements with clients and staff.',
    features: ['NDA list', 'Signing status', 'Template management'],
  },

  '/settings/protection/crisis': {
    title: 'Crisis Response',
    description: 'Emergency response plan - what to do when things go wrong.',
    features: ['Crisis playbook', 'Contact tree', 'Emergency procedures'],
  },

  '/settings/protection/continuity': {
    title: 'Business Continuity',
    description: 'Business continuity planning - keep operating through disruptions.',
    features: ['Continuity plan', 'Backup procedures', 'Recovery steps'],
  },

  '/settings/protection/certifications': {
    title: 'Certifications',
    description: 'Track food safety and professional certifications.',
    features: ['Certification list', 'Expiry alerts (14/60 day)', 'Document upload'],
  },

  '/settings/protection/portfolio-removal': {
    title: 'Portfolio Removal Rights',
    description: 'Manage image usage rights and removal requests.',
    features: ['Image rights tracking', 'Removal request handling', 'Client consent records'],
  },

  '/settings/highlights': {
    title: 'Profile Highlights',
    description: 'Featured achievements and credentials for your public profile.',
    features: [
      'Highlight categories (awards, press, certifications)',
      'Display order',
      'Featured toggle',
    ],
  },

  '/settings/portfolio': {
    title: 'Portfolio',
    description: 'Photo gallery for your public profile - showcase your best dishes.',
    features: ['Photo upload', 'Caption and dish name', 'Featured marker', 'Drag-to-reorder'],
  },

  '/settings/favorite-chefs': {
    title: 'Favorite Chefs',
    description: 'Your culinary heroes and mentors - share your inspirations.',
    features: ['Chef list', 'Social sharing', 'Inspiration notes'],
  },

  '/settings/stripe-connect': {
    title: 'Stripe Connect',
    description: 'Connect your Stripe account for accepting payments.',
    features: ['Connection status', 'Payout history', 'Account setup'],
  },

  '/settings/api-keys': {
    title: 'API Keys',
    description: 'Manage integration API keys.',
    features: ['Create and list keys', 'Scope management', 'Last-used tracking', 'Revocation'],
  },

  '/settings/webhooks': {
    title: 'Webhooks',
    description: 'Real-time webhook endpoint configuration.',
    features: ['Endpoint creation', 'Event subscriptions', 'Delivery history'],
  },

  '/settings/compliance': {
    title: 'Food Safety & Compliance',
    description: 'Certification and license tracking with expiry reminders.',
    features: [
      'Active/expired/pending certifications',
      'Expiry reminders',
      'Document upload',
      'AI permit renewal checklist',
    ],
  },

  '/settings/compliance/gdpr': {
    title: 'GDPR & Privacy',
    description: 'Data privacy controls and GDPR compliance tools.',
    features: ['GDPR compliance tools', 'Data export', 'Deletion controls'],
  },

  '/settings/emergency': {
    title: 'Emergency Contacts',
    description: 'Backup contacts for event incapacity - sous chef, business partner, peer chef.',
    features: ['Contact storage', 'Role assignment', 'Event contingency linking'],
  },
}
