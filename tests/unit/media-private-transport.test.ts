import assert from 'node:assert/strict'
import { test } from 'node:test'
import http from 'node:http'
import { z } from 'zod'
import { localPrivateParse } from '../../lib/ai/local-private-transport'

async function fixtureServer(handler: http.RequestListener, run: (url: string) => Promise<void>) {
  const server = http.createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  try { await run(`http://127.0.0.1:${address.port}`) }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
}

test('restricted transport rejects metadata redirects before sending content', async () => {
  let calls = 0
  await fixtureServer((_req, res) => {
    calls++
    res.writeHead(302, { Location: 'https://example.invalid' }); res.end()
  }, async url => {
    await assert.rejects(localPrivateParse(url, 'fixture', 'synthetic', 'harmless', z.object({ ok: z.boolean() })))
    assert.equal(calls, 1)
  })
})

test('restricted transport verifies model metadata and parses a local response', async () => {
  const routes: string[] = []
  await fixtureServer((req, res) => {
    routes.push(req.url || '')
    req.resume()
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(req.url === '/api/show'
      ? { model_info: { architecture: 'fixture' }, details: { format: 'gguf', parameter_size: '1B' } }
      : { done: true, response: '{"ok":true}' }))
  }, async url => {
    assert.deepEqual(await localPrivateParse(url, 'fixture', 'synthetic', 'harmless', z.object({ ok: z.boolean() })), { ok: true })
    assert.deepEqual(routes, ['/api/show', '/api/generate'])
  })
})

test('restricted transport does not send content to a cloud alias', async () => {
  let calls = 0
  await fixtureServer((req, res) => {
    calls++; req.resume(); res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ remote_host: 'https://example.invalid' }))
  }, async url => {
    await assert.rejects(localPrivateParse(url, 'innocent-name', 'synthetic', 'harmless', z.object({ ok: z.boolean() })))
    assert.equal(calls, 1)
  })
})
