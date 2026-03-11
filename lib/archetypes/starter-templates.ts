// Starter Templates Per Archetype
// Pre-built contract, email, and invoice templates that auto-load on first setup.
// Each archetype gets templates tailored to their business type.
// NOT a server action file - no 'use server'.

import { ARCHETYPE_IDS, type ArchetypeId } from './registry'

export type StarterTemplateType =
  | 'contract'
  | 'email-inquiry-response'
  | 'email-booking-confirmation'
  | 'email-follow-up'
  | 'invoice-memo'

export type StarterTemplate = {
  archetypeId: ArchetypeId
  templateType: StarterTemplateType
  name: string
  subject?: string // for email types
  body: string
}

// Available variables for personalization:
// {{chefName}}, {{clientName}}, {{businessName}}, {{eventDate}}, {{totalAmount}}, {{serviceName}}

// ---- Private Chef Templates ------------------------------------------------

const PRIVATE_CHEF_TEMPLATES: StarterTemplate[] = [
  {
    archetypeId: 'private-chef',
    templateType: 'contract',
    name: 'Private Dining Experience Agreement',
    body: `PRIVATE DINING EXPERIENCE AGREEMENT

Between {{businessName}} ("Chef") and {{clientName}} ("Client")

Service: {{serviceName}}
Date: {{eventDate}}
Total: {{totalAmount}}

1. SCOPE OF SERVICE
{{businessName}} will provide a private dining experience at the Client's designated location. This includes menu planning, ingredient sourcing, on-site cooking, plating, and kitchen cleanup.

2. MENU & DIETARY NEEDS
The menu will be finalized no later than 7 days before the event date. The Client is responsible for communicating all dietary restrictions, allergies, and guest preferences before menu finalization.

3. KITCHEN REQUIREMENTS
The Client will provide a clean, functional kitchen with standard appliances. The Chef will bring all specialty equipment, tools, and ingredients unless otherwise agreed.

4. PAYMENT TERMS
A 50% deposit is due upon signing this agreement. The remaining balance is due on the day of service. Late payments are subject to a 5% weekly fee.

5. CANCELLATION POLICY
Cancellations made 7+ days before the event: full refund minus a $100 administrative fee.
Cancellations within 7 days: deposit is non-refundable.
Cancellations within 48 hours: full amount is due.

6. LIABILITY
{{businessName}} carries liability insurance for on-site services. The Client assumes responsibility for informing all guests of menu contents and potential allergens.

Agreed and accepted:

Chef: {{chefName}} / {{businessName}}
Client: {{clientName}}
Date: _______________`,
  },
  {
    archetypeId: 'private-chef',
    templateType: 'email-inquiry-response',
    name: 'Private Dining Inquiry Response',
    subject: 'Your Private Dining Experience with {{businessName}}',
    body: `Hi {{clientName}},

Thank you for reaching out about a private dining experience. I would love to learn more about what you have in mind.

To put together the perfect menu, it would help to know:
- How many guests you are expecting
- Any dietary restrictions or allergies
- The occasion (birthday, anniversary, date night, etc.)
- Any cuisine preferences or dishes you have been craving

I typically work with clients to create a fully customized multi-course menu. Every detail, from ingredients to presentation, is tailored to your group.

I would be happy to set up a quick call or continue over email, whatever works best for you.

Looking forward to cooking for you,
{{chefName}}`,
  },
  {
    archetypeId: 'private-chef',
    templateType: 'email-booking-confirmation',
    name: 'Private Dining Booking Confirmation',
    subject: 'Confirmed: Your Private Dining Experience on {{eventDate}}',
    body: `Hi {{clientName}},

Great news! Your private dining experience is confirmed for {{eventDate}}.

Here is a quick summary:
- Service: {{serviceName}}
- Date: {{eventDate}}
- Total: {{totalAmount}}

Next steps:
1. I will send over a proposed menu within the next few days
2. We will finalize the menu at least one week before your event
3. I will arrive approximately 2 hours before the scheduled service time

If anything changes or you have questions, just reply to this email.

Looking forward to it,
{{chefName}}`,
  },
  {
    archetypeId: 'private-chef',
    templateType: 'email-follow-up',
    name: 'Post-Dinner Follow-Up',
    subject: 'How was your dinner experience?',
    body: `Hi {{clientName}},

I hope you and your guests enjoyed the evening. It was a pleasure cooking for you.

If you have any feedback or if there is anything I could improve for next time, I would genuinely love to hear it.

If you are interested in booking another experience, I am happy to work with your schedule. Many of my clients enjoy seasonal menus that change throughout the year.

Thank you again for trusting me with your special evening.

Warm regards,
{{chefName}}`,
  },
  {
    archetypeId: 'private-chef',
    templateType: 'invoice-memo',
    name: 'Private Dining Invoice Note',
    body: `Private dining experience for {{clientName}} on {{eventDate}}. Includes menu planning, ingredient sourcing, on-site cooking, plating, and kitchen cleanup.`,
  },
]

// ---- Caterer Templates ------------------------------------------------------

const CATERER_TEMPLATES: StarterTemplate[] = [
  {
    archetypeId: 'caterer',
    templateType: 'contract',
    name: 'Catering Services Agreement',
    body: `CATERING SERVICES AGREEMENT

Between {{businessName}} ("Caterer") and {{clientName}} ("Client")

Event: {{serviceName}}
Date: {{eventDate}}
Total: {{totalAmount}}

1. SCOPE OF SERVICE
{{businessName}} will provide catering services including food preparation, delivery, setup, service, and breakdown at the designated venue. Staffing, equipment, and service style will be outlined in the attached event proposal.

2. MENU & SERVICE DETAILS
The final menu, guest count, and service style (buffet, plated, stations, etc.) must be confirmed no later than 14 days before the event. Guest count adjustments of up to 10% are accepted until 7 days before the event.

3. VENUE & ACCESS
The Client will ensure venue access for setup at least 3 hours before event start time. The Caterer requires access to power outlets, water, and a designated staging area. Any venue restrictions (no open flame, noise limits, etc.) must be communicated in advance.

4. STAFFING
The Caterer will provide the agreed number of service staff, cooks, and a lead coordinator. Additional staff requested within 7 days of the event is subject to availability and additional charges.

5. EQUIPMENT & RENTALS
Unless specified otherwise, the Caterer will provide all serving equipment, chafing dishes, and utensils. Table linens, china, and glassware rentals are available at additional cost if requested.

6. PAYMENT TERMS
A 30% deposit is due upon signing. A second payment of 40% is due 14 days before the event. The remaining 30% is due within 7 days after the event. Late payments are subject to a 5% weekly fee.

7. CANCELLATION POLICY
Cancellations 30+ days before: full refund minus a $250 administrative fee.
Cancellations 14-29 days: 50% of total is due.
Cancellations within 14 days: full amount is due.

8. LIABILITY & INSURANCE
{{businessName}} carries general liability and food safety insurance. The Client is responsible for securing any required venue permits and communicating guest allergy information.

Agreed and accepted:

Caterer: {{chefName}} / {{businessName}}
Client: {{clientName}}
Date: _______________`,
  },
  {
    archetypeId: 'caterer',
    templateType: 'email-inquiry-response',
    name: 'Catering Inquiry Response',
    subject: 'Your Catering Inquiry with {{businessName}}',
    body: `Hi {{clientName}},

Thank you for considering {{businessName}} for your upcoming event. We would be excited to help make it a success.

To put together an accurate proposal, could you share a few details?
- Event date and approximate start/end times
- Expected guest count
- Venue location (or if you are still deciding)
- Service style preference (buffet, plated, food stations, cocktail reception)
- Any dietary requirements or food allergy considerations
- Budget range, if you have one in mind

Once I have these details, I will put together a custom proposal with menu options and pricing.

Looking forward to hearing from you,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'caterer',
    templateType: 'email-booking-confirmation',
    name: 'Catering Booking Confirmation',
    subject: 'Confirmed: Catering for {{serviceName}} on {{eventDate}}',
    body: `Hi {{clientName}},

Your catering booking is confirmed. Here are the details:

- Event: {{serviceName}}
- Date: {{eventDate}}
- Total: {{totalAmount}}

What happens next:
1. We will finalize the menu and service details at least 2 weeks before your event
2. Final guest count is due 7 days before the event
3. Our team will arrive for setup per the agreed timeline

I will be your main point of contact throughout the process. If you have questions or need to make changes, just reach out.

Thank you for choosing {{businessName}},
{{chefName}}`,
  },
  {
    archetypeId: 'caterer',
    templateType: 'email-follow-up',
    name: 'Post-Event Follow-Up',
    subject: 'Thank you for choosing {{businessName}}',
    body: `Hi {{clientName}},

Thank you for choosing {{businessName}} for your event. We hope everything exceeded your expectations.

Your feedback means a lot to us. If you have a moment, we would appreciate hearing what worked well and anything we could improve.

If you have upcoming events or know someone looking for catering, we would love to help again. Repeat clients enjoy priority booking and special pricing.

Thank you again,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'caterer',
    templateType: 'invoice-memo',
    name: 'Catering Invoice Note',
    body: `Catering services for {{serviceName}} on {{eventDate}}. Includes food preparation, delivery, setup, service staff, and breakdown.`,
  },
]

// ---- Meal Prep Templates ----------------------------------------------------

const MEAL_PREP_TEMPLATES: StarterTemplate[] = [
  {
    archetypeId: 'meal-prep',
    templateType: 'contract',
    name: 'Meal Preparation Service Agreement',
    body: `MEAL PREPARATION SERVICE AGREEMENT

Between {{businessName}} ("Chef") and {{clientName}} ("Client")

Service: {{serviceName}}
Start Date: {{eventDate}}
Rate: {{totalAmount}}

1. SCOPE OF SERVICE
{{businessName}} will prepare meals according to the agreed plan and schedule. Services include menu planning, grocery shopping, meal preparation, portioning, labeling, and refrigerator/freezer organization.

2. MEAL PLAN & PREFERENCES
The Client will provide dietary preferences, restrictions, allergies, and any ingredient exclusions before the first session. Menu selections will be confirmed at least 3 days before each prep day.

3. SCHEDULE & ACCESS
Prep sessions are scheduled on agreed days. The Client will provide kitchen access during prep times. If the Client needs to reschedule, at least 48 hours notice is required.

4. INGREDIENTS & GROCERIES
Grocery costs are separate from the service fee unless an all-inclusive rate is agreed upon. The Chef will shop for ingredients and provide receipts. The Client may also provide specific ingredients or preferred brands.

5. FOOD STORAGE
All meals will be properly labeled with contents and date. The Chef will organize meals in the Client's refrigerator and freezer. Storage containers are provided by the Chef unless otherwise arranged.

6. PAYMENT TERMS
Payment is due at the beginning of each service period (weekly or monthly, as agreed). Late payments may result in service interruption.

7. CANCELLATION
Either party may cancel with 7 days written notice. Cancellations with less than 48 hours notice for a scheduled session will be charged at full rate.

Agreed and accepted:

Chef: {{chefName}} / {{businessName}}
Client: {{clientName}}
Date: _______________`,
  },
  {
    archetypeId: 'meal-prep',
    templateType: 'email-inquiry-response',
    name: 'Meal Prep Inquiry Response',
    subject: 'Your Meal Prep Inquiry with {{businessName}}',
    body: `Hi {{clientName}},

Thanks for your interest in personalized meal prep. I would love to help simplify your week.

To get started, it would help to know:
- How many people I would be cooking for
- Any dietary goals, restrictions, or allergies
- Cuisine preferences or foods you want to avoid
- How many meals per week you are looking for
- Whether you prefer fresh meals (3-4 day shelf life) or frozen (ready to reheat anytime)

I work with each client to create a custom plan that fits their lifestyle. No generic meal kits here, just real food made for you.

Happy to set up a quick consultation to talk through options.

Best,
{{chefName}}`,
  },
  {
    archetypeId: 'meal-prep',
    templateType: 'email-booking-confirmation',
    name: 'Meal Prep Service Confirmation',
    subject: 'Welcome to {{businessName}} - Your Meal Prep Plan',
    body: `Hi {{clientName}},

Welcome aboard! Your meal prep service is set to begin on {{eventDate}}.

Here is a summary:
- Service: {{serviceName}}
- Starting: {{eventDate}}
- Rate: {{totalAmount}}

What to expect:
1. I will send over your first week's menu options within the next couple of days
2. You pick what sounds good (or let me surprise you)
3. I will shop, prep, and have everything organized in your fridge on our scheduled day

If you have any last-minute dietary notes or preferences, just let me know before we kick off.

Excited to get cooking for you,
{{chefName}}`,
  },
  {
    archetypeId: 'meal-prep',
    templateType: 'email-follow-up',
    name: 'Meal Prep Check-In',
    subject: 'How is everything tasting?',
    body: `Hi {{clientName}},

Just checking in to see how the meals have been working out for you.

I always appreciate feedback, whether it is about flavors, portions, variety, or anything else. My goal is to keep things fresh and make sure you are getting exactly what you need.

If you want to adjust your plan, add meals, or try something different next week, just let me know.

Thanks for being a great client,
{{chefName}}`,
  },
  {
    archetypeId: 'meal-prep',
    templateType: 'invoice-memo',
    name: 'Meal Prep Invoice Note',
    body: `Meal preparation service for {{clientName}}, week of {{eventDate}}. Includes menu planning, grocery shopping, cooking, portioning, and labeling.`,
  },
]

// ---- Restaurant Templates ---------------------------------------------------

const RESTAURANT_TEMPLATES: StarterTemplate[] = [
  {
    archetypeId: 'restaurant',
    templateType: 'contract',
    name: 'Private Event / Buyout Agreement',
    body: `PRIVATE EVENT AGREEMENT

Between {{businessName}} ("Restaurant") and {{clientName}} ("Client")

Event: {{serviceName}}
Date: {{eventDate}}
Total: {{totalAmount}}

1. SCOPE OF SERVICE
{{businessName}} will host a private event at the restaurant location. This agreement covers exclusive or semi-exclusive use of the space, a set menu, beverage service, and dedicated staff for the duration of the event.

2. SPACE & CAPACITY
The Client will have use of the agreed dining area. Maximum capacity and any layout preferences (seating arrangement, standing reception, etc.) will be confirmed at booking.

3. MENU & BEVERAGES
A set menu will be selected from the provided options at least 10 days before the event. Beverage packages (open bar, limited bar, consumption-based) will be agreed in advance. Final guest count is due 5 days before the event.

4. TIMING
The space will be available from the agreed start time. Events extending beyond the agreed end time may incur additional hourly charges.

5. PAYMENT TERMS
A 50% deposit secures the reservation. The remaining balance is due on the day of the event. A final invoice reflecting actual beverage consumption (if applicable) will be sent within 3 business days.

6. CANCELLATION
Cancellations 14+ days: full refund minus a $200 reservation fee.
Cancellations 7-13 days: 50% of deposit retained.
Cancellations within 7 days: deposit is non-refundable.

7. DAMAGE & CONDUCT
The Client is responsible for any damage to the restaurant caused by their guests. {{businessName}} reserves the right to end the event if guest conduct endangers staff or property.

Agreed and accepted:

Restaurant: {{chefName}} / {{businessName}}
Client: {{clientName}}
Date: _______________`,
  },
  {
    archetypeId: 'restaurant',
    templateType: 'email-inquiry-response',
    name: 'Private Event Inquiry Response',
    subject: 'Hosting Your Event at {{businessName}}',
    body: `Hi {{clientName}},

Thank you for your interest in hosting an event at {{businessName}}. We love putting together memorable private dining experiences.

A few details that would help us plan:
- Preferred date and time
- Expected number of guests
- Whether you are looking for a full buyout or a semi-private section
- Any special occasions or themes
- Dietary considerations for the group
- Interest in a beverage package

I will put together a proposal with menu options and pricing once I know more about what you are envisioning.

Looking forward to it,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'restaurant',
    templateType: 'email-booking-confirmation',
    name: 'Private Event Booking Confirmation',
    subject: 'Your Event at {{businessName}} is Confirmed - {{eventDate}}',
    body: `Hi {{clientName}},

Your private event at {{businessName}} is confirmed for {{eventDate}}.

Event details:
- Event: {{serviceName}}
- Date: {{eventDate}}
- Total: {{totalAmount}}

Next steps:
1. Menu selection is due at least 10 days before your event
2. Final guest count is due 5 days before
3. Our events coordinator will be in touch to discuss any special requests

If you need to make changes, please reach out as early as possible.

We are looking forward to hosting you,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'restaurant',
    templateType: 'email-follow-up',
    name: 'Post-Event Thank You',
    subject: 'Thank you for celebrating at {{businessName}}',
    body: `Hi {{clientName}},

It was a pleasure hosting your event at {{businessName}}. We hope you and your guests had a wonderful time.

We would love to hear your feedback, both what you enjoyed and anything we could do better.

If you are planning future events or would like to make a regular reservation, we are always happy to accommodate.

Thank you again for choosing us,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'restaurant',
    templateType: 'invoice-memo',
    name: 'Private Event Invoice Note',
    body: `Private event at {{businessName}} for {{clientName}} on {{eventDate}}. Includes venue, set menu, beverage service, and dedicated staff.`,
  },
]

// ---- Food Truck Templates ---------------------------------------------------

const FOOD_TRUCK_TEMPLATES: StarterTemplate[] = [
  {
    archetypeId: 'food-truck',
    templateType: 'contract',
    name: 'Mobile Food Service Agreement',
    body: `MOBILE FOOD SERVICE AGREEMENT

Between {{businessName}} ("Vendor") and {{clientName}} ("Client")

Event: {{serviceName}}
Date: {{eventDate}}
Total: {{totalAmount}}

1. SCOPE OF SERVICE
{{businessName}} will provide mobile food service at the designated location. Service includes food truck setup, food preparation, service, and cleanup.

2. LOCATION & ACCESS
The Client will provide the exact service location and ensure adequate space for the truck (minimum 40ft x 12ft, level surface). Access to the site must be available at least 1 hour before service begins. The Client is responsible for confirming the location permits food truck operations.

3. PERMITS & COMPLIANCE
{{businessName}} maintains all required health permits, food handler certifications, and vehicle registrations. The Client is responsible for securing any event-specific permits, parking permissions, or site authorizations required by the venue or municipality.

4. UTILITIES
The food truck is self-contained (generator, water, propane). If the Client provides electrical hookup, it must be a dedicated 30-amp circuit. Water hookup is appreciated but not required.

5. MENU & SERVICE
The menu will be agreed upon at least 7 days before the event. Guest count estimates help ensure adequate food supply. Service duration and style (open service, ticket-based, pre-paid) will be confirmed at booking.

6. PAYMENT TERMS
A 50% deposit is due upon signing. The remaining balance is due on the day of service. For minimum-guarantee events, any shortfall between actual sales and the guarantee is invoiced within 3 business days.

7. CANCELLATION & WEATHER
Cancellations 7+ days: full refund minus a $150 booking fee.
Cancellations within 7 days: deposit is non-refundable.
Weather: If severe weather makes service unsafe, both parties may agree to reschedule at no additional cost.

Agreed and accepted:

Vendor: {{chefName}} / {{businessName}}
Client: {{clientName}}
Date: _______________`,
  },
  {
    archetypeId: 'food-truck',
    templateType: 'email-inquiry-response',
    name: 'Food Truck Booking Inquiry Response',
    subject: 'Book {{businessName}} for Your Event',
    body: `Hi {{clientName}},

Thanks for reaching out about booking {{businessName}}! We love bringing the truck to private events.

To give you an accurate quote, it would help to know:
- Event date and location
- Expected number of guests
- Service duration (lunch, dinner, late night, all day?)
- Whether this is a private event (pre-paid) or public (guests pay individually)
- Any menu preferences or must-haves

I will get back to you with availability, menu options, and pricing.

Talk soon,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'food-truck',
    templateType: 'email-booking-confirmation',
    name: 'Food Truck Booking Confirmation',
    subject: 'Confirmed: {{businessName}} at Your Event on {{eventDate}}',
    body: `Hi {{clientName}},

We are locked in for {{eventDate}}. Here is the summary:

- Event: {{serviceName}}
- Date: {{eventDate}}
- Total: {{totalAmount}}

What we need from you before the event:
1. Confirm the exact location and any access instructions
2. Let us know about parking or setup restrictions
3. Final guest count estimate at least 3 days before

We will arrive about an hour early to set up and be ready to roll when your guests are.

Can not wait,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'food-truck',
    templateType: 'email-follow-up',
    name: 'Post-Event Follow-Up',
    subject: 'Thanks for having {{businessName}}!',
    body: `Hi {{clientName}},

Thanks for having us out. We had a great time feeding your crew.

If the food was a hit and you want to book us again, just say the word. We also do recurring setups for offices, breweries, and weekly spots.

And if you have a moment, we would really appreciate a review online. It helps us get to more events like yours.

Thanks again,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'food-truck',
    templateType: 'invoice-memo',
    name: 'Food Truck Service Invoice Note',
    body: `Mobile food service by {{businessName}} for {{clientName}} on {{eventDate}}. Includes truck setup, food preparation, on-site service, and cleanup.`,
  },
]

// ---- Bakery Templates -------------------------------------------------------

const BAKERY_TEMPLATES: StarterTemplate[] = [
  {
    archetypeId: 'bakery',
    templateType: 'contract',
    name: 'Custom Order Agreement',
    body: `CUSTOM ORDER AGREEMENT

Between {{businessName}} ("Baker") and {{clientName}} ("Client")

Order: {{serviceName}}
Pickup/Delivery Date: {{eventDate}}
Total: {{totalAmount}}

1. SCOPE OF SERVICE
{{businessName}} will produce the custom baked goods described in the attached order details. This includes design consultation, ingredient sourcing, baking, decoration, and packaging.

2. DESIGN & TASTING
For custom cakes and large orders, a design consultation is included at no extra charge. Tasting sessions are available for orders over $300 and can be scheduled at the bakery.

3. ORDER DETAILS
The final order (flavors, design, quantity, size, inscription text) must be confirmed at least 10 days before the pickup/delivery date. Changes after this deadline are subject to availability and may incur additional charges.

4. ALLERGIES & INGREDIENTS
The Client must disclose all known allergies for end consumers. {{businessName}} works in a facility that handles common allergens (nuts, dairy, gluten, eggs). Cross-contamination-free production cannot be guaranteed unless specifically arranged.

5. PICKUP & DELIVERY
Orders are available for pickup at the bakery location during business hours. Delivery is available within the service area for an additional fee. The Client assumes responsibility for the order once picked up or signed for upon delivery.

6. PAYMENT TERMS
A 50% deposit is due when the order is confirmed. The remaining balance is due at pickup or before delivery. Custom orders are non-refundable once production has started.

7. CANCELLATION
Cancellations 10+ days before: full refund minus a $50 consultation fee.
Cancellations 5-9 days: 50% of total is due.
Cancellations within 5 days: full amount is due.

Agreed and accepted:

Baker: {{chefName}} / {{businessName}}
Client: {{clientName}}
Date: _______________`,
  },
  {
    archetypeId: 'bakery',
    templateType: 'email-inquiry-response',
    name: 'Custom Order Inquiry Response',
    subject: 'Your Custom Order Inquiry with {{businessName}}',
    body: `Hi {{clientName}},

Thank you for reaching out about a custom order. I would love to create something special for you.

To get started, could you tell me:
- What you are looking for (cake, cupcakes, pastries, cookies, bread, etc.)
- The occasion, if any
- How many people it needs to serve
- When you need it by
- Any flavor preferences or allergies
- Design inspiration (photos, colors, themes are all helpful)

I will get back to you with options, pricing, and availability. For larger orders, I am happy to schedule a tasting.

Looking forward to baking for you,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'bakery',
    templateType: 'email-booking-confirmation',
    name: 'Custom Order Confirmation',
    subject: 'Order Confirmed: {{serviceName}} for {{eventDate}}',
    body: `Hi {{clientName}},

Your order is confirmed. Here are the details:

- Order: {{serviceName}}
- Pickup/Delivery: {{eventDate}}
- Total: {{totalAmount}}

What happens next:
1. I will begin production according to the agreed timeline
2. You will receive a preview or progress update for large custom orders
3. Pickup is at the bakery, or delivery will be arranged per our agreement

If you need to make any last-minute changes, please reach out at least 10 days before your date.

Excited to bring this to life,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'bakery',
    templateType: 'email-follow-up',
    name: 'Post-Order Follow-Up',
    subject: 'How did everything turn out?',
    body: `Hi {{clientName}},

I hope you loved your order from {{businessName}}. It was a pleasure putting it together.

If you have photos from the event or any feedback, I would love to see and hear it. With your permission, I might feature your order on our page.

For future orders, returning clients get priority scheduling. Holidays and wedding season fill up fast, so booking early is always a good idea.

Thank you for supporting a small bakery,
{{chefName}}
{{businessName}}`,
  },
  {
    archetypeId: 'bakery',
    templateType: 'invoice-memo',
    name: 'Bakery Order Invoice Note',
    body: `Custom order from {{businessName}} for {{clientName}}. {{serviceName}}, for pickup/delivery on {{eventDate}}. Includes design consultation, ingredients, production, and packaging.`,
  },
]

// ---- All Templates Combined -------------------------------------------------

const STARTER_TEMPLATE_PACKS: Record<ArchetypeId, StarterTemplate[]> = {
  'private-chef': PRIVATE_CHEF_TEMPLATES,
  caterer: CATERER_TEMPLATES,
  'meal-prep': MEAL_PREP_TEMPLATES,
  restaurant: RESTAURANT_TEMPLATES,
  'food-truck': FOOD_TRUCK_TEMPLATES,
  bakery: BAKERY_TEMPLATES,
}

export const ALL_STARTER_TEMPLATES: StarterTemplate[] = ARCHETYPE_IDS.flatMap(
  (archetypeId) => STARTER_TEMPLATE_PACKS[archetypeId]
)

/**
 * Get starter templates for a specific archetype.
 * If no archetype is specified, returns all templates.
 */
export function getStarterTemplatesForArchetype(archetypeId?: ArchetypeId): StarterTemplate[] {
  if (!archetypeId) return ALL_STARTER_TEMPLATES
  return STARTER_TEMPLATE_PACKS[archetypeId] ?? []
}

/**
 * Get starter templates filtered by type across all archetypes.
 */
export function getStarterTemplatesByType(templateType: StarterTemplateType): StarterTemplate[] {
  return ALL_STARTER_TEMPLATES.filter((t) => t.templateType === templateType)
}

/**
 * All available template type labels for display.
 */
export const TEMPLATE_TYPE_LABELS: Record<StarterTemplateType, string> = {
  contract: 'Contract',
  'email-inquiry-response': 'Inquiry Response Email',
  'email-booking-confirmation': 'Booking Confirmation Email',
  'email-follow-up': 'Follow-Up Email',
  'invoice-memo': 'Invoice Memo',
}
