'use client'

import { Component, type ReactNode } from 'react'
import { AlertCircle } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

interface WidgetErrorBoundaryProps {
  children: ReactNode
  /** Widget name shown in the error state (e.g., "Revenue Summary") */
  name?: string
  /** Compact mode for small widgets (single line) */
  compact?: boolean
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface WidgetErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * WidgetErrorBoundary - granular error boundary for dashboard widgets,
 * panel sections, and async-loaded components.
 *
 * Unlike the full-page ErrorBoundary, this renders an inline error state
 * with a retry button, keeping the rest of the page functional.
 *
 * Usage:
 *   <WidgetErrorBoundary name="Revenue Chart">
 *     <RevenueChartWidget />
 *   </WidgetErrorBoundary>
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const label = this.props.name || 'Widget'
    console.error(`[WidgetErrorBoundary:${label}] Caught render error:`, error.message)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const { name, compact } = this.props

    if (compact) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-red-800/30 bg-red-950/20 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{name ? `${name} failed to load` : 'Failed to load'}</span>
          <button
            onClick={this.handleRetry}
            className="ml-auto text-red-300 underline hover:text-red-200"
          >
            Retry
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-800/30 bg-red-950/10 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <div>
          <p className="text-sm font-medium text-red-300">
            {name ? `${name} failed to load` : 'Something went wrong'}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            This section encountered an error. The rest of the page is unaffected.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={this.handleRetry}>
          Try again
        </Button>
      </div>
    )
  }
}
