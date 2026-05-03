// Trial Banner - Server Component
// Fetches subscription status for the current chef and renders a soft warning
// banner when the trial is expiring (≤3 days) or has expired.
// Renders nothing for: grandfathered chefs, active subscribers, comped chefs,
// VIP/Admin/Owner users, and trials with more than 3 days remaining.
// Never crashes the layout - errors are swallowed.

// Trial Banner - Server Component
// All features are currently free (universal access), so the trial banner
// never renders. Kept as a no-op so layout imports don't break.
// Restore real logic if/when paid tiers are re-introduced.

export async function TrialBanner({ chefId: _chefId }: { chefId: string }) {
  return null
}
