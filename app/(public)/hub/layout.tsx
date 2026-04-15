// Hub layout - no public nav/footer.
// All hub routes (/hub/g/*, /hub/join/*, /hub/me/*, etc.) render standalone
// without the marketing site chrome. Guests land here directly from invite links.

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
