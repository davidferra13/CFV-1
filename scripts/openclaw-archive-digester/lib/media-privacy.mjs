/** Current owner approval is required at each consumer, including direct calls. */
import { spawnSync } from 'node:child_process'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { isAbsolute } from 'node:path'

export class MediaPrivacyBlocked extends Error {
  constructor() { super('media_review_required'); this.name = 'MediaPrivacyBlocked' }
}

function authority(operation, filePath, extra = {}) {
  const python = process.env.MEDIA_PRIVACY_PYTHON
  if (!python || !isAbsolute(python) || !process.env.MEDIA_PRIVACY_HOME || !filePath) {
    throw new MediaPrivacyBlocked()
  }
  const bridge = fileURLToPath(new URL('../../local-media-privacy/bridge.py', import.meta.url))
  const result = spawnSync(python, [bridge], {
    input: JSON.stringify({ operation, path: filePath, ...extra }), encoding: 'utf8',
    env: { ...process.env, CF_PRIVACY_CONSUMER: process.execPath },
    timeout: 180000, maxBuffer: 96 * 1024 * 1024, windowsHide: true,
  })
  try {
    const parsed = JSON.parse(result.stdout)
    if (result.error || result.status !== 0 || parsed.ok !== true) throw new Error()
    return parsed
  } catch { throw new MediaPrivacyBlocked() }
}

export function readApprovedBytes(filePath) {
  return Buffer.from(authority('read', filePath).data, 'base64')
}

export function assertMediaApproved(filePath) { authority('check', filePath) }

export function assertPrivateRuntime() { authority('runtime', 'runtime') }

export function sealDerivedText(filePath, text) { return authority('seal', filePath, { text }).receipt }

export function verifyDerivedText(filePath, text, receipt) {
  authority('verify', filePath, { text, receipt })
}

export function assertArchiveApproved(db) {
  const fields = db.prepare('PRAGMA table_info(archive_files)').all().map(row => row.name)
  if (!fields.includes('privacy_receipt')) throw new MediaPrivacyBlocked()
  // Legacy aggregates cannot be released just because their source is approved now.
  const clean = db.prepare("SELECT value FROM archive_privacy_meta WHERE key='created_with_review_gate'").get()
  if (clean?.value !== '1') throw new MediaPrivacyBlocked()
  for (const row of db.prepare('SELECT original_path,ocr_text,privacy_receipt FROM archive_files').iterate()) {
    verifyDerivedText(row.original_path, row.ocr_text || '', row.privacy_receipt)
  }
}

export function localEndpoint(value) {
  try {
    const url = new URL(value)
    // This is the single listener whose executable the OS isolation gate verifies.
    if (url.origin !== 'http://127.0.0.1:11434'
        || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error()
    return url.origin
  } catch { throw new MediaPrivacyBlocked() }
}

// Direct node:http deliberately ignores proxy environment variables and agents.
function request(endpoint, route, body, timeout) {
  const payload = Buffer.from(JSON.stringify(body))
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(route, endpoint), {
      method: 'POST', agent: false,
      headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length },
    }, res => {
      if (res.statusCode !== 200) {
        res.resume()
        reject(new MediaPrivacyBlocked())
        return
      }
      const chunks = []
      let size = 0
      res.on('data', chunk => {
        size += chunk.length
        if (size > 1024 * 1024) { req.destroy(new MediaPrivacyBlocked()); return }
        chunks.push(chunk)
      })
      res.on('error', () => reject(new MediaPrivacyBlocked()))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
        catch { reject(new MediaPrivacyBlocked()) }
      })
    })
    const timer = setTimeout(() => req.destroy(new MediaPrivacyBlocked()), timeout)
    req.on('close', () => clearTimeout(timer))
    req.on('error', () => reject(new MediaPrivacyBlocked()))
    req.end(payload)
  })
}

export async function localModelRequest(model, payload) {
  const endpoint = localEndpoint(process.env.OLLAMA_URL || 'http://127.0.0.1:11434')
  if (!model || /cloud|remote/i.test(model)) throw new MediaPrivacyBlocked()
  const details = await request(endpoint, '/api/show', { model }, 10000)
  if (!details || details.remote_host || details.remote_model || !details.model_info ||
      !details.details?.parameter_size || details.details?.format !== 'gguf') {
    throw new MediaPrivacyBlocked()
  }
  const data = await request(endpoint, '/api/generate', { ...payload, model, stream: false }, 120000)
  return { ok: true, json: async () => data }
}
