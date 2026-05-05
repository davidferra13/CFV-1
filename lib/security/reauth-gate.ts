/**
 * Re-Auth Gate: Middleware-style helper for server actions
 *
 * Wraps any server action that requires recent re-authentication.
 * If the user's last reauth is too old, returns a redirect payload
 * instead of executing the action.
 */

import { requireReauth } from './reauth'

type ReauthRedirect = {
  reauthRequired: true
  redirectUrl: string
}

/**
 * Wrap a server action with re-authentication protection.
 *
 * @param action - the server action to protect
 * @param options - optional maxAge in minutes (default 15) and callbackUrl
 * @returns the action result, or a reauth redirect payload
 *
 * Usage in server actions:
 * ```ts
 * const result = await withReauth(
 *   () => changeEmail(newEmail),
 *   { callbackUrl: '/settings/account' }
 * )
 * if ('reauthRequired' in result) {
 *   redirect(result.redirectUrl)
 * }
 * ```
 */
export async function withReauth<T>(
  action: () => Promise<T>,
  options?: { maxAge?: number; callbackUrl?: string }
): Promise<T | ReauthRedirect> {
  const check = await requireReauth(options?.maxAge, options?.callbackUrl)

  if (check.required) {
    return {
      reauthRequired: true,
      redirectUrl: check.challengeUrl,
    }
  }

  return action()
}

/**
 * Type guard to check if a result is a reauth redirect.
 */
export function isReauthRequired<T>(result: T | ReauthRedirect): result is ReauthRedirect {
  return (
    typeof result === 'object' &&
    result !== null &&
    'reauthRequired' in result &&
    (result as ReauthRedirect).reauthRequired === true
  )
}
