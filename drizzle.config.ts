import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema/*',
  out: './lib/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
  schemaFilter: ['public', 'auth', 'openclaw'],
  introspect: {
    casing: 'camel',
  },
})
