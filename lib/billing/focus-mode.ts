// Focus Mode — Constants & Type Definitions
// Defines what's "core" vs "extended" in the progressive disclosure system.
// Server actions (isFocusModeEnabled, toggleFocusMode) are in focus-mode-actions.ts.
// This file has no 'use server' because it exports const arrays/Sets.

/**
 * Core modules — the 6 workflows a private chef needs daily.
 * These are always visible when Focus Mode is ON.
 */
export const CORE_MODULES = [
  'dashboard',
  'pipeline',
  'events',
  'culinary',
  'clients',
  'finance',
] as const

/**
 * Extended modules — powerful features hidden in Focus Mode.
 * Still accessible when Focus Mode is OFF. Nothing is deleted.
 */
export const EXTENDED_MODULES = ['protection', 'more', 'commerce', 'social-hub'] as const

/**
 * Core standalone nav items — shown in Focus Mode.
 * These are the top-of-sidebar shortcuts that map to core workflows.
 */
export const CORE_NAV_HREFS = new Set([
  '/dashboard',
  '/commands', // Remy
  '/daily', // Daily Ops
  '/inbox', // Inbox
  '/clients', // Clients
  '/inquiries', // Inquiries
  '/chat', // Messaging
  '/schedule', // Calendar
  '/events', // All Events
  '/menus', // Menus
  '/activity', // Activity
  '/goals', // Goals
])

/**
 * Extended standalone nav items — hidden in Focus Mode, shown when OFF.
 * These still exist, just not visible by default.
 */
export const EXTENDED_NAV_HREFS = new Set([
  '/travel',
  '/staff',
  '/tasks',
  '/stations',
  '/commerce',
  '/commerce/register',
])
