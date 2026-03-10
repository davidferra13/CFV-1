// Default Workflow Templates
// Smart defaults that work out of the box for every chef.
// Seeded on first use (or manually). System templates can be deactivated but not deleted.

import { createServerClient } from '@/lib/supabase/server'
import type { WorkflowTriggerType, WorkflowActionType } from './workflow-types'

type DefaultStep = {
  step_order: number
  delay_hours: number
  condition?: { type: string; negate?: boolean } | null
  action_type: WorkflowActionType
  action_config: Record<string, unknown>
}

type DefaultWorkflow = {
  name: string
  description: string
  trigger_type: WorkflowTriggerType
  trigger_config: Record<string, unknown>
  steps: DefaultStep[]
}

// ─── The Four Default Workflows ─────────────────────────────────────────────

export const DEFAULT_WORKFLOWS: DefaultWorkflow[] = [
  // 1. New Inquiry workflow
  {
    name: 'New Inquiry Follow-Up',
    description: 'Sends a welcome email immediately, then a follow-up if no response after 3 days.',
    trigger_type: 'inquiry_created',
    trigger_config: {},
    steps: [
      {
        step_order: 1,
        delay_hours: 0, // Immediately
        action_type: 'send_email',
        action_config: {
          subject: 'Thanks for reaching out, {{client_name}}!',
          body_template:
            'Hi {{client_name}},\n\nThank you for your inquiry about {{occasion}}! I would love to learn more about what you have in mind.\n\nI will review your details and get back to you shortly with some ideas.\n\nBest,\nYour Chef',
        },
      },
      {
        step_order: 2,
        delay_hours: 72, // 3 days
        condition: { type: 'has_responded', negate: true },
        action_type: 'send_email',
        action_config: {
          subject: 'Following up on your inquiry',
          body_template:
            'Hi {{client_name}},\n\nI wanted to follow up on your inquiry about {{occasion}}. I would love to chat about your vision for the event and put together a custom menu for you.\n\nWould you have a few minutes to connect this week?\n\nBest,\nYour Chef',
        },
      },
    ],
  },

  // 2. Proposal Sent workflow
  {
    name: 'Proposal Follow-Up',
    description:
      'After sending a proposal, follows up in 2 days if not viewed, then again in 5 more days with a chef task.',
    trigger_type: 'quote_sent',
    trigger_config: {},
    steps: [
      {
        step_order: 1,
        delay_hours: 48, // 2 days
        condition: { type: 'quote_accepted', negate: true },
        action_type: 'send_email',
        action_config: {
          subject: 'Your proposal is ready to review',
          body_template:
            'Hi {{client_name}},\n\nJust a quick reminder that your proposal for {{occasion}} is ready for review. I put together some great options for you.\n\nTake a look when you get a chance, and let me know if you have any questions!\n\nBest,\nYour Chef',
        },
      },
      {
        step_order: 2,
        delay_hours: 120, // 5 more days (7 total)
        condition: { type: 'quote_accepted', negate: true },
        action_type: 'send_email',
        action_config: {
          subject: 'Last chance to review your proposal',
          body_template:
            "Hi {{client_name}},\n\nI wanted to reach out one more time about your {{occasion}} proposal. I'd hate for you to miss out on the date.\n\nIf your plans have changed, no worries at all. Just let me know either way so I can plan accordingly.\n\nBest,\nYour Chef",
        },
      },
      {
        step_order: 3,
        delay_hours: 0, // Same time as step 2
        condition: { type: 'quote_accepted', negate: true },
        action_type: 'create_task',
        action_config: {
          text: 'Follow up with {{client_name}} about {{occasion}} proposal (no response after 7 days)',
        },
      },
    ],
  },

  // 3. Pre-Event workflow
  {
    name: 'Pre-Event Reminders',
    description:
      'Sends a "looking forward" email 7 days before, a payment reminder 2 days before (if unpaid), and a confirmation the day before.',
    trigger_type: 'days_before_event',
    trigger_config: {},
    steps: [
      {
        step_order: 1,
        delay_hours: 0, // Triggered at 7 days before
        condition: null,
        action_type: 'send_email',
        action_config: {
          subject: 'One week until {{occasion}}!',
          body_template:
            "Hi {{client_name}},\n\nYour event is just one week away! I'm starting to prepare and I'm very excited.\n\nHere's a quick recap:\n- Event: {{occasion}}\n- Date: {{event_date}}\n- Guests: {{guest_count}}\n\nPlease let me know if there are any last-minute changes to the guest count or dietary requirements.\n\nSee you soon!\nYour Chef",
        },
      },
      {
        step_order: 2,
        delay_hours: 120, // 5 days later (2 days before event)
        condition: { type: 'payment_complete', negate: true },
        action_type: 'send_payment_reminder',
        action_config: {
          message:
            'Hi {{client_name}},\n\nFriendly reminder that payment for {{occasion}} is due before the event. Please complete your payment at your earliest convenience.\n\nThank you!\nYour Chef',
        },
      },
      {
        step_order: 3,
        delay_hours: 24, // 1 day later (1 day before event)
        condition: null,
        action_type: 'send_email',
        action_config: {
          subject: 'See you tomorrow!',
          body_template:
            "Hi {{client_name}},\n\nEverything is set for tomorrow! I'm looking forward to {{occasion}}.\n\nIf you have any last-minute questions or need to share parking/access details, just reply to this email.\n\nSee you soon!\nYour Chef",
        },
      },
    ],
  },

  // 4. Post-Event workflow
  {
    name: 'Post-Event Follow-Up',
    description:
      'After event completion: thank you email (1 day), feedback request (3 days), rebook outreach (14 days).',
    trigger_type: 'days_after_event',
    trigger_config: {},
    steps: [
      {
        step_order: 1,
        delay_hours: 24, // 1 day after
        condition: null,
        action_type: 'send_email',
        action_config: {
          subject: 'Thank you, {{client_name}}!',
          body_template:
            'Hi {{client_name}},\n\nThank you so much for having me at {{occasion}}! I hope everyone enjoyed the meal.\n\nIf you had a great experience, I would really appreciate it if you could leave a quick review. It helps me grow my business tremendously.\n\nThank you again!\nYour Chef',
        },
      },
      {
        step_order: 2,
        delay_hours: 48, // 2 more days (3 days total)
        condition: null,
        action_type: 'send_feedback_request',
        action_config: {},
      },
      {
        step_order: 3,
        delay_hours: 264, // 11 more days (14 days total)
        condition: null,
        action_type: 'send_email',
        action_config: {
          subject: "Let's do it again!",
          body_template:
            "Hi {{client_name}},\n\nIt's been a couple of weeks since {{occasion}} and I hope you're still riding the high from that evening!\n\nI'd love to cook for you again. Whether it's a date night, holiday dinner, or just a special weeknight meal, I'm here for it.\n\nReply to this email or book directly, and I'll put together something amazing.\n\nBest,\nYour Chef",
        },
      },
    ],
  },
]

// ─── Seed Default Workflows ─────────────────────────────────────────────────
// Creates the default system workflows for a chef if they don't already exist.
// Safe to call multiple times (idempotent via is_system check).

export async function seedDefaultWorkflows(
  chefId: string
): Promise<{ created: number; skipped: number }> {
  const supabase = createServerClient({ admin: true })
  let created = 0
  let skipped = 0

  for (const workflow of DEFAULT_WORKFLOWS) {
    try {
      // Check if this system workflow already exists for this chef
      const { data: existing } = await supabase
        .from('workflow_templates' as any)
        .select('id')
        .eq('chef_id', chefId)
        .eq('name', workflow.name)
        .eq('is_system', true)
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      // Create the template
      const { data: template, error: templateErr } = await supabase
        .from('workflow_templates' as any)
        .insert({
          chef_id: chefId,
          name: workflow.name,
          description: workflow.description,
          is_active: true,
          is_system: true,
          trigger_type: workflow.trigger_type,
          trigger_config: workflow.trigger_config,
        })
        .select()
        .single()

      if (templateErr || !template) {
        console.error(`[seedDefaultWorkflows] Failed to create "${workflow.name}":`, templateErr)
        continue
      }

      // Create the steps
      const stepPayload = workflow.steps.map((step) => ({
        template_id: (template as any).id,
        step_order: step.step_order,
        delay_hours: step.delay_hours,
        condition: step.condition || null,
        action_type: step.action_type,
        action_config: step.action_config,
      }))

      const { error: stepsErr } = await supabase.from('workflow_steps' as any).insert(stepPayload)

      if (stepsErr) {
        console.error(
          `[seedDefaultWorkflows] Failed to create steps for "${workflow.name}":`,
          stepsErr
        )
        // Clean up the template since steps failed
        await supabase
          .from('workflow_templates' as any)
          .delete()
          .eq('id', (template as any).id)
        continue
      }

      created++
    } catch (err) {
      console.error(`[seedDefaultWorkflows] Error seeding "${workflow.name}":`, err)
    }
  }

  return { created, skipped }
}
