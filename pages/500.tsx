// Minimal 500 error page for Next.js static export compatibility
// The App Router handles errors via app/error.tsx; this file satisfies
// Next.js 14 build requirements for the server/pages/500.html file.

export default function Custom500() {
  return <div>500 - Server Error</div>
}