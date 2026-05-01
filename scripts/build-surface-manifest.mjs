import { access } from 'node:fs/promises'
import { join } from 'node:path'

export const BUILD_SURFACE_INCLUDE_KINDS = {
  APP_ENTRY: 'app-entry',
  API_TREE: 'api-tree',
  PAGE_TREE: 'page-tree',
  SUPPORT_FILE: 'support-file',
}

const WEB_BETA_RELEASE_ENV = Object.freeze({
  NEXT_BUILD_SURFACE: 'web-beta',
  NEXT_PUBLIC_MARKETING_MODE: 'beta',
  NEXT_PUBLIC_RELEASE_PROFILE: 'web-beta',
})

const WEB_BETA_INCLUDE = Object.freeze([
  { path: 'app/layout.tsx', kind: BUILD_SURFACE_INCLUDE_KINDS.SUPPORT_FILE },
  { path: 'app/globals.css', kind: BUILD_SURFACE_INCLUDE_KINDS.SUPPORT_FILE },
  { path: 'app/not-found.tsx', kind: BUILD_SURFACE_INCLUDE_KINDS.SUPPORT_FILE },
  { path: 'app/(public)', kind: BUILD_SURFACE_INCLUDE_KINDS.PAGE_TREE },
  { path: 'app/api/health', kind: BUILD_SURFACE_INCLUDE_KINDS.API_TREE },
  { path: 'app/auth/layout.tsx', kind: BUILD_SURFACE_INCLUDE_KINDS.SUPPORT_FILE },
  { path: 'app/auth/callback', kind: BUILD_SURFACE_INCLUDE_KINDS.APP_ENTRY },
  { path: 'app/auth/signin', kind: BUILD_SURFACE_INCLUDE_KINDS.PAGE_TREE },
  { path: 'app/auth/forgot-password', kind: BUILD_SURFACE_INCLUDE_KINDS.PAGE_TREE },
  { path: 'app/auth/reset-password', kind: BUILD_SURFACE_INCLUDE_KINDS.PAGE_TREE },
  { path: 'app/auth/role-selection', kind: BUILD_SURFACE_INCLUDE_KINDS.PAGE_TREE },
  { path: 'app/(chef)/onboarding', kind: BUILD_SURFACE_INCLUDE_KINDS.PAGE_TREE },
  { path: 'app/(client)/my-profile', kind: BUILD_SURFACE_INCLUDE_KINDS.PAGE_TREE },
  { path: 'app/unauthorized', kind: BUILD_SURFACE_INCLUDE_KINDS.PAGE_TREE },
])

const WEB_BETA_EXPECTED_PAGE_ROUTES = Object.freeze([
  '/',
  '/beta',
  '/pricing',
  '/auth/signin',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/role-selection',
  '/onboarding',
  '/my-profile',
  '/unauthorized',
])

const WEB_BETA_EXPECTED_API_ROUTES = Object.freeze(['/api/health', '/api/health/readiness'])

export const BUILD_SURFACE_MANIFESTS = {
  'web-beta': {
    description:
      'Hosted beta surface: public marketing, health endpoints, auth recovery, onboarding, and client profile routes.',
    include: WEB_BETA_INCLUDE,
    expectedPageRoutes: WEB_BETA_EXPECTED_PAGE_ROUTES,
    expectedApiRoutes: WEB_BETA_EXPECTED_API_ROUTES,
    releaseProfile: {
      id: 'web-beta',
      verifyScript: 'verify:release:web-beta',
      typecheckScript: 'typecheck:web-beta',
      lintScript: 'lint:web-beta',
      unitTestScript: 'test:unit:web-beta',
      e2eScript: 'test:e2e:web-beta:release',
      buildStepName: 'build:web-beta',
      playwrightConfigPath: 'playwright.web-beta-release.config.ts',
      requiredEnv: WEB_BETA_RELEASE_ENV,
    },
  },
}

function inferIncludeKind(relativePath) {
  if (relativePath.startsWith('app/api/')) {
    return BUILD_SURFACE_INCLUDE_KINDS.API_TREE
  }
  if (/\.[^/]+$/.test(relativePath)) {
    return BUILD_SURFACE_INCLUDE_KINDS.SUPPORT_FILE
  }
  return BUILD_SURFACE_INCLUDE_KINDS.PAGE_TREE
}

function normalizeIncludeEntry(entry) {
  if (typeof entry === 'string') {
    return {
      path: entry,
      kind: inferIncludeKind(entry),
    }
  }

  return {
    path: entry.path,
    kind: entry.kind || inferIncludeKind(entry.path),
  }
}

function resolveManifestInput(surfaceNameOrManifest) {
  if (!surfaceNameOrManifest) {
    return null
  }

  if (typeof surfaceNameOrManifest === 'string') {
    return resolveBuildSurfaceManifest(surfaceNameOrManifest)
  }

  return surfaceNameOrManifest
}

async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

export function getBuildSurfaceIncludeEntries(surfaceNameOrManifest) {
  const manifest = resolveManifestInput(surfaceNameOrManifest)
  if (!manifest) {
    return []
  }

  return manifest.include.map(normalizeIncludeEntry)
}

export function getBuildSurfaceIncludePaths(surfaceNameOrManifest) {
  return getBuildSurfaceIncludeEntries(surfaceNameOrManifest).map((entry) => entry.path)
}

export function getBuildSurfaceRequiredOverlayPaths(surfaceNameOrManifest) {
  const manifest = resolveManifestInput(surfaceNameOrManifest)
  return manifest?.requiredOverlayPaths ? [...manifest.requiredOverlayPaths] : []
}

export async function validateBuildSurfaceFilesystem(rootDir, surfaceName) {
  const manifest = resolveBuildSurfaceManifest(surfaceName)
  if (!manifest) {
    return null
  }

  const missingIncludePaths = []
  for (const includePath of getBuildSurfaceIncludePaths(manifest)) {
    if (!(await pathExists(join(rootDir, includePath)))) {
      missingIncludePaths.push(includePath)
    }
  }

  const missingOverlayPaths = []
  const overlayAppDir = manifest.overlayAppDir ? join(rootDir, manifest.overlayAppDir) : null
  const overlayExists = overlayAppDir ? await pathExists(overlayAppDir) : true

  if (manifest.overlayAppDir && !overlayExists) {
    missingOverlayPaths.push(manifest.overlayAppDir)
  }

  if (overlayExists) {
    for (const overlayPath of getBuildSurfaceRequiredOverlayPaths(manifest)) {
      if (!(await pathExists(join(rootDir, overlayPath)))) {
        missingOverlayPaths.push(overlayPath)
      }
    }
  }

  return {
    ok: missingIncludePaths.length === 0 && missingOverlayPaths.length === 0,
    missingIncludePaths,
    missingOverlayPaths,
    surfaceName,
  }
}

export function resolveBuildSurfaceManifest(surfaceName) {
  if (!surfaceName) {
    return null
  }

  return BUILD_SURFACE_MANIFESTS[surfaceName] ?? null
}
