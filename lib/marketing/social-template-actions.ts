'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { type SocialPlatform } from './social-template-constants'

// ---- Types ----

export type { SocialPlatform }
export type TemplateType = 'post' | 'story' | 'reel_caption' | 'bio' | 'hashtag_set'

export type SocialTemplate = {
  id: string
  chef_id: string
  platform: SocialPlatform
  template_type: TemplateType
  title: string
  content: string
  hashtags: string[]
  is_default: boolean
  used_count: number
  created_at: string
  updated_at: string
}

type CreateTemplateData = {
  platform: SocialPlatform
  template_type: TemplateType
  title: string
  content: string
  hashtags?: string[]
}

type UpdateTemplateData = Partial<
  Omit<CreateTemplateData, 'platform'> & { platform: SocialPlatform }
>

// PLATFORM_CHAR_LIMITS moved to ./social-template-constants.ts

// ---- Actions ----

export async function getSocialTemplates(filters?: {
  platform?: SocialPlatform
  templateType?: TemplateType
}): Promise<{ data: SocialTemplate[]; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('social_templates')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('updated_at', { ascending: false })

  if (filters?.platform) {
    query = query.eq('platform', filters.platform)
  }
  if (filters?.templateType) {
    query = query.eq('template_type', filters.templateType)
  }

  const { data, error } = await query

  if (error) {
    console.error('[social-templates] fetch error:', error)
    return { data: [], error: error.message }
  }

  return { data: data ?? [], error: null }
}

export async function createSocialTemplate(
  input: CreateTemplateData
): Promise<{ data: SocialTemplate | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('social_templates')
    .insert({
      chef_id: user.tenantId!,
      platform: input.platform,
      template_type: input.template_type,
      title: input.title,
      content: input.content,
      hashtags: input.hashtags ?? [],
    })
    .select()
    .single()

  if (error) {
    console.error('[social-templates] create error:', error)
    return { data: null, error: error.message }
  }

  revalidatePath('/marketing')
  return { data, error: null }
}

export async function updateSocialTemplate(
  id: string,
  input: UpdateTemplateData
): Promise<{ data: SocialTemplate | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.platform !== undefined) updatePayload.platform = input.platform
  if (input.template_type !== undefined) updatePayload.template_type = input.template_type
  if (input.title !== undefined) updatePayload.title = input.title
  if (input.content !== undefined) updatePayload.content = input.content
  if (input.hashtags !== undefined) updatePayload.hashtags = input.hashtags

  const { data, error } = await supabase
    .from('social_templates')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[social-templates] update error:', error)
    return { data: null, error: error.message }
  }

  revalidatePath('/marketing')
  return { data, error: null }
}

export async function deleteSocialTemplate(id: string): Promise<{ error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('social_templates')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[social-templates] delete error:', error)
    return { error: error.message }
  }

  revalidatePath('/marketing')
  return { error: null }
}

export async function duplicateSocialTemplate(
  id: string
): Promise<{ data: SocialTemplate | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch original
  const { data: original, error: fetchError } = await supabase
    .from('social_templates')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !original) {
    return { data: null, error: fetchError?.message ?? 'Template not found' }
  }

  // Insert copy
  const { data, error } = await supabase
    .from('social_templates')
    .insert({
      chef_id: user.tenantId!,
      platform: original.platform,
      template_type: original.template_type,
      title: `${original.title} (Copy)`,
      content: original.content,
      hashtags: original.hashtags ?? [],
    })
    .select()
    .single()

  if (error) {
    console.error('[social-templates] duplicate error:', error)
    return { data: null, error: error.message }
  }

  revalidatePath('/marketing')
  return { data, error: null }
}

export async function incrementUsedCount(id: string): Promise<{ error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase.rpc('increment_social_template_used_count', {
    template_id: id,
    p_chef_id: user.tenantId!,
  })

  // Fallback: if the rpc doesn't exist, do a manual increment
  if (error) {
    const { data: current } = await supabase
      .from('social_templates')
      .select('used_count')
      .eq('id', id)
      .eq('chef_id', user.tenantId!)
      .single()

    if (current) {
      await supabase
        .from('social_templates')
        .update({
          used_count: (current.used_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('chef_id', user.tenantId!)
    }
  }

  return { error: null }
}

// ---- Default/Starter Templates ----

type DefaultTemplate = Omit<CreateTemplateData, 'hashtags'> & { hashtags: string[] }

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    platform: 'instagram',
    template_type: 'post',
    title: 'Behind the Scenes',
    content:
      'A peek behind the curtain. This is where the magic happens.\n\nFrom prep to plate, every detail matters.',
    hashtags: ['#privatechef', '#behindthescenes', '#cheflife', '#foodprep'],
  },
  {
    platform: 'instagram',
    template_type: 'post',
    title: 'Plating Shot',
    content:
      "Every plate tells a story.\n\nTonight's creation: [dish name]\n\nFreshly sourced, carefully crafted, served with intention.",
    hashtags: ['#plating', '#chefsofinstagram', '#foodart', '#privatechef'],
  },
  {
    platform: 'instagram',
    template_type: 'post',
    title: 'Client Testimonial',
    content:
      '"[Client quote here]"\n\nNothing makes my day more than hearing from happy guests. Thank you for trusting me with your table.',
    hashtags: ['#clientlove', '#privatechef', '#testimonial', '#happyclients'],
  },
  {
    platform: 'instagram',
    template_type: 'post',
    title: 'Weekly Menu Preview',
    content:
      "This week's menu is coming together.\n\nHighlights:\n- [Dish 1]\n- [Dish 2]\n- [Dish 3]\n\nLimited spots available. DM to book.",
    hashtags: ['#weeklymenu', '#privatechef', '#mealprep', '#chefservices'],
  },
  {
    platform: 'instagram',
    template_type: 'post',
    title: 'Seasonal Ingredient Spotlight',
    content:
      "Right now I'm obsessed with [ingredient].\n\nIt's peak season and the flavor is unreal. Here's how I'm using it this week.",
    hashtags: ['#seasonal', '#farmtotable', '#localingredients', '#chefsofinstagram'],
  },
  {
    platform: 'instagram',
    template_type: 'story',
    title: 'Quick Kitchen Tip',
    content: 'Chef tip: [Insert tip here]\n\nSave this for later!',
    hashtags: ['#cheftip', '#cookingtips', '#kitchenhacks'],
  },
  {
    platform: 'instagram',
    template_type: 'reel_caption',
    title: 'Cooking Process Reel',
    content:
      'From raw to refined. Watch the full process.\n\nSong: [song name]\n\n[Describe dish and technique]',
    hashtags: ['#cookingreels', '#cheflife', '#foodprocess', '#reels'],
  },
  {
    platform: 'facebook',
    template_type: 'post',
    title: 'Event Recap',
    content:
      'What an incredible evening! Had the honor of cooking for [number] guests at [location/occasion].\n\nThe menu featured [highlight dishes]. Every bite was crafted with care and locally sourced ingredients.\n\nInterested in booking a private dining experience? Send me a message.',
    hashtags: ['#privatechef', '#privateevent', '#personalchef'],
  },
  {
    platform: 'facebook',
    template_type: 'post',
    title: 'Booking Availability',
    content:
      "I have a few openings this [month/week] for private chef services.\n\nWhether it's an intimate dinner for two or a gathering of twenty, I'd love to create something special for you.\n\nReach out to discuss your event.",
    hashtags: ['#privatechef', '#booknow', '#chefforhire'],
  },
  {
    platform: 'tiktok',
    template_type: 'reel_caption',
    title: 'Day in the Life',
    content:
      "A day in the life of a private chef.\n\nSpoiler: it's not all glamour. It's early mornings, heavy bags, and a lot of love.\n\n#cheflife #privatechef #dayinthelife",
    hashtags: ['#cheflife', '#privatechef', '#dayinthelife', '#foodtok'],
  },
  {
    platform: 'twitter',
    template_type: 'post',
    title: 'Quick Thought',
    content:
      "The best meals aren't about the most expensive ingredients. They're about intention, technique, and knowing your guests.",
    hashtags: ['#cheflife', '#privatechef'],
  },
  {
    platform: 'linkedin',
    template_type: 'post',
    title: 'Business Update',
    content:
      "Excited to share a milestone in my private chef business.\n\n[Describe achievement: new service area, number of events, partnership, etc.]\n\nGrateful for every client who trusts me to bring their vision to the table. If you know someone looking for a private chef experience, I'd love to connect.",
    hashtags: ['#privatechef', '#entrepreneur', '#foodbusiness', '#culinary'],
  },
  {
    platform: 'instagram',
    template_type: 'bio',
    title: 'Chef Bio Template',
    content:
      'Private Chef | [City/Region]\nFarm-to-table dining experiences\nBookings & inquiries: [link]\n[Signature emoji] [Tagline]',
    hashtags: [],
  },
  {
    platform: 'instagram',
    template_type: 'hashtag_set',
    title: 'General Chef Hashtags',
    content: 'Copy and paste this set for general chef posts.',
    hashtags: [
      '#privatechef',
      '#personalchef',
      '#cheflife',
      '#chefsofinstagram',
      '#farmtotable',
      '#homecooking',
      '#foodie',
      '#instafood',
      '#chefservices',
      '#privatecatering',
      '#finedining',
      '#foodart',
    ],
  },
  {
    platform: 'instagram',
    template_type: 'hashtag_set',
    title: 'Event-Specific Hashtags',
    content: 'Use this set for event and party posts.',
    hashtags: [
      '#privateevent',
      '#dinnnerparty',
      '#eventcatering',
      '#chefforhire',
      '#intimatedining',
      '#privatecatering',
      '#celebrationdinner',
      '#birthdaydinner',
      '#anniversarydinner',
      '#holidaydinner',
    ],
  },
]

export async function getDefaultTemplates(): Promise<DefaultTemplate[]> {
  return DEFAULT_TEMPLATES
}

export async function seedDefaultTemplates(): Promise<{ count: number; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const rows = DEFAULT_TEMPLATES.map((t) => ({
    chef_id: user.tenantId!,
    platform: t.platform,
    template_type: t.template_type,
    title: t.title,
    content: t.content,
    hashtags: t.hashtags,
    is_default: true,
  }))

  const { data, error } = await supabase.from('social_templates').insert(rows).select('id')

  if (error) {
    console.error('[social-templates] seed error:', error)
    return { count: 0, error: error.message }
  }

  revalidatePath('/marketing')
  return { count: data?.length ?? 0, error: null }
}
