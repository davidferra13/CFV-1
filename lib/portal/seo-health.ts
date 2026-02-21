// Public portal SEO health check — pure computation

export type SEOHealthItem = {
  key: string
  label: string
  status: 'pass' | 'fail' | 'warning'
  detail: string
}

export type SEOHealthReport = {
  items: SEOHealthItem[]
  score: number
  level: 'good' | 'needs-work' | 'poor'
}

export function computeSEOHealth(profile: {
  bio: string | null
  headline: string | null
  photo_url: string | null
  phone: string | null
  city: string | null
  portfolio_photo_count: number
  specialties: string[] | null
}): SEOHealthReport {
  const items: SEOHealthItem[] = []

  items.push(
    profile.bio && profile.bio.length > 100
      ? {
          key: 'bio',
          label: 'Bio/Description',
          status: 'pass',
          detail: `${profile.bio.length} characters`,
        }
      : profile.bio
        ? {
            key: 'bio',
            label: 'Bio/Description',
            status: 'warning',
            detail: 'Bio is short — aim for 100+ characters',
          }
        : {
            key: 'bio',
            label: 'Bio/Description',
            status: 'fail',
            detail: 'No bio — add a compelling description',
          }
  )

  items.push(
    profile.headline
      ? { key: 'headline', label: 'Headline/Tagline', status: 'pass', detail: 'Present' }
      : {
          key: 'headline',
          label: 'Headline/Tagline',
          status: 'fail',
          detail: 'Missing — add a headline',
        }
  )

  items.push(
    profile.photo_url
      ? { key: 'photo', label: 'Profile Photo', status: 'pass', detail: 'Present' }
      : {
          key: 'photo',
          label: 'Profile Photo',
          status: 'fail',
          detail: 'Missing — upload a professional photo',
        }
  )

  items.push(
    profile.phone || profile.city
      ? {
          key: 'contact',
          label: 'Contact Info',
          status: 'pass',
          detail: [profile.phone ? 'Phone' : '', profile.city ? 'City' : '']
            .filter(Boolean)
            .join(', '),
        }
      : {
          key: 'contact',
          label: 'Contact Info',
          status: 'warning',
          detail: 'Add phone or city for local SEO',
        }
  )

  items.push(
    profile.portfolio_photo_count >= 3
      ? {
          key: 'photos',
          label: 'Portfolio Photos',
          status: 'pass',
          detail: `${profile.portfolio_photo_count} photos`,
        }
      : {
          key: 'photos',
          label: 'Portfolio Photos',
          status: 'warning',
          detail: `Only ${profile.portfolio_photo_count} — aim for 3+`,
        }
  )

  items.push(
    profile.specialties && profile.specialties.length > 0
      ? {
          key: 'specialties',
          label: 'Specialties Listed',
          status: 'pass',
          detail: profile.specialties.join(', '),
        }
      : {
          key: 'specialties',
          label: 'Specialties Listed',
          status: 'warning',
          detail: 'Add specialties for search discoverability',
        }
  )

  const passes = items.filter((i) => i.status === 'pass').length
  const score = Math.min(100, Math.round((passes / items.length) * 100))
  const level = score >= 80 ? 'good' : score >= 50 ? 'needs-work' : 'poor'

  return { items, score, level }
}
