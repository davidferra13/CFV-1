#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 *  ChefFlow Database Integrity Audit
 * ══════════════════════════════════════════════════════════════
 *
 *  Connects directly to Supabase (service role, bypasses RLS).
 *  Validates every record against business rules.
 *  No browser, no server needed - just the database.
 *
 *  Usage:  node scripts/db-integrity-audit.mjs
 *  Output: reports/overnight-YYYY-MM-DD/db-integrity.md
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });

const DATE = new Date().toISOString().slice(0, 10);
const REPORTS_DIR = path.join(ROOT, 'reports', `overnight-${DATE}`);
const startTime = Date.now();

// ═══════════════════════ SUPABASE CLIENT ═════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ═══════════════════════ UTILITIES ════════════════════════════

function log(msg) {
  const t = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`[${t}] ${msg}`);
}

function fmt(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function fetchAll(table, select = '*') {
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(offset, offset + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

// ═══════════════════════ VALID ENUMS ═════════════════════════

const VALID_EVENT_STATUS = ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed', 'cancelled'];
const VALID_PAYMENT_STATUS = ['unpaid', 'deposit_paid', 'partial', 'paid', 'refunded'];
const VALID_QUOTE_STATUS = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
const VALID_INQUIRY_STATUS = ['new', 'awaiting_client', 'awaiting_chef', 'quoted', 'confirmed', 'declined', 'expired'];
const VALID_ENTRY_TYPES = ['payment', 'deposit', 'installment', 'final_payment', 'tip', 'refund', 'adjustment', 'add_on', 'credit'];

// Valid FSM transitions: from → [allowed destinations]
const VALID_TRANSITIONS = {
  null: ['draft'],
  draft: ['proposed', 'cancelled'],
  proposed: ['accepted', 'cancelled'],
  accepted: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// ═══════════════════════ CHECK DEFINITIONS ═══════════════════

function defineChecks(data) {
  const { events, clients, chefs, ledger, quotes, inquiries, eventTransitions, quoteTransitions } = data;

  // Index helpers
  const chefIds = new Set(chefs.map(c => c.id));
  const clientIds = new Set(clients.map(c => c.id));
  const eventIds = new Set(events.map(e => e.id));
  const eventMap = new Map(events.map(e => [e.id, e]));
  const clientMap = new Map(clients.map(c => [c.id, c]));

  // Group ledger by event
  const ledgerByEvent = new Map();
  for (const entry of ledger) {
    if (!ledgerByEvent.has(entry.event_id)) ledgerByEvent.set(entry.event_id, []);
    ledgerByEvent.get(entry.event_id).push(entry);
  }

  // Latest transition per event
  const latestTransition = new Map();
  for (const t of eventTransitions) {
    const existing = latestTransition.get(t.event_id);
    if (!existing || t.transitioned_at > existing.transitioned_at) {
      latestTransition.set(t.event_id, t);
    }
  }

  return [
    // ══════════ STRUCTURAL INTEGRITY ══════════
    {
      id: 'STR-001', category: 'Structural Integrity', severity: 'critical',
      name: 'Events with invalid tenant_id',
      run: () => {
        const bad = events.filter(e => !chefIds.has(e.tenant_id));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(e => `Event ${e.id} → tenant ${e.tenant_id}`) };
      },
      diagnosis: 'Events reference a tenant (chef) that doesn\'t exist. Data is orphaned.',
      fix: 'Investigate how these events were created. May need to reassign or archive.',
    },
    {
      id: 'STR-002', category: 'Structural Integrity', severity: 'critical',
      name: 'Events with invalid client_id',
      run: () => {
        const bad = events.filter(e => e.client_id && !clientIds.has(e.client_id));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(e => `Event ${e.id} → client ${e.client_id}`) };
      },
      diagnosis: 'Events reference clients that don\'t exist in the database.',
      fix: 'Link to valid clients or create the missing client records.',
    },
    {
      id: 'STR-003', category: 'Structural Integrity', severity: 'critical',
      name: 'Clients with invalid tenant_id',
      run: () => {
        const bad = clients.filter(c => !chefIds.has(c.tenant_id));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(c => `Client ${c.id} (${c.full_name}) → tenant ${c.tenant_id}`) };
      },
      diagnosis: 'Clients belong to a chef that doesn\'t exist.',
      fix: 'These are orphaned records. Investigate and reassign or remove.',
    },
    {
      id: 'STR-004', category: 'Structural Integrity', severity: 'high',
      name: 'Ledger entries with invalid event_id',
      run: () => {
        const bad = ledger.filter(l => l.event_id && !eventIds.has(l.event_id));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(l => `Ledger ${l.id} ($${(l.amount_cents/100).toFixed(2)}) → event ${l.event_id}`) };
      },
      diagnosis: 'Financial records point to events that no longer exist. Money is unaccounted for.',
      fix: 'CRITICAL for accounting. Find where these events went and reconcile.',
    },
    {
      id: 'STR-005', category: 'Structural Integrity', severity: 'high',
      name: 'Quotes with invalid event_id',
      run: () => {
        const bad = quotes.filter(q => q.event_id && !eventIds.has(q.event_id));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(q => `Quote ${q.id} → event ${q.event_id}`) };
      },
      diagnosis: 'Quotes reference events that don\'t exist.',
      fix: 'Archive or delete orphaned quotes.',
    },
    {
      id: 'STR-006', category: 'Structural Integrity', severity: 'medium',
      name: 'Events without any state transitions',
      run: () => {
        const withTransitions = new Set(eventTransitions.map(t => t.event_id));
        const bad = events.filter(e => !withTransitions.has(e.id));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(e => `Event ${e.id} (${e.status}) - no transition history`) };
      },
      diagnosis: 'Events exist but have no state transition audit trail.',
      fix: 'These events may have been created directly without the FSM. Add a retrospective transition record.',
    },

    // ══════════ EVENT FSM INTEGRITY ══════════
    {
      id: 'FSM-001', category: 'Event FSM', severity: 'critical',
      name: 'Events in invalid status',
      run: () => {
        const bad = events.filter(e => !VALID_EVENT_STATUS.includes(e.status));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(e => `Event ${e.id}: status="${e.status}"`) };
      },
      diagnosis: 'Events have a status value that doesn\'t exist in the FSM.',
      fix: 'Fix the status to a valid value. Check how it was set.',
    },
    {
      id: 'FSM-002', category: 'Event FSM', severity: 'high',
      name: 'Latest transition doesn\'t match current status',
      run: () => {
        const bad = [];
        for (const [eventId, trans] of latestTransition) {
          const event = eventMap.get(eventId);
          if (event && trans.to_status !== event.status) {
            bad.push(`Event ${eventId}: status="${event.status}" but last transition went to "${trans.to_status}"`);
          }
        }
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10) };
      },
      diagnosis: 'The event\'s current status doesn\'t match its last recorded transition. State was changed outside the FSM.',
      fix: 'Either add a corrective transition record or fix the event status.',
    },
    {
      id: 'FSM-003', category: 'Event FSM', severity: 'high',
      name: 'Impossible state transitions in history',
      run: () => {
        const bad = [];
        for (const t of eventTransitions) {
          const from = t.from_status || null;
          const allowed = VALID_TRANSITIONS[from] || [];
          if (!allowed.includes(t.to_status)) {
            bad.push(`Event ${t.event_id}: ${from || 'null'} → ${t.to_status} (not allowed)`);
          }
        }
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10) };
      },
      diagnosis: 'State transitions that shouldn\'t be possible according to the FSM occurred.',
      fix: 'These indicate a bypass of the FSM validation. Audit the code path that created them.',
    },
    {
      id: 'FSM-004', category: 'Event FSM', severity: 'medium',
      name: 'Completed events with future dates',
      run: () => {
        const today = new Date().toISOString().slice(0, 10);
        const bad = events.filter(e => e.status === 'completed' && e.event_date > today);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(e => `Event ${e.id}: completed but date is ${e.event_date}`) };
      },
      diagnosis: 'Events are marked completed but their date hasn\'t happened yet.',
      fix: 'Either the date is wrong or the completion was premature.',
    },
    {
      id: 'FSM-005', category: 'Event FSM', severity: 'low',
      name: 'Draft events older than 90 days (abandoned)',
      run: () => {
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const bad = events.filter(e => e.status === 'draft' && e.created_at < cutoff);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 5).map(e => `Event ${e.id}: draft since ${e.created_at?.slice(0, 10)}`) };
      },
      diagnosis: 'Old draft events that were never progressed. Likely abandoned.',
      fix: 'Consider cancelling or archiving these to keep the pipeline clean.',
    },

    // ══════════ FINANCIAL INTEGRITY ══════════
    {
      id: 'FIN-001', category: 'Financial Integrity', severity: 'critical',
      name: 'Zero-amount ledger entries',
      run: () => {
        const bad = ledger.filter(l => l.amount_cents === 0);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(l => `Ledger ${l.id} on event ${l.event_id}`) };
      },
      diagnosis: 'Ledger entries must never be zero. This violates the DB constraint.',
      fix: 'Remove zero entries - they corrupt balance calculations.',
    },
    {
      id: 'FIN-002', category: 'Financial Integrity', severity: 'critical',
      name: 'Refunds with positive amounts',
      run: () => {
        const bad = ledger.filter(l => l.is_refund && l.amount_cents > 0);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(l => `Ledger ${l.id}: refund of +$${(l.amount_cents/100).toFixed(2)} (should be negative)`) };
      },
      diagnosis: 'Refund entries must have negative amounts. Positive refunds add money instead of subtracting.',
      fix: 'Correct the amount_cents to be negative. This is actively inflating balances.',
    },
    {
      id: 'FIN-003', category: 'Financial Integrity', severity: 'critical',
      name: 'Refunds without refund_reason',
      run: () => {
        const bad = ledger.filter(l => l.is_refund && !l.refund_reason);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(l => `Ledger ${l.id} on event ${l.event_id}: refund with no reason`) };
      },
      diagnosis: 'Every refund must have a documented reason for accounting compliance.',
      fix: 'Add refund_reason to each affected entry.',
    },
    {
      id: 'FIN-004', category: 'Financial Integrity', severity: 'critical',
      name: 'Payment status doesn\'t match ledger reality',
      run: () => {
        const bad = [];
        for (const event of events) {
          if (!event.quoted_price_cents || event.status === 'draft' || event.status === 'cancelled') continue;
          const entries = ledgerByEvent.get(event.id) || [];
          const paid = entries.filter(e => !e.is_refund).reduce((s, e) => s + e.amount_cents, 0);
          const refunded = entries.filter(e => e.is_refund).reduce((s, e) => s + Math.abs(e.amount_cents), 0);
          const net = paid - refunded;

          if (event.payment_status === 'paid' && net < event.quoted_price_cents) {
            bad.push(`Event ${event.id}: marked PAID but only $${(net/100).toFixed(2)} of $${(event.quoted_price_cents/100).toFixed(2)} received`);
          }
          if (event.payment_status === 'unpaid' && net > 0) {
            bad.push(`Event ${event.id}: marked UNPAID but $${(net/100).toFixed(2)} received`);
          }
        }
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 15) };
      },
      diagnosis: 'The payment_status on events doesn\'t match what the ledger says. Someone is being shown wrong financial info.',
      fix: 'Recompute payment_status from ledger entries. The ledger is the source of truth.',
    },
    {
      id: 'FIN-005', category: 'Financial Integrity', severity: 'high',
      name: 'Deposits exceeding quoted price',
      run: () => {
        const bad = events.filter(e =>
          e.deposit_amount_cents && e.quoted_price_cents &&
          e.deposit_amount_cents > e.quoted_price_cents
        );
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(e => `Event ${e.id}: deposit $${(e.deposit_amount_cents/100).toFixed(2)} > quoted $${(e.quoted_price_cents/100).toFixed(2)}`) };
      },
      diagnosis: 'Deposit is more than the total quoted price. Mathematically impossible.',
      fix: 'Fix the deposit or quoted price. One of them is wrong.',
    },
    {
      id: 'FIN-006', category: 'Financial Integrity', severity: 'high',
      name: 'Negative prices on events',
      run: () => {
        const bad = events.filter(e => (e.quoted_price_cents && e.quoted_price_cents < 0) || (e.deposit_amount_cents && e.deposit_amount_cents < 0));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(e => `Event ${e.id}: price=$${(e.quoted_price_cents/100).toFixed(2)}, deposit=$${((e.deposit_amount_cents||0)/100).toFixed(2)}`) };
      },
      diagnosis: 'Prices must never be negative. This corrupts all financial calculations.',
      fix: 'Set to the correct positive value.',
    },
    {
      id: 'FIN-007', category: 'Financial Integrity', severity: 'medium',
      name: 'Duplicate ledger entries (same event, amount, within 60s)',
      run: () => {
        const bad = [];
        for (const [eventId, entries] of ledgerByEvent) {
          const sorted = entries.sort((a, b) => a.created_at?.localeCompare(b.created_at));
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].amount_cents === sorted[i-1].amount_cents &&
                sorted[i].entry_type === sorted[i-1].entry_type) {
              const t1 = new Date(sorted[i-1].created_at).getTime();
              const t2 = new Date(sorted[i].created_at).getTime();
              if (Math.abs(t2 - t1) < 60000) {
                bad.push(`Event ${eventId}: duplicate $${(sorted[i].amount_cents/100).toFixed(2)} ${sorted[i].entry_type} within 60s`);
              }
            }
          }
        }
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10) };
      },
      diagnosis: 'Same amount recorded twice within a minute - likely a double-submission bug.',
      fix: 'Verify with the chef whether both entries are intentional. Remove the duplicate if not.',
    },
    {
      id: 'FIN-008', category: 'Financial Integrity', severity: 'medium',
      name: 'Tips on non-completed events',
      run: () => {
        const bad = ledger.filter(l => {
          if (l.entry_type !== 'tip') return false;
          const event = eventMap.get(l.event_id);
          return event && event.status !== 'completed';
        });
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(l => `Event ${l.event_id}: tip of $${(l.amount_cents/100).toFixed(2)} but status is "${eventMap.get(l.event_id)?.status}"`) };
      },
      diagnosis: 'Tips should only exist on completed events.',
      fix: 'Either complete the event or move the tip to the correct event.',
    },

    // ══════════ QUOTE INTEGRITY ══════════
    {
      id: 'QOT-001', category: 'Quote Integrity', severity: 'high',
      name: 'Quotes in invalid status',
      run: () => {
        const bad = quotes.filter(q => !VALID_QUOTE_STATUS.includes(q.status));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(q => `Quote ${q.id}: status="${q.status}"`) };
      },
      diagnosis: 'Quotes have a status that doesn\'t exist.',
      fix: 'Set to a valid status.',
    },
    {
      id: 'QOT-002', category: 'Quote Integrity', severity: 'high',
      name: 'Accepted quotes without accepted_at timestamp',
      run: () => {
        const bad = quotes.filter(q => q.status === 'accepted' && !q.accepted_at);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(q => `Quote ${q.id}: accepted but no accepted_at`) };
      },
      diagnosis: 'We don\'t know WHEN this quote was accepted. Audit trail is broken.',
      fix: 'Set accepted_at from the quote state transition log.',
    },
    {
      id: 'QOT-003', category: 'Quote Integrity', severity: 'high',
      name: 'Negative quote amounts',
      run: () => {
        const bad = quotes.filter(q => q.total_quoted_cents && q.total_quoted_cents < 0);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(q => `Quote ${q.id}: $${(q.total_quoted_cents/100).toFixed(2)}`) };
      },
      diagnosis: 'Quote totals must be positive.',
      fix: 'Correct the amount.',
    },
    {
      id: 'QOT-004', category: 'Quote Integrity', severity: 'medium',
      name: 'Multiple accepted quotes for same event',
      run: () => {
        const byEvent = new Map();
        for (const q of quotes) {
          if (q.status === 'accepted' && q.event_id) {
            if (!byEvent.has(q.event_id)) byEvent.set(q.event_id, []);
            byEvent.get(q.event_id).push(q);
          }
        }
        const bad = [...byEvent.entries()].filter(([, qs]) => qs.length > 1);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(([eid, qs]) => `Event ${eid}: ${qs.length} accepted quotes`) };
      },
      diagnosis: 'An event should only have one accepted quote. Multiple accepted quotes means conflicting prices.',
      fix: 'Determine which quote is correct and reject the others.',
    },

    // ══════════ CLIENT INTEGRITY ══════════
    {
      id: 'CLI-001', category: 'Client Integrity', severity: 'high',
      name: 'Duplicate client emails within same tenant',
      run: () => {
        const seen = new Map();
        const bad = [];
        for (const c of clients) {
          if (!c.email) continue;
          const key = `${c.tenant_id}:${c.email.toLowerCase()}`;
          if (seen.has(key)) {
            bad.push(`Tenant ${c.tenant_id}: "${c.email}" used by client ${seen.get(key)} AND ${c.id}`);
          } else {
            seen.set(key, c.id);
          }
        }
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10) };
      },
      diagnosis: 'Two clients with the same email under the same chef. This causes confusion in lookups and communications.',
      fix: 'Merge the duplicate client records.',
    },
    {
      id: 'CLI-002', category: 'Client Integrity', severity: 'low',
      name: 'Clients with no email and no phone',
      run: () => {
        const bad = clients.filter(c => !c.email && !c.phone);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(c => `Client ${c.id}: "${c.full_name}" - no contact info`) };
      },
      diagnosis: 'Clients without any contact information cannot be reached.',
      fix: 'Add email or phone, or mark as dormant if no longer reachable.',
    },

    // ══════════ INQUIRY INTEGRITY ══════════
    {
      id: 'INQ-001', category: 'Inquiry Integrity', severity: 'high',
      name: 'Inquiries in invalid status',
      run: () => {
        const bad = inquiries.filter(i => !VALID_INQUIRY_STATUS.includes(i.status));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(i => `Inquiry ${i.id}: status="${i.status}"`) };
      },
      diagnosis: 'Inquiries have a status that doesn\'t exist in the pipeline.',
      fix: 'Set to a valid status.',
    },
    {
      id: 'INQ-002', category: 'Inquiry Integrity', severity: 'medium',
      name: 'Stale inquiries (new/awaiting for 30+ days)',
      run: () => {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const staleStatuses = ['new', 'awaiting_client', 'awaiting_chef'];
        const bad = inquiries.filter(i => staleStatuses.includes(i.status) && i.created_at < cutoff);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(i => `Inquiry ${i.id}: "${i.status}" since ${i.created_at?.slice(0, 10)}`) };
      },
      diagnosis: 'These inquiries have been sitting untouched for over a month. Potential lost business.',
      fix: 'Follow up or mark as declined/expired.',
    },
    {
      id: 'INQ-003', category: 'Inquiry Integrity', severity: 'medium',
      name: 'Confirmed inquiries missing required fields',
      run: () => {
        const bad = inquiries.filter(i => {
          if (i.status !== 'confirmed') return false;
          return !i.confirmed_date || !i.confirmed_guest_count;
        });
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(i => `Inquiry ${i.id}: confirmed but missing ${!i.confirmed_date ? 'date' : 'guest_count'}`) };
      },
      diagnosis: 'Confirmed inquiries should have a date and guest count locked in.',
      fix: 'Update the missing fields from the associated event or client communication.',
    },

    // ══════════ DATA QUALITY ══════════
    {
      id: 'DQ-001', category: 'Data Quality', severity: 'medium',
      name: 'Events with guest count outside 1-200',
      run: () => {
        const bad = events.filter(e => e.guest_count && (e.guest_count < 1 || e.guest_count > 200));
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(e => `Event ${e.id}: ${e.guest_count} guests`) };
      },
      diagnosis: 'Guest count is outside the valid range.',
      fix: 'Correct the guest count.',
    },
    {
      id: 'DQ-002', category: 'Data Quality', severity: 'low',
      name: 'Events with dates before 2024',
      run: () => {
        const bad = events.filter(e => e.event_date && e.event_date < '2024-01-01');
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(e => `Event ${e.id}: date ${e.event_date}`) };
      },
      diagnosis: 'Events with very old dates - likely test data or entry errors.',
      fix: 'Correct dates or archive if these are test records.',
    },
    {
      id: 'DQ-003', category: 'Data Quality', severity: 'medium',
      name: 'Records with null tenant_id',
      run: () => {
        const tables = [
          ['events', events],
          ['clients', clients],
          ['ledger_entries', ledger],
          ['quotes', quotes],
          ['inquiries', inquiries],
        ];
        const bad = [];
        for (const [name, rows] of tables) {
          const nulls = rows.filter(r => !r.tenant_id);
          if (nulls.length > 0) bad.push(`${name}: ${nulls.length} rows with null tenant_id`);
        }
        return { pass: bad.length === 0, count: bad.length, details: bad };
      },
      diagnosis: 'Records without tenant_id break multi-tenant isolation.',
      fix: 'Assign the correct tenant_id or remove the orphaned records.',
    },
    {
      id: 'DQ-004', category: 'Data Quality', severity: 'medium',
      name: 'Clients with empty or whitespace-only names',
      run: () => {
        const bad = clients.filter(c => !c.full_name?.trim());
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(c => `Client ${c.id}: name="${c.full_name}"`) };
      },
      diagnosis: 'Clients without names are confusing in the UI and emails.',
      fix: 'Add proper names from inquiry source data.',
    },

    // ══════════ TEMPORAL INTEGRITY ══════════
    {
      id: 'TMP-001', category: 'Temporal Integrity', severity: 'medium',
      name: 'Records where created_at > updated_at',
      run: () => {
        const allRecords = [...events, ...clients, ...quotes, ...inquiries];
        const bad = allRecords.filter(r => r.created_at && r.updated_at && r.created_at > r.updated_at);
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10).map(r => `${r.id}: created ${r.created_at?.slice(0, 19)} > updated ${r.updated_at?.slice(0, 19)}`) };
      },
      diagnosis: 'A record cannot be updated before it was created. Clock skew or manual tampering.',
      fix: 'Set updated_at = created_at for affected records.',
    },
    {
      id: 'TMP-002', category: 'Temporal Integrity', severity: 'high',
      name: 'State transitions out of chronological order',
      run: () => {
        const byEvent = new Map();
        for (const t of eventTransitions) {
          if (!byEvent.has(t.event_id)) byEvent.set(t.event_id, []);
          byEvent.get(t.event_id).push(t);
        }
        const bad = [];
        for (const [eventId, trans] of byEvent) {
          trans.sort((a, b) => a.transitioned_at?.localeCompare(b.transitioned_at));
          for (let i = 1; i < trans.length; i++) {
            const prev = VALID_EVENT_STATUS.indexOf(trans[i-1].to_status);
            const curr = VALID_EVENT_STATUS.indexOf(trans[i].to_status);
            // Going backwards (except to cancelled) is suspicious
            if (curr < prev && trans[i].to_status !== 'cancelled') {
              bad.push(`Event ${eventId}: went from "${trans[i-1].to_status}" back to "${trans[i].to_status}"`);
            }
          }
        }
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10) };
      },
      diagnosis: 'Events went backwards in the lifecycle - possible data corruption or manual override.',
      fix: 'Audit the code path that allowed this regression.',
    },

    // ══════════ CROSS-TABLE CONSISTENCY ══════════
    {
      id: 'XTB-001', category: 'Cross-Table Consistency', severity: 'high',
      name: 'Event allergies don\'t match client allergies',
      run: () => {
        const bad = [];
        for (const e of events) {
          if (!e.client_id || !e.allergies?.length) continue;
          const client = clientMap.get(e.client_id);
          if (!client?.allergies?.length) continue;
          // Check if event has allergies not in client record
          const clientAllergies = new Set((client.allergies || []).map(a => a.toLowerCase()));
          const missing = (e.allergies || []).filter(a => !clientAllergies.has(a.toLowerCase()));
          if (missing.length > 0) {
            bad.push(`Event ${e.id}: allergies [${missing.join(', ')}] not on client ${e.client_id}`);
          }
        }
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10) };
      },
      diagnosis: 'Event records allergies that aren\'t on the client profile. Could be stale or manually overridden.',
      fix: 'Sync allergies between event and client. SAFETY CRITICAL - allergies can be life-threatening.',
    },
    {
      id: 'XTB-002', category: 'Cross-Table Consistency', severity: 'high',
      name: 'Accepted quotes with different amount than event\'s quoted_price',
      run: () => {
        const bad = [];
        for (const q of quotes) {
          if (q.status !== 'accepted' || !q.event_id) continue;
          const event = eventMap.get(q.event_id);
          if (!event || !event.quoted_price_cents) continue;
          if (q.total_quoted_cents !== event.quoted_price_cents) {
            bad.push(`Event ${q.event_id}: quote says $${(q.total_quoted_cents/100).toFixed(2)} but event says $${(event.quoted_price_cents/100).toFixed(2)}`);
          }
        }
        return { pass: bad.length === 0, count: bad.length, details: bad.slice(0, 10) };
      },
      diagnosis: 'The accepted quote price and the event\'s quoted price don\'t match. Someone is seeing the wrong number.',
      fix: 'Sync the event\'s quoted_price_cents with the accepted quote\'s total_quoted_cents.',
    },
  ];
}

// ═══════════════════════ REPORT GENERATOR ════════════════════

function generateReport(results, dataCounts) {
  const totalDuration = Date.now() - startTime;
  const lines = [];
  const w = (s) => lines.push(s);

  // Scoring
  let score = 100;
  const critFails = results.filter(r => !r.pass && r.severity === 'critical');
  const highFails = results.filter(r => !r.pass && r.severity === 'high');
  const medFails = results.filter(r => !r.pass && r.severity === 'medium');
  const lowFails = results.filter(r => !r.pass && r.severity === 'low');
  score -= critFails.length * 10;
  score -= highFails.length * 5;
  score -= medFails.length * 2;
  score -= lowFails.length * 1;
  score = Math.max(0, score);
  const g = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  w('# ChefFlow Database Integrity Report');
  w('');
  w(`> **Generated:** ${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
  w(`> **Database:** ${SUPABASE_URL.replace('https://', '').split('.')[0]}.supabase.co`);
  w(`> **Duration:** ${(totalDuration / 1000).toFixed(1)}s`);
  w('');

  // Data counts
  w('## Data Scanned');
  w('');
  w('| Table | Records |');
  w('|-------|---------|');
  for (const [table, count] of Object.entries(dataCounts)) {
    w(`| ${table} | ${count.toLocaleString()} |`);
  }
  w('');
  w('---');
  w('');

  // Score
  w(`## Integrity Score: ${score}/100 (${g})`);
  w('');
  const totalChecks = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  w(`- **Checks run:** ${totalChecks}`);
  w(`- **Passed:** ${passed}`);
  w(`- **Failed:** ${failed} (${critFails.length} critical, ${highFails.length} high, ${medFails.length} medium, ${lowFails.length} low)`);
  w('');

  // Category breakdown
  const categories = [...new Set(results.map(r => r.category))];
  w('| Category | Pass | Fail | Critical Fails |');
  w('|----------|------|------|----------------|');
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catPass = catResults.filter(r => r.pass).length;
    const catFail = catResults.filter(r => !r.pass).length;
    const catCrit = catResults.filter(r => !r.pass && r.severity === 'critical').length;
    w(`| ${cat} | ${catPass} | ${catFail} | ${catCrit} |`);
  }
  w('');
  w('---');
  w('');

  // Critical & high findings first
  const criticalFindings = results.filter(r => !r.pass && (r.severity === 'critical' || r.severity === 'high'));
  if (criticalFindings.length > 0) {
    w('## Critical & High Findings (Fix First)');
    w('');
    criticalFindings.forEach((r, i) => {
      w(`### ${i + 1}. [${r.severity.toUpperCase()}] ${r.id}: ${r.name}`);
      w('');
      w(`**${r.count} issue${r.count !== 1 ? 's' : ''} found**`);
      w('');
      if (r.details.length > 0) {
        r.details.forEach(d => w(`- ${d}`));
        w('');
      }
      w(`**Diagnosis:** ${r.diagnosis}`);
      w('');
      w(`**Fix:** ${r.fix}`);
      w('');
    });
    w('---');
    w('');
  }

  // All results by category
  w('## All Check Results');
  w('');
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    w(`### ${cat}`);
    w('');
    w('| ID | Check | Severity | Status | Issues |');
    w('|----|-------|----------|--------|--------|');
    catResults.forEach(r => {
      const status = r.pass ? '✓ Pass' : '✗ FAIL';
      w(`| ${r.id} | ${r.name} | ${r.severity} | ${status} | ${r.count} |`);
    });
    w('');

    // Show details for failures
    const failures = catResults.filter(r => !r.pass);
    failures.forEach(r => {
      w(`#### ${r.id}: ${r.name}`);
      w('');
      r.details.forEach(d => w(`- ${d}`));
      w('');
      w(`> **Diagnosis:** ${r.diagnosis}`);
      w(`> **Fix:** ${r.fix}`);
      w('');
    });
  }

  w('---');
  w(`*Generated by ChefFlow Database Integrity Audit in ${(totalDuration / 1000).toFixed(1)}s*`);

  // Write
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, 'db-integrity.md');
  fs.writeFileSync(reportPath, lines.join('\n'));

  // JSON summary
  const summary = {
    date: DATE,
    score, grade: g,
    checks: totalChecks, passed, failed,
    critical: critFails.length, high: highFails.length,
    medium: medFails.length, low: lowFails.length,
    dataCounts,
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'db-integrity-summary.json'), JSON.stringify(summary, null, 2));

  return { score, grade: g, reportPath };
}

// ═══════════════════════ MAIN ════════════════════════════════

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  ChefFlow Database Integrity Audit');
  console.log('  ' + new Date().toLocaleString());
  console.log('='.repeat(60) + '\n');

  // Load all data
  log('Loading data from Supabase...');
  let data;
  try {
    const [events, clients, chefs, ledger, quotes, inquiries, eventTransitions, quoteTransitions] = await Promise.all([
      fetchAll('events'),
      fetchAll('clients'),
      fetchAll('chefs'),
      fetchAll('ledger_entries'),
      fetchAll('quotes'),
      fetchAll('inquiries'),
      fetchAll('event_state_transitions'),
      fetchAll('quote_state_transitions'),
    ]);
    data = { events, clients, chefs, ledger, quotes, inquiries, eventTransitions, quoteTransitions };
    log(`Loaded: ${events.length} events, ${clients.length} clients, ${chefs.length} chefs, ${ledger.length} ledger entries, ${quotes.length} quotes, ${inquiries.length} inquiries, ${eventTransitions.length} event transitions`);
  } catch (err) {
    log(`FATAL: Failed to load data: ${err.message}`);
    process.exit(1);
  }

  const dataCounts = {
    events: data.events.length,
    clients: data.clients.length,
    chefs: data.chefs.length,
    ledger_entries: data.ledger.length,
    quotes: data.quotes.length,
    inquiries: data.inquiries.length,
    event_state_transitions: data.eventTransitions.length,
    quote_state_transitions: data.quoteTransitions.length,
  };

  // Run checks
  const checks = defineChecks(data);
  log(`Running ${checks.length} integrity checks...`);

  const results = [];
  for (const check of checks) {
    const t0 = Date.now();
    try {
      const result = check.run();
      const r = result instanceof Promise ? await result : result;
      const status = r.pass ? '✓' : '✗';
      const dur = fmt(Date.now() - t0);
      log(`  ${status} ${check.id}: ${check.name} - ${r.count} issues (${dur})`);
      results.push({ ...check, ...r, run: undefined });
    } catch (err) {
      log(`  ! ${check.id}: ERROR - ${err.message}`);
      results.push({ ...check, pass: false, count: -1, details: [`Error: ${err.message}`], run: undefined });
    }
  }

  // Generate report
  const report = generateReport(results, dataCounts);

  // Final summary
  const failed = results.filter(r => !r.pass).length;
  console.log('\n' + '='.repeat(60));
  console.log(`  INTEGRITY AUDIT COMPLETE`);
  console.log(`  Score: ${report.score}/100 (${report.grade})`);
  console.log(`  ${results.length} checks: ${results.length - failed} passed, ${failed} failed`);
  console.log(`  Report: ${report.reportPath}`);
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
