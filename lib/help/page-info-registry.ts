// Page Info Registry — Help content for every page in ChefFlow
// Used by <PageInfoButton /> to show contextual help overlays.
//
// To add help for a new page:
// 1. Add an entry keyed by its route path (e.g., '/events')
// 2. For dynamic routes, use [id] (e.g., '/events/[id]')
// 3. Optionally add annotations[] to enable schematic overlay mode
//    (annotations require matching data-info attributes on page elements)

export interface PageAnnotation {
  /** CSS selector to find the element (e.g., '[data-info="queue"]', '#invite', 'h1') */
  selector: string
  /** Short label (e.g., "Priority Queue") */
  label: string
  /** What it does */
  description: string
  /** Which side to place the label — auto-detected if omitted */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export interface PageInfoEntry {
  title: string
  description: string
  features: string[]
  annotations?: PageAnnotation[]
}

export const PAGE_INFO_REGISTRY: Record<string, PageInfoEntry> = {
  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Core Pages
  // ═══════════════════════════════════════════════════════

  '/dashboard': {
    title: 'Dashboard',
    description:
      'Your command center — see what needs attention right now, upcoming events, and key business metrics at a glance.',
    features: [
      "Today's schedule and prep tasks",
      'Priority action queue sorted by urgency',
      'Week-at-a-glance calendar strip',
      'Revenue, expenses, and profit snapshot',
      'Client follow-up reminders and accountability',
      'Quote acceptance insights and pipeline forecast',
      'Customizable widgets — enable, disable, and reorder from settings',
    ],
    annotations: [
      {
        selector: 'h1',
        label: 'Page Title',
        description: "Shows which section of ChefFlow you're in",
      },
      {
        selector: '[data-info="queue"]',
        label: 'Priority Queue',
        description:
          'Your most urgent tasks sorted by deadline — events, follow-ups, quotes that need action',
      },
      {
        selector: '[data-info="week-strip"]',
        label: 'Week Strip',
        description: 'Quick view of your schedule for the next 7 days — tap any day to see details',
      },
      {
        selector: '[data-info="financials"]',
        label: 'Financial Snapshot',
        description: 'Revenue, expenses, and profit at a glance for the current month',
      },
      {
        selector: '[data-info="next-action"]',
        label: 'Next Action',
        description: 'The single most important thing you should do right now',
      },
    ],
  },

  '/commands': {
    title: 'Remy Command Center',
    description:
      'Your AI assistant hub — talk to Remy, review past conversations, and manage AI settings.',
    features: [
      'Chat with Remy for business advice and drafting',
      'Review conversation history',
      'Manage AI memory and context',
      'Privacy controls for AI features',
    ],
  },

  '/remy': {
    title: 'Remy History',
    description:
      'Browse everything Remy has created — drafts, suggestions, and past conversations.',
    features: [
      'Search past AI-generated content',
      'View conversation history',
      'Re-use previous drafts and suggestions',
    ],
  },

  '/queue': {
    title: 'Priority Queue',
    description:
      'Everything that needs your attention, ranked by urgency across all domains — inquiries, events, quotes, finances, and more.',
    features: [
      'Items sorted by urgency (critical, high, normal, low)',
      'Domain filtering (inquiry, event, quote, financial, client, culinary)',
      'Direct links to take action on each item',
      'Summary bar showing counts by domain and urgency',
    ],
  },

  '/daily': {
    title: 'Daily Operations',
    description:
      'Your daily operational checklist — everything happening today in one focused view.',
    features: [
      'Day-of-party tasks and prep reminders',
      "Today's schedule at a glance",
      'Daily prep checklist',
      'Overdue items from previous days',
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Events
  // ═══════════════════════════════════════════════════════

  '/events': {
    title: 'Events',
    description:
      'All your events in one place — filter by status, switch between list and kanban board views.',
    features: [
      'List view with sortable table',
      'Kanban board view organized by status',
      'Filter by status (draft, proposed, accepted, paid, confirmed, in progress, completed, cancelled)',
      'Quick-create new events',
      'Event date, guest count, and value at a glance',
    ],
    annotations: [
      { selector: 'h1', label: 'Events', description: 'Your full event pipeline' },
      {
        selector: '[data-info="view-toggle"]',
        label: 'View Toggle',
        description: 'Switch between list table and kanban board views',
      },
      {
        selector: '[data-info="new-event"]',
        label: 'New Event',
        description: 'Create a new event from scratch',
      },
    ],
  },

  '/events/new': {
    title: 'New Event',
    description: 'Create a new event — set the date, occasion, guest count, location, and client.',
    features: [
      'Event type and occasion selection',
      'Date, time, and guest count',
      'Client assignment',
      'Location and venue details',
      'Budget and pricing setup',
    ],
  },

  '/events/new/from-text': {
    title: 'Event from Text',
    description: 'Paste an email or message and let Remy extract event details automatically.',
    features: [
      'AI-powered text parsing',
      'Auto-extracts date, guest count, occasion, dietary needs',
      'Review and edit before creating',
    ],
  },

  '/events/new/wizard': {
    title: 'Event Setup Wizard',
    description: 'Step-by-step guided event creation — perfect for your first few events.',
    features: [
      'Guided multi-step form',
      'Client selection or creation',
      'Menu and pricing setup',
      'Contract and payment terms',
    ],
  },

  '/events/[id]': {
    title: 'Event Detail',
    description:
      'Everything about this event — status, timeline, menu, financials, staff, and all supporting documents.',
    features: [
      'Event status and lifecycle transitions',
      'Timeline and schedule overview',
      'Menu preview and approval status',
      'Financial summary (quoted, paid, outstanding)',
      'Staff assignments and roles',
      'Temperature logs and food safety',
      'Contingency planning',
      'Links to invoice, receipts, travel, packing, and more',
    ],
  },

  '/events/[id]/edit': {
    title: 'Edit Event',
    description: 'Update event details — date, time, guest count, location, and notes.',
    features: [
      'Edit all event fields',
      'Update client assignment',
      'Modify pricing and budget',
      'Change event status',
    ],
  },

  '/events/[id]/schedule': {
    title: 'Event Schedule',
    description:
      'Timeline of prep and execution tasks for this event — the full day-of-party plan.',
    features: [
      'Prep tasks sorted by timeline',
      'Day-of-party execution plan',
      'Task assignments to staff',
      'Time estimates and dependencies',
    ],
  },

  '/events/[id]/interactive': {
    title: 'Interactive Timeline',
    description: 'Live interactive timeline during event service — track progress in real time.',
    features: [
      'Real-time task tracking',
      'Mark tasks complete as you go',
      'Timer and pacing indicators',
      'Mobile-optimized for kitchen use',
    ],
  },

  '/events/[id]/dop/mobile': {
    title: 'Mobile Day-of-Party',
    description:
      'Mobile-optimized day-of-party interface — designed for use during active service.',
    features: [
      'Large touch targets for kitchen use',
      'Task checklist with swipe-to-complete',
      'Timer integration',
      'Quick notes and photo capture',
    ],
  },

  '/events/[id]/aar': {
    title: 'After Action Review',
    description:
      'Post-event self-assessment — what went well, what to improve, and lessons learned.',
    features: [
      'Calm and prep quality ratings',
      'What went well / what to improve',
      'Frequently forgotten items tracking',
      'Feeds into quality trends on dashboard',
    ],
  },

  '/events/[id]/close-out': {
    title: 'Event Close-Out',
    description:
      'Finalize the event — settle all financials, upload final receipts, and mark complete.',
    features: [
      'Final financial reconciliation',
      'Outstanding balance resolution',
      'Receipt upload and verification',
      'Status transition to completed',
    ],
  },

  '/events/[id]/debrief': {
    title: 'Event Debrief',
    description: 'Detailed post-event analysis — performance, financials, and client feedback.',
    features: [
      'Performance summary',
      'Financial outcome vs. quoted',
      'Client satisfaction signals',
      'Actionable takeaways',
    ],
  },

  '/events/[id]/financial': {
    title: 'Event Financials',
    description:
      'Full financial picture for this event — revenue, costs, profit margin, and payment history.',
    features: [
      'Quoted vs. collected revenue',
      'Direct expenses and food costs',
      'Profit margin calculation',
      'Payment timeline and status',
      'Ledger entries for this event',
    ],
  },

  '/events/[id]/invoice': {
    title: 'Event Invoice',
    description: 'The invoice for this event — line items, totals, payment terms, and status.',
    features: [
      'Line-item breakdown',
      'Deposit and balance amounts',
      'Payment status tracking',
      'Shareable invoice link',
    ],
  },

  '/events/[id]/receipts': {
    title: 'Event Receipts',
    description: 'Upload and manage receipts for this event — grocery runs, rentals, supplies.',
    features: [
      'Receipt photo upload',
      'Categorize by expense type',
      'Running total of event expenses',
      'Link receipts to ledger entries',
    ],
  },

  '/events/[id]/travel': {
    title: 'Event Travel',
    description: 'Travel details for this event — distance, mileage, and travel expenses.',
    features: [
      'Mileage tracking and logging',
      'Travel expense recording',
      'Route and distance info',
    ],
  },

  '/events/[id]/pack': {
    title: 'Packing Checklist',
    description:
      'Everything you need to bring — equipment, ingredients, supplies, and personal items.',
    features: [
      'Categorized packing list',
      'Check items off as you pack',
      'Reusable templates from past events',
    ],
  },

  '/events/[id]/grocery-quote': {
    title: 'Grocery Quote',
    description: 'Get price estimates for event ingredients from multiple grocery sources.',
    features: [
      'Auto-generated ingredient list from menu',
      'Price quotes from Kroger, Spoonacular, MealMe',
      'Instacart cart link generation',
      'Bulk price write-back to recipe database',
    ],
  },

  '/events/[id]/guest-card': {
    title: 'Guest Card',
    description: 'Guest arrival and check-in card for this event.',
    features: [
      'Guest list with dietary info',
      'Check-in tracking',
      'Allergy and restriction alerts',
    ],
  },

  '/events/[id]/kds': {
    title: 'Kitchen Display',
    description: 'Kitchen Display System — real-time order and course tracking during service.',
    features: [
      'Course-by-course display',
      'Timing and pacing',
      'Large text for kitchen visibility',
    ],
  },

  '/events/[id]/split-billing': {
    title: 'Split Billing',
    description: 'Split the event invoice between multiple payers — great for co-hosted events.',
    features: [
      'Assign portions to different payers',
      'Individual payment tracking',
      'Flexible split options (equal, custom)',
    ],
  },

  '/events/awaiting-deposit': {
    title: 'Awaiting Deposit',
    description: 'Events that have been accepted but are still waiting for the initial deposit.',
    features: ['Filtered event list by deposit status', 'Quick links to send payment reminders'],
  },

  '/events/upcoming': {
    title: 'Upcoming Events',
    description: 'Confirmed events coming up — your active pipeline.',
    features: [
      'Chronological upcoming events',
      'Days until each event',
      'Quick access to event details',
    ],
  },

  '/events/confirmed': {
    title: 'Confirmed Events',
    description: 'Events with payment confirmed — ready for execution.',
    features: ['Confirmed events list', 'Prep status indicators'],
  },

  '/events/completed': {
    title: 'Completed Events',
    description: 'Past events that have been fully executed and closed out.',
    features: ['Completed events history', 'Revenue and profit per event', 'AAR status'],
  },

  '/events/cancelled': {
    title: 'Cancelled Events',
    description: 'Events that were cancelled — track reasons and refund status.',
    features: ['Cancellation history', 'Refund tracking', 'Reason documentation'],
  },

  '/events/board': {
    title: 'Event Board',
    description: 'Kanban board view of all events organized by status columns.',
    features: ['Drag-and-drop status changes', 'Visual pipeline overview', 'Status column counts'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Inquiries
  // ═══════════════════════════════════════════════════════

  '/inquiries': {
    title: 'Inquiries',
    description:
      'Your inquiry pipeline — track every catering request from first contact to conversion.',
    features: [
      'Filter by status (new, awaiting client, awaiting chef, quoted, confirmed, declined, expired)',
      'Inquiry count badges per status',
      'Quick access to respond and convert',
      'Timeline of inquiry progression',
    ],
  },

  '/inquiries/new': {
    title: 'New Inquiry',
    description: 'Log a new catering inquiry — capture the client request and event details.',
    features: [
      'Client info capture',
      'Event details (date, occasion, guest count)',
      'Dietary restrictions and special requests',
      'Source tracking (website, referral, etc.)',
    ],
  },

  '/inquiries/[id]': {
    title: 'Inquiry Detail',
    description:
      'Full inquiry view — client info, event requirements, messaging thread, and conversion options.',
    features: [
      'Client communication thread',
      'Event requirement summary',
      'Convert to quote or event',
      'Status management',
      'Follow-up scheduling',
    ],
  },

  '/inquiries/awaiting-client': {
    title: 'Awaiting Client Response',
    description: "Inquiries where you've responded and are waiting for the client to get back.",
    features: ['Filtered inquiry list', 'Days waiting indicator', 'Follow-up reminder option'],
  },

  '/inquiries/awaiting-response': {
    title: 'Awaiting Your Response',
    description: 'Inquiries that need your attention — the client is waiting for you.',
    features: ['Action-needed list', 'Response time tracking', 'Quick reply options'],
  },

  '/inquiries/menu-drafting': {
    title: 'Menu Drafting',
    description: 'Inquiries in the menu planning phase — creating menus for client review.',
    features: ['Menu draft status', 'Link to menu editor', 'Client preferences summary'],
  },

  '/inquiries/sent-to-client': {
    title: 'Sent to Client',
    description: 'Quotes and proposals that have been sent and are awaiting client decision.',
    features: ['Sent proposals list', 'View/open tracking', 'Follow-up scheduling'],
  },

  '/inquiries/declined': {
    title: 'Declined Inquiries',
    description: "Inquiries that didn't convert — track reasons to improve your pipeline.",
    features: ['Decline reason tracking', 'Historical reference', 'Win-back opportunities'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Quotes
  // ═══════════════════════════════════════════════════════

  '/quotes': {
    title: 'Quotes',
    description: 'Your quote pipeline — draft, send, and track pricing proposals.',
    features: [
      'Filter by status (draft, sent, accepted, rejected, expired, viewed)',
      'Quote value totals',
      'Expiring soon alerts',
      'Quick insights panel',
    ],
  },

  '/quotes/new': {
    title: 'New Quote',
    description: 'Build a new pricing quote for a client — line items, pricing, and terms.',
    features: [
      'Line-item builder',
      'Per-person pricing calculator',
      'Deposit and payment term configuration',
      'Expiration date setting',
    ],
  },

  '/quotes/[id]': {
    title: 'Quote Detail',
    description: 'View and manage a specific quote — pricing, status, and client response.',
    features: [
      'Full pricing breakdown',
      'Status tracking (draft → sent → accepted/rejected)',
      'Client response history',
      'Convert accepted quotes to events',
      'PDF export',
    ],
  },

  '/quotes/[id]/edit': {
    title: 'Edit Quote',
    description: 'Modify quote pricing, line items, terms, and expiration.',
    features: [
      'Edit line items and pricing',
      'Update payment terms',
      'Adjust expiration date',
      'Add notes and special conditions',
    ],
  },

  '/quotes/draft': {
    title: 'Draft Quotes',
    description: 'Quotes still being prepared — not yet sent to clients.',
    features: ['Draft list', 'Potential revenue value', 'Quick edit and send'],
  },

  '/quotes/sent': {
    title: 'Sent Quotes',
    description: 'Quotes that have been sent and are awaiting client response.',
    features: ['Pending quotes list', 'Days since sent', 'Follow-up reminders'],
  },

  '/quotes/accepted': {
    title: 'Accepted Quotes',
    description: 'Quotes the client has accepted — ready to convert to events.',
    features: ['Accepted quotes list', 'Convert to event action', 'Revenue confirmed'],
  },

  '/quotes/rejected': {
    title: 'Rejected Quotes',
    description: 'Quotes that were declined by clients — learn and improve.',
    features: ['Rejection history', 'Feedback notes', 'Price comparison insights'],
  },

  '/quotes/expired': {
    title: 'Expired Quotes',
    description: 'Quotes that passed their expiration date without client action.',
    features: ['Expired quotes list', 'Re-send or archive options', 'Lost revenue tracking'],
  },

  '/quotes/viewed': {
    title: 'Viewed Quotes',
    description: 'Quotes the client has opened but not yet responded to.',
    features: ['View tracking', 'Time since viewed', 'Follow-up prompts'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Clients
  // ═══════════════════════════════════════════════════════

  '/clients': {
    title: 'Clients',
    description:
      'Your complete client roster — manage relationships, send invitations, and track engagement.',
    features: [
      'Client list with health scores',
      'Send portal invitations via email',
      'Export client data to CSV',
      'View pending invitations',
      'Filter by VIP, active, or inactive status',
    ],
    annotations: [
      { selector: 'h1', label: 'Clients', description: 'Your full client list' },
      {
        selector: '#invite',
        label: 'Client Invitation',
        description: 'Send an email invitation so clients can access their own portal',
      },
      {
        selector: '[data-info="client-table"]',
        label: 'Client Table',
        description: 'All your clients with event count, total revenue, and health scores',
      },
    ],
  },

  '/clients/new': {
    title: 'Add Client',
    description: 'Create a new client profile — name, contact info, and dietary preferences.',
    features: [
      'Client info form',
      'Dietary restrictions',
      'Contact details',
      'Optional portal invitation',
    ],
  },

  '/clients/[id]': {
    title: 'Client Detail',
    description:
      'Full client profile — event history, communication log, preferences, and financial relationship.',
    features: [
      'Client profile and contact info',
      'Event history timeline',
      'Communication log and notes',
      'Dietary restrictions and preferences',
      'Lifetime value and spending history',
      'Loyalty points and tier status',
    ],
  },

  '/clients/[id]/recurring': {
    title: 'Recurring Events',
    description:
      'Set up recurring event subscriptions for this client — weekly, monthly, or custom.',
    features: ['Recurring schedule setup', 'Auto-event creation', 'Frequency options'],
  },

  '/clients/active': {
    title: 'Active Clients',
    description: 'Clients with recent events or active engagement.',
    features: ['Active client list', 'Recent activity indicators', 'Quick actions'],
  },

  '/clients/inactive': {
    title: 'Inactive Clients',
    description: 'Clients without recent activity — potential re-engagement opportunities.',
    features: ['Inactive client list', 'Last activity date', 'Re-engagement prompts'],
  },

  '/clients/duplicates': {
    title: 'Duplicate Detection',
    description: 'Find and merge duplicate client records to keep your data clean.',
    features: ['Duplicate pair detection', 'Side-by-side comparison', 'Merge functionality'],
  },

  '/clients/gift-cards': {
    title: 'Gift Cards',
    description: 'Manage gift card purchases and redemptions for your clients.',
    features: [
      'Gift card inventory',
      'Purchase tracking',
      'Redemption history',
      'Balance management',
    ],
  },

  '/clients/presence': {
    title: 'Client Presence',
    description: 'See which clients are currently active in their portal.',
    features: ['Live online status', 'Last seen timestamps', 'Activity indicators'],
  },

  '/clients/vip': {
    title: 'VIP Clients',
    description: 'Your highest-value clients — special tier management and priority treatment.',
    features: ['VIP tier assignment', 'Lifetime value ranking', 'Special perks tracking'],
  },

  '/clients/segments': {
    title: 'Client Segments',
    description: 'Group clients by behavior, value, or preferences for targeted engagement.',
    features: ['Custom segment creation', 'Behavioral grouping', 'Targeted outreach lists'],
  },

  '/clients/communication': {
    title: 'Communication Hub',
    description: 'Unified view of all client communication — notes, follow-ups, and touchpoints.',
    features: ['Communication log', 'Notes by client', 'Follow-up tasks', 'Upcoming touchpoints'],
  },

  '/clients/communication/notes': {
    title: 'Client Notes',
    description:
      'Notes and observations organized by client — personal details, preferences, and context.',
    features: ['Per-client notes', 'Searchable history', 'Tagged notes'],
  },

  '/clients/communication/follow-ups': {
    title: 'Follow-Up Tasks',
    description: 'Scheduled follow-ups and action items for your clients.',
    features: ['Follow-up list', 'Due date tracking', 'Completion status'],
  },

  '/clients/communication/upcoming-touchpoints': {
    title: 'Upcoming Touchpoints',
    description: 'Birthdays, anniversaries, and other milestones coming up for your clients.',
    features: ['Milestone calendar', 'Automated reminders', 'Outreach suggestions'],
  },

  '/clients/history': {
    title: 'Client History Hub',
    description: 'Complete historical view of client relationships — events, menus, and spending.',
    features: ['Event history', 'Past menus served', 'Spending trends'],
  },

  '/clients/history/event-history': {
    title: 'Event History',
    description: 'All events for each client — past, present, and future.',
    features: ['Chronological event list', 'Status and outcome tracking', 'Revenue per event'],
  },

  '/clients/history/past-menus': {
    title: 'Past Menus',
    description: "Menus you've served to each client — avoid repeats, track favorites.",
    features: ['Menu history by client', 'Dish frequency', 'Favorite dish indicators'],
  },

  '/clients/history/spending-history': {
    title: 'Spending History',
    description: 'Revenue history per client — track lifetime value and spending patterns.',
    features: ['Revenue timeline', 'Average event value', 'Spending trends'],
  },

  '/clients/insights': {
    title: 'Client Insights',
    description: 'Analytics about your client base — top spenders, most frequent, and at-risk.',
    features: [
      'Top clients by revenue',
      'Most frequent bookers',
      'At-risk churn alerts',
      'Client acquisition trends',
    ],
  },

  '/clients/insights/top-clients': {
    title: 'Top Clients',
    description: 'Your highest-value clients ranked by lifetime revenue.',
    features: ['Revenue ranking', 'Event count', 'Average event value'],
  },

  '/clients/insights/most-frequent': {
    title: 'Most Frequent',
    description: 'Clients who book most often — your loyal regulars.',
    features: ['Booking frequency ranking', 'Average time between bookings', 'Retention rate'],
  },

  '/clients/insights/at-risk': {
    title: 'At-Risk Clients',
    description:
      'Clients showing signs of churning — long gaps between bookings or declining engagement.',
    features: ['Churn risk indicators', 'Days since last booking', 'Re-engagement suggestions'],
  },

  '/clients/preferences': {
    title: 'Client Preferences Hub',
    description: 'All dietary and food preferences across your client base.',
    features: ['Allergies overview', 'Dietary restrictions', 'Food dislikes', 'Favorite dishes'],
  },

  '/clients/preferences/allergies': {
    title: 'Allergy Tracking',
    description: 'Client allergies — critical safety information for event planning.',
    features: ['Allergy list by client', 'Severity indicators', 'Cross-reference with menus'],
  },

  '/clients/preferences/dietary-restrictions': {
    title: 'Dietary Restrictions',
    description: 'Dietary requirements across your client base — vegan, kosher, gluten-free, etc.',
    features: [
      'Restriction categories',
      'Client count per restriction',
      'Menu compatibility check',
    ],
  },

  '/clients/preferences/dislikes': {
    title: 'Food Dislikes',
    description: "Foods your clients don't enjoy — helps avoid menu missteps.",
    features: ['Dislike list by client', 'Ingredient-level tracking'],
  },

  '/clients/preferences/favorite-dishes': {
    title: 'Favorite Dishes',
    description: 'Dishes your clients love — great for repeat bookings and personalization.',
    features: ['Favorite tracking', 'Recipe cross-reference', 'Personalization suggestions'],
  },

  '/clients/loyalty': {
    title: 'Loyalty Program',
    description: 'Manage your client loyalty program — points, rewards, and referrals.',
    features: ['Points system overview', 'Reward tiers', 'Referral tracking', 'Redemption history'],
  },

  '/clients/loyalty/points': {
    title: 'Loyalty Points',
    description: 'Points earned and redeemed by each client.',
    features: ['Points balance by client', 'Earning history', 'Redemption log'],
  },

  '/clients/loyalty/rewards': {
    title: 'Loyalty Rewards',
    description: 'Available rewards and their point costs.',
    features: ['Reward catalog', 'Point thresholds', 'Active promotions'],
  },

  '/clients/loyalty/referrals': {
    title: 'Referral Tracking',
    description: 'Track client referrals — who referred whom and the resulting bookings.',
    features: ['Referral chain tracking', 'Conversion rates', 'Referral rewards issued'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Finance
  // ═══════════════════════════════════════════════════════

  '/finance': {
    title: 'Finance Hub',
    description:
      'Central hub for all financial management — invoices, expenses, ledger, payments, reporting, and tax.',
    features: [
      'Quick revenue, refund, and profit metrics',
      '16 section tiles for every financial tool',
      'YTD carry-forward savings',
      'Navigate to invoices, expenses, ledger, payments, payouts, reporting, and tax',
    ],
  },

  '/financials': {
    title: 'Financial Dashboard',
    description: 'Full financial dashboard — revenue, expenses, targets, and trends.',
    features: ['Revenue and expense tracking', 'Goal progress', 'Monthly trends', 'Profit margins'],
  },

  '/finance/overview': {
    title: 'Finance Overview',
    description: 'High-level financial health — total revenue, expenses, and outstanding balances.',
    features: [
      'Total revenue collected',
      'Business expenses summary',
      'Outstanding balances alert',
      'Links to revenue summary, outstanding payments, and cash flow',
    ],
  },

  '/finance/overview/outstanding-payments': {
    title: 'Outstanding Payments',
    description: 'Past events with unpaid balances — follow up to collect.',
    features: [
      'Outstanding amount total',
      'Days overdue indicator',
      'Severity highlighting for 30+ days',
    ],
  },

  '/finance/overview/cash-flow': {
    title: 'Cash Flow',
    description: 'Revenue vs. expenses over 12 months — see your cash position.',
    features: ['12-month rolling view', 'Gross and net revenue', 'Monthly expense breakdown'],
  },

  '/finance/overview/revenue-summary': {
    title: 'Revenue Summary',
    description: 'Revenue breakdown from confirmed and completed events.',
    features: [
      'Total quoted revenue',
      'Completed revenue',
      'Average per event',
      'Status breakdown',
    ],
  },

  '/finance/invoices': {
    title: 'Invoices',
    description:
      'All event invoices organized by status — draft, sent, paid, overdue, refunded, cancelled.',
    features: [
      '6 status stages with totals',
      'Invoice value summaries',
      'Awaiting payment counts',
      'Quick navigation to each status',
    ],
  },

  '/finance/invoices/draft': {
    title: 'Draft Invoices',
    description: 'Invoices not yet sent to clients — review and finalize.',
    features: ['Draft count and potential value', 'Quick send actions'],
  },

  '/finance/invoices/sent': {
    title: 'Sent Invoices',
    description: 'Invoices sent and awaiting client payment.',
    features: ['Pending total value', 'Days since sent', 'Payment reminder options'],
  },

  '/finance/invoices/paid': {
    title: 'Paid Invoices',
    description: 'Invoices that have been paid in full.',
    features: ['Paid total', 'Completed event count', 'Payment confirmation dates'],
  },

  '/finance/invoices/overdue': {
    title: 'Overdue Invoices',
    description: 'Invoices past their due date — needs immediate attention.',
    features: ['Overdue total', 'Days overdue indicator', 'Critical alerts for 30+ days'],
  },

  '/finance/invoices/refunded': {
    title: 'Refunded Invoices',
    description: 'Events with refund entries in the ledger.',
    features: ['Refund total', 'Refund reason tracking', 'Event linkage'],
  },

  '/finance/invoices/cancelled': {
    title: 'Cancelled Invoices',
    description: 'Invoices for cancelled events.',
    features: ['Lost revenue tracking', 'Cancellation reasons', 'Refund status'],
  },

  '/finance/expenses': {
    title: 'Expenses',
    description:
      'All business expenses broken down by category — food, labor, marketing, and more.',
    features: [
      '7 expense categories',
      'Business vs. personal separation',
      'Category spending breakdown',
      'Event-linked expenses',
    ],
  },

  '/finance/expenses/food-ingredients': {
    title: 'Food & Ingredients',
    description: 'Grocery, alcohol, and specialty ingredient costs.',
    features: ['3 subcategories', 'Total food costs', 'Per-category breakdown'],
  },

  '/finance/expenses/labor': {
    title: 'Labor Costs',
    description: 'Staff and labor expenses for events.',
    features: ['Total labor spend', 'Per-event labor costs', 'Staff payment tracking'],
  },

  '/finance/expenses/marketing': {
    title: 'Marketing Expenses',
    description: 'Advertising and marketing spend.',
    features: ['Total marketing spend', 'Vendor breakdown', 'ROI tracking'],
  },

  '/finance/expenses/miscellaneous': {
    title: 'Miscellaneous Expenses',
    description: 'Insurance, professional services, education, utilities, and other costs.',
    features: ['5 subcategories', 'Category totals', 'Active category tracking'],
  },

  '/finance/expenses/rentals-equipment': {
    title: 'Rentals & Equipment',
    description: 'Equipment rental, supplies, venue, and uniform costs.',
    features: ['4 subcategories', 'Per-event rental costs', 'Vendor tracking'],
  },

  '/finance/expenses/software': {
    title: 'Software & Subscriptions',
    description: 'SaaS tools and subscription costs.',
    features: ['Vendor-by-vendor breakdown', 'Monthly recurring costs', 'Unique vendor count'],
  },

  '/finance/expenses/travel': {
    title: 'Travel Expenses',
    description: 'Gas, mileage, vehicle, and travel costs.',
    features: ['Mileage logging', 'Gas and vehicle costs', 'Total miles tracked'],
  },

  '/finance/ledger': {
    title: 'Ledger',
    description:
      'Immutable transaction log — the source of truth for all financial data in ChefFlow.',
    features: [
      'Total entries and revenue recorded',
      'Refunds recorded',
      'Recent entries preview',
      'Links to adjustments and full transaction log',
    ],
  },

  '/finance/ledger/adjustments': {
    title: 'Ledger Adjustments',
    description: 'Credits, add-ons, and manual adjustments to the ledger.',
    features: ['Credits issued', 'Add-ons charged', 'Adjustment history by date'],
  },

  '/finance/ledger/transaction-log': {
    title: 'Transaction Log',
    description: 'Complete chronological record of every financial transaction.',
    features: ['CSV export', 'Total collected and refunded', 'Full transaction table'],
  },

  '/finance/payments': {
    title: 'Payments',
    description: 'All payment activity — deposits, installments, refunds, and failed payments.',
    features: [
      'Total received and refunded',
      'Net received',
      'Navigate to deposits, installments, refunds, and failed',
    ],
  },

  '/finance/payments/deposits': {
    title: 'Deposits',
    description: 'Deposit payments received from clients.',
    features: ['Deposit count and total', 'Deposit table by event'],
  },

  '/finance/payments/installments': {
    title: 'Installments',
    description: 'Installment and final payments received.',
    features: ['Total received', 'Installment vs. final split', 'Payment schedule tracking'],
  },

  '/finance/payments/refunds': {
    title: 'Refunds',
    description: 'Payments returned to clients.',
    features: ['Total refunded', 'Refund entries count', 'Events with refunds'],
  },

  '/finance/payments/failed': {
    title: 'Failed Payments',
    description: 'Stalled or failed payment attempts.',
    features: ['Past-due payments', 'Upcoming payment alerts', 'Stripe dashboard reference'],
  },

  '/finance/payouts': {
    title: 'Payouts',
    description: 'How you receive money — Stripe and manual payment tracking.',
    features: [
      'Gross revenue',
      'Total refunds',
      'Net after refunds',
      'Stripe and manual payout links',
    ],
  },

  '/finance/payouts/stripe-payouts': {
    title: 'Stripe Payouts',
    description: 'Automated transfers from Stripe Connect to your bank.',
    features: ['Stripe status', 'Net received', 'Platform fees', 'Transfer history'],
  },

  '/finance/payouts/manual-payments': {
    title: 'Manual Payments',
    description: 'Cash, Venmo, Zelle, and other offline payments.',
    features: ['Total received', 'Payment entry count', 'Payment history table'],
  },

  '/finance/payouts/reconciliation': {
    title: 'Reconciliation',
    description: 'Match event invoices against recorded ledger payments.',
    features: ['Fully reconciled events', 'Partially recorded', 'Unrecorded gaps'],
  },

  '/finance/reporting': {
    title: 'Reporting Hub',
    description: 'Financial reports and export-ready insights.',
    features: [
      'YTD revenue and event count',
      'Business expenses this month',
      'Stage conversion funnel',
      '8 report categories',
    ],
  },

  '/finance/reporting/revenue-by-month': {
    title: 'Revenue by Month',
    description: '12-month rolling revenue trend.',
    features: [
      'CSV export',
      'Gross and net revenue',
      'Best month highlight',
      'Monthly trend table',
    ],
  },

  '/finance/reporting/revenue-by-client': {
    title: 'Revenue by Client',
    description: 'Lifetime value per client — who generates the most revenue.',
    features: ['CSV export', 'Client LTV ranking', 'Top client highlight'],
  },

  '/finance/reporting/revenue-by-event': {
    title: 'Revenue by Event',
    description: 'Events ranked by invoice value.',
    features: ['Total invoice value', 'Completed revenue', 'Average event value', 'Event ranking'],
  },

  '/finance/reporting/profit-loss': {
    title: 'Profit & Loss',
    description: 'Full P&L statement with revenue, expenses, and net profit.',
    features: ['Year selector', 'KPI cards', 'Monthly revenue chart', 'Expense breakdown'],
  },

  '/finance/reporting/profit-by-event': {
    title: 'Profit by Event',
    description: 'Invoice revenue minus direct expenses for each event.',
    features: ['Net profit per event', 'Profit margin', 'Events ranked by profitability'],
  },

  '/finance/reporting/expense-by-category': {
    title: 'Expense by Category',
    description: 'Spending breakdown across all expense categories.',
    features: ['Category totals', 'Percentage of total spend', 'Active category count'],
  },

  '/finance/reporting/tax-summary': {
    title: 'Tax Summary',
    description: 'Business income and expense summary for tax preparation.',
    features: [
      'Year selector',
      'Gross income',
      'Business expenses',
      'Net income',
      'Category breakdown',
    ],
  },

  '/finance/reporting/year-to-date-summary': {
    title: 'Year-to-Date Summary',
    description: 'Financial overview from January 1 through today.',
    features: ['YTD revenue cards', 'Monthly progress', '6 key KPIs', 'All-time summary'],
  },

  '/finance/tax': {
    title: 'Tax Center',
    description:
      'Tax preparation tools — mileage log, quarterly estimates, and accountant exports.',
    features: [
      'Mileage summary',
      'Quarterly tax estimates (Q1-Q4)',
      'Year selector',
      'AI tax deduction suggestions',
    ],
  },

  '/finance/tax/quarterly': {
    title: 'Quarterly Estimates',
    description: 'Estimated quarterly tax payments.',
    features: ['Q1-Q4 estimates', 'Income and deduction inputs', 'Payment tracking'],
  },

  '/finance/tax/year-end': {
    title: 'Year-End Report',
    description: 'Complete annual tax summary for your accountant.',
    features: ['Annual revenue', 'Expense breakdown', 'Net income', 'Exportable report'],
  },

  '/finance/tax/1099-nec': {
    title: '1099 Contractors',
    description: 'Track contractor payments for 1099-NEC filing.',
    features: ['Contractor payment totals', 'YTD tracking', '1099 compliance'],
  },

  '/finance/tax/depreciation': {
    title: 'Depreciation',
    description: 'Track equipment depreciation for tax deductions.',
    features: ['Asset list', 'Depreciation schedules', 'Annual deduction amounts'],
  },

  '/finance/tax/home-office': {
    title: 'Home Office Deduction',
    description: 'Calculate and track home office deductions.',
    features: ['Square footage method', 'Simplified method', 'Annual deduction calculation'],
  },

  '/finance/tax/retirement': {
    title: 'Retirement Contributions',
    description: 'Track retirement account contributions for tax deductions.',
    features: ['SEP IRA / Solo 401k tracking', 'Contribution limits', 'Deduction amounts'],
  },

  '/finance/cash-flow': {
    title: 'Cash Flow Calendar',
    description: 'Monthly view of projected income, expenses, and payment plan installments.',
    features: ['Cash position projection', 'Interactive forecast chart', '30-day outlook'],
  },

  '/finance/forecast': {
    title: 'Revenue Forecast',
    description: 'Projected revenue based on historical data and current pipeline.',
    features: [
      'Average monthly revenue',
      'Projected annual total',
      'Trend indicator (up/down/stable)',
      '3-month projection cards',
    ],
  },

  '/finance/goals': {
    title: 'Revenue Goals',
    description: 'Set annual revenue targets and track progress toward them.',
    features: ['Goal setter', 'Annual progress bar', 'Monthly tracking', 'Gap-closing strategies'],
  },

  '/finance/recurring': {
    title: 'Recurring Invoices',
    description: 'Automated billing for repeat clients and retainer agreements.',
    features: ['Recurring invoice setup', 'Client selector', 'Billing frequency options'],
  },

  '/finance/retainers': {
    title: 'Retainers',
    description: 'Recurring service agreements with clients.',
    features: ['Active retainer count', 'Monthly recurring revenue (MRR)', 'Retainer status table'],
  },

  '/finance/retainers/new': {
    title: 'New Retainer',
    description: 'Create a new retainer agreement with a client.',
    features: ['Client selection', 'Service terms', 'Billing schedule', 'Amount configuration'],
  },

  '/finance/retainers/[id]': {
    title: 'Retainer Detail',
    description: 'View and manage a specific retainer agreement.',
    features: ['Agreement terms', 'Payment history', 'Usage tracking', 'Renewal options'],
  },

  '/finance/sales-tax': {
    title: 'Sales Tax',
    description: 'Track collected, outstanding, and remitted sales tax.',
    features: ['Tax configuration', 'Sales tax summary', 'Remittance history'],
  },

  '/finance/sales-tax/remittances': {
    title: 'Tax Remittances',
    description: "Sales tax remittance history — what you've sent to tax authorities.",
    features: ['Remittance records', 'Filing dates', 'Amounts remitted'],
  },

  '/finance/sales-tax/settings': {
    title: 'Sales Tax Settings',
    description: 'Configure sales tax rates, nexus, and collection rules.',
    features: ['Tax rate configuration', 'Nexus settings', 'Collection automation'],
  },

  '/finance/bank-feed': {
    title: 'Bank Feed',
    description: 'Connect bank accounts and reconcile transactions.',
    features: ['Bank connection status', 'Pending transactions', 'Reconciliation summary'],
  },

  '/finance/disputes': {
    title: 'Payment Disputes',
    description: 'Track and manage chargebacks and payment disputes.',
    features: ['Dispute tracker', 'Stripe dispute linkage', 'Resolution status'],
  },

  '/finance/contractors': {
    title: '1099 Contractors',
    description: 'Manage contractor payments, YTD tracking, and 1099 filing.',
    features: ['Contractor list', 'YTD payments', '1099 summary', 'Compliance tracking'],
  },

  '/finance/payroll': {
    title: 'Payroll',
    description: 'Employee payroll management hub.',
    features: ['Employee list', 'Payroll runs', 'Tax forms (941, W2)'],
  },

  '/finance/payroll/employees': {
    title: 'Employees',
    description: 'Employee list and payroll details.',
    features: ['Employee roster', 'Pay rates', 'Tax withholding'],
  },

  '/finance/payroll/run': {
    title: 'Run Payroll',
    description: 'Process a payroll run for employees.',
    features: ['Hours input', 'Pay calculation', 'Tax withholding', 'Payment processing'],
  },

  '/finance/payroll/941': {
    title: '941 Filing',
    description: 'Quarterly 941 tax form filing for employee withholdings.',
    features: ['Quarterly filing', 'Withholding summary', 'Filing status'],
  },

  '/finance/payroll/w2': {
    title: 'W-2 Management',
    description: 'Year-end W-2 form generation for employees.',
    features: ['W-2 generation', 'Employee distribution', 'Filing records'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Expenses (top-level)
  // ═══════════════════════════════════════════════════════

  '/expenses': {
    title: 'Expenses',
    description: 'All business expenses with category filters and export.',
    features: [
      'Monthly summary cards',
      'Category filters (food, labor, rental, travel, marketing, software, misc)',
      'Event-grouped display',
      'CSV export',
    ],
  },

  '/expenses/[id]': {
    title: 'Expense Detail',
    description: 'View or edit a specific expense — amount, category, receipt, and event linkage.',
    features: ['Full expense data', 'Receipt image', 'Category and vendor', 'Event linkage'],
  },

  '/expenses/new': {
    title: 'New Expense',
    description: 'Log a new business expense.',
    features: [
      'Date picker',
      'Category selector',
      'Vendor input',
      'Event linkage',
      'Business/personal flag',
    ],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Culinary
  // ═══════════════════════════════════════════════════════

  '/culinary': {
    title: 'Culinary Hub',
    description:
      'Your culinary workspace — recipes, menus, ingredients, food costing, prep planning, and vendors.',
    features: [
      'Quick stats: recipe count, menu count, ingredient count, vendor count',
      '6 navigation tiles to all subsections',
      'Central jumping-off point for all culinary tools',
    ],
  },

  '/culinary/recipes': {
    title: 'Recipe Book',
    description: 'Your full library of documented recipes with costing and yield.',
    features: [
      'Recipe count and category badges',
      'Time, yield, ingredient count per recipe',
      'Recipe cost calculation',
      'Times cooked tracking',
    ],
  },

  '/culinary/recipes/[id]': {
    title: 'Recipe Detail',
    description: 'Full recipe view — ingredients, instructions, cost breakdown, and event history.',
    features: [
      'Ingredient list with costs',
      'Step-by-step instructions',
      'Yield calculator',
      'Event history',
    ],
  },

  '/culinary/recipes/[id]/edit': {
    title: 'Edit Recipe',
    description: 'Update recipe details — ingredients, instructions, yield, and costing.',
    features: ['Ingredient editor', 'Instruction editor', 'Yield adjustment', 'Cost recalculation'],
  },

  '/culinary/recipes/new': {
    title: 'New Recipe',
    description: 'Create a new recipe from scratch.',
    features: [
      'Recipe name and description',
      'Ingredient list builder',
      'Instruction steps',
      'Yield and costing',
    ],
  },

  '/culinary/recipes/sprint': {
    title: 'Recipe Sprint',
    description: 'Focused recipe development session — batch-create and test new recipes.',
    features: ['Sprint timer', 'Batch recipe creation', 'Testing notes'],
  },

  '/culinary/recipes/drafts': {
    title: 'Draft Recipes',
    description: 'Recipes in progress — not yet finalized.',
    features: ['Draft filter', 'In-progress count', 'Quick edit links'],
  },

  '/culinary/recipes/dietary-flags': {
    title: 'Dietary Flags',
    description: 'Tag recipes by dietary category — vegan, gluten-free, nut-free, etc.',
    features: ['Dietary category tagging', 'Filter recipes by restriction', 'Allergen flagging'],
  },

  '/culinary/recipes/tags': {
    title: 'Recipe Tags',
    description: 'Organize recipes with custom tags — cuisine type, difficulty, season, etc.',
    features: ['Custom tag creation', 'Tag-based filtering', 'Recipe grouping'],
  },

  '/culinary/recipes/seasonal-notes': {
    title: 'Seasonal Notes',
    description: 'Notes on ingredient availability and seasonal variations for recipes.',
    features: ['Seasonal sourcing guidance', 'Best-time-to-buy notes', 'Variation suggestions'],
  },

  '/culinary/menus': {
    title: 'Menus',
    description: 'Event menus and reusable templates — build, share, and track approvals.',
    features: [
      'Menu count and status labels (draft, shared, approved, archived)',
      'Service style tags (plated, family, buffet, cocktail, tasting)',
      'Template indicator',
    ],
  },

  '/culinary/menus/[id]': {
    title: 'Menu Detail',
    description: 'Full menu view — courses, recipes, guest count scaling, and food cost.',
    features: [
      'Course breakdown',
      'Recipe compositions',
      'Guest count scaling',
      'Food cost at scale',
    ],
  },

  '/culinary/menus/new': {
    title: 'New Menu',
    description: 'Create a new event menu — select courses, assign recipes, set service style.',
    features: ['Course builder', 'Recipe selection', 'Service style', 'Guest count'],
  },

  '/culinary/menus/drafts': {
    title: 'Draft Menus',
    description: 'Menus still being developed — not yet shared with clients.',
    features: ['Draft filter', 'In-progress count'],
  },

  '/culinary/menus/approved': {
    title: 'Approved Menus',
    description: 'Menus that have been locked and approved by clients.',
    features: ['Approved filter', 'Locked status indicator'],
  },

  '/culinary/menus/templates': {
    title: 'Menu Templates',
    description: 'Reusable menu blueprints — save time on similar events.',
    features: ['Template library', 'Save as template', 'Apply to new events'],
  },

  '/culinary/menus/scaling': {
    title: 'Menu Scaling',
    description: 'Adjust recipe quantities for different guest counts.',
    features: [
      'Ingredient scaling calculator',
      'Yield adjustments',
      'Cost recalculation per guest',
    ],
  },

  '/culinary/menus/substitutions': {
    title: 'Substitutions',
    description: 'Ingredient swaps and recipe variations for dietary needs or availability.',
    features: ['Seasonal swap suggestions', 'Dietary accommodations', 'Alternative ingredients'],
  },

  '/culinary/ingredients': {
    title: 'Ingredients',
    description: 'Your pantry database and price library — every ingredient you use.',
    features: ['Total ingredient count', 'Price tracking', 'Vendor notes', 'Seasonal availability'],
  },

  '/culinary/ingredients/seasonal-availability': {
    title: 'Seasonal Availability',
    description: "Track ingredient availability by season — know what's fresh and when.",
    features: ['Seasonal calendar', 'Best time to buy indicators', 'Regional availability'],
  },

  '/culinary/ingredients/vendor-notes': {
    title: 'Vendor Notes',
    description: 'Sourcing notes — where to get the best ingredients, pricing, and lead times.',
    features: ['Vendor pricing', 'Lead time notes', 'Quality observations'],
  },

  '/culinary/costing': {
    title: 'Food Costing',
    description: 'Recipe and menu cost breakdowns — know your margins.',
    features: [
      'Food cost percentage analysis',
      'Menu-level costing',
      'Recipe-level costing',
      'Benchmarking',
    ],
  },

  '/culinary/costing/recipe': {
    title: 'Recipe Costing',
    description: 'Cost breakdown by recipe — ingredient costs per yield and per portion.',
    features: ['Cost per yield', 'Cost per portion', 'Ingredient cost line items'],
  },

  '/culinary/costing/menu': {
    title: 'Menu Costing',
    description: 'Total menu cost and per-guest breakdown by course.',
    features: ['Total menu cost', 'Per-guest cost', 'Cost by course'],
  },

  '/culinary/costing/food-cost': {
    title: 'Food Cost Analysis',
    description: 'Food cost percentage tracking — target vs. actual across events.',
    features: ['Food cost % by event', 'Target benchmarks', 'Trend analysis'],
  },

  '/culinary/prep': {
    title: 'Prep Overview',
    description: 'All make-ahead components sorted by lead time — what to prep and when.',
    features: [
      'Component list by lead time',
      'Upcoming event prep',
      'Shopping list and timeline links',
    ],
  },

  '/culinary/prep/shopping': {
    title: 'Shopping List',
    description: 'Consolidated ingredient shopping list across upcoming events.',
    features: ['Events to prep for', 'Consolidated ingredients', 'Quantity aggregation'],
  },

  '/culinary/prep/timeline': {
    title: 'Prep Timeline',
    description: 'Day-by-day prep schedule — what to make and when.',
    features: ['Lead time sequencing', 'Task ordering', 'Component readiness tracking'],
  },

  '/culinary/vendors': {
    title: 'Vendor Directory',
    description: 'Your go-to suppliers, farms, and specialty purveyors.',
    features: ['Vendor contact info', 'Specialty categories', 'Lead times', 'Pricing notes'],
  },

  '/culinary/components': {
    title: 'Components Hub',
    description:
      'Reusable recipe building blocks — stocks, sauces, garnishes, ferments, and shared elements.',
    features: ['5 subcategory tiles', 'Cross-recipe usage tracking'],
  },

  '/culinary/components/stocks': {
    title: 'Stocks',
    description: 'Stock recipes — yields, shelf life, and cost per unit.',
    features: ['Stock library', 'Yield and shelf life', 'Cost per batch'],
  },

  '/culinary/components/sauces': {
    title: 'Sauces',
    description: 'Sauce recipes and variations.',
    features: ['Sauce library', 'Component ingredients', 'Cost per batch'],
  },

  '/culinary/components/garnishes': {
    title: 'Garnishes',
    description: 'Garnish components and prep instructions.',
    features: ['Garnish library', 'Lead time', 'Seasonality notes'],
  },

  '/culinary/components/ferments': {
    title: 'Ferments',
    description: 'Fermented components — kimchi, pickles, and other long-lead items.',
    features: ['Ferment library', 'Fermentation time', 'Shelf life'],
  },

  '/culinary/components/shared-elements': {
    title: 'Shared Elements',
    description: 'Reusable components used across multiple recipes.',
    features: ['Shared component library', 'Cross-recipe usage', 'Prep instructions'],
  },

  '/culinary/my-kitchen': {
    title: 'My Kitchen',
    description: 'Your kitchen setup — equipment inventory and workspace details.',
    features: ['Equipment list', 'Kitchen capacity', 'Mise en place notes'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Calendar
  // ═══════════════════════════════════════════════════════

  '/calendar': {
    title: 'Calendar',
    description: 'Your master calendar — events, prep blocks, and availability in one view.',
    features: [
      'Month, week, day, and year views',
      'Event and prep block display',
      'Shared calendar link',
    ],
  },

  '/calendar/day': {
    title: 'Day View',
    description: 'Detailed view of a single day — events, prep, and tasks.',
    features: ['Hourly schedule', 'Event and prep blocks', 'Task list'],
  },

  '/calendar/week': {
    title: 'Week View',
    description: 'Seven-day overview — see your full week at a glance.',
    features: ['7-day grid', 'Event placement', 'Availability gaps'],
  },

  '/calendar/year': {
    title: 'Year View',
    description: 'Annual overview — see busy and quiet months across the year.',
    features: ['12-month grid', 'Event density indicators', 'Seasonal patterns'],
  },

  '/calendar/share': {
    title: 'Shared Calendar',
    description: 'Shareable calendar link — let clients and partners see your availability.',
    features: ['Public availability link', 'Privacy controls', 'Booking integration'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Analytics
  // ═══════════════════════════════════════════════════════

  '/analytics': {
    title: 'Analytics Hub',
    description:
      'Comprehensive business analytics across 9 domains — clients, pipeline, revenue, operations, and more.',
    features: [
      'Overview with month revenue and event counts',
      'Client analytics (retention, churn, acquisition, NPS)',
      'Pipeline analytics (funnel, ghost rate, lead time)',
      'Revenue analytics (per-unit, by day of week, by season)',
      'Operations, marketing, social, and culinary analytics tabs',
    ],
  },

  '/analytics/demand': {
    title: 'Demand Trends',
    description: 'Market demand forecasting — understand booking patterns and seasonal trends.',
    features: ['Demand indicators', 'Seasonal patterns', 'Forecasting'],
  },

  '/analytics/benchmarks': {
    title: 'Industry Benchmarks',
    description: 'Compare your metrics against industry standards.',
    features: ['Industry comparison', 'Percentile ranking', 'Improvement suggestions'],
  },

  '/analytics/pipeline': {
    title: 'Pipeline Analysis',
    description: 'Sales pipeline health — conversion rates, bottlenecks, and velocity.',
    features: [
      'Funnel visualization',
      'Conversion rates',
      'Stage duration',
      'Bottleneck identification',
    ],
  },

  '/analytics/referral-sources': {
    title: 'Referral Sources',
    description: 'Where your clients come from — track referral partner performance.',
    features: ['Source attribution', 'Conversion by source', 'Partner ROI'],
  },

  '/analytics/client-ltv': {
    title: 'Client Lifetime Value',
    description: 'Lifetime revenue per client — understand your most valuable relationships.',
    features: ['LTV calculation', 'Client ranking', 'Retention correlation'],
  },

  '/analytics/reports': {
    title: 'Custom Reports',
    description: 'Build and export custom reports from your data.',
    features: ['Report builder', 'Data export', 'Scheduled reports'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Marketing
  // ═══════════════════════════════════════════════════════

  '/marketing': {
    title: 'Marketing Hub',
    description: 'Email campaigns, sequences, and templates — reach your clients and prospects.',
    features: [
      'Campaign list with status (draft, scheduled, sending, sent, cancelled)',
      'Recipient count and send date',
      'New campaign builder',
      'Testimonial request panel',
    ],
  },

  '/marketing/[id]': {
    title: 'Campaign Detail',
    description: 'View and edit a specific marketing campaign.',
    features: ['Campaign content', 'Recipient list', 'Send status', 'Performance metrics'],
  },

  '/marketing/push-dinners': {
    title: 'Push Dinners',
    description: 'Direct outreach campaigns for open-date dinners.',
    features: ['Push dinner campaigns', 'Target audience', 'Booking conversion'],
  },

  '/marketing/push-dinners/new': {
    title: 'New Push Dinner',
    description: 'Create a new push dinner campaign.',
    features: ['Date and menu selection', 'Guest capacity', 'Pricing', 'Outreach targeting'],
  },

  '/marketing/push-dinners/[id]': {
    title: 'Push Dinner Detail',
    description: 'View and manage a specific push dinner campaign.',
    features: ['Campaign status', 'RSVPs and bookings', 'Outreach history'],
  },

  '/marketing/sequences': {
    title: 'Email Sequences',
    description: 'Automated multi-step email sequences for nurturing leads.',
    features: ['Sequence builder', 'Trigger conditions', 'Step timing', 'Performance tracking'],
  },

  '/marketing/templates': {
    title: 'Campaign Templates',
    description: 'Reusable email templates for campaigns.',
    features: ['Template library', 'Quick customize', 'Preview'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Leads & Prospecting
  // ═══════════════════════════════════════════════════════

  '/leads': {
    title: 'Website Leads',
    description: 'Contact form submissions from your website — claim and convert to inquiries.',
    features: [
      'Lead list',
      'Claim into inquiry pipeline',
      'Manual lead creation',
      'Status tracking',
    ],
  },

  '/leads/new': {
    title: 'New Lead',
    description: 'Manually add a new lead to your pipeline.',
    features: ['Lead info form', 'Source tracking', 'Priority assignment'],
  },

  '/leads/qualified': {
    title: 'Qualified Leads',
    description: 'Leads that have been vetted and are ready for outreach.',
    features: ['Qualified lead list', 'Contact details', 'Conversion readiness'],
  },

  '/leads/contacted': {
    title: 'Contacted Leads',
    description: "Leads you've already reached out to.",
    features: ['Contacted list', 'Response status', 'Follow-up scheduling'],
  },

  '/leads/converted': {
    title: 'Converted Leads',
    description: 'Leads that became inquiries or clients.',
    features: ['Conversion history', 'Source attribution', 'Revenue generated'],
  },

  '/leads/archived': {
    title: 'Archived Leads',
    description: 'Past or inactive leads — kept for reference.',
    features: ['Archive history', 'Reactivation option', 'Reason tracking'],
  },

  '/prospecting': {
    title: 'Prospecting Hub',
    description: 'AI-powered lead database — find and qualify new business opportunities.',
    features: [
      'Prospect count and status',
      'Search and filter',
      'Follow-ups due',
      'Conversion tracking',
    ],
  },

  '/prospecting/[id]': {
    title: 'Prospect Detail',
    description: 'Full view of a specific prospect — contact info, notes, and outreach history.',
    features: ['Prospect profile', 'Outreach history', 'Notes and follow-ups'],
  },

  '/prospecting/queue': {
    title: 'Call Queue',
    description: 'Prospect call queue — outbound dialing and follow-up scheduling.',
    features: ['Call list', 'Priority ordering', 'Call outcomes'],
  },

  '/prospecting/scripts': {
    title: 'Outreach Scripts',
    description: 'Call scripts and talking points for prospect outreach.',
    features: ['Script templates', 'Customizable talking points', 'Outcome tracking'],
  },

  '/prospecting/scrub': {
    title: 'AI Scrub',
    description: 'AI-powered lead list cleaning and validation.',
    features: ['List upload', 'Duplicate detection', 'Data enrichment'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Social Media
  // ═══════════════════════════════════════════════════════

  '/social': {
    title: 'Social Hub',
    description: 'Social media management — plan, create, and schedule posts.',
    features: ['Post calendar', 'Content creation', 'Platform connections', 'Analytics'],
  },

  '/social/planner': {
    title: 'Social Planner',
    description: 'Monthly social media calendar — plan and schedule posts.',
    features: ['Monthly calendar view', 'Post scheduling', 'Content ideas'],
  },

  '/social/planner/[month]': {
    title: 'Monthly Planner',
    description: 'Social media plan for a specific month.',
    features: ['Day-by-day post plan', 'Content status', 'Platform targeting'],
  },

  '/social/posts/[id]': {
    title: 'Post Detail',
    description: 'View and edit a specific social media post.',
    features: ['Post content', 'Platform targeting', 'Schedule and status'],
  },

  '/social/vault': {
    title: 'Content Vault',
    description: 'Pre-made post templates and content library.',
    features: ['Template library', 'Quick customize', 'Seasonal content'],
  },

  '/social/connections': {
    title: 'Social Connections',
    description: 'Connect your Instagram, Facebook, TikTok, and other social accounts.',
    features: ['Account connections', 'Platform status', 'Auth management'],
  },

  '/social/settings': {
    title: 'Social Settings',
    description: 'Social media configuration and preferences.',
    features: ['Posting preferences', 'Platform defaults', 'Content guidelines'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Staff
  // ═══════════════════════════════════════════════════════

  '/staff': {
    title: 'Staff Roster',
    description: 'Manage your team — add staff, set roles, and track hourly rates.',
    features: [
      'Active staff list with role and hourly rate',
      'Add new team member form',
      'Inactive staff section',
      'Inline edit for contact and pay details',
    ],
  },

  '/staff/availability': {
    title: 'Staff Availability',
    description: 'See when your team is available for events.',
    features: ['Availability calendar', 'Per-staff schedules', 'Conflict detection'],
  },

  '/staff/schedule': {
    title: 'Staff Schedule',
    description: 'Shift scheduling for upcoming events.',
    features: ['Event-based scheduling', 'Role assignments', 'Shift management'],
  },

  '/staff/labor': {
    title: 'Labor Costs',
    description: 'Labor cost analytics — track staff expenses by event and period.',
    features: ['Labor cost by event', 'Total labor spend', 'Hourly rate tracking'],
  },

  '/staff/performance': {
    title: 'Staff Performance',
    description: 'Track staff performance, reliability, and feedback.',
    features: ['Performance metrics', 'Event feedback', 'Reliability tracking'],
  },

  '/staff/clock': {
    title: 'Time Clock',
    description: 'Staff time tracking — clock in/out for events and prep.',
    features: ['Clock in/out', 'Hours logged', 'Timesheet export'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Partners
  // ═══════════════════════════════════════════════════════

  '/partners': {
    title: 'Referral Partners',
    description:
      'Manage referral partners — venues, planners, and other businesses that send you clients.',
    features: [
      'Partner list with type, contact, and location count',
      'Inquiry and event counts per partner',
      'Revenue attribution',
      'Filter by active/inactive',
    ],
  },

  '/partners/new': {
    title: 'Add Partner',
    description: 'Create a new referral partner profile.',
    features: ['Partner info form', 'Partner type selection', 'Location setup'],
  },

  '/partners/[id]': {
    title: 'Partner Detail',
    description: 'Full partner profile — locations, events generated, and performance metrics.',
    features: ['Partner info', 'Location list', 'Event attribution', 'Revenue tracking'],
  },

  '/partners/[id]/edit': {
    title: 'Edit Partner',
    description: 'Update partner details — contact info, locations, and relationship notes.',
    features: ['Edit partner form', 'Location management', 'Notes'],
  },

  '/partners/[id]/report': {
    title: 'Partner Report',
    description: 'Performance report for this partner — events, revenue, and ROI.',
    features: ['Event count', 'Revenue generated', 'Conversion rate', 'ROI metrics'],
  },

  '/partners/active': {
    title: 'Active Partners',
    description: 'Currently active referral partners.',
    features: ['Active partner list', 'Recent activity', 'Event generation'],
  },

  '/partners/inactive': {
    title: 'Inactive Partners',
    description: 'Partners no longer actively generating referrals.',
    features: ['Inactive list', 'Reactivation options', 'Historical data'],
  },

  '/partners/events-generated': {
    title: 'Events from Partners',
    description: 'All events attributed to referral partners.',
    features: ['Event list by partner', 'Revenue attribution', 'Source tracking'],
  },

  '/partners/referral-performance': {
    title: 'Referral Performance',
    description: 'Partner ROI analytics — which partners generate the most value.',
    features: ['Partner ranking', 'Revenue per partner', 'Conversion rates'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Network
  // ═══════════════════════════════════════════════════════

  '/network': {
    title: 'Chef Network',
    description: 'Discover other chefs — connect, collaborate, and share.',
    features: ['Chef directory', 'Profile browsing', 'Connection requests', 'Network features'],
  },

  '/network/[chefId]': {
    title: 'Chef Profile',
    description: "View another chef's profile — specialties, portfolio, and shared connections.",
    features: ['Chef bio', 'Specialty areas', 'Portfolio', 'Connection options'],
  },

  '/network/channels/[slug]': {
    title: 'Network Channel',
    description: 'Group discussions and topic-based channels within the chef network.',
    features: ['Channel messages', 'Topic discussions', 'Member list'],
  },

  '/network/notifications': {
    title: 'Network Notifications',
    description: 'Activity notifications from your chef network.',
    features: ['Connection requests', 'Channel activity', 'Mentions'],
  },

  '/network/saved': {
    title: 'Saved Chefs',
    description: "Chefs you've bookmarked for future reference.",
    features: ['Saved chef list', 'Quick access', 'Notes'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Operations
  // ═══════════════════════════════════════════════════════

  '/operations': {
    title: 'Operations Hub',
    description: 'Equipment and kitchen rental management.',
    features: [
      'Equipment items count and maintenance alerts',
      'Kitchen rental bookings and spend',
      'Navigation tiles to equipment and kitchen rentals',
    ],
  },

  '/operations/equipment': {
    title: 'Equipment Inventory',
    description: 'Track your owned equipment — maintenance schedules and per-event rental costs.',
    features: ['Equipment list', 'Maintenance due dates', 'Per-event rental costs'],
  },

  '/operations/kitchen-rentals': {
    title: 'Kitchen Rentals',
    description: 'Commercial kitchen booking log — hours, costs, and event linkage.',
    features: ['Kitchen bookings', 'Hours and costs', 'Event linkage'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Safety
  // ═══════════════════════════════════════════════════════

  '/safety': {
    title: 'Safety Hub',
    description: 'Food safety, incident documentation, and backup planning.',
    features: ['Incident log', 'Backup chef assignment', 'Safety protocols'],
  },

  '/safety/backup-chef': {
    title: 'Backup Chef',
    description: "Designate an emergency backup chef in case you can't make an event.",
    features: ['Backup assignment', 'Contact details', 'Event contingency'],
  },

  '/safety/incidents': {
    title: 'Safety Incidents',
    description:
      'Document safety incidents — food safety, injuries, equipment failures, near-misses.',
    features: [
      'Incident list with dates',
      'Category (food safety, injury, equipment, near-miss)',
      'Legal documentation',
    ],
  },

  '/safety/incidents/new': {
    title: 'Report Incident',
    description: 'File a new safety incident report.',
    features: ['Incident type selection', 'Date and details', 'Resolution tracking'],
  },

  '/safety/incidents/[id]': {
    title: 'Incident Detail',
    description: 'Full incident report — details, resolution, and follow-up actions.',
    features: ['Incident details', 'Resolution status', 'Follow-up actions'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Settings
  // ═══════════════════════════════════════════════════════

  '/settings': {
    title: 'Settings Hub',
    description: 'Central settings dashboard — configure your ChefFlow experience.',
    features: [
      'Business defaults and profile',
      'AI privacy and Remy controls',
      'Integrations and automations',
      'Billing and subscription',
      'Appearance and navigation',
      'Notifications and templates',
      'Account security',
    ],
  },

  '/settings/my-profile': {
    title: 'My Profile',
    description: 'Your core chef profile — name, image, and details used across the portal.',
    features: [
      'Chef name and image',
      'Review link',
      'Primary business details',
      'AI bio generator',
    ],
  },

  '/settings/profile': {
    title: 'Network Profile',
    description: 'Your directory profile visible to other chefs in the network.',
    features: ['Display name and bio', 'Profile photo', 'Network visibility settings'],
  },

  '/settings/public-profile': {
    title: 'Public Profile',
    description: 'How clients see you — tagline, partner showcase, and branding colors.',
    features: [
      'Tagline',
      'Partner showcase',
      'Primary and background colors',
      'Client view preview',
    ],
  },

  '/settings/client-preview': {
    title: 'Client Preview',
    description:
      'See exactly what your clients see — live preview of your public profile and client portal.',
    features: ['Public profile preview', 'Client portal data preview', 'Read-only view'],
  },

  '/settings/ai-privacy': {
    title: 'AI & Privacy Trust Center',
    description:
      'Complete AI controls and privacy practices — manage Remy features and data handling.',
    features: [
      'Remy onboarding wizard',
      'Data flow schematic',
      'Feature toggles for AI capabilities',
      'Data controls and privacy promise',
    ],
  },

  '/settings/culinary-profile': {
    title: 'Culinary Profile',
    description: 'Your food identity and cooking philosophy — helps Remy understand your style.',
    features: [
      'Cooking philosophy',
      'Signature dishes',
      'Dietary specialties',
      'Progress indicator',
    ],
  },

  '/settings/appearance': {
    title: 'Appearance',
    description: 'Theme and display customization.',
    features: ['Light/dark mode toggle', 'Theme preferences'],
  },

  '/settings/billing': {
    title: 'Subscription & Billing',
    description: 'Manage your ChefFlow subscription — plan details, billing, and upgrades.',
    features: ['Subscription status', 'Plan features', 'Upgrade options', 'Billing history'],
  },

  '/settings/change-password': {
    title: 'Change Password',
    description: 'Update your account password.',
    features: ['Current password verification', 'New password entry', 'Strength requirements'],
  },

  '/settings/delete-account': {
    title: 'Delete Account',
    description: 'Permanently delete your ChefFlow account and all data.',
    features: ['Permanent deletion warning', 'Data export recommendation', 'Confirmation required'],
  },

  '/settings/notifications': {
    title: 'Notification Settings',
    description: 'Control how you receive notifications — email, push, and SMS.',
    features: ['Per-category preferences', 'Email/push/SMS channel selection', 'SMS phone setup'],
  },

  '/settings/health': {
    title: 'System Health',
    description: 'Check the status of all connected services.',
    features: [
      'Stripe payment status',
      'Gmail integration status',
      'Google Calendar status',
      'DOP task engine status',
    ],
  },

  '/settings/dashboard': {
    title: 'Dashboard Widgets',
    description: 'Enable, disable, and reorder your dashboard widgets.',
    features: ['Widget visibility toggles', 'Drag-to-reorder', 'Widget descriptions'],
  },

  '/settings/navigation': {
    title: 'Primary Navigation',
    description: 'Customize your always-visible navigation bar tabs.',
    features: ['Tab selection', 'Tab ordering', 'Quick access configuration'],
  },

  '/settings/templates': {
    title: 'Response Templates',
    description: 'Pre-written message templates for common client communications.',
    features: ['Template list', 'Inline editor', 'Quick copy-and-customize'],
  },

  '/settings/automations': {
    title: 'Automations',
    description: 'Automated workflows — follow-up reminders, expiry rules, and custom triggers.',
    features: ['Built-in automation rules', 'Custom rule creation', 'Execution history'],
  },

  '/settings/integrations': {
    title: 'Integrations',
    description: 'Connect ChefFlow with POS, website, scheduling, and CRM tools.',
    features: ['Integration provider overview', 'Connection status', 'Setup guides'],
  },

  '/settings/contracts': {
    title: 'Contract Templates',
    description: 'Reusable contract templates with merge fields for client agreements.',
    features: [
      'Template list with preview',
      'Inline editor',
      'Version tracking',
      'Default template marker',
    ],
  },

  '/settings/custom-fields': {
    title: 'Custom Fields',
    description: 'Add custom data fields to events, clients, and recipes.',
    features: ['Field builder', 'Entity type selection', 'Custom data capture'],
  },

  '/settings/event-types': {
    title: 'Event Types & Labels',
    description: 'Rename occasion types and status labels to match your business language.',
    features: ['Occasion type customization', 'Status label customization', 'App-wide updates'],
  },

  '/settings/modules': {
    title: 'Feature Modules',
    description: 'Toggle feature modules on/off — control what appears in your sidebar.',
    features: ['Module toggles', 'Pro feature indicators', 'Tier status'],
  },

  '/settings/repertoire': {
    title: 'Seasonal Palettes',
    description:
      'Your creative thesis and seasonal planning — define your culinary identity by season.',
    features: [
      'Seasonal palette creation',
      'Micro-windows',
      'Context profiles',
      'Proven wins per season',
    ],
  },

  '/settings/repertoire/[id]': {
    title: 'Palette Detail',
    description: 'View and edit a specific seasonal palette.',
    features: ['Palette details', 'Micro-windows', 'Ingredient focus'],
  },

  '/settings/journal': {
    title: 'Chef Journal',
    description: 'Travel inspiration and learning record — document your culinary journey.',
    features: [
      'Journal entries',
      'Insights and highlights',
      'Ideas and recipes linked',
      'Destination tracking',
    ],
  },

  '/settings/journal/[id]': {
    title: 'Journal Entry',
    description: 'View and edit a journal entry.',
    features: ['Entry details', 'Photos and media', 'Recipe links', 'Learning notes'],
  },

  '/settings/journey': {
    title: 'Journey',
    description: 'Milestone tracking for your culinary career.',
    features: ['Career milestones', 'Progress tracking', 'Achievement timeline'],
  },

  '/settings/journey/[id]': {
    title: 'Journey Detail',
    description: 'View a specific career milestone or journey entry.',
    features: ['Milestone details', 'Photos', 'Impact notes'],
  },

  '/settings/professional': {
    title: 'Professional Development',
    description: 'Career milestones, competitions, awards, and learning goals.',
    features: [
      'Achievements (competitions, press, awards, courses)',
      'Learning goals',
      'Structured tracking',
    ],
  },

  '/settings/professional/skills': {
    title: 'Capability Inventory',
    description: 'Self-assess your confidence across cuisines, diets, and techniques.',
    features: ['Rating system', 'Capability grid', 'Skill categories'],
  },

  '/settings/professional/momentum': {
    title: 'Professional Momentum',
    description: 'Growth tracking — new dishes, cuisines, education, and creative projects.',
    features: ['Growth snapshot', 'New dish count', 'Education tracking', 'Creative projects'],
  },

  '/settings/protection': {
    title: 'Business Protection',
    description: 'Safeguard your business — insurance, certifications, NDAs, and crisis planning.',
    features: [
      'Business health checklist',
      'Insurance policies',
      'Certifications',
      'Crisis response playbook',
    ],
  },

  '/settings/protection/business-health': {
    title: 'Business Health',
    description: 'Business continuity checklist — ensure your business is protected.',
    features: ['Continuity checklist', 'Gap identification', 'Action items'],
  },

  '/settings/protection/insurance': {
    title: 'Insurance',
    description: 'Track insurance policies — liability, property, workers comp.',
    features: ['Policy list', 'Expiry tracking', 'Coverage details'],
  },

  '/settings/protection/nda': {
    title: 'NDA Management',
    description: 'Non-disclosure agreements with clients and staff.',
    features: ['NDA list', 'Signing status', 'Template management'],
  },

  '/settings/protection/crisis': {
    title: 'Crisis Response',
    description: 'Emergency response plan — what to do when things go wrong.',
    features: ['Crisis playbook', 'Contact tree', 'Emergency procedures'],
  },

  '/settings/protection/continuity': {
    title: 'Business Continuity',
    description: 'Business continuity planning — keep operating through disruptions.',
    features: ['Continuity plan', 'Backup procedures', 'Recovery steps'],
  },

  '/settings/protection/certifications': {
    title: 'Certifications',
    description: 'Track food safety and professional certifications.',
    features: ['Certification list', 'Expiry alerts (14/60 day)', 'Document upload'],
  },

  '/settings/protection/portfolio-removal': {
    title: 'Portfolio Removal Rights',
    description: 'Manage image usage rights and removal requests.',
    features: ['Image rights tracking', 'Removal request handling', 'Client consent records'],
  },

  '/settings/highlights': {
    title: 'Profile Highlights',
    description: 'Featured achievements and credentials for your public profile.',
    features: [
      'Highlight categories (awards, press, certifications)',
      'Display order',
      'Featured toggle',
    ],
  },

  '/settings/portfolio': {
    title: 'Portfolio',
    description: 'Photo gallery for your public profile — showcase your best dishes.',
    features: ['Photo upload', 'Caption and dish name', 'Featured marker', 'Drag-to-reorder'],
  },

  '/settings/favorite-chefs': {
    title: 'Favorite Chefs',
    description: 'Your culinary heroes and mentors — share your inspirations.',
    features: ['Chef list', 'Social sharing', 'Inspiration notes'],
  },

  '/settings/stripe-connect': {
    title: 'Stripe Connect',
    description: 'Connect your Stripe account for accepting payments.',
    features: ['Connection status', 'Payout history', 'Account setup'],
  },

  '/settings/api-keys': {
    title: 'API Keys',
    description: 'Manage integration API keys.',
    features: ['Create and list keys', 'Scope management', 'Last-used tracking', 'Revocation'],
  },

  '/settings/webhooks': {
    title: 'Webhooks',
    description: 'Real-time webhook endpoint configuration.',
    features: ['Endpoint creation', 'Event subscriptions', 'Delivery history'],
  },

  '/settings/compliance': {
    title: 'Food Safety & Compliance',
    description: 'Certification and license tracking with expiry reminders.',
    features: [
      'Active/expired/pending certifications',
      'Expiry reminders',
      'Document upload',
      'AI permit renewal checklist',
    ],
  },

  '/settings/compliance/gdpr': {
    title: 'GDPR & Privacy',
    description: 'Data privacy controls and GDPR compliance tools.',
    features: ['GDPR compliance tools', 'Data export', 'Deletion controls'],
  },

  '/settings/emergency': {
    title: 'Emergency Contacts',
    description: 'Backup contacts for event incapacity — sous chef, business partner, peer chef.',
    features: ['Contact storage', 'Role assignment', 'Event contingency linking'],
  },

  // ═══════════════════════════════════════════════════════
  //  CHEF PORTAL — Miscellaneous
  // ═══════════════════════════════════════════════════════

  '/aar': {
    title: 'After Action Reviews',
    description: 'All post-event self-assessments — track your quality trends over time.',
    features: [
      'Review list',
      'Calm and prep ratings',
      'Frequently forgotten items',
      'Quality trends',
    ],
  },

  '/activity': {
    title: 'Activity Feed',
    description: 'System activity log — recent changes across your entire ChefFlow account.',
    features: ['Chef activity', 'Client activity', 'Chronological feed'],
  },

  '/calls': {
    title: 'Calls',
    description: 'Call logging and management — track every client and prospect call.',
    features: ['Upcoming calls', 'Past call log', 'Call notes'],
  },

  '/calls/new': {
    title: 'Log Call',
    description: 'Record a new call with a client or prospect.',
    features: ['Contact selection', 'Call notes', 'Follow-up scheduling'],
  },

  '/calls/[id]': {
    title: 'Call Detail',
    description: 'View details and notes from a specific call.',
    features: ['Call notes', 'Duration', 'Follow-up actions'],
  },

  '/calls/[id]/edit': {
    title: 'Edit Call',
    description: 'Update call notes and details.',
    features: ['Edit notes', 'Update follow-ups', 'Change details'],
  },

  '/chat': {
    title: 'Messages',
    description: 'Direct messaging with clients and partners.',
    features: ['Conversation list', 'Real-time messaging', 'Message history'],
  },

  '/chat/[id]': {
    title: 'Chat Thread',
    description: 'Individual conversation with a client or partner.',
    features: ['Message thread', 'File sharing', 'Read receipts'],
  },

  '/culinary-board': {
    title: 'Culinary Board',
    description: 'Culinary inspiration board — save ideas, recipes, and creative concepts.',
    features: ['Inspiration pins', 'Visual board', 'Recipe linking'],
  },

  '/community/templates': {
    title: 'Community Templates',
    description: 'Templates shared by the chef community.',
    features: ['Community template library', 'Import to your account', 'Browse and search'],
  },

  '/dev/simulate': {
    title: 'Dev Simulator',
    description: 'Developer tool — simulate events and data for testing.',
    features: ['Event simulation', 'Data generation', 'Testing scenarios'],
  },

  '/games': {
    title: 'Games',
    description: 'Fun and engagement — take a break with built-in games.',
    features: ['Tic-tac-toe', 'Snake', 'Galaga', 'Trivia', 'More'],
  },

  '/goals': {
    title: 'Goals',
    description: 'Revenue and booking targets — set goals and track progress.',
    features: [
      'Monthly progress tracking',
      'Client outreach recommendations',
      'Revenue path projection',
    ],
  },

  '/goals/setup': {
    title: 'Goal Setup',
    description: 'Set up your revenue and booking goals.',
    features: ['Annual target setting', 'Monthly breakdown', 'Strategy suggestions'],
  },

  '/goals/[id]/history': {
    title: 'Goal History',
    description: 'Historical progress for a specific goal.',
    features: ['Progress timeline', 'Monthly snapshots', 'Achievement markers'],
  },

  '/goals/revenue-path': {
    title: 'Revenue Path',
    description: 'Revenue projection based on your pipeline and historical data.',
    features: ['Projection modeling', 'Scenario planning', 'Gap analysis'],
  },

  '/guest-analytics': {
    title: 'Guest Analytics',
    description:
      'Guest-level analytics across events — dietary trends, group sizes, and preferences.',
    features: ['Guest count trends', 'Dietary distribution', 'Group size patterns'],
  },

  '/guest-leads': {
    title: 'Guest Leads',
    description: 'Leads generated from event guests — turn guests into clients.',
    features: ['Guest-to-lead pipeline', 'Contact capture', 'Conversion tracking'],
  },

  '/help': {
    title: 'Help Center',
    description: 'Help and support — browse categories or search for answers.',
    features: [
      'Category navigation (events, clients, finance, culinary, settings, onboarding)',
      'Search',
      'Support email',
    ],
  },

  '/help/[slug]': {
    title: 'Help Article',
    description: 'Detailed help article on a specific topic.',
    features: ['Step-by-step instructions', 'Screenshots', 'Related articles'],
  },

  '/inbox': {
    title: 'Inbox',
    description:
      'Unified message management — chat, emails, form submissions, and notifications in one place.',
    features: [
      'Multi-source inbox',
      'Needs attention / snoozed / resolved tabs',
      'Gmail connection status',
      'Calendar peek',
    ],
  },

  '/inbox/triage': {
    title: 'Inbox Triage',
    description: 'Process incoming messages efficiently — action, snooze, or resolve.',
    features: ['Quick action buttons', 'Batch processing', 'Priority indicators'],
  },

  '/inbox/triage/[threadId]': {
    title: 'Email Thread',
    description: 'View and respond to a specific email thread.',
    features: ['Full thread view', 'Reply and forward', 'Thread actions'],
  },

  '/inbox/history-scan': {
    title: 'Gmail History Scan',
    description: 'Scan your Gmail history for past client communications.',
    features: ['Historical email import', 'Client matching', 'Conversation linking'],
  },

  '/import': {
    title: 'Data Import',
    description: 'Bulk import data — clients, recipes, events, and more.',
    features: ['CSV import', 'Data mapping', 'Validation and preview'],
  },

  '/insights': {
    title: 'Business Insights',
    description: 'AI-generated business insights and recommendations.',
    features: ['Revenue insights', 'Client behavior analysis', 'Operational recommendations'],
  },

  '/insights/time-analysis': {
    title: 'Time Analysis',
    description: 'How you spend your time — track hours across activities.',
    features: ['Activity breakdown', 'Time allocation', 'Productivity insights'],
  },

  '/inventory': {
    title: 'Inventory Hub',
    description: 'Ingredient and supply tracking — counts, costs, and waste.',
    features: ['Inventory counts', 'Food cost tracking', 'Vendor invoices', 'Waste tracking'],
  },

  '/inventory/counts': {
    title: 'Inventory Counts',
    description: 'Current ingredient and supply counts.',
    features: ['Item counts', 'Low stock alerts', 'Count history'],
  },

  '/inventory/food-cost': {
    title: 'Inventory Food Cost',
    description: 'Track food costs from inventory usage.',
    features: ['Cost tracking', 'Usage patterns', 'Waste impact'],
  },

  '/inventory/vendor-invoices': {
    title: 'Vendor Invoices',
    description: 'Upload and track vendor invoices for inventory purchases.',
    features: ['Invoice upload', 'Vendor tracking', 'Cost reconciliation'],
  },

  '/inventory/waste': {
    title: 'Waste Tracking',
    description: 'Track food waste to reduce costs and improve sustainability.',
    features: ['Waste logging', 'Cost impact', 'Reduction tracking'],
  },

  '/loyalty': {
    title: 'Loyalty Hub',
    description: 'Manage your client loyalty program.',
    features: ['Points system', 'Reward tiers', 'Referral tracking'],
  },

  '/loyalty/rewards/new': {
    title: 'New Reward',
    description: 'Create a new loyalty reward.',
    features: ['Reward definition', 'Point cost', 'Availability settings'],
  },

  '/loyalty/settings': {
    title: 'Loyalty Settings',
    description: 'Configure loyalty program rules and rewards.',
    features: ['Points per dollar', 'Tier thresholds', 'Reward catalog management'],
  },

  '/menus': {
    title: 'Menus',
    description: 'Quick access to all your menus.',
    features: ['Menu list', 'Status filtering', 'Quick edit'],
  },

  '/menus/new': {
    title: 'New Menu',
    description: 'Create a new menu.',
    features: ['Course builder', 'Recipe selection', 'Service style'],
  },

  '/menus/[id]': {
    title: 'Menu Detail',
    description: 'View a specific menu — courses, recipes, and costing.',
    features: ['Course breakdown', 'Recipe details', 'Cost calculation'],
  },

  '/menus/[id]/editor': {
    title: 'Menu Editor',
    description: 'Visual menu editor — drag and drop courses and recipes.',
    features: ['Drag-and-drop editor', 'Course reordering', 'Recipe swap'],
  },

  '/onboarding': {
    title: 'Onboarding',
    description:
      'Get started with ChefFlow — set up your profile, add clients, recipes, and staff.',
    features: ['Guided setup wizard', '5 setup phases', 'Progress tracking'],
  },

  '/onboarding/clients': {
    title: 'Onboarding: Clients',
    description: 'Add your first clients to ChefFlow.',
    features: ['Client import', 'Manual entry', 'Invitation sending'],
  },

  '/onboarding/recipes': {
    title: 'Onboarding: Recipes',
    description: 'Add your first recipes to your library.',
    features: ['Recipe creation', 'Quick-add form', 'Import options'],
  },

  '/onboarding/staff': {
    title: 'Onboarding: Staff',
    description: 'Add your team members.',
    features: ['Staff entry', 'Role assignment', 'Contact details'],
  },

  '/onboarding/loyalty': {
    title: 'Onboarding: Loyalty',
    description: 'Set up your client loyalty program.',
    features: ['Points system setup', 'Reward definition', 'Program activation'],
  },

  '/production': {
    title: 'Production Schedule',
    description: 'Event production planning — prep timeline and execution schedule.',
    features: ['Production timeline', 'Task sequencing', 'Resource allocation'],
  },

  '/proposals': {
    title: 'Proposals',
    description: 'Create and manage client proposals — menus, pricing, and terms bundled together.',
    features: ['Proposal builder', 'Template library', 'Add-on pricing'],
  },

  '/proposals/templates': {
    title: 'Proposal Templates',
    description: 'Reusable proposal templates.',
    features: ['Template library', 'Quick customize', 'Preview'],
  },

  '/proposals/addons': {
    title: 'Add-On Pricing',
    description: 'Manage optional add-ons and upgrades for proposals.',
    features: ['Add-on catalog', 'Pricing tiers', 'Bundle options'],
  },

  '/receipts': {
    title: 'Receipts',
    description: 'All uploaded expense receipts across events.',
    features: ['Receipt gallery', 'Category filtering', 'Event linkage'],
  },

  '/reputation/mentions': {
    title: 'Social Mentions',
    description: 'Track online mentions and social media references to your brand.',
    features: ['Mention tracking', 'Sentiment analysis', 'Platform monitoring'],
  },

  '/reviews': {
    title: 'Reviews',
    description: 'Client reviews from internal surveys and external platforms.',
    features: ['Unified review feed', 'Source links', 'Sync controls'],
  },

  '/schedule': {
    title: 'Master Schedule',
    description: 'Calendar view of all events, prep, and staff schedules.',
    features: ['Unified calendar', 'Event and prep blocks', 'Staff availability overlay'],
  },

  '/surveys': {
    title: 'Surveys',
    description: 'Client satisfaction surveys — create, send, and review responses.',
    features: ['Survey creation', 'Response tracking', 'Satisfaction metrics'],
  },

  '/testimonials': {
    title: 'Testimonials',
    description: 'Collect and showcase client testimonials.',
    features: ['Testimonial collection', 'Display management', 'Public showcase'],
  },

  '/travel': {
    title: 'Travel',
    description: 'Travel inspiration and planning log.',
    features: ['Travel log', 'Destination tracking', 'Culinary inspiration'],
  },

  '/waitlist': {
    title: 'Waitlist',
    description: 'Manage booking waitlists for fully booked dates.',
    features: ['Waitlist entries', 'Priority management', 'Notification when available'],
  },

  '/wix-submissions': {
    title: 'Wix Submissions',
    description: 'Contact form submissions from your Wix website.',
    features: ['Submission list', 'Claim as inquiry', 'Contact details'],
  },

  '/wix-submissions/[id]': {
    title: 'Submission Detail',
    description: 'View details from a specific Wix form submission.',
    features: ['Full submission data', 'Conversion options', 'Contact info'],
  },

  '/cannabis': {
    title: 'Cannabis Events',
    description:
      'Cannabis-specific event management — compliance, events, invitations, and ledger.',
    features: [
      'Cannabis compliance tools',
      'Event list',
      'Invitation management',
      'Separate ledger',
    ],
  },

  '/cannabis/compliance': {
    title: 'Cannabis Compliance',
    description: 'Cannabis event compliance requirements and documentation.',
    features: ['Regulatory requirements', 'Documentation', 'Compliance checklist'],
  },

  '/cannabis/about': {
    title: 'About Cannabis Portal',
    description: 'Why this portal exists — the task force, the legislation, and the roadmap.',
    features: [
      'Task force background',
      'Legislative timeline',
      'Feature roadmap',
      'External sources',
    ],
  },

  '/cannabis/events': {
    title: 'Cannabis Event List',
    description: 'All cannabis-specific events.',
    features: ['Event list', 'Status tracking', 'Compliance indicators'],
  },

  '/cannabis/invite': {
    title: 'Cannabis Invitation',
    description: 'Send invitations for cannabis dining events.',
    features: ['Invitation creation', 'Guest list', 'Event details'],
  },

  '/cannabis/ledger': {
    title: 'Cannabis Ledger',
    description: 'Financial ledger for cannabis event transactions.',
    features: ['Transaction log', 'Revenue tracking', 'Compliance-ready records'],
  },

  // ═══════════════════════════════════════════════════════
  //  CLIENT PORTAL
  // ═══════════════════════════════════════════════════════

  '/my-events': {
    title: 'My Events',
    description: 'Your upcoming and past events — check status, make payments, and leave reviews.',
    features: [
      'Upcoming events with status badges',
      'Past event history',
      'Loyalty status and points',
      'Post-event review prompts',
      'Quick messaging to your chef',
    ],
  },

  '/my-events/[id]': {
    title: 'Event Detail',
    description:
      'Everything about your event — timeline, menu, payments, photos, and action buttons.',
    features: [
      'Event status and journey timeline',
      'Menu preview and approval',
      'Payment summary and history',
      'Photo gallery',
      'Guest sharing and RSVP',
      'Post-event review and feedback',
    ],
  },

  '/my-events/[id]/proposal': {
    title: 'Proposal',
    description: "Your chef's proposal — menu, pricing, and contract all in one view.",
    features: ['Menu preview', 'Pricing breakdown', 'Contract view', 'Accept and pay actions'],
  },

  '/my-events/[id]/pay': {
    title: 'Payment',
    description: 'Make a payment for your event — secure checkout via Stripe.',
    features: [
      'Payment summary',
      'Financial breakdown',
      'Cancellation policy',
      'Secure Stripe checkout',
    ],
  },

  '/my-events/[id]/invoice': {
    title: 'Invoice',
    description: 'View and download your event invoice.',
    features: ['Full invoice view', 'Download option', 'Payment status'],
  },

  '/my-events/[id]/contract': {
    title: 'Contract',
    description: 'Review and sign your service agreement.',
    features: ['Contract terms', 'Digital signature', 'Signing status'],
  },

  '/my-events/[id]/approve-menu': {
    title: 'Menu Approval',
    description: 'Review and approve your event menu, or request revisions.',
    features: ['Menu display', 'Approve button', 'Request revisions option'],
  },

  '/my-events/[id]/payment-plan': {
    title: 'Payment Plan',
    description: 'View installment schedule options for your event payment.',
    features: ['Milestone-based payment schedule', 'Payment calculator', 'Plan options'],
  },

  '/my-events/[id]/countdown': {
    title: 'Event Countdown',
    description: 'Countdown timer to your upcoming event with preparation milestones.',
    features: ['Days remaining display', 'Preparation milestones', 'Excitement builder'],
  },

  '/my-events/[id]/pre-event-checklist': {
    title: 'Pre-Event Checklist',
    description: 'Confirm dietary preferences and kitchen details before your event.',
    features: ['Dietary restriction confirmation', 'Allergy updates', 'Kitchen setup questions'],
  },

  '/my-events/[id]/event-summary': {
    title: 'Event Summary',
    description: 'Post-event recap — menu served, timeline, photos, and highlights.',
    features: ['Menu recap', 'Event timeline', 'Photo summary', 'Highlights'],
  },

  '/my-events/history': {
    title: 'Past Events',
    description: 'Complete history of all your past events.',
    features: ['Event cards with details', 'Leave reviews', 'Pay outstanding balances'],
  },

  '/my-inquiries': {
    title: 'My Inquiries',
    description: 'Track the status of your catering inquiries.',
    features: ['Inquiry list sorted by date', 'Status badges', 'Click to view details'],
  },

  '/my-inquiries/[id]': {
    title: 'Inquiry Detail',
    description: 'View your inquiry summary and its current status.',
    features: ['Inquiry summary', 'Journey status stepper', 'Link to resulting event'],
  },

  '/my-quotes': {
    title: 'My Quotes',
    description: 'Review and respond to pricing quotes from your chef.',
    features: ['Pending quotes needing action', 'Previous quotes', 'Download PDF option'],
  },

  '/my-quotes/[id]': {
    title: 'Quote Detail',
    description: 'View quote pricing, respond with acceptance or questions.',
    features: [
      'Pricing summary',
      'Per-person calculation',
      'Deposit amount',
      'Accept or message chef',
    ],
  },

  '/book-now': {
    title: 'Book Now',
    description: 'Submit a new catering inquiry to your chef.',
    features: ['Inquiry form', 'Event details input', 'Dietary requirements'],
  },

  '/my-profile': {
    title: 'My Profile',
    description:
      'Edit your profile — name, contact, dietary preferences, and notification settings.',
    features: [
      'Profile form',
      'Dietary restrictions',
      'Notification preferences',
      'Feedback section',
    ],
  },

  '/my-chat': {
    title: 'Messages',
    description: 'Conversations with your chef.',
    features: ['Conversation list', 'Real-time messaging'],
  },

  '/my-chat/[id]': {
    title: 'Chat',
    description: 'Direct message thread with your chef.',
    features: ['Message history', 'Real-time updates', 'File sharing'],
  },

  '/my-spending': {
    title: 'My Spending',
    description: 'Your spending history — total spent, average event cost, and trends.',
    features: ['Total spending', 'Average event cost', 'Spending trends'],
  },

  '/my-rewards': {
    title: 'My Rewards',
    description: 'Your loyalty points, tier progress, and available rewards.',
    features: [
      'Points balance',
      'Tier progress bar',
      'Available rewards',
      'Points earning history',
    ],
  },

  '/my-cannabis': {
    title: 'Cannabis Dining',
    description: 'Your private cannabis dining events — upcoming and past.',
    features: ['Cannabis events list', 'Access verification', 'Event details'],
  },

  '/survey/[token]': {
    title: 'Satisfaction Survey',
    description: 'Share your feedback about a recent event — help your chef improve.',
    features: ['Survey form', 'Rating and comments', 'One-time submission'],
  },

  // ═══════════════════════════════════════════════════════
  //  PUBLIC PAGES
  // ═══════════════════════════════════════════════════════

  '/': {
    title: 'ChefFlow Home',
    description: 'Welcome to ChefFlow — the operations platform for private chefs.',
    features: ['Platform overview', 'Feature highlights', 'Sign up or sign in'],
  },

  '/chefs': {
    title: 'Chef Directory',
    description: 'Browse available chefs for your next event.',
    features: ['Chef profiles', 'Specialties and portfolios', 'Direct booking links'],
  },

  '/contact': {
    title: 'Contact Us',
    description: 'Get in touch with the ChefFlow team.',
    features: ['Contact form', 'Support email', 'General inquiries'],
  },

  '/pricing': {
    title: 'Pricing',
    description: 'ChefFlow pricing plans — free and professional tiers.',
    features: ['Plan comparison', 'Feature lists', 'Upgrade options'],
  },

  '/privacy': {
    title: 'Privacy Policy',
    description: 'How ChefFlow handles your data and protects your privacy.',
    features: ['Data collection practices', 'Privacy rights', 'Contact information'],
  },

  '/terms': {
    title: 'Terms of Service',
    description: 'ChefFlow terms of service and usage agreement.',
    features: ['Service terms', 'User responsibilities', 'Legal provisions'],
  },

  '/chef/[slug]': {
    title: 'Chef Profile',
    description: "A chef's public profile — portfolio, specialties, and booking information.",
    features: ['Chef bio and portfolio', 'Specialty areas', 'Inquiry form', 'Gift card purchase'],
  },

  '/chef/[slug]/inquire': {
    title: 'Make an Inquiry',
    description: 'Submit a catering inquiry to this chef.',
    features: ['Inquiry form', 'Event details', 'Dietary requirements'],
  },

  '/chef/[slug]/gift-cards': {
    title: 'Gift Cards',
    description: "Purchase a gift card for this chef's services.",
    features: ['Gift card amounts', 'Custom messages', 'Secure purchase'],
  },

  '/chef/[slug]/gift-cards/success': {
    title: 'Gift Card Purchased',
    description: 'Your gift card purchase was successful.',
    features: ['Confirmation details', 'Gift card code', 'Delivery information'],
  },

  '/chef/[slug]/partner-signup': {
    title: 'Become a Partner',
    description: 'Sign up as a referral partner for this chef.',
    features: ['Partner application form', 'Partnership benefits', 'Location setup'],
  },

  '/share/[token]': {
    title: 'Event Recap',
    description: 'Shared event recap — photos, menu, and highlights from a recent event.',
    features: ['Event photos', 'Menu served', 'Event highlights'],
  },

  '/share/[token]/recap': {
    title: 'Recap Detail',
    description: 'Detailed event recap for sharing.',
    features: ['Full event story', 'Photo gallery', 'Menu and highlights'],
  },

  '/g/[code]': {
    title: 'Promo Code',
    description: 'Redeem a promotional code.',
    features: ['Code validation', 'Redirect to booking'],
  },

  '/availability/[token]': {
    title: 'Booking Availability',
    description: "View a chef's available dates and book a time.",
    features: ['Calendar picker', 'Available date slots', 'Booking submission'],
  },

  '/cannabis-invite/[token]': {
    title: 'Cannabis Event Invite',
    description: 'Invitation to a private cannabis dining event.',
    features: ['Event details', 'RSVP options', 'Compliance notice'],
  },

  '/partner-report/[token]': {
    title: 'Partner Report',
    description: 'Referral partner performance metrics.',
    features: ['Events generated', 'Revenue attributed', 'Performance summary'],
  },

  '/partner-signup': {
    title: 'Partner Signup',
    description: 'Sign up as a referral partner for ChefFlow.',
    features: ['Application form', 'Partnership details', 'Location setup'],
  },

  '/unsubscribe': {
    title: 'Unsubscribe',
    description: 'Unsubscribe from ChefFlow marketing emails.',
    features: ['Email preference management', 'Unsubscribe confirmation'],
  },

  // ═══════════════════════════════════════════════════════
  //  ADMIN PORTAL
  // ═══════════════════════════════════════════════════════

  '/admin': {
    title: 'Platform Overview',
    description: 'Admin command center — KPIs, live sessions, and quick-action tiles.',
    features: [
      '8 stat cards (chefs, clients, events, GMV)',
      'Quick access tiles to all admin sections',
    ],
  },

  '/admin/analytics': {
    title: 'Platform Analytics',
    description: 'Growth trends, revenue by month, and signup charts.',
    features: [
      'KPI summary cards',
      '12-month GMV chart',
      'New signups (chefs vs clients)',
      'Growth metrics',
    ],
  },

  '/admin/audit': {
    title: 'Audit Log',
    description: 'Immutable record of sensitive platform actions.',
    features: [
      'Audit table (timestamp, actor, action, target)',
      '200-entry view',
      'Full detail per action',
    ],
  },

  '/admin/cannabis': {
    title: 'Cannabis Tier Admin',
    description: 'Control cannabis portal access — approve, grant, and manage tiers.',
    features: ['User tier list', 'Pending invite approvals', 'Direct grant functionality'],
  },

  '/admin/clients': {
    title: 'All Clients',
    description: 'Every client across all chef tenants.',
    features: ['Total count and LTV', 'Sortable table', 'Chef assignment'],
  },

  '/admin/communications': {
    title: 'Communications',
    description: 'Platform announcements and direct messaging to chefs.',
    features: ['Announcement banner form', 'Direct email', 'Broadcast email'],
  },

  '/admin/events': {
    title: 'All Events',
    description: 'Every event across all chefs — platform-wide view.',
    features: ['Status distribution', 'Events table', 'Chef and status filters'],
  },

  '/admin/feedback': {
    title: 'User Feedback',
    description: 'All user-submitted feedback — sentiment analysis and trends.',
    features: ['Sentiment chips', 'Feedback table', 'Page context tracking'],
  },

  '/admin/financials': {
    title: 'Platform Financials',
    description: 'Platform-wide GMV, ledger entries, and payment health.',
    features: ['GMV all-time and this month', 'Expenses', 'Ledger table'],
  },

  '/admin/flags': {
    title: 'Feature Flags',
    description: 'Per-chef feature flag management.',
    features: ['Flag reference legend', 'Toggle per chef', 'Flag status overview'],
  },

  '/admin/presence': {
    title: 'Live Presence',
    description: "Real-time visitor tracking — who's online right now.",
    features: ['Live indicator', 'Anonymous visitors', 'Logged-in users'],
  },

  '/admin/reconciliation': {
    title: 'Platform Reconciliation',
    description: 'Cross-tenant GMV, transfers, fees, and deferred amounts.',
    features: ['GMV summary', 'Per-chef reconciliation', 'Stripe Connect status'],
  },

  '/admin/referral-partners': {
    title: 'All Partners',
    description: 'Referral partners across every chef tenant.',
    features: ['Partner stats', 'Type breakdown', 'Partners table'],
  },

  '/admin/system': {
    title: 'System Health',
    description: 'Database row counts and data integrity signals.',
    features: [
      'Row count grid',
      'Integrity signals',
      'External dashboard links (Supabase, Vercel, Stripe)',
    ],
  },

  '/admin/users': {
    title: 'All Chefs',
    description: 'Every chef account on the platform.',
    features: ['Chef table', 'Health score', 'GMV', 'Tier status'],
  },

  '/admin/users/[chefId]': {
    title: 'Chef Detail',
    description: "Full view of a single chef's account — financials, health, events, and clients.",
    features: [
      'Health score breakdown',
      'Financial summary',
      'Event and client lists',
      'Credit form',
      'Danger zone',
    ],
  },

  '/admin/animations': {
    title: 'Animation Lab',
    description: 'Test and preview holiday and milestone animations.',
    features: ['Holiday animation buttons', 'Milestone triggers', 'Playback controls'],
  },

  // ═══════════════════════════════════════════════════════
  //  PARTNER PORTAL
  // ═══════════════════════════════════════════════════════

  '/partner/dashboard': {
    title: 'Partner Dashboard',
    description: 'Your partner home base — stats, locations, and recent events.',
    features: [
      'Stats cards (locations, events, guests)',
      'Location grid',
      'Recent events table',
      'Partnership story badge',
    ],
  },

  '/partner/events': {
    title: 'Partner Events',
    description: 'Full event history across all your partner locations.',
    features: [
      'Events table with status',
      'Date, occasion, and guest count',
      'Location attribution',
    ],
  },

  '/partner/preview': {
    title: 'Public Page Preview',
    description: "See how your partner page appears on the chef's public showcase.",
    features: ['Showcase card preview', 'Locations grid', 'Photo gallery', 'Live page link'],
  },

  '/partner/profile': {
    title: 'Partner Profile',
    description: 'Edit your partner profile — name, description, contact info, and website.',
    features: ['Editable form fields', 'Cover image upload', 'Visibility status'],
  },

  '/partner/locations': {
    title: 'Partner Locations',
    description: 'Overview of all your managed locations.',
    features: ['Active locations list', 'Event counts', 'Capacity details'],
  },

  '/partner/locations/[id]': {
    title: 'Location Detail',
    description: 'Full detail for a specific location — photos, stats, and event history.',
    features: ['Location stats', 'Photo gallery', 'Event history', 'Capacity info'],
  },

  // ═══════════════════════════════════════════════════════
  //  AUTH PAGES
  // ═══════════════════════════════════════════════════════

  '/auth/signin': {
    title: 'Sign In',
    description: 'Sign in to your ChefFlow account.',
    features: [
      'Email and password login',
      'Google sign-in',
      'Forgot password link',
      'Links to signup',
    ],
  },

  '/auth/signup': {
    title: 'Sign Up',
    description: 'Create your ChefFlow account — start managing your private chef business.',
    features: ['Chef or client signup', 'Invitation token support', 'Business name and phone'],
  },

  '/auth/client-signup': {
    title: 'Client Sign Up',
    description: "Create a client account — access your chef's portal.",
    features: ['Client-specific form', 'Invitation pre-fill', 'Name, phone, password'],
  },

  '/auth/partner-signup': {
    title: 'Partner Claim',
    description: 'Claim your referral partner account via invitation link.',
    features: ['Invitation verification', 'Account creation', 'Auto-redirect to partner dashboard'],
  },

  '/auth/role-selection': {
    title: 'Choose Your Role',
    description: "Select whether you're a chef or a client.",
    features: ['Two-button role choice', 'Clear role descriptions'],
  },

  '/auth/verify-email': {
    title: 'Verify Email',
    description: 'Check your email for a verification link.',
    features: ['Verification instructions', 'Link to sign in if verified'],
  },

  '/auth/forgot-password': {
    title: 'Forgot Password',
    description: 'Request a password reset link via email.',
    features: ['Email input', 'Success confirmation', 'Try again option'],
  },

  '/auth/reset-password': {
    title: 'Reset Password',
    description: 'Set a new password after clicking the reset link.',
    features: ['New password entry', 'Confirmation field', 'Strength requirements'],
  },

  // ═══════════════════════════════════════════════════════
  //  BOOKING PAGES
  // ═══════════════════════════════════════════════════════

  '/book/[chefSlug]': {
    title: 'Book a Chef',
    description: 'Book this chef for your next event.',
    features: ['Chef profile preview', 'Inquiry form', 'Date selection'],
  },

  '/book/[chefSlug]/thank-you': {
    title: 'Booking Confirmed',
    description: 'Your booking request has been submitted — the chef will be in touch.',
    features: ['Confirmation message', 'Next steps', 'Contact info'],
  },

  '/book/campaign/[token]': {
    title: 'Campaign Booking',
    description: 'Book through a special campaign or promotion.',
    features: ['Campaign details', 'Special pricing', 'Booking form'],
  },

  // ═══════════════════════════════════════════════════════
  //  OTHER
  // ═══════════════════════════════════════════════════════

  '/unauthorized': {
    title: 'Unauthorized',
    description: "You don't have access to this page.",
    features: ['Access denied message', 'Sign in link', 'Contact support'],
  },

  '/client/[token]': {
    title: 'Client Portal',
    description: 'Token-based client portal access.',
    features: ['Direct access via link', 'No password required', 'Event details'],
  },
}
