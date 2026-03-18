// Simulation Ollama Client - Long-Timeout HTTP Wrapper
//
// Problem: Node.js 18+ uses undici for global fetch(), which enforces a 30-second
// headersTimeout. With qwen3-coder:30b running mostly on CPU, Ollama takes >30s
// to start streaming a response - triggering UND_ERR_HEADERS_TIMEOUT before any
// data arrives.
//
// Solution: Provide a custom fetch() built on node:http / node:https that has NO
// headersTimeout. A 10-minute socket timeout is set as a safety net only.
//
// This module is ONLY for the simulation subsystem. Do not use in production AI
// paths - those use parseWithOllama which surfaces errors to the user promptly.

import * as http from 'node:http'
import * as https from 'node:https'
import { Ollama } from 'ollama'
import { getOllamaConfig } from '@/lib/ai/providers'

// No socket timeout - simulation Ollama calls can take as long as needed.
// The 30B model on CPU may take 20+ minutes per call; we never want to abort early.
// If something goes catastrophically wrong, the watchdog will restart the server.

function headersToRecord(h: HeadersInit | null | undefined): Record<string, string> {
  if (!h) return {}
  if (typeof Headers !== 'undefined' && h instanceof Headers) {
    const result: Record<string, string> = {}
    h.forEach((v, k) => {
      result[k] = v
    })
    return result
  }
  if (Array.isArray(h)) {
    return Object.fromEntries(h) as Record<string, string>
  }
  return h as Record<string, string>
}

/**
 * A fetch implementation backed by node:http/https.
 * Unlike the global fetch (undici), this has no hardcoded headers timeout.
 */
function makeNodeFetch(): typeof globalThis.fetch {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return new Promise((resolve, reject) => {
      let urlStr: string
      if (typeof input === 'string') {
        urlStr = input
      } else if (input instanceof URL) {
        urlStr = input.toString()
      } else {
        urlStr = (input as Request).url
      }

      const url = new URL(urlStr)
      const isHttps = url.protocol === 'https:'
      const lib = isHttps ? https : http

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: (init?.method ?? 'GET').toUpperCase(),
        headers: headersToRecord(init?.headers),
      }

      const req = lib.request(options, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const body = Buffer.concat(chunks)
          const headers = new Headers()
          for (const [k, v] of Object.entries(res.headers)) {
            if (v != null) {
              headers.set(k, Array.isArray(v) ? v.join(', ') : String(v))
            }
          }
          resolve(
            new Response(body, {
              status: res.statusCode ?? 200,
              statusText: res.statusMessage ?? 'OK',
              headers,
            })
          )
        })
        res.on('error', reject)
      })

      req.on('error', reject)

      if (init?.body != null) {
        const body = init.body
        if (typeof body === 'string') {
          req.write(body)
        } else if (body instanceof Uint8Array) {
          req.write(Buffer.from(body))
        } else if (body instanceof ArrayBuffer) {
          req.write(Buffer.from(body))
        }
        // ReadableStream not needed - ollama npm sends JSON strings
      }

      req.end()
    })
  }
}

/**
 * Creates an Ollama client configured for simulation use:
 * - Uses node:http instead of global fetch (no undici headersTimeout)
 * - 10-minute socket-level timeout as a safety net
 * - Points to OLLAMA_BASE_URL (same as production)
 */
export function makeOllamaClient(): Ollama {
  const config = getOllamaConfig()
  const nodeFetch = makeNodeFetch()
  return new Ollama({ host: config.baseUrl, fetch: nodeFetch as typeof fetch })
}
