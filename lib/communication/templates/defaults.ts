// Default response templates shipped with ChefFlow
// These are seeded when a chef first enables communication features

export type DefaultTemplate = {
  name: string
  category: string
  subject: string
  body: string
  is_default: boolean
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: 'Inquiry Acknowledgment',
    category: 'auto_response',
    subject: 'Thank you for your inquiry, {{client_name}}!',
    body: `Hi {{client_name}},

Thank you for reaching out about {{occasion}}! I received your inquiry and wanted to let you know I am reviewing the details now.

I will get back to you {{response_time}} with more information and next steps.

In the meantime, feel free to reply to this email if you have any additional details to share.

Looking forward to connecting,
{{chef_name}}`,
    is_default: true,
  },
  {
    name: 'Outside Business Hours',
    category: 'auto_response',
    subject: 'Re: Your inquiry to {{business_name}}',
    body: `Hi {{client_name}},

Thank you for getting in touch! I am currently outside of my regular business hours, but I wanted to acknowledge your message.

I will review your inquiry and respond {{response_time}}.

If this is regarding an event happening today, please reply to this email with "URGENT" and I will prioritize your message.

Best regards,
{{chef_name}}`,
    is_default: false,
  },
  {
    name: 'Inquiry Follow-Up (3 Day)',
    category: 'follow_up',
    subject: 'Following up on your {{occasion}} inquiry',
    body: `Hi {{client_name}},

I wanted to follow up on your inquiry about {{occasion}}. I would love to help make your event special!

If you are still interested, I would be happy to discuss menu options, pricing, and availability. Just reply to this email or give me a call.

Looking forward to hearing from you,
{{chef_name}}`,
    is_default: true,
  },
  {
    name: 'Dormant Client Re-engagement',
    category: 're_engagement',
    subject: 'It has been a while, {{client_name}}!',
    body: `Hi {{client_name}},

It has been a little while since we last worked together, and I wanted to reach out. I hope you have been doing well!

I have some exciting new seasonal menu options that I think you would love. If you have any upcoming events or gatherings, I would be happy to put something special together.

Would love to catch up and cook for you again,
{{chef_name}}`,
    is_default: true,
  },
  {
    name: 'Menu Proposal Cover Letter',
    category: 'menu_proposal',
    subject: 'Your custom menu for {{occasion}} - {{event_date}}',
    body: `Hi {{client_name}},

I have put together a custom menu for your {{occasion}} on {{event_date}}. I have taken into account all the preferences and dietary needs you shared.

You can review the full menu and leave any feedback by clicking the link below. If any dish does not work for you, just flag it and I will suggest alternatives.

I am excited about this menu and think your guests will love it!

Best,
{{chef_name}}`,
    is_default: true,
  },
  {
    name: 'Booking Confirmation',
    category: 'booking_confirmation',
    subject: 'Confirmed: {{occasion}} on {{event_date}}',
    body: `Hi {{client_name}},

Great news! Your {{occasion}} on {{event_date}} is officially confirmed for {{guest_count}} guests.

Here is a quick summary:
- Date: {{event_date}}
- Guests: {{guest_count}}
- Location: {{event_location}}

I will send you a detailed timeline and prep checklist closer to the date. If anything changes in the meantime, just let me know.

Looking forward to it!
{{chef_name}}`,
    is_default: true,
  },
  {
    name: 'Deposit Reminder',
    category: 'payment_reminder',
    subject: 'Deposit reminder for {{occasion}} - {{event_date}}',
    body: `Hi {{client_name}},

Just a friendly reminder that the deposit of {{deposit_amount}} for your {{occasion}} on {{event_date}} is due by {{payment_due_date}}.

If you have already sent it, please disregard this message!

Let me know if you have any questions.

Best,
{{chef_name}}`,
    is_default: true,
  },
  {
    name: 'Balance Reminder',
    category: 'payment_reminder',
    subject: 'Balance due for {{occasion}} - {{event_date}}',
    body: `Hi {{client_name}},

Your remaining balance of {{balance_due}} for {{occasion}} on {{event_date}} is due by {{payment_due_date}}.

If you have any questions about the invoice, just reply to this email and I will be happy to clarify.

Thanks!
{{chef_name}}`,
    is_default: false,
  },
  {
    name: 'Post-Event Thank You',
    category: 'post_event',
    subject: 'Thank you, {{client_name}}!',
    body: `Hi {{client_name}},

I wanted to say thank you for having me cook for your {{occasion}}! I had a wonderful time, and I hope you and your guests enjoyed everything.

If you have any feedback, I would love to hear it. It helps me continue improving and making every event better than the last.

I would love to work together again in the future!

Warm regards,
{{chef_name}}`,
    is_default: true,
  },
  {
    name: 'Feedback Request',
    category: 'post_event',
    subject: 'How was your {{occasion}}, {{client_name}}?',
    body: `Hi {{client_name}},

I hope you are still enjoying the memories from {{occasion}}! I would really appreciate it if you could take 2 minutes to share your feedback.

Your input helps me improve and tailor future events to exactly what my clients love.

{{feedback_link}}

Thank you so much!
{{chef_name}}`,
    is_default: false,
  },
  {
    name: 'Pre-Event Checklist',
    category: 'pre_event',
    subject: '{{occasion}} is coming up! A few things to confirm',
    body: `Hi {{client_name}},

Your {{occasion}} is just around the corner ({{event_date}})! I wanted to touch base on a few things:

1. Final guest count: Is {{guest_count}} still accurate?
2. Any last-minute dietary needs or changes?
3. Kitchen access: What time can I arrive to start prep?
4. Parking and entry instructions

Please reply with any updates. If everything looks good, just let me know and we are all set!

See you soon,
{{chef_name}}`,
    is_default: true,
  },
  {
    name: 'Client Onboarding Welcome',
    category: 'onboarding',
    subject: 'Welcome! Let me learn about your preferences',
    body: `Hi {{client_name}},

I am excited to work with you! To make sure every meal is exactly what you and your family love, I have put together a quick preference form.

It covers dietary needs, favorite cuisines, any allergies, and a few other details that help me customize every menu just for you.

It only takes about 3 minutes to fill out, and you can update it anytime.

Looking forward to cooking for you!
{{chef_name}}`,
    is_default: true,
  },
]
