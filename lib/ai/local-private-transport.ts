// Restricted structured parsing uses direct loopback HTTP, no proxy or redirect transport.
import http from 'node:http'
import type { z } from 'zod'
import { isLocalOllamaUrl } from './dispatch/routing-table'

async function request(baseUrl: string, route: string, body: unknown, timeoutMs: number): Promise<any> {
  if (!isLocalOllamaUrl(baseUrl)) throw new Error('Local AI runtime required.')
  const target = new URL(route, baseUrl)
  const payload = Buffer.from(JSON.stringify(body))
  return new Promise((resolve, reject) => {
    const req = http.request(target, {
      method: 'POST', agent: false,
      headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length },
    }, res => {
      // node:http does not follow redirects. Reject every non-success response.
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error('Local AI request unavailable.'))
        return
      }
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > 1024 * 1024) {
          req.destroy(new Error('Local AI response exceeds limit.'))
          return
        }
        chunks.push(chunk)
      })
      res.on('error', () => reject(new Error('Local AI response unavailable.')))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
        catch { reject(new Error('Local AI returned invalid structured data.')) }
      })
    })
    const timer = setTimeout(() => req.destroy(new Error('Local AI request timed out.')), Math.min(timeoutMs, 120000))
    req.on('close', () => clearTimeout(timer))
    req.on('error', () => reject(new Error('Local AI request unavailable.')))
    req.end(payload)
  })
}

export async function localPrivateParse<T>(baseUrl: string, model: string, system: string,
  prompt: string, schema: z.ZodType<T>, timeoutMs = 30000, maxTokens = 512): Promise<T> {
  if (/cloud|remote/i.test(model)) throw new Error('Local AI model required.')
  const metadata = await request(baseUrl, '/api/show', { model }, Math.min(timeoutMs, 10000))
  if (!metadata || metadata.remote_host || metadata.remote_model || !metadata.model_info ||
      !metadata.details?.parameter_size || metadata.details?.format !== 'gguf') {
    throw new Error('Verified local AI model required.')
  }
  const response = await request(baseUrl, '/api/generate', {
    model, system, prompt, stream: false, format: 'json', keep_alive: '1m',
    options: { num_predict: maxTokens, temperature: 0 },
  }, timeoutMs)
  if (response.done !== true || typeof response.response !== 'string') {
    throw new Error('Local AI response incomplete.')
  }
  try { return schema.parse(JSON.parse(response.response)) }
  catch { throw new Error('Local AI returned invalid structured data.') }
}
