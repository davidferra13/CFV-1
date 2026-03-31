// SectionDivider - Lightweight section headers that group content.
// Uses the .section-label CSS class from globals.css.

interface SectionDividerProps {
  /** Section label text */
  label: string
  /** Optional action rendered on the right side */
  action?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

export function SectionDivider({ label, action, className = '' }: SectionDividerProps) {
  return (
    <div className={`section-label ${className}`}>
      <span>{label}</span>
      {action && (
        <>
          <span className="flex-1" />
          <span className="normal-case tracking-normal font-normal">{action}</span>
        </>
      )}
    </div>
  )
}
