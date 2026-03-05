export type CustomerStoryMetric = {
  label: string
  before: string
  after: string
  delta: string
}

export type CustomerStory = {
  slug: string
  title: string
  chefName: string
  chefProfile: string
  location: string
  summary: string
  timeline: string
  challenge: string[]
  solution: string[]
  outcomes: string[]
  quote: string
  quoteAttribution: string
  metrics: CustomerStoryMetric[]
}

export const CUSTOMER_STORIES: CustomerStory[] = [
  {
    slug: 'maria-weekly-meal-prep-operations',
    title: 'From scattered DMs to a repeatable weekly meal prep engine',
    chefName: 'Chef Maria Alvarez',
    chefProfile: 'Weekly meal prep + family nutrition',
    location: 'San Diego, CA',
    summary:
      'Chef Maria moved intake, scheduling, and client follow-up out of text threads and into one operating flow.',
    timeline: 'First 60 days in beta',
    challenge: [
      'Client requests were spread across text, Instagram, and email.',
      'Menu approvals took multiple back-and-forth messages every week.',
      'Repeat clients were not getting consistent follow-up prompts.',
    ],
    solution: [
      'Standardized inquiry capture with one intake flow per client type.',
      'Centralized menu/quote approvals in one client portal sequence.',
      'Automated reminders and post-service follow-up actions.',
    ],
    outcomes: [
      'Weekly admin work dropped from 11.5 hours to 4.5 hours.',
      'Client response time moved from next-day to same-day.',
      'Repeat booking rate increased with consistent follow-up cadence.',
    ],
    quote:
      'I stopped spending half my week chasing details. Now I can actually focus on the food and client experience.',
    quoteAttribution: 'Chef Maria Alvarez',
    metrics: [
      { label: 'Admin time / week', before: '11.5h', after: '4.5h', delta: '-61%' },
      { label: 'Avg first response time', before: '18h', after: '2.5h', delta: '-86%' },
      { label: 'Repeat booking rate', before: '29%', after: '43%', delta: '+14 pts' },
    ],
  },
  {
    slug: 'jordan-private-dinners-margin-control',
    title: 'Protecting margins on private dinners without spreadsheet drift',
    chefName: 'Chef Jordan Kim',
    chefProfile: 'Private dinner parties + tasting menus',
    location: 'Austin, TX',
    summary:
      'Chef Jordan implemented tighter cost visibility and quote discipline to stop underpricing premium events.',
    timeline: 'First 90 days in beta',
    challenge: [
      'Food cost and labor notes lived in separate spreadsheets.',
      'Quotes were being sent without margin checks.',
      'Post-event profitability reviews were inconsistent.',
    ],
    solution: [
      'Connected quote workflow with cost inputs before send.',
      'Tracked event-level revenue, cost, and margin in one record.',
      'Added weekly review ritual for outlier events and pricing drift.',
    ],
    outcomes: [
      'Gross margin visibility became event-by-event instead of monthly guesswork.',
      'Quote turnaround sped up with fewer revisions.',
      'Average event margin stabilized at a higher baseline.',
    ],
    quote:
      'I used to feel the margin pain after the event. Now I see it before I send the proposal.',
    quoteAttribution: 'Chef Jordan Kim',
    metrics: [
      { label: 'Avg quote turnaround', before: '26h', after: '8h', delta: '-69%' },
      { label: 'Events with margin review', before: '22%', after: '96%', delta: '+74 pts' },
      { label: 'Average gross margin', before: '31%', after: '39%', delta: '+8 pts' },
    ],
  },
  {
    slug: 'nia-small-team-service-ops',
    title: 'Scaling service quality with a small team and clearer handoffs',
    chefName: 'Chef Nia Brooks',
    chefProfile: 'Boutique events + staffed in-home service',
    location: 'Brooklyn, NY',
    summary:
      'Chef Nia tightened team handoffs across prep, event day, and post-event closeout without adding headcount.',
    timeline: 'First 75 days in beta',
    challenge: [
      'Task ownership was unclear across prep and service windows.',
      'Important client notes were missed between shifts.',
      'Post-event debriefs were inconsistent and rarely documented.',
    ],
    solution: [
      'Introduced standardized event task boards and checklist gates.',
      'Centralized client constraints and event notes for shared visibility.',
      'Added mandatory closeout/debrief workflow at event completion.',
    ],
    outcomes: [
      'Team handoff misses dropped significantly.',
      'Day-of surprises reduced due to checklist discipline.',
      'Service consistency improved across recurring events.',
    ],
    quote:
      'The difference was not working more hours. It was finally running one shared operating system.',
    quoteAttribution: 'Chef Nia Brooks',
    metrics: [
      { label: 'Handoff-related issues / month', before: '14', after: '4', delta: '-71%' },
      { label: 'Checklist completion rate', before: '41%', after: '94%', delta: '+53 pts' },
      { label: 'Client service score', before: '4.2/5', after: '4.8/5', delta: '+0.6' },
    ],
  },
]

export function getCustomerStory(slug: string): CustomerStory | undefined {
  return CUSTOMER_STORIES.find((story) => story.slug === slug)
}
