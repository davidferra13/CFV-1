// Channel Metadata - Single source of truth for all channel display properties.
// Used by: inbox cards, inquiry badges, analytics charts, settings page.
// Every channel in the system gets a color, icon name, and label defined here.

export type ChannelMeta = {
  /** Tailwind text color class for the icon/label */
  textColor: string
  /** Tailwind background color class for badge background */
  bgColor: string
  /** Tailwind ring/border color class */
  ringColor: string
  /** Lucide icon name (imported separately to avoid SSR issues) */
  iconName: string
  /** Full display label */
  label: string
  /** Short label for compact badges */
  shortLabel: string
  /** Left-border color for inbox card accent stripe (hex for inline styles) */
  accentHex: string
}

/**
 * Master channel registry. Every source/channel across the entire app
 * should reference this instead of inline switch statements.
 */
export const CHANNEL_META: Record<string, ChannelMeta> = {
  // ─── Primary Channels ──────────────────────────────────────────────
  email: {
    textColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    ringColor: 'ring-red-500/30',
    iconName: 'Mail',
    label: 'Email',
    shortLabel: 'Email',
    accentHex: '#EF4444',
  },
  website: {
    textColor: 'text-brand-500',
    bgColor: 'bg-brand-500/10',
    ringColor: 'ring-brand-500/30',
    iconName: 'Globe',
    label: 'Website',
    shortLabel: 'Web',
    accentHex: '#E88F47',
  },
  website_form: {
    textColor: 'text-brand-500',
    bgColor: 'bg-brand-500/10',
    ringColor: 'ring-brand-500/30',
    iconName: 'Globe',
    label: 'Website Form',
    shortLabel: 'Web',
    accentHex: '#E88F47',
  },

  // ─── Messaging ─────────────────────────────────────────────────────
  sms: {
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
    iconName: 'Smartphone',
    label: 'SMS',
    shortLabel: 'SMS',
    accentHex: '#3B82F6',
  },
  text: {
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
    iconName: 'Smartphone',
    label: 'Text',
    shortLabel: 'SMS',
    accentHex: '#3B82F6',
  },
  whatsapp: {
    textColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
    ringColor: 'ring-green-500/30',
    iconName: 'MessageCircle',
    label: 'WhatsApp',
    shortLabel: 'WA',
    accentHex: '#25D366',
  },
  phone: {
    textColor: 'text-stone-400',
    bgColor: 'bg-stone-500/10',
    ringColor: 'ring-stone-500/30',
    iconName: 'Phone',
    label: 'Phone',
    shortLabel: 'Phone',
    accentHex: '#78716C',
  },

  // ─── Social ────────────────────────────────────────────────────────
  instagram: {
    textColor: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    ringColor: 'ring-pink-500/30',
    iconName: 'Instagram',
    label: 'Instagram',
    shortLabel: 'IG',
    accentHex: '#E1306C',
  },
  facebook: {
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-600/10',
    ringColor: 'ring-blue-600/30',
    iconName: 'Facebook',
    label: 'Facebook',
    shortLabel: 'FB',
    accentHex: '#1877F2',
  },

  // ─── Marketplace Platforms ─────────────────────────────────────────
  take_a_chef: {
    textColor: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    ringColor: 'ring-teal-500/30',
    iconName: 'ChefHat',
    label: 'TakeAChef',
    shortLabel: 'TAC',
    accentHex: '#14B8A6',
  },
  takeachef: {
    textColor: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    ringColor: 'ring-teal-500/30',
    iconName: 'ChefHat',
    label: 'TakeAChef',
    shortLabel: 'TAC',
    accentHex: '#14B8A6',
  },
  yhangry: {
    textColor: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    ringColor: 'ring-violet-500/30',
    iconName: 'UtensilsCrossed',
    label: 'Yhangry',
    shortLabel: 'YH',
    accentHex: '#8B5CF6',
  },
  theknot: {
    textColor: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    ringColor: 'ring-rose-500/30',
    iconName: 'Heart',
    label: 'The Knot',
    shortLabel: 'Knot',
    accentHex: '#F43F5E',
  },
  thumbtack: {
    textColor: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    ringColor: 'ring-sky-500/30',
    iconName: 'Pin',
    label: 'Thumbtack',
    shortLabel: 'TT',
    accentHex: '#0EA5E9',
  },
  bark: {
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-600/10',
    ringColor: 'ring-amber-600/30',
    iconName: 'Megaphone',
    label: 'Bark',
    shortLabel: 'Bark',
    accentHex: '#D97706',
  },
  cozymeal: {
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    ringColor: 'ring-orange-500/30',
    iconName: 'Flame',
    label: 'Cozymeal',
    shortLabel: 'CM',
    accentHex: '#F97316',
  },
  google_business: {
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
    iconName: 'MapPin',
    label: 'Google Business',
    shortLabel: 'GBP',
    accentHex: '#4285F4',
  },
  gigsalad: {
    textColor: 'text-lime-600',
    bgColor: 'bg-lime-600/10',
    ringColor: 'ring-lime-600/30',
    iconName: 'Music',
    label: 'GigSalad',
    shortLabel: 'GS',
    accentHex: '#65A30D',
  },
  wix: {
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    ringColor: 'ring-yellow-500/30',
    iconName: 'Layout',
    label: 'Wix',
    shortLabel: 'Wix',
    accentHex: '#FACC15',
  },
  kiosk: {
    textColor: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    ringColor: 'ring-indigo-500/30',
    iconName: 'Monitor',
    label: 'Kiosk',
    shortLabel: 'Kiosk',
    accentHex: '#6366F1',
  },

  // ─── Manual / Other ────────────────────────────────────────────────
  referral: {
    textColor: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    ringColor: 'ring-amber-500/30',
    iconName: 'Users',
    label: 'Referral',
    shortLabel: 'Ref',
    accentHex: '#F59E0B',
  },
  walk_in: {
    textColor: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    ringColor: 'ring-emerald-500/30',
    iconName: 'Footprints',
    label: 'Walk-in',
    shortLabel: 'Walk',
    accentHex: '#10B981',
  },
  manual_log: {
    textColor: 'text-stone-400',
    bgColor: 'bg-stone-400/10',
    ringColor: 'ring-stone-400/30',
    iconName: 'PenLine',
    label: 'Manual Log',
    shortLabel: 'Log',
    accentHex: '#A8A29E',
  },
  internal_note: {
    textColor: 'text-stone-400',
    bgColor: 'bg-stone-400/10',
    ringColor: 'ring-stone-400/30',
    iconName: 'StickyNote',
    label: 'Internal Note',
    shortLabel: 'Note',
    accentHex: '#A8A29E',
  },
  campaign_response: {
    textColor: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    ringColor: 'ring-purple-500/30',
    iconName: 'MailOpen',
    label: 'Campaign Response',
    shortLabel: 'Camp',
    accentHex: '#A855F7',
  },
  outbound_prospecting: {
    textColor: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    ringColor: 'ring-cyan-500/30',
    iconName: 'Send',
    label: 'Outbound',
    shortLabel: 'Out',
    accentHex: '#06B6D4',
  },
  other: {
    textColor: 'text-stone-500',
    bgColor: 'bg-stone-500/10',
    ringColor: 'ring-stone-500/30',
    iconName: 'HelpCircle',
    label: 'Other',
    shortLabel: 'Other',
    accentHex: '#78716C',
  },
}

/** Default fallback for unknown channels */
const FALLBACK_META: ChannelMeta = {
  textColor: 'text-stone-500',
  bgColor: 'bg-stone-500/10',
  ringColor: 'ring-stone-500/30',
  iconName: 'HelpCircle',
  label: 'Unknown',
  shortLabel: '?',
  accentHex: '#78716C',
}

/**
 * Get channel display metadata. Always returns a valid object (never null).
 * Handles both communication source names ('takeachef') and inquiry channel
 * names ('take_a_chef') since they differ in some cases.
 */
export function getChannelMeta(channel: string): ChannelMeta {
  return CHANNEL_META[channel] ?? FALLBACK_META
}

/**
 * Get the display label for a channel/source. Drop-in replacement for
 * the inline `sourceLabel()` functions scattered across the codebase.
 */
export function channelLabel(channel: string): string {
  return getChannelMeta(channel).label
}

/**
 * Get the accent hex color for a channel. Used for inline styles
 * where Tailwind classes can't be used (e.g., chart colors, border-left).
 */
export function channelAccentHex(channel: string): string {
  return getChannelMeta(channel).accentHex
}
