// Cannabis Portal — About Page
// The full story: task force, legislation, credentials, and what's coming.
// Every claim is source-linked. Every fact is verifiable. This is the receipts.

import { requireChef } from '@/lib/auth/get-user'
import { hasCannabisAccess } from '@/lib/chef/cannabis-actions'
import { redirect } from 'next/navigation'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import {
  AboutSection,
  AboutParagraph,
  AboutExternalLink,
  AboutHighlight,
  AboutMemberTable,
  AboutTimeline,
  AboutFeatureStatus,
  AboutLinkGroup,
} from '@/components/cannabis/about-sections'

export default async function CannabisAboutPage() {
  const user = await requireChef()
  const hasAccess = await hasCannabisAccess(user.id)
  if (!hasAccess) redirect('/dashboard')

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <CannabisPortalHeader
          title="About This Portal"
          subtitle="Why it exists, who built it, and what's coming"
          backHref="/cannabis"
          backLabel="Cannabis Hub"
        />

        {/* ─── Intro (always visible) ─── */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, #0a130a 0%, #0f1a0f 100%)',
            border: '1px solid rgba(74, 124, 78, 0.15)',
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: '#6aaa6e' }}>
            This portal was built by a member of Maine&rsquo;s Cannabis Hospitality Task Force
            &mdash; appointed by the state as an Expert on Cannabis Culinary Arts &mdash; and a
            private chef with over 15 years of experience who has spent the last decade perfecting
            cannabis dining. Everything below is the full story. Every claim links to a public
            source. Verify it yourself.
          </p>
        </div>

        {/* ─── Content Sections ─── */}
        <div className="space-y-3">
          {/* ── Section 1: The Background ── */}
          <AboutSection title="The Background" icon="🌿" defaultOpen>
            <AboutParagraph>
              Cannabis hospitality &mdash; licensed establishments where adults can consume cannabis
              on-site &mdash; is emerging as a regulated industry across the United States.
              Approximately a dozen states have pursued programs to allow some form of on-site
              consumption, including Alaska, Colorado, Illinois, Nevada, New Jersey, and New Mexico.
              Each state has taken a different approach to licensing, consumption methods, and
              public safety.
            </AboutParagraph>
            <AboutParagraph>
              Maine was one of the first states to formally study how to regulate cannabis
              hospitality through a dedicated task force. In 2024, the Maine Office of Cannabis
              Policy (OCP) convened a 15-member Cannabis Hospitality Task Force under{' '}
              <AboutHighlight>P.L. 2023, ch. 679</AboutHighlight>. The mandate: review how other
              states regulate cannabis hospitality establishments and draft policy recommendations
              for regulating them in Maine.
            </AboutParagraph>
            <AboutParagraph>
              The task force spent the summer of 2024 examining the national landscape, hearing from
              public health experts, municipal officials, cannabis industry leaders, and hospitality
              professionals. The result was a set of recommendations submitted to the Maine
              Legislature in January 2025 &mdash; and eventually, legislation that is still working
              through the legislative process today.
            </AboutParagraph>
            <div className="flex flex-wrap gap-3 pt-1">
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/stakeholders/hospitality-task-force">
                OCP Task Force Page
              </AboutExternalLink>
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/CHTF%20-%20Cannabis%20Hospitality%20National%20Footprint.pdf">
                National Footprint (PDF)
              </AboutExternalLink>
              <AboutExternalLink href="https://legislature.maine.gov/backend/App/services/getDocument.aspx?documentId=107388">
                P.L. 2023, ch. 679 (PDF)
              </AboutExternalLink>
            </div>
          </AboutSection>

          {/* ── Section 2: The Task Force ── */}
          <AboutSection title="The Task Force" icon="📋">
            <AboutParagraph>
              The Cannabis Hospitality Task Force was created by{' '}
              <AboutHighlight>P.L. 2023, ch. 679</AboutHighlight> and convened by Maine&rsquo;s
              Office of Cannabis Policy in 2024. The statute directed OCP to appoint members
              representing: cannabis policy expertise, cannabis culinary arts expertise, adult use
              cannabis consumer interests, municipal government interests, adult use cannabis
              licensee interests, the hospitality industry, public health, and a supporter of the
              2016 legalization ballot measure.
            </AboutParagraph>
            <AboutParagraph>
              Fifteen members were appointed. The full roster, as published by the Office of
              Cannabis Policy:
            </AboutParagraph>

            <AboutMemberTable
              members={[
                { name: 'Sam Tracy', organization: '—', seat: 'Expert on Cannabis Policy' },
                {
                  name: 'David Ferragamo',
                  organization: 'Private Chef',
                  seat: 'Expert on Cannabis Culinary Arts',
                },
                {
                  name: 'Pablo R. Barajas',
                  organization: 'Litty Bittys',
                  seat: 'Expert on Cannabis Culinary Arts',
                },
                {
                  name: 'Rose Mahoney',
                  organization: '—',
                  seat: 'Adult Use Cannabis Consumer Interest',
                },
                {
                  name: 'Steve Rusnack',
                  organization: 'Full Bloom Cannabis',
                  seat: 'Adult Use Cannabis Consumer Interest',
                },
                {
                  name: 'Chris Beaumont',
                  organization: 'City of Portland',
                  seat: 'Municipal Government Interest',
                },
                {
                  name: 'Jon Rioux',
                  organization: 'Town of Windham',
                  seat: 'Municipal Government Interest',
                },
                {
                  name: 'Natasha Johnson',
                  organization: 'Meristem',
                  seat: 'Adult Use Cannabis Licensee Interest',
                },
                {
                  name: 'Richelle Brossi',
                  organization: 'Highbrow',
                  seat: 'Adult Use Cannabis Licensee Interest',
                },
                {
                  name: 'Julie Cutting-Kelley',
                  organization: 'Emerald Elevation / Cure Restaurant',
                  seat: 'Hospitality Industry Interest',
                },
                {
                  name: 'Nate Cloutier',
                  organization: 'HospitalityMaine',
                  seat: 'Hospitality Industry Interest',
                },
                {
                  name: 'Anne Sedlack',
                  organization: 'Maine Medical Association',
                  seat: 'Public Health',
                },
                {
                  name: 'Jamie Comstock',
                  organization: 'Bangor Public Health',
                  seat: 'Public Health',
                },
                {
                  name: 'Jennifer Kelley-Young',
                  organization: 'City of Portland — Div. of Public Health',
                  seat: 'Public Health',
                },
                {
                  name: 'Heather Sullivan',
                  organization: 'Curaleaf',
                  seat: '2016 Legalization Ballot Measure Supporter',
                },
              ]}
            />

            <AboutParagraph>
              The task force met four times at the OCP offices in Augusta during the summer of 2024.
              All meetings were recorded and are publicly available.
            </AboutParagraph>

            <div
              className="rounded-lg p-3 space-y-2"
              style={{ background: '#0a130a', border: '1px solid rgba(74, 124, 78, 0.1)' }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#4a7c4e' }}
              >
                Meeting Schedule
              </p>
              {[
                { date: 'July 10, 2024', time: '1:00–4:00 p.m. EDT' },
                { date: 'July 24, 2024', time: '1:00–4:00 p.m. EDT' },
                { date: 'August 14, 2024', time: '1:00–4:00 p.m. EDT' },
                { date: 'August 28, 2024', time: '1:00–4:00 p.m. EDT' },
              ].map((m) => (
                <div key={m.date} className="flex items-center justify-between text-sm">
                  <span style={{ color: '#e8f5e9' }}>{m.date}</span>
                  <span className="text-xs" style={{ color: '#4a7c4e' }}>
                    {m.time}
                  </span>
                </div>
              ))}
            </div>

            <p
              className="text-xs font-semibold uppercase tracking-wider pt-2"
              style={{ color: '#4a7c4e' }}
            >
              Meeting Materials
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%201.pdf">
                Meeting 1 Agenda &amp; Materials
              </AboutExternalLink>
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%202.pdf">
                Meeting 2 Agenda &amp; Materials
              </AboutExternalLink>
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%203.pdf">
                Meeting 3 Agenda &amp; Materials
              </AboutExternalLink>
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%204.pdf">
                Meeting 4 Agenda &amp; Materials
              </AboutExternalLink>
            </div>

            <p
              className="text-xs font-semibold uppercase tracking-wider pt-2"
              style={{ color: '#4a7c4e' }}
            >
              Meeting Recordings
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <AboutExternalLink href="https://youtu.be/sDfvYLgstE8?t=35">
                Meeting 1 Recording
              </AboutExternalLink>
              <AboutExternalLink href="https://youtu.be/gSy3_oFjPd0">
                Meeting 2 Recording
              </AboutExternalLink>
              <AboutExternalLink href="https://youtu.be/qjldeoZ2AE0">
                Meeting 3 Recording
              </AboutExternalLink>
              <AboutExternalLink href="https://youtu.be/aJ_Pma7dzSQ">
                Meeting 4 Recording
              </AboutExternalLink>
              <AboutExternalLink href="https://www.youtube.com/playlist?list=PLdBrIirjKsezIN0zkfKawogPci7010WQY">
                Full YouTube Playlist
              </AboutExternalLink>
            </div>

            <p
              className="text-xs font-semibold uppercase tracking-wider pt-2"
              style={{ color: '#4a7c4e' }}
            >
              Additional Documents
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/CHTF%20Member%20Bios.pdf">
                Member Bios (PDF)
              </AboutExternalLink>
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/CHTF%20Midway%20Member%20Survey%20Results.pdf">
                Midway Survey Results (PDF)
              </AboutExternalLink>
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/CHTF%20-%20Cannabis%20Hospitality%20National%20Footprint.pdf">
                National Footprint (PDF)
              </AboutExternalLink>
            </div>
          </AboutSection>

          {/* ── Section 3: What the Task Force Recommended ── */}
          <AboutSection title="What the Task Force Recommended" icon="📜">
            <AboutParagraph>
              The final report was submitted to the Joint Standing Committee on Veterans and Legal
              Affairs on <AboutHighlight>January 31, 2025</AboutHighlight>, as required by statute.
            </AboutParagraph>

            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#4a7c4e' }}
            >
              Recommended Business Models
            </p>
            <AboutParagraph>
              The task force supported two business models where consumers could purchase and
              consume cannabis products on-site:
            </AboutParagraph>
            <div className="space-y-2 pl-1">
              <div className="flex items-start gap-2 text-sm" style={{ color: '#6aaa6e' }}>
                <span className="mt-0.5 shrink-0 font-bold" style={{ color: '#8bc34a' }}>
                  1.
                </span>
                <span>
                  <strong style={{ color: '#e8f5e9' }}>Consumption lounges</strong> &mdash;
                  dedicated spaces within licensed cannabis establishments where patrons 21 and
                  older may consume cannabis products on-premises.
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm" style={{ color: '#6aaa6e' }}>
                <span className="mt-0.5 shrink-0 font-bold" style={{ color: '#8bc34a' }}>
                  2.
                </span>
                <span>
                  <strong style={{ color: '#e8f5e9' }}>
                    Cannabis-specific trade shows and events
                  </strong>{' '}
                  &mdash; temporary, permitted events focused on cannabis products and culture.
                </span>
              </div>
            </div>

            <p
              className="text-xs font-semibold uppercase tracking-wider pt-2"
              style={{ color: '#4a7c4e' }}
            >
              Areas of Consensus
            </p>
            <AboutParagraph>
              There was strong consensus around{' '}
              <strong style={{ color: '#e8f5e9' }}>edibles</strong>, particularly{' '}
              <strong style={{ color: '#e8f5e9' }}>nano-emulsified beverages</strong>. These
              products typically have lower THC content, and their effects are felt within
              approximately 20 minutes &mdash; similar to alcohol &mdash; rather than the hour or
              more common with traditional edible products. This faster onset makes dosing more
              predictable and over-consumption easier to manage in a hospitality setting.
            </AboutParagraph>
            <AboutParagraph>
              The task force also agreed on{' '}
              <strong style={{ color: '#e8f5e9' }}>local municipal control</strong> via an opt-in
              model: municipalities would need to affirmatively vote to allow cannabis hospitality
              establishments in their jurisdiction. No municipality would be forced to participate.
            </AboutParagraph>

            <p
              className="text-xs font-semibold uppercase tracking-wider pt-2"
              style={{ color: '#4a7c4e' }}
            >
              Areas of Disagreement
            </p>
            <AboutParagraph>
              The task force was divided on licensing. Some members supported an open application
              process available to any qualified applicant. Others recommended giving existing adult
              use cannabis licensees the right of first refusal before opening applications to new
              entrants.
            </AboutParagraph>

            <p
              className="text-xs font-semibold uppercase tracking-wider pt-2"
              style={{ color: '#4a7c4e' }}
            >
              Outstanding Issues
            </p>
            <AboutParagraph>
              The report identified several issues requiring further study before legislation could
              move forward:
            </AboutParagraph>
            <ul className="space-y-1.5 pl-1">
              {[
                'Insurance availability — no clear insurance pathway exists for cannabis hospitality businesses',
                'Consumer demand — more data needed on whether demand justifies the regulatory infrastructure',
                "Indoor smoking laws — potential conflict between cannabis consumption and Maine's existing indoor smoking prohibitions",
                'Highway safety — cannabis was detected in 27% of fatal crash fatalities and 29% of surviving drivers in serious crashes (Maine Department of Public Safety data)',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#6aaa6e' }}>
                  <span className="mt-0.5 shrink-0" style={{ color: '#4a7c4e' }}>
                    &middot;
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <AboutParagraph>
              The task force recommended the Legislature convene another study or survey that
              includes a subgroup of cannabis consumers to examine these issues in more detail.
            </AboutParagraph>

            <div className="flex flex-wrap gap-3 pt-1">
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/2025-01/Final%20Report%20-%20Cannabis%20Hospitality%20Task%20Force%201.31.25.pdf">
                Final Report (PDF)
              </AboutExternalLink>
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Highway%20Safety%20Concerns%20in%20Cannabis%20Hospitality%20Programs.pdf">
                Highway Safety Presentation (PDF)
              </AboutExternalLink>
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2024.08.13%20Maine%20Smoking%20Laws%20Presentation.pdf">
                Smoking Laws Presentation (PDF)
              </AboutExternalLink>
              <AboutExternalLink href="https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Responsible%20Beverage%20Server%20Training%20Outline%20for%20CHTF%20Discussion.pdf">
                Server Training Outline (PDF)
              </AboutExternalLink>
            </div>
          </AboutSection>

          {/* ── Section 4: The Legislation ── */}
          <AboutSection title="The Legislation — LD 1365" icon="&#x2696;">
            <AboutParagraph>
              Following the task force&rsquo;s final report, legislation was introduced to establish
              cannabis hospitality in Maine.
            </AboutParagraph>

            <div
              className="rounded-lg p-3 space-y-1"
              style={{ background: '#0a130a', border: '1px solid rgba(74, 124, 78, 0.1)' }}
            >
              <p className="text-xs" style={{ color: '#4a7c4e' }}>
                Full Title
              </p>
              <p className="text-sm font-medium" style={{ color: '#e8f5e9' }}>
                &ldquo;An Act to Allow Consumption of Adult Use Cannabis in Locally Approved
                Hospitality Lounges&rdquo;
              </p>
              <p className="text-xs pt-1" style={{ color: '#4a7c4e' }}>
                Sponsor: Rep. David Boyer (R-Poland) &middot; Bill:{' '}
                <AboutHighlight>LD 1365</AboutHighlight> &middot; 132nd Legislature
              </p>
            </div>

            <p
              className="text-xs font-semibold uppercase tracking-wider pt-2"
              style={{ color: '#4a7c4e' }}
            >
              Key Provisions
            </p>
            <ul className="space-y-1.5 pl-1">
              {[
                'Defines a "cannabis consumption lounge" as a designated area within a licensed cannabis store that has been issued an endorsement for on-premises consumption, limited to individuals 21 years of age or older.',
                'Requires municipal approval — municipalities must adopt local ordinances permitting cannabis hospitality establishments before any can operate.',
                'Mandates a cannabis server education course that must be completed by anyone involved in retail sales and management of cannabis lounges.',
                "Creates a Cannabis Liability Act modeled on Maine's existing Liquor Liability Act, establishing legal liability for over-serving if a patron causes damages as a result of impairment.",
                'Includes restrictions on consumption location, occupancy, and permitted activities within designated areas.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#6aaa6e' }}>
                  <span className="mt-0.5 shrink-0" style={{ color: '#4a7c4e' }}>
                    &middot;
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p
              className="text-xs font-semibold uppercase tracking-wider pt-2"
              style={{ color: '#4a7c4e' }}
            >
              Legislative Timeline
            </p>
            <AboutTimeline
              events={[
                {
                  date: 'May 2025',
                  description: 'Public Hearing',
                  detail:
                    'Industry support from Maine Cannabis Industry Association ("excellent, well-thought out piece of legislation"). Opposition from Maine Public Health Association (secondhand smoke, impaired driving) and Maine Department of Public Safety (cannabis detected in 27–29% of serious crash cases).',
                },
                {
                  date: 'June 2025',
                  description: 'Carried Over to Next Session',
                  detail:
                    'The Veterans and Legal Affairs Committee requested a carryover rather than voting. Catherine Lewis (Medical Marijuana Caregivers of Maine) called the bill a "no-brainer." Nate Cloutier (HospitalityMaine, task force member) warned that traditional restaurants are unsuitable venues and that delayed cannabis effects complicate over-service detection.',
                },
                {
                  date: 'January 12, 2026',
                  description: 'Work Session',
                  detail:
                    'Veterans and Legal Affairs Committee took up LD 1365 alongside two other cannabis-related proposals.',
                },
                {
                  date: 'February 4, 2026',
                  description: 'Divided Report from Committee',
                  detail:
                    'The committee issued a divided report — no consensus reached. The bill remains in the legislative process.',
                },
              ]}
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <AboutExternalLink href="https://legiscan.com/ME/bill/LD1365/2025">
                LD 1365 on LegiScan
              </AboutExternalLink>
            </div>
          </AboutSection>

          {/* ── Section 5: How This Portal Was Built ── */}
          <AboutSection title="How This Portal Was Built" icon="🔥">
            <AboutParagraph>
              The person who built this portal has been a private chef for over 15 years and has
              been producing cannabis dining events for the last decade. During that time, he has
              worked with and alongside other chefs in the space &mdash; and has seen the same
              problems repeat: no dosing protocols, no compliance documentation, no SOPs, no guest
              consent workflows. He has made those mistakes himself and learned from them.
            </AboutParagraph>
            <AboutParagraph>
              This portal takes what was learned from all of that &mdash; what works, what fails,
              what the state requires, what guests need to feel safe &mdash; and puts it into
              software. The dosing framework, the compliance checklists, the guest consent system,
              the event tracking: all of it comes from doing this work, not from reading about it.
            </AboutParagraph>
            <AboutParagraph>
              The goal is simple. Any chef should be able to pick this up, follow the system, and
              run a compliant, safe cannabis dinner &mdash; whether it is their first one or their
              hundredth.
            </AboutParagraph>
          </AboutSection>

          {/* ── Section 6: Why ChefFlow Built This ── */}
          <AboutSection title="Why ChefFlow Built This" icon="🔧">
            <AboutParagraph>
              This portal is built by the same person who helped shape the regulatory
              recommendations and who runs cannabis dinners professionally. It is not a third-party
              product guessing at what compliance might look like when the law passes.
            </AboutParagraph>
            <AboutParagraph>
              The Phase 2 compliance system currently being developed maps directly to the
              requirements the task force identified: dosing records, guest consent, extract
              tracking, standard operating procedures, and state compliance logs. These are not
              features added after the fact &mdash; they are the reason the portal was built.
            </AboutParagraph>
            <AboutParagraph>
              When legislation passes and licenses are issued, this portal will already have the
              tools to operate compliantly from day one. That is the advantage of building the
              software and shaping the regulation at the same time.
            </AboutParagraph>
          </AboutSection>

          {/* ── Section 7: What's Here & What's Coming ── */}
          <AboutSection title="What's Here & What's Coming" icon="🗺️" defaultOpen>
            <AboutParagraph>
              The cannabis portal is a living system. Features ship as they are ready. This section
              tracks what is available now and what is in development.
            </AboutParagraph>
            <AboutFeatureStatus
              items={[
                { label: 'Cannabis Events', status: 'live' },
                { label: 'Cannabis Ledger', status: 'live' },
                { label: 'Invitations', status: 'live' },
                { label: 'Compliance Placeholder', status: 'live' },
                { label: 'SOPs & Checklists', status: 'planned' },
                { label: 'Dosing Tracker (THC/CBD per guest)', status: 'planned' },
                { label: 'Extract Tracking', status: 'planned' },
                { label: 'Guest Consent Forms', status: 'planned' },
                { label: 'Maine State Compliance Log', status: 'planned' },
                { label: 'Print-out Generation', status: 'planned' },
                { label: 'Receipt Photo Documentation', status: 'planned' },
              ]}
            />
          </AboutSection>
        </div>

        {/* ─── Public Sources & Records (always visible) ─── */}
        <div
          className="rounded-xl p-5 mt-6 space-y-4"
          style={{
            background: '#0a130a',
            border: '1px solid rgba(74, 124, 78, 0.15)',
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#4a7c4e' }}
          >
            Public Sources &amp; Records
          </p>

          <AboutLinkGroup
            title="Official Government"
            links={[
              {
                label: 'OCP Cannabis Hospitality Task Force',
                href: 'https://www.maine.gov/dafs/ocp/stakeholders/hospitality-task-force',
              },
              {
                label: 'P.L. 2023, ch. 679 (Enabling Legislation)',
                href: 'https://legislature.maine.gov/backend/App/services/getDocument.aspx?documentId=107388',
              },
              {
                label: 'Final Report — January 31, 2025',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/2025-01/Final%20Report%20-%20Cannabis%20Hospitality%20Task%20Force%201.31.25.pdf',
              },
            ]}
          />

          <AboutLinkGroup
            title="Meeting Materials"
            links={[
              {
                label: 'Meeting 1 — Agenda & Materials',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%201.pdf',
              },
              {
                label: 'Meeting 2 — Agenda & Materials',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%202.pdf',
              },
              {
                label: 'Meeting 3 — Agenda & Materials',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%203.pdf',
              },
              {
                label: 'Meeting 4 — Agenda & Materials',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%204.pdf',
              },
              {
                label: 'Member Bios',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/CHTF%20Member%20Bios.pdf',
              },
              {
                label: 'National Footprint',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/CHTF%20-%20Cannabis%20Hospitality%20National%20Footprint.pdf',
              },
              {
                label: 'Midway Survey Results',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/CHTF%20Midway%20Member%20Survey%20Results.pdf',
              },
              {
                label: 'Smoking Laws Presentation',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2024.08.13%20Maine%20Smoking%20Laws%20Presentation.pdf',
              },
              {
                label: 'Highway Safety Presentation',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Highway%20Safety%20Concerns%20in%20Cannabis%20Hospitality%20Programs.pdf',
              },
              {
                label: 'Highway Safety Sources',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Sources%20for%20CHTF%20Highway%20Safety%20Presentation.pdf',
              },
              {
                label: 'Server Training Outline',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Responsible%20Beverage%20Server%20Training%20Outline%20for%20CHTF%20Discussion.pdf',
              },
            ]}
          />

          <AboutLinkGroup
            title="Meeting Recordings"
            links={[
              { label: 'Meeting 1 — YouTube', href: 'https://youtu.be/sDfvYLgstE8?t=35' },
              { label: 'Meeting 2 — YouTube', href: 'https://youtu.be/gSy3_oFjPd0' },
              { label: 'Meeting 3 — YouTube', href: 'https://youtu.be/qjldeoZ2AE0' },
              { label: 'Meeting 4 — YouTube', href: 'https://youtu.be/aJ_Pma7dzSQ' },
              {
                label: 'Full Playlist',
                href: 'https://www.youtube.com/playlist?list=PLdBrIirjKsezIN0zkfKawogPci7010WQY',
              },
            ]}
          />

          <AboutLinkGroup
            title="Legislation"
            links={[
              { label: 'LD 1365 on LegiScan', href: 'https://legiscan.com/ME/bill/LD1365/2025' },
            ]}
          />

          <AboutLinkGroup
            title="News Coverage"
            links={[
              {
                label: 'Maine Public — Task Force Offers Roadmap',
                href: 'https://www.mainepublic.org/maine/2025-02-04/state-task-force-offers-roadmap-for-considering-on-site-cannabis-consumption-businesses',
              },
              {
                label: 'Central Maine — Still a Long Way from Lounges',
                href: 'https://www.centralmaine.com/2025/02/25/maine-inches-toward-allowing-cannabis-social-clubs/',
              },
              {
                label: 'Spectrum News — Task Force Considers Lounges',
                href: 'https://spectrumlocalnews.com/me/maine/business/2024/08/01/maine-task-force-considers-cannabis-lounges--other-on-site-options-as-industry-looks-for-areas-of-growth',
              },
              {
                label: 'MaineBiz — Cannabis Hospitality Focus',
                href: 'https://www.mainebiz.biz/article/cannabis-hospitality-will-be-the-focus-of-a-maine-task-force',
              },
            ]}
          />

          <AboutLinkGroup
            title="Office of Cannabis Policy"
            links={[
              { label: 'OCP Website', href: 'https://www.maine.gov/dafs/ocp/' },
              { label: 'Facebook', href: 'https://www.facebook.com/MaineOCP' },
              { label: 'Instagram', href: 'https://www.instagram.com/maine.ocp/' },
              { label: 'YouTube', href: 'https://www.youtube.com/c/MaineOCP' },
            ]}
          />
        </div>

        {/* ─── Footer ─── */}
        <p className="text-center text-xs mt-6 pb-8" style={{ color: '#2d5a30' }}>
          This page is a living document. It will be updated as features ship and legislation
          progresses.
        </p>
      </div>
    </CannabisPageWrapper>
  )
}
