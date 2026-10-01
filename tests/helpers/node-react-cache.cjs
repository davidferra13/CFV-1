// Next 14 supplies a canary React build to server modules, including cache().
// Plain node:test resolves React 18's stable package, which has no cache export.
// Use the installed framework's implementation, not a process-wide memoizer:
// without an RSC dispatcher it executes every call, preserving auth isolation.
const React = require('react')

if (typeof React.cache !== 'function') {
  React.cache = require('next/dist/compiled/react').cache
  if (typeof React.cache !== 'function') {
    throw new Error('The installed Next.js React build does not provide cache()')
  }
}
