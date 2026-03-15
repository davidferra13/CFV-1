'use client'

// ErrorBoundary - React error boundary for catching render-time crashes.
//
// Server components that crash propagate to the nearest error.tsx or the
// root error page. But client components that crash during render (e.g.,
// accessing .map() on undefined) need a React error boundary to catch them.
//
// Usage:
//   <ErrorBoundary fallback={<ErrorState title="Section failed to load" />}>
//     <SomeClientComponent />
//   </ErrorBoundary>
//
// Usage (with retry):
//   <ErrorBoundary
//     fallback={(reset) => (
//       <ErrorState title="Something went wrong" onRetry={reset} />
//     )}
//   >
//     <SomeClientComponent />
//   </ErrorBoundary>

import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  /** Static fallback or render function that receives a reset callback */
  fallback: ReactNode | ((reset: () => void) => ReactNode)
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught render error:', error.message)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props
      if (typeof fallback === 'function') {
        return fallback(this.handleReset)
      }
      return fallback
    }

    return this.props.children
  }
}
