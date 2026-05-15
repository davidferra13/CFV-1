const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

function envFlagEnabled(name: string): boolean {
  return TRUE_VALUES.has((process.env[name] ?? '').trim().toLowerCase())
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isSharedAiRuntimeEnabled(): boolean {
  return !isProductionRuntime() || envFlagEnabled('CHEFFLOW_SHARED_AI_RUNTIME_ENABLED')
}

export function isServerLocalAiProxyTargetAllowed(): boolean {
  return !isProductionRuntime() || envFlagEnabled('CHEFFLOW_SERVER_LOCAL_AI_PROXY_ENABLED')
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part))
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false
  }

  const [a, b] = parts
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 0 && b === 0)
  )
}

function isPrivateIpv6(host: string): boolean {
  // fc00::/7 (unique local addresses: fc00:: - fdff::)
  if (host.startsWith('fc') || host.startsWith('fd')) return true
  // fe80::/10 (link-local)
  if (host.startsWith('fe80:')) return true
  // ::ffff:127.0.0.1 (IPv4-mapped loopback)
  if (host.startsWith('::ffff:')) {
    const mapped = host.slice(7)
    return isPrivateIpv4(mapped)
  }
  return false
}

function isLoopbackOrPrivateHost(hostname: string): boolean {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
  return (
    host === 'localhost' ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1' ||
    host.endsWith('.localhost') ||
    isPrivateIpv4(host) ||
    isPrivateIpv6(host)
  )
}

export function isBlockedServerSideAiTarget(rawUrl: string): boolean {
  if (isServerLocalAiProxyTargetAllowed()) return false

  try {
    const url = new URL(rawUrl)
    return isLoopbackOrPrivateHost(url.hostname)
  } catch {
    return true
  }
}
