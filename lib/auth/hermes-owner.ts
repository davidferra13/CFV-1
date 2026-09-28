const HERMES_OWNER_EMAIL = 'davidferra13@gmail.com'

export function isHermesOwnerEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === HERMES_OWNER_EMAIL
}
