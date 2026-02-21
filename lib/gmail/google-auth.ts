// Re-export shim — the canonical implementation lives in lib/google/auth.ts
// Kept here for import compatibility with pages that use @/lib/gmail/google-auth
export {
  getGoogleConnection,
  initiateGoogleConnect,
  disconnectGoogle,
  getGoogleAccessToken,
} from '@/lib/google/auth'
