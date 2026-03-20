// Capacitor configuration helpers
// Used by capacitor.config.ts for dynamic server URL resolution

export function resolveCapacitorServerUrl(): string {
  return process.env.CAPACITOR_SERVER_URL || 'http://localhost:3100'
}

export function shouldUseCapacitorCleartext(url: string): boolean {
  return url.startsWith('http://')
}

export function buildCapacitorNavigationHosts(url: string): string[] {
  try {
    const hostname = new URL(url).hostname
    return [hostname, '*.cheflowhq.com']
  } catch {
    return ['localhost', '*.cheflowhq.com']
  }
}
