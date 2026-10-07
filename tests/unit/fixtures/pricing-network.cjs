// Unit-only boundary: keep actual holiday cache and date formulas, omit remote
// Nager.Date/Redis I/O. Each Node test file runs in its own isolated process.
const Module = require('node:module')
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === '@/lib/holidays/nager-date') {
    return { getPublicHolidays: async () => [] }
  }
  return originalLoad.call(this, request, parent, isMain)
}
