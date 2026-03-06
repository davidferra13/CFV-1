// Quick test: can we auth the agent account?
const resp = await fetch('http://localhost:3100/api/e2e/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'agent@chefflow.test', password: 'AgentChefFlow!2026' }),
})
console.log('Status:', resp.status)
console.log('Body:', await resp.text())
