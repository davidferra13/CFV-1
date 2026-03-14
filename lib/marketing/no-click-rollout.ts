function isTruthy(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export const NO_CLICK_FIRST_PUBLIC_ENABLED = isTruthy(
  process.env.NEXT_PUBLIC_NO_CLICK_FIRST_PUBLIC
)
