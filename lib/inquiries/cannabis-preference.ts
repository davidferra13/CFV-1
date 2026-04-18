// Shared cannabis preference mapping
// Converts text preference values ("yes", "true", "open to it") to boolean

export function mapCannabisPreferenceToBoolean(value?: string | null): boolean | null {
  if (!value) return null
  return ['yes', 'true', 'open'].some((option) => value.toLowerCase().includes(option))
}
