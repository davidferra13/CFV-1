import assert from 'node:assert/strict'
import http from 'node:http'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { test } from 'node:test'
import { extractTextFromImage, extractTextFromPdf } from '../../scripts/openclaw-archive-digester/lib/ocr-pipeline.mjs'
import { classifyDocument, extractEntities } from '../../scripts/openclaw-archive-digester/lib/ollama-prompts.mjs'
import { localEndpoint, localModelRequest, MediaPrivacyBlocked } from '../../scripts/openclaw-archive-digester/lib/media-privacy.mjs'

test('direct unknown image and PDF calls perform zero network requests', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('unexpected request') }
  const previous = process.env.MEDIA_PRIVACY_HOME
  delete process.env.MEDIA_PRIVACY_HOME
  try {
    await assert.rejects(extractTextFromImage('synthetic-missing.png'), MediaPrivacyBlocked)
    await assert.rejects(extractTextFromPdf('synthetic-missing.pdf'), MediaPrivacyBlocked)
    assert.equal(calls, 0)
  } finally {
    globalThis.fetch = original
    if (previous === undefined) delete process.env.MEDIA_PRIVACY_HOME
    else process.env.MEDIA_PRIVACY_HOME = previous
  }
})

test('direct text extraction cannot bypass source provenance', async () => {
  await assert.rejects(classifyDocument('fixture', 'image', 'harmless text'), MediaPrivacyBlocked)
  await assert.rejects(extractEntities('recipe', 'harmless text'), MediaPrivacyBlocked)
})

test('endpoint validation rejects hostname and credential tricks', () => {
  for (const url of ['https://example.invalid/localhost', 'http://127.0.0.1.example.invalid',
                    'http://user:pass@localhost:11434', 'http://0.0.0.0:11434']) {
    assert.throws(() => localEndpoint(url), MediaPrivacyBlocked)
  }
  assert.equal(localEndpoint('http://127.0.0.1:11434'), 'http://127.0.0.1:11434')
})

test('unverified loopback ports are rejected before sending any payload', async () => {
  const original = http.request
  const previous = process.env.OLLAMA_URL
  let calls = 0
  http.request = async () => { calls++; throw new Error('unexpected request') }
  try {
    for (const url of ['http://127.0.0.1:12345', 'http://localhost:11434', 'http://[::1]:11434']) {
      process.env.OLLAMA_URL = url
      await assert.rejects(localModelRequest('fixture', { prompt: 'harmless' }), MediaPrivacyBlocked)
    }
    assert.equal(calls, 0)
  } finally {
    http.request = original
    if (previous === undefined) delete process.env.OLLAMA_URL
    else process.env.OLLAMA_URL = previous
  }
})

function stubHttp(responses, seen) {
  const original = http.request
  http.request = (url, options, callback) => {
    seen.push({ url: String(url), options })
    const req = new EventEmitter()
    req.destroy = () => { req.emit('error', new Error('fixture')); req.emit('close') }
    req.end = data => {
      seen.at(-1).body = JSON.parse(data)
      queueMicrotask(() => {
        const response = responses.shift()
        const res = Readable.from([Buffer.from(JSON.stringify(response.body))])
        res.statusCode = response.status || 200
        callback(res)
        res.on('end', () => req.emit('close'))
      })
    }
    return req
  }
  return () => { http.request = original }
}

test('cloud-backed model metadata blocks generation', async () => {
  const seen = []
  const restore = stubHttp([{ body: { remote_host: 'https://example.invalid' } }], seen)
  try {
    await assert.rejects(localModelRequest('fixture', { prompt: 'harmless' }), MediaPrivacyBlocked)
    assert.equal(seen.length, 1)
  } finally { restore() }
})

test('approved local metadata uses direct fixed-address transport', async () => {
  const seen = []
  const previous = process.env.HTTP_PROXY
  process.env.HTTP_PROXY = 'http://127.0.0.1:12345'
  const restore = stubHttp([
    { body: { model_info: { fixture: true }, details: { parameter_size: 'fixture', format: 'gguf' } } },
    { body: { done: true, response: 'harmless' } },
  ], seen)
  try {
    const response = await localModelRequest('fixture', { prompt: 'harmless', stream: true })
    assert.equal((await response.json()).response, 'harmless')
    assert.equal(seen.length, 2)
    assert.equal(seen[1].url, 'http://127.0.0.1:11434/api/generate')
    assert.equal(seen[1].options.agent, false)
    assert.equal(seen[1].body.stream, false)
  } finally {
    restore()
    if (previous === undefined) delete process.env.HTTP_PROXY
    else process.env.HTTP_PROXY = previous
  }
})

test('redirect response cannot forward a prompt', async () => {
  const seen = []
  const restore = stubHttp([{ status: 302, body: {} }], seen)
  try {
    await assert.rejects(localModelRequest('fixture', { prompt: 'harmless' }), MediaPrivacyBlocked)
    assert.equal(seen.length, 1)
  } finally { restore() }
})
