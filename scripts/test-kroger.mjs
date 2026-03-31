import 'dotenv/config'

const clientId = process.env.KROGER_CLIENT_ID
const clientSecret = process.env.KROGER_CLIENT_SECRET

// Get OAuth2 token
const tokenRes = await fetch('https://api-ce.kroger.com/v1/connect/oauth2/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
  },
  body: 'grant_type=client_credentials&scope=product.compact'
})

if (!tokenRes.ok) {
  console.log('Token failed:', tokenRes.status, await tokenRes.text())
  process.exit(1)
}

const token = await tokenRes.json()
console.log('Token acquired, expires in:', token.expires_in, 'seconds')

// Search for apple
const res1 = await fetch('https://api-ce.kroger.com/v1/products?filter.term=apple&filter.limit=3', {
  headers: { 'Authorization': 'Bearer ' + token.access_token }
})
const d1 = await res1.json()
console.log('\n"apple":')
for (const item of d1.data || []) {
  const p = item.items?.[0]?.price
  console.log('  ' + item.description + ' - $' + (p?.regular || 'N/A'))
}

// Search for chicken breast
const res2 = await fetch('https://api-ce.kroger.com/v1/products?filter.term=chicken+breast&filter.limit=3', {
  headers: { 'Authorization': 'Bearer ' + token.access_token }
})
const d2 = await res2.json()
console.log('\n"chicken breast":')
for (const item of d2.data || []) {
  const p = item.items?.[0]?.price
  console.log('  ' + item.description + ' - $' + (p?.regular || 'N/A'))
}

// Search for saffron
const res3 = await fetch('https://api-ce.kroger.com/v1/products?filter.term=saffron&filter.limit=3', {
  headers: { 'Authorization': 'Bearer ' + token.access_token }
})
const d3 = await res3.json()
console.log('\n"saffron":')
for (const item of d3.data || []) {
  const p = item.items?.[0]?.price
  console.log('  ' + item.description + ' - $' + (p?.regular || 'N/A'))
}

// Locations near Haverhill MA
const res4 = await fetch('https://api-ce.kroger.com/v1/locations?filter.zipCode.near=01835&filter.limit=5', {
  headers: { 'Authorization': 'Bearer ' + token.access_token }
})
if (res4.ok) {
  const d4 = await res4.json()
  console.log('\nKroger-family stores near Haverhill, MA:')
  for (const loc of d4.data || []) {
    console.log('  ' + loc.name + ' - ' + loc.address?.addressLine1 + ', ' + loc.address?.city + ', ' + loc.address?.state)
  }
  if ((d4.data || []).length === 0) console.log('  (none found - Kroger family not in this region)')
} else {
  console.log('\nLocations:', res4.status)
}

// Locations near a Kroger stronghold (Cincinnati OH)
const res5 = await fetch('https://api-ce.kroger.com/v1/locations?filter.zipCode.near=45202&filter.limit=5', {
  headers: { 'Authorization': 'Bearer ' + token.access_token }
})
if (res5.ok) {
  const d5 = await res5.json()
  console.log('\nKroger-family stores near Cincinnati, OH:')
  for (const loc of d5.data || []) {
    console.log('  ' + loc.name + ' - ' + loc.address?.addressLine1 + ', ' + loc.address?.city + ', ' + loc.address?.state)
  }
}

console.log('\nKroger API is WORKING')
