import assert from 'node:assert/strict'
import test from 'node:test'

import { pickOllamaModelVariant, resolveOllamaApiUrl } from '@/lib/ai/local-ai-provider'

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

test('pickOllamaModelVariant resolves bare model names to installed tagged variants', () => {
  assert.equal(pickOllamaModelVariant('gemma4', ['gemma4:e2b-it-q4_K_M']), 'gemma4:e2b-it-q4_K_M')
  assert.equal(
    pickOllamaModelVariant('gemma4:e2b-it-q4_K_M', ['gemma4:e2b-it-q4_K_M']),
    'gemma4:e2b-it-q4_K_M'
  )
  assert.equal(pickOllamaModelVariant('gemma4', ['qwen3:8b']), 'gemma4')
})
