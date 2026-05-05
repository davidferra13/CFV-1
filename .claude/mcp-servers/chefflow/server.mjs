/**
 * ChefFlow MCP Server v2.0
 *
 * Agent-first infrastructure: makes ChefFlow programmable by any MCP client.
 * Proxies to the v2 REST API (localhost:3100) with Bearer token auth.
 *
 * 102 tools across 25 domains (including 5 compound workflow tools).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CHEFFLOW_URL = process.env.CHEFFLOW_URL || 'http://localhost:3100';
const API_KEY = process.env.CHEFFLOW_API_KEY || '';
const TIMEOUT_MS = parseInt(process.env.CHEFFLOW_TIMEOUT || '15000', 10);

// ---------------------------------------------------------------------------
// HTTP client for v2 API
// ---------------------------------------------------------------------------

async function api(method, path, body, query) {
  const url = new URL(`/api/v2${path}`, CHEFFLOW_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`ChefFlow API ${res.status}: ${text.slice(0, 500)}`);
    }

    if (res.status === 204) return { success: true };
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Safe parallel fetch: returns settled results, never throws
async function apiAll(...calls) {
  const results = await Promise.allSettled(calls);
  return results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message }));
}

function json(data) {
  return JSON.stringify(data, null, 2);
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  // ── Meta ──────────────────────────────────────────────────────────────
  {
    name: 'chefflow_help',
    description:
      'List available ChefFlow MCP tools and their capabilities. Call with no arguments to see all tools, or pass a domain name to see details for that domain.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          enum: ['events', 'clients', 'menus', 'quotes', 'finance', 'invoices', 'inquiries', 'recipes', 'staff', 'inventory', 'vendors', 'notes', 'documents', 'search', 'partners', 'goals', 'notifications', 'ledger', 'settings', 'remy', 'taxonomy', 'safety', 'queue', 'workflows'],
          description: 'Domain to get detailed help for',
        },
      },
    },
  },
  {
    name: 'chefflow_status',
    description:
      'Business health snapshot. Returns: upcoming confirmed events (next 5), total active clients, recent quotes, open inquiries, and financial summary. Call this first to understand current state.',
    inputSchema: { type: 'object', properties: {} },
  },

  // ── Events ────────────────────────────────────────────────────────────
  {
    name: 'chefflow_events_list',
    description:
      'List events. Returns date, client name, guest count, status, location, service style, and quoted price.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'confirmed', 'completed', 'cancelled', 'archived'],
          description: 'Filter by status',
        },
        client_id: { type: 'string', description: 'Filter by client UUID' },
        date_from: { type: 'string', description: 'ISO date, events on or after' },
        date_to: { type: 'string', description: 'ISO date, events on or before' },
        page: { type: 'number' },
        per_page: { type: 'number', description: 'Max 200, default 50' },
      },
    },
  },
  {
    name: 'chefflow_events_get',
    description: 'Get full event details by ID including client info, dietary restrictions, pricing, location, and notes.',
    inputSchema: {
      type: 'object',
      properties: { event_id: { type: 'string', description: 'Event UUID' } },
      required: ['event_id'],
    },
  },
  {
    name: 'chefflow_events_create',
    description:
      'Create a new event (dinner, catering, etc.). Created in draft status. Requires client_id (use chefflow_clients_list to find it), event_date, serve_time, guest_count, and location.',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Client UUID (use chefflow_clients_list to find)' },
        event_date: { type: 'string', description: 'ISO date, e.g. 2026-06-15' },
        serve_time: { type: 'string', description: 'e.g. "18:00" or "6:00 PM"' },
        guest_count: { type: 'number' },
        location_address: { type: 'string' },
        location_city: { type: 'string' },
        location_state: { type: 'string', description: '2-letter state code' },
        location_zip: { type: 'string' },
        occasion: { type: 'string', description: 'birthday, anniversary, dinner party, etc.' },
        service_style: { type: 'string', enum: ['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'] },
        special_requests: { type: 'string' },
        dietary_restrictions: { type: 'array', items: { type: 'string' } },
        allergies: { type: 'array', items: { type: 'string' } },
        ambiance_notes: { type: 'string', description: 'Mood, decor, music preferences' },
      },
      required: ['client_id', 'event_date', 'serve_time', 'guest_count', 'location_address', 'location_city', 'location_zip'],
    },
  },
  {
    name: 'chefflow_events_update',
    description: 'Update fields on an existing event. Only pass fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        event_date: { type: 'string' },
        serve_time: { type: 'string' },
        guest_count: { type: 'number' },
        occasion: { type: 'string' },
        service_style: { type: 'string' },
        special_requests: { type: 'string' },
        dietary_restrictions: { type: 'array', items: { type: 'string' } },
        allergies: { type: 'array', items: { type: 'string' } },
        location_address: { type: 'string' },
        location_city: { type: 'string' },
        location_state: { type: 'string' },
        location_zip: { type: 'string' },
        site_notes: { type: 'string' },
        kitchen_notes: { type: 'string' },
        ambiance_notes: { type: 'string' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'chefflow_events_transition',
    description: 'Change event status. Valid transitions: draft->confirmed, confirmed->completed, any->cancelled. Cancel requires a reason.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        to_status: { type: 'string', enum: ['confirmed', 'completed', 'cancelled'] },
        reason: { type: 'string', description: 'Required for cancellation' },
      },
      required: ['event_id', 'to_status'],
    },
  },

  {
    name: 'chefflow_events_clone',
    description:
      'Clone an existing event to a new date. Copies menus, dishes, pricing, dietary info, and location. Creates a new draft. Great for repeating a past dinner for the same or different client.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Source event UUID to clone' },
        new_date: { type: 'string', description: 'ISO date for the new event, e.g. 2026-07-15' },
        new_client_id: { type: 'string', description: 'Optional: assign to a different client' },
      },
      required: ['event_id', 'new_date'],
    },
  },

  // ── Clients ───────────────────────────────────────────────────────────
  {
    name: 'chefflow_clients_list',
    description: 'List clients. Returns name, email, phone, dietary restrictions, allergies, status.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search by name (fuzzy)' },
        status: { type: 'string', enum: ['active', 'inactive', 'lead', 'archived'] },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_clients_get',
    description: 'Get full client details including dietary needs, notes, address, tags, and event history.',
    inputSchema: {
      type: 'object',
      properties: { client_id: { type: 'string' } },
      required: ['client_id'],
    },
  },
  {
    name: 'chefflow_clients_create',
    description: 'Create a new client. Only full_name is required; add dietary/allergy info if known.',
    inputSchema: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        dietary_restrictions: { type: 'array', items: { type: 'string' } },
        allergies: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip: { type: 'string' },
        source: { type: 'string', description: 'How acquired: referral, website, take-a-chef, etc.' },
      },
      required: ['full_name'],
    },
  },
  {
    name: 'chefflow_clients_update',
    description: 'Update client fields. Only pass fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        full_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive', 'lead', 'archived'] },
        dietary_restrictions: { type: 'array', items: { type: 'string' } },
        allergies: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['client_id'],
    },
  },

  // ── Menus ─────────────────────────────────────────────────────────────
  {
    name: 'chefflow_menus_list',
    description: 'List menus. Filter by event to see menus for a specific dinner.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Filter by event UUID' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_menus_get',
    description: 'Get full menu: courses, dishes, components, and cost breakdown.',
    inputSchema: {
      type: 'object',
      properties: { menu_id: { type: 'string' } },
      required: ['menu_id'],
    },
  },
  {
    name: 'chefflow_menus_create',
    description: 'Create a new menu. Optionally link to an event. Name is required.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Menu name' },
        event_id: { type: 'string', description: 'Link to event UUID' },
        season: { type: 'string', enum: ['spring', 'summer', 'fall', 'winter'] },
        client_id: { type: 'string' },
        target_date: { type: 'string', description: 'ISO date' },
        service_style: { type: 'string', enum: ['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'] },
        cuisine_type: { type: 'string' },
        target_guest_count: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'chefflow_menus_update',
    description: 'Update menu fields. Only pass fields to change.',
    inputSchema: {
      type: 'object',
      properties: {
        menu_id: { type: 'string' },
        name: { type: 'string' },
        season: { type: 'string', enum: ['spring', 'summer', 'fall', 'winter'] },
        service_style: { type: 'string', enum: ['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'] },
        cuisine_type: { type: 'string' },
        target_guest_count: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['menu_id'],
    },
  },
  {
    name: 'chefflow_menus_delete',
    description: 'Soft-delete a menu.',
    inputSchema: {
      type: 'object',
      properties: { menu_id: { type: 'string' } },
      required: ['menu_id'],
    },
  },
  {
    name: 'chefflow_menus_approve',
    description: 'Approve a menu linked to an event. Sets menu_approval_status to approved on the event.',
    inputSchema: {
      type: 'object',
      properties: { menu_id: { type: 'string' } },
      required: ['menu_id'],
    },
  },

  // ── Quotes ────────────────────────────────────────────────────────────
  {
    name: 'chefflow_quotes_list',
    description: 'List quotes/proposals. Filter by status (draft, sent, accepted, rejected, expired), event, or client.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        event_id: { type: 'string' },
        client_id: { type: 'string' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_quotes_get',
    description: 'Get full quote details: line items, total, status, client, event.',
    inputSchema: {
      type: 'object',
      properties: { quote_id: { type: 'string' } },
      required: ['quote_id'],
    },
  },
  {
    name: 'chefflow_quotes_create',
    description: 'Create a new quote/proposal. Requires client, name, pricing model, and total.',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Client UUID' },
        event_id: { type: 'string', description: 'Link to event (optional)' },
        inquiry_id: { type: 'string', description: 'Link to inquiry (optional)' },
        quote_name: { type: 'string', description: 'Quote title' },
        pricing_model: { type: 'string', enum: ['per_person', 'flat_rate', 'custom'] },
        total_quoted_cents: { type: 'number', description: 'Total in cents' },
        price_per_person_cents: { type: 'number' },
        guest_count_estimated: { type: 'number' },
        deposit_required: { type: 'boolean' },
        deposit_amount_cents: { type: 'number' },
        deposit_percentage: { type: 'number', description: '0-100' },
        pricing_notes: { type: 'string' },
        valid_until: { type: 'string', description: 'ISO date' },
      },
      required: ['client_id', 'quote_name', 'pricing_model', 'total_quoted_cents'],
    },
  },
  {
    name: 'chefflow_quotes_update',
    description: 'Update a draft quote. Only draft quotes can be edited. Pass only fields to change.',
    inputSchema: {
      type: 'object',
      properties: {
        quote_id: { type: 'string' },
        quote_name: { type: 'string' },
        pricing_model: { type: 'string', enum: ['per_person', 'flat_rate', 'custom'] },
        total_quoted_cents: { type: 'number' },
        price_per_person_cents: { type: 'number' },
        guest_count_estimated: { type: 'number' },
        deposit_required: { type: 'boolean' },
        deposit_amount_cents: { type: 'number' },
        deposit_percentage: { type: 'number' },
        pricing_notes: { type: 'string' },
        valid_until: { type: 'string' },
      },
      required: ['quote_id'],
    },
  },
  {
    name: 'chefflow_quotes_delete',
    description: 'Soft-delete a quote.',
    inputSchema: {
      type: 'object',
      properties: { quote_id: { type: 'string' } },
      required: ['quote_id'],
    },
  },
  {
    name: 'chefflow_quotes_send',
    description: 'Send a quote to the client (transitions status to sent).',
    inputSchema: {
      type: 'object',
      properties: { quote_id: { type: 'string' } },
      required: ['quote_id'],
    },
  },
  {
    name: 'chefflow_quotes_accept',
    description: 'Mark a quote as accepted by the client.',
    inputSchema: {
      type: 'object',
      properties: { quote_id: { type: 'string' } },
      required: ['quote_id'],
    },
  },

  // ── Finance ───────────────────────────────────────────────────────────
  {
    name: 'chefflow_finance_summary',
    description: 'Financial summary: total paid, refunded, tips, expenses, net revenue, profit, and profit margin. Optionally scoped to a single event.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Scope to a single event (optional)' },
      },
    },
  },
  {
    name: 'chefflow_expenses_list',
    description: 'List expenses. Filter by event, category, or date range.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        category: { type: 'string', description: 'Expense category filter' },
        date_from: { type: 'string', description: 'ISO date lower bound' },
        date_to: { type: 'string', description: 'ISO date upper bound' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },

  {
    name: 'chefflow_expenses_create',
    description: 'Record a new expense. Requires amount and category.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Link to event (optional)' },
        amount_cents: { type: 'number', description: 'Amount in cents' },
        category: { type: 'string', description: 'Expense category' },
        description: { type: 'string' },
        vendor: { type: 'string', description: 'Vendor name' },
        expense_date: { type: 'string', description: 'ISO date, defaults to today' },
        is_reimbursable: { type: 'boolean' },
        payment_method: { type: 'string', enum: ['cash', 'venmo', 'paypal', 'zelle', 'card', 'check', 'other'] },
      },
      required: ['amount_cents', 'category'],
    },
  },
  {
    name: 'chefflow_expenses_get',
    description: 'Get a single expense by ID.',
    inputSchema: {
      type: 'object',
      properties: { expense_id: { type: 'string' } },
      required: ['expense_id'],
    },
  },
  {
    name: 'chefflow_expenses_update',
    description: 'Update an expense. Pass only fields to change.',
    inputSchema: {
      type: 'object',
      properties: {
        expense_id: { type: 'string' },
        amount_cents: { type: 'number' },
        category: { type: 'string' },
        vendor_name: { type: 'string' },
        description: { type: 'string' },
        expense_date: { type: 'string' },
        event_id: { type: 'string' },
        notes: { type: 'string' },
        is_reimbursable: { type: 'boolean' },
        payment_method: { type: 'string' },
      },
      required: ['expense_id'],
    },
  },
  {
    name: 'chefflow_expenses_delete',
    description: 'Permanently delete an expense record.',
    inputSchema: {
      type: 'object',
      properties: { expense_id: { type: 'string' } },
      required: ['expense_id'],
    },
  },

  // ── Inquiries ─────────────────────────────────────────────────────────
  {
    name: 'chefflow_inquiries_list',
    description: 'List incoming inquiries/leads. Filter by status: new, awaiting_client, awaiting_chef, quoted, confirmed, declined, expired.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['new', 'awaiting_client', 'awaiting_chef', 'quoted', 'confirmed', 'declined', 'expired'] },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },

  {
    name: 'chefflow_inquiries_get',
    description: 'Get full inquiry details by ID including source message, confirmed details, likelihood score, and status history.',
    inputSchema: {
      type: 'object',
      properties: { inquiry_id: { type: 'string', description: 'Inquiry UUID' } },
      required: ['inquiry_id'],
    },
  },
  {
    name: 'chefflow_inquiries_update',
    description:
      'Update an inquiry. Can change status (FSM-validated), confirm details (date, guest count, location, budget, dietary restrictions), set likelihood, or add a decline reason. Valid transitions: new->awaiting_client/quoted/declined, awaiting_client->awaiting_chef/quoted/declined/expired, awaiting_chef->awaiting_client/quoted/declined, quoted->confirmed/declined/expired.',
    inputSchema: {
      type: 'object',
      properties: {
        inquiry_id: { type: 'string' },
        status: { type: 'string', enum: ['new', 'awaiting_client', 'awaiting_chef', 'quoted', 'confirmed', 'declined', 'expired'] },
        confirmed_date: { type: 'string', description: 'ISO date' },
        confirmed_guest_count: { type: 'number' },
        confirmed_occasion: { type: 'string' },
        confirmed_location: { type: 'string' },
        confirmed_budget_cents: { type: 'number' },
        confirmed_dietary_restrictions: { type: 'array', items: { type: 'string' } },
        confirmed_service_expectations: { type: 'string' },
        decline_reason: { type: 'string' },
        chef_likelihood: { type: 'number', description: '0-100 likelihood score' },
      },
      required: ['inquiry_id'],
    },
  },
  {
    name: 'chefflow_inquiries_create',
    description: 'Create a new inquiry/lead. Client name required. Specify channel source.',
    inputSchema: {
      type: 'object',
      properties: {
        client_name: { type: 'string' },
        client_email: { type: 'string' },
        client_phone: { type: 'string' },
        channel: { type: 'string', description: 'Source: email, text, instagram, take_a_chef, yhangry, phone, website, referral, thumbtack, bark, cozymeal, etc.' },
        confirmed_date: { type: 'string' },
        confirmed_guest_count: { type: 'number' },
        confirmed_occasion: { type: 'string' },
        confirmed_location: { type: 'string' },
        confirmed_budget_cents: { type: 'number' },
        confirmed_dietary_restrictions: { type: 'array', items: { type: 'string' } },
        source_message: { type: 'string', description: 'Original inquiry message text' },
        notes: { type: 'string' },
        referral_source: { type: 'string' },
        location_city: { type: 'string' },
        location_state: { type: 'string' },
        idempotency_key: { type: 'string', description: 'Prevents duplicate creation' },
      },
      required: ['client_name'],
    },
  },
  {
    name: 'chefflow_inquiries_delete',
    description: 'Soft-delete an inquiry.',
    inputSchema: {
      type: 'object',
      properties: { inquiry_id: { type: 'string' } },
      required: ['inquiry_id'],
    },
  },
  {
    name: 'chefflow_inquiries_convert',
    description: 'Convert a confirmed inquiry into a draft event. Inquiry must be in confirmed status with a client linked.',
    inputSchema: {
      type: 'object',
      properties: { inquiry_id: { type: 'string' } },
      required: ['inquiry_id'],
    },
  },

  // ── Recipes ───────────────────────────────────────────────────────────
  {
    name: 'chefflow_recipes_list',
    description: 'List recipes. Filter by category, cuisine, or search by name.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search by recipe name' },
        category: { type: 'string' },
        cuisine: { type: 'string' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_recipes_get',
    description: 'Get full recipe: ingredients with quantities, instructions, yield, cost, prep time.',
    inputSchema: {
      type: 'object',
      properties: { recipe_id: { type: 'string' } },
      required: ['recipe_id'],
    },
  },
  {
    name: 'chefflow_recipes_update',
    description: 'Update recipe fields: name, description, cuisine, times, servings, difficulty, method, tags, season, or archive it.',
    inputSchema: {
      type: 'object',
      properties: {
        recipe_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        cuisine: { type: 'string' },
        meal_type: { type: 'string' },
        prep_time_minutes: { type: 'number' },
        cook_time_minutes: { type: 'number' },
        servings: { type: 'number' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'] },
        method: { type: 'string' },
        method_detailed: { type: 'string' },
        notes: { type: 'string' },
        dietary_tags: { type: 'array', items: { type: 'string' } },
        occasion_tags: { type: 'array', items: { type: 'string' } },
        season: { type: 'string' },
        archived: { type: 'boolean' },
      },
      required: ['recipe_id'],
    },
  },

  // ── Staff ─────────────────────────────────────────────────────────────
  {
    name: 'chefflow_staff_list',
    description: 'List staff members. Filter by role (sous_chef, kitchen_assistant, service_staff, server, bartender, dishwasher, other) or search by name.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search by name' },
        role: { type: 'string', enum: ['sous_chef', 'kitchen_assistant', 'service_staff', 'server', 'bartender', 'dishwasher', 'other'] },
        active_only: { type: 'string', enum: ['true', 'false'], description: 'Default true' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },

  {
    name: 'chefflow_staff_get',
    description: 'Get full staff member details by ID: name, role, contact info, hourly rate, notes, and status.',
    inputSchema: {
      type: 'object',
      properties: { staff_id: { type: 'string', description: 'Staff member UUID' } },
      required: ['staff_id'],
    },
  },
  {
    name: 'chefflow_staff_create',
    description: 'Add a new staff member. Name and role required.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        role: { type: 'string', enum: ['sous_chef', 'kitchen_assistant', 'service_staff', 'server', 'bartender', 'dishwasher', 'other'] },
        phone: { type: 'string' },
        email: { type: 'string' },
        hourly_rate_cents: { type: 'number', description: 'Hourly rate in cents' },
        notes: { type: 'string' },
      },
      required: ['name', 'role'],
    },
  },
  {
    name: 'chefflow_staff_update',
    description: 'Update staff member fields. Pass only fields to change.',
    inputSchema: {
      type: 'object',
      properties: {
        staff_id: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string', enum: ['sous_chef', 'kitchen_assistant', 'service_staff', 'server', 'bartender', 'dishwasher', 'other'] },
        phone: { type: 'string' },
        email: { type: 'string' },
        hourly_rate_cents: { type: 'number' },
        notes: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
      required: ['staff_id'],
    },
  },
  {
    name: 'chefflow_staff_deactivate',
    description: 'Deactivate a staff member (soft delete). Revokes their active sessions.',
    inputSchema: {
      type: 'object',
      properties: { staff_id: { type: 'string' } },
      required: ['staff_id'],
    },
  },

  // ── Inventory ─────────────────────────────────────────────────────────
  {
    name: 'chefflow_inventory_list',
    description: 'List inventory stock levels. Or pass view=transactions to see raw inventory movements. Filter transactions by type (receive, event_deduction, waste, staff_meal) or ingredient name.',
    inputSchema: {
      type: 'object',
      properties: {
        view: { type: 'string', enum: ['summary', 'transactions'], description: 'Default: summary' },
        ingredient_name: { type: 'string', description: 'Search by ingredient name' },
        type: { type: 'string', description: 'Transaction type filter (only with view=transactions)' },
        event_id: { type: 'string', description: 'Filter transactions by event' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },

  {
    name: 'chefflow_inventory_create',
    description: 'Record an inventory transaction (receive, waste, event deduction, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        ingredient_name: { type: 'string' },
        ingredient_id: { type: 'string', description: 'Ingredient UUID (optional)' },
        transaction_type: { type: 'string', enum: ['receive', 'event_deduction', 'waste', 'staff_meal', 'transfer_out', 'transfer_in', 'audit_adjustment', 'return_from_event', 'return_to_vendor', 'manual_adjustment', 'opening_balance'] },
        quantity: { type: 'number' },
        unit: { type: 'string', description: 'e.g. lbs, oz, each, gal' },
        cost_cents: { type: 'number' },
        event_id: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['ingredient_name', 'transaction_type', 'quantity', 'unit'],
    },
  },
  {
    name: 'chefflow_inventory_update',
    description: 'Update an inventory transaction record.',
    inputSchema: {
      type: 'object',
      properties: {
        transaction_id: { type: 'string' },
        ingredient_name: { type: 'string' },
        quantity: { type: 'number' },
        unit: { type: 'string' },
        cost_cents: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['transaction_id'],
    },
  },
  {
    name: 'chefflow_inventory_delete',
    description: 'Permanently delete an inventory transaction.',
    inputSchema: {
      type: 'object',
      properties: { transaction_id: { type: 'string' } },
      required: ['transaction_id'],
    },
  },

  // ── Vendors ───────────────────────────────────────────────────────────
  {
    name: 'chefflow_vendors_list',
    description: 'List vendors/suppliers. Filter by type (grocery, butcher, seafood, produce, specialty, equipment, other), preferred status, or search by name.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search by vendor name' },
        vendor_type: { type: 'string', description: 'Filter by type' },
        is_preferred: { type: 'string', enum: ['true', 'false'], description: 'Filter preferred vendors' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_vendors_get',
    description: 'Get full vendor details by ID: name, type, contact info, minimum order, preferred status, notes.',
    inputSchema: {
      type: 'object',
      properties: { vendor_id: { type: 'string', description: 'Vendor UUID' } },
      required: ['vendor_id'],
    },
  },
  {
    name: 'chefflow_vendors_create',
    description: 'Create a new vendor/supplier. Only name is required.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        vendor_type: { type: 'string', description: 'grocery, butcher, seafood, produce, specialty, equipment, other' },
        contact_name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        website: { type: 'string' },
        category: { type: 'string' },
        minimum_order_cents: { type: 'number', description: 'Minimum order in cents' },
        notes: { type: 'string' },
        is_preferred: { type: 'boolean' },
      },
      required: ['name'],
    },
  },

  {
    name: 'chefflow_vendors_update',
    description: 'Update vendor fields. Pass only fields to change.',
    inputSchema: {
      type: 'object',
      properties: {
        vendor_id: { type: 'string' },
        name: { type: 'string' },
        vendor_type: { type: 'string' },
        contact_name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        website: { type: 'string' },
        category: { type: 'string' },
        minimum_order_cents: { type: 'number' },
        notes: { type: 'string' },
        is_preferred: { type: 'boolean' },
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
      required: ['vendor_id'],
    },
  },
  {
    name: 'chefflow_vendors_deactivate',
    description: 'Deactivate a vendor (soft delete).',
    inputSchema: {
      type: 'object',
      properties: { vendor_id: { type: 'string' } },
      required: ['vendor_id'],
    },
  },

  // ── Invoices ─────────────────────────────────────────────────────────
  {
    name: 'chefflow_invoices_list',
    description: 'List invoices (events with invoice numbers assigned). Filter by event status (confirmed, completed).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Event status filter' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_invoices_get',
    description: 'Get invoice details by event ID: invoice number, issue date, notes, client info, event details, and quoted price.',
    inputSchema: {
      type: 'object',
      properties: { event_id: { type: 'string', description: 'Event UUID (invoices are keyed by event)' } },
      required: ['event_id'],
    },
  },
  {
    name: 'chefflow_invoices_mark_paid',
    description: 'Mark an invoice as paid. Records a ledger entry. Requires amount and payment method. Idempotent (safe to call twice).',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Event UUID' },
        paid_amount_cents: { type: 'number', description: 'Amount paid in cents' },
        payment_method: { type: 'string', enum: ['cash', 'venmo', 'paypal', 'zelle', 'card', 'check'] },
        invoice_number: { type: 'string', description: 'Assign invoice number if not already set' },
      },
      required: ['event_id', 'paid_amount_cents', 'payment_method'],
    },
  },

  // ── Quick Notes ──────────────────────────────────────────────────────
  {
    name: 'chefflow_notes_list',
    description: 'List quick notes (voice memos, agent jottings, raw capture). Filter by status: raw (untriaged) or triaged.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['raw', 'triaged'], description: 'Default: raw' },
        limit: { type: 'number', description: 'Max 100, default 20' },
      },
    },
  },
  {
    name: 'chefflow_notes_create',
    description: 'Capture a quick note. Perfect for voice-to-text, agent observations, or anything that needs triage later. Max 1000 chars.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Note content (max 1000 chars)' },
      },
      required: ['text'],
    },
  },

  // ── Documents ────────────────────────────────────────────────────────
  {
    name: 'chefflow_documents_list',
    description: 'List event document snapshots (prep lists, grocery lists, execution sheets, etc.). Filter by event or document type.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Filter by event UUID' },
        type: { type: 'string', description: 'Document type: summary, grocery, foh, prep, execution, checklist, packing, reset, travel, shots, all' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_documents_generate',
    description: 'Generate a document for an event. PDF types (invoice, receipt, quote, contract) return binary. Operational types (summary, grocery, prep, execution, etc.) return snapshot status. Also accepts legacy aliases: menu->foh, prep_list->prep, grocery_list->grocery, timeline->execution.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Event UUID' },
        type: { type: 'string', description: 'Document type: invoice, receipt, quote, contract, summary, grocery, foh, prep, execution, checklist, packing, reset, travel, shots, all, menu, prep_list, grocery_list, timeline' },
      },
      required: ['event_id', 'type'],
    },
  },

  // ── Search ────────────────────────────────────────────────────────────
  {
    name: 'chefflow_search',
    description: 'Search across all ChefFlow data: events, clients, recipes, quotes. Returns mixed results. Use type param to restrict to one category.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search query (min 2 chars)' },
        type: { type: 'string', enum: ['events', 'clients', 'quotes', 'recipes'], description: 'Restrict to one category' },
        limit: { type: 'number', description: 'Max results per type (default 20, max 100)' },
      },
      required: ['q'],
    },
  },

  // ── Partners ──────────────────────────────────────────────────────────
  {
    name: 'chefflow_partners_list',
    description: 'List partners (venues, Airbnb hosts, platforms, co-hosts). Filter by type or status.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search by name' },
        type: { type: 'string', enum: ['airbnb_host', 'business', 'platform', 'individual', 'venue', 'other'] },
        status: { type: 'string', enum: ['active', 'inactive'] },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_partners_get',
    description: 'Get full partner details by ID.',
    inputSchema: {
      type: 'object',
      properties: { partner_id: { type: 'string' } },
      required: ['partner_id'],
    },
  },
  {
    name: 'chefflow_partners_create',
    description: 'Create a new partner. Name required.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        partner_type: { type: 'string', enum: ['airbnb_host', 'business', 'platform', 'individual', 'venue', 'other'], description: 'Default: individual' },
        contact_name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        website: { type: 'string' },
        description: { type: 'string' },
        notes: { type: 'string' },
        commission_notes: { type: 'string' },
        is_showcase_visible: { type: 'boolean' },
      },
      required: ['name'],
    },
  },
  {
    name: 'chefflow_partners_update',
    description: 'Update partner fields. Pass only fields to change.',
    inputSchema: {
      type: 'object',
      properties: {
        partner_id: { type: 'string' },
        name: { type: 'string' },
        partner_type: { type: 'string', enum: ['airbnb_host', 'business', 'platform', 'individual', 'venue', 'other'] },
        contact_name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        website: { type: 'string' },
        description: { type: 'string' },
        notes: { type: 'string' },
        commission_notes: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        is_showcase_visible: { type: 'boolean' },
      },
      required: ['partner_id'],
    },
  },
  {
    name: 'chefflow_partners_delete',
    description: 'Permanently delete a partner.',
    inputSchema: {
      type: 'object',
      properties: { partner_id: { type: 'string' } },
      required: ['partner_id'],
    },
  },

  // ── Goals ────────────────────────────────────────────────────────────
  {
    name: 'chefflow_goals_list',
    description: 'List business goals. Filter by status (active, paused, archived) or goal type.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'paused', 'archived'] },
        goal_type: { type: 'string', description: 'e.g. revenue_monthly, booking_count, new_clients, profit_margin' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_goals_get',
    description: 'Get full goal details by ID including progress and check-ins.',
    inputSchema: {
      type: 'object',
      properties: { goal_id: { type: 'string' } },
      required: ['goal_id'],
    },
  },
  {
    name: 'chefflow_goals_create',
    description: 'Create a business goal. Requires type, label, target, and period.',
    inputSchema: {
      type: 'object',
      properties: {
        goal_type: { type: 'string', description: 'e.g. revenue_monthly, booking_count, new_clients, profit_margin, dishes_created, repeat_booking_rate' },
        label: { type: 'string', description: 'Goal label, max 100 chars' },
        target_value: { type: 'number' },
        period_start: { type: 'string', description: 'YYYY-MM-DD' },
        period_end: { type: 'string', description: 'YYYY-MM-DD' },
        nudge_enabled: { type: 'boolean', description: 'Default true' },
        nudge_level: { type: 'string', enum: ['gentle', 'standard', 'aggressive'], description: 'Default standard' },
        notes: { type: 'string' },
      },
      required: ['goal_type', 'label', 'target_value', 'period_start', 'period_end'],
    },
  },
  {
    name: 'chefflow_goals_update',
    description: 'Update a goal. Can pause, archive, change target, or adjust period.',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string' },
        label: { type: 'string' },
        target_value: { type: 'number' },
        period_start: { type: 'string' },
        period_end: { type: 'string' },
        status: { type: 'string', enum: ['active', 'paused', 'archived'] },
        nudge_enabled: { type: 'boolean' },
        nudge_level: { type: 'string', enum: ['gentle', 'standard', 'aggressive'] },
        notes: { type: 'string' },
      },
      required: ['goal_id'],
    },
  },
  {
    name: 'chefflow_goals_delete',
    description: 'Archive a goal (soft delete).',
    inputSchema: {
      type: 'object',
      properties: { goal_id: { type: 'string' } },
      required: ['goal_id'],
    },
  },

  // ── Notifications ───────────────────────────────────────────────────
  {
    name: 'chefflow_notifications_create',
    description: 'Send a notification to chef or client. Requires title and body.',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Target client (for client notifications)' },
        recipient_role: { type: 'string', enum: ['chef', 'client'], description: 'Default: chef' },
        title: { type: 'string', description: 'Notification title' },
        body: { type: 'string', description: 'Notification body (max 2000 chars)' },
        category: { type: 'string', enum: ['booking', 'payment', 'system', 'reminder', 'ops', 'inquiry', 'marketing'], description: 'Default: system' },
        action: { type: 'string', description: 'Action label' },
        action_url: { type: 'string', description: 'URL when action clicked' },
        event_id: { type: 'string', description: 'Related event' },
      },
      required: ['title', 'body'],
    },
  },

  // ── Ledger ──────────────────────────────────────────────────────────
  {
    name: 'chefflow_ledger_list',
    description: 'Read-only financial ledger. Every payment, refund, and adjustment recorded immutably. Filter by event, type, or date range.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        type: { type: 'string', description: 'Entry type filter' },
        date_from: { type: 'string', description: 'ISO date' },
        date_to: { type: 'string', description: 'ISO date' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },

  // ── Settings ────────────────────────────────────────────────────────
  {
    name: 'chefflow_settings_preferences_get',
    description: 'Get chef preferences: home address, default prep/buffer times, target margins, dashboard widgets, enabled modules.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'chefflow_settings_preferences_update',
    description: 'Update chef preferences. Pass only fields to change.',
    inputSchema: {
      type: 'object',
      properties: {
        home_address: { type: 'string' },
        home_city: { type: 'string' },
        home_state: { type: 'string' },
        home_zip: { type: 'string' },
        default_buffer_minutes: { type: 'number', description: '0-120' },
        default_prep_hours: { type: 'number', description: '0.5-12' },
        default_shopping_minutes: { type: 'number', description: '15-240' },
        default_packing_minutes: { type: 'number', description: '10-120' },
        target_margin_percent: { type: 'number', description: '0-100' },
        target_monthly_revenue_cents: { type: 'number' },
        target_annual_revenue_cents: { type: 'number' },
        shop_day_before: { type: 'boolean' },
        enabled_modules: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'chefflow_settings_pricing_get',
    description: 'Get pricing configuration: per-person rates, weekly rates, deposit %, mileage, premiums, add-on catalog.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'chefflow_settings_pricing_update',
    description: 'Update pricing configuration. Pass only fields to change.',
    inputSchema: {
      type: 'object',
      properties: {
        couples_rate_3_course: { type: 'number' },
        couples_rate_4_course: { type: 'number' },
        couples_rate_5_course: { type: 'number' },
        group_rate_3_course: { type: 'number' },
        group_rate_4_course: { type: 'number' },
        group_rate_5_course: { type: 'number' },
        deposit_percentage: { type: 'number', description: '0-100' },
        minimum_booking_cents: { type: 'number' },
        mileage_rate_cents: { type: 'number' },
        weekend_premium_pct: { type: 'number' },
        weekend_premium_on: { type: 'boolean' },
      },
    },
  },
  {
    name: 'chefflow_settings_booking_get',
    description: 'Get booking page configuration: enabled, slug, headline, bio, min notice, pricing model, deposit settings.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'chefflow_settings_booking_update',
    description: 'Update booking page settings.',
    inputSchema: {
      type: 'object',
      properties: {
        booking_enabled: { type: 'boolean' },
        booking_slug: { type: 'string', description: 'URL slug (lowercase, hyphens, 3-50 chars)' },
        booking_headline: { type: 'string', description: 'Max 120 chars' },
        booking_bio_short: { type: 'string', description: 'Max 280 chars' },
        booking_min_notice_days: { type: 'number', description: '0-90' },
        booking_model: { type: 'string', enum: ['inquiry_first', 'instant_book'] },
        booking_base_price_cents: { type: 'number' },
        booking_pricing_type: { type: 'string', enum: ['flat_rate', 'per_person'] },
      },
    },
  },
  {
    name: 'chefflow_settings_modules_get',
    description: 'Get list of enabled feature modules.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'chefflow_settings_modules_update',
    description: 'Set which feature modules are enabled.',
    inputSchema: {
      type: 'object',
      properties: {
        enabled_modules: { type: 'array', items: { type: 'string' }, description: 'Module IDs to enable' },
      },
      required: ['enabled_modules'],
    },
  },
  {
    name: 'chefflow_settings_tax_rates_get',
    description: 'Get tax rate configuration. Pass state for resolved rate, or omit for all overrides.',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: '2-letter state code' },
      },
    },
  },

  // ── Remy Policies ──────────────────────────────────────────────────
  {
    name: 'chefflow_remy_policies_list',
    description: 'List Remy AI concierge approval policies. Controls what Remy can do autonomously vs needs chef approval.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_remy_policies_get',
    description: 'Get a single Remy policy by ID.',
    inputSchema: {
      type: 'object',
      properties: { policy_id: { type: 'string' } },
      required: ['policy_id'],
    },
  },
  {
    name: 'chefflow_remy_policies_create',
    description: 'Create a Remy approval policy. Defines whether Remy can allow, deny, or must ask for a specific task type.',
    inputSchema: {
      type: 'object',
      properties: {
        task_type: { type: 'string', description: 'Task category this policy controls' },
        decision: { type: 'string', enum: ['allow', 'deny', 'ask'] },
        reason: { type: 'string' },
        enabled: { type: 'boolean', description: 'Default true' },
      },
      required: ['task_type', 'decision'],
    },
  },
  {
    name: 'chefflow_remy_policies_update',
    description: 'Update a Remy policy.',
    inputSchema: {
      type: 'object',
      properties: {
        policy_id: { type: 'string' },
        task_type: { type: 'string' },
        decision: { type: 'string', enum: ['allow', 'deny', 'ask'] },
        reason: { type: 'string' },
        enabled: { type: 'boolean' },
      },
      required: ['policy_id'],
    },
  },
  {
    name: 'chefflow_remy_policies_delete',
    description: 'Delete a Remy policy.',
    inputSchema: {
      type: 'object',
      properties: { policy_id: { type: 'string' } },
      required: ['policy_id'],
    },
  },

  // ── Taxonomy ───────────────────────────────────────────────────────
  {
    name: 'chefflow_taxonomy_list',
    description: 'List taxonomy values for a category (occasion types, cuisine types, service styles, dietary tags, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Taxonomy category (required)' },
      },
      required: ['category'],
    },
  },
  {
    name: 'chefflow_taxonomy_create',
    description: 'Add a new taxonomy value to a category.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        value: { type: 'string' },
        display_label: { type: 'string' },
      },
      required: ['category', 'value', 'display_label'],
    },
  },

  // ── Safety ─────────────────────────────────────────────────────────
  {
    name: 'chefflow_safety_incidents_list',
    description: 'List safety incidents. Filter by status (open, in_progress, resolved), type (food_safety, guest_injury, property_damage, equipment_failure, near_miss), or event.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved'] },
        type: { type: 'string', enum: ['food_safety', 'guest_injury', 'property_damage', 'equipment_failure', 'near_miss', 'other'] },
        event_id: { type: 'string' },
        page: { type: 'number' },
        per_page: { type: 'number' },
      },
    },
  },
  {
    name: 'chefflow_safety_incidents_get',
    description: 'Get full incident details by ID.',
    inputSchema: {
      type: 'object',
      properties: { incident_id: { type: 'string' } },
      required: ['incident_id'],
    },
  },
  {
    name: 'chefflow_safety_incidents_create',
    description: 'Report a safety incident. Date, type, and description required.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        incident_date: { type: 'string', description: 'ISO date or datetime' },
        incident_type: { type: 'string', enum: ['food_safety', 'guest_injury', 'property_damage', 'equipment_failure', 'near_miss', 'other'] },
        description: { type: 'string' },
        parties_involved: { type: 'string' },
        immediate_action: { type: 'string' },
        resolution_status: { type: 'string', enum: ['open', 'in_progress', 'resolved'], description: 'Default: open' },
      },
      required: ['incident_date', 'incident_type', 'description'],
    },
  },
  {
    name: 'chefflow_safety_incidents_update',
    description: 'Update a safety incident. Change status, add details, update resolution.',
    inputSchema: {
      type: 'object',
      properties: {
        incident_id: { type: 'string' },
        incident_type: { type: 'string', enum: ['food_safety', 'guest_injury', 'property_damage', 'equipment_failure', 'near_miss', 'other'] },
        description: { type: 'string' },
        parties_involved: { type: 'string' },
        immediate_action: { type: 'string' },
        resolution_status: { type: 'string', enum: ['open', 'in_progress', 'resolved'] },
      },
      required: ['incident_id'],
    },
  },
  {
    name: 'chefflow_safety_backup_contacts',
    description: 'Get backup chef contacts for emergency delegation.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'chefflow_safety_recalls_list',
    description: 'Get active food safety recalls relevant to inventory.',
    inputSchema: { type: 'object', properties: {} },
  },

  // ── Queue ──────────────────────────────────────────────────────────
  {
    name: 'chefflow_queue',
    description: 'Action queue: pending inquiries, upcoming events needing prep, draft quotes, and events needing confirmation. The chef\'s to-do list.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max items per category, 1-100, default 50' },
      },
    },
  },

  // ── Compound Workflow Tools ───────────────────────────────────────────
  {
    name: 'chefflow_morning_briefing',
    description:
      'Morning briefing: upcoming confirmed events, open inquiries needing response, expiring/outstanding quotes, financial snapshot, and any stale leads. One call gives the full picture.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'chefflow_client_prep',
    description:
      'Prepare for a client interaction. Pass a client name or ID. Returns: client details, dietary/allergy info, all their events (past and upcoming), quotes, and notes. Everything you need before a call or meeting.',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Client UUID (if known)' },
        client_name: { type: 'string', description: 'Client name to search (if ID not known)' },
      },
    },
  },
  {
    name: 'chefflow_event_deep_dive',
    description:
      'Full event briefing. Returns: event details, client info, menu (if attached), quotes, expenses, and financial summary for the event. Everything about one event in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'Event UUID' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'chefflow_weekly_pipeline',
    description:
      'Inquiry-to-event conversion funnel. Shows new inquiries, awaiting response, quoted, and recently confirmed. Tracks pipeline health and bottlenecks.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'chefflow_event_profitability',
    description:
      'Profitability breakdown for a single event: quoted price, all expenses by category, payments received, tips, net profit, and margin percentage.',
    inputSchema: {
      type: 'object',
      properties: { event_id: { type: 'string', description: 'Event UUID' } },
      required: ['event_id'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function domainHelp(domain) {
  const groups = {
    events: TOOLS.filter((t) => t.name.startsWith('chefflow_events')),
    clients: TOOLS.filter((t) => t.name.startsWith('chefflow_clients')),
    menus: TOOLS.filter((t) => t.name.startsWith('chefflow_menus')),
    quotes: TOOLS.filter((t) => t.name.startsWith('chefflow_quotes')),
    finance: TOOLS.filter((t) => t.name.includes('finance') || t.name.includes('expenses')),
    invoices: TOOLS.filter((t) => t.name.startsWith('chefflow_invoices')),
    inquiries: TOOLS.filter((t) => t.name.includes('inquiries')),
    recipes: TOOLS.filter((t) => t.name.startsWith('chefflow_recipes')),
    staff: TOOLS.filter((t) => t.name.startsWith('chefflow_staff')),
    inventory: TOOLS.filter((t) => t.name.startsWith('chefflow_inventory')),
    vendors: TOOLS.filter((t) => t.name.startsWith('chefflow_vendors')),
    notes: TOOLS.filter((t) => t.name.startsWith('chefflow_notes')),
    documents: TOOLS.filter((t) => t.name.startsWith('chefflow_documents')),
    search: TOOLS.filter((t) => t.name === 'chefflow_search'),
    partners: TOOLS.filter((t) => t.name.startsWith('chefflow_partners')),
    goals: TOOLS.filter((t) => t.name.startsWith('chefflow_goals')),
    notifications: TOOLS.filter((t) => t.name.startsWith('chefflow_notifications')),
    ledger: TOOLS.filter((t) => t.name.startsWith('chefflow_ledger')),
    settings: TOOLS.filter((t) => t.name.startsWith('chefflow_settings')),
    remy: TOOLS.filter((t) => t.name.startsWith('chefflow_remy')),
    taxonomy: TOOLS.filter((t) => t.name.startsWith('chefflow_taxonomy')),
    safety: TOOLS.filter((t) => t.name.startsWith('chefflow_safety')),
    queue: TOOLS.filter((t) => t.name === 'chefflow_queue'),
    workflows: TOOLS.filter((t) => ['chefflow_morning_briefing', 'chefflow_client_prep', 'chefflow_event_deep_dive', 'chefflow_weekly_pipeline', 'chefflow_event_profitability'].includes(t.name)),
  };

  if (domain && groups[domain]) {
    return groups[domain].map((t) => `${t.name}: ${t.description}`).join('\n\n');
  }

  const domains = Object.keys(groups);
  let out = `ChefFlow MCP Server - ${TOOLS.length} tools across ${domains.length} domains\n\n`;
  out += `Domains: ${domains.join(', ')}\n\n`;
  out += TOOLS.map((t) => `- ${t.name}: ${t.description.split('.')[0]}`).join('\n');
  return out;
}

async function handleTool(name, args) {
  switch (name) {
    // ── Meta ──
    case 'chefflow_help':
      return domainHelp(args.domain);

    case 'chefflow_status': {
      const [events, clients, quotes, inquiries, finance] = await apiAll(
        api('GET', '/events', null, { status: 'confirmed', per_page: 10 }),
        api('GET', '/clients', null, { status: 'active', per_page: 1 }),
        api('GET', '/quotes', null, { per_page: 5 }),
        api('GET', '/inquiries', null, { per_page: 5 }),
        api('GET', '/financials/summary', null, {}),
      );

      return json({
        upcoming_events: events.data?.slice(0, 5) || [],
        total_confirmed_events: events.meta?.total || 0,
        total_active_clients: clients.meta?.total || 0,
        recent_quotes: quotes.data?.slice(0, 3) || [],
        total_quotes: quotes.meta?.total || 0,
        open_inquiries: inquiries.data?.slice(0, 3) || [],
        total_inquiries: inquiries.meta?.total || 0,
        financials: finance.data || finance.error || null,
      });
    }

    // ── Events ──
    case 'chefflow_events_list':
      return json(await api('GET', '/events', null, {
        status: args.status, client_id: args.client_id,
        date_from: args.date_from, date_to: args.date_to,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_events_get':
      return json(await api('GET', `/events/${args.event_id}`));

    case 'chefflow_events_create': {
      const { event_id: _eid, ...body } = args;
      return json(await api('POST', '/events', body));
    }

    case 'chefflow_events_update': {
      const { event_id, ...body } = args;
      return json(await api('PATCH', `/events/${event_id}`, body));
    }

    case 'chefflow_events_transition':
      return json(await api('POST', `/events/${args.event_id}/transition`, {
        to_status: args.to_status, reason: args.reason,
      }));

    case 'chefflow_events_clone':
      return json(await api('POST', `/events/${args.event_id}/clone`, {
        new_date: args.new_date, new_client_id: args.new_client_id,
      }));

    // ── Clients ──
    case 'chefflow_clients_list':
      return json(await api('GET', '/clients', null, {
        q: args.q, status: args.status, page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_clients_get':
      return json(await api('GET', `/clients/${args.client_id}`));

    case 'chefflow_clients_create':
      return json(await api('POST', '/clients', args));

    case 'chefflow_clients_update': {
      const { client_id, ...body } = args;
      return json(await api('PATCH', `/clients/${client_id}`, body));
    }

    // ── Menus ──
    case 'chefflow_menus_list':
      return json(await api('GET', '/menus', null, {
        event_id: args.event_id, page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_menus_get':
      return json(await api('GET', `/menus/${args.menu_id}`));

    case 'chefflow_menus_create':
      return json(await api('POST', '/menus', args));

    case 'chefflow_menus_update': {
      const { menu_id, ...body } = args;
      return json(await api('PATCH', `/menus/${menu_id}`, body));
    }

    case 'chefflow_menus_delete':
      return json(await api('DELETE', `/menus/${args.menu_id}`));

    case 'chefflow_menus_approve':
      return json(await api('POST', `/menus/${args.menu_id}/approve`));

    // ── Quotes ──
    case 'chefflow_quotes_list':
      return json(await api('GET', '/quotes', null, {
        status: args.status, event_id: args.event_id, client_id: args.client_id,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_quotes_get':
      return json(await api('GET', `/quotes/${args.quote_id}`));

    case 'chefflow_quotes_create': {
      const { quote_id: _qid, ...body } = args;
      return json(await api('POST', '/quotes', body));
    }

    case 'chefflow_quotes_update': {
      const { quote_id, ...body } = args;
      return json(await api('PATCH', `/quotes/${quote_id}`, body));
    }

    case 'chefflow_quotes_delete':
      return json(await api('DELETE', `/quotes/${args.quote_id}`));

    case 'chefflow_quotes_send':
      return json(await api('POST', `/quotes/${args.quote_id}/send`));

    case 'chefflow_quotes_accept':
      return json(await api('POST', `/quotes/${args.quote_id}/accept`));

    // ── Finance ──
    case 'chefflow_finance_summary':
      return json(await api('GET', '/financials/summary', null, { event_id: args.event_id }));

    case 'chefflow_expenses_list':
      return json(await api('GET', '/expenses', null, {
        event_id: args.event_id, category: args.category,
        date_from: args.date_from, date_to: args.date_to,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_expenses_create':
      return json(await api('POST', '/expenses', args));

    case 'chefflow_expenses_get':
      return json(await api('GET', `/expenses/${args.expense_id}`));

    case 'chefflow_expenses_update': {
      const { expense_id, ...body } = args;
      return json(await api('PATCH', `/expenses/${expense_id}`, body));
    }

    case 'chefflow_expenses_delete':
      return json(await api('DELETE', `/expenses/${args.expense_id}`));

    // ── Inquiries ──
    case 'chefflow_inquiries_list':
      return json(await api('GET', '/inquiries', null, {
        status: args.status, page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_inquiries_get':
      return json(await api('GET', `/inquiries/${args.inquiry_id}`));

    case 'chefflow_inquiries_update': {
      const { inquiry_id, ...body } = args;
      return json(await api('PATCH', `/inquiries/${inquiry_id}`, body));
    }

    case 'chefflow_inquiries_create':
      return json(await api('POST', '/inquiries', args));

    case 'chefflow_inquiries_delete':
      return json(await api('DELETE', `/inquiries/${args.inquiry_id}`));

    case 'chefflow_inquiries_convert':
      return json(await api('POST', `/inquiries/${args.inquiry_id}/convert`));

    // ── Recipes ──
    case 'chefflow_recipes_list':
      return json(await api('GET', '/recipes', null, {
        q: args.q, category: args.category, cuisine: args.cuisine,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_recipes_get':
      return json(await api('GET', `/recipes/${args.recipe_id}`));

    case 'chefflow_recipes_update': {
      const { recipe_id, ...body } = args;
      return json(await api('PATCH', `/recipes/${recipe_id}`, body));
    }

    // ── Staff ──
    case 'chefflow_staff_list':
      return json(await api('GET', '/staff', null, {
        q: args.q, role: args.role, active_only: args.active_only,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_staff_get':
      return json(await api('GET', `/staff/${args.staff_id}`));

    case 'chefflow_staff_create':
      return json(await api('POST', '/staff', args));

    case 'chefflow_staff_update': {
      const { staff_id, ...body } = args;
      return json(await api('PATCH', `/staff/${staff_id}`, body));
    }

    case 'chefflow_staff_deactivate':
      return json(await api('DELETE', `/staff/${args.staff_id}`));

    // ── Inventory ──
    case 'chefflow_inventory_list':
      return json(await api('GET', '/inventory', null, {
        view: args.view, ingredient_name: args.ingredient_name,
        type: args.type, event_id: args.event_id,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_inventory_create':
      return json(await api('POST', '/inventory', args));

    case 'chefflow_inventory_update': {
      const { transaction_id, ...body } = args;
      return json(await api('PATCH', `/inventory/${transaction_id}`, body));
    }

    case 'chefflow_inventory_delete':
      return json(await api('DELETE', `/inventory/${args.transaction_id}`));

    // ── Vendors ──
    case 'chefflow_vendors_list':
      return json(await api('GET', '/vendors', null, {
        q: args.q, vendor_type: args.vendor_type, is_preferred: args.is_preferred,
        status: args.status, page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_vendors_get':
      return json(await api('GET', `/vendors/${args.vendor_id}`));

    case 'chefflow_vendors_create':
      return json(await api('POST', '/vendors', args));

    case 'chefflow_vendors_update': {
      const { vendor_id, ...body } = args;
      return json(await api('PATCH', `/vendors/${vendor_id}`, body));
    }

    case 'chefflow_vendors_deactivate':
      return json(await api('DELETE', `/vendors/${args.vendor_id}`));

    // ── Invoices ──
    case 'chefflow_invoices_list':
      return json(await api('GET', '/invoices', null, {
        status: args.status, page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_invoices_get':
      return json(await api('GET', `/invoices/${args.event_id}`));

    case 'chefflow_invoices_mark_paid':
      return json(await api('PATCH', `/invoices/${args.event_id}`, {
        mark_paid: true,
        paid_amount_cents: args.paid_amount_cents,
        payment_method: args.payment_method,
        invoice_number: args.invoice_number,
      }));

    // ── Quick Notes ──
    case 'chefflow_notes_list':
      return json(await api('GET', '/quick-notes', null, {
        status: args.status || 'raw', limit: args.limit,
      }));

    case 'chefflow_notes_create':
      return json(await api('POST', '/quick-notes', { text: args.text }));

    // ── Documents ──
    case 'chefflow_documents_list':
      return json(await api('GET', '/documents', null, {
        event_id: args.event_id, type: args.type,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_documents_generate':
      return json(await api('POST', '/documents/generate', {
        event_id: args.event_id, type: args.type,
      }));

    // ── Search ──
    case 'chefflow_search':
      return json(await api('GET', '/search', null, {
        q: args.q, type: args.type, limit: args.limit,
      }));

    // ── Compound Workflows ──
    case 'chefflow_morning_briefing': {
      const today = new Date().toISOString().split('T')[0];
      const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const [confirmed, drafts, inquiries, quotes, finance] = await apiAll(
        api('GET', '/events', null, { status: 'confirmed', date_from: today, date_to: weekOut, per_page: 20 }),
        api('GET', '/events', null, { status: 'draft', per_page: 5 }),
        api('GET', '/inquiries', null, { status: 'new', per_page: 10 }),
        api('GET', '/quotes', null, { status: 'sent', per_page: 10 }),
        api('GET', '/financials/summary', null, {}),
      );

      return json({
        date: today,
        this_week_events: confirmed.data || [],
        draft_events_needing_action: drafts.data || [],
        new_inquiries: inquiries.data || [],
        outstanding_quotes: quotes.data || [],
        financials: finance.data || null,
        summary: {
          events_this_week: confirmed.meta?.total || 0,
          drafts_pending: drafts.meta?.total || 0,
          inquiries_awaiting: inquiries.meta?.total || 0,
          quotes_outstanding: quotes.meta?.total || 0,
        },
      });
    }

    case 'chefflow_client_prep': {
      // Resolve client ID from name if needed
      let clientId = args.client_id;
      let clientSearch = null;

      if (!clientId && args.client_name) {
        clientSearch = await api('GET', '/clients', null, { q: args.client_name, per_page: 5 });
        if (clientSearch.data?.length === 1) {
          clientId = clientSearch.data[0].id;
        } else if (clientSearch.data?.length > 1) {
          return json({
            message: `Multiple clients match "${args.client_name}". Pick one:`,
            matches: clientSearch.data.map((c) => ({ id: c.id, name: c.full_name, email: c.email })),
          });
        } else {
          return json({ message: `No client found matching "${args.client_name}"` });
        }
      }

      if (!clientId) return json({ error: 'Provide client_id or client_name' });

      const [client, events, quotes] = await apiAll(
        api('GET', `/clients/${clientId}`),
        api('GET', '/events', null, { client_id: clientId, per_page: 50 }),
        api('GET', '/quotes', null, { client_id: clientId, per_page: 20 }),
      );

      return json({
        client: client.data || client,
        events: events.data || [],
        events_total: events.meta?.total || 0,
        quotes: quotes.data || [],
        quotes_total: quotes.meta?.total || 0,
      });
    }

    case 'chefflow_event_deep_dive': {
      const [event, menus, quotes, expenses, finance] = await apiAll(
        api('GET', `/events/${args.event_id}`),
        api('GET', '/menus', null, { event_id: args.event_id, per_page: 10 }),
        api('GET', '/quotes', null, { event_id: args.event_id, per_page: 10 }),
        api('GET', '/expenses', null, { event_id: args.event_id, per_page: 50 }),
        api('GET', '/financials/summary', null, { event_id: args.event_id }),
      );

      return json({
        event: event.data || event,
        menus: menus.data || [],
        quotes: quotes.data || [],
        expenses: expenses.data || [],
        financials: finance.data || null,
      });
    }

    case 'chefflow_weekly_pipeline': {
      const [newInq, awaiting, quoted, confirmed] = await apiAll(
        api('GET', '/inquiries', null, { status: 'new', per_page: 20 }),
        api('GET', '/inquiries', null, { status: 'awaiting_client', per_page: 20 }),
        api('GET', '/inquiries', null, { status: 'quoted', per_page: 20 }),
        api('GET', '/inquiries', null, { status: 'confirmed', per_page: 10 }),
      );

      return json({
        pipeline: {
          new_inquiries: { count: newInq.meta?.total || 0, items: newInq.data || [] },
          awaiting_response: { count: awaiting.meta?.total || 0, items: awaiting.data || [] },
          quoted: { count: quoted.meta?.total || 0, items: quoted.data || [] },
          recently_confirmed: { count: confirmed.meta?.total || 0, items: confirmed.data || [] },
        },
        funnel_total: (newInq.meta?.total || 0) + (awaiting.meta?.total || 0) + (quoted.meta?.total || 0),
      });
    }

    case 'chefflow_event_profitability': {
      const [event, quotes, expenses, finance, ledger] = await apiAll(
        api('GET', `/events/${args.event_id}`),
        api('GET', '/quotes', null, { event_id: args.event_id, per_page: 10 }),
        api('GET', '/expenses', null, { event_id: args.event_id, per_page: 100 }),
        api('GET', '/financials/summary', null, { event_id: args.event_id }),
        api('GET', '/ledger', null, { event_id: args.event_id, per_page: 100 }),
      );

      const expensesByCategory = {};
      for (const exp of expenses.data || []) {
        const cat = exp.category || 'uncategorized';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (exp.amount_cents || 0);
      }

      return json({
        event_name: event.data?.occasion || event.data?.id,
        event_date: event.data?.event_date,
        client: event.data?.client_name || event.data?.client_id,
        guest_count: event.data?.guest_count,
        quoted_total_cents: quotes.data?.[0]?.total_quoted_cents || null,
        expenses_total_cents: Object.values(expensesByCategory).reduce((a, b) => a + b, 0),
        expenses_by_category: expensesByCategory,
        financials: finance.data || null,
        ledger_entries: ledger.data || [],
      });
    }

    // ── Partners ──
    case 'chefflow_partners_list':
      return json(await api('GET', '/partners', null, {
        q: args.q, type: args.type, status: args.status,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_partners_get':
      return json(await api('GET', `/partners/${args.partner_id}`));

    case 'chefflow_partners_create':
      return json(await api('POST', '/partners', args));

    case 'chefflow_partners_update': {
      const { partner_id, ...body } = args;
      return json(await api('PATCH', `/partners/${partner_id}`, body));
    }

    case 'chefflow_partners_delete':
      return json(await api('DELETE', `/partners/${args.partner_id}`));

    // ── Goals ──
    case 'chefflow_goals_list':
      return json(await api('GET', '/goals', null, {
        status: args.status, goal_type: args.goal_type,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_goals_get':
      return json(await api('GET', `/goals/${args.goal_id}`));

    case 'chefflow_goals_create':
      return json(await api('POST', '/goals', args));

    case 'chefflow_goals_update': {
      const { goal_id, ...body } = args;
      return json(await api('PATCH', `/goals/${goal_id}`, body));
    }

    case 'chefflow_goals_delete':
      return json(await api('DELETE', `/goals/${args.goal_id}`));

    // ── Notifications ──
    case 'chefflow_notifications_create':
      return json(await api('POST', '/notifications', args));

    // ── Ledger ──
    case 'chefflow_ledger_list':
      return json(await api('GET', '/ledger', null, {
        event_id: args.event_id, type: args.type,
        date_from: args.date_from, date_to: args.date_to,
        page: args.page, per_page: args.per_page,
      }));

    // ── Settings ──
    case 'chefflow_settings_preferences_get':
      return json(await api('GET', '/settings/preferences'));

    case 'chefflow_settings_preferences_update':
      return json(await api('PATCH', '/settings/preferences', args));

    case 'chefflow_settings_pricing_get':
      return json(await api('GET', '/settings/pricing'));

    case 'chefflow_settings_pricing_update':
      return json(await api('PATCH', '/settings/pricing', args));

    case 'chefflow_settings_booking_get':
      return json(await api('GET', '/settings/booking'));

    case 'chefflow_settings_booking_update':
      return json(await api('PATCH', '/settings/booking', args));

    case 'chefflow_settings_modules_get':
      return json(await api('GET', '/settings/modules'));

    case 'chefflow_settings_modules_update':
      return json(await api('PATCH', '/settings/modules', args));

    case 'chefflow_settings_tax_rates_get':
      return json(await api('GET', '/settings/tax-rates', null, { state: args.state }));

    // ── Remy Policies ──
    case 'chefflow_remy_policies_list':
      return json(await api('GET', '/remy/policies', null, {
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_remy_policies_get':
      return json(await api('GET', `/remy/policies/${args.policy_id}`));

    case 'chefflow_remy_policies_create':
      return json(await api('POST', '/remy/policies', args));

    case 'chefflow_remy_policies_update': {
      const { policy_id, ...body } = args;
      return json(await api('PATCH', `/remy/policies/${policy_id}`, body));
    }

    case 'chefflow_remy_policies_delete':
      return json(await api('DELETE', `/remy/policies/${args.policy_id}`));

    // ── Taxonomy ──
    case 'chefflow_taxonomy_list':
      return json(await api('GET', '/taxonomy', null, { category: args.category }));

    case 'chefflow_taxonomy_create':
      return json(await api('POST', '/taxonomy', args));

    // ── Safety ──
    case 'chefflow_safety_incidents_list':
      return json(await api('GET', '/safety/incidents', null, {
        status: args.status, type: args.type, event_id: args.event_id,
        page: args.page, per_page: args.per_page,
      }));

    case 'chefflow_safety_incidents_get':
      return json(await api('GET', `/safety/incidents/${args.incident_id}`));

    case 'chefflow_safety_incidents_create':
      return json(await api('POST', '/safety/incidents', args));

    case 'chefflow_safety_incidents_update': {
      const { incident_id, ...body } = args;
      return json(await api('PATCH', `/safety/incidents/${incident_id}`, body));
    }

    case 'chefflow_safety_backup_contacts':
      return json(await api('GET', '/safety/backup-contacts'));

    case 'chefflow_safety_recalls_list':
      return json(await api('GET', '/safety/recalls'));

    // ── Queue ──
    case 'chefflow_queue':
      return json(await api('GET', '/queue', null, { limit: args.limit }));

    default:
      return `Unknown tool: ${name}. Call chefflow_help to see available tools.`;
  }
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'chefflow', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleTool(name, args || {});
    return {
      content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  if (!API_KEY) {
    console.error(
      '[chefflow-mcp] WARNING: CHEFFLOW_API_KEY not set. All API calls will return 401.\n' +
        'Generate a key: node scripts/generate-mcp-api-key.mjs'
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[chefflow-mcp] Fatal:', err);
  process.exit(1);
});
