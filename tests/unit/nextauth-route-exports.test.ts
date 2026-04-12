import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('nextauth route exports the concrete GET and POST handler functions', async () => {
  const authPath = require.resolve('../../lib/auth/index.ts')
  const routePath = require.resolve('../../app/api/auth/[...nextauth]/route.ts')

  const originalAuth = require.cache[authPath]

  const fakeGet = () => new Response('get')
  const fakePost = () => new Response('post')

  require.cache[authPath] = {
    exports: {
      handlers: {
        GET: fakeGet,
        POST: fakePost,
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const routeModule = require(routePath)

    assert.equal(routeModule.GET, fakeGet)
    assert.equal(routeModule.POST, fakePost)
    assert.equal(typeof routeModule.GET, 'function')
    assert.equal(typeof routeModule.POST, 'function')
  } finally {
    if (originalAuth) {
      require.cache[authPath] = originalAuth
    } else {
      delete require.cache[authPath]
    }

    delete require.cache[routePath]
  }
})
