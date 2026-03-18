import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_EVENTS_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/events': {
    title: 'Events',
    description:
      'All your events in one place - filter by status, switch between list and kanban board views.',
    features: [
      'List view with sortable table',
      'Kanban board view organized by status',
      'Filter by status (draft, proposed, accepted, paid, confirmed, in progress, completed, cancelled)',
      'Quick-create new events',
      'Event date, guest count, and value at a glance',
    ],
    annotations: [
      { selector: 'h1', label: 'Events', description: 'Your full event pipeline' },
      {
        selector: '[data-info="view-toggle"]',
        label: 'View Toggle',
        description: 'Switch between list table and kanban board views',
      },
      {
        selector: '[data-info="new-event"]',
        label: 'New Event',
        description: 'Create a new event from scratch',
      },
    ],
  },

  '/events/new': {
    title: 'New Event',
    description: 'Create a new event - set the date, occasion, guest count, location, and client.',
    features: [
      'Event type and occasion selection',
      'Date, time, and guest count',
      'Client assignment',
      'Location and venue details',
      'Budget and pricing setup',
    ],
  },

  '/events/new/from-text': {
    title: 'Event from Text',
    description: 'Paste an email or message and let Remy extract event details automatically.',
    features: [
      'AI-powered text parsing',
      'Auto-extracts date, guest count, occasion, dietary needs',
      'Review and edit before creating',
    ],
  },

  '/events/new/wizard': {
    title: 'Event Setup Wizard',
    description: 'Step-by-step guided event creation - perfect for your first few events.',
    features: [
      'Guided multi-step form',
      'Client selection or creation',
      'Menu and pricing setup',
      'Contract and payment terms',
    ],
  },

  '/events/[id]': {
    title: 'Event Detail',
    description:
      'Everything about this event - status, timeline, menu, financials, staff, and all supporting documents.',
    features: [
      'Event status and lifecycle transitions',
      'Timeline and schedule overview',
      'Menu preview and approval status',
      'Financial summary (quoted, paid, outstanding)',
      'Staff assignments and roles',
      'Temperature logs and food safety',
      'Contingency planning',
      'Links to invoice, receipts, travel, packing, and more',
    ],
  },

  '/events/[id]/edit': {
    title: 'Edit Event',
    description: 'Update event details - date, time, guest count, location, and notes.',
    features: [
      'Edit all event fields',
      'Update client assignment',
      'Modify pricing and budget',
      'Change event status',
    ],
  },

  '/events/[id]/schedule': {
    title: 'Event Schedule',
    description:
      'Timeline of prep and execution tasks for this event - the full day-of-party plan.',
    features: [
      'Prep tasks sorted by timeline',
      'Day-of-party execution plan',
      'Task assignments to staff',
      'Time estimates and dependencies',
    ],
  },

  '/events/[id]/interactive': {
    title: 'Interactive Timeline',
    description: 'Live interactive timeline during event service - track progress in real time.',
    features: [
      'Real-time task tracking',
      'Mark tasks complete as you go',
      'Timer and pacing indicators',
      'Mobile-optimized for kitchen use',
    ],
  },

  '/events/[id]/dop/mobile': {
    title: 'Mobile Day-of-Party',
    description:
      'Mobile-optimized day-of-party interface - designed for use during active service.',
    features: [
      'Large touch targets for kitchen use',
      'Task checklist with swipe-to-complete',
      'Timer integration',
      'Quick notes and photo capture',
    ],
  },

  '/events/[id]/aar': {
    title: 'After Action Review',
    description:
      'Post-event self-assessment - what went well, what to improve, and lessons learned.',
    features: [
      'Calm and prep quality ratings',
      'What went well / what to improve',
      'Frequently forgotten items tracking',
      'Feeds into quality trends on dashboard',
    ],
  },

  '/events/[id]/close-out': {
    title: 'Event Close-Out',
    description:
      'Finalize the event - settle all financials, upload final receipts, and mark complete.',
    features: [
      'Final financial reconciliation',
      'Outstanding balance resolution',
      'Receipt upload and verification',
      'Status transition to completed',
    ],
  },

  '/events/[id]/debrief': {
    title: 'Event Debrief',
    description: 'Detailed post-event analysis - performance, financials, and client feedback.',
    features: [
      'Performance summary',
      'Financial outcome vs. quoted',
      'Client satisfaction signals',
      'Actionable takeaways',
    ],
  },

  '/events/[id]/financial': {
    title: 'Event Financials',
    description:
      'Full financial picture for this event - revenue, costs, profit margin, and payment history.',
    features: [
      'Quoted vs. collected revenue',
      'Direct expenses and food costs',
      'Profit margin calculation',
      'Payment timeline and status',
      'Ledger entries for this event',
    ],
  },

  '/events/[id]/invoice': {
    title: 'Event Invoice',
    description: 'The invoice for this event - line items, totals, payment terms, and status.',
    features: [
      'Line-item breakdown',
      'Deposit and balance amounts',
      'Payment status tracking',
      'Shareable invoice link',
    ],
  },

  '/events/[id]/receipts': {
    title: 'Event Receipts',
    description: 'Upload and manage receipts for this event - grocery runs, rentals, supplies.',
    features: [
      'Receipt photo upload',
      'Categorize by expense type',
      'Running total of event expenses',
      'Link receipts to ledger entries',
    ],
  },

  '/events/[id]/travel': {
    title: 'Event Travel',
    description: 'Travel details for this event - distance, mileage, and travel expenses.',
    features: [
      'Mileage tracking and logging',
      'Travel expense recording',
      'Route and distance info',
    ],
  },

  '/events/[id]/pack': {
    title: 'Packing Checklist',
    description:
      'Everything you need to bring - equipment, ingredients, supplies, and personal items.',
    features: [
      'Categorized packing list',
      'Check items off as you pack',
      'Reusable templates from past events',
    ],
  },

  '/events/[id]/grocery-quote': {
    title: 'Grocery Quote',
    description: 'Get price estimates for event ingredients from multiple grocery sources.',
    features: [
      'Auto-generated ingredient list from menu',
      'Price quotes from Kroger, Spoonacular, MealMe',
      'Instacart cart link generation',
      'Bulk price write-back to recipe database',
    ],
  },

  '/events/[id]/guest-card': {
    title: 'Guest Card',
    description: 'Guest arrival and check-in card for this event.',
    features: [
      'Guest list with dietary info',
      'Check-in tracking',
      'Allergy and restriction alerts',
    ],
  },

  '/events/[id]/kds': {
    title: 'Kitchen Display',
    description: 'Kitchen Display System - real-time order and course tracking during service.',
    features: [
      'Course-by-course display',
      'Timing and pacing',
      'Large text for kitchen visibility',
    ],
  },

  '/events/[id]/split-billing': {
    title: 'Split Billing',
    description: 'Split the event invoice between multiple payers - great for co-hosted events.',
    features: [
      'Assign portions to different payers',
      'Individual payment tracking',
      'Flexible split options (equal, custom)',
    ],
  },

  '/events/awaiting-deposit': {
    title: 'Awaiting Deposit',
    description: 'Events that have been accepted but are still waiting for the initial deposit.',
    features: ['Filtered event list by deposit status', 'Quick links to send payment reminders'],
  },

  '/events/upcoming': {
    title: 'Upcoming Events',
    description: 'Confirmed events coming up - your active pipeline.',
    features: [
      'Chronological upcoming events',
      'Days until each event',
      'Quick access to event details',
    ],
  },

  '/events/confirmed': {
    title: 'Confirmed Events',
    description: 'Events with payment confirmed - ready for execution.',
    features: ['Confirmed events list', 'Prep status indicators'],
  },

  '/events/completed': {
    title: 'Completed Events',
    description: 'Past events that have been fully executed and closed out.',
    features: ['Completed events history', 'Revenue and profit per event', 'AAR status'],
  },

  '/events/cancelled': {
    title: 'Cancelled Events',
    description: 'Events that were cancelled - track reasons and refund status.',
    features: ['Cancellation history', 'Refund tracking', 'Reason documentation'],
  },

  '/events/board': {
    title: 'Event Board',
    description: 'Kanban board view of all events organized by status columns.',
    features: ['Drag-and-drop status changes', 'Visual pipeline overview', 'Status column counts'],
  },
}
