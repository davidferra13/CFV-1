// Marketing Constants
// Extracted from actions.ts so they can be imported by client components without
// violating the 'use server' rule (which only permits async function exports).

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  re_engagement: 'Re-Engagement',
  seasonal: 'Seasonal',
  announcement: 'Announcement',
  thank_you: 'Thank You',
  promotion: 'Promotion',
  push_dinner: 'Push Dinner',
  other: 'Other',
}

export const SEGMENT_OPTIONS = [
  { value: 'all_clients', label: 'All subscribed clients' },
  { value: 'dormant_90_days', label: 'Clients with no bookings in 90+ days' },
  { value: 'vip', label: 'VIP clients' },
  { value: 'birthday_next_30', label: 'Clients with a birthday in the next 30 days' },
  { value: 'post_event_30_60', label: 'Clients whose last event was 30–60 days ago' },
  { value: 'high_value', label: 'High-value clients (lifetime spend ≥ $1,500)' },
  { value: 'never_booked', label: 'Clients who have never booked an event' },
  { value: 'client_ids', label: 'Specific clients (hand-picked)' },
]

export const SYSTEM_TEMPLATES = [
  {
    name: 'Re-Engagement',
    campaign_type: 're_engagement',
    subject: "It's been a while — dinner soon?",
    body_html: `Hi {{first_name}},

I was just thinking about you and realized it's been a while since we last cooked together.

I'd love to plan something special for you — whether it's an intimate dinner, a celebration, or just a chance to enjoy a great meal at home.

I have some new dishes I'm excited to share. Want to catch up?

Warmly,
{{chef_name}}`,
  },
  {
    name: 'Seasonal Announcement',
    campaign_type: 'seasonal',
    subject: 'New seasonal menus are live',
    body_html: `Hi {{first_name}},

The new season is here and I couldn't be more excited to share what I've been working on.

I've updated my menus with the best ingredients coming into market right now — fresh, local, and full of flavor.

If you've been thinking about booking a dinner, this is a great time. Spots are filling up quickly.

Let me know if you'd like to set something up.

Best,
{{chef_name}}`,
  },
  {
    name: 'Birthday',
    campaign_type: 'announcement',
    subject: 'Happy birthday, {{first_name}} 🎂',
    body_html: `Hi {{first_name}},

Happy birthday! I hope this year brings you everything you're hoping for.

If you'd like to celebrate with a special dinner — just for you and your favorite people — I'd be honored to cook for you.

Reach out anytime and we'll make it happen.

With warmth,
{{chef_name}}`,
  },
  {
    name: 'Post-Event Thank You',
    campaign_type: 'thank_you',
    subject: 'It was such a pleasure cooking for you',
    body_html: `Hi {{first_name}},

I just wanted to say thank you again for having me cook for you. It was genuinely one of my favorite events.

I hope everything was exactly what you had in mind — and that everyone left happy and full.

If you ever want to do it again, or if you have friends looking for a private chef experience, I'd love to hear from you.

Take care,
{{chef_name}}`,
  },
  {
    name: 'New Offering',
    campaign_type: 'promotion',
    subject: 'Something new is on the menu',
    body_html: `Hi {{first_name}},

I've been developing something new and I think you're going to love it.

I'd love to tell you more — and ideally, cook it for you soon.

If you're interested, just reply to this email and we can figure out the details.

Looking forward to it,
{{chef_name}}`,
  },
  {
    name: 'Holiday Availability',
    campaign_type: 'seasonal',
    subject: 'Holiday dinners — limited dates available',
    body_html: `Hi {{first_name}},

The holidays are coming up fast and I'm already booking private dinners for the season.

If you're planning a gathering — Thanksgiving, Christmas, New Year's, or anything in between — I'd love to help make it special.

Dates are limited, so reach out soon if you'd like to reserve one.

Warmly,
{{chef_name}}`,
  },
]
