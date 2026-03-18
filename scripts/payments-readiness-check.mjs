#!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

function normalize(raw) {
  return String(raw || '').trim().toLowerCase()
}

function isProductionLike(env) {
  const explicit = normalize(env.NEXT_PUBLIC_APP_ENV || env.APP_ENV)
  const nodeEnv = normalize(env.NODE_ENV)
  const value = explicit || nodeEnv
  return value.includes('prod')
}

function isLoopbackUrl(value) {
  const normalized = normalize(value)
  return (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('0.0.0.0')
  )
}

function stripeKeyMode(key, livePrefix, testPrefix) {
  if (!key) return 'missing'
  if (key.startsWith(livePrefix)) return 'live'
  if (key.startsWith(testPrefix)) return 'test'
  return 'unknown'
}

function printSection(title) {
  console.log(`\n=== ${title} ===`)
}

async function main() {
  const env = process.env
  const errors = []
  const warnings = []

  const productionLike = isProductionLike(env)
  const secretMode = stripeKeyMode(env.STRIPE_SECRET_KEY, 'sk_live_', 'sk_test_')
  const publishableMode = stripeKeyMode(
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'pk_live_',
    'pk_test_'
  )

  printSection('Environment')
  console.log(`Environment mode: ${productionLike ? 'production-like' : 'non-production'}`)
  console.log(`Stripe secret key mode: ${secretMode}`)
  console.log(`Stripe publishable key mode: ${publishableMode}`)

  if (productionLike) {
    if (env.DEMO_MODE_ENABLED === 'true') {
      errors.push('DEMO_MODE_ENABLED=true in production-like mode')
    }
    if (isLoopbackUrl(env.NEXT_PUBLIC_SITE_URL)) {
      errors.push('NEXT_PUBLIC_SITE_URL points to localhost/loopback')
    }
    if (isLoopbackUrl(env.NEXT_PUBLIC_APP_URL)) {
      errors.push('NEXT_PUBLIC_APP_URL points to localhost/loopback')
    }
    if (secretMode !== 'live') {
      errors.push('STRIPE_SECRET_KEY is not a live key')
    }
    if (publishableMode !== 'live') {
      errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not a live key')
    }
  }

  if (
    secretMode !== 'missing' &&
    publishableMode !== 'missing' &&
    secretMode !== 'unknown' &&
    publishableMode !== 'unknown' &&
    secretMode !== publishableMode
  ) {
    errors.push('Stripe secret/publishable key mode mismatch')
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET missing')
  } else if (!env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
    warnings.push('STRIPE_WEBHOOK_SECRET does not use whsec_ prefix')
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY
  const platformOwnerChefId = env.PLATFORM_OWNER_CHEF_ID

  if (!supabaseUrl || !serviceRole) {
    errors.push('Supabase credentials missing for DB readiness checks')
  }

  if (!platformOwnerChefId) {
    warnings.push('PLATFORM_OWNER_CHEF_ID is missing; skipping platform chef checks')
  }

  if (supabaseUrl && serviceRole) {
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    if (platformOwnerChefId) {
      printSection('Platform Chef Connect')
      const { data: chef, error: chefError } = await supabase
        .from('chefs')
        .select('id,business_name,stripe_account_id,stripe_onboarding_complete')
        .eq('id', platformOwnerChefId)
        .single()

      if (chefError || !chef) {
        errors.push(`Could not load platform chef (${platformOwnerChefId})`)
      } else {
        console.log(`Chef: ${chef.business_name || chef.id}`)
        console.log(`Has Stripe account: ${chef.stripe_account_id ? 'yes' : 'no'}`)
        console.log(
          `Connect onboarding complete: ${chef.stripe_onboarding_complete === true ? 'yes' : 'no'}`
        )

        if (!chef.stripe_account_id) {
          errors.push('Platform owner chef has no stripe_account_id')
        }
        if (chef.stripe_onboarding_complete !== true) {
          errors.push('Platform owner chef Stripe onboarding is incomplete')
        }
      }
    }

    printSection('Stripe Webhook Health (24h)')
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: hooks, error: hooksError } = await supabase
      .from('webhook_events')
      .select('status,received_at,event_type,provider_event_id,error_text')
      .eq('provider', 'stripe')
      .gte('received_at', sinceIso)
      .order('received_at', { ascending: false })

    if (hooksError) {
      warnings.push(`Could not query webhook_events: ${hooksError.message}`)
    } else {
      const recent = hooks || []
      const counts = recent.reduce(
        (acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + 1
          return acc
        },
        { received: 0, processed: 0, failed: 0, skipped: 0 }
      )

      console.log(`Total stripe webhooks (24h): ${recent.length}`)
      console.log(
        `Statuses: processed=${counts.processed}, failed=${counts.failed}, skipped=${counts.skipped}, received=${counts.received}`
      )

      if (recent.length === 0) {
        warnings.push('No Stripe webhook events observed in the last 24h')
      }
      if (counts.failed > 0) {
        errors.push(`Stripe webhook failures detected in last 24h: ${counts.failed}`)
      }
    }
  }

  printSection('Summary')
  if (warnings.length > 0) {
    console.log('Warnings:')
    warnings.forEach((w) => console.log(`- ${w}`))
  } else {
    console.log('Warnings: none')
  }

  if (errors.length > 0) {
    console.log('Errors:')
    errors.forEach((e) => console.log(`- ${e}`))
    console.log('\nResult: FAIL')
    process.exit(1)
  }

  console.log('Errors: none')
  console.log('\nResult: PASS')
}

main().catch((error) => {
  console.error('payments-readiness-check failed:', error)
  process.exit(1)
})

