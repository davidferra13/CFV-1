// Help Article Page — renders static content for a given slug.
// No DB queries beyond auth. Content is maintained in HELP_CONTENT below.

import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

const HELP_CONTENT: Record<string, { title: string; content: string }> = {
  events: {
    title: 'Events & Scheduling',
    content: `## Creating Events
Go to Events > New Event. Fill in client, date, guest count, location, and occasion type. Events start in "Draft" status.

## Event States
Draft > Proposed > Accepted > Paid > Confirmed > In Progress > Completed

Any non-terminal state can be moved to Cancelled. Completed and Cancelled are terminal — they cannot be changed.

## Day-Of Protocol (DOP)
On event day, open the event and go to the "Schedule" tab. Work through each phase in order. Tasks with an automatic flag (document readiness, timestamps) are tracked by the system. Tasks requiring manual confirmation have a checkbox.

You can also open the mobile DOP view for a full-screen step-by-step experience: Events > [event] > DOP Mobile.

## Closing Out an Event
After service, use the Close-Out Wizard (16-item checklist). All items must be green to mark the event as Completed.

## After-Action Review
Once closed, file your Event Review from the event detail page. Rate your calm and preparation, and note what went well and what to improve.`,
  },
  clients: {
    title: 'Clients & CRM',
    content: `## Adding Clients
Clients > New Client. Fill in contact info, dietary restrictions, and preferences.

## Importing Existing Clients
Clients > Import. Upload a CSV with name, email, and phone. Map columns on the import screen.

## Client Segments
Use Clients > Segments to create custom groups based on filters (spend, booking frequency, dietary restrictions, etc.).

## Follow-Ups
Set follow-up reminders from any client page. Automations can also trigger follow-up alerts after events complete.

## Loyalty Program
Clients earn points automatically when events complete. Configure point values and rewards in Settings > Loyalty.

## Client Notes
All client notes are private (chef-only). Notes are timestamped and append-only.`,
  },
  finance: {
    title: 'Finance & Payments',
    content: `## Recording Revenue
Revenue is automatically recorded via the immutable ledger when events transition states. Never manually enter event revenue — always use the event lifecycle.

## Expenses
Go to Finance > Expenses > New Expense. Choose a category, enter amount and vendor. Mark as Business or Personal for tax separation. Attach receipt photos from the Expenses page.

## Quick Expense (Mobile)
Use the floating + button on mobile to log a quick expense with just amount and description. You can edit the full details from the Expenses page.

## Invoices
Generate invoices from any event detail page. Invoices are printable PDFs that can be sent to clients via email.

## Budget Guardrail
Before shopping, check the Budget Guardrail on the event's Finance tab. It shows how much you can spend and stay within your target margin.

## Year-End Tax Package
Finance > Tax > Year-End generates a complete summary for your accountant, including revenue, expenses by category, and mileage.`,
  },
  culinary: {
    title: 'Menus & Recipes',
    content: `## Adding Recipes
Culinary > Recipes > New Recipe. Include ingredients with quantities and units for accurate costing.

## Building Menus
Culinary > Menus > New Menu. Combine recipes into a complete menu with course structure. Assign menus to events from the event detail page.

## Recipe Costing
Ingredient costs are tracked per recipe. View cost-per-serving in the recipe detail. ChefFlow uses the most recent ingredient prices you've entered.

## Proposed vs Served Menu
When building a menu for an event, mark dishes as "proposed". After the event, update any modifications (substitutions, additions, removals). Both are recorded for your reference.

## Vendors
Culinary > Vendors. Track specialty suppliers, their contact info, lead times, and notes.`,
  },
  settings: {
    title: 'Settings & Integrations',
    content: `## Automations
Settings > Automations. Toggle built-in rules (e.g., "Send follow-up 48 hours after event") or create custom Trigger > Condition > Action rules.

## Stripe Connect
Settings > Payments. Connect your Stripe account to accept deposits and final payments from clients. ChefFlow uses Stripe Connect — you keep your own Stripe account.

## API Keys
Settings > API Keys. Generate API keys to connect ChefFlow to external tools (spreadsheets, Zapier, custom scripts).

## Webhooks
Settings > Webhooks. Set up endpoints to receive real-time event notifications when event state changes, payments land, or reviews come in.

## Notification Preferences
Settings > Notifications. Control which events trigger email and push notifications.

## Profile & Branding
Settings > Profile. Upload your logo, set your business name, and configure branding used on invoices and client-facing documents.`,
  },
  onboarding: {
    title: 'Getting Started',
    content: `## First Steps
1. Complete the onboarding wizard: profile, bank details, Stripe Connect
2. Import your existing clients (Clients > Import)
3. Build your recipe library (Culinary > Recipes)
4. Create your first event (Events > New Event)

## Key Concepts

Events: The core unit. Each service is an event with its own lifecycle from draft to completed.

Clients: Scoped entirely to your account. Clients and their data are never shared or visible to other chefs.

Ledger: All money movements are recorded immutably. You cannot edit or delete ledger entries. This is intentional — it ensures an accurate financial record.

DOP: The Day-Of Protocol keeps your service on track. It's a living checklist that the system pre-populates based on your event and preferences.

## Getting Help
Use the search bar at the top of this page to find specific articles. If you need direct support, email support@cheflowhq.com.`,
  },
}

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = HELP_CONTENT[params.slug]
  return {
    title: article ? `${article.title} — ChefFlow Help` : 'Help — ChefFlow',
  }
}

export default async function HelpArticlePage({ params }: Props) {
  await requireChef()

  const article = HELP_CONTENT[params.slug] ?? {
    title: 'Article Not Found',
    content:
      'This help article does not exist yet. Try searching for what you need, or contact support.',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/help"
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Help Center
      </Link>

      <h1 className="text-3xl font-bold text-stone-100">{article.title}</h1>

      <Card>
        <CardContent className="py-6">
          <pre className="whitespace-pre-wrap text-sm text-stone-300 font-sans leading-relaxed">
            {article.content}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 text-center">
          <p className="text-sm text-stone-500">
            Still have questions?{' '}
            <a
              href="mailto:support@cheflowhq.com"
              className="text-stone-100 font-medium hover:underline"
            >
              Contact support
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
