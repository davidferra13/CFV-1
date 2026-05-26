import type { AgreementTemplate, TemplateItem, ItemCategory } from './agreement-types'

// ─── Base Checklist Items (shared across all templates) ─────────────────────

const BASE_ITEMS: TemplateItem[] = [
  // Category 1: Tickets & Revenue
  { category: 'tickets_revenue', title: 'Ticket pricing', signatureCritical: true },
  { category: 'tickets_revenue', title: 'Who sells tickets', signatureCritical: true },
  { category: 'tickets_revenue', title: 'Revenue split model', signatureCritical: true },
  {
    category: 'tickets_revenue',
    title: 'Revenue split ratio and amounts',
    signatureCritical: true,
  },
  { category: 'tickets_revenue', title: 'Payment method and timing', signatureCritical: true },
  { category: 'tickets_revenue', title: 'Refund policy ownership', signatureCritical: true },

  // Category 2: Ingredients & Sourcing
  { category: 'ingredients', title: 'Farm-sourced ingredients', signatureCritical: true },
  {
    category: 'ingredients',
    title: 'Market-bought ingredients (who shops, who pays)',
    signatureCritical: true,
  },
  {
    category: 'ingredients',
    title: 'Specialty items (butcher, fishmonger, forager)',
    signatureCritical: true,
  },
  {
    category: 'ingredients',
    title: 'Ingredient list exchange (quantities and confirmation)',
    signatureCritical: false,
  },
  { category: 'ingredients', title: 'Substitution authority', signatureCritical: true },
  { category: 'ingredients', title: 'Harvest timing coordination', signatureCritical: false },

  // Category 3: Equipment & Serviceware
  { category: 'equipment', title: 'Plates, bowls, serving platters', signatureCritical: true },
  { category: 'equipment', title: 'Glasses (water, wine, cocktail)', signatureCritical: true },
  { category: 'equipment', title: 'Silverware and napkins', signatureCritical: true },
  {
    category: 'equipment',
    title: 'Cooking equipment (grills, burners, ovens)',
    signatureCritical: true,
  },
  {
    category: 'equipment',
    title: 'Prep equipment (cutting boards, blenders, processors)',
    signatureCritical: false,
  },
  {
    category: 'equipment',
    title: 'Serving equipment (chafing dishes, boards)',
    signatureCritical: false,
  },
  { category: 'equipment', title: 'Tables, chairs, seating', signatureCritical: true },
  { category: 'equipment', title: 'Linens and table cloths', signatureCritical: false },
  {
    category: 'equipment',
    title: 'Rentals needed (who arranges, who pays)',
    signatureCritical: true,
  },

  // Category 4: Venue & Setup
  {
    category: 'venue_setup',
    title: 'Property preparation (mowing, cleaning, pathways)',
    signatureCritical: true,
  },
  { category: 'venue_setup', title: 'Table setup and decor', signatureCritical: false },
  {
    category: 'venue_setup',
    title: 'Lighting (string lights, candles, lanterns)',
    signatureCritical: false,
  },
  {
    category: 'venue_setup',
    title: 'Weather contingency (tents, indoor backup)',
    signatureCritical: true,
  },
  { category: 'venue_setup', title: 'Parking arrangement', signatureCritical: false },
  { category: 'venue_setup', title: 'Signage and wayfinding', signatureCritical: false },
  {
    category: 'venue_setup',
    title: 'Heating or cooling (outdoor heaters, fans)',
    signatureCritical: false,
  },
  { category: 'venue_setup', title: 'Restroom access', signatureCritical: true },
  {
    category: 'venue_setup',
    title: 'Power (extension cords, generators)',
    signatureCritical: false,
  },

  // Category 5: Culinary Execution
  { category: 'culinary', title: 'Menu design and finalization', signatureCritical: true },
  { category: 'culinary', title: 'Prep (by course)', signatureCritical: true },
  { category: 'culinary', title: 'Cooking (by course)', signatureCritical: true },
  { category: 'culinary', title: 'Plating (by course)', signatureCritical: true },
  { category: 'culinary', title: 'Service and running food', signatureCritical: true },
  { category: 'culinary', title: 'Appetizers and pre-dinner nibbles', signatureCritical: false },
  { category: 'culinary', title: 'Dessert', signatureCritical: false },
  { category: 'culinary', title: 'Staff and helpers needed', signatureCritical: true },

  // Category 6: Beverages
  { category: 'beverages', title: 'Wine and beer sourcing', signatureCritical: true },
  { category: 'beverages', title: 'Cocktail and mocktail creation', signatureCritical: false },
  { category: 'beverages', title: 'Non-alcoholic beverages', signatureCritical: false },
  { category: 'beverages', title: 'Who pays for beverages', signatureCritical: true },
  { category: 'beverages', title: 'Included in ticket vs upcharge', signatureCritical: true },
  { category: 'beverages', title: 'Bar setup and service', signatureCritical: true },

  // Category 7: Hospitality & Guest Experience
  { category: 'hospitality', title: 'Guest greeting and welcome', signatureCritical: false },
  { category: 'hospitality', title: 'Farm tour or venue tour', signatureCritical: false },
  {
    category: 'hospitality',
    title: 'Course introductions and storytelling',
    signatureCritical: false,
  },
  {
    category: 'hospitality',
    title: 'Guest comfort (blankets, heaters, bug spray)',
    signatureCritical: false,
  },
  { category: 'hospitality', title: 'Music and ambiance', signatureCritical: false },
  {
    category: 'hospitality',
    title: 'Post-dinner experience (fire pit, lounge)',
    signatureCritical: false,
  },

  // Category 8: Marketing & Promotion
  { category: 'marketing', title: 'Event flyer and graphic design', signatureCritical: false },
  { category: 'marketing', title: 'Social media promotion', signatureCritical: false },
  { category: 'marketing', title: 'Website listing', signatureCritical: false },
  { category: 'marketing', title: 'Cross-promotion (tag each other)', signatureCritical: false },
  { category: 'marketing', title: 'Photography during event', signatureCritical: true },
  { category: 'marketing', title: 'Post-event content sharing', signatureCritical: false },

  // Category 9: Guest Management
  {
    category: 'guest_management',
    title: 'Guest communication (pre-event email, logistics)',
    signatureCritical: true,
  },
  {
    category: 'guest_management',
    title: 'Dietary restrictions and allergies collection',
    signatureCritical: true,
  },
  {
    category: 'guest_management',
    title: 'Headcount tracking and confirmation',
    signatureCritical: true,
  },
  {
    category: 'guest_management',
    title: 'Special occasions (birthdays, etc.)',
    signatureCritical: false,
  },
  { category: 'guest_management', title: 'Day-of guest questions', signatureCritical: false },

  // Category 10: Wrap-Up & Post-Event
  { category: 'wrap_up', title: 'Clear table (dishes, glasses, decor)', signatureCritical: false },
  { category: 'wrap_up', title: 'Wash dishes and serviceware', signatureCritical: false },
  { category: 'wrap_up', title: 'Clean cooking area', signatureCritical: false },
  {
    category: 'wrap_up',
    title: 'Pack chef personal equipment (knives, kit)',
    signatureCritical: false,
  },
  { category: 'wrap_up', title: 'Store or return venue equipment', signatureCritical: false },
  { category: 'wrap_up', title: 'Dispose of trash and compost', signatureCritical: false },
  { category: 'wrap_up', title: 'Clean restroom areas', signatureCritical: false },
  {
    category: 'wrap_up',
    title: 'Break down tent or temporary structures',
    signatureCritical: false,
  },
  { category: 'wrap_up', title: 'Store tables and chairs', signatureCritical: false },
  { category: 'wrap_up', title: 'Handle leftover food (who keeps what)', signatureCritical: false },
  {
    category: 'wrap_up',
    title: 'Secure venue (lock sheds, turn off lights, close gates)',
    signatureCritical: false,
  },
  { category: 'wrap_up', title: 'Return borrowed or rented items', signatureCritical: false },
  { category: 'wrap_up', title: 'Thank-you messages to guests', signatureCritical: false },
  { category: 'wrap_up', title: 'Share event photos between co-hosts', signatureCritical: false },
  {
    category: 'wrap_up',
    title: 'Post-event social media (tagging, sharing)',
    signatureCritical: false,
  },
  {
    category: 'wrap_up',
    title: 'Collect reviews and feedback from guests',
    signatureCritical: false,
  },
  { category: 'wrap_up', title: 'Revenue reconciliation and payout', signatureCritical: true },
  {
    category: 'wrap_up',
    title: 'Debrief between co-hosts (what worked, what to change)',
    signatureCritical: false,
  },

  // Category 11: Cancellation & Contingency
  {
    category: 'cancellation',
    title: 'Sunk cost absorption (who eats ingredient costs)',
    signatureCritical: true,
  },
  { category: 'cancellation', title: 'Refund responsibility', signatureCritical: true },
  { category: 'cancellation', title: 'Rescheduling terms', signatureCritical: true },
  {
    category: 'cancellation',
    title: 'Minimum notice period for cancellation',
    signatureCritical: true,
  },
  { category: 'cancellation', title: 'Weather backup plan', signatureCritical: true },
]

// ─── Template Definitions ───────────────────────────────────────────────────

export const AGREEMENT_TEMPLATES: Record<string, AgreementTemplate> = {
  chef_farm: {
    type: 'chef_farm',
    label: 'Chef + Farm/Venue',
    description:
      'Chef cooks, farmer provides venue and ingredients. The primary collaborative dining model.',
    defaultCompensationModel: 'both_sell',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS,
  },
  chef_private_host: {
    type: 'chef_private_host',
    label: 'Chef + Private Host',
    description: 'Someone hiring a chef for their home dinner party.',
    defaultCompensationModel: 'fixed_fee',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS.filter((i) => i.category !== 'marketing'),
  },
  chef_chef: {
    type: 'chef_chef',
    label: 'Chef + Chef',
    description: 'Two chefs collaborating on a multi-course event.',
    defaultCompensationModel: 'both_sell',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS.filter((i) => i.category !== 'venue_setup'),
  },
  chef_restaurant: {
    type: 'chef_restaurant',
    label: 'Chef + Restaurant',
    description: 'Pop-up dinner at an existing restaurant venue.',
    defaultCompensationModel: 'venue_sells_all',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS,
  },
  chef_planner: {
    type: 'chef_planner',
    label: 'Chef + Event Planner',
    description: 'Planner handles logistics and tickets, chef handles food.',
    defaultCompensationModel: 'venue_sells_all',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS,
  },
}

export function getTemplate(type: string): AgreementTemplate {
  return AGREEMENT_TEMPLATES[type] || AGREEMENT_TEMPLATES.chef_farm
}
