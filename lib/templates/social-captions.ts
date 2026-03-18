// Social Media Caption Templates - Mad-Libs Style
// Professional social media captions with variable substitution.
// AI can optionally add flair - but the template always works.

// ── Types ──────────────────────────────────────────────────────────────────

export type SocialCaption = {
  platform: 'instagram' | 'facebook' | 'twitter'
  caption: string
  hashtags: string[]
  postType: 'event_recap' | 'behind_the_scenes' | 'menu_highlight' | 'testimonial'
}

export type SocialCaptionsResult = {
  captions: SocialCaption[]
  generatedAt: string
}

// ── Input types ────────────────────────────────────────────────────────────

export type CaptionVars = {
  chefName: string
  occasion: string
  guestCount: number
  menuHighlights?: string[] // dish names
  tone: 'personal' | 'elegant' | 'casual'
}

// ── Hashtag library ────────────────────────────────────────────────────────

const BASE_HASHTAGS = ['privatechef', 'chefsofinstagram', 'personalchef', 'cheflife']

const OCCASION_HASHTAGS: Record<string, string[]> = {
  wedding: ['weddingfood', 'weddingcatering', 'weddingchef', 'bridalfood'],
  birthday: ['birthdaydinner', 'birthdayparty', 'celebrationdinner'],
  anniversary: ['anniversarydinner', 'specialoccasion', 'couplesnight'],
  corporate: ['corporateevents', 'corporatedining', 'eventcatering'],
  holiday: ['holidaydinner', 'holidayfeast', 'festiveseason'],
  dinner: ['dinnerparty', 'intimatedining', 'homechef'],
}

function getHashtags(occasion: string): string[] {
  const lower = occasion.toLowerCase()
  const matched = Object.entries(OCCASION_HASHTAGS).find(([key]) => lower.includes(key))
  return [...BASE_HASHTAGS, ...(matched ? matched[1] : ['specialevent', 'privateevent'])]
}

// ── Templates by tone ──────────────────────────────────────────────────────

function personalCaption(v: CaptionVars): string {
  const dishes =
    v.menuHighlights && v.menuHighlights.length > 0
      ? ` Highlights: ${v.menuHighlights.slice(0, 3).join(', ')}.`
      : ''
  return `Just wrapped an incredible ${v.occasion.toLowerCase()} for ${v.guestCount} amazing guests.${dishes} Nights like these remind me why I love what I do. 🔥`
}

function elegantCaption(v: CaptionVars): string {
  const dishes =
    v.menuHighlights && v.menuHighlights.length > 0
      ? ` The evening featured ${v.menuHighlights.slice(0, 3).join(', ')}.`
      : ''
  return `An evening of culinary artistry - a ${v.occasion.toLowerCase()} for ${v.guestCount} distinguished guests.${dishes} Every course crafted with intention and care.`
}

function casualCaption(v: CaptionVars): string {
  const dishes =
    v.menuHighlights && v.menuHighlights.length > 0
      ? ` We went with ${v.menuHighlights.slice(0, 2).join(' and ')} and it was a HIT.`
      : ''
  return `${v.guestCount} guests, one kitchen, zero leftovers.${dishes} Another great ${v.occasion.toLowerCase()} in the books!`
}

// ── Generator ──────────────────────────────────────────────────────────────

/**
 * Generates social media captions for multiple platforms.
 * Pure template - no AI, no network, deterministic.
 */
export function generateSocialCaptionsFormula(v: CaptionVars): SocialCaptionsResult {
  const captionFn =
    v.tone === 'elegant' ? elegantCaption : v.tone === 'casual' ? casualCaption : personalCaption
  const hashtags = getHashtags(v.occasion)

  const captions: SocialCaption[] = [
    {
      platform: 'instagram',
      caption: captionFn(v) + '\n\n' + hashtags.map((h) => '#' + h).join(' '),
      hashtags,
      postType: 'event_recap',
    },
    {
      platform: 'facebook',
      caption: captionFn(v) + '\n\nBook your next private dining experience - link in bio.',
      hashtags: hashtags.slice(0, 5),
      postType: 'event_recap',
    },
    {
      platform: 'twitter',
      caption:
        v.tone === 'casual'
          ? `${v.guestCount} guests. Zero leftovers. Another great night. 🔥 #privatechef`
          : `Honored to cook for ${v.guestCount} guests at a beautiful ${v.occasion.toLowerCase()}. ${hashtags
              .slice(0, 3)
              .map((h) => '#' + h)
              .join(' ')}`,
      hashtags: hashtags.slice(0, 3),
      postType: 'event_recap',
    },
  ]

  return {
    captions,
    generatedAt: new Date().toISOString(),
  }
}
