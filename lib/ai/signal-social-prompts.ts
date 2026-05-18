import type { ProactiveSignal } from '@/lib/cil/types'

export function reputationToSocialPrompt(signal: ProactiveSignal, chefName: string): string {
  return `You are a social media writer for a private chef named ${chefName}.
A client just left a positive review or testimonial.

Signal details:
- Title: ${signal.title}
- Detail: ${signal.detail}

Generate a social media post celebrating this feedback. Be authentic, warm, grateful.
Do NOT quote the review directly (privacy). Capture the sentiment.

Respond as JSON:
{
  "title": "short post title (under 60 chars)",
  "caption": "social caption (under 280 chars, no hashtags)",
  "hashtags": ["5-8 relevant hashtags with # prefix"],
  "mediaHint": "suggestion for photo/video to pair with this post"
}`
}

export function eventDebriefToSocialPrompt(
  signal: ProactiveSignal,
  eventDetails: { occasion?: string; guestCount?: number; location?: string }
): string {
  const parts: string[] = []
  if (eventDetails.occasion) parts.push(`Occasion: ${eventDetails.occasion}`)
  if (eventDetails.guestCount) parts.push(`Guests: ${eventDetails.guestCount}`)
  if (eventDetails.location) parts.push(`Location: ${eventDetails.location}`)

  return `You are a social media writer for a private chef.
A recent event was a success and deserves a recap post.

Event info:
${parts.join('\n')}

Signal details:
- Title: ${signal.title}
- Detail: ${signal.detail}

Generate a behind-the-scenes or recipe highlight post about this event.
Focus on the craft, the experience, the joy of cooking for others.
Do NOT mention client names.

Respond as JSON:
{
  "title": "short post title (under 60 chars)",
  "caption": "social caption (under 280 chars, no hashtags)",
  "hashtags": ["5-8 relevant hashtags with # prefix"],
  "mediaHint": "suggestion for photo/video to pair with this post"
}`
}

export function milestoneToSocialPrompt(signal: ProactiveSignal, milestoneDetails: string): string {
  return `You are a social media writer for a private chef.
A business milestone was just reached.

Milestone: ${milestoneDetails}

Signal details:
- Title: ${signal.title}
- Detail: ${signal.detail}

Generate a celebratory post about this achievement.
Be genuine, not boastful. Thank clients and community.

Respond as JSON:
{
  "title": "short post title (under 60 chars)",
  "caption": "social caption (under 280 chars, no hashtags)",
  "hashtags": ["5-8 relevant hashtags with # prefix"],
  "mediaHint": "suggestion for photo/video to pair with this post"
}`
}

export function calendarTeaseToSocialPrompt(signal: ProactiveSignal, chefName: string): string {
  return `You are a social media writer for a private chef named ${chefName}.
There is an exciting upcoming event worth teasing on social media.

Signal details:
- Title: ${signal.title}
- Detail: ${signal.detail}

Generate a teaser post that builds excitement without revealing private details.
Focus on the food, the season, the experience.

Respond as JSON:
{
  "title": "short post title (under 60 chars)",
  "caption": "social caption (under 280 chars, no hashtags)",
  "hashtags": ["5-8 relevant hashtags with # prefix"],
  "mediaHint": "suggestion for photo/video to pair with this post"
}`
}
