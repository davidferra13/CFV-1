/**
 * Mock Infrastructure — P0 Test Infrastructure
 *
 * Provides mock implementations for external services used in unit tests.
 * These are simple in-memory fakes — no mock libraries required.
 *
 * Usage:
 *   import { mocks } from '../helpers/mocks.js'
 *   const db = mocks.db({ returnData: [...] })
 */

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE MOCK
// ─────────────────────────────────────────────────────────────────────────────

type DbMockOptions = {
  returnData?: unknown
  returnError?: { code: string; message: string } | null
  singleRow?: boolean
}

/**
 * Creates a mock database client that returns controlled data.
 * Tracks all calls for assertion.
 */
export function createMockDb(defaults: DbMockOptions = {}) {
  const calls: { table: string; method: string; args: unknown[] }[] = []
  const data = defaults.returnData ?? null
  const error = defaults.returnError ?? null

  function result() {
    return { data, error, count: Array.isArray(data) ? data.length : data ? 1 : 0 }
  }

  function chainable(table: string) {
    const chain: Record<string, (...args: unknown[]) => unknown> = {}
    const methods = [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'like',
      'ilike',
      'is',
      'in',
      'not',
      'or',
      'and',
      'order',
      'limit',
      'range',
      'offset',
      'single',
      'maybeSingle',
      'textSearch',
      'filter',
      'match',
      'contains',
      'containedBy',
      'overlaps',
      'csv',
    ]

    for (const method of methods) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        if (method === 'single' || method === 'maybeSingle') {
          return result()
        }
        return chain
      }
    }

    // Make chain thenable so await works
    chain.then = (resolve: (v: unknown) => void) => resolve(result())

    return chain
  }

  const client = {
    from(table: string) {
      calls.push({ table, method: 'from', args: [table] })
      return chainable(table)
    },
    auth: {
      getUser: async () => ({
        data: { user: defaults.returnData ?? null },
        error: defaults.returnError ?? null,
      }),
    },
    getCalls() {
      return calls
    },
    getCallsTo(table: string) {
      return calls.filter((c) => c.table === table)
    },
    reset() {
      calls.length = 0
    },
  }

  return client
}

// ─────────────────────────────────────────────────────────────────────────────
// OLLAMA MOCK
// ─────────────────────────────────────────────────────────────────────────────

type OllamaMockOptions = {
  response?: string
  shouldFail?: boolean
  failMessage?: string
  latencyMs?: number
}

/**
 * Creates a mock Ollama response function.
 * Replaces parseWithOllama for unit tests.
 */
export function createMockOllama(options: OllamaMockOptions = {}) {
  const calls: { prompt: string; model?: string }[] = []

  async function mockParse(prompt: string, _schema?: unknown, model?: string) {
    calls.push({ prompt, model })

    if (options.latencyMs) {
      await new Promise((r) => setTimeout(r, options.latencyMs))
    }

    if (options.shouldFail) {
      throw new Error(options.failMessage ?? 'Ollama is offline')
    }

    return options.response ?? '{"result": "mock"}'
  }

  return {
    parse: mockParse,
    getCalls() {
      return calls
    },
    reset() {
      calls.length = 0
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE MOCK
// ─────────────────────────────────────────────────────────────────────────────

type StripeMockOptions = {
  checkoutUrl?: string
  webhookSecret?: string
}

/**
 * Creates a mock Stripe client for unit testing payment flows.
 */
export function createMockStripe(options: StripeMockOptions = {}) {
  const events: { type: string; data: unknown }[] = []

  return {
    checkout: {
      sessions: {
        create: async (params: unknown) => ({
          id: `cs_test_${Date.now()}`,
          url: options.checkoutUrl ?? 'https://checkout.stripe.com/test',
          ...params,
        }),
      },
    },
    paymentIntents: {
      create: async (params: Record<string, unknown>) => ({
        id: `pi_test_${Date.now()}`,
        status: 'requires_payment_method',
        amount: params.amount,
        currency: params.currency ?? 'usd',
        client_secret: `pi_test_secret_${Date.now()}`,
      }),
      retrieve: async (id: string) => ({
        id,
        status: 'succeeded',
        amount: 10000,
        currency: 'usd',
      }),
    },
    refunds: {
      create: async (params: Record<string, unknown>) => ({
        id: `re_test_${Date.now()}`,
        amount: params.amount,
        status: 'succeeded',
        payment_intent: params.payment_intent,
      }),
    },
    webhooks: {
      constructEvent: (body: string, signature: string, secret?: string) => {
        const webhookSecret = secret ?? options.webhookSecret ?? 'whsec_test'
        if (!signature || signature === 'invalid') {
          throw new Error('Webhook signature verification failed')
        }
        const event = JSON.parse(body)
        events.push(event)
        return event
      },
    },
    getReceivedEvents() {
      return events
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL MOCK (SendGrid / SMTP)
// ─────────────────────────────────────────────────────────────────────────────

type EmailMessage = {
  to: string
  from: string
  subject: string
  html?: string
  text?: string
}

/**
 * Creates a mock email sender that captures all sent messages.
 */
export function createMockEmail() {
  const sent: EmailMessage[] = []

  return {
    async send(message: EmailMessage) {
      sent.push(message)
      return { statusCode: 202, messageId: `msg_${Date.now()}` }
    },
    getSent() {
      return sent
    },
    getLastSent() {
      return sent[sent.length - 1] ?? null
    },
    getSentTo(email: string) {
      return sent.filter((m) => m.to === email)
    },
    reset() {
      sent.length = 0
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS MOCK (Twilio)
// ─────────────────────────────────────────────────────────────────────────────

type SmsMessage = {
  to: string
  from: string
  body: string
}

/**
 * Creates a mock SMS sender that captures all sent messages.
 */
export function createMockSms() {
  const sent: SmsMessage[] = []

  return {
    messages: {
      create: async (message: SmsMessage) => {
        sent.push(message)
        return { sid: `SM_test_${Date.now()}`, status: 'queued' }
      },
    },
    getSent() {
      return sent
    },
    reset() {
      sent.length = 0
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROCERY API MOCKS (Spoonacular, Kroger, MealMe)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock grocery pricing API.
 */
export function createMockGroceryApi() {
  return {
    async searchProducts(query: string) {
      return [
        {
          name: query,
          brand: 'Test Brand',
          price_cents: 299 + Math.floor(Math.random() * 500),
          unit: 'each',
          store: 'Test Store',
        },
      ]
    },
    async getPrice(productId: string) {
      return {
        id: productId,
        price_cents: 499,
        available: true,
      }
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TURNSTILE MOCK (Cloudflare)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock Turnstile captcha verifier.
 */
export function createMockTurnstile(options: { shouldPass?: boolean } = {}) {
  const shouldPass = options.shouldPass ?? true

  return {
    async verify(token: string) {
      return {
        success: shouldPass && token !== 'invalid-token',
        challenge_ts: new Date().toISOString(),
        hostname: 'localhost',
      }
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const mocks = {
  db: createMockDb,
  ollama: createMockOllama,
  stripe: createMockStripe,
  email: createMockEmail,
  sms: createMockSms,
  grocery: createMockGroceryApi,
  turnstile: createMockTurnstile,
}
