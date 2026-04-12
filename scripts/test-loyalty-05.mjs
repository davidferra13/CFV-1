// Test loyalty-05 specifically to diagnose the edge case
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { signInAgent } from './lib/db.mjs'

const PORT = 3100

async function main() {
  let cookieStr
  try {
    cookieStr = await signInAgent(PORT)
  } catch (err) {
    console.error('Auth failed:', err.message)
    return
  }

  console.log('Testing loyalty-05: "Loyalty tier edge case"\n')

  const res = await fetch('http://localhost:3100/api/remy/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    body: JSON.stringify({
      message: 'Loyalty tier edge case',
      currentPage: '/dashboard',
      recentPages: ['/dashboard'],
      recentActions: [],
      recentErrors: [],
      sessionMinutes: 3,
      activeForm: null,
      history: [],
    }),
  }).catch((e) => {
    console.error('Fetch failed:', e.message)
    return { status: 0 }
  })

  console.log(`Response status: ${res.status}\n`)

  if (res.status !== 200) {
    console.log(`❌ FAILED: HTTP ${res.status}`)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    fullText += decoder.decode(value)
  }

  const events = fullText
    .split('\n\n')
    .filter((e) => e.startsWith('data: '))
    .map((e) => {
      try {
        return JSON.parse(e.replace('data: ', ''))
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const tokens = events.filter((e) => e.type === 'token').map((e) => e.data).join('')
  const errors = events.filter((e) => e.type === 'error')
  const tasks = events.find((e) => e.type === 'tasks')
  const nav = events.find((e) => e.type === 'nav')

  console.log('Events received:', events.length)
  console.log('Tokens:', tokens.length > 0 ? tokens.length + ' chars' : 'none')
  console.log('Errors:', errors.length)
  console.log('Tasks:', tasks ? 'yes' : 'no')
  console.log('Nav:', nav ? 'yes' : 'no')

  if (errors.length > 0) {
    console.log('\n❌ ERRORS:')
    errors.forEach((e) => console.log('  -', e.data))
  }

  if (tokens.length > 0) {
    console.log('\n📝 RESPONSE:')
    console.log(tokens.substring(0, 500))
    if (tokens.length > 500) console.log('...(truncated)')
  }

  const passed = errors.length === 0 && (tokens || tasks || nav)
  console.log('\n' + (passed ? '✅ PASS' : '❌ FAIL'))
}

main().catch(console.error)
