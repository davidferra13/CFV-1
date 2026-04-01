import { redirect } from 'next/navigation'

// This route has been retired from chef-facing product surfaces.
// Raw source lead browsing is reserved for internal tooling only.
// Existing bookmarks and links are redirected to the main prospecting hub.
export default function OpenClawLeadsRedirectPage() {
  redirect('/prospecting')
}
