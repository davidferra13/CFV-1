// Compatibility shim for @sentry/nextjs runtime file discovery.
// The app uses instrumentation-client.ts for initialization.
import './instrumentation-client'

export { onRouterTransitionStart } from './instrumentation-client'
