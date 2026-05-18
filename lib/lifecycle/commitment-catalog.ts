export type CommitmentItem = {
  label: string
}

export type CommitmentCategory = {
  name: string
  items: CommitmentItem[]
}

export type JourneyStage = {
  number: number
  name: string
  tagline: string
  categories: CommitmentCategory[]
}

export const COMMITMENT_CATALOG: JourneyStage[] = [
  {
    number: 1,
    name: 'Inquiry Received',
    tagline:
      'Speed matters. Every hour without a response increases the chance of losing the booking.',
    categories: [
      {
        name: 'Contact Capture',
        items: [
          { label: 'Date and time of inquiry' },
          { label: 'Source tracked (website, email, phone, text, DM, referral, platform)' },
          { label: 'Referral source noted (if referred, by whom)' },
          { label: 'Host name' },
          { label: 'Host email' },
          { label: 'Host phone number' },
          { label: 'Preferred communication channel identified' },
        ],
      },
      {
        name: 'Event Basics',
        items: [
          { label: 'Event date or flexible range' },
          { label: 'Guest count including host' },
          { label: 'Event location (full address or TBD)' },
          { label: 'Event type (dinner, party, corporate, wedding, milestone, etc.)' },
          { label: 'How they heard about you' },
          { label: 'Initial budget range (if volunteered)' },
          { label: 'Immediate requests or special notes' },
        ],
      },
      {
        name: 'Response',
        items: [
          { label: 'Inquiry assigned to correct chef' },
          { label: 'Auto-acknowledgment sent' },
          { label: 'Personal response sent (target: 2 hours, max: 24 hours)' },
          { label: 'Response time tracked for metrics' },
        ],
      },
    ],
  },
  {
    number: 2,
    name: 'Discovery',
    tagline:
      'Collect everything needed to build an accurate quote and a menu the client will love.',
    categories: [
      {
        name: 'Guest & Dietary',
        items: [
          { label: 'Full guest list collected (names, not just count)' },
          { label: 'Per-guest dietary restrictions collected' },
          { label: 'Severity confirmed (allergy vs. preference vs. life-threatening)' },
          { label: 'Children attending (ages, separate menu needed?)' },
          { label: 'Dietary info confirmed directly with guests, not just host memory' },
        ],
      },
      {
        name: 'Cuisine Preferences',
        items: [
          { label: 'Cuisine likes, dislikes, cravings, themes' },
          { label: 'Hard-no ingredients noted' },
          { label: 'Favorite restaurants or dishes mentioned (style indicators)' },
          { label: 'Previous private chef experiences discussed' },
          { label: 'Comfort level with adventurous food assessed' },
          { label: 'Course count discussed (3-course, 5-course, tasting, etc.)' },
          { label: 'Service style confirmed (plated, family, buffet, stations, passed)' },
        ],
      },
      {
        name: 'Budget & Value',
        items: [
          { label: 'Budget discussed (per person, flat rate, or open-ended)' },
          { label: 'What is included in the price explained' },
          { label: 'Grocery cost model explained (included vs. pass-through)' },
          { label: 'Gratuity policy communicated' },
          { label: 'Client expectations discussed (what does success look like?)' },
        ],
      },
      {
        name: 'Beverages',
        items: [
          { label: 'Drink and bar expectations discussed' },
          { label: 'Wine or cocktail pairing interest level' },
          { label: 'Beverage budget (if separate from food)' },
          { label: 'Bar setup needs (glassware, ice, mixers)' },
        ],
      },
      {
        name: 'Venue & Kitchen',
        items: [
          { label: 'Kitchen situation discussed (full, outdoor, limited, commercial)' },
          { label: 'Kitchen visit needed (first-time venue flag)' },
          { label: 'Dining space discussed (indoor, outdoor, table size, seating)' },
          { label: 'Equipment chef needs to bring vs. what is on-site' },
          { label: 'Parking and loading access' },
          { label: 'Elevator or stairs for equipment transport' },
        ],
      },
      {
        name: 'Event Details',
        items: [
          { label: 'Special occasion details captured' },
          { label: 'Surprise element? (coordination details if so)' },
          { label: 'Vibe and atmosphere preferences' },
          { label: 'Dress code for chef and staff' },
          { label: 'Table setting and presentation expectations' },
          { label: 'Flowers, decor, or other vendor coordination' },
          { label: 'Photography and social media preferences' },
          { label: 'Confidentiality requirements (NDA if needed)' },
        ],
      },
      {
        name: 'Communication',
        items: [
          { label: 'Primary contact person confirmed' },
          { label: 'Best way to reach them' },
          { label: 'Response time expectations set (both directions)' },
          { label: 'Social media consent obtained' },
        ],
      },
      {
        name: 'Tasting (If Applicable)',
        items: [
          { label: 'Tasting dinner offered' },
          { label: 'Tasting date scheduled' },
          { label: 'Tasting menu planned and executed' },
          { label: 'Tasting feedback received' },
        ],
      },
    ],
  },
  {
    number: 3,
    name: 'Quote',
    tagline:
      'Translating discovery into a price. Clarity and professionalism set the tone for the engagement.',
    categories: [
      {
        name: 'Drafting',
        items: [
          { label: 'Quote drafted (itemized breakdown or flat rate)' },
          { label: 'Includes food cost, service fee, travel, equipment rental, staff' },
          { label: 'Grocery cost model clear (included vs. pass-through)' },
          { label: 'Gratuity policy included' },
          { label: 'Cancellation and reschedule policy included' },
          { label: 'Quote validity period stated' },
        ],
      },
      {
        name: 'Delivery & Negotiation',
        items: [
          { label: 'Quote sent to host' },
          { label: 'Follow-up sent if no response within 48 hours' },
          { label: 'Quote reviewed by host' },
          { label: 'Questions answered' },
          { label: 'Revisions requested and revised quote sent' },
        ],
      },
      {
        name: 'Deposit',
        items: [
          { label: 'Quote accepted and confirmed' },
          { label: 'Deposit amount and terms communicated' },
          { label: 'Deposit invoice sent' },
          { label: 'Deposit received and receipt sent' },
        ],
      },
    ],
  },
  {
    number: 4,
    name: 'Agreement',
    tagline:
      'The formal commitment. Protects both chef and client. Complexity scales with the event.',
    categories: [
      {
        name: 'Terms',
        items: [
          { label: 'Service agreement drafted' },
          {
            label: 'Scope of service, date, time, location, guest count, pricing, payment schedule',
          },
          { label: 'Cancellation policy detailed (tiered by timeframe)' },
          { label: 'Reschedule policy detailed' },
          { label: 'Liability and insurance terms' },
          { label: 'Kitchen access and condition terms' },
          { label: 'Grocery reimbursement model formalized' },
          { label: 'Confidentiality or NDA clause (if required)' },
          { label: 'Social media and photography rights' },
          { label: 'Force majeure clause (illness, weather, emergencies)' },
          { label: 'Dispute resolution process' },
          { label: 'Intellectual property clause (chef retains recipe IP)' },
        ],
      },
      {
        name: 'Execution',
        items: [
          { label: 'Agreement sent to client' },
          { label: 'Client questions or revisions addressed' },
          { label: 'Agreement signed by client' },
          { label: 'Agreement countersigned by chef' },
          { label: 'Signed copy stored and accessible to both parties' },
          { label: 'Insurance certificate provided to venue (if required)' },
        ],
      },
    ],
  },
  {
    number: 5,
    name: 'Menu Planning',
    tagline: 'Where artistry meets preferences. The creative heart of the engagement.',
    categories: [
      {
        name: 'Creation & Feedback',
        items: [
          { label: 'Rough draft menu created from discovery information' },
          { label: 'Menu accounts for every dietary restriction' },
          { label: 'Draft sent to host for feedback' },
          { label: 'Host feedback received' },
          { label: 'Menu revised based on feedback' },
          { label: 'Second draft sent if significant changes' },
        ],
      },
      {
        name: 'Timing & Style',
        items: [
          { label: 'Course timing and flow planned' },
          { label: 'Plating style decided for each course' },
          { label: 'Wine or cocktail pairings selected' },
          { label: 'Amuse-bouche or welcome bite planned' },
          { label: 'Bread and butter service planned' },
          { label: 'Intermezzo planned (if multi-course tasting)' },
          { label: 'Dessert and after-dinner offerings planned' },
        ],
      },
      {
        name: 'Finalization',
        items: [
          { label: 'Menu descriptions written (client-facing)' },
          { label: 'Final menu confirmed by host' },
          { label: 'Final menu locked (no more changes)' },
          { label: 'Menu shared with guests (if host wants)' },
          { label: 'Printed or digital menu cards prepared' },
        ],
      },
    ],
  },
  {
    number: 6,
    name: 'Pre-Service Logistics',
    tagline:
      'Everything between confirmed menu and walking in the door. Operational excellence prevents day-of chaos.',
    categories: [
      {
        name: 'Final Confirmations',
        items: [
          { label: 'Final guest count confirmed (48-72 hours before)' },
          { label: 'Final dietary re-check (new allergies, last-minute changes)' },
          { label: 'Final menu adjustments if guest count changed' },
          { label: 'Arrival time confirmed with host' },
          { label: 'Parking and access logistics confirmed' },
          { label: 'Confirmation message sent (day before or morning of)' },
          { label: 'Host reminded of anything they need to provide' },
        ],
      },
      {
        name: 'Shopping & Procurement',
        items: [
          { label: 'Shopping list built from final menu' },
          { label: 'Grocery budget approved (if pass-through)' },
          { label: 'Sourcing preferences confirmed (organic, local, kosher, halal)' },
          { label: 'Substitution protocol agreed (chef substitutes or calls first?)' },
          { label: 'Specialty items ordered in advance' },
          { label: 'Groceries purchased' },
          { label: 'Receipts saved for pass-through billing' },
          { label: 'All items verified against shopping list' },
          { label: 'Cold chain maintained (proper transport and storage)' },
        ],
      },
      {
        name: 'Equipment & Setup',
        items: [
          { label: 'Equipment checklist prepared' },
          { label: 'Equipment packed and loaded' },
          { label: 'Rentals arranged (plates, linens, glassware, chafing dishes)' },
          { label: 'Rental delivery and pickup confirmed' },
          { label: 'Disposables purchased' },
          { label: 'Uniforms and chef coat prepared' },
        ],
      },
      {
        name: 'Staff Coordination',
        items: [
          { label: 'Sous chef or assistant sourced and confirmed' },
          { label: 'Servers sourced and confirmed' },
          { label: 'Bartender sourced (if applicable)' },
          { label: 'Cleanup crew confirmed' },
          { label: 'Staff briefed on menu, timing, dietary, service style' },
          { label: 'Staff arrival time and dress code communicated' },
          { label: 'Staff payment terms confirmed' },
          { label: 'Background checks completed (if high-profile)' },
        ],
      },
      {
        name: 'Prep Schedule',
        items: [
          { label: 'Prep timeline built (what gets done when)' },
          { label: 'Prep-ahead items identified (what can be done day before)' },
          { label: 'Day-before prep completed' },
          { label: 'Day-of prep timeline confirmed' },
          { label: 'Course-by-course execution timeline built' },
          { label: 'Cleanup timeline estimated' },
        ],
      },
      {
        name: 'Vendor Coordination',
        items: [
          { label: 'Event planner synced on timeline' },
          { label: 'Florist delivery time confirmed' },
          { label: 'Photographer arrival confirmed' },
          { label: 'Rental company delivery and pickup times confirmed' },
          { label: 'Beverage vendor delivery confirmed' },
        ],
      },
    ],
  },
  {
    number: 7,
    name: 'Payment',
    tagline: 'Financial clarity at every step. No surprises for either party.',
    categories: [
      {
        name: 'Calculation',
        items: [
          { label: 'Remaining balance calculated after deposit' },
          { label: 'Grocery costs finalized (receipts compiled if pass-through)' },
          { label: 'Additional charges itemized (extra guests, special requests, rentals)' },
          { label: 'Credits applied (overpayment, issue resolution)' },
        ],
      },
      {
        name: 'Collection',
        items: [
          { label: 'Final invoice sent' },
          { label: 'Payment method confirmed' },
          { label: 'Payment due date communicated' },
          { label: 'Final payment received' },
          { label: 'Payment confirmed and receipt sent' },
          { label: 'Grocery receipts shared with client (if pass-through)' },
        ],
      },
      {
        name: 'Reconciliation',
        items: [
          { label: 'Gratuity received' },
          { label: 'Gratuity distributed to staff' },
          { label: 'Tax documentation prepared' },
          { label: 'Corporate invoicing handled (net-30, purchase orders)' },
          { label: 'Financial reconciliation complete (actual vs. estimated, margin calculated)' },
        ],
      },
    ],
  },
  {
    number: 8,
    name: 'Service Day',
    tagline: 'Execution. Everything before this was preparation. This is the performance.',
    categories: [
      {
        name: 'Arrival & Setup',
        items: [
          { label: 'Arrived at venue on time' },
          { label: 'Venue walkthrough or kitchen verified' },
          { label: 'Equipment unloaded and organized' },
          { label: 'Kitchen workspace set up' },
          { label: 'Staff arrived and briefed' },
          { label: 'Ingredients organized and prepped for first course' },
          { label: 'Table and dining area inspected' },
        ],
      },
      {
        name: 'Execution',
        items: [
          { label: 'Welcome check-in with host (confirm timeline, last-minute notes)' },
          { label: 'Amuse-bouche or welcome bite served' },
          { label: 'Each course executed on timeline' },
          { label: 'Dietary-restricted plates correctly identified and served to right guests' },
          { label: 'Pacing adjusted based on guest energy' },
          { label: 'Pairings served with correct courses' },
          { label: 'Real-time adjustments noted (substitutions, timing, guest requests)' },
          { label: 'Chef interacted with guests (if appropriate for the vibe)' },
          { label: 'Menu cards or course descriptions presented' },
        ],
      },
      {
        name: 'Cleanup & Departure',
        items: [
          { label: 'Kitchen cleaned to pre-arrival condition or better' },
          { label: 'All equipment packed' },
          { label: 'Trash taken out' },
          { label: 'Leftovers packaged and labeled' },
          { label: 'Leftover policy communicated' },
          { label: 'Final check-in with host before leaving' },
          { label: 'Departure time noted' },
          { label: 'Rentals staged for pickup' },
          { label: 'Nothing left behind' },
        ],
      },
    ],
  },
  {
    number: 9,
    name: 'Post-Service',
    tagline:
      'The experience does not end when you leave. This builds the relationship and generates future business.',
    categories: [
      {
        name: 'Follow-Up (Within 24 Hours)',
        items: [
          { label: 'Thank-you message sent to host' },
          { label: 'Personal touch included (reference a specific dinner moment)' },
          { label: 'Photos shared (if taken during service)' },
          { label: 'Leftover storage and reheating instructions sent' },
        ],
      },
      {
        name: 'Reviews (Within 48-72 Hours)',
        items: [
          { label: 'Review request sent with direct link' },
          { label: 'Review received' },
          { label: 'Review responded to publicly' },
          { label: 'Testimonial permission requested' },
          { label: 'Negative feedback addressed directly and professionally' },
        ],
      },
      {
        name: 'Financial Close',
        items: [
          { label: 'All payments received and reconciled' },
          { label: 'Outstanding balance followed up on' },
          { label: 'Grocery reconciliation shared (actuals vs. estimate)' },
          { label: 'Overage or underage resolved' },
          { label: 'Tax documentation finalized' },
        ],
      },
      {
        name: 'Internal Debrief',
        items: [
          { label: 'After-action notes captured (what went well, what to improve)' },
          { label: 'Guest preferences noted for future bookings' },
          { label: 'Venue notes updated (kitchen quirks, parking tips, equipment gaps)' },
          { label: 'Recipe notes updated (modifications made during service)' },
          { label: 'Staff performance noted (who to rebook, who to skip)' },
          { label: 'Time tracking completed (prep, travel, service, cleanup)' },
          { label: 'Profitability calculated (revenue minus all costs including time)' },
        ],
      },
    ],
  },
  {
    number: 10,
    name: 'Client Lifecycle',
    tagline: 'The long game. One-time clients become regulars. Regulars become advocates.',
    categories: [
      {
        name: 'Profile Maintenance',
        items: [
          { label: 'Client profile updated with preferences, restrictions, and notes' },
          { label: 'Client tier classified (one-time, occasional, regular, VIP, corporate)' },
          { label: 'Preferred menu styles documented' },
          { label: 'Preferred communication style noted' },
          { label: 'Key dates captured (birthdays, anniversaries, annual events)' },
          { label: 'Household changes tracked (new baby, dietary needs, moved address)' },
        ],
      },
      {
        name: 'Retention',
        items: [
          { label: 'Rebooking follow-up sent (2-4 weeks after service)' },
          { label: 'Seasonal outreach (holiday menus, summer grilling)' },
          { label: 'Anniversary of first booking acknowledged' },
          { label: 'Recurring booking template created (for regular clients)' },
          { label: 'Loyalty program engagement tracked' },
          { label: 'Win-back campaign triggered if no booking in X months' },
        ],
      },
      {
        name: 'Growth',
        items: [
          { label: 'Referral request made after positive experience' },
          { label: 'Referral tracked (who referred whom)' },
          { label: 'Referral reward sent (if program exists)' },
          { label: 'Client featured in marketing (with permission)' },
        ],
      },
    ],
  },
]
