export type AppEnvironment = 'production' | 'staging' | 'development'

function normalize(raw: string | undefined): string {
  return (raw || '').trim().toLowerCase()
}

export function getAppEnvironment(): AppEnvironment {
  const explicit = normalize(process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV)

  const value = explicit || normalize(process.env.NODE_ENV)

  if (value.includes('prod')) return 'production'
  if (value.includes('stag') || value.includes('preview')) return 'staging'
  return 'development'
}

export function isProductionEnvironment(): boolean {
  return getAppEnvironment() === 'production'
}
