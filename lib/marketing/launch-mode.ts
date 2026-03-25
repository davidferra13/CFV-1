export type LaunchMode = 'beta' | 'public'

function resolveLaunchMode(value: string | undefined): LaunchMode {
  // Default to public - the site is one thing now
  return value?.toLowerCase() === 'beta' ? 'beta' : 'public'
}

export const LAUNCH_MODE: LaunchMode = resolveLaunchMode(process.env.NEXT_PUBLIC_MARKETING_MODE)

export const PRIMARY_SIGNUP_HREF = LAUNCH_MODE === 'public' ? '/auth/signup' : '/beta'
export const PRIMARY_SIGNUP_LABEL = LAUNCH_MODE === 'public' ? 'Sign up' : 'Request early access'
