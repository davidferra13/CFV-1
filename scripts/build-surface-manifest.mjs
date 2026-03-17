export const BUILD_SURFACE_MANIFESTS = {
  'web-beta': {
    description:
      'Hosted beta surface: public marketing, health endpoints, auth recovery, and minimal onboarding/profile routes.',
    include: [
      'app/layout.tsx',
      'app/globals.css',
      'app/not-found.tsx',
      'app/(public)',
      'app/api/health',
      'app/auth/layout.tsx',
      'app/auth/callback',
      'app/auth/forgot-password',
      'app/auth/reset-password',
      'app/auth/role-selection',
      'app/(chef)/onboarding',
      'app/(client)/my-profile',
      'app/unauthorized',
    ],
    overlayAppDir: 'build-surfaces/web-beta/app',
  },
}

export function resolveBuildSurfaceManifest(surfaceName) {
  if (!surfaceName) {
    return null
  }

  return BUILD_SURFACE_MANIFESTS[surfaceName] ?? null
}
