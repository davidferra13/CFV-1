import { CalendarDays, TrendingUp, Mail, Brain, ChefHat, Globe, Search, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
    if (elapsed > 10) return "Running your tasks — this one's taking a bit..."
    return 'Running your tasks...'
  }
  if (intent === 'mixed') {
    if (elapsed > 15) return 'Working on both parts — hang tight, almost there...'
    return 'Working on your question and tasks...'
  }
  // Default question intent
  if (elapsed > 20) return 'Still thinking — complex question, give me another moment...'
  if (elapsed > 10) return 'Thinking hard on this one...'
  if (elapsed > 5) return 'Remy is thinking...'
  return 'Remy is thinking...'
}
