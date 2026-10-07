// Unit tests load server helpers outside Next.js' React server dispatcher.
// Match React.cache's uncached behavior there; never install this in application code.
const Module = require('node:module')
const path = require('node:path')
const React = require('react')
if (typeof React.cache !== 'function') {
  Object.defineProperty(React, 'cache', { value: (fn) => fn, configurable: true })
}
// `server-only` is provided by the Next.js bundler and is not an installed package,
// so it cannot be resolved here. Point the bare specifier at an empty module.
const serverOnlyStub = path.join(__dirname, 'server-only-stub.cjs')
const resolveFilename = Module._resolveFilename
if (!resolveFilename.__chefflowServerOnlyStub) {
  const patched = function (request, ...rest) {
    if (request === 'server-only') return serverOnlyStub
    return resolveFilename.call(this, request, ...rest)
  }
  patched.__chefflowServerOnlyStub = true
  Module._resolveFilename = patched
}
