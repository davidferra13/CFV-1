export const CHEF_PARTNER_AGREEMENT_VERSION = '2026-09-24-v1'
export const CHEF_PARTNER_SAMPLE_COMMISSION_BPS = 1500

export const CHEF_PARTNER_PRINCIPLES = [
  'No subscription and no exclusivity.',
  'The chef keeps clients and leads the chef already had.',
  'The chef controls pricing, availability, menu, service methods, and whether to accept a job.',
  'ChefFlow earns a commission only on qualifying ChefFlow-originated bookings processed through ChefFlow.',
  'Direct bookings outside ChefFlow are not charged merely because the parties first met through ChefFlow.',
  'Unknown or disputed attribution is frozen for review instead of auto-charged.',
] as const

export const CHEF_PARTNER_AGREEMENT_SECTIONS = [
  {
    title: '1. Relationship and scope',
    body: 'The chef operates an independent culinary business. ChefFlow may source, qualify, coordinate, and process private-chef booking opportunities. This agreement is non-exclusive and does not require a subscription or minimum volume.',
  },
  {
    title: '2. Chef control',
    body: 'The chef controls availability, service area, pricing, menu design, culinary methods, staffing, and acceptance or rejection of each opportunity. ChefFlow does not guarantee booking volume and the chef is not required to accept any booking.',
  },
  {
    title: '3. Existing-client protection',
    body: 'A client, household, company, planner, or referral relationship that the chef can reasonably show existed before ChefFlow first introduced the opportunity remains chef-owned. ChefFlow does not earn a booking commission merely because that client later appears in ChefFlow.',
  },
  {
    title: '4. Booking attribution',
    body: 'Each opportunity receives an attribution record containing first-touch evidence, source ownership, booking route, relationship type, decision reason, agreement version, and the commission snapshot. ChefFlow-originated means ChefFlow generated the demand before the chef had a documented relationship with that client for the opportunity.',
  },
  {
    title: '5. When commission is earned',
    body: 'Commission is earned only when an accepted partner agreement is active, ChefFlow originated the booking, and that booking is processed through ChefFlow. The applicable rate is the rate shown in the chef-specific signed schedule before the booking is accepted.',
  },
  {
    title: '6. Commission basis',
    body: 'Unless a signed schedule states otherwise, commission is calculated on the service subtotal after refunded service amounts. Sales tax, gratuity, refundable deposits, and separately itemized pass-through reimbursements are excluded from the commission basis.',
  },
  {
    title: '7. Rebooks and referrals',
    body: 'There is no perpetual commission tail. A later direct booking between the chef and client outside ChefFlow is not commissionable merely because ChefFlow made the original introduction. A later booking is commissionable only when that later booking independently qualifies under the active attribution rules and is processed through ChefFlow.',
  },
  {
    title: '8. Attribution disputes',
    body: 'If source ownership is unknown or disputed, no commission is automatically charged while the dispute is open. Evidence may include timestamped messages, CRM history, prior invoices, referral records, inquiry metadata, or other reliable records. Corrections must preserve an audit trail.',
  },
  {
    title: '9. Payments, refunds, and chargebacks',
    body: 'Booking-specific payment timing, deposits, cancellations, refunds, chargebacks, processing fees, and payout timing must be shown to the chef before acceptance. Refunded service revenue reduces the commission basis. ChefFlow will not take commission on gratuity.',
  },
  {
    title: '10. Professional responsibility',
    body: 'The chef remains responsible for licenses, permits, insurance, taxes, food safety, allergen controls, staffing, and lawful performance of the culinary service as required in the chef jurisdiction. Nothing in this agreement changes obligations imposed by applicable law.',
  },
  {
    title: '11. Data, brand, and publicity',
    body: 'ChefFlow may use booking data only as needed to operate, secure, support, reconcile, and improve the service under the applicable privacy terms. Chef-owned client lists are not transferred to other chefs. Public use of chef photos, name, menus, or endorsements requires the permissions stated during onboarding.',
  },
  {
    title: '12. Term and termination',
    body: 'Either party may stop accepting new opportunities or terminate the relationship subject to already accepted bookings and amounts properly earned before termination. Termination does not create a new commission claim on chef-owned or later direct business.',
  },
  {
    title: '13. Signed schedule controls',
    body: 'The signed chef-specific schedule records the legal business name, service territory, commission rate, effective date, payout method, cancellation terms, required credentials, and any negotiated exceptions. If that schedule conflicts with generic public copy, the signed schedule controls.',
  },
] as const
