export const CANNABIS_HOST_AGREEMENT_VERSION = 'v1.0'

export const CANNABIS_HOST_AGREEMENT_INTRO =
  'Cannabis infusion is intentional, designated, and voluntary. No item is infused without explicit identification at the time of service.'

export const CANNABIS_HOST_AGREEMENT_SCOPE =
  'This portal supports structured adult-use cannabis dining events. Access to cannabis tools requires acknowledgment of the following:'

export const CANNABIS_HOST_AGREEMENT_SECTIONS = [
  {
    title: 'Host Responsibilities',
    bullets: [
      'The event is intended for adults 21 years of age or older.',
      'The Host is responsible for verifying the age of all attendees.',
      'The Host is responsible for the conduct of all guests.',
      'The Host obtains any cannabis products lawfully and supplies them directly for use during the event.',
      'The Chef does not sell, transfer, or provide cannabis.',
      'The Host confirms the event complies with applicable local and state law.',
      'Guests are responsible for their own transportation following the event.',
      'The Chef strongly recommends that guests avoid combining cannabis with alcohol during cannabis service.',
    ],
  },
  {
    title: 'Chef Legal Discretion & Compliance',
    bullets: [
      'The Chef provides culinary services at their sole discretion and only within applicable local, state, and federal law.',
      'The Chef may choose to offer or decline cannabis-related culinary structuring based on the event location, venue terms, licensing requirements, and legal permissibility.',
      'The Chef will not provide services in any jurisdiction, property, or circumstance that presents legal, regulatory, or contractual risk.',
      'The Host is solely responsible for securing a lawful venue and ensuring that property use (including rentals or third-party spaces) permits the planned activity.',
      'The Chef may refuse or discontinue service to any individual or event for any lawful reason, including safety, compliance, or professional judgment.',
    ],
  },
  {
    title: 'Voluntary Participation',
    bullets: [
      'Attendance does not require cannabis consumption.',
      'Guests may opt out at any time.',
      'Individual experiences vary.',
    ],
  },
  {
    title: 'Scope of Service',
    bullets: [
      'The Chef’s role is limited to the scheduled service period.',
      'The Chef’s compensation is for culinary service only.',
    ],
  },
] as const

export const CANNABIS_HOST_AGREEMENT_ACKNOWLEDGMENTS = [
  'I confirm I am 21 years of age or older.',
  'I have read and agree to the above terms.',
] as const

export function buildCannabisHostAgreementSnapshot(): string {
  const lines: string[] = [CANNABIS_HOST_AGREEMENT_INTRO, '', CANNABIS_HOST_AGREEMENT_SCOPE, '']

  CANNABIS_HOST_AGREEMENT_SECTIONS.forEach((section, sectionIndex) => {
    lines.push(`${sectionIndex + 1}. ${section.title}`, '')
    section.bullets.forEach((bullet) => lines.push(`• ${bullet}`))
    lines.push('')
  })

  lines.push('5. Acknowledgment', '')
  CANNABIS_HOST_AGREEMENT_ACKNOWLEDGMENTS.forEach((line) => lines.push(`☐ ${line}`))
  lines.push(
    '',
    'Signature',
    '',
    'Full Name (required field)',
    '',
    'Button:',
    '“Sign & Unlock Cannabis Portal”'
  )

  return lines.join('\n')
}

export const CANNABIS_HOST_AGREEMENT_TEXT_SNAPSHOT = buildCannabisHostAgreementSnapshot()
