'use client'

import { createContext, useContext, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { useStepWizard, type StepConfig, type StepKey } from '@/lib/shared/use-step-wizard'
import type { UseStepWizardReturn } from '@/lib/shared/use-step-wizard'

// ─── Context ────────────────────────────────────────────────────

type WizardContextValue<TData extends Record<string, unknown> = Record<string, unknown>> =
  UseStepWizardReturn<TData> & {
    /** Called by Step children to register themselves */
    _registerStep: (config: StepConfig<TData>) => void
  }

const WizardContext = createContext<WizardContextValue | null>(null)

function useWizardContext<TData extends Record<string, unknown>>() {
  const ctx = useContext(WizardContext) as WizardContextValue<TData> | null
  if (!ctx) throw new Error('StepWizard.Step must be used inside <StepWizard>')
  return ctx
}

// ─── Step child component ───────────────────────────────────────

type StepRenderProps<TData extends Record<string, unknown>> = {
  data: TData
  setData: (partial: Partial<TData>) => void
  next: () => Promise<boolean>
  prev: () => void
  isFirstStep: boolean
  isLastStep: boolean
  stepIndex: number
  totalSteps: number
}

type StepProps<TData extends Record<string, unknown>> = {
  /** Unique key for this step */
  stepKey: string
  /** Display title shown in the step indicator */
  title: string
  /** Validate before allowing forward navigation. Return true or error string. */
  validate?: (data: TData) => boolean | string
  /** Conditionally show/hide this step based on wizard data */
  visible?: (data: TData) => boolean
  /** Render prop for step content */
  children: (props: StepRenderProps<TData>) => ReactNode
}

function Step<TData extends Record<string, unknown>>(_props: StepProps<TData>) {
  // Rendering is handled by StepWizard; this component is declarative only.
  return null
}

// ─── Step Indicator ─────────────────────────────────────────────

function StepIndicator<TData extends Record<string, unknown>>() {
  const ctx = useWizardContext<TData>()
  const { visibleSteps, stepIndex, completedSteps, visitedSteps } = ctx

  return (
    <nav aria-label="Wizard progress" className="w-full">
      {/* Mobile: compact text indicator */}
      <div className="flex items-center justify-between sm:hidden px-1 mb-4">
        <span className="text-xs font-medium text-stone-300">
          Step {stepIndex + 1} of {visibleSteps.length}
        </span>
        <span className="text-xs text-stone-500 truncate ml-2">
          {visibleSteps[stepIndex]?.title}
        </span>
      </div>

      {/* Mobile: progress bar */}
      <div className="sm:hidden mb-4">
        <div className="h-1 rounded-full bg-stone-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300 ease-out"
            style={{ width: `${((stepIndex + 1) / visibleSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: numbered dots with connecting lines */}
      <div className="hidden sm:flex items-center justify-center gap-0 mb-6">
        {visibleSteps.map((step, i) => {
          const isActive = i === stepIndex
          const isDone = completedSteps.has(step.key)
          const isVisited = visitedSteps.has(step.key)

          return (
            <div key={step.key} className="flex items-center">
              {/* Dot */}
              <button
                type="button"
                onClick={() => isVisited && ctx.goTo(step.key)}
                disabled={!isVisited}
                className={cn(
                  'relative flex items-center justify-center rounded-full transition-all duration-200',
                  'w-8 h-8 text-xs font-semibold shrink-0',
                  isActive && 'bg-brand-500 text-white ring-2 ring-brand-500/30',
                  isDone && !isActive && 'bg-brand-500/20 text-brand-400',
                  !isActive && !isDone && isVisited && 'bg-stone-700 text-stone-300',
                  !isActive && !isDone && !isVisited && 'bg-stone-800 text-stone-500',
                  isVisited && 'cursor-pointer hover:ring-2 hover:ring-stone-600',
                  !isVisited && 'cursor-default'
                )}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${step.title}${isDone ? ' (completed)' : ''}`}
                title={step.title}
              >
                {isDone ? (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 8l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </button>

              {/* Connecting line */}
              {i < visibleSteps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-8 lg:w-12 transition-colors duration-200',
                    completedSteps.has(step.key) ? 'bg-brand-500/40' : 'bg-stone-700'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop: step title below dots */}
      <div className="hidden sm:block text-center mb-2">
        <h3 className="text-sm font-semibold text-stone-200">{visibleSteps[stepIndex]?.title}</h3>
      </div>
    </nav>
  )
}

// ─── Navigation Buttons ─────────────────────────────────────────

type NavigationProps = {
  /** Label for the final step's submit button. Default: "Complete" */
  completeLabel?: string
  /** Label for the next button. Default: "Continue" */
  nextLabel?: string
  /** Label for the back button. Default: "Back" */
  backLabel?: string
  /** Show a cancel/skip button */
  onCancel?: () => void
  cancelLabel?: string
  /** Extra content rendered between back and next buttons */
  children?: ReactNode
  /** Hide default nav entirely (for fully custom navigation) */
  hidden?: boolean
  /** Whether the next/complete action is in progress */
  loading?: boolean
  className?: string
}

function Navigation<TData extends Record<string, unknown>>({
  completeLabel = 'Complete',
  nextLabel = 'Continue',
  backLabel = 'Back',
  onCancel,
  cancelLabel = 'Cancel',
  children,
  hidden = false,
  loading = false,
  className,
}: NavigationProps) {
  const ctx = useWizardContext<TData>()

  if (hidden) return null

  return (
    <div className={cn('flex items-center justify-between gap-3 pt-4', className)}>
      <div className="flex items-center gap-2">
        {ctx.canGoPrev && (
          <button
            type="button"
            onClick={ctx.prev}
            disabled={loading}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              'text-stone-400 hover:text-stone-200 hover:bg-stone-800',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {backLabel}
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md px-3 py-2 text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            {cancelLabel}
          </button>
        )}
      </div>

      {children}

      <button
        type="button"
        onClick={ctx.next}
        disabled={loading}
        className={cn(
          'rounded-md px-5 py-2 text-sm font-medium transition-colors',
          'bg-brand-500 text-white hover:bg-brand-600',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="opacity-75"
              />
            </svg>
            Working...
          </span>
        ) : ctx.isLastStep ? (
          completeLabel
        ) : (
          nextLabel
        )}
      </button>
    </div>
  )
}

// ─── Main StepWizard component ──────────────────────────────────

type StepWizardProps<TData extends Record<string, unknown>> = {
  /** Called with final data when wizard completes */
  onComplete?: (data: TData) => void | Promise<void>
  /** Called on each step transition */
  onStepChange?: (stepKey: string, stepIndex: number) => void
  /** Called when user wants to save a draft */
  onSaveDraft?: (data: TData) => void | Promise<void>
  /** Initial data to populate the wizard */
  initialData?: TData
  /** Wizard children: StepWizard.Step, StepWizard.Indicator, StepWizard.Navigation */
  children: ReactNode
  className?: string
}

function StepWizardRoot<TData extends Record<string, unknown>>({
  onComplete,
  onStepChange,
  onSaveDraft: _onSaveDraft,
  initialData,
  children,
  className,
}: StepWizardProps<TData>) {
  // Extract Step configs from children. We use a ref to avoid
  // re-creating the steps array on every render (children identity
  // changes each render). We compare serialized keys+titles to
  // detect actual changes in the step list.
  const stepConfigsRef = useRef<StepConfig<TData>[]>([])
  const prevKeySignature = useRef('')

  const nextConfigs: StepConfig<TData>[] = []
  flattenChildren(children, (child) => {
    if (isStepElement<TData>(child)) {
      nextConfigs.push({
        key: child.props.stepKey,
        title: child.props.title,
        validate: child.props.validate,
        visible: child.props.visible,
      })
    }
  })

  const keySignature = nextConfigs.map((c) => c.key + ':' + c.title).join('|')
  if (keySignature !== prevKeySignature.current) {
    stepConfigsRef.current = nextConfigs
    prevKeySignature.current = keySignature
  }

  // Always use fresh validators/visible fns from current render
  for (let i = 0; i < stepConfigsRef.current.length; i++) {
    if (nextConfigs[i]) {
      stepConfigsRef.current[i].validate = nextConfigs[i].validate
      stepConfigsRef.current[i].visible = nextConfigs[i].visible
    }
  }

  const stepConfigs = stepConfigsRef.current

  const wizard = useStepWizard<TData>({
    steps: stepConfigs,
    initialData,
    onComplete,
    onStepChange,
  })

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle if no input/textarea/select is focused
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        wizard.next()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        wizard.prev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [wizard.next, wizard.prev])

  // Build render props for the active step
  const activeStepRenderProps: StepRenderProps<TData> = {
    data: wizard.data,
    setData: wizard.setData,
    next: wizard.next,
    prev: wizard.prev,
    isFirstStep: wizard.isFirstStep,
    isLastStep: wizard.isLastStep,
    stepIndex: wizard.stepIndex,
    totalSteps: wizard.totalSteps,
  }

  // Find the active Step child and render it
  const activeStepContent = findActiveStepContent<TData>(
    children,
    wizard.currentStep?.key,
    activeStepRenderProps
  )

  const noop = useCallback(() => {}, [])
  const contextValue: WizardContextValue<TData> = {
    ...wizard,
    _registerStep: noop as (config: StepConfig<TData>) => void,
  }

  return (
    <WizardContext.Provider value={contextValue as unknown as WizardContextValue}>
      <div className={cn('w-full', className)}>
        {renderNonStepChildren(children)}
        {/* Validation error */}
        {wizard.validationError && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-2 mb-4">
            <p className="text-sm text-red-400">{wizard.validationError}</p>
          </div>
        )}
        {/* Active step content */}
        <div role="tabpanel" aria-label={wizard.currentStep?.title}>
          {activeStepContent}
        </div>
      </div>
    </WizardContext.Provider>
  )
}

// ─── Helpers ────────────────────────────────────────────────────

/** Walk React children tree, calling fn for each ReactElement */
function flattenChildren(children: ReactNode, fn: (child: React.ReactElement) => void) {
  const childArray = Array.isArray(children) ? children : [children]
  for (const child of childArray) {
    if (!child || typeof child !== 'object') continue
    if (Array.isArray(child)) {
      flattenChildren(child, fn)
      continue
    }
    const el = child as React.ReactElement
    if (el.props) {
      fn(el)
    }
  }
}

/** Type guard for Step elements */
function isStepElement<TData extends Record<string, unknown>>(
  child: React.ReactElement
): child is React.ReactElement<StepProps<TData>> {
  return (child as any)?.type === Step
}

/** Find the active Step's render function and call it */
function findActiveStepContent<TData extends Record<string, unknown>>(
  children: ReactNode,
  activeKey: string | undefined,
  renderProps: StepRenderProps<TData>
): ReactNode {
  if (!activeKey) return null

  const childArray = Array.isArray(children) ? children : [children]
  for (const child of childArray) {
    if (!child || typeof child !== 'object') continue
    if (Array.isArray(child)) {
      const found = findActiveStepContent(child, activeKey, renderProps)
      if (found) return found
      continue
    }
    const el = child as React.ReactElement<StepProps<TData>>
    if (isStepElement<TData>(el) && el.props.stepKey === activeKey) {
      return el.props.children(renderProps)
    }
  }
  return null
}

/** Render all children that are NOT Step elements (Indicator, Navigation, etc.) */
function renderNonStepChildren(children: ReactNode): ReactNode[] {
  const result: ReactNode[] = []
  const childArray = Array.isArray(children) ? children : [children]
  for (const child of childArray) {
    if (!child || typeof child !== 'object') {
      result.push(child)
      continue
    }
    if (Array.isArray(child)) {
      result.push(...renderNonStepChildren(child))
      continue
    }
    const el = child as React.ReactElement
    if (!isStepElement(el)) {
      result.push(child)
    }
  }
  return result
}

// ─── Compound export ────────────────────────────────────────────

export const StepWizard = Object.assign(StepWizardRoot, {
  Step,
  Indicator: StepIndicator,
  Navigation,
})

export type { StepProps, StepRenderProps, StepWizardProps, NavigationProps }
