// Preset Automation Rule Definitions
// Config-driven rules with toggle + threshold settings.
// No per-rule code; the engine reads definitions and delegates to executors.

import type { PresetRuleDefinition } from './types'

export const PRESET_RULE_DEFINITIONS: PresetRuleDefinition[] = [
  {
    type: 'auto_draft_follow_up',
    name: 'Auto-Draft Follow-Up',
    description:
      'When an event is completed, queue a thank-you email draft in your inbox after a configurable delay.',
    triggerEvent: 'event_completed',
    actionType: 'draft_follow_up_email',
    defaultConfig: {
      delay_hours: 24,
    },
    configFields: [
      {
        key: 'delay_hours',
        label: 'Delay before drafting',
        type: 'number',
        min: 1,
        max: 168,
        suffix: 'hours',
      },
    ],
  },
  {
    type: 'auto_request_review',
    name: 'Auto-Request Review',
    description:
      'If no review has been submitted within a set number of days after an event, send the client a review request email.',
    triggerEvent: 'event_completed',
    actionType: 'request_review_email',
    defaultConfig: {
      days_after_event: 3,
    },
    configFields: [
      {
        key: 'days_after_event',
        label: 'Days after event with no review',
        type: 'number',
        min: 1,
        max: 30,
        suffix: 'days',
      },
    ],
  },
  {
    type: 'auto_flag_stale_inquiry',
    name: 'Auto-Flag Stale Inquiry',
    description:
      'When an inquiry has had no activity for a set number of hours, bump it to the top of the priority queue and notify you.',
    triggerEvent: 'inquiry_stale',
    actionType: 'flag_stale_inquiry',
    defaultConfig: {
      stale_hours: 48,
    },
    configFields: [
      {
        key: 'stale_hours',
        label: 'Hours of no activity before flagging',
        type: 'number',
        min: 12,
        max: 336,
        suffix: 'hours',
      },
    ],
  },
  {
    type: 'auto_reorder_ingredient',
    name: 'Auto-Reorder Ingredient',
    description:
      'When an ingredient stock drops below par level, create a purchase order draft and notify you.',
    triggerEvent: 'stock_below_par',
    actionType: 'create_purchase_order_draft',
    defaultConfig: {
      notify: true,
    },
    configFields: [
      {
        key: 'notify',
        label: 'Send notification when triggered',
        type: 'boolean',
      },
    ],
  },
  {
    type: 'auto_block_calendar',
    name: 'Auto-Block Calendar',
    description:
      'When an event is confirmed, automatically block prep days on your calendar based on lead time.',
    triggerEvent: 'event_confirmed',
    actionType: 'block_prep_days',
    defaultConfig: {
      lead_time_days: 2,
    },
    configFields: [
      {
        key: 'lead_time_days',
        label: 'Prep days before event to block',
        type: 'number',
        min: 1,
        max: 14,
        suffix: 'days',
      },
    ],
  },
  {
    type: 'auto_archive_quote',
    name: 'Auto-Archive Quote',
    description:
      'When a quote has been expired for a set number of days, automatically move it to the archive and log the activity.',
    triggerEvent: 'quote_expired',
    actionType: 'archive_quote',
    defaultConfig: {
      days_after_expiry: 30,
    },
    configFields: [
      {
        key: 'days_after_expiry',
        label: 'Days after expiry before archiving',
        type: 'number',
        min: 7,
        max: 90,
        suffix: 'days',
      },
    ],
  },
]

export const PRESET_RULE_MAP = Object.fromEntries(
  PRESET_RULE_DEFINITIONS.map((d) => [d.type, d])
) as Record<string, PresetRuleDefinition>
