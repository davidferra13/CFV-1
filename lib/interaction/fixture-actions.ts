'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { FixtureScenario, FixtureSet, FixtureData, FixtureTemplate } from './fixture-types'

// ---------------------------------------------------------------------------
// 1. Get fixture templates (pure, no DB)
// ---------------------------------------------------------------------------

export async function getFixtureTemplates(): Promise<FixtureTemplate[]> {
  await requireChef()

  return [
    {
      scenario: 'new_chef',
      name: 'New Chef Onboarding',
      description:
        'Fresh account with zero history, ideal for testing empty states and onboarding flows',
      eventCount: 0,
      clientCount: 0,
      menuCount: 0,
      recipeCount: 0,
    },
    {
      scenario: 'busy_week',
      name: 'Busy Week',
      description:
        'A packed week with 5 events across 4 clients, multiple menus, and overlapping prep schedules',
      eventCount: 5,
      clientCount: 4,
      menuCount: 5,
      recipeCount: 12,
    },
    {
      scenario: 'first_event',
      name: 'First Event',
      description: 'Single upcoming event with one new client, one menu, and a handful of recipes',
      eventCount: 1,
      clientCount: 1,
      menuCount: 1,
      recipeCount: 4,
    },
    {
      scenario: 'returning_client',
      name: 'Returning Client',
      description: 'Long-term client with 3 past events, repeat menus, and established preferences',
      eventCount: 3,
      clientCount: 1,
      menuCount: 3,
      recipeCount: 8,
    },
    {
      scenario: 'multi_event',
      name: 'Multi-Event Weekend',
      description: 'Back-to-back events across a weekend with shared and unique menus',
      eventCount: 4,
      clientCount: 3,
      menuCount: 4,
      recipeCount: 10,
    },
    {
      scenario: 'overdue_payments',
      name: 'Overdue Payments',
      description:
        'Several completed events with unpaid invoices and pending quotes needing follow-up',
      eventCount: 3,
      clientCount: 3,
      menuCount: 3,
      recipeCount: 6,
    },
    {
      scenario: 'empty_state',
      name: 'Empty State',
      description: 'Completely blank slate with no data at all, for testing zero-data UI states',
      eventCount: 0,
      clientCount: 0,
      menuCount: 0,
      recipeCount: 0,
    },
  ]
}

// ---------------------------------------------------------------------------
// 2. Generate fixture data for a scenario (no persistence)
// ---------------------------------------------------------------------------

export async function generateFixture(scenario: FixtureScenario): Promise<FixtureData> {
  await requireChef()

  const generators: Record<FixtureScenario, () => FixtureData> = {
    new_chef: generateNewChef,
    busy_week: generateBusyWeek,
    first_event: generateFirstEvent,
    returning_client: generateReturningClient,
    multi_event: generateMultiEvent,
    overdue_payments: generateOverduePayments,
    empty_state: generateEmptyState,
  }

  const gen = generators[scenario]
  if (!gen) throw new Error(`Unknown fixture scenario: ${scenario}`)

  return gen()
}

// ---------------------------------------------------------------------------
// 3. List saved fixture sets
// ---------------------------------------------------------------------------

export async function getSavedFixtures(): Promise<FixtureSet[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('fixture_sets')
    .select('*')
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load fixtures: ${error.message}`)

  return (data ?? []).map(mapRow)
}

// ---------------------------------------------------------------------------
// 4. Save a fixture set
// ---------------------------------------------------------------------------

export async function saveFixture(
  name: string,
  scenario: FixtureScenario,
  data: FixtureData
): Promise<FixtureSet> {
  const user = await requireChef()
  const db: any = createServerClient()

  const template = (await getFixtureTemplates()).find((t) => t.scenario === scenario)

  const { data: row, error } = await db
    .from('fixture_sets')
    .insert({
      tenant_id: user.id,
      scenario,
      name,
      description: template?.description ?? '',
      data,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to save fixture: ${error.message}`)

  return mapRow(row)
}

// ---------------------------------------------------------------------------
// 5. Delete a fixture set
// ---------------------------------------------------------------------------

export async function deleteFixture(fixtureId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('fixture_sets')
    .delete()
    .eq('id', fixtureId)
    .eq('tenant_id', user.id)

  if (error) throw new Error(`Failed to delete fixture: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): FixtureSet {
  return {
    id: row.id as string,
    scenario: row.scenario as FixtureScenario,
    name: row.name as string,
    description: (row.description as string) ?? '',
    data: (row.data as FixtureData) ?? {
      events: [],
      clients: [],
      menus: [],
      recipes: [],
      invoices: [],
      quotes: [],
    },
    createdAt: row.created_at as string,
  }
}

// ---------------------------------------------------------------------------
// Scenario generators
// ---------------------------------------------------------------------------

function fakeId(prefix: string, n: number): string {
  return `${prefix}-fixture-${String(n).padStart(3, '0')}`
}

function generateEmptyState(): FixtureData {
  return { events: [], clients: [], menus: [], recipes: [], invoices: [], quotes: [] }
}

function generateNewChef(): FixtureData {
  return { events: [], clients: [], menus: [], recipes: [], invoices: [], quotes: [] }
}

function generateFirstEvent(): FixtureData {
  const clientId = fakeId('cli', 1)
  const eventId = fakeId('evt', 1)
  const menuId = fakeId('mnu', 1)

  return {
    clients: [
      {
        id: clientId,
        name: 'Sarah Mitchell',
        email: 'sarah@example.com',
        phone: '555-0101',
        notes: 'First-time client, anniversary dinner',
      },
    ],
    events: [
      {
        id: eventId,
        clientId,
        menuId,
        title: 'Anniversary Dinner',
        guestCount: 8,
        status: 'confirmed',
        date: futureDate(7),
        location: 'Client home',
      },
    ],
    menus: [
      {
        id: menuId,
        eventId,
        name: 'Anniversary Tasting Menu',
        courses: 4,
        items: ['Seared scallops', 'Burrata salad', 'Braised short rib', 'Chocolate fondant'],
      },
    ],
    recipes: [
      {
        id: fakeId('rcp', 1),
        name: 'Seared Scallops with Citrus Beurre Blanc',
        servings: 8,
        prepTime: 20,
        cookTime: 10,
      },
      {
        id: fakeId('rcp', 2),
        name: 'Burrata Salad with Stone Fruit',
        servings: 8,
        prepTime: 15,
        cookTime: 0,
      },
      { id: fakeId('rcp', 3), name: 'Braised Short Rib', servings: 8, prepTime: 30, cookTime: 180 },
      { id: fakeId('rcp', 4), name: 'Chocolate Fondant', servings: 8, prepTime: 25, cookTime: 14 },
    ],
    invoices: [],
    quotes: [
      {
        id: fakeId('qot', 1),
        eventId,
        clientId,
        total: 1200,
        status: 'sent',
        items: [{ description: 'Private dinner for 8', amount: 1200 }],
      },
    ],
  }
}

function generateReturningClient(): FixtureData {
  const clientId = fakeId('cli', 1)

  return {
    clients: [
      {
        id: clientId,
        name: 'James & Linda Park',
        email: 'jpark@example.com',
        phone: '555-0202',
        notes: 'Regular monthly dinner, prefer Mediterranean, no shellfish',
      },
    ],
    events: [
      {
        id: fakeId('evt', 1),
        clientId,
        title: 'Monthly Dinner - March',
        guestCount: 6,
        status: 'completed',
        date: pastDate(60),
        location: 'Client home',
      },
      {
        id: fakeId('evt', 2),
        clientId,
        title: 'Monthly Dinner - April',
        guestCount: 6,
        status: 'completed',
        date: pastDate(30),
        location: 'Client home',
      },
      {
        id: fakeId('evt', 3),
        clientId,
        title: 'Monthly Dinner - May',
        guestCount: 8,
        status: 'confirmed',
        date: futureDate(10),
        location: 'Client home',
      },
    ],
    menus: [
      {
        id: fakeId('mnu', 1),
        name: 'Mediterranean Spring',
        courses: 3,
        items: ['Hummus trio', 'Lamb kofta', 'Baklava'],
      },
      {
        id: fakeId('mnu', 2),
        name: 'Coastal Italian',
        courses: 4,
        items: ['Bruschetta', 'Risotto', 'Branzino', 'Panna cotta'],
      },
      {
        id: fakeId('mnu', 3),
        name: 'Levantine Summer',
        courses: 4,
        items: ['Fattoush', 'Falafel platter', 'Chicken shawarma', 'Knafeh'],
      },
    ],
    recipes: [
      { id: fakeId('rcp', 1), name: 'Hummus Trio', servings: 6, prepTime: 30, cookTime: 0 },
      {
        id: fakeId('rcp', 2),
        name: 'Lamb Kofta with Tzatziki',
        servings: 6,
        prepTime: 20,
        cookTime: 15,
      },
      {
        id: fakeId('rcp', 3),
        name: 'Risotto alla Milanese',
        servings: 6,
        prepTime: 10,
        cookTime: 25,
      },
      {
        id: fakeId('rcp', 4),
        name: 'Pan-roasted Branzino',
        servings: 6,
        prepTime: 15,
        cookTime: 12,
      },
      { id: fakeId('rcp', 5), name: 'Panna Cotta', servings: 6, prepTime: 15, cookTime: 5 },
      { id: fakeId('rcp', 6), name: 'Fattoush Salad', servings: 8, prepTime: 20, cookTime: 0 },
      { id: fakeId('rcp', 7), name: 'Chicken Shawarma', servings: 8, prepTime: 30, cookTime: 20 },
      { id: fakeId('rcp', 8), name: 'Knafeh', servings: 8, prepTime: 25, cookTime: 30 },
    ],
    invoices: [
      {
        id: fakeId('inv', 1),
        eventId: fakeId('evt', 1),
        clientId,
        total: 900,
        status: 'paid',
        paidAt: pastDate(55),
      },
      {
        id: fakeId('inv', 2),
        eventId: fakeId('evt', 2),
        clientId,
        total: 950,
        status: 'paid',
        paidAt: pastDate(25),
      },
    ],
    quotes: [
      {
        id: fakeId('qot', 1),
        eventId: fakeId('evt', 3),
        clientId,
        total: 1100,
        status: 'accepted',
      },
    ],
  }
}

function generateBusyWeek(): FixtureData {
  const clients = [
    {
      id: fakeId('cli', 1),
      name: 'Thompson Family',
      email: 'thompson@example.com',
      phone: '555-0301',
    },
    {
      id: fakeId('cli', 2),
      name: 'Rivera Wedding',
      email: 'arivera@example.com',
      phone: '555-0302',
    },
    {
      id: fakeId('cli', 3),
      name: 'Chen Corporate',
      email: 'chen@corp.example.com',
      phone: '555-0303',
    },
    {
      id: fakeId('cli', 4),
      name: 'Patel Birthday',
      email: 'dpatel@example.com',
      phone: '555-0304',
    },
  ]

  const events = [
    {
      id: fakeId('evt', 1),
      clientId: clients[0].id,
      title: 'Family Sunday Brunch',
      guestCount: 12,
      status: 'confirmed',
      date: futureDate(2),
    },
    {
      id: fakeId('evt', 2),
      clientId: clients[1].id,
      title: 'Wedding Tasting',
      guestCount: 4,
      status: 'confirmed',
      date: futureDate(3),
    },
    {
      id: fakeId('evt', 3),
      clientId: clients[2].id,
      title: 'Corporate Lunch',
      guestCount: 30,
      status: 'confirmed',
      date: futureDate(4),
    },
    {
      id: fakeId('evt', 4),
      clientId: clients[3].id,
      title: 'Birthday Dinner',
      guestCount: 16,
      status: 'confirmed',
      date: futureDate(5),
    },
    {
      id: fakeId('evt', 5),
      clientId: clients[0].id,
      title: 'Weeknight Dinner',
      guestCount: 6,
      status: 'pending',
      date: futureDate(6),
    },
  ]

  const menus = [
    {
      id: fakeId('mnu', 1),
      name: 'Brunch Spread',
      courses: 3,
      items: ['Eggs Benedict', 'French toast', 'Fruit platter'],
    },
    {
      id: fakeId('mnu', 2),
      name: 'Wedding Tasting Menu',
      courses: 5,
      items: ['Canapes', 'Soup', 'Fish', 'Meat', 'Dessert'],
    },
    {
      id: fakeId('mnu', 3),
      name: 'Corporate Buffet',
      courses: 2,
      items: ['Sandwich platter', 'Salad bar', 'Cookies'],
    },
    {
      id: fakeId('mnu', 4),
      name: 'Birthday Feast',
      courses: 4,
      items: ['Mezze', 'Pasta', 'Roast chicken', 'Cake'],
    },
    {
      id: fakeId('mnu', 5),
      name: 'Simple Weeknight',
      courses: 2,
      items: ['Salad', 'Grilled salmon'],
    },
  ]

  const recipes = Array.from({ length: 12 }, (_, i) => ({
    id: fakeId('rcp', i + 1),
    name: [
      'Eggs Benedict',
      'French Toast',
      'Canapes Trio',
      'Butternut Squash Soup',
      'Pan-seared Halibut',
      'Filet Mignon',
      'Tiramisu',
      'Sandwich Platter',
      'Roast Chicken',
      'Chocolate Layer Cake',
      'Grilled Salmon',
      'Caesar Salad',
    ][i],
    servings: [12, 12, 4, 4, 4, 4, 4, 30, 16, 16, 6, 6][i],
    prepTime: [20, 15, 45, 20, 15, 10, 30, 25, 20, 40, 10, 15][i],
    cookTime: [10, 8, 0, 30, 12, 15, 0, 0, 60, 35, 12, 0][i],
  }))

  return {
    clients,
    events,
    menus,
    recipes,
    invoices: [
      {
        id: fakeId('inv', 1),
        eventId: events[2].id,
        clientId: clients[2].id,
        total: 2800,
        status: 'sent',
      },
    ],
    quotes: [
      {
        id: fakeId('qot', 1),
        eventId: events[0].id,
        clientId: clients[0].id,
        total: 1500,
        status: 'accepted',
      },
      {
        id: fakeId('qot', 2),
        eventId: events[1].id,
        clientId: clients[1].id,
        total: 600,
        status: 'sent',
      },
      {
        id: fakeId('qot', 3),
        eventId: events[3].id,
        clientId: clients[3].id,
        total: 2200,
        status: 'accepted',
      },
      {
        id: fakeId('qot', 4),
        eventId: events[4].id,
        clientId: clients[0].id,
        total: 450,
        status: 'draft',
      },
    ],
  }
}

function generateMultiEvent(): FixtureData {
  const clients = [
    {
      id: fakeId('cli', 1),
      name: 'Harbor Yacht Club',
      email: 'events@harbor.example.com',
      phone: '555-0401',
    },
    {
      id: fakeId('cli', 2),
      name: 'Nguyen Anniversary',
      email: 'nguyen@example.com',
      phone: '555-0402',
    },
    {
      id: fakeId('cli', 3),
      name: 'Davis Graduation',
      email: 'bdavis@example.com',
      phone: '555-0403',
    },
  ]

  return {
    clients,
    events: [
      {
        id: fakeId('evt', 1),
        clientId: clients[0].id,
        title: 'Friday Cocktail Reception',
        guestCount: 50,
        status: 'confirmed',
        date: futureDate(3),
      },
      {
        id: fakeId('evt', 2),
        clientId: clients[1].id,
        title: 'Saturday Anniversary Dinner',
        guestCount: 20,
        status: 'confirmed',
        date: futureDate(4),
      },
      {
        id: fakeId('evt', 3),
        clientId: clients[0].id,
        title: 'Saturday Brunch',
        guestCount: 40,
        status: 'confirmed',
        date: futureDate(4),
      },
      {
        id: fakeId('evt', 4),
        clientId: clients[2].id,
        title: 'Sunday Graduation Party',
        guestCount: 35,
        status: 'pending',
        date: futureDate(5),
      },
    ],
    menus: [
      {
        id: fakeId('mnu', 1),
        name: 'Cocktail Bites',
        courses: 1,
        items: ['Shrimp skewers', 'Bruschetta', 'Mini quiche', 'Crostini'],
      },
      {
        id: fakeId('mnu', 2),
        name: 'Anniversary Prix Fixe',
        courses: 5,
        items: ['Amuse-bouche', 'Ceviche', 'Risotto', 'Duck breast', 'Creme brulee'],
      },
      {
        id: fakeId('mnu', 3),
        name: 'Garden Brunch',
        courses: 3,
        items: ['Yogurt parfaits', 'Quiche Lorraine', 'Smoked salmon board'],
      },
      {
        id: fakeId('mnu', 4),
        name: 'Grad Party Cookout',
        courses: 2,
        items: ['Burger bar', 'BBQ chicken', 'Coleslaw', 'Brownies'],
      },
    ],
    recipes: Array.from({ length: 10 }, (_, i) => ({
      id: fakeId('rcp', i + 1),
      name: [
        'Shrimp Skewers',
        'Mini Quiche',
        'Ceviche',
        'Duck Breast',
        'Creme Brulee',
        'Quiche Lorraine',
        'Smoked Salmon Board',
        'BBQ Chicken',
        'Classic Coleslaw',
        'Fudge Brownies',
      ][i],
      servings: [50, 50, 20, 20, 20, 40, 40, 35, 35, 35][i],
      prepTime: [20, 30, 25, 15, 20, 25, 15, 15, 10, 15][i],
      cookTime: [8, 20, 0, 14, 5, 35, 0, 40, 0, 25][i],
    })),
    invoices: [],
    quotes: [
      {
        id: fakeId('qot', 1),
        eventId: fakeId('evt', 1),
        clientId: clients[0].id,
        total: 3500,
        status: 'accepted',
      },
      {
        id: fakeId('qot', 2),
        eventId: fakeId('evt', 2),
        clientId: clients[1].id,
        total: 2800,
        status: 'accepted',
      },
      {
        id: fakeId('qot', 3),
        eventId: fakeId('evt', 3),
        clientId: clients[0].id,
        total: 2400,
        status: 'sent',
      },
      {
        id: fakeId('qot', 4),
        eventId: fakeId('evt', 4),
        clientId: clients[2].id,
        total: 1800,
        status: 'draft',
      },
    ],
  }
}

function generateOverduePayments(): FixtureData {
  const clients = [
    {
      id: fakeId('cli', 1),
      name: 'Morgan Estate',
      email: 'morgan@example.com',
      phone: '555-0501',
      notes: 'Historically slow payer',
    },
    {
      id: fakeId('cli', 2),
      name: 'Blackwell Corp',
      email: 'ap@blackwell.example.com',
      phone: '555-0502',
      notes: 'Net-30 terms',
    },
    {
      id: fakeId('cli', 3),
      name: 'Simmons Wedding',
      email: 'rsimmons@example.com',
      phone: '555-0503',
    },
  ]

  return {
    clients,
    events: [
      {
        id: fakeId('evt', 1),
        clientId: clients[0].id,
        title: 'Garden Party',
        guestCount: 25,
        status: 'completed',
        date: pastDate(45),
      },
      {
        id: fakeId('evt', 2),
        clientId: clients[1].id,
        title: 'Board Luncheon',
        guestCount: 14,
        status: 'completed',
        date: pastDate(35),
      },
      {
        id: fakeId('evt', 3),
        clientId: clients[2].id,
        title: 'Rehearsal Dinner',
        guestCount: 30,
        status: 'completed',
        date: pastDate(20),
      },
    ],
    menus: [
      {
        id: fakeId('mnu', 1),
        name: 'Garden Party Menu',
        courses: 3,
        items: ['Gazpacho', 'Grilled lamb', 'Berry tart'],
      },
      {
        id: fakeId('mnu', 2),
        name: 'Executive Lunch',
        courses: 2,
        items: ['Caesar salad', 'Beef tenderloin', 'Cheesecake'],
      },
      {
        id: fakeId('mnu', 3),
        name: 'Rehearsal Menu',
        courses: 4,
        items: ['Caprese', 'Pasta', 'Chicken piccata', 'Gelato'],
      },
    ],
    recipes: [
      { id: fakeId('rcp', 1), name: 'Gazpacho', servings: 25, prepTime: 20, cookTime: 0 },
      {
        id: fakeId('rcp', 2),
        name: 'Grilled Lamb Chops',
        servings: 25,
        prepTime: 15,
        cookTime: 12,
      },
      { id: fakeId('rcp', 3), name: 'Mixed Berry Tart', servings: 25, prepTime: 30, cookTime: 25 },
      { id: fakeId('rcp', 4), name: 'Beef Tenderloin', servings: 14, prepTime: 20, cookTime: 45 },
      { id: fakeId('rcp', 5), name: 'Chicken Piccata', servings: 30, prepTime: 15, cookTime: 20 },
      { id: fakeId('rcp', 6), name: 'Gelato Trio', servings: 30, prepTime: 40, cookTime: 0 },
    ],
    invoices: [
      {
        id: fakeId('inv', 1),
        eventId: fakeId('evt', 1),
        clientId: clients[0].id,
        total: 3200,
        status: 'overdue',
        dueDate: pastDate(15),
        daysPastDue: 15,
      },
      {
        id: fakeId('inv', 2),
        eventId: fakeId('evt', 2),
        clientId: clients[1].id,
        total: 1800,
        status: 'overdue',
        dueDate: pastDate(5),
        daysPastDue: 5,
      },
      {
        id: fakeId('inv', 3),
        eventId: fakeId('evt', 3),
        clientId: clients[2].id,
        total: 4500,
        status: 'sent',
        dueDate: futureDate(10),
      },
    ],
    quotes: [],
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function futureDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function pastDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
