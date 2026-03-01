import fs from 'fs'

const creds = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf8'))

const authRes = await fetch('http://localhost:3100/api/e2e/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: creds.email, password: creds.password }),
})
const cookies = authRes.headers.getSetCookie()?.join('; ') || ''
console.log('Auth:', authRes.status)

const controller = new AbortController()
const timer = setTimeout(() => {
  console.log('TIMED OUT at 180s')
  controller.abort()
}, 180000)

// Log progress every 10s
let lastEventTime = Date.now()
const progressInterval = setInterval(() => {
  const elapsed = ((Date.now() - start) / 1000).toFixed(0)
  const sinceLastEvent = ((Date.now() - lastEventTime) / 1000).toFixed(0)
  console.log(`  ... ${elapsed}s elapsed, ${sinceLastEvent}s since last event, events so far: ${events}`)
}, 10000)

const start = Date.now()
let events = 0
let text = ''

try {
  const res = await fetch('http://localhost:3100/api/remy/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({ message: "How's revenue this month?", history: [], currentPage: '/dashboard' }),
    signal: controller.signal,
  })
  console.log('Response status:', res.status)

  const reader = res.body?.getReader()
  if (!reader) {
    console.log('No body')
    process.exit(1)
  }

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        events++
        lastEventTime = Date.now()
        try {
          const p = JSON.parse(line.slice(6))
          if (p.type === 'token') text += p.data
          if (p.type === 'done' && p.data) text = p.data
          if (p.type === 'error') console.log('ERROR event:', p.data)
          if (p.type === 'intent') console.log('Intent:', p.data)
          if (events <= 3) console.log(`Event ${events}: type=${p.type}`)
        } catch {}
      }
    }
  }

  clearTimeout(timer)
  clearInterval(progressInterval)
  console.log('Time:', ((Date.now() - start) / 1000).toFixed(1) + 's')
  console.log('SSE events:', events)
  console.log('Response:', text.substring(0, 400))
} catch (err) {
  clearTimeout(timer)
  clearInterval(progressInterval)
  console.log('Error:', err.name, err.message?.substring(0, 100))
  if (text) console.log('Partial response:', text.substring(0, 200))
}
