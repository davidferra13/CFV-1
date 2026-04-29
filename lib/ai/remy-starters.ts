import {
  CalendarDays,
  TrendingUp,
  Mail,
  Brain,
  ChefHat,
  Globe,
  Search,
  Users,
  Activity,
} from '@/components/ui/icons'
import type { LucideIcon } from '@/components/ui/icons'

export interface StarterPrompt {
  text: string
  icon: LucideIcon
}

// ─── Context-Aware Starter Prompts ────────────────────────────────────────────

export function getStartersForPage(pathname: string): StarterPrompt[] {
  const starters: StarterPrompt[] = [
    { text: "What's on my plate this week?", icon: CalendarDays },
    { text: "How's business looking this month?", icon: TrendingUp },
    { text: 'Draft a follow-up for my last event', icon: Mail },
    { text: 'Show my memories', icon: Brain },
  ]

  if (pathname.startsWith('/events/') && pathname !== '/events/new') {
    return [
      { text: 'Tell me about this event', icon: CalendarDays },
      { text: 'Draft a follow-up email for this client', icon: Mail },
      { text: 'What should I prep for this event?', icon: ChefHat },
      { text: 'Search the web for menu inspiration', icon: Globe },
    ]
  }
  if (pathname === '/dashboard') {
    return [
      { text: 'Catch me up since I was away', icon: Activity },
      { text: 'What needs action first?', icon: Brain },
      { text: "What's on my plate this week?", icon: CalendarDays },
      { text: "How's business looking this month?", icon: TrendingUp },
    ]
  }
  if (pathname.startsWith('/activity')) {
    return [
      { text: 'What changed since my last session?', icon: Activity },
      { text: 'Where did I leave off?', icon: Search },
      { text: 'What needs action first?', icon: Brain },
      { text: 'Show my recent client activity', icon: Users },
    ]
  }
  if (pathname.startsWith('/notifications')) {
    return [
      { text: 'Catch me up on unread notifications', icon: Activity },
      { text: 'Which notification needs action first?', icon: Brain },
      { text: 'What changed since I was away?', icon: Activity },
      { text: 'Show my open inquiries', icon: Mail },
    ]
  }
  if (pathname === '/events' || pathname === '/events/upcoming') {
    return [
      { text: "What's on my plate this week?", icon: CalendarDays },
      { text: 'Show my upcoming events', icon: CalendarDays },
      { text: 'Find my next available date', icon: Search },
      { text: 'Search for trending catering ideas online', icon: Globe },
    ]
  }
  if (pathname.startsWith('/clients')) {
    return [
      { text: 'Show my recent clients', icon: Users },
      { text: 'Draft a follow-up for my last client', icon: Mail },
      { text: 'What do you remember about my clients?', icon: Brain },
      { text: 'Search online for client engagement tips', icon: Globe },
    ]
  }
  if (pathname.startsWith('/financials') || pathname.startsWith('/expenses')) {
    return [
      { text: "How's revenue this month?", icon: TrendingUp },
      { text: 'Give me a monthly financial snapshot', icon: TrendingUp },
      { text: 'Search for private chef pricing benchmarks', icon: Globe },
      { text: 'Show my memories about pricing', icon: Brain },
    ]
  }
  if (pathname.startsWith('/recipes') || pathname.startsWith('/menus')) {
    return [
      { text: 'Search my recipes', icon: Search },
      { text: 'List my menus', icon: ChefHat },
      { text: 'Search the web for seasonal menu ideas', icon: Globe },
      { text: 'What culinary notes do you remember?', icon: Brain },
    ]
  }
  if (pathname.startsWith('/inquiries')) {
    return [
      { text: 'Show my open inquiries', icon: Mail },
      { text: 'Check my availability this week', icon: CalendarDays },
      { text: 'Draft a response to the latest inquiry', icon: Mail },
      { text: 'Search online for inquiry response templates', icon: Globe },
    ]
  }

  return starters
}

// ─── Thinking Time Estimate ───────────────────────────────────────────────────

export function getThinkingMessage(elapsed: number, intent?: string): string {
  if (intent === 'command') {
    if (elapsed > 15) return 'Still working on your tasks...'
    if (elapsed > 10) return "Running your tasks - this one's taking a bit..."
    return 'Running your tasks...'
  }
  if (intent === 'mixed') {
    if (elapsed > 15) return 'Working on both parts, hang tight...'
    return 'Working on your question and tasks...'
  }
  // Default question intent
  if (elapsed > 15) return 'Digging into this one...'
  if (elapsed > 10) return 'Thinking hard on this one...'
  if (elapsed > 5) return 'Remy is thinking...'
  return 'Remy is thinking...'
}
