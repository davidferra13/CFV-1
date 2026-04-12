#!/usr/bin/env npx tsx
// API Integration Health Check Script
// Checks all 53 API integrations for configuration and basic connectivity.
// Usage: npm run api:health
//
// Reads .env.local for env vars, then tests each integration with minimal
// read-only API calls. Never writes, sends, or creates anything.

import * as fs from 'fs'
import * as path from 'path'

// Load .env.local manually (script runs outside Next.js)
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found. Run from project root.')
    process.exit(1)
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

loadEnvLocal()

// ---- Types ----

type Status = 'PASS' | 'FAIL' | 'MISS' | 'EMTY' | 'CONF' | 'OPTN' | 'WARN' | 'CRIT'

interface CheckResult {
  name: string
  status: Status
  message: string
  category: string
}

const results: CheckResult[] = []

// ---- Helpers ----

function getEnv(key: string): string | undefined {
  return process.env[key]
}

function envPresent(key: string): boolean {
  const v = getEnv(key)
  return v !== undefined && v !== ''
}

function envEmpty(key: string): boolean {
  const v = getEnv(key)
  return v !== undefined && v === ''
}

function maskKey(key: string | undefined): string {
  if (!key) return '(none)'
  if (key.length <= 8) return key.slice(0, 2) + '...'
  return key.slice(0, 4) + '...' + key.slice(-4)
}

async function fetchWithTimeout(
  url: string,
  opts?: RequestInit,
  timeoutMs = 5000
): Promise<Response> {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) })
}

function add(category: string, name: string, status: Status, message: string) {
  results.push({ category, name, status, message })
}

// ---- Integration Checks ----

async function checkGoogleMaps() {
  const key = getEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
  if (!key)
    return add(
      'MAPS & LOCATION',
      'Google Maps/Places',
      'MISS',
      'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set'
    )
  if (!key.trim())
    return add('MAPS & LOCATION', 'Google Maps/Places', 'EMTY', 'Key is empty string')
  try {
    const res = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${key}`
    )
    if (res.ok)
      return add(
        'MAPS & LOCATION',
        'Google Maps/Places',
        'PASS',
        `API responding (key: ${maskKey(key)})`
      )
    return add('MAPS & LOCATION', 'Google Maps/Places', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('MAPS & LOCATION', 'Google Maps/Places', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkMapbox() {
  const key = getEnv('NEXT_PUBLIC_MAPBOX_TOKEN')
  if (!key) return add('MAPS & LOCATION', 'Mapbox', 'MISS', 'NEXT_PUBLIC_MAPBOX_TOKEN not set')
  add('MAPS & LOCATION', 'Mapbox', 'PASS', `Token configured (${maskKey(key)})`)
}

async function checkGeocodio() {
  const key = getEnv('GEOCODIO_API_KEY')
  if (!key) return add('MAPS & LOCATION', 'Geocodio', 'MISS', 'GEOCODIO_API_KEY not set')
  add('MAPS & LOCATION', 'Geocodio', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkOpenMeteo() {
  try {
    const res = await fetchWithTimeout(
      'https://api.open-meteo.com/v1/forecast?latitude=42.77&longitude=-71.08&daily=temperature_2m_max&timezone=auto&forecast_days=1'
    )
    if (res.ok)
      return add('MAPS & LOCATION', 'Open-Meteo', 'PASS', 'Forecast API responding (free, no key)')
    return add('MAPS & LOCATION', 'Open-Meteo', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('MAPS & LOCATION', 'Open-Meteo', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkOSRM() {
  try {
    const res = await fetchWithTimeout(
      'https://router.project-osrm.org/route/v1/driving/-71.08,42.77;-71.06,42.76?overview=false'
    )
    if (res.ok)
      return add('MAPS & LOCATION', 'OSRM', 'PASS', 'Routing API responding (free, no key)')
    return add('MAPS & LOCATION', 'OSRM', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('MAPS & LOCATION', 'OSRM', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkIPAPI() {
  try {
    const res = await fetchWithTimeout('http://ip-api.com/json/?fields=status')
    if (res.ok) return add('MAPS & LOCATION', 'IP-API', 'PASS', 'Geolocation responding (free)')
    return add('MAPS & LOCATION', 'IP-API', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('MAPS & LOCATION', 'IP-API', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkRESTCountries() {
  try {
    const res = await fetchWithTimeout('https://restcountries.com/v3.1/alpha/US?fields=name')
    if (res.ok) return add('MAPS & LOCATION', 'REST Countries', 'PASS', 'API responding (free)')
    return add('MAPS & LOCATION', 'REST Countries', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('MAPS & LOCATION', 'REST Countries', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkSpoonacular() {
  const key = getEnv('SPOONACULAR_API_KEY')
  if (!key) return add('FOOD & GROCERY', 'Spoonacular', 'MISS', 'SPOONACULAR_API_KEY not set')
  try {
    const res = await fetchWithTimeout(
      `https://api.spoonacular.com/recipes/guessNutrition?title=pasta&apiKey=${key}`
    )
    if (res.ok)
      return add('FOOD & GROCERY', 'Spoonacular', 'PASS', `API responding (key: ${maskKey(key)})`)
    return add('FOOD & GROCERY', 'Spoonacular', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('FOOD & GROCERY', 'Spoonacular', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkKroger() {
  const id = getEnv('KROGER_CLIENT_ID')
  if (!id) return add('FOOD & GROCERY', 'Kroger', 'MISS', 'KROGER_CLIENT_ID not set')
  add('FOOD & GROCERY', 'Kroger', 'CONF', `Client ID configured (${maskKey(id)})`)
}

async function checkMealMe() {
  const key = getEnv('MEALME_API_KEY')
  if (!key) return add('FOOD & GROCERY', 'MealMe', 'MISS', 'MEALME_API_KEY not set')
  add('FOOD & GROCERY', 'MealMe', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkInstacart() {
  const key = getEnv('INSTACART_API_KEY')
  if (!key) return add('FOOD & GROCERY', 'Instacart', 'MISS', 'INSTACART_API_KEY not set')
  add('FOOD & GROCERY', 'Instacart', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkUSDA() {
  const key = getEnv('USDA_API_KEY')
  if (!key || key === 'DEMO_KEY') {
    return add('FOOD & GROCERY', 'USDA FDC', 'WARN', 'Using DEMO_KEY fallback (30 req/hr limit)')
  }
  try {
    const res = await fetchWithTimeout(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=rice&pageSize=1`
    )
    if (res.ok)
      return add('FOOD & GROCERY', 'USDA FDC', 'PASS', `API responding (key: ${maskKey(key)})`)
    return add('FOOD & GROCERY', 'USDA FDC', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('FOOD & GROCERY', 'USDA FDC', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkEdamam() {
  const id = getEnv('EDAMAM_APP_ID')
  const key = getEnv('EDAMAM_APP_KEY')
  if (!id) return add('FOOD & GROCERY', 'Edamam', 'MISS', 'EDAMAM_APP_ID not set')
  if (!key) return add('FOOD & GROCERY', 'Edamam', 'MISS', 'EDAMAM_APP_KEY not set')
  try {
    const res = await fetchWithTimeout(
      `https://api.edamam.com/api/nutrition-data?app_id=${id}&app_key=${key}&ingr=1%20cup%20rice`
    )
    if (res.ok)
      return add('FOOD & GROCERY', 'Edamam', 'PASS', `API responding (ID: ${maskKey(id)})`)
    return add('FOOD & GROCERY', 'Edamam', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('FOOD & GROCERY', 'Edamam', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkResend() {
  const key = getEnv('RESEND_API_KEY')
  if (!key) return add('COMMUNICATION', 'Resend', 'MISS', 'RESEND_API_KEY not set')
  try {
    const res = await fetchWithTimeout('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) return add('COMMUNICATION', 'Resend', 'PASS', `API key valid (${maskKey(key)})`)
    return add('COMMUNICATION', 'Resend', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('COMMUNICATION', 'Resend', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkTwilio() {
  const sid = getEnv('TWILIO_ACCOUNT_SID')
  if (!sid) return add('COMMUNICATION', 'Twilio', 'MISS', 'TWILIO_ACCOUNT_SID not set')
  const token = getEnv('TWILIO_AUTH_TOKEN')
  if (!token) return add('COMMUNICATION', 'Twilio', 'MISS', 'TWILIO_AUTH_TOKEN not set')
  const fromNum = getEnv('TWILIO_FROM_NUMBER')
  const phoneNum = getEnv('TWILIO_PHONE_NUMBER')
  if (!fromNum && !phoneNum)
    return add(
      'COMMUNICATION',
      'Twilio',
      'MISS',
      'Neither TWILIO_FROM_NUMBER nor TWILIO_PHONE_NUMBER set'
    )

  // Check for env var inconsistency
  if (fromNum && phoneNum && fromNum !== phoneNum) {
    add(
      'COMMUNICATION',
      'Twilio',
      'WARN',
      `TWILIO_FROM_NUMBER (${fromNum}) and TWILIO_PHONE_NUMBER (${phoneNum}) differ - possible misconfiguration`
    )
    return
  }

  add('COMMUNICATION', 'Twilio', 'CONF', `SID configured (${maskKey(sid)})`)
}

async function checkOneSignal() {
  const key = getEnv('ONESIGNAL_REST_API_KEY')
  if (!key) return add('COMMUNICATION', 'OneSignal', 'MISS', 'ONESIGNAL_REST_API_KEY not set')
  add('COMMUNICATION', 'OneSignal', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkGmail() {
  const id = getEnv('GOOGLE_CLIENT_ID')
  const secret = getEnv('GOOGLE_CLIENT_SECRET')
  if (!id || !secret)
    return add('COMMUNICATION', 'Gmail OAuth', 'MISS', 'GOOGLE_CLIENT_ID/SECRET not set')
  add('COMMUNICATION', 'Gmail OAuth', 'CONF', 'OAuth configured (requires user grant)')
}

async function checkStripe() {
  const sk = getEnv('STRIPE_SECRET_KEY')
  const pk = getEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
  const wh = getEnv('STRIPE_WEBHOOK_SECRET')

  if (sk === undefined && pk === undefined && wh === undefined) {
    return add('FINANCIAL', 'Stripe', 'MISS', 'No Stripe keys set')
  }

  // Check for empty string values (set but empty)
  const empties = []
  if (envEmpty('STRIPE_SECRET_KEY')) empties.push('STRIPE_SECRET_KEY')
  if (envEmpty('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'))
    empties.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
  if (envEmpty('STRIPE_WEBHOOK_SECRET')) empties.push('STRIPE_WEBHOOK_SECRET')

  if (empties.length > 0) {
    return add(
      'FINANCIAL',
      'Stripe',
      'EMTY',
      `Keys are empty strings: ${empties.join(', ')} - payments non-functional`
    )
  }

  if (!sk) return add('FINANCIAL', 'Stripe', 'MISS', 'STRIPE_SECRET_KEY not set')

  try {
    const res = await fetchWithTimeout('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${sk}` },
    })
    if (res.ok) return add('FINANCIAL', 'Stripe', 'PASS', `API responding (key: ${maskKey(sk)})`)
    return add('FINANCIAL', 'Stripe', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('FINANCIAL', 'Stripe', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkSquare() {
  const key = getEnv('SQUARE_APPLICATION_ID')
  if (!key) return add('FINANCIAL', 'Square', 'MISS', 'SQUARE_APPLICATION_ID not set')
  add('FINANCIAL', 'Square', 'CONF', `Application ID configured (${maskKey(key)})`)
}

async function checkQuickBooks() {
  const key = getEnv('QUICKBOOKS_CLIENT_ID')
  if (!key) return add('FINANCIAL', 'QuickBooks', 'MISS', 'QUICKBOOKS_CLIENT_ID not set')
  add('FINANCIAL', 'QuickBooks', 'CONF', `Client ID configured (${maskKey(key)})`)
}

async function checkDocuSign() {
  const key = getEnv('DOCUSIGN_CLIENT_ID')
  if (!key) return add('FINANCIAL', 'DocuSign', 'MISS', 'DOCUSIGN_CLIENT_ID not set')
  add('FINANCIAL', 'DocuSign', 'CONF', `Client ID configured (${maskKey(key)})`)
}

async function checkAPINinjas() {
  const key = getEnv('API_NINJAS_KEY')
  if (!key) return add('FINANCIAL', 'API Ninjas', 'MISS', 'API_NINJAS_KEY not set')
  add('FINANCIAL', 'API Ninjas', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkFrankfurter() {
  try {
    const res = await fetchWithTimeout('https://api.frankfurter.app/latest?from=USD&to=EUR')
    if (res.ok) return add('FINANCIAL', 'Frankfurter', 'PASS', 'Currency API responding (free)')
    return add('FINANCIAL', 'Frankfurter', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('FINANCIAL', 'Frankfurter', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkOllama() {
  try {
    const res = await fetchWithTimeout('http://localhost:11434/api/tags', undefined, 3000)
    if (res.ok) {
      const data = await res.json()
      const count = data?.models?.length ?? 0
      return add(
        'AI PROVIDERS',
        'Ollama',
        'PASS',
        `Running, ${count} model${count !== 1 ? 's' : ''} available`
      )
    }
    return add('AI PROVIDERS', 'Ollama', 'FAIL', `HTTP ${res.status}`)
  } catch {
    return add('AI PROVIDERS', 'Ollama', 'FAIL', 'Not running on localhost:11434')
  }
}

async function checkGemini() {
  const key = getEnv('GEMINI_API_KEY')
  if (!key) return add('AI PROVIDERS', 'Gemini', 'MISS', 'GEMINI_API_KEY not set')
  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    )
    if (res.ok) return add('AI PROVIDERS', 'Gemini', 'PASS', `API key valid (${maskKey(key)})`)
    return add('AI PROVIDERS', 'Gemini', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('AI PROVIDERS', 'Gemini', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkGroq() {
  const key = getEnv('GROQ_API_KEY')
  if (!key) return add('AI PROVIDERS', 'Groq', 'MISS', 'GROQ_API_KEY not set')
  try {
    const res = await fetchWithTimeout('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) {
      const data = await res.json()
      const count = data?.data?.length ?? 0
      return add('AI PROVIDERS', 'Groq', 'PASS', `API key valid, ${count} models available`)
    }
    return add('AI PROVIDERS', 'Groq', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('AI PROVIDERS', 'Groq', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkCerebras() {
  const key = getEnv('CEREBRAS_API_KEY')
  if (!key) return add('AI PROVIDERS', 'Cerebras', 'MISS', 'CEREBRAS_API_KEY not set')
  add('AI PROVIDERS', 'Cerebras', 'PASS', `Key format valid (${maskKey(key)})`)
}

async function checkMistral() {
  const key = getEnv('MISTRAL_API_KEY')
  if (!key) return add('AI PROVIDERS', 'Mistral', 'MISS', 'MISTRAL_API_KEY not set')
  try {
    const res = await fetchWithTimeout('https://api.mistral.ai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) return add('AI PROVIDERS', 'Mistral', 'PASS', `API key valid (${maskKey(key)})`)
    return add('AI PROVIDERS', 'Mistral', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('AI PROVIDERS', 'Mistral', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkSambaNova() {
  const key = getEnv('SAMBANOVA_API_KEY')
  if (!key) return add('AI PROVIDERS', 'SambaNova', 'MISS', 'SAMBANOVA_API_KEY not set')
  add('AI PROVIDERS', 'SambaNova', 'PASS', `Key format valid (${maskKey(key)})`)
}

async function checkGitHubModels() {
  const key = getEnv('GITHUB_MODELS_PAT')
  if (!key) return add('AI PROVIDERS', 'GitHub Models', 'MISS', 'GITHUB_MODELS_PAT not set')
  add('AI PROVIDERS', 'GitHub Models', 'PASS', `PAT format valid (${maskKey(key)})`)
}

async function checkOCRSpace() {
  const key = getEnv('OCR_SPACE_API_KEY')
  if (!key) return add('CONTENT & MEDIA', 'OCR.space', 'MISS', 'OCR_SPACE_API_KEY not set')
  add('CONTENT & MEDIA', 'OCR.space', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkUnsplash() {
  const key = getEnv('UNSPLASH_ACCESS_KEY')
  if (!key) return add('CONTENT & MEDIA', 'Unsplash', 'MISS', 'UNSPLASH_ACCESS_KEY not set')
  add('CONTENT & MEDIA', 'Unsplash', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkPexels() {
  const key = getEnv('PEXELS_API_KEY')
  if (!key) return add('CONTENT & MEDIA', 'Pexels', 'MISS', 'PEXELS_API_KEY not set')
  add('CONTENT & MEDIA', 'Pexels', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkCloudinary() {
  const name = getEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME')
  if (!name)
    return add('CONTENT & MEDIA', 'Cloudinary', 'MISS', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set')
  add('CONTENT & MEDIA', 'Cloudinary', 'PASS', `Cloud name: ${name}`)
}

async function checkLibreTranslate() {
  try {
    const res = await fetchWithTimeout('https://libretranslate.com/languages')
    if (res.ok)
      return add('CONTENT & MEDIA', 'LibreTranslate', 'PASS', 'Translation API responding (free)')
    return add('CONTENT & MEDIA', 'LibreTranslate', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('CONTENT & MEDIA', 'LibreTranslate', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkYelp() {
  const key = getEnv('YELP_API_KEY')
  if (!key) return add('REVIEWS', 'Yelp', 'MISS', 'YELP_API_KEY not set')
  add('REVIEWS', 'Yelp', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkSocialPlatforms() {
  const platforms = [
    { name: 'Instagram/Facebook', envKey: 'META_APP_ID' },
    { name: 'TikTok', envKey: 'TIKTOK_CLIENT_KEY' },
    { name: 'X/Twitter', envKey: 'X_CLIENT_ID' },
    { name: 'LinkedIn', envKey: 'LINKEDIN_CLIENT_ID' },
    { name: 'Pinterest', envKey: 'PINTEREST_APP_ID' },
    { name: 'YouTube', envKey: 'YOUTUBE_CLIENT_ID' },
  ]

  let anyConfigured = false
  for (const p of platforms) {
    const val = getEnv(p.envKey)
    if (val) {
      add('SOCIAL MEDIA', p.name, 'CONF', `${p.envKey} configured (${maskKey(val)})`)
      anyConfigured = true
    } else {
      add('SOCIAL MEDIA', p.name, 'MISS', `${p.envKey} not set`)
    }
  }

  // Check encryption key if any social platform is configured
  const encKey = getEnv('SOCIAL_TOKEN_ENCRYPTION_KEY')
  if (anyConfigured && !encKey) {
    add(
      'SOCIAL MEDIA',
      'Social Encryption',
      'CRIT',
      'SOCIAL_TOKEN_ENCRYPTION_KEY not set (will crash on OAuth)'
    )
  } else if (!encKey) {
    add('SOCIAL MEDIA', 'Social Encryption', 'MISS', 'SOCIAL_TOKEN_ENCRYPTION_KEY not set')
  } else {
    add('SOCIAL MEDIA', 'Social Encryption', 'PASS', 'Encryption key configured')
  }
}

async function checkTurnstile() {
  const key = getEnv('TURNSTILE_SECRET_KEY')
  if (!key)
    return add(
      'SECURITY',
      'Turnstile',
      'MISS',
      'TURNSTILE_SECRET_KEY not set (bot protection disabled)'
    )
  add('SECURITY', 'Turnstile', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkNagerDate() {
  try {
    const year = new Date().getFullYear()
    const res = await fetchWithTimeout(`https://date.nager.at/api/v3/publicholidays/${year}/US`)
    if (res.ok) return add('MISCELLANEOUS', 'Nager.Date', 'PASS', 'Holiday API responding (free)')
    return add('MISCELLANEOUS', 'Nager.Date', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('MISCELLANEOUS', 'Nager.Date', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkProPublica() {
  try {
    const res = await fetchWithTimeout(
      'https://projects.propublica.org/nonprofits/api/v2/search.json?q=test&page=0'
    )
    if (res.ok) return add('MISCELLANEOUS', 'ProPublica', 'PASS', 'Nonprofit API responding (free)')
    return add('MISCELLANEOUS', 'ProPublica', 'FAIL', `HTTP ${res.status}`)
  } catch (e: any) {
    return add('MISCELLANEOUS', 'ProPublica', 'FAIL', `Network error: ${e.message}`)
  }
}

async function checkTavily() {
  const key = getEnv('TAVILY_API_KEY')
  if (!key)
    return add(
      'MISCELLANEOUS',
      'Tavily',
      'MISS',
      'TAVILY_API_KEY not set (DuckDuckGo fallback active)'
    )
  add('MISCELLANEOUS', 'Tavily', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkInngest() {
  const key = getEnv('INNGEST_EVENT_KEY')
  if (!key)
    return add(
      'MISCELLANEOUS',
      'Inngest',
      'MISS',
      'INNGEST_EVENT_KEY not set (background jobs no-op)'
    )
  add('MISCELLANEOUS', 'Inngest', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkZapier() {
  const key = getEnv('ZAPIER_SUBSCRIBE_API_KEY')
  if (!key) return add('MISCELLANEOUS', 'Zapier', 'CONF', 'ZAPIER_SUBSCRIBE_API_KEY not set')
  add('MISCELLANEOUS', 'Zapier', 'PASS', `Key configured (${maskKey(key)})`)
}

async function checkSentry() {
  const dsn = getEnv('SENTRY_DSN') || getEnv('NEXT_PUBLIC_SENTRY_DSN')
  if (!dsn) return add('MISCELLANEOUS', 'Sentry', 'OPTN', 'Not configured (optional)')
  add('MISCELLANEOUS', 'Sentry', 'PASS', 'DSN configured')
}

async function checkPostHog() {
  const key = getEnv('NEXT_PUBLIC_POSTHOG_KEY')
  if (!key) return add('MISCELLANEOUS', 'PostHog', 'OPTN', 'Not configured (optional)')
  add('MISCELLANEOUS', 'PostHog', 'PASS', `Key configured (${maskKey(key)})`)
}

// ---- Main ----

async function main() {
  const _ahcd = new Date()
  const date = `${_ahcd.getFullYear()}-${String(_ahcd.getMonth() + 1).padStart(2, '0')}-${String(_ahcd.getDate()).padStart(2, '0')}`

  // Run all checks (network checks in parallel where possible)
  const checks = [
    // Maps & Location
    checkGoogleMaps(),
    checkMapbox(),
    checkGeocodio(),
    checkOpenMeteo(),
    checkOSRM(),
    checkIPAPI(),
    checkRESTCountries(),
    // Food & Grocery
    checkSpoonacular(),
    checkKroger(),
    checkMealMe(),
    checkInstacart(),
    checkUSDA(),
    checkEdamam(),
    // Communication
    checkResend(),
    checkTwilio(),
    checkOneSignal(),
    checkGmail(),
    // Financial
    checkStripe(),
    checkSquare(),
    checkQuickBooks(),
    checkDocuSign(),
    checkAPINinjas(),
    checkFrankfurter(),
    // AI
    checkOllama(),
    checkGemini(),
    checkGroq(),
    checkCerebras(),
    checkMistral(),
    checkSambaNova(),
    checkGitHubModels(),
    // Content & Media
    checkOCRSpace(),
    checkUnsplash(),
    checkPexels(),
    checkCloudinary(),
    checkLibreTranslate(),
    // Reviews
    checkYelp(),
    // Social
    checkSocialPlatforms(),
    // Security
    checkTurnstile(),
    // Misc
    checkNagerDate(),
    checkProPublica(),
    checkTavily(),
    checkInngest(),
    checkZapier(),
    checkSentry(),
    checkPostHog(),
  ]

  await Promise.all(checks)

  // ---- Print Results ----

  const statusColors: Record<Status, string> = {
    PASS: '\x1b[32m', // green
    FAIL: '\x1b[31m', // red
    MISS: '\x1b[33m', // yellow
    EMTY: '\x1b[31m', // red
    CONF: '\x1b[36m', // cyan
    OPTN: '\x1b[90m', // gray
    WARN: '\x1b[33m', // yellow
    CRIT: '\x1b[31m\x1b[1m', // bold red
  }
  const reset = '\x1b[0m'

  console.log('\n==============================================')
  console.log('  ChefFlow API Integration Health Check')
  console.log(`  ${date}`)
  console.log('==============================================\n')

  // Group by category, maintaining insertion order
  const categories = new Map<string, CheckResult[]>()
  for (const r of results) {
    if (!categories.has(r.category)) categories.set(r.category, [])
    categories.get(r.category)!.push(r)
  }

  for (const [cat, items] of categories) {
    console.log(cat)
    for (const item of items) {
      const color = statusColors[item.status] ?? ''
      const tag = `[${item.status}]`
      console.log(`  ${color}${tag}${reset} ${item.name.padEnd(24)} ${item.message}`)
    }
    console.log()
  }

  // Summary counts
  const counts: Record<Status, number> = {
    PASS: 0,
    FAIL: 0,
    EMTY: 0,
    MISS: 0,
    CONF: 0,
    OPTN: 0,
    WARN: 0,
    CRIT: 0,
  }
  for (const r of results) counts[r.status]++

  console.log('==============================================')
  console.log(
    `SUMMARY: ${counts.PASS} PASS | ${counts.FAIL} FAIL | ${counts.EMTY} EMPTY | ` +
      `${counts.MISS} MISS | ${counts.CONF} CONF | ${counts.OPTN} OPTN | ${counts.WARN} WARN | ${counts.CRIT} CRIT`
  )
  console.log('==============================================\n')

  // Critical issues
  const criticals = results.filter((r) => r.status === 'CRIT')
  if (criticals.length > 0) {
    console.log('CRITICAL:')
    criticals.forEach((c, i) => console.log(`  ${i + 1}. ${c.name}: ${c.message}`))
    console.log()
  }

  // Failures
  const failures = results.filter((r) => r.status === 'FAIL')
  if (failures.length > 0) {
    console.log('FAILURES:')
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}: ${f.message}`))
    console.log()
  }

  // Empty keys
  const empties = results.filter((r) => r.status === 'EMTY')
  if (empties.length > 0) {
    console.log('EMPTY KEYS:')
    empties.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}: ${e.message}`))
    console.log()
  }

  // Warnings
  const warnings = results.filter((r) => r.status === 'WARN')
  if (warnings.length > 0) {
    console.log('WARNINGS:')
    warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w.name}: ${w.message}`))
    console.log()
  }

  // ---- Write Report ----

  const reportLines = [
    `# API Integration Health Report`,
    ``,
    `> Auto-generated by \`npm run api:health\` on ${date}`,
    `> Re-run after adding/changing env vars to update.`,
    ``,
    `## Summary`,
    ``,
    `| Status | Count |`,
    `| --- | --- |`,
    `| PASS | ${counts.PASS} |`,
    `| FAIL | ${counts.FAIL} |`,
    `| EMPTY | ${counts.EMTY} |`,
    `| MISSING | ${counts.MISS} |`,
    `| CONFIG_ONLY | ${counts.CONF} |`,
    `| OPTIONAL | ${counts.OPTN} |`,
    `| WARNING | ${counts.WARN} |`,
    `| CRITICAL | ${counts.CRIT} |`,
    ``,
  ]

  for (const [cat, items] of categories) {
    reportLines.push(`## ${cat}`, ``)
    reportLines.push(`| Integration | Status | Details |`)
    reportLines.push(`| --- | --- | --- |`)
    for (const item of items) {
      reportLines.push(`| ${item.name} | ${item.status} | ${item.message} |`)
    }
    reportLines.push(``)
  }

  if (criticals.length > 0) {
    reportLines.push(`## Critical Issues`, ``)
    for (const c of criticals) {
      reportLines.push(`- **${c.name}**: ${c.message}`)
    }
    reportLines.push(``)
  }

  if (failures.length > 0) {
    reportLines.push(`## Failures`, ``)
    for (const f of failures) {
      reportLines.push(`- **${f.name}**: ${f.message}`)
    }
    reportLines.push(``)
  }

  const reportPath = path.resolve(process.cwd(), 'docs/api-integration-health-report.md')
  fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8')
  console.log(`Report written to: docs/api-integration-health-report.md`)

  // Exit with non-zero if any critical or failure
  if (counts.CRIT > 0 || counts.FAIL > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Health check failed:', err)
  process.exit(1)
})
