#!/usr/bin/env tsx
// Route Verification Script - Checks that all expected routes exist

import { existsSync } from 'fs'
import { join } from 'path'

interface RouteCheck {
  path: string
  description: string
}

const routes: RouteCheck[] = [
  // Public Routes
  { path: 'app/(public)/page.tsx', description: 'Landing Page' },
  { path: 'app/(public)/pricing/page.tsx', description: 'Pricing Page' },
  { path: 'app/(public)/contact/page.tsx', description: 'Contact Page' },
  { path: 'app/(public)/privacy/page.tsx', description: 'Privacy Policy' },
  { path: 'app/(public)/terms/page.tsx', description: 'Terms of Service' },

  // Auth Routes
  { path: 'app/auth/signin/page.tsx', description: 'Sign In Page' },
  { path: 'app/auth/signup/page.tsx', description: 'Sign Up Page' },

  // Chef Portal Routes
  { path: 'app/(chef)/dashboard/page.tsx', description: 'Chef Dashboard' },
  { path: 'app/(chef)/events/page.tsx', description: 'Chef Events List' },
  { path: 'app/(chef)/events/new/page.tsx', description: 'Chef Create Event' },
  { path: 'app/(chef)/events/[id]/page.tsx', description: 'Chef Event Detail' },
  { path: 'app/(chef)/events/[id]/edit/page.tsx', description: 'Chef Edit Event' },
  { path: 'app/(chef)/clients/page.tsx', description: 'Chef Clients List' },
  { path: 'app/(chef)/clients/[id]/page.tsx', description: 'Chef Client Detail' },
  { path: 'app/(chef)/menus/page.tsx', description: 'Chef Menus List' },
  { path: 'app/(chef)/menus/new/page.tsx', description: 'Chef Create Menu' },
  { path: 'app/(chef)/menus/[id]/page.tsx', description: 'Chef Menu Detail' },
  { path: 'app/(chef)/financials/page.tsx', description: 'Chef Financials' },

  // Client Portal Routes
  { path: 'app/(client)/my-events/page.tsx', description: 'Client Events List' },
  { path: 'app/(client)/my-events/[id]/page.tsx', description: 'Client Event Detail' },
  { path: 'app/(client)/my-events/[id]/pay/page.tsx', description: 'Client Payment Page' },

  // Error Pages
  { path: 'app/not-found.tsx', description: '404 Page' },
  { path: 'app/error.tsx', description: 'Error Boundary' },
  { path: 'app/unauthorized/page.tsx', description: 'Unauthorized Page' },

  // Loading Pages
  { path: 'app/(chef)/loading.tsx', description: 'Chef Loading' },
  { path: 'app/(client)/loading.tsx', description: 'Client Loading' },
  { path: 'app/(public)/loading.tsx', description: 'Public Loading' },

  // Layouts
  { path: 'app/layout.tsx', description: 'Root Layout' },
  { path: 'app/(chef)/layout.tsx', description: 'Chef Layout' },
  { path: 'app/(client)/layout.tsx', description: 'Client Layout' },
  { path: 'app/(public)/layout.tsx', description: 'Public Layout' },

  // Navigation Components
  { path: 'components/navigation/chef-nav.tsx', description: 'Chef Navigation' },
  { path: 'components/navigation/client-nav.tsx', description: 'Client Navigation' },
  { path: 'components/navigation/public-header.tsx', description: 'Public Header' },
  { path: 'components/navigation/public-footer.tsx', description: 'Public Footer' },
]

function checkRoute(route: RouteCheck): boolean {
  const fullPath = join(process.cwd(), route.path)
  const exists = existsSync(fullPath)
  
  if (exists) {
    console.log(`✓ ${route.description.padEnd(30)} ${route.path}`)
  } else {
    console.log(`✗ ${route.description.padEnd(30)} ${route.path}`)
  }
  
  return exists
}

function main() {
  console.log('ChefFlow V1 - Route Verification\n')
  console.log('='.repeat(80))
  console.log()

  const results = routes.map(checkRoute)
  const passed = results.filter(r => r).length
  const failed = results.filter(r => !r).length

  console.log()
  console.log('='.repeat(80))
  console.log()
  console.log(`Total Routes: ${routes.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log()

  if (failed > 0) {
    console.log('⚠️  Some routes are missing. Please create the missing files.')
    process.exit(1)
  } else {
    console.log('✅ All routes exist!')
    process.exit(0)
  }
}

main()
