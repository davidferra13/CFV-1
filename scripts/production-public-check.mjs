import { pathToFileURL } from 'node:url'

// External reachability only. No local-origin assumptions, restarts or DNS writes.
export const publicChecks = ['cheflowhq.com', 'app.cheflowhq.com'].flatMap((host) => [
  { url: `https://${host}/`, kind: 'page' },
  { url: `https://${host}/api/health/ping`, kind: 'ping' },
])

export function classifyResponse(check, status, body) {
  const errorText = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  if (status === 530 && /\berror(?: code:?)?\s+1033\b/i.test(errorText)) return 'tunnel_disconnected'
  if (status !== 200) return `http_${status}`
  if (check.kind === 'ping') {
    try {
      if (JSON.parse(body).status === 'ok') return 'reachable'
    } catch { /* A login/error page is not a successful health probe. */ }
    return 'invalid_health_response'
  }
  return 'reachable'
}

export async function checkPublic({ fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const results = await Promise.all(publicChecks.map(async (check) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(check.url, {
        redirect: 'manual', signal: controller.signal,
        headers: { 'cache-control': 'no-cache', 'user-agent': 'ChefFlow-Public-Check/1.0' },
      })
      // Only the tiny ping/error bodies are needed; never retain page content.
      let body = ''
      if (check.kind === 'ping' || response.status === 530) {
        const reader = response.body?.getReader()
        try {
          while (reader && body.length < 4096) {
            const chunk = await reader.read()
            if (chunk.done) break
            body += new TextDecoder().decode(chunk.value).slice(0, 4096 - body.length)
          }
        } finally { await reader?.cancel() }
      } else { await response.body?.cancel() }
      const classification = classifyResponse(check, response.status, body)
      return { url: check.url, status: response.status, classification, ok: classification === 'reachable' }
    } catch {
      return { url: check.url, status: null, classification: 'transport_error', ok: false }
    } finally { clearTimeout(timer) }
  }))
  return { checkedAt: new Date().toISOString(), ok: results.every((r) => r.ok), results }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = await checkPublic()
  console.log(JSON.stringify(summary, null, 2))
  if (!summary.ok) process.exitCode = 1
}
