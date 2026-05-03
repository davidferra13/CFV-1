// Remy Write Command Registry
// Maps command strings to write functions for the brain dump pipeline.
// NOT a 'use server' file - plain object exports are forbidden in server files.

import type { ApprovalTier } from '@/lib/ai/command-types'
import type { RemyWriteResult } from '@/lib/ai/remy-write-commands'
import {
  remyCreateEvent,
  remyUpdateEvent,
  remyTransitionEvent,
  remyCreateClient,
  remyUpdateClient,
  remyCreateTask,
  remyCompleteTask,
  remyCreateMenu,
  remyAddDishToMenu,
  remySaveNote,
  remyCreateExpense,
  remyCreateStaff,
  remyAssignStaff,
  remyRecordStaffHours,
  remyCreateQuote,
  remyTransitionQuote,
  remyGenerateContract,
  remyCreatePrepBlock,
  remyCompletePrepBlock,
  remyTogglePrepItem,
  remyMarkCarPacked,
  remyCreateEquipment,
  remyLogMaintenance,
} from '@/lib/ai/remy-write-commands'

export const REMY_WRITE_REGISTRY: Record<
  string,
  {
    fn: (inputs: any) => Promise<RemyWriteResult>
    tier: ApprovalTier
    description: string
    category: string
  }
> = {
  'event.create': {
    fn: remyCreateEvent,
    tier: 2,
    description: 'Create a new event',
    category: 'events',
  },
  'event.update': {
    fn: remyUpdateEvent,
    tier: 2,
    description: 'Update event details',
    category: 'events',
  },
  'client.create': {
    fn: remyCreateClient,
    tier: 2,
    description: 'Create a new client',
    category: 'clients',
  },
  'client.update': {
    fn: remyUpdateClient,
    tier: 2,
    description: 'Update client info',
    category: 'clients',
  },
  'todo.create': {
    fn: remyCreateTask,
    tier: 1,
    description: 'Create a task',
    category: 'tasks',
  },
  'todo.complete': {
    fn: remyCompleteTask,
    tier: 1,
    description: 'Complete a task',
    category: 'tasks',
  },
  'menu.create': {
    fn: remyCreateMenu,
    tier: 2,
    description: 'Create a menu',
    category: 'menus',
  },
  'menu.add_dish': {
    fn: remyAddDishToMenu,
    tier: 2,
    description: 'Add dish to menu',
    category: 'menus',
  },
  'memory.save': {
    fn: remySaveNote,
    tier: 1,
    description: 'Save a note/memory',
    category: 'notes',
  },
  'expense.create': {
    fn: remyCreateExpense,
    tier: 2,
    description: 'Log an expense',
    category: 'finance',
  },
  'event.transition': {
    fn: remyTransitionEvent,
    tier: 3,
    description: 'Change event status',
    category: 'events',
  },
  'staff.create': {
    fn: remyCreateStaff,
    tier: 2,
    description: 'Add a staff member',
    category: 'staff',
  },
  'staff.assign': {
    fn: remyAssignStaff,
    tier: 2,
    description: 'Assign staff to event',
    category: 'staff',
  },
  'staff.record_hours': {
    fn: remyRecordStaffHours,
    tier: 2,
    description: 'Record staff hours worked',
    category: 'staff',
  },
  'quote.create': {
    fn: remyCreateQuote,
    tier: 3,
    description: 'Create a quote',
    category: 'finance',
  },
  'quote.transition': {
    fn: remyTransitionQuote,
    tier: 3,
    description: 'Send/accept/reject quote',
    category: 'finance',
  },
  'contract.generate': {
    fn: remyGenerateContract,
    tier: 3,
    description: 'Generate event contract',
    category: 'contracts',
  },
  'prep.create_block': {
    fn: remyCreatePrepBlock,
    tier: 2,
    description: 'Schedule a prep block',
    category: 'prep',
  },
  'prep.complete_block': {
    fn: remyCompletePrepBlock,
    tier: 1,
    description: 'Complete a prep block',
    category: 'prep',
  },
  'prep.toggle_item': {
    fn: remyTogglePrepItem,
    tier: 1,
    description: 'Check off a prep item',
    category: 'prep',
  },
  'packing.mark_packed': {
    fn: remyMarkCarPacked,
    tier: 1,
    description: 'Mark car as packed',
    category: 'packing',
  },
  'equipment.create': {
    fn: remyCreateEquipment,
    tier: 2,
    description: 'Add equipment to inventory',
    category: 'equipment',
  },
  'equipment.log_maintenance': {
    fn: remyLogMaintenance,
    tier: 1,
    description: 'Log equipment maintenance',
    category: 'equipment',
  },
}
