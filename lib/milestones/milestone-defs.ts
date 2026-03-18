/**
 * Milestone definitions for ChefFlow.
 * Maps threshold rules to animation configs.
 *
 * No 'use server' - pure client-safe config.
 * AnimationType matches the system in lib/holidays/overlay-configs.ts.
 */

import type { AnimationType } from '@/lib/holidays/overlay-configs'

export interface MilestoneDef {
  id: string
  /** Short celebratory label shown in the banner during animation */
  label: string
  emoji: string
  type: AnimationType
  colors: string[]
  /** Number of particles (1 for walk/sticker/pulse) */
  count: number
  durationMs: number
  // Detection - exactly one of these will be set:
  clientThreshold?: number
  eventThreshold?: number
  /** Revenue threshold in cents */
  revenueThreshold?: number
  /** Anniversary year (1, 2, 3, 5 …) */
  businessYears?: number
}

export const MILESTONE_DEFS: MilestoneDef[] = [
  // ─── CLIENT MILESTONES ─────────────────────────────────────────────────────

  {
    id: 'client_1',
    label: 'First Client!',
    emoji: '🎉',
    type: 'burst',
    colors: ['#ffd700', '#ff4444', '#4444ff', '#44ff44', '#ff69b4'],
    count: 80,
    durationMs: 3000,
    clientThreshold: 1,
  },
  {
    id: 'client_5',
    label: '5 Clients!',
    emoji: '🌟',
    type: 'burst',
    colors: ['#ffd700', '#ffec8b', '#ffa500', '#ff8c00'],
    count: 50,
    durationMs: 2800,
    clientThreshold: 5,
  },
  {
    id: 'client_10',
    label: '10 Clients!',
    emoji: '🥂',
    type: 'walk',
    colors: ['#c0a060'],
    count: 1,
    durationMs: 2800,
    clientThreshold: 10,
  },
  {
    id: 'client_25',
    label: '25 Clients!',
    emoji: '🎊',
    type: 'burst',
    colors: ['#ffd700', '#ff4444', '#4444ff', '#44ff44', '#ff69b4', '#00bcd4'],
    count: 80,
    durationMs: 3200,
    clientThreshold: 25,
  },
  {
    id: 'client_50',
    label: '50 Clients!',
    emoji: '🎆',
    type: 'burst',
    colors: ['#cc0000', '#cccccc', '#002868', '#ffd700'],
    count: 100,
    durationMs: 3500,
    clientThreshold: 50,
  },
  {
    id: 'client_100',
    label: '100 Clients!',
    emoji: '🏆',
    type: 'burst',
    colors: ['#ffd700', '#ffec8b', '#d4af37', '#ffa500'],
    count: 120,
    durationMs: 4000,
    clientThreshold: 100,
  },
  {
    id: 'client_250',
    label: '250 Clients!',
    emoji: '👑',
    type: 'burst',
    colors: ['#ffd700', '#d4af37', '#ffec8b', '#fffacd'],
    count: 150,
    durationMs: 4500,
    clientThreshold: 250,
  },

  // ─── EVENT MILESTONES ──────────────────────────────────────────────────────

  {
    id: 'event_1',
    label: 'First Event!',
    emoji: '🍽️',
    type: 'rising',
    colors: ['#e88f47', '#d4812c', '#f0a060', '#c07030'],
    count: 20,
    durationMs: 3000,
    eventThreshold: 1,
  },
  {
    id: 'event_5',
    label: '5 Events!',
    emoji: '⭐',
    type: 'burst',
    colors: ['#ffd700', '#ffec8b', '#ffa500'],
    count: 50,
    durationMs: 2800,
    eventThreshold: 5,
  },
  {
    id: 'event_10',
    label: '10 Events!',
    emoji: '🎉',
    type: 'burst',
    colors: ['#ff4444', '#ffd700', '#4444ff', '#44ff44'],
    count: 70,
    durationMs: 3000,
    eventThreshold: 10,
  },
  {
    id: 'event_25',
    label: '25 Events!',
    emoji: '🎊',
    type: 'burst',
    colors: ['#ffd700', '#ff4444', '#4444ff', '#ff69b4', '#00bcd4'],
    count: 90,
    durationMs: 3200,
    eventThreshold: 25,
  },
  {
    id: 'event_50',
    label: '50 Events!',
    emoji: '🎆',
    type: 'burst',
    colors: ['#cc0000', '#002868', '#ffd700', '#cccccc'],
    count: 100,
    durationMs: 3500,
    eventThreshold: 50,
  },
  {
    id: 'event_100',
    label: '100 Events!',
    emoji: '🏆',
    type: 'burst',
    colors: ['#ffd700', '#d4af37', '#ffec8b', '#ffa500', '#ff4444'],
    count: 130,
    durationMs: 4000,
    eventThreshold: 100,
  },
  {
    id: 'event_250',
    label: '250 Events!',
    emoji: '🌟',
    type: 'burst',
    colors: ['#ffd700', '#fffacd', '#d4af37', '#ffec8b', '#ffffff'],
    count: 160,
    durationMs: 4500,
    eventThreshold: 250,
  },

  // ─── REVENUE MILESTONES ────────────────────────────────────────────────────

  {
    id: 'revenue_100000',
    label: 'First $1,000!',
    emoji: '💵',
    type: 'rising',
    colors: ['#2e7d32', '#43a047', '#66bb6a', '#a5d6a7'],
    count: 20,
    durationMs: 3000,
    revenueThreshold: 100_000, // $1,000 in cents
  },
  {
    id: 'revenue_500000',
    label: '$5,000 Revenue!',
    emoji: '💰',
    type: 'burst',
    colors: ['#2e7d32', '#43a047', '#ffd700', '#66bb6a'],
    count: 60,
    durationMs: 3000,
    revenueThreshold: 500_000, // $5,000
  },
  {
    id: 'revenue_1000000',
    label: '$10,000 Revenue!',
    emoji: '🎉',
    type: 'burst',
    colors: ['#2e7d32', '#ffd700', '#43a047', '#ff4444', '#ff69b4'],
    count: 80,
    durationMs: 3200,
    revenueThreshold: 1_000_000, // $10,000
  },
  {
    id: 'revenue_2500000',
    label: '$25,000 Revenue!',
    emoji: '🎊',
    type: 'burst',
    colors: ['#ffd700', '#2e7d32', '#43a047', '#ff4444', '#4444ff'],
    count: 100,
    durationMs: 3500,
    revenueThreshold: 2_500_000, // $25,000
  },
  {
    id: 'revenue_5000000',
    label: '$50,000 Revenue!',
    emoji: '🎆',
    type: 'burst',
    colors: ['#ffd700', '#2e7d32', '#43a047', '#cc0000', '#002868'],
    count: 120,
    durationMs: 3800,
    revenueThreshold: 5_000_000, // $50,000
  },
  {
    id: 'revenue_10000000',
    label: '$100,000 Revenue!',
    emoji: '🏆',
    type: 'burst',
    colors: ['#ffd700', '#d4af37', '#ffec8b', '#2e7d32', '#43a047'],
    count: 150,
    durationMs: 4200,
    revenueThreshold: 10_000_000, // $100,000
  },
  {
    id: 'revenue_25000000',
    label: '$250,000 Revenue!',
    emoji: '👑',
    type: 'burst',
    colors: ['#ffd700', '#d4af37', '#ffec8b', '#fffacd', '#2e7d32'],
    count: 180,
    durationMs: 4500,
    revenueThreshold: 25_000_000, // $250,000
  },

  // ─── BUSINESS BIRTHDAY ─────────────────────────────────────────────────────

  {
    id: 'bday_1',
    label: '1 Year in Business!',
    emoji: '🎂',
    type: 'sticker',
    colors: ['#ff69b4', '#ffd700', '#4444ff'],
    count: 1,
    durationMs: 4000,
    businessYears: 1,
  },
  {
    id: 'bday_2',
    label: '2 Years in Business!',
    emoji: '🎊',
    type: 'burst',
    colors: ['#ffd700', '#ff4444', '#4444ff', '#44ff44'],
    count: 80,
    durationMs: 3500,
    businessYears: 2,
  },
  {
    id: 'bday_3',
    label: '3 Years in Business!',
    emoji: '🎆',
    type: 'burst',
    colors: ['#cc0000', '#002868', '#ffd700', '#cccccc'],
    count: 100,
    durationMs: 4000,
    businessYears: 3,
  },
  {
    id: 'bday_5',
    label: '5 Years in Business!',
    emoji: '👑',
    type: 'burst',
    colors: ['#ffd700', '#d4af37', '#ffec8b', '#fffacd', '#ff69b4'],
    count: 150,
    durationMs: 4500,
    businessYears: 5,
  },
]
