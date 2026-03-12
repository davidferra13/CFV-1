export type LaunchMode = 'beta' | 'public'

function resolveLaunchMode(value: string | undefined): LaunchMode {
  return value?.toLowerCase() === 'public' ? 'public' : 'beta'
}

export const LAUNCH_MODE: LaunchMode = resolveLaunchMode(process.env.NEXT_PUBLIC_MARKETING_MODE)

export const PRIMARY_SIGNUP_HREF = LAUNCH_MODE === 'public' ? '/auth/signup' : '/beta'
export const PRIMARY_SIGNUP_LABEL =
  LAUNCH_MODE === 'public' ? 'Get started' : 'Request early access'
