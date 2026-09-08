import assert from 'node:assert/strict'
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

test('cloud-backed model metadata blocks generation', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (_url, options) => {
    calls++
    assert.equal(options.redirect, 'error')
    return { ok: true, json: async () => ({ remote_host: 'https://example.invalid' }) }
  }
  try {
    await assert.rejects(localModelRequest('fixture', { prompt: 'harmless' }), MediaPrivacyBlocked)
    assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})
