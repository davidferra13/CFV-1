// Business Insights - Deterministic Decision Tree
// Generates 4-6 actionable insight cards from computed business metrics.
// No AI needed: the rules are clear, the thresholds are defined,
// and template strings produce consistent, honest recommendations.
//
// Every insight references a specific app page/feature so the chef
// knows exactly where to take action.

// ── Types ────────────────────────────────────────────────────────────────

export interface InsightCard {
  title: string
  insight: string
  action: string
  priority: 'high' | 'medium' | 'low'
  category: 'revenue' | 'clients' | 'pricing' | 'operations' | 'seasonal' | 'growth'
}

export interface BusinessInsights {
  insights: InsightCard[]
  headline: string
  healthScore: number
  healthLabel: 'thriving' | 'healthy' | 'needs_attention' | 'at_risk'
  confidence: 'high' | 'medium' | 'low'
}

// ── Input (pre-computed metrics from DB) ─────────────────────────────────

export interface BusinessMetrics {
  ytdRevenueCents: number
  ytdExpenseCents: number
  completedEventCount: number
  avgEventSizeCents: number
  activeInquiries: number
  conversionRate: number // 0-100
  closedInquiries: number
  totalClients: number
  newClientsThisYear: number
  peakMonth: { month: number; count: number } | null
  currentMonth: number
  monthlyDistribution: Record<number, number>
}

// ── Month names ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// ── Decision Tree ────────────────────────────────────────────────────────

export function generateInsights(metrics: BusinessMetrics): BusinessInsights {
  const insights: InsightCard[] = []
  const ytdProfitCents = metrics.ytdRevenueCents - metrics.ytdExpenseCents
  const marginPct =
    metrics.ytdRevenueCents > 0 ? Math.round((ytdProfitCents / metrics.ytdRevenueCents) * 100) : 0
  const revenueDollars = Math.round(metrics.ytdRevenueCents / 100)
  const expenseDollars = Math.round(metrics.ytdExpenseCents / 100)
  const profitDollars = Math.round(ytdProfitCents / 100)
  const avgEventDollars = Math.round(metrics.avgEventSizeCents / 100)

  // ── Pipeline Health ─────────────────────────────────────────────────
  if (metrics.activeInquiries < 3) {
    insights.push({
      title: 'Pipeline is thin',
      insight:
        `You have ${metrics.activeInquiries} active inquir${metrics.activeInquiries === 1 ? 'y' : 'ies'}. ` +
        (metrics.conversionRate > 0
          ? `At your ${metrics.conversionRate}% conversion rate, that's roughly ${Math.max(1, Math.round((metrics.activeInquiries * metrics.conversionRate) / 100))} booking${(metrics.activeInquiries * metrics.conversionRate) / 100 >= 1.5 ? 's' : ''} from the current pipeline.`
          : 'Not enough closed inquiries yet to estimate conversion.'),
      action:
        "Post on social media this week and reach out to your 5 most recent past clients with a seasonal menu idea. Check your Inquiries page for any you haven't responded to.",
      priority: 'high',
      category: 'growth',
    })
  } else if (metrics.activeInquiries >= 8) {
    insights.push({
      title: 'Pipeline is strong',
      insight: `You have ${metrics.activeInquiries} active inquiries. At ${metrics.conversionRate}% conversion, that could mean ${Math.round((metrics.activeInquiries * metrics.conversionRate) / 100)} new bookings.`,
      action:
        'Prioritize follow-ups on your highest-value inquiries. Open the Inquiries page and sort by lead score to focus on the hottest leads first.',
      priority: 'medium',
      category: 'growth',
    })
  }

  // ── Conversion Rate ─────────────────────────────────────────────────
  if (metrics.closedInquiries >= 5) {
    if (metrics.conversionRate < 30) {
      insights.push({
        title: 'Conversion rate needs work',
        insight: `Only ${metrics.conversionRate}% of inquiries convert to bookings (${metrics.closedInquiries} closed). Industry average for private chefs is 40-60%.`,
        action:
          'Review your declined inquiries on the Inquiries page. Look for patterns: are you losing on price, response time, or menu fit? Speed up your initial response to under 4 hours.',
        priority: 'high',
        category: 'clients',
      })
    } else if (metrics.conversionRate > 70) {
      insights.push({
        title: 'Excellent conversion rate',
        insight: `${metrics.conversionRate}% of inquiries become bookings. You\'re closing well above the 40-60% industry average.`,
        action:
          'Your closing skills are strong. Focus on increasing inquiry volume rather than conversion. Consider raising prices 10-15% on new quotes.',
        priority: 'low',
        category: 'pricing',
      })
    }
  }

  // ── Profit Margin ───────────────────────────────────────────────────
  if (metrics.ytdRevenueCents > 0) {
    if (marginPct < 30) {
      insights.push({
        title: 'Margins are tight',
        insight: `Your profit margin is ${marginPct}% ($${profitDollars.toLocaleString()} profit on $${revenueDollars.toLocaleString()} revenue). Most private chefs target 40-60%.`,
        action:
          'Open your Financial dashboard and review expense categories. Check food costs first (should be 25-35% of revenue). Consider building in a 15% operational buffer on quotes.',
        priority: 'high',
        category: 'revenue',
      })
    } else if (marginPct > 60) {
      insights.push({
        title: 'Strong margins',
        insight: `${marginPct}% profit margin ($${profitDollars.toLocaleString()} on $${revenueDollars.toLocaleString()} revenue). Well above the 40-60% target range.`,
        action:
          "Margins are healthy. Make sure you're not underinvesting in ingredients or client experience. Premium ingredients can justify higher prices.",
        priority: 'low',
        category: 'revenue',
      })
    }
  }

  // ── Average Event Size ──────────────────────────────────────────────
  if (metrics.completedEventCount >= 3 && avgEventDollars > 0) {
    if (avgEventDollars < 500) {
      insights.push({
        title: 'Small average event size',
        insight: `Your average event is $${avgEventDollars.toLocaleString()} across ${metrics.completedEventCount} events. Consider whether these events are worth your time after expenses.`,
        action:
          'Set a minimum event price on your Settings page. Upsell add-ons (dessert course, wine pairing, next-day meal prep) to increase per-event revenue.',
        priority: 'medium',
        category: 'pricing',
      })
    } else if (avgEventDollars > 3000) {
      insights.push({
        title: 'Premium event positioning',
        insight: `Average event is $${avgEventDollars.toLocaleString()}. You\'re in the premium tier for private chef services.`,
        action:
          'Maintain quality at this price point. Ask satisfied clients for referrals to similar clients. Premium clients refer premium clients.',
        priority: 'low',
        category: 'clients',
      })
    }
  }

  // ── Client Growth ───────────────────────────────────────────────────
  if (metrics.totalClients > 0) {
    const newClientPct = Math.round((metrics.newClientsThisYear / metrics.totalClients) * 100)
    if (metrics.newClientsThisYear === 0 && metrics.currentMonth >= 3) {
      insights.push({
        title: 'No new clients this year',
        insight: `You haven\'t added any new clients in ${MONTH_NAMES[metrics.currentMonth]}. All revenue is from existing relationships.`,
        action:
          'Diversify your client base. Ask your top 3 clients for referrals this week. Post a seasonal menu or behind-the-scenes content on Instagram.',
        priority: 'high',
        category: 'growth',
      })
    } else if (newClientPct > 50 && metrics.newClientsThisYear >= 3) {
      insights.push({
        title: 'Strong new client acquisition',
        insight: `${metrics.newClientsThisYear} new clients this year (${newClientPct}% of your roster). Your marketing is working.`,
        action:
          'Focus on retention now. Send a personal check-in to your 3 newest clients. First impressions set the tone for long-term relationships.',
        priority: 'medium',
        category: 'clients',
      })
    }
  }

  // ── Seasonality ─────────────────────────────────────────────────────
  if (metrics.peakMonth && metrics.completedEventCount >= 6) {
    const monthsUntilPeak = (metrics.peakMonth.month - metrics.currentMonth + 12) % 12
    if (monthsUntilPeak >= 1 && monthsUntilPeak <= 2) {
      insights.push({
        title: `Peak season approaching (${MONTH_NAMES[metrics.peakMonth.month]})`,
        insight: `Your busiest month historically is ${MONTH_NAMES[metrics.peakMonth.month]} with ${metrics.peakMonth.count} events. Peak season starts in ${monthsUntilPeak} month${monthsUntilPeak > 1 ? 's' : ''}.`,
        action:
          'Lock in bookings now. Reach out to past clients who booked during this period. Consider a seasonal tasting event to drive new bookings.',
        priority: 'high',
        category: 'seasonal',
      })
    } else if (monthsUntilPeak === 0) {
      insights.push({
        title: `Peak season is now`,
        insight: `${MONTH_NAMES[metrics.currentMonth]} is historically your busiest month (${metrics.peakMonth.count} events). Maximize it.`,
        action:
          'Focus on execution and client satisfaction. Happy peak-season clients become year-round clients. Ask each one for a review after their event.',
        priority: 'medium',
        category: 'seasonal',
      })
    }
  }

  // ── Ensure minimum 4 insights ───────────────────────────────────────
  if (insights.length < 4) {
    // Add general insights if we don't have enough specific ones
    if (metrics.completedEventCount < 3) {
      insights.push({
        title: 'Build your track record',
        insight: `You have ${metrics.completedEventCount} completed event${metrics.completedEventCount !== 1 ? 's' : ''}. More events = more data = better insights.`,
        action:
          'Focus on booking your next 3-5 events. Consider offering a small discount to new clients to build reviews and referrals.',
        priority: 'medium',
        category: 'growth',
      })
    }
    if (!insights.some((i) => i.category === 'operations')) {
      insights.push({
        title: 'Keep your pipeline warm',
        insight: 'Consistent outreach is the best predictor of steady bookings.',
        action:
          'Spend 15 minutes each Monday reviewing your Inquiries page and following up on any that are more than 48 hours old.',
        priority: 'low',
        category: 'operations',
      })
    }
    if (!insights.some((i) => i.category === 'clients') && metrics.totalClients > 0) {
      insights.push({
        title: 'Client relationships are your moat',
        insight: `You have ${metrics.totalClients} client${metrics.totalClients !== 1 ? 's' : ''} on file. Repeat bookings are 5x cheaper than new client acquisition.`,
        action:
          'Send a personal message to your most active client this week. A quick "thinking of you" text goes a long way.',
        priority: 'low',
        category: 'clients',
      })
    }
  }

  // Cap at 6 insights, sorted by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  const finalInsights = insights.slice(0, 6)

  // ── Health Score ────────────────────────────────────────────────────
  let healthScore = 50 // baseline

  // Revenue impact (+/- 15)
  if (metrics.ytdRevenueCents > 0) {
    if (marginPct >= 50) healthScore += 15
    else if (marginPct >= 35) healthScore += 10
    else if (marginPct >= 20) healthScore += 0
    else healthScore -= 10
  } else {
    healthScore -= 15
  }

  // Pipeline impact (+/- 15)
  if (metrics.activeInquiries >= 5) healthScore += 15
  else if (metrics.activeInquiries >= 3) healthScore += 8
  else if (metrics.activeInquiries >= 1) healthScore += 0
  else healthScore -= 15

  // Conversion impact (+/- 10)
  if (metrics.closedInquiries >= 5) {
    if (metrics.conversionRate >= 60) healthScore += 10
    else if (metrics.conversionRate >= 40) healthScore += 5
    else healthScore -= 5
  }

  // Client growth impact (+/- 10)
  if (metrics.newClientsThisYear >= 3) healthScore += 10
  else if (metrics.newClientsThisYear >= 1) healthScore += 5
  else if (metrics.currentMonth >= 6) healthScore -= 5

  healthScore = Math.max(0, Math.min(100, healthScore))

  let healthLabel: 'thriving' | 'healthy' | 'needs_attention' | 'at_risk'
  if (healthScore >= 80) healthLabel = 'thriving'
  else if (healthScore >= 60) healthLabel = 'healthy'
  else if (healthScore >= 40) healthLabel = 'needs_attention'
  else healthLabel = 'at_risk'

  // Headline: most important insight
  const headline = finalInsights[0]?.title ?? 'Keep building your business.'

  // Confidence based on data volume
  let confidence: 'high' | 'medium' | 'low'
  if (metrics.completedEventCount >= 10 && metrics.closedInquiries >= 10) confidence = 'high'
  else if (metrics.completedEventCount >= 3) confidence = 'medium'
  else confidence = 'low'

  return {
    insights: finalInsights,
    headline,
    healthScore,
    healthLabel,
    confidence,
  }
}
