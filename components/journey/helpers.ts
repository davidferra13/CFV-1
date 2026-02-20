export function parseLines(value: string): string[] {
  return value
    .split(/[\n,]/g)
    .map(item => item.trim())
    .filter(Boolean)
}

export function joinLines(values: string[]): string {
  return values.join('\n')
}

export function formatDisplayDate(value: string | null): string {
  if (!value) return 'No date'
  return new Date(value).toLocaleDateString()
}
