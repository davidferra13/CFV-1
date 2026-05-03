// Re-export shim: cn() moved to lib/utils/cn.ts
// Existing imports of '@/lib/utils' resolve here (file beats directory).
// New code should import from '@/lib/utils/cn' or '@/lib/utils/index'.
export { cn } from './utils/cn'
