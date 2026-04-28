export type CaptionTone = 'warm_personal' | 'elegant_professional' | 'playful_casual'

export type SocialPlatform = 'instagram' | 'facebook' | 'twitter' | 'linkedin'

export interface SocialCaption {
  platform: SocialPlatform
  tone: CaptionTone
  caption: string
  hashtags: string[]
  characterCount: number
}

export interface SocialCaptionsResult {
  captions: SocialCaption[]
  instagramFirst: string
  shortVersion: string
  generatedAt: string
}
