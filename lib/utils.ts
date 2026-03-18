// Utility functions - shared across components
import { clsx, type ClassValue } from 'clsx'

/** Merge class names, filtering falsy values. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
