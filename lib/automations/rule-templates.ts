// Pre-built Automation Rule Templates
// Starter templates that chefs can pick from to quickly set up common automations.
// Each template maps to the existing TriggerEvent and ActionType system.

import type { TriggerEvent, ActionType, Condition } from './types'

export type TemplateCategory = 'client_communication' | 'payment' | 'event_prep'

export type AutomationRuleTemplate = {
  id: string
  name: string
  description: string
  triggerType: TriggerEvent
  triggerConfig: Record<string, unknown>
  actionType: ActionType
  actionConfig: Record<string, unknown>
  conditions: Condition[]
  category: TemplateCategory
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  client_communication: 'Client Communication',
  payment: 'Payment',
  event_prep: 'Event Prep',
}

export const AUTOMATION_RULE_TEMPLATES: AutomationRuleTemplate[] = [
  // ── Client Communication ──────────────────────────────────────────────────
  {
    id: 'auto-follow-up',
    name: 'Auto Follow-Up',
    description: 'Send a follow-up 48 hours after an inquiry with no response.',
    triggerType: 'no_response_timeout',
    triggerConfig: { timeout_hours: 48 },
    actionType: 'create_follow_up_task',
    actionConfig: {
      description:
        'Follow up with {{client_name}} about their {{occasion}} inquiry - no response in 48h.',
      due_hours: '4',
    },
    conditions: [
      { field: 'days_since_last_contact', op: 'gte', value: '2' },
    ],
    category: 'client_communication',
  },
  {
    id: 'thank-you-after-event',
    name: 'Thank You After Event',
    description: 'Send a thank-you message 24 hours after an event is completed.',
    triggerType: 'event_status_changed',
    triggerConfig: { delay_hours: 24 },
    actionType: 'send_template_message',
    actionConfig: {
      subject: 'Thank you, {{client_name}}!',
      body: 'Thank you for having me at your {{occasion}}. I hope everything was exactly what you were looking for. Looking forward to cooking for you again!',
    },
    conditions: [
      { field: 'status', op: 'eq', value: 'completed' },
    ],
    category: 'client_communication',
  },
  {
    id: 'birthday-greeting',
    name: 'Birthday Greeting',
    description: 'Send a birthday message to clients on their special day.',
    triggerType: 'event_approaching',
    triggerConfig: { event_type: 'birthday', hours_before: 0 },
    actionType: 'send_template_message',
    actionConfig: {
      subject: 'Happy Birthday, {{client_name}}!',
      body: 'Wishing you a wonderful birthday! If you are planning a celebration, I would love to be part of it.',
    },
    conditions: [],
    category: 'client_communication',
  },
  {
    id: 'repeat-client-check-in',
    name: 'Repeat Client Check-In',
    description: 'Reach out to clients 90 days after their last event to stay top of mind.',
    triggerType: 'no_response_timeout',
    triggerConfig: { timeout_hours: 2160 },
    actionType: 'create_follow_up_task',
    actionConfig: {
      description:
        'Check in with {{client_name}} - it has been 90 days since their last event. See if they have anything coming up.',
      due_hours: '24',
    },
    conditions: [
      { field: 'days_since_last_contact', op: 'gte', value: '90' },
    ],
    category: 'client_communication',
  },
  {
    id: 'post-event-review-request',
    name: 'Post-Event Review Request',
    description: 'Ask for a review 3 days after an event is completed.',
    triggerType: 'event_status_changed',
    triggerConfig: { delay_hours: 72 },
    actionType: 'send_template_message',
    actionConfig: {
      subject: 'How was everything, {{client_name}}?',
      body: 'I hope you enjoyed your {{occasion}}! If you have a moment, I would really appreciate a review. It helps other clients find me and lets me know how to keep improving.',
    },
    conditions: [
      { field: 'status', op: 'eq', value: 'completed' },
    ],
    category: 'client_communication',
  },
  {
    id: 'seasonal-promotion',
    name: 'Seasonal Promotion',
    description: 'Suggest seasonal menu options to past clients.',
    triggerType: 'no_response_timeout',
    triggerConfig: { timeout_hours: 720 },
    actionType: 'send_template_message',
    actionConfig: {
      subject: 'Seasonal menus are here, {{client_name}}!',
      body: 'I have put together some new seasonal menus that I think you would love. Want to take a look? I would be happy to put something together for your next gathering.',
    },
    conditions: [],
    category: 'client_communication',
  },

  // ── Payment ───────────────────────────────────────────────────────────────
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    description: 'Remind about an unpaid balance 7 days before the event.',
    triggerType: 'payment_due_approaching',
    triggerConfig: { days_before: 7 },
    actionType: 'create_notification',
    actionConfig: {
      title: 'Payment due: {{client_name}}',
      body: '{{client_name}} has an outstanding balance for {{occasion}} in {{days_until_event}} days.',
    },
    conditions: [
      { field: 'days_until_event', op: 'lte', value: '7' },
      { field: 'outstanding_balance_cents', op: 'gt', value: '0' },
    ],
    category: 'payment',
  },
  {
    id: 'deposit-reminder',
    name: 'Deposit Reminder',
    description: 'Remind about a deposit 48 hours after a quote is accepted.',
    triggerType: 'event_status_changed',
    triggerConfig: { delay_hours: 48 },
    actionType: 'create_follow_up_task',
    actionConfig: {
      description:
        'Follow up with {{client_name}} about the deposit for {{occasion}} - quote was accepted 48h ago.',
      due_hours: '4',
    },
    conditions: [
      { field: 'status', op: 'eq', value: 'accepted' },
    ],
    category: 'payment',
  },

  // ── Event Prep ────────────────────────────────────────────────────────────
  {
    id: 'quote-expiry-warning',
    name: 'Quote Expiry Warning',
    description: 'Alert the chef 3 days before a quote expires.',
    triggerType: 'quote_expiring',
    triggerConfig: { days_before: 3 },
    actionType: 'create_notification',
    actionConfig: {
      title: 'Quote expiring: {{client_name}}',
      body: 'The quote for {{client_name}} ({{occasion}}) expires in {{days_until_expiry}} days. Follow up or extend it.',
    },
    conditions: [
      { field: 'days_until_expiry', op: 'lte', value: '3' },
    ],
    category: 'event_prep',
  },
  {
    id: 'menu-confirmation-nudge',
    name: 'Menu Confirmation Nudge',
    description: 'Remind the client to confirm their menu 14 days before the event.',
    triggerType: 'event_approaching',
    triggerConfig: { hours_before: 336 },
    actionType: 'send_template_message',
    actionConfig: {
      subject: 'Menu confirmation for {{occasion}}',
      body: 'Your {{occasion}} is coming up in about two weeks! Could you confirm the menu so I can start sourcing the best ingredients?',
    },
    conditions: [
      { field: 'hours_until_event', op: 'lte', value: '336' },
    ],
    category: 'event_prep',
  },
]
