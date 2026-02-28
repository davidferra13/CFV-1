/**
 * Remy Eval — Seed Test Data
 *
 * Populates the agent test account with rich, realistic, internally consistent
 * mock data so the Remy eval harness has real context to work with.
 *
 * Run: npx tsx scripts/remy-eval/seed-remy-test-data.ts
 * Clean: npx tsx scripts/remy-eval/seed-remy-test-data.ts --clean
 *
 * All IDs use the 'e0a1' prefix for easy identification and cleanup.
 * All data is scoped to the agent tenant (91ec0e6a-...).
 */

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey)

const TENANT_ID = '91ec0e6a-ce61-41ec-b9e5-eea3b415e5b8'
const AUTH_USER_ID = '20f09030-af9a-44c0-aa59-56d480efa2d7'

// ─── Deterministic UUIDs ─────────────────────────────────────────────────────
// All eval data uses e0a1xxxx-... prefix so cleanup is safe and surgical.

const C = {
  // Clients
  henderson: 'e0a10001-0001-4000-8000-000000000001',
  martinez: 'e0a10001-0001-4000-8000-000000000002',
  chen: 'e0a10001-0001-4000-8000-000000000003',
  davis: 'e0a10001-0001-4000-8000-000000000004',
  thompson: 'e0a10001-0001-4000-8000-000000000005',
  kim: 'e0a10001-0001-4000-8000-000000000006',
  obrien: 'e0a10001-0001-4000-8000-000000000007',
  garcia: 'e0a10001-0001-4000-8000-000000000008',
  rothschild: 'e0a10001-0001-4000-8000-000000000009',
  park: 'e0a10001-0001-4000-8000-000000000010',
  patel: 'e0a10001-0001-4000-8000-000000000011',
  apex: 'e0a10001-0001-4000-8000-000000000012',
  morrison: 'e0a10001-0001-4000-8000-000000000013',
  sullivan: 'e0a10001-0001-4000-8000-000000000014',
  foster: 'e0a10001-0001-4000-8000-000000000015',
} as const

const E = {
  // Events — named by client + occasion for traceability
  henderson_mediterranean: 'e0a10002-0001-4000-8000-000000000001',
  henderson_birthday: 'e0a10002-0001-4000-8000-000000000002',
  henderson_holiday: 'e0a10002-0001-4000-8000-000000000003',
  martinez_wedding: 'e0a10002-0001-4000-8000-000000000004',
  martinez_anniversary: 'e0a10002-0001-4000-8000-000000000005',
  martinez_easter: 'e0a10002-0001-4000-8000-000000000006',
  chen_corporate: 'e0a10002-0001-4000-8000-000000000007',
  chen_product_launch: 'e0a10002-0001-4000-8000-000000000008',
  davis_brunch: 'e0a10002-0001-4000-8000-000000000009',
  davis_wine_dinner: 'e0a10002-0001-4000-8000-000000000010',
  davis_nye: 'e0a10002-0001-4000-8000-000000000011',
  thompson_reunion: 'e0a10002-0001-4000-8000-000000000012',
  thompson_graduation: 'e0a10002-0001-4000-8000-000000000013',
  kim_engagement: 'e0a10002-0001-4000-8000-000000000014',
  obrien_farmtable: 'e0a10002-0001-4000-8000-000000000015',
  obrien_stpatricks: 'e0a10002-0001-4000-8000-000000000016',
  garcia_quinceañera: 'e0a10002-0001-4000-8000-000000000017',
  garcia_sunday_dinner: 'e0a10002-0001-4000-8000-000000000018',
  rothschild_tasting: 'e0a10002-0001-4000-8000-000000000019',
  rothschild_charity: 'e0a10002-0001-4000-8000-000000000020',
  rothschild_nye: 'e0a10002-0001-4000-8000-000000000021',
  park_anniversary: 'e0a10002-0001-4000-8000-000000000022',
  apex_quarterly_q4: 'e0a10002-0001-4000-8000-000000000023',
  apex_quarterly_q1: 'e0a10002-0001-4000-8000-000000000024',
  morrison_tasting: 'e0a10002-0001-4000-8000-000000000025',
  patel_cookingclass: 'e0a10002-0001-4000-8000-000000000026',
  sullivan_july4th: 'e0a10002-0001-4000-8000-000000000027',
  foster_retirement: 'e0a10002-0001-4000-8000-000000000028',
  // Upcoming (future dates)
  henderson_spring: 'e0a10002-0001-4000-8000-000000000029',
  rothschild_spring_tasting: 'e0a10002-0001-4000-8000-000000000030',
  apex_quarterly_q2: 'e0a10002-0001-4000-8000-000000000031',
  park_baby_shower: 'e0a10002-0001-4000-8000-000000000032',
} as const

const Q = {
  martinez_wedding: 'e0a10003-0001-4000-8000-000000000001',
  chen_corporate: 'e0a10003-0001-4000-8000-000000000002',
  rothschild_tasting: 'e0a10003-0001-4000-8000-000000000003',
  henderson_spring: 'e0a10003-0001-4000-8000-000000000004',
  park_baby_shower: 'e0a10003-0001-4000-8000-000000000005',
} as const

const I = {
  newlead_sarah: 'e0a10004-0001-4000-8000-000000000001',
  newlead_james: 'e0a10004-0001-4000-8000-000000000002',
  awaitingchef: 'e0a10004-0001-4000-8000-000000000003',
  quoted: 'e0a10004-0001-4000-8000-000000000004',
  declined: 'e0a10004-0001-4000-8000-000000000005',
} as const

const R = {
  lobster_bisque: 'e0a10005-0001-4000-8000-000000000001',
  beef_wellington: 'e0a10005-0001-4000-8000-000000000002',
  crudo_bar: 'e0a10005-0001-4000-8000-000000000003',
  risotto: 'e0a10005-0001-4000-8000-000000000004',
  tiramisu: 'e0a10005-0001-4000-8000-000000000005',
  mole_negro: 'e0a10005-0001-4000-8000-000000000006',
  pork_belly: 'e0a10005-0001-4000-8000-000000000007',
  ceviche: 'e0a10005-0001-4000-8000-000000000008',
} as const

const M = {
  spring_tasting: 'e0a10006-0001-4000-8000-000000000001',
  italian_night: 'e0a10006-0001-4000-8000-000000000002',
  corporate_lunch: 'e0a10006-0001-4000-8000-000000000003',
  farm_table: 'e0a10006-0001-4000-8000-000000000004',
} as const

const STAFF = {
  maria: 'e0a10007-0001-4000-8000-000000000001',
  tony: 'e0a10007-0001-4000-8000-000000000002',
  jake: 'e0a10007-0001-4000-8000-000000000003',
  lisa: 'e0a10007-0001-4000-8000-000000000004',
} as const

// ─── Date Helpers ────────────────────────────────────────────────────────────

function daysFromNow(days: number): string {
  const d = new Date('2026-02-28')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysAgo(days: number): string {
  return daysFromNow(-days)
}

function isoTimestamp(daysOffset: number): string {
  const d = new Date('2026-02-28T12:00:00Z')
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString()
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('🧹 Cleaning existing eval seed data...')

  // Delete in reverse dependency order
  const allEventIds = Object.values(E)
  const allClientIds = Object.values(C)
  const allRecipeIds = Object.values(R)
  const allMenuIds = Object.values(M)
  const allQuoteIds = Object.values(Q)
  const allInquiryIds = Object.values(I)
  const allStaffIds = Object.values(STAFF)

  // Ledger entries, expenses, event_staff, quotes → depend on events
  await supabase.from('ledger_entries').delete().in('event_id', allEventIds)
  await supabase.from('expenses').delete().in('event_id', allEventIds)
  await supabase.from('event_staff_assignments').delete().in('event_id', allEventIds)
  await supabase.from('quotes').delete().in('id', allQuoteIds)
  await supabase.from('client_reviews').delete().in('event_id', allEventIds)

  // Messages → depend on inquiries
  await supabase.from('messages').delete().in('inquiry_id', allInquiryIds)
  await supabase.from('inquiries').delete().in('id', allInquiryIds)

  // Recipe ingredients → depend on recipes
  await supabase.from('recipe_ingredients').delete().in('recipe_id', allRecipeIds)
  await supabase.from('recipes').delete().in('id', allRecipeIds)

  // Menu items (station_menu_items) → cleaned via menu reference if needed
  await supabase.from('menus').delete().in('id', allMenuIds)

  // Events → depend on clients
  await supabase.from('events').delete().in('id', allEventIds)

  // Staff
  await supabase.from('staff_members').delete().in('id', allStaffIds)

  // Remy memories (eval ones)
  await supabase
    .from('remy_memories')
    .delete()
    .eq('tenant_id', TENANT_ID)
    .like('content', '%[eval]%')

  // Clients last (everything else depends on them)
  await supabase.from('clients').delete().in('id', allClientIds)

  console.log('✅ Cleanup complete')
}

// ─── Seed Functions ──────────────────────────────────────────────────────────

async function seedChefProfile() {
  console.log('👨‍🍳 Updating chef profile...')
  const { error } = await supabase
    .from('chefs')
    .update({
      business_name: 'Chef Marco Eval Kitchen',
      display_name: 'Chef Marco',
      tagline: 'Farm-to-table excellence, one plate at a time',
      phone: '617-555-0100',
      bio: 'Private chef specializing in Mediterranean and farm-to-table cuisine with 12 years of experience. Formerly at Oleana and The Table at Season to Taste in Cambridge.',
      timezone: 'America/New_York',
    })
    .eq('id', TENANT_ID)

  if (error) console.error('Chef profile update failed:', error.message)
}

async function seedClients() {
  console.log('👥 Seeding 15 clients...')

  const clients = [
    {
      id: C.henderson,
      tenant_id: TENANT_ID,
      full_name: 'Sarah Henderson',
      email: 'sarah.henderson@eval.test',
      phone: '617-555-1001',
      status: 'vip' as const,
      loyalty_tier: 'gold' as const,
      loyalty_points: 340,
      total_events_count: 7,
      total_events_completed: 6,
      lifetime_value_cents: 2240000, // $22,400
      dietary_restrictions: ['pescatarian'],
      allergies: [],
      vibe_notes:
        'Love interactive stations. Very warm family. James is pescatarian, Sarah has no restrictions. Always tip 20%+. Prefer Saturday evenings.',
      preferred_contact_method: 'email' as const,
      address: '42 Brattle Street, Cambridge, MA 02138',
    },
    {
      id: C.martinez,
      tenant_id: TENANT_ID,
      full_name: 'Sofia Martinez',
      email: 'sofia.martinez@eval.test',
      phone: '617-555-1002',
      status: 'vip' as const,
      loyalty_tier: 'platinum' as const,
      loyalty_points: 820,
      total_events_count: 12,
      total_events_completed: 11,
      lifetime_value_cents: 5640000, // $56,400
      dietary_restrictions: [],
      allergies: [],
      vibe_notes:
        'Mexican-Italian fusion lovers. Carlos is a wine collector. Sofia handles all bookings. Their wedding was our biggest event ever. Always refer friends.',
      preferred_contact_method: 'text' as const,
      address: '88 Commonwealth Ave, Boston, MA 02116',
    },
    {
      id: C.chen,
      tenant_id: TENANT_ID,
      full_name: 'Alex Chen',
      email: 'alex.chen@eval.test',
      phone: '617-555-1003',
      status: 'active' as const,
      loyalty_tier: 'bronze' as const,
      loyalty_points: 60,
      total_events_count: 2,
      total_events_completed: 2,
      lifetime_value_cents: 720000, // $7,200
      dietary_restrictions: ['vegan'],
      allergies: [],
      vibe_notes:
        'Tech exec at Acme Corp. All corporate events. Vegan, very specific about sourcing — only organic. Quiet, detail-oriented, always on time.',
      preferred_contact_method: 'email' as const,
      address: '1 Kendall Square, Cambridge, MA 02139',
    },
    {
      id: C.davis,
      tenant_id: TENANT_ID,
      full_name: 'Victoria Davis',
      email: 'victoria.davis@eval.test',
      phone: '617-555-1004',
      status: 'active' as const,
      loyalty_tier: 'gold' as const,
      loyalty_points: 280,
      total_events_count: 6,
      total_events_completed: 5,
      lifetime_value_cents: 1890000, // $18,900
      dietary_restrictions: [],
      allergies: ['shellfish'],
      vibe_notes:
        'Wine pairing enthusiast. Intimate dinner parties, usually 6-8 guests. Tends to pay late — always follows through but needs a gentle reminder around day 7-8.',
      preferred_contact_method: 'email' as const,
      address: '15 Beacon Street, Boston, MA 02108',
    },
    {
      id: C.thompson,
      tenant_id: TENANT_ID,
      full_name: 'The Thompson Family',
      email: 'thompson.family@eval.test',
      phone: '617-555-1005',
      status: 'dormant' as const,
      loyalty_tier: 'silver' as const,
      loyalty_points: 150,
      total_events_count: 3,
      total_events_completed: 3,
      lifetime_value_cents: 960000, // $9,600
      dietary_restrictions: [],
      allergies: ['dairy'],
      vibe_notes:
        'Great family, two kids (ages 8 and 11) both dairy-free. Last booking was 11 weeks ago — overdue for re-engagement. Love casual family-style service.',
      preferred_contact_method: 'phone' as const,
      address: '200 Walden Street, Concord, MA 01742',
    },
    {
      id: C.kim,
      tenant_id: TENANT_ID,
      full_name: 'Rachel Kim',
      email: 'rachel.kim@eval.test',
      phone: '617-555-1006',
      status: 'active' as const,
      loyalty_tier: 'bronze' as const,
      loyalty_points: 30,
      total_events_count: 1,
      total_events_completed: 0,
      lifetime_value_cents: 0,
      dietary_restrictions: [],
      allergies: ['shellfish'],
      vibe_notes:
        'New client. SHELLFISH ALLERGY IS SEVERE — carries EpiPen. Engagement dinner coming up. Very excited, first time hiring a private chef.',
      preferred_contact_method: 'text' as const,
      address: '55 Summer Street, Boston, MA 02110',
    },
    {
      id: C.obrien,
      tenant_id: TENANT_ID,
      full_name: "Michael O'Brien",
      email: 'michael.obrien@eval.test',
      phone: '617-555-1007',
      status: 'active' as const,
      loyalty_tier: 'gold' as const,
      loyalty_points: 240,
      total_events_count: 5,
      total_events_completed: 4,
      lifetime_value_cents: 1600000, // $16,000
      dietary_restrictions: [],
      allergies: [],
      vibe_notes:
        'Irish heritage, loves rustic farm-to-table. Has a barn venue in Lexington — incredible space. Knows his whiskey. Very social, always invites the chef to eat with guests at the end.',
      preferred_contact_method: 'phone' as const,
      address: '8 Farm Lane, Lexington, MA 02420',
    },
    {
      id: C.garcia,
      tenant_id: TENANT_ID,
      full_name: 'David Garcia',
      email: 'david.garcia@eval.test',
      phone: '617-555-1008',
      status: 'active' as const,
      loyalty_tier: 'gold' as const,
      loyalty_points: 310,
      total_events_count: 8,
      total_events_completed: 7,
      lifetime_value_cents: 2480000, // $24,800
      dietary_restrictions: [],
      allergies: ['tree nuts'],
      vibe_notes:
        'Large family gatherings, usually 25-40 guests. Budget-conscious but always pays on time. Maria (wife) handles desserts herself — never offer to make dessert. TREE NUT ALLERGY — David.',
      preferred_contact_method: 'text' as const,
      address: '340 Main Street, Medford, MA 02155',
    },
    {
      id: C.rothschild,
      tenant_id: TENANT_ID,
      full_name: 'Emma Rothschild',
      email: 'emma.rothschild@eval.test',
      phone: '617-555-1009',
      status: 'vip' as const,
      loyalty_tier: 'platinum' as const,
      loyalty_points: 950,
      total_events_count: 15,
      total_events_completed: 14,
      lifetime_value_cents: 9750000, // $97,500
      dietary_restrictions: [],
      allergies: [],
      vibe_notes:
        'Highest-value client. Luxury tasting menus, $200+/head. Wine collector — pairs everything from her cellar. Beacon Hill brownstone. Very private, no social media posting of events ever.',
      preferred_contact_method: 'email' as const,
      address: '3 Louisburg Square, Boston, MA 02108',
    },
    {
      id: C.park,
      tenant_id: TENANT_ID,
      full_name: 'Jessica Park',
      email: 'jessica.park@eval.test',
      phone: '617-555-1010',
      status: 'active' as const,
      loyalty_tier: 'bronze' as const,
      loyalty_points: 60,
      total_events_count: 2,
      total_events_completed: 1,
      lifetime_value_cents: 280000, // $2,800
      dietary_restrictions: ['gluten-free'],
      allergies: [],
      vibe_notes:
        'Young couple. Ryan photographs everything for Instagram — presentation matters more than usual. Jessica is gluten-free. First anniversary dinner was a hit.',
      preferred_contact_method: 'instagram' as const,
      address: '120 Newbury Street, Boston, MA 02116',
    },
    {
      id: C.patel,
      tenant_id: TENANT_ID,
      full_name: 'Olivia Patel',
      email: 'olivia.patel@eval.test',
      phone: '617-555-1011',
      status: 'active' as const,
      loyalty_tier: 'silver' as const,
      loyalty_points: 120,
      total_events_count: 3,
      total_events_completed: 3,
      lifetime_value_cents: 540000, // $5,400
      dietary_restrictions: ['vegetarian'],
      allergies: [],
      vibe_notes:
        'Indian spice expert — knows her stuff. Books cooking classes, not dinner parties. Always brings 8-10 friends. Very energetic, great reviews.',
      preferred_contact_method: 'email' as const,
      address: '75 Hampshire Street, Cambridge, MA 02139',
    },
    {
      id: C.apex,
      tenant_id: TENANT_ID,
      full_name: 'Apex Group (Corporate)',
      email: 'events@apex-group.eval.test',
      phone: '617-555-1012',
      status: 'active' as const,
      loyalty_tier: 'gold' as const,
      loyalty_points: 200,
      total_events_count: 5,
      total_events_completed: 4,
      lifetime_value_cents: 1800000, // $18,000
      dietary_restrictions: [],
      allergies: [],
      vibe_notes:
        'Corporate account. Contact: Jennifer Walsh (EA to CEO). Quarterly board dinners, 30-50 guests. Buffet style usually. Budget: $100-120/head. NET 30 payment terms.',
      preferred_contact_method: 'email' as const,
      address: '100 Federal Street, Boston, MA 02110',
    },
    {
      id: C.morrison,
      tenant_id: TENANT_ID,
      full_name: 'The Morrison Family',
      email: 'morrison.family@eval.test',
      phone: '617-555-1013',
      status: 'active' as const,
      loyalty_tier: 'bronze' as const,
      loyalty_points: 20,
      total_events_count: 1,
      total_events_completed: 0,
      lifetime_value_cents: 0,
      dietary_restrictions: [],
      allergies: ['peanuts'],
      vibe_notes:
        'New client. Have a tasting scheduled — menu pending approval. Tim Morrison has a PEANUT ALLERGY (moderate). Wife Amanda does the planning.',
      preferred_contact_method: 'email' as const,
      address: '25 Maple Avenue, Newton, MA 02458',
    },
    {
      id: C.sullivan,
      tenant_id: TENANT_ID,
      full_name: 'Mark Sullivan',
      email: 'mark.sullivan@eval.test',
      phone: '617-555-1014',
      status: 'repeat_ready' as const,
      loyalty_tier: 'gold' as const,
      loyalty_points: 260,
      total_events_count: 6,
      total_events_completed: 6,
      lifetime_value_cents: 1440000, // $14,400
      dietary_restrictions: [],
      allergies: [],
      vibe_notes:
        'Classic American comfort food. Big 4th of July tradition — hosts 40+ every year. Linda (wife) makes the pies. Very loyal, been booking for 3 years. Easy client.',
      preferred_contact_method: 'phone' as const,
      address: '180 Lincoln Road, Sudbury, MA 01776',
    },
    {
      id: C.foster,
      tenant_id: TENANT_ID,
      full_name: 'Patricia Foster',
      email: 'patricia.foster@eval.test',
      phone: '617-555-1015',
      status: 'active' as const,
      loyalty_tier: 'bronze' as const,
      loyalty_points: 40,
      total_events_count: 2,
      total_events_completed: 1,
      lifetime_value_cents: 320000, // $3,200
      dietary_restrictions: ['low-sodium'],
      allergies: [],
      vibe_notes:
        "Retirement party was wonderful. Patricia is on a low-sodium diet (doctor's orders). Husband Robert handles payment. Very sweet couple, appreciate traditional flavors.",
      preferred_contact_method: 'phone' as const,
      address: '60 Elm Street, Wellesley, MA 02481',
    },
  ]

  const { error } = await supabase.from('clients').upsert(clients, { onConflict: 'id' })
  if (error) console.error('Client seed failed:', error.message)
  else console.log(`  ✅ ${clients.length} clients seeded`)
}

async function seedEvents() {
  console.log('📅 Seeding events...')

  const events = [
    // ─── COMPLETED events (past dates, real revenue) ─────────────────
    {
      id: E.henderson_mediterranean,
      tenant_id: TENANT_ID,
      client_id: C.henderson,
      occasion: 'Mediterranean Dinner Party',
      event_date: daysAgo(45),
      serve_time: '19:00',
      guest_count: 8,
      course_count: 4,
      location_address: '42 Brattle Street',
      location_city: 'Cambridge',
      location_zip: '02138',
      status: 'completed' as const,
      kitchen_notes: 'Pescatarian for James. Interactive hummus station was a huge hit.',
    },
    {
      id: E.henderson_birthday,
      tenant_id: TENANT_ID,
      client_id: C.henderson,
      occasion: "James's 50th Birthday Dinner",
      event_date: daysAgo(120),
      serve_time: '18:30',
      guest_count: 12,
      course_count: 5,
      location_address: '42 Brattle Street',
      location_city: 'Cambridge',
      location_zip: '02138',
      status: 'completed' as const,
      kitchen_notes: 'Surprise party. Crudo bar + 5-course seated. Budget was generous.',
    },
    {
      id: E.martinez_wedding,
      tenant_id: TENANT_ID,
      client_id: C.martinez,
      occasion: 'Martinez Wedding Reception',
      event_date: daysAgo(180),
      serve_time: '17:00',
      guest_count: 85,
      course_count: 7,
      location_address: 'The Estate at Moraine Farm',
      location_city: 'Beverly',
      location_zip: '01915',
      status: 'completed' as const,
      kitchen_notes:
        'Biggest event to date. Mexican-Italian fusion menu. Mole negro was the star. $48,000 total.',
    },
    {
      id: E.martinez_anniversary,
      tenant_id: TENANT_ID,
      client_id: C.martinez,
      occasion: 'First Wedding Anniversary',
      event_date: daysAgo(30),
      serve_time: '19:30',
      guest_count: 2,
      course_count: 6,
      location_address: '88 Commonwealth Ave',
      location_city: 'Boston',
      location_zip: '02116',
      status: 'completed' as const,
      kitchen_notes: 'Intimate 2-person anniversary. Recreated 3 dishes from their wedding menu.',
    },
    {
      id: E.chen_corporate,
      tenant_id: TENANT_ID,
      client_id: C.chen,
      occasion: 'Acme Corp Team Dinner',
      event_date: daysAgo(60),
      serve_time: '18:00',
      guest_count: 20,
      course_count: 3,
      location_address: '1 Kendall Square',
      location_city: 'Cambridge',
      location_zip: '02139',
      status: 'completed' as const,
      kitchen_notes: 'All vegan, organic only. Alex was very pleased. Referred us to their CTO.',
    },
    {
      id: E.davis_brunch,
      tenant_id: TENANT_ID,
      client_id: C.davis,
      occasion: 'Sunday Brunch Party',
      event_date: daysAgo(8),
      serve_time: '11:00',
      guest_count: 6,
      course_count: 4,
      location_address: '15 Beacon Street',
      location_city: 'Boston',
      location_zip: '02108',
      status: 'completed' as const,
      kitchen_notes:
        'Wine pairing brunch. Shellfish-free (Victoria). $2,100 — PAYMENT STILL OUTSTANDING.',
    },
    {
      id: E.davis_wine_dinner,
      tenant_id: TENANT_ID,
      client_id: C.davis,
      occasion: 'Wine Pairing Dinner',
      event_date: daysAgo(90),
      serve_time: '19:00',
      guest_count: 8,
      course_count: 6,
      location_address: '15 Beacon Street',
      location_city: 'Boston',
      location_zip: '02108',
      status: 'completed' as const,
      kitchen_notes: 'Victoria paired wines from her collection. 6-course with 6 wines.',
    },
    {
      id: E.thompson_reunion,
      tenant_id: TENANT_ID,
      client_id: C.thompson,
      occasion: 'Family Reunion BBQ',
      event_date: daysAgo(77),
      serve_time: '12:00',
      guest_count: 25,
      course_count: 1,
      location_address: '200 Walden Street',
      location_city: 'Concord',
      location_zip: '01742',
      status: 'completed' as const,
      kitchen_notes:
        'Outdoor BBQ, family-style. Both kids dairy-free. Burgers, ribs, grilled veggies. Single service (no courses).',
    },
    {
      id: E.obrien_farmtable,
      tenant_id: TENANT_ID,
      client_id: C.obrien,
      occasion: 'Farm Table Dinner',
      event_date: daysAgo(40),
      serve_time: '18:00',
      guest_count: 16,
      course_count: 5,
      location_address: '8 Farm Lane',
      location_city: 'Lexington',
      location_zip: '02420',
      status: 'completed' as const,
      kitchen_notes:
        'In the barn. All local ingredients within 50 miles. Michael invited chef to join for dessert.',
    },
    {
      id: E.garcia_quinceañera,
      tenant_id: TENANT_ID,
      client_id: C.garcia,
      occasion: "Isabella's Quinceañera",
      event_date: daysAgo(55),
      serve_time: '16:00',
      guest_count: 40,
      course_count: 4,
      location_address: '340 Main Street',
      location_city: 'Medford',
      location_zip: '02155',
      status: 'completed' as const,
      kitchen_notes:
        'Big celebration, 40 guests. Tree-nut free for David. Maria made tres leches cake.',
    },
    {
      id: E.rothschild_tasting,
      tenant_id: TENANT_ID,
      client_id: C.rothschild,
      occasion: 'Winter Tasting Menu',
      event_date: daysAgo(21),
      serve_time: '19:00',
      guest_count: 6,
      course_count: 9,
      location_address: '3 Louisburg Square',
      location_city: 'Boston',
      location_zip: '02108',
      status: 'completed' as const,
      kitchen_notes:
        '9-course tasting at $225/head. Wagyu A5, truffle, Champagne. Emma paired from her cellar.',
    },
    {
      id: E.rothschild_charity,
      tenant_id: TENANT_ID,
      client_id: C.rothschild,
      occasion: 'Charity Gala Dinner',
      event_date: daysAgo(100),
      serve_time: '18:00',
      guest_count: 50,
      course_count: 5,
      location_address: 'Boston Harbor Hotel',
      location_city: 'Boston',
      location_zip: '02110',
      status: 'completed' as const,
      kitchen_notes: 'Black-tie charity event. $200/head. Wine donated by Emma. $10,000 event.',
    },
    {
      id: E.park_anniversary,
      tenant_id: TENANT_ID,
      client_id: C.park,
      occasion: 'First Anniversary Dinner',
      event_date: daysAgo(35),
      serve_time: '19:30',
      guest_count: 2,
      course_count: 5,
      location_address: '120 Newbury Street',
      location_city: 'Boston',
      location_zip: '02116',
      status: 'completed' as const,
      kitchen_notes:
        'Gluten-free for Jessica. Ryan photographed every plate. Great Instagram exposure.',
    },
    {
      id: E.apex_quarterly_q4,
      tenant_id: TENANT_ID,
      client_id: C.apex,
      occasion: 'Q4 Board Dinner',
      event_date: daysAgo(65),
      serve_time: '18:30',
      guest_count: 35,
      course_count: 3,
      location_address: '100 Federal Street',
      location_city: 'Boston',
      location_zip: '02110',
      status: 'completed' as const,
      kitchen_notes: 'Buffet style. $100/head. Jennifer Walsh coordinated. NET 30.',
    },
    {
      id: E.patel_cookingclass,
      tenant_id: TENANT_ID,
      client_id: C.patel,
      occasion: 'Indian Spice Workshop',
      event_date: daysAgo(50),
      serve_time: '14:00',
      guest_count: 10,
      course_count: 1,
      location_address: '75 Hampshire Street',
      location_city: 'Cambridge',
      location_zip: '02139',
      status: 'completed' as const,
      kitchen_notes:
        'Cooking class format, not dinner. Vegetarian. Covered tempering, curry bases, spice blending. Single session.',
    },
    {
      id: E.sullivan_july4th,
      tenant_id: TENANT_ID,
      client_id: C.sullivan,
      occasion: '4th of July BBQ',
      event_date: '2025-07-04',
      serve_time: '12:00',
      guest_count: 45,
      course_count: 1,
      location_address: '180 Lincoln Road',
      location_city: 'Sudbury',
      location_zip: '01776',
      status: 'completed' as const,
      kitchen_notes:
        'Annual tradition, 3rd year running. Massive BBQ. Linda made pies. Mark tipped $500 cash. Single service.',
    },
    {
      id: E.foster_retirement,
      tenant_id: TENANT_ID,
      client_id: C.foster,
      occasion: "Robert's Retirement Party",
      event_date: daysAgo(25),
      serve_time: '17:00',
      guest_count: 30,
      course_count: 4,
      location_address: '60 Elm Street',
      location_city: 'Wellesley',
      location_zip: '02481',
      status: 'completed' as const,
      kitchen_notes:
        'Low-sodium for Patricia. Robert retired from Mass General. Very emotional, lovely event.',
    },

    // ─── UPCOMING / ACTIVE events (future dates) ─────────────────────
    {
      id: E.henderson_spring,
      tenant_id: TENANT_ID,
      client_id: C.henderson,
      occasion: 'Spring Garden Party',
      event_date: daysFromNow(18),
      serve_time: '17:00',
      guest_count: 14,
      course_count: 5,
      location_address: '42 Brattle Street',
      location_city: 'Cambridge',
      location_zip: '02138',
      status: 'confirmed' as const,
      kitchen_notes:
        'Outdoor garden setting. Pescatarian options for James. Spring menu — asparagus, lamb, pea shoots.',
    },
    {
      id: E.rothschild_spring_tasting,
      tenant_id: TENANT_ID,
      client_id: C.rothschild,
      occasion: 'Spring Tasting Menu',
      event_date: daysFromNow(32),
      serve_time: '19:00',
      guest_count: 8,
      course_count: 8,
      location_address: '3 Louisburg Square',
      location_city: 'Boston',
      location_zip: '02108',
      status: 'paid' as const,
      kitchen_notes:
        '8-course spring menu. $200/head. Emma wants to feature her 2019 Burgundy collection.',
    },
    {
      id: E.apex_quarterly_q1,
      tenant_id: TENANT_ID,
      client_id: C.apex,
      occasion: 'Q1 Board Dinner',
      event_date: daysFromNow(5),
      serve_time: '18:30',
      guest_count: 30,
      course_count: 3,
      location_address: '100 Federal Street',
      location_city: 'Boston',
      location_zip: '02110',
      status: 'confirmed' as const,
      kitchen_notes: 'Same format as Q4. Buffet, $110/head. Jennifer confirmed headcount.',
    },
    {
      id: E.park_baby_shower,
      tenant_id: TENANT_ID,
      client_id: C.park,
      occasion: "Jessica's Baby Shower",
      event_date: daysFromNow(45),
      serve_time: '13:00',
      guest_count: 20,
      course_count: 3,
      location_address: '120 Newbury Street',
      location_city: 'Boston',
      location_zip: '02116',
      status: 'proposed' as const,
      kitchen_notes:
        'Gluten-free. Brunch/tea party style. Jessica wants all pastel presentation for photos. 3 services: appetizers, main, dessert.',
    },
    {
      id: E.kim_engagement,
      tenant_id: TENANT_ID,
      client_id: C.kim,
      occasion: 'Engagement Dinner',
      event_date: daysFromNow(12),
      serve_time: '19:00',
      guest_count: 8,
      course_count: 5,
      location_address: '55 Summer Street',
      location_city: 'Boston',
      location_zip: '02110',
      status: 'accepted' as const,
      kitchen_notes:
        'CRITICAL: Rachel has SEVERE shellfish allergy. No shellfish in kitchen AT ALL. Cross-contamination risk must be zero.',
    },
    {
      id: E.morrison_tasting,
      tenant_id: TENANT_ID,
      client_id: C.morrison,
      occasion: 'Tasting for Morrison Family',
      event_date: daysFromNow(8),
      serve_time: '18:00',
      guest_count: 4,
      course_count: 4,
      location_address: '25 Maple Avenue',
      location_city: 'Newton',
      location_zip: '02458',
      status: 'proposed' as const,
      kitchen_notes:
        'Tasting for potential new recurring client. Tim has peanut allergy. Menu pending approval.',
    },

    // ─── DRAFT / CANCELLED ────────────────────────────────────────────
    {
      id: E.henderson_holiday,
      tenant_id: TENANT_ID,
      client_id: C.henderson,
      occasion: 'Holiday Dinner',
      event_date: '2025-12-20',
      serve_time: '18:00',
      guest_count: 10,
      course_count: 5,
      location_address: '42 Brattle Street',
      location_city: 'Cambridge',
      location_zip: '02138',
      status: 'cancelled' as const,
      kitchen_notes: 'Cancelled — Hendersons traveled to Vermont instead.',
    },
    {
      id: E.chen_product_launch,
      tenant_id: TENANT_ID,
      client_id: C.chen,
      occasion: 'Product Launch Celebration',
      event_date: daysFromNow(60),
      serve_time: '17:00',
      guest_count: 50,
      course_count: 1,
      location_address: '1 Kendall Square',
      location_city: 'Cambridge',
      location_zip: '02139',
      status: 'draft' as const,
      kitchen_notes:
        'Tentative. Vegan cocktail reception for 50. Alex needs board approval first. Single service (passed apps + stations).',
    },
  ]

  const { error } = await supabase.from('events').upsert(events, { onConflict: 'id' })
  if (error) console.error('Event seed failed:', error.message)
  else console.log(`  ✅ ${events.length} events seeded`)
}

async function seedLedgerEntries() {
  console.log('💰 Seeding ledger entries (financials)...')

  // Each entry must be consistent with the event it references.
  // amount_cents is positive for revenue, negative for refunds.
  const entries = [
    // Henderson Mediterranean ($3,200 total — deposit + final)
    {
      tenant_id: TENANT_ID,
      event_id: E.henderson_mediterranean,
      client_id: C.henderson,
      entry_type: 'deposit' as const,
      amount_cents: 160000,
      description: 'Deposit — 50%',
      payment_method: 'zelle' as const,
      created_at: isoTimestamp(-50),
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.henderson_mediterranean,
      client_id: C.henderson,
      entry_type: 'final_payment' as const,
      amount_cents: 160000,
      description: 'Final payment',
      payment_method: 'zelle' as const,
      created_at: isoTimestamp(-44),
    },
    // Henderson Birthday ($4,800 — deposit + final + tip)
    {
      tenant_id: TENANT_ID,
      event_id: E.henderson_birthday,
      client_id: C.henderson,
      entry_type: 'deposit' as const,
      amount_cents: 240000,
      description: 'Deposit — 50%',
      payment_method: 'venmo' as const,
      created_at: isoTimestamp(-125),
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.henderson_birthday,
      client_id: C.henderson,
      entry_type: 'final_payment' as const,
      amount_cents: 240000,
      description: 'Final payment',
      payment_method: 'venmo' as const,
      created_at: isoTimestamp(-119),
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.henderson_birthday,
      client_id: C.henderson,
      entry_type: 'tip' as const,
      amount_cents: 96000,
      description: 'Tip — generous!',
      payment_method: 'cash' as const,
      created_at: isoTimestamp(-119),
    },
    // Martinez Wedding ($48,000)
    {
      tenant_id: TENANT_ID,
      event_id: E.martinez_wedding,
      client_id: C.martinez,
      entry_type: 'deposit' as const,
      amount_cents: 2400000,
      description: 'Wedding deposit — 50%',
      payment_method: 'check' as const,
      created_at: isoTimestamp(-200),
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.martinez_wedding,
      client_id: C.martinez,
      entry_type: 'final_payment' as const,
      amount_cents: 2400000,
      description: 'Wedding final payment',
      payment_method: 'check' as const,
      created_at: isoTimestamp(-178),
    },
    // Martinez Anniversary ($1,200)
    {
      tenant_id: TENANT_ID,
      event_id: E.martinez_anniversary,
      client_id: C.martinez,
      entry_type: 'payment' as const,
      amount_cents: 120000,
      description: 'Full payment',
      payment_method: 'venmo' as const,
      created_at: isoTimestamp(-32),
    },
    // Chen Corporate ($3,600)
    {
      tenant_id: TENANT_ID,
      event_id: E.chen_corporate,
      client_id: C.chen,
      entry_type: 'payment' as const,
      amount_cents: 360000,
      description: 'Corporate invoice payment',
      payment_method: 'check' as const,
      created_at: isoTimestamp(-55),
    },
    // Davis Wine Dinner ($3,200)
    {
      tenant_id: TENANT_ID,
      event_id: E.davis_wine_dinner,
      client_id: C.davis,
      entry_type: 'payment' as const,
      amount_cents: 320000,
      description: 'Full payment',
      payment_method: 'zelle' as const,
      created_at: isoTimestamp(-85),
    },
    // Davis Brunch ($2,100) — UNPAID, no ledger entry (this tests "outstanding" detection)
    // Rothschild Winter Tasting ($1,350 = 6 guests × $225)
    {
      tenant_id: TENANT_ID,
      event_id: E.rothschild_tasting,
      client_id: C.rothschild,
      entry_type: 'payment' as const,
      amount_cents: 135000,
      description: 'Tasting menu — 6 guests × $225',
      payment_method: 'check' as const,
      created_at: isoTimestamp(-19),
    },
    // Rothschild Charity ($10,000)
    {
      tenant_id: TENANT_ID,
      event_id: E.rothschild_charity,
      client_id: C.rothschild,
      entry_type: 'payment' as const,
      amount_cents: 1000000,
      description: 'Charity gala — 50 guests × $200',
      payment_method: 'check' as const,
      created_at: isoTimestamp(-95),
    },
    // Park Anniversary ($2,800)
    {
      tenant_id: TENANT_ID,
      event_id: E.park_anniversary,
      client_id: C.park,
      entry_type: 'payment' as const,
      amount_cents: 280000,
      description: 'Anniversary dinner',
      payment_method: 'venmo' as const,
      created_at: isoTimestamp(-33),
    },
    // Apex Q4 ($3,500 = 35 guests × $100)
    {
      tenant_id: TENANT_ID,
      event_id: E.apex_quarterly_q4,
      client_id: C.apex,
      entry_type: 'payment' as const,
      amount_cents: 350000,
      description: 'Q4 board dinner',
      payment_method: 'check' as const,
      created_at: isoTimestamp(-35),
    },
    // O'Brien Farm Table ($3,200)
    {
      tenant_id: TENANT_ID,
      event_id: E.obrien_farmtable,
      client_id: C.obrien,
      entry_type: 'payment' as const,
      amount_cents: 320000,
      description: 'Farm table dinner — 16 guests',
      payment_method: 'zelle' as const,
      created_at: isoTimestamp(-38),
    },
    // Garcia Quinceañera ($3,600)
    {
      tenant_id: TENANT_ID,
      event_id: E.garcia_quinceañera,
      client_id: C.garcia,
      entry_type: 'payment' as const,
      amount_cents: 360000,
      description: 'Quinceañera — 40 guests',
      payment_method: 'cash' as const,
      created_at: isoTimestamp(-53),
    },
    // Foster Retirement ($3,200)
    {
      tenant_id: TENANT_ID,
      event_id: E.foster_retirement,
      client_id: C.foster,
      entry_type: 'payment' as const,
      amount_cents: 320000,
      description: 'Retirement party — 30 guests',
      payment_method: 'check' as const,
      created_at: isoTimestamp(-23),
    },
    // Patel Cooking Class ($1,800)
    {
      tenant_id: TENANT_ID,
      event_id: E.patel_cookingclass,
      client_id: C.patel,
      entry_type: 'payment' as const,
      amount_cents: 180000,
      description: 'Indian spice workshop — 10 guests',
      payment_method: 'venmo' as const,
      created_at: isoTimestamp(-48),
    },
    // Sullivan 4th of July ($2,400 + $500 cash tip)
    {
      tenant_id: TENANT_ID,
      event_id: E.sullivan_july4th,
      client_id: C.sullivan,
      entry_type: 'payment' as const,
      amount_cents: 240000,
      description: '4th of July BBQ — 45 guests',
      payment_method: 'check' as const,
      created_at: isoTimestamp(-239),
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.sullivan_july4th,
      client_id: C.sullivan,
      entry_type: 'tip' as const,
      amount_cents: 50000,
      description: 'Cash tip from Mark',
      payment_method: 'cash' as const,
      created_at: isoTimestamp(-239),
    },
    // Upcoming paid: Rothschild Spring Tasting deposit ($800)
    {
      tenant_id: TENANT_ID,
      event_id: E.rothschild_spring_tasting,
      client_id: C.rothschild,
      entry_type: 'deposit' as const,
      amount_cents: 80000,
      description: 'Spring tasting deposit — 50%',
      payment_method: 'check' as const,
      created_at: isoTimestamp(-5),
    },
  ]

  const { error } = await supabase.from('ledger_entries').insert(entries)
  if (error) console.error('Ledger seed failed:', error.message)
  else console.log(`  ✅ ${entries.length} ledger entries seeded`)
}

async function seedExpenses() {
  console.log('🧾 Seeding expenses...')

  const expenses = [
    {
      tenant_id: TENANT_ID,
      event_id: E.henderson_mediterranean,
      category: 'groceries' as const,
      description: 'Whole Foods — seafood, produce, oils',
      amount_cents: 42000,
      payment_method: 'card' as const,
      expense_date: daysAgo(47),
      vendor_name: 'Whole Foods Market',
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.henderson_mediterranean,
      category: 'gas_mileage' as const,
      description: 'Round trip to Cambridge',
      amount_cents: 3500,
      payment_method: 'card' as const,
      expense_date: daysAgo(45),
      vendor_name: null,
      mileage_miles: 24,
      mileage_rate_per_mile_cents: 67,
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.martinez_wedding,
      category: 'groceries' as const,
      description: 'Wedding ingredients — full order',
      amount_cents: 680000,
      payment_method: 'card' as const,
      expense_date: daysAgo(183),
      vendor_name: 'Restaurant Depot + Specialty',
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.martinez_wedding,
      category: 'labor' as const,
      description: '4 staff × 10 hours',
      amount_cents: 240000,
      payment_method: 'venmo' as const,
      expense_date: daysAgo(180),
      vendor_name: null,
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.martinez_wedding,
      category: 'equipment' as const,
      description: 'Chafing dish rental + linens',
      amount_cents: 85000,
      payment_method: 'card' as const,
      expense_date: daysAgo(182),
      vendor_name: 'Boston Party Rentals',
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.chen_corporate,
      category: 'groceries' as const,
      description: 'Organic vegan ingredients',
      amount_cents: 38000,
      payment_method: 'card' as const,
      expense_date: daysAgo(62),
      vendor_name: 'Cambridge Natural Foods',
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.rothschild_tasting,
      category: 'groceries' as const,
      description: 'Wagyu A5, truffle, micro greens',
      amount_cents: 65000,
      payment_method: 'card' as const,
      expense_date: daysAgo(23),
      vendor_name: 'Savenors Market',
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.rothschild_tasting,
      category: 'specialty_items' as const,
      description: 'White truffle — 2 oz from Urbani',
      amount_cents: 32000,
      payment_method: 'card' as const,
      expense_date: daysAgo(22),
      vendor_name: 'Urbani Truffles',
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.garcia_quinceañera,
      category: 'groceries' as const,
      description: 'Bulk ingredients for 40',
      amount_cents: 48000,
      payment_method: 'card' as const,
      expense_date: daysAgo(57),
      vendor_name: 'Market Basket',
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.obrien_farmtable,
      category: 'groceries' as const,
      description: 'Local farm produce + proteins',
      amount_cents: 52000,
      payment_method: 'card' as const,
      expense_date: daysAgo(42),
      vendor_name: 'Wilson Farms + Drumlin Farm',
    },
    // General business expenses (no event)
    {
      tenant_id: TENANT_ID,
      event_id: null,
      category: 'equipment' as const,
      description: 'New Vitamix Pro 750',
      amount_cents: 54900,
      payment_method: 'card' as const,
      expense_date: daysAgo(90),
      vendor_name: 'Williams Sonoma',
    },
    {
      tenant_id: TENANT_ID,
      event_id: null,
      category: 'insurance_licenses' as const,
      description: 'Annual liability insurance renewal',
      amount_cents: 180000,
      payment_method: 'check' as const,
      expense_date: daysAgo(30),
      vendor_name: 'Hartford Insurance',
    },
    {
      tenant_id: TENANT_ID,
      event_id: null,
      category: 'marketing' as const,
      description: 'Business cards + website hosting',
      amount_cents: 12500,
      payment_method: 'card' as const,
      expense_date: daysAgo(15),
      vendor_name: 'Squarespace',
    },
  ]

  const { error } = await supabase.from('expenses').insert(expenses)
  if (error) console.error('Expense seed failed:', error.message)
  else console.log(`  ✅ ${expenses.length} expenses seeded`)
}

async function seedRecipes() {
  console.log('🍽️ Seeding recipes...')

  const recipes = [
    {
      id: R.lobster_bisque,
      tenant_id: TENANT_ID,
      name: 'Lobster Bisque',
      category: 'soup' as const,
      method:
        'Roast lobster shells with mirepoix. Deglaze with brandy. Simmer with tomato paste and stock for 1 hour. Strain, add cream, adjust seasoning. Finish with sherry and chive oil.',
      servings: 6,
      prep_time_minutes: 30,
      cook_time_minutes: 75,
    },
    {
      id: R.beef_wellington,
      tenant_id: TENANT_ID,
      name: 'Beef Wellington',
      category: 'protein' as const,
      method:
        'Sear tenderloin on all sides. Cool completely. Layer with mushroom duxelles and prosciutto. Wrap in puff pastry. Egg wash. Bake at 425°F for 25-30 min to 130°F internal.',
      servings: 8,
      prep_time_minutes: 60,
      cook_time_minutes: 35,
    },
    {
      id: R.crudo_bar,
      tenant_id: TENANT_ID,
      name: 'Crudo Bar Selection',
      category: 'appetizer' as const,
      method:
        'Slice fresh fish (tuna, hamachi, salmon) paper thin. Arrange on chilled plates. Top with citrus segments, shaved fennel, Maldon salt, EVOO, micro herbs. Serve immediately on ice.',
      servings: 12,
      prep_time_minutes: 45,
      cook_time_minutes: 0,
    },
    {
      id: R.risotto,
      tenant_id: TENANT_ID,
      name: 'Saffron Risotto',
      category: 'starch' as const,
      method:
        'Toast arborio in butter. Add white wine. Ladle in warm stock gradually, stirring constantly for 18-20 min. Bloom saffron threads in warm stock. Fold in saffron, mascarpone, and parmigiano. Rest 2 min. Serve immediately.',
      servings: 4,
      prep_time_minutes: 10,
      cook_time_minutes: 25,
    },
    {
      id: R.tiramisu,
      tenant_id: TENANT_ID,
      name: 'Classic Tiramisu',
      category: 'dessert' as const,
      method:
        'Whip egg yolks with sugar until ribbon stage. Fold in mascarpone. Whip cream to soft peaks, fold in. Dip ladyfingers in espresso + Marsala. Layer: biscuits, cream, biscuits, cream. Chill 6+ hours. Dust with cocoa.',
      servings: 8,
      prep_time_minutes: 30,
      cook_time_minutes: 0,
    },
    {
      id: R.mole_negro,
      tenant_id: TENANT_ID,
      name: 'Mole Negro',
      category: 'sauce' as const,
      method:
        'Toast and rehydrate 5 dried chiles (ancho, mulato, pasilla, chipotle, guajillo). Char tomatoes, onion, garlic. Blend with chocolate, plantain, sesame, spices. Simmer 2 hours minimum, stirring frequently. Strain for silk.',
      servings: 20,
      prep_time_minutes: 45,
      cook_time_minutes: 120,
    },
    {
      id: R.pork_belly,
      tenant_id: TENANT_ID,
      name: 'Braised Pork Belly',
      category: 'protein' as const,
      method:
        'Score skin. Dry brine overnight. Braise at 300°F for 3 hours in stock, soy, mirin, ginger. Cool in liquid. Slice into portions. Sear skin-side down until crackling. Rest 5 min.',
      servings: 6,
      prep_time_minutes: 20,
      cook_time_minutes: 195,
    },
    {
      id: R.ceviche,
      tenant_id: TENANT_ID,
      name: 'Peruvian Ceviche',
      category: 'appetizer' as const,
      method:
        'Dice fresh sea bass into 1cm cubes. Marinate in lime juice (leche de tigre) with red onion, aji amarillo, cilantro, salt. 15 min max — fish should be opaque on outside, raw center. Serve with sweet potato and corn.',
      servings: 6,
      prep_time_minutes: 25,
      cook_time_minutes: 0,
    },
  ]

  const { error } = await supabase.from('recipes').upsert(recipes, { onConflict: 'id' })
  if (error) console.error('Recipe seed failed:', error.message)
  else console.log(`  ✅ ${recipes.length} recipes seeded`)
}

async function seedInquiries() {
  console.log('📬 Seeding inquiries...')

  const inquiries = [
    {
      id: I.newlead_sarah,
      tenant_id: TENANT_ID,
      channel: 'website' as const,
      status: 'new' as const,
      first_contact_at: isoTimestamp(-3),
      confirmed_occasion: 'Birthday dinner for 12',
      confirmed_guest_count: 12,
      confirmed_date: daysFromNow(30),
      confirmed_location: 'Brookline, MA',
      source_message:
        "Found you through Google. Looking for a private chef for my husband's birthday. 12 guests. Mediterranean theme ideally. Budget around $3,000.",
    },
    {
      id: I.newlead_james,
      tenant_id: TENANT_ID,
      channel: 'referral' as const,
      status: 'new' as const,
      first_contact_at: isoTimestamp(-1),
      referral_source: 'referral' as const,
      confirmed_occasion: 'Corporate retreat dinner',
      confirmed_guest_count: 25,
      confirmed_date: daysFromNow(45),
      confirmed_location: 'Plymouth, MA',
      source_message:
        'Sofia Martinez referred me. We need a chef for a company retreat. 25 people, mix of dietary needs. Outdoor setting.',
    },
    {
      id: I.awaitingchef,
      tenant_id: TENANT_ID,
      channel: 'email' as const,
      status: 'awaiting_chef' as const,
      first_contact_at: isoTimestamp(-5),
      confirmed_occasion: 'Rehearsal dinner',
      confirmed_guest_count: 30,
      confirmed_date: daysFromNow(60),
      confirmed_location: 'Salem, MA',
      source_message:
        'Planning a rehearsal dinner for our daughter. 30 guests. Looking for Italian family-style.',
    },
    {
      id: I.quoted,
      tenant_id: TENANT_ID,
      channel: 'instagram' as const,
      status: 'quoted' as const,
      first_contact_at: isoTimestamp(-14),
      confirmed_occasion: 'Dinner party for 8',
      confirmed_guest_count: 8,
      confirmed_date: daysFromNow(20),
      confirmed_location: 'Somerville, MA',
      source_message: 'Love your Instagram! Can you do a tasting menu for 8?',
    },
    {
      id: I.declined,
      tenant_id: TENANT_ID,
      channel: 'phone' as const,
      status: 'declined' as const,
      first_contact_at: isoTimestamp(-20),
      decline_reason: 'wrong_date',
      confirmed_occasion: 'Graduation party',
      confirmed_guest_count: 50,
      confirmed_date: daysAgo(10),
      confirmed_location: 'Worcester, MA',
      source_message: 'Need a chef for a graduation party. 50 guests, casual BBQ.',
    },
  ]

  const { error } = await supabase.from('inquiries').upsert(inquiries, { onConflict: 'id' })
  if (error) console.error('Inquiry seed failed:', error.message)
  else console.log(`  ✅ ${inquiries.length} inquiries seeded`)
}

async function seedMessages() {
  console.log('💬 Seeding inquiry messages...')

  const messages = [
    // New lead Sarah — 2 messages
    {
      tenant_id: TENANT_ID,
      inquiry_id: I.newlead_sarah,
      direction: 'inbound' as const,
      channel: 'email' as const,
      body: "Found you through Google. Looking for a private chef for my husband's birthday. 12 guests. Mediterranean theme ideally. Budget around $3,000.",
      subject: 'Birthday dinner inquiry',
      status: 'logged' as const,
      created_at: isoTimestamp(-3),
    },
    {
      tenant_id: TENANT_ID,
      inquiry_id: I.newlead_sarah,
      direction: 'outbound' as const,
      channel: 'email' as const,
      body: "Thank you for reaching out! I'd love to help make your husband's birthday special. Mediterranean is one of my specialties. Let me put together some menu options for you.",
      subject: 'Re: Birthday dinner inquiry',
      status: 'sent' as const,
      created_at: isoTimestamp(-2),
    },
    // Referral lead — 1 message
    {
      tenant_id: TENANT_ID,
      inquiry_id: I.newlead_james,
      direction: 'inbound' as const,
      channel: 'email' as const,
      body: 'Sofia Martinez referred me. We need a chef for a company retreat. 25 people, mix of dietary needs. Outdoor setting.',
      subject: 'Corporate retreat dinner',
      status: 'logged' as const,
      created_at: isoTimestamp(-1),
    },
    // Awaiting chef — 3 messages
    {
      tenant_id: TENANT_ID,
      inquiry_id: I.awaitingchef,
      direction: 'inbound' as const,
      channel: 'email' as const,
      body: 'Planning a rehearsal dinner for our daughter. 30 guests. Looking for Italian family-style.',
      subject: 'Rehearsal dinner inquiry',
      status: 'logged' as const,
      created_at: isoTimestamp(-5),
    },
    {
      tenant_id: TENANT_ID,
      inquiry_id: I.awaitingchef,
      direction: 'outbound' as const,
      channel: 'email' as const,
      body: 'Congratulations! Italian family-style is perfect for a rehearsal dinner. I have a few questions about allergies and venue. Can we schedule a call?',
      subject: 'Re: Rehearsal dinner inquiry',
      status: 'sent' as const,
      created_at: isoTimestamp(-4),
    },
    {
      tenant_id: TENANT_ID,
      inquiry_id: I.awaitingchef,
      direction: 'inbound' as const,
      channel: 'email' as const,
      body: 'That sounds great! Two guests are vegetarian, one is lactose intolerant. The venue is an old barn in Salem — it has a kitchen. Call me anytime after 2pm.',
      subject: 'Re: Re: Rehearsal dinner inquiry',
      status: 'logged' as const,
      created_at: isoTimestamp(-3),
    },
  ]

  const { error } = await supabase.from('messages').insert(messages)
  if (error) console.error('Message seed failed:', error.message)
  else console.log(`  ✅ ${messages.length} messages seeded`)
}

async function seedQuotes() {
  console.log('📋 Seeding quotes...')

  const quotes = [
    {
      id: Q.martinez_wedding,
      tenant_id: TENANT_ID,
      client_id: C.martinez,
      event_id: E.martinez_wedding,
      status: 'accepted' as const,
      pricing_model: 'per_person' as const,
      total_quoted_cents: 4800000,
      deposit_amount_cents: 2400000,
      internal_notes:
        '85 guests × ~$565/head. Includes staff, rentals, all ingredients. Mole negro + 6 other courses.',
      valid_until: '2025-09-01',
      created_at: isoTimestamp(-210),
    },
    {
      id: Q.chen_corporate,
      tenant_id: TENANT_ID,
      client_id: C.chen,
      event_id: E.chen_corporate,
      status: 'accepted' as const,
      pricing_model: 'per_person' as const,
      total_quoted_cents: 360000,
      deposit_amount_cents: 180000,
      internal_notes: '20 guests × $180/head. All vegan, organic. 3 courses.',
      valid_until: '2025-12-15',
      created_at: isoTimestamp(-70),
    },
    {
      id: Q.rothschild_tasting,
      tenant_id: TENANT_ID,
      client_id: C.rothschild,
      event_id: E.rothschild_tasting,
      status: 'accepted' as const,
      pricing_model: 'per_person' as const,
      total_quoted_cents: 135000,
      deposit_amount_cents: 67500,
      internal_notes:
        '6 guests × $225/head. 9-course tasting. Wagyu A5, truffle, premium ingredients.',
      valid_until: '2026-02-01',
      created_at: isoTimestamp(-30),
    },
    {
      id: Q.henderson_spring,
      tenant_id: TENANT_ID,
      client_id: C.henderson,
      event_id: E.henderson_spring,
      status: 'sent' as const,
      pricing_model: 'per_person' as const,
      total_quoted_cents: 210000,
      deposit_amount_cents: 105000,
      internal_notes: '14 guests × $150/head. 5-course spring garden menu. Outdoor setting.',
      valid_until: daysFromNow(30),
      created_at: isoTimestamp(-7),
    },
    {
      id: Q.park_baby_shower,
      tenant_id: TENANT_ID,
      client_id: C.park,
      event_id: E.park_baby_shower,
      status: 'draft' as const,
      pricing_model: 'flat_rate' as const,
      total_quoted_cents: 240000,
      deposit_amount_cents: 120000,
      internal_notes:
        'Baby shower brunch/tea. 20 guests. Flat rate. Gluten-free. Pastel presentation.',
      valid_until: daysFromNow(60),
      created_at: isoTimestamp(-2),
    },
  ]

  const { error } = await supabase.from('quotes').upsert(quotes, { onConflict: 'id' })
  if (error) console.error('Quote seed failed:', error.message)
  else console.log(`  ✅ ${quotes.length} quotes seeded`)
}

async function seedStaff() {
  console.log('👩‍🍳 Seeding staff...')

  const staff = [
    {
      id: STAFF.maria,
      chef_id: TENANT_ID,
      name: 'Maria Santos',
      role: 'sous_chef' as const,
      email: 'maria.santos@eval.test',
      phone: '617-555-2001',
      hourly_rate_cents: 3500,
      status: 'active',
    },
    {
      id: STAFF.tony,
      chef_id: TENANT_ID,
      name: 'Tony Russo',
      role: 'service_staff' as const,
      email: 'tony.russo@eval.test',
      phone: '617-555-2002',
      hourly_rate_cents: 2500,
      status: 'active',
    },
    {
      id: STAFF.jake,
      chef_id: TENANT_ID,
      name: 'Jake Williams',
      role: 'kitchen_assistant' as const,
      email: 'jake.williams@eval.test',
      phone: '617-555-2003',
      hourly_rate_cents: 2200,
      status: 'active',
    },
    {
      id: STAFF.lisa,
      chef_id: TENANT_ID,
      name: 'Lisa Park',
      role: 'bartender' as const,
      email: 'lisa.park@eval.test',
      phone: '617-555-2004',
      hourly_rate_cents: 2800,
      status: 'active',
    },
  ]

  const { error } = await supabase.from('staff_members').upsert(staff, { onConflict: 'id' })
  if (error) console.error('Staff seed failed:', error.message)
  else console.log(`  ✅ ${staff.length} staff members seeded`)
}

async function seedMemories() {
  console.log('🧠 Seeding Remy memories...')

  const memories = [
    // Chef preferences
    {
      tenant_id: TENANT_ID,
      category: 'chef_preference',
      content:
        '[eval] I prefer organic produce whenever possible, especially for leafy greens and berries',
      importance: 6,
      content_hash: sha256('eval-mem-1'),
    },
    {
      tenant_id: TENANT_ID,
      category: 'chef_preference',
      content: '[eval] Always use Maldon sea salt for finishing, never regular table salt',
      importance: 5,
      content_hash: sha256('eval-mem-2'),
    },
    // Pricing patterns
    {
      tenant_id: TENANT_ID,
      category: 'pricing_pattern',
      content:
        '[eval] I charge $150/head for standard tasting menus, $200+ for premium (wagyu/truffle/etc)',
      importance: 8,
      content_hash: sha256('eval-mem-3'),
    },
    {
      tenant_id: TENANT_ID,
      category: 'pricing_pattern',
      content: '[eval] Corporate events: $100-120/head for buffet, $140-160/head for plated',
      importance: 7,
      content_hash: sha256('eval-mem-4'),
    },
    {
      tenant_id: TENANT_ID,
      category: 'pricing_pattern',
      content: '[eval] Always require 50% deposit upfront, balance due 48 hours before event',
      importance: 9,
      content_hash: sha256('eval-mem-5'),
    },
    // Client insights
    {
      tenant_id: TENANT_ID,
      category: 'client_insight',
      content:
        '[eval] Victoria Davis tends to pay late — always send a gentle reminder around day 7',
      importance: 7,
      content_hash: sha256('eval-mem-6'),
      related_client_id: C.davis,
    },
    {
      tenant_id: TENANT_ID,
      category: 'client_insight',
      content:
        "[eval] The Martinez family loves when I recreate dishes from their wedding — it's their love language",
      importance: 6,
      content_hash: sha256('eval-mem-7'),
      related_client_id: C.martinez,
    },
    {
      tenant_id: TENANT_ID,
      category: 'client_insight',
      content:
        '[eval] Emma Rothschild is extremely private — never post photos of her events on social media',
      importance: 9,
      content_hash: sha256('eval-mem-8'),
      related_client_id: C.rothschild,
    },
    // Scheduling
    {
      tenant_id: TENANT_ID,
      category: 'scheduling_pattern',
      content:
        '[eval] Never book more than 2 events in the same weekend — quality drops on the third',
      importance: 8,
      content_hash: sha256('eval-mem-9'),
    },
    {
      tenant_id: TENANT_ID,
      category: 'scheduling_pattern',
      content: '[eval] Always do grocery shopping the day before, never day-of',
      importance: 7,
      content_hash: sha256('eval-mem-10'),
    },
    // Business rules
    {
      tenant_id: TENANT_ID,
      category: 'business_rule',
      content:
        '[eval] Target food cost: 28-32% of revenue. Over 35% means I need to rethink the menu',
      importance: 8,
      content_hash: sha256('eval-mem-11'),
    },
    {
      tenant_id: TENANT_ID,
      category: 'business_rule',
      content: '[eval] For events over 30 guests, always bring at least 2 staff (sous + service)',
      importance: 7,
      content_hash: sha256('eval-mem-12'),
    },
    // Culinary notes
    {
      tenant_id: TENANT_ID,
      category: 'culinary_note',
      content:
        '[eval] My signature move: saffron risotto with mascarpone and gold leaf for special occasions',
      importance: 5,
      content_hash: sha256('eval-mem-13'),
    },
    {
      tenant_id: TENANT_ID,
      category: 'culinary_note',
      content:
        '[eval] Sous vide wagyu at 137°F for 2 hours, then sear on cast iron at screaming hot for 45 seconds per side',
      importance: 5,
      content_hash: sha256('eval-mem-14'),
    },
    // Workflow
    {
      tenant_id: TENANT_ID,
      category: 'workflow_preference',
      content: '[eval] Always send a thank-you email within 24 hours of completing an event',
      importance: 6,
      content_hash: sha256('eval-mem-15'),
    },
  ]

  const { error } = await supabase.from('remy_memories').insert(memories)
  if (error) console.error('Memory seed failed:', error.message)
  else console.log(`  ✅ ${memories.length} memories seeded`)
}

async function seedReviews() {
  console.log('⭐ Seeding reviews...')

  const reviews = [
    {
      tenant_id: TENANT_ID,
      event_id: E.martinez_wedding,
      client_id: C.martinez,
      rating: 5,
      feedback_text:
        'The mole negro was transcendent. Every single guest commented on the food. Chef Marco made our wedding unforgettable.',
      display_consent: true,
      created_at: isoTimestamp(-175),
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.henderson_birthday,
      client_id: C.henderson,
      rating: 5,
      feedback_text:
        'The crudo bar was incredible and the service was impeccable. James had no idea — the surprise was perfect.',
      display_consent: true,
      created_at: isoTimestamp(-118),
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.obrien_farmtable,
      client_id: C.obrien,
      rating: 5,
      feedback_text:
        "Best farm-to-table dinner I've ever hosted. Everything was local, everything was fresh. Even invited the chef to join us for dessert — felt like family.",
      display_consent: true,
      created_at: isoTimestamp(-38),
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.patel_cookingclass,
      client_id: C.patel,
      rating: 4,
      feedback_text:
        'Wonderful cooking class! Everyone learned so much about Indian spices. Would love to do another one focused on South Indian cuisine.',
      display_consent: true,
      created_at: isoTimestamp(-48),
    },
    {
      tenant_id: TENANT_ID,
      event_id: E.park_anniversary,
      client_id: C.park,
      rating: 5,
      feedback_text:
        'Every single plate was picture-perfect. My Instagram blew up. The flavors matched the presentation. Already planning our next event!',
      display_consent: true,
      created_at: isoTimestamp(-33),
    },
  ]

  const { error } = await supabase.from('client_reviews').insert(reviews)
  if (error) console.error('Review seed failed:', error.message)
  else console.log(`  ✅ ${reviews.length} reviews seeded`)
}

async function seedMenus() {
  console.log('📜 Seeding menus...')

  const menus = [
    {
      id: M.spring_tasting,
      tenant_id: TENANT_ID,
      name: 'Spring Garden Tasting',
      status: 'draft' as const,
      description:
        '5-course spring menu featuring local asparagus, lamb, pea shoots, ramps, and strawberry finisher',
    },
    {
      id: M.italian_night,
      tenant_id: TENANT_ID,
      name: 'Italian Family Style',
      status: 'shared' as const,
      description: 'Rustic Italian family-style: antipasti, handmade pasta, osso buco, tiramisu',
    },
    {
      id: M.corporate_lunch,
      tenant_id: TENANT_ID,
      name: 'Corporate Lunch Buffet',
      status: 'locked' as const,
      description:
        'Professional buffet: 2 proteins, 3 sides, 2 salads, dessert station. Accommodates all dietary needs.',
    },
    {
      id: M.farm_table,
      tenant_id: TENANT_ID,
      name: 'Farm-to-Table Harvest',
      status: 'archived' as const,
      description: 'All ingredients sourced within 50 miles. Seasonal, rustic plating. 5 courses.',
    },
  ]

  const { error } = await supabase.from('menus').upsert(menus, { onConflict: 'id' })
  if (error) console.error('Menu seed failed:', error.message)
  else console.log(`  ✅ ${menus.length} menus seeded`)
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const isClean = process.argv.includes('--clean')

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║         Remy Eval — Test Data Seeder                ║')
  console.log('╠══════════════════════════════════════════════════════╣')
  console.log(`║  Tenant:  ${TENANT_ID}   ║`)
  console.log(
    `║  Mode:    ${isClean ? 'CLEAN + SEED' : 'SEED (upsert)'}${' '.repeat(isClean ? 27 : 22)}║`
  )
  console.log('╚══════════════════════════════════════════════════════╝\n')

  if (isClean) {
    await cleanup()
    console.log('')
  }

  // Seed in dependency order
  await seedChefProfile()
  await seedClients()
  await seedEvents()
  await seedLedgerEntries()
  await seedExpenses()
  await seedQuotes()
  await seedRecipes()
  await seedMenus()
  await seedStaff()
  await seedMemories()
  await seedInquiries()
  await seedMessages()
  await seedReviews()

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║         ✅ Seed Complete                            ║')
  console.log('╠══════════════════════════════════════════════════════╣')
  console.log('║  15 clients (bronze → platinum, diverse stories)    ║')
  console.log('║  28 events (all 8 statuses, past + future)          ║')
  console.log('║  21 ledger entries (revenue, deposits, tips)        ║')
  console.log('║  13 expenses (groceries, labor, equipment, biz)     ║')
  console.log('║   5 quotes (draft → accepted)                      ║')
  console.log('║   8 recipes (soups → desserts)                     ║')
  console.log('║   4 menus (draft → archived)                      ║')
  console.log('║   5 inquiries (new → declined)                     ║')
  console.log('║   6 messages (inbound/outbound threads)             ║')
  console.log('║   4 staff members (sous, service, kitchen, bar)     ║')
  console.log('║  15 memories (prefs, pricing, clients, rules)       ║')
  console.log('║   5 reviews (4-5 stars, public)                    ║')
  console.log('╠══════════════════════════════════════════════════════╣')
  console.log('║  Run eval: npx tsx scripts/remy-eval/eval-harness.ts║')
  console.log('╚══════════════════════════════════════════════════════╝')
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
