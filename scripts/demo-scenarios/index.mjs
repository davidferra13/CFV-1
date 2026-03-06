/**
 * Demo Video Scenario Registry
 *
 * Each scenario exports: { title, auth, run(recorder, page) }
 *   - title: Display name for the video
 *   - auth: 'chef' | 'client' | 'partner' | 'staff' | null (public)
 *   - run: async function that drives the demo using the recorder
 */

export { default as pubLanding } from './pub-landing.mjs'
export { default as chefCommandCenter } from './chef-command-center.mjs'
export { default as chefFullLifecycle } from './chef-full-lifecycle.mjs'

// Re-export as flat ID map for the CLI
import pubLanding from './pub-landing.mjs'
import chefCommandCenter from './chef-command-center.mjs'
import chefFullLifecycle from './chef-full-lifecycle.mjs'

export const SCENARIOS = {
  'pub-landing': pubLanding,
  'chef-command-center': chefCommandCenter,
  'chef-full-lifecycle': chefFullLifecycle,
}
