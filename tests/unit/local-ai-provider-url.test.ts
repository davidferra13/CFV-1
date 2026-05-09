import assert from 'node:assert/strict'
import test from 'node:test'

import {
  pickOllamaModelVariant,
  resolveEffectiveOllamaUrl,
  resolveOllamaApiUrl,
} from '@/lib/ai/local-ai-provider'

function withMockWindow<T>(protocol: string, origin: string, fn: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { protocol, origin } },
  })

  try {
    return fn()
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'window', descriptor)
    } else {
      delete (globalThis as { window?: unknown }).window
    }
  }
}

test('resolveOllamaApiUrl supports raw Ollama hosts', () => {
  assert.equal(
    resolveOllamaApiUrl('http://localhost:11434', 'tags'),
    'http://localhost:11434/api/tags'
  )
  assert.equal(
    resolveOllamaApiUrl('http://localhost:11434/', 'chat'),
    'http://localhost:11434/api/chat'
  )
})

test('resolveOllamaApiUrl supports Pi relay roots', () => {
  assert.equal(
    resolveOllamaApiUrl('http://10.0.0.177:8081/api/ollama', 'tags'),
    'http://10.0.0.177:8081/api/ollama/tags'
  )
  assert.equal(
    resolveOllamaApiUrl('http://10.0.0.177:8081/api/ollama/', 'chat'),
    'http://10.0.0.177:8081/api/ollama/chat'
  )
})

test('resolveOllamaApiUrl supports generic /api roots', () => {
  assert.equal(
    resolveOllamaApiUrl('https://ai.example.com/api', 'generate'),
    'https://ai.example.com/api/generate'
  )
})

test('resolveOllamaApiUrl supports the same-origin Ollama proxy root', () => {
  assert.equal(resolveOllamaApiUrl('/api/ollama-proxy', 'tags'), '/api/ollama-proxy/tags')
  assert.equal(
    resolveOllamaApiUrl('https://app.example.com/api/ollama-proxy/', 'chat'),
    'https://app.example.com/api/ollama-proxy/chat'
  )
})

test('resolveEffectiveOllamaUrl keeps loopback Ollama direct on HTTPS', () => {
  withMockWindow('https:', 'https://app.example.com', () => {
    assert.equal(resolveEffectiveOllamaUrl('http://localhost:11434'), 'http://localhost:11434')
    assert.equal(resolveEffectiveOllamaUrl('http://127.0.0.1:11434'), 'http://127.0.0.1:11434')
  })
})

test('resolveEffectiveOllamaUrl proxies non-loopback HTTP Ollama on HTTPS', () => {
  withMockWindow('https:', 'https://app.example.com', () => {
    assert.equal(
      resolveEffectiveOllamaUrl('http://10.0.0.177:11434'),
      'https://app.example.com/api/ollama-proxy'
    )
  })
})

test('pickOllamaModelVariant resolves bare model names to installed tagged variants', () => {
  assert.equal(pickOllamaModelVariant('gemma4', ['gemma4:e2b-it-q4_K_M']), 'gemma4:e2b-it-q4_K_M')
  assert.equal(
    pickOllamaModelVariant('gemma4:e2b-it-q4_K_M', ['gemma4:e2b-it-q4_K_M']),
    'gemma4:e2b-it-q4_K_M'
  )
  assert.equal(pickOllamaModelVariant('gemma4', ['qwen3:8b']), 'gemma4')
})
