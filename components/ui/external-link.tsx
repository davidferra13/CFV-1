import { AnchorHTMLAttributes, forwardRef } from 'react'

const ExternalLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ children, ...props }, ref) => (
    <a ref={ref} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  )
)
ExternalLink.displayName = 'ExternalLink'

export { ExternalLink }
