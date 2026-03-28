'use client'

// SuccessCheck - Animated green checkmark that appears briefly after successful actions.
// Shows a circle + checkmark that draws in and fades out.
//
// Usage:
//   const [showSuccess, setShowSuccess] = useState(false)
//   // After save:
//   setShowSuccess(true)
//   setTimeout(() => setShowSuccess(false), 2000)
//   {showSuccess && <SuccessCheck />}
//
// Or inline on a row/card:
//   <div className={saved ? 'success-flash' : ''}>...</div>

interface SuccessCheckProps {
  /** Size in pixels */
  size?: number
  /** Additional classes */
  className?: string
}

export function SuccessCheck({ size = 32, className = '' }: SuccessCheckProps) {
  return (
    <div className={`success-check inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#10b981"
          strokeWidth="2"
          fill="#10b981"
          fillOpacity="0.1"
        />
        <path
          className="success-check-path"
          d="M7 12.5l3 3 7-7"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  )
}
