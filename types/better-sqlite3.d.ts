// better-sqlite3 ships no TypeScript types and @types/better-sqlite3 is not in
// the lockfile, so `npm run typecheck:app` failed with TS7016 on lib/cil/*.
// Adding the types package rewrites ~600 lockfile lines under the current npm,
// which is not a change to smuggle into a release. This declares only the
// surface lib/cil uses, deliberately loose, until that dependency is added in
// its own change, at which point this file should be deleted.
declare module 'better-sqlite3' {
  interface BetterSqlite3Constructor {
    new (filename?: string, options?: Record<string, unknown>): any
    (filename?: string, options?: Record<string, unknown>): any
  }

  const Database: BetterSqlite3Constructor

  namespace Database {
    type Database = any
    type Statement = any
    type RunResult = any
    type Options = Record<string, unknown>
  }

  export = Database
}
