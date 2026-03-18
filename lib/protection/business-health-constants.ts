// Business Health Checklist - static constants
// Exported from a separate file (no 'use server') so they can be imported
// by both server actions and client components without restriction.

export const HEALTH_ITEM_KEYS = [
  'LLC_FORMED',
  'SEPARATE_BANK',
  'GENERAL_LIABILITY_INS',
  'FOOD_HANDLER_CERT',
  'SERVSAFE_CERT',
  'ATTORNEY_REVIEWED_CONTRACT',
  'FINANCES_SEPARATED',
  'BACKUP_CHEF_CONTACT',
  'EMERGENCY_CONTACT_DOCUMENTED',
  'PHOTO_PERMISSION_POLICY',
  'DISABILITY_INSURANCE',
  'BUSINESS_CONTINUITY_PLAN',
  'CERTIFICATIONS_CURRENT',
] as const

export type HealthItemKey = (typeof HEALTH_ITEM_KEYS)[number]

export const HEALTH_ITEM_LABELS: Record<HealthItemKey, string> = {
  LLC_FORMED: 'LLC or Business Entity Formed',
  SEPARATE_BANK: 'Separate Business Bank Account',
  GENERAL_LIABILITY_INS: 'General Liability Insurance',
  FOOD_HANDLER_CERT: 'Food Handler Certification',
  SERVSAFE_CERT: 'ServSafe Certification',
  ATTORNEY_REVIEWED_CONTRACT: 'Attorney-Reviewed Client Contract',
  FINANCES_SEPARATED: 'Personal & Business Finances Separated',
  BACKUP_CHEF_CONTACT: 'Backup Chef Contact on File',
  EMERGENCY_CONTACT_DOCUMENTED: 'Emergency Contact Documented',
  PHOTO_PERMISSION_POLICY: 'Photo Permission Policy in Place',
  DISABILITY_INSURANCE: 'Disability Insurance',
  BUSINESS_CONTINUITY_PLAN: 'Business Continuity Plan Written',
  CERTIFICATIONS_CURRENT: 'All Certifications Current & Renewed',
}

export const HEALTH_ITEM_WHY: Record<HealthItemKey, string> = {
  LLC_FORMED:
    'Separates personal liability from business risk. Without an LLC, your personal assets can be seized if a client sues.',
  SEPARATE_BANK:
    'Mixing personal and business funds creates tax headaches, legal exposure, and makes audits nearly impossible to survive cleanly.',
  GENERAL_LIABILITY_INS:
    'Covers property damage and guest injury during events. Most venues require proof of GL before allowing private chefs on-site.',
  FOOD_HANDLER_CERT:
    'Required by law in most jurisdictions for anyone handling food commercially. Keeps you legally compliant and shows professionalism.',
  SERVSAFE_CERT:
    'The industry-standard food safety certification. Many clients and venues specifically ask for ServSafe-certified chefs.',
  ATTORNEY_REVIEWED_CONTRACT:
    'A DIY contract may miss critical clauses (indemnification, cancellation, payment terms). One bad event without a solid contract can cost you everything.',
  FINANCES_SEPARATED:
    'Even without a formal LLC, keeping finances separate protects you at tax time and demonstrates professional operations.',
  BACKUP_CHEF_CONTACT:
    "You cannot work sick. A backup chef contact means an event is covered even when you're unable to perform. It's a professional obligation to clients.",
  EMERGENCY_CONTACT_DOCUMENTED:
    'If you are incapacitated during an event, someone needs to know who to call and what to do next.',
  PHOTO_PERMISSION_POLICY:
    'Protects high-profile clients from unwanted exposure and protects you from permission disputes when marketing your work.',
  DISABILITY_INSURANCE:
    'If you cannot cook, you cannot earn. Disability insurance is the single most-overlooked protection for self-employed chefs.',
  BUSINESS_CONTINUITY_PLAN:
    'What happens if you get sick for 6 months? Who handles clients, refunds, and communications? A written plan prevents chaos.',
  CERTIFICATIONS_CURRENT:
    'Expired certifications are a liability. Renewing on time keeps you legally protected and professionally credible.',
}
