export type ChefSocialLinks = {
  instagram?: string
  tiktok?: string
  facebook?: string
  youtube?: string
  linktree?: string
}

export type ChefFullProfile = {
  business_name: string
  display_name: string | null
  bio: string | null
  phone: string | null
  tagline: string | null
  google_review_url: string | null
  profile_image_url: string | null
  logo_url: string | null
  website_url: string | null
  show_website_on_public_profile: boolean
  preferred_inquiry_destination: 'website_only' | 'chefflow_only' | 'both'
  social_links: ChefSocialLinks
}
