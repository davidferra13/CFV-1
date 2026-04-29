// Cannabis Portal - About Page
// The full story: task force, legislation, credentials, and what's coming.
// Every claim is source-linked. Every fact is verifiable. This is the receipts.

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
  AboutQuote,
  AboutSubHeader,
  AboutBullet,
  MeetingCard,
} from '@/components/cannabis/about-sections'

export default async function CannabisAboutPage() {
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
                { name: 'Sam Tracy', organization: '-', seat: 'Expert on Cannabis Policy' },
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
                  organization: '-',
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
                  organization: 'City of Portland - Div. of Public Health',
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

          {/* ── Section 2.5: Inside the Meetings - 12 Hours Distilled ── */}
          <AboutSection title="Inside the Meetings - 12 Hours Distilled" icon="🎙️">
            <div
              className="rounded-lg p-4 mb-2"
              style={{
                background: 'rgba(139, 195, 74, 0.06)',
                border: '1px solid rgba(139, 195, 74, 0.12)',
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: '#6aaa6e' }}>
                The four task force meetings totaled nearly{' '}
                <strong style={{ color: '#e8f5e9' }}>12 hours of policy debate</strong>. Nobody is
                going to watch all of that footage. What follows is a comprehensive summary of every
                substantive discussion, every point of consensus and disagreement, and the key
                quotes that shaped the final recommendations. This is the record of what actually
                happened in those rooms &mdash; distilled so you don&rsquo;t have to sit through it
                yourself.
              </p>
            </div>

            {/* ─── Meeting #1 ─── */}
            <MeetingCard
              number={1}
              date="July 10, 2024"
              duration="2h 50m"
              focus="National landscape, license types, first debates on consumption methods"
            >
              <AboutSubHeader>What Happened</AboutSubHeader>
              <AboutParagraph>
                The inaugural meeting established the task force&rsquo;s scope and legislative
                charge under <AboutHighlight>P.L. 2023, ch. 679</AboutHighlight>. Director John
                Hudak outlined the five core topics to be addressed across all four meetings:
                license types, consumption methods, non-cannabis products and services, employee
                training, and local control.
              </AboutParagraph>

              <AboutSubHeader>License Types</AboutSubHeader>
              <AboutParagraph>
                The group broadly favored{' '}
                <strong style={{ color: '#e8f5e9' }}>multiple license types</strong> rather than a
                one-size-fits-all approach. Standalone consumption lounges emerged as the leading
                model. The &ldquo;Bring Your Own Cannabis&rdquo; (BYOC) model was widely opposed
                &mdash; it provides no real revenue stream, bypasses track-and-trace (Metrc)
                protocols, and introduces massive liability since staff cannot verify the dosage of
                outside products.
              </AboutParagraph>
              <AboutParagraph>
                Natasha Johnson advocated for licensing large outdoor properties for hiking and
                cross-country skiing while consuming. &ldquo;Camp Laughing Grass&rdquo; (a
                cannabis-friendly campground already operating in Maine) was cited as an existing
                model.
              </AboutParagraph>

              <AboutSubHeader>Consumption Methods</AboutSubHeader>
              <AboutParagraph>
                The first major divide appeared. Public health members strongly opposed indoor
                smoking due to Maine&rsquo;s Clean Air Act. Industry members argued that inhalation
                must be permitted because it has a much faster onset and shorter duration than
                edibles, which actually <em>prevents</em> accidental overconsumption.
              </AboutParagraph>
              <AboutParagraph>
                Pablo Barras raised a pivotal point about{' '}
                <strong style={{ color: '#e8f5e9' }}>nano-emulsified edibles</strong> &mdash;
                water-soluble technology that reduces onset from 60&ndash;90 minutes to 10&ndash;15
                minutes, allowing customers to feel effects while still at the establishment rather
                than while driving home.
              </AboutParagraph>

              <AboutSubHeader>Safety &amp; Liability</AboutSubHeader>
              <AboutParagraph>
                Scott Maddox (Highway Safety) introduced the concept of a{' '}
                <strong style={{ color: '#e8f5e9' }}>Cannabis Dram Shop Act</strong> &mdash; holding
                establishments civilly liable if they over-serve a patron who subsequently causes
                injury. Lauren Stewart emphasized the need for a massive, state-funded public
                education campaign on cannabis-impaired driving.
              </AboutParagraph>
              <AboutParagraph>
                Ben M. (Dept. of Agriculture) raised alarm about cross-contamination in commercial
                kitchens where chefs would prep both standard food and infused food simultaneously.
              </AboutParagraph>

              <AboutSubHeader>Key Quotes</AboutSubHeader>
              <div className="space-y-2">
                <AboutQuote
                  speaker="Scott Maddox"
                  affiliation="Highway Safety"
                  timestamp="01:14:55"
                >
                  It&rsquo;s about impairment, it&rsquo;s not about marijuana consumption,
                  it&rsquo;s not about the number of alcohol drinks consumed, it&rsquo;s about
                  impairment.
                </AboutQuote>
                <AboutQuote
                  speaker="Lauren Stewart"
                  affiliation="Highway Safety"
                  timestamp="01:33:14"
                >
                  We&rsquo;d rather put our money into educating people to make the right choice
                  than putting our money into educating law enforcement to arrest people and then
                  all the costs that compound on top of that.
                </AboutQuote>
                <AboutQuote speaker="Pablo Barras" affiliation="Culinary Arts" timestamp="02:28:11">
                  There is new nano-technology so that it&rsquo;s a much smaller molecule
                  that&rsquo;s able to be water soluble and the onset&hellip; is between 10 and 15
                  minutes as opposed to 60 and 90.
                </AboutQuote>
                <AboutQuote speaker="Ann Sadlak" affiliation="Public Health" timestamp="02:17:52">
                  I am here to be maybe the public health Debbie Downer&hellip; I am uncomfortable
                  at any idea of smoking.
                </AboutQuote>
                <AboutQuote
                  speaker="David Ferragamo"
                  affiliation="Private Chef"
                  timestamp="01:56:26"
                >
                  I don&rsquo;t see BYOC being successful at all, especially for a business
                  owner&hellip; I just see it being a huge liability.
                </AboutQuote>
              </div>

              <AboutSubHeader>Consensus Points</AboutSubHeader>
              <ul className="space-y-1.5 pl-1">
                <AboutBullet>
                  The BYOC model is largely unworkable from a business, tracking, and liability
                  perspective
                </AboutBullet>
                <AboutBullet>
                  Extensive, mandated server training (similar to alcohol RBS) will be required
                </AboutBullet>
                <AboutBullet>
                  Strict dosing limits (e.g., standard 2.5mg or 5mg servings) will be necessary for
                  on-site edible consumption
                </AboutBullet>
              </ul>
            </MeetingCard>

            {/* ─── Meeting #2 ─── */}
            <MeetingCard
              number={2}
              date="July 24, 2024"
              duration="2h 56m"
              focus="Narrowing business models, inhalation debate intensifies, BYOC formally rejected"
            >
              <AboutSubHeader>What Happened</AboutSubHeader>
              <AboutParagraph>
                Meeting #2 focused on building consensus around business models and consumption
                methods. The five original business model categories from Meeting #1 were condensed
                into three manageable buckets for potential pilot programs.
              </AboutParagraph>

              <AboutSubHeader>Three Business Models</AboutSubHeader>
              <AboutParagraph>
                Natasha Johnson proposed condensing the five themes into three categories, which
                gained broad agreement:
              </AboutParagraph>
              <ul className="space-y-1.5 pl-1">
                <AboutBullet>
                  <strong style={{ color: '#e8f5e9' }}>Traditional Consumption Lounge</strong>{' '}
                  and/or Restaurant model
                </AboutBullet>
                <AboutBullet>
                  <strong style={{ color: '#e8f5e9' }}>Accommodation/Lodging</strong> model
                  (B&amp;Bs, hotels)
                </AboutBullet>
                <AboutBullet>
                  <strong style={{ color: '#e8f5e9' }}>Events &amp; Experiences</strong> combined
                  (tours, festivals, trade shows)
                </AboutBullet>
              </ul>

              <AboutSubHeader>The Inhalation Battle</AboutSubHeader>
              <AboutParagraph>
                This was the most heavily debated topic. Sam Tracy, Rose Mahoney, Steve Rusnack, and
                David Ferragamo deemed inhalation an absolute economic necessity &mdash; smokeable
                flower makes up approximately 70% of Maine&rsquo;s cannabis market. Ann Sadlak
                explicitly stated that the Maine Medical Association would not support any policy
                allowing indoor smoking. Lexi Perry cited the{' '}
                <strong style={{ color: '#e8f5e9' }}>Workplace Smoking Act of 1985</strong>,
                pointing out that employees cannot legally be subjected to secondhand smoke in their
                workplace.
              </AboutParagraph>

              <AboutSubHeader>Lodging Paradox</AboutSubHeader>
              <AboutParagraph>
                Nate Cloutier identified a legal conflict: under the Maine Human Rights Act, a hotel
                cannot deny a stay to an adult simply because they are accompanied by a minor. This
                directly complicates the strict 21+ requirement for cannabis-friendly B&amp;Bs.
              </AboutParagraph>

              <AboutSubHeader>Local Control</AboutSubHeader>
              <AboutParagraph>
                Municipal representatives heavily cautioned against bundling hospitality under
                existing retail opt-ins. Towns go through rigorous zoning processes and would demand
                specific control over where social clubs are located. Heather Sullivan noted that
                many towns explicitly banned &ldquo;social use clubs&rdquo; in their 2016
                ordinances, meaning they would have to actively rewrite their laws.
              </AboutParagraph>

              <AboutSubHeader>Key Quotes</AboutSubHeader>
              <div className="space-y-2">
                <AboutQuote
                  speaker="Sam Tracy"
                  affiliation="Cannabis Policy Expert"
                  timestamp="01:37:13"
                >
                  I think this just isn&rsquo;t going to work if we don&rsquo;t allow inhalation of
                  some sort.
                </AboutQuote>
                <AboutQuote speaker="Lexi Perry" affiliation="Maine CDC" timestamp="01:51:49">
                  Anywhere where people are working, smoking is prohibited under that law&hellip;
                  that is where I think there&rsquo;s a big gap in what we&rsquo;re talking about.
                </AboutQuote>
                <AboutQuote
                  speaker="Nate Cloutier"
                  affiliation="HospitalityMaine"
                  timestamp="02:11:22"
                >
                  It needs to work for local folks first before we can try to really tailor this to
                  what folks from away might want&hellip; if it&rsquo;s not working for folks here
                  at home, then it&rsquo;s definitely not going to work for folks that are
                  traveling.
                </AboutQuote>
                <AboutQuote
                  speaker="Chris Parmenter"
                  affiliation="City of Portland"
                  timestamp="02:10:03"
                >
                  Coming from one of the bigger cities, I see a need for the tourism&hellip; if
                  you&rsquo;re coming off one of the cruise ships into the city, there&rsquo;s
                  really not a lot of legal places for you to consume.
                </AboutQuote>
              </div>

              <AboutSubHeader>Consensus Points</AboutSubHeader>
              <ul className="space-y-1.5 pl-1">
                <AboutBullet>
                  Future discussions framed around three buckets: Lounges/Restaurants,
                  Accommodations, and Events/Experiences
                </AboutBullet>
                <AboutBullet>
                  Consumption areas must be strictly 21+ &mdash; unanimous agreement
                </AboutBullet>
                <AboutBullet>
                  Inhalation is viewed as an economic necessity by industry, but faces a hard veto
                  threat from public health
                </AboutBullet>
              </ul>
            </MeetingCard>

            {/* ─── Meeting #3 ─── */}
            <MeetingCard
              number={3}
              date="August 14, 2024"
              duration="2h 49m"
              focus="AG's legal opinion on smoking laws, entertainment, local opt-in framework"
            >
              <AboutSubHeader>What Happened</AboutSubHeader>
              <AboutParagraph>
                This meeting was a turning point. Assistant Attorney General Elizabeth Reen provided
                an expert presentation on Maine&rsquo;s existing smoking laws, and the legal reality
                changed the entire conversation.
              </AboutParagraph>

              <AboutSubHeader>The Legal Wall</AboutSubHeader>
              <AboutParagraph>
                AAG Reen confirmed that Maine&rsquo;s definition of &ldquo;smoking&rdquo; is
                extremely broad, covering lighted/heated tobacco, plant products (including
                cannabis), and electronic smoking devices (vapes). Cannabis use is currently{' '}
                <em>more strictly regulated than tobacco</em> &mdash; restricted exclusively to
                private residences or private property not open to the public. Under current law,
                there is <strong style={{ color: '#e8f5e9' }}>virtually no workaround</strong> to
                allow indoor cannabis smoking at a business without the legislature actively
                rewriting both the Clean Indoor Air Act and the Adult Use Cannabis statutes.
              </AboutParagraph>

              <AboutSubHeader>The Smoking Room Compromise</AboutSubHeader>
              <AboutParagraph>
                Steve Rusnack proposed the architecture that would shape the final framework:{' '}
                <strong style={{ color: '#e8f5e9' }}>
                  smaller rooms designated for smoking only
                </strong>{' '}
                inside of the lounges themselves, keeping employees out and allowing designated
                drivers to remain in the main smoke-free lounge area. Sam Tracy suggested looking at
                models from other states where staff monitor smoking rooms from separate,
                glass-enclosed rooms.
              </AboutParagraph>

              <AboutSubHeader>Designated Driver Problem</AboutSubHeader>
              <AboutParagraph>
                Director Lauren Stewart highlighted a critical flaw: if a group brings a designated
                driver, that sober driver cannot sit with their friends in the smoking room without
                being exposed to secondhand smoke and potentially failing an OUI test themselves.
              </AboutParagraph>

              <AboutSubHeader>Entertainment &amp; Non-Cannabis Services</AboutSubHeader>
              <AboutParagraph>
                The group agreed that lounges should offer entertainment (trivia, live music, yoga,
                arcade games), with rules mirroring alcohol regulations: cannabis cannot be given
                away as a prize, and performers cannot consume while actively performing on stage.
                There was unanimous agreement that venues must sell pre-packaged food and
                non-alcoholic beverages at minimum.
              </AboutParagraph>

              <AboutSubHeader>Survey Results</AboutSubHeader>
              <AboutParagraph>
                The mid-task-force survey showed approximately two-thirds of members favored some
                form of indoor/outdoor smoking and vaping. Traditional consumption lounges ranked as
                the highest priority business model; restaurants ranked lowest.
              </AboutParagraph>

              <AboutSubHeader>Key Quotes</AboutSubHeader>
              <div className="space-y-2">
                <AboutQuote
                  speaker="Elizabeth Reen"
                  affiliation="Assistant Attorney General"
                  timestamp="15:53"
                >
                  According to the statute it really only allows for cannabis use in a private
                  residence or on private property not open to the public&hellip; [cannabis] is
                  actually even more restrictive than the general public smoking requirements.
                </AboutQuote>
                <AboutQuote speaker="Rose Mahoney" affiliation="Consumer Rep" timestamp="49:15">
                  Not having smoking as part of the introduction I think would be the first nail in
                  the coffin of the whole idea.
                </AboutQuote>
                <AboutQuote
                  speaker="Steve Rusnack"
                  affiliation="Full Bloom Cannabis"
                  timestamp="01:31:25"
                >
                  I think that if we had smaller rooms designated for smoking only inside of the
                  lounges themselves, that would keep employees out of there, it would be a
                  designated driver can be in the lounge but not in the smoke room.
                </AboutQuote>
                <AboutQuote
                  speaker="Heather Sullivan"
                  affiliation="2016 Campaign"
                  timestamp="02:26:49"
                >
                  We are going to have a really hard time getting legislative approval&hellip; if we
                  in any way limit local control&hellip; Maine&rsquo;s a state that has more local
                  control than most.
                </AboutQuote>
                <AboutQuote speaker="Lexi Perry" affiliation="Maine CDC" timestamp="01:09:41">
                  I would not be interested in setting us up for immediately having to roll back
                  health and safety standards&hellip; I think that&rsquo;s a big consideration.
                </AboutQuote>
              </div>

              <AboutSubHeader>Unresolved Questions</AboutSubHeader>
              <ul className="space-y-1.5 pl-1">
                <AboutBullet>
                  Can HVAC systems clear a smoking room fast enough for First Responder access
                  during emergencies?
                </AboutBullet>
                <AboutBullet>
                  Will the legislature reopen the Municipal Opt-In Reimbursement Fund to help towns
                  draft hospitality ordinances?
                </AboutBullet>
                <AboutBullet>
                  How can designated drivers safely attend indoor smoking lounges without secondhand
                  exposure?
                </AboutBullet>
              </ul>
            </MeetingCard>

            {/* ─── Meeting #4 ─── */}
            <MeetingCard
              number={4}
              date="August 28, 2024"
              duration="2h 54m"
              focus="Nevada lessons, highway safety, training mandates, beverages emerge as the winning model"
            >
              <AboutSubHeader>What Happened</AboutSubHeader>
              <AboutParagraph>
                The final meeting featured the most consequential presentation of the entire task
                force: a guest speaker from Nevada who had helped draft their lounge law and open
                &ldquo;Smoke and Mirrors&rdquo; (Vegas&rsquo;s first state-licensed consumption
                lounge). His data fundamentally reframed the conversation.
              </AboutParagraph>

              <AboutSubHeader>Nevada&rsquo;s Data Changed Everything</AboutSubHeader>
              <AboutParagraph>
                Scott Rutledge (Government &amp; Regulatory Affairs Specialist, Nevada) shared that
                &ldquo;Smoke and Mirrors&rdquo; projected 50/50 sales between smoke and beverages.
                Instead,{' '}
                <strong style={{ color: '#e8f5e9' }}>
                  70% of early sales were low-dose cannabis beverages
                </strong>{' '}
                (2.5mg&ndash;10mg). Consumers loved the fast onset (15&ndash;20 minutes) and fast
                offset (under 2 hours). This data point shifted the conversation from &ldquo;smoking
                vs. no smoking&rdquo; to &ldquo;beverages might be the real business model.&rdquo;
              </AboutParagraph>
              <AboutParagraph>
                Rutledge also shared practical lessons: Nevada initially required 20 air-exchanges
                per hour (~$500k HVAC cost), but regulators later allowed carbon-filtration waivers.
                Nevada&rsquo;s mistake was banning take-home of unconsumed products, which forces
                single-serving sales or encourages dangerous overconsumption before leaving.
              </AboutParagraph>

              <AboutSubHeader>Highway Safety</AboutSubHeader>
              <AboutParagraph>
                Scott Maddox presented data showing traffic fatalities increased by 2.2 per billion
                miles driven in states with legalized recreational cannabis. He stressed that blood
                THC levels do not correspond with measured impairment. His recommendations:
                mandatory impairment training, strict serving size/wait-time rules, a Cannabis
                Liability Act (Dram Shop law), and a hard ban on co-locating alcohol and cannabis
                sales.
              </AboutParagraph>

              <AboutSubHeader>Mandatory Training</AboutSubHeader>
              <AboutParagraph>
                Jiffy Kelly-Young presented Portland&rsquo;s existing cannabis vendor training
                model. Maine currently does not mandate statewide alcohol server training &mdash;
                only 4 towns require it. The task force agreed that cannabis hospitality training
                must be state-mandated from the start. Maddox&rsquo;s position was unequivocal:{' '}
                <em>&ldquo;If it&rsquo;s voluntary, it won&rsquo;t happen.&rdquo;</em>
              </AboutParagraph>

              <AboutSubHeader>Insurance &amp; Impaired Driving Prevention</AboutSubHeader>
              <AboutParagraph>
                Clark County, Nevada requires venues to submit impaired driving prevention plans
                including 24-hour no-tow parking policies and partnerships with Uber/Lyft for
                discounted rides. The task force expressed frustration over the &ldquo;Green
                Premium&rdquo; &mdash; exorbitant insurance rates for cannabis businesses &mdash;
                and wants to know if mandated training or Dram Shop laws will help lower premiums.
              </AboutParagraph>

              <AboutSubHeader>Key Quotes</AboutSubHeader>
              <div className="space-y-2">
                <AboutQuote
                  speaker="Scott Rutledge"
                  affiliation="Nevada Lobbyist"
                  timestamp="11:12"
                >
                  Turns out 70% of our sales were beverages&hellip; consumers were not interested in
                  smoking flower&hellip; but to sell them a low-dose cannabis beverage&hellip; they
                  got really high marks.
                </AboutQuote>
                <AboutQuote
                  speaker="Scott Rutledge"
                  affiliation="Nevada Lobbyist"
                  timestamp="16:25"
                >
                  If you didn&rsquo;t give people the ability to purchase food and beverage&hellip;
                  you&rsquo;re really just asking people to come into a venue, consume cannabis and
                  leave. We would call this the airport smoking lounge model, and we didn&rsquo;t
                  think that was a very attractive business model.
                </AboutQuote>
                <AboutQuote
                  speaker="Scott Maddox"
                  affiliation="Highway Safety"
                  timestamp="01:03:36"
                >
                  If we&rsquo;re going to license cannabis hospitality facilities, there has to be
                  mandatory training. And I suggest very strongly it&rsquo;s mandatory, because if
                  it&rsquo;s voluntary, it won&rsquo;t happen.
                </AboutQuote>
                <AboutQuote speaker="John Hudak" affiliation="OCP Director" timestamp="02:21:59">
                  If we make a recommendation for something that no one can possibly get any
                  insurance for, then that is a system that is doomed to fail.
                </AboutQuote>
                <AboutQuote speaker="John Hudak" affiliation="OCP Director" timestamp="02:35:31">
                  There&rsquo;s disagreement in this task force &mdash; that&rsquo;s how it&rsquo;s
                  supposed to be. If we were all agreeing with each other on everything, we
                  organized the wrong task force.
                </AboutQuote>
              </div>

              <AboutSubHeader>Final Consensus Points</AboutSubHeader>
              <ul className="space-y-1.5 pl-1">
                <AboutBullet>
                  Low-dose, fast-acting cannabis beverages represent the most viable and safest
                  business model
                </AboutBullet>
                <AboutBullet>
                  Employee server training must be state-mandated, with the state subsidizing costs
                </AboutBullet>
                <AboutBullet>
                  Patrons must be allowed to take unconsumed cannabis home in child-proof,
                  tamper-evident exit bags
                </AboutBullet>
                <AboutBullet>
                  A Cannabis Liability Act (Dram Shop law) is necessary for the program to gain
                  public trust
                </AboutBullet>
              </ul>
            </MeetingCard>

            {/* ─── The Big Picture ─── */}
            <AboutSubHeader>The Big Picture &mdash; What 12 Hours Produced</AboutSubHeader>
            <AboutParagraph>
              Across four meetings, the task force moved from open brainstorming to a focused set of
              recommendations. Here is the framework that emerged:
            </AboutParagraph>
            <ul className="space-y-1.5 pl-1">
              <AboutBullet>
                <strong style={{ color: '#e8f5e9' }}>Standalone 21+ consumption lounges</strong> as
                the primary business model, with beverages as the anchor product
              </AboutBullet>
              <AboutBullet>
                <strong style={{ color: '#e8f5e9' }}>
                  Sealed, separately ventilated smoking rooms
                </strong>{' '}
                within non-smoking venues &mdash; employees do not enter
              </AboutBullet>
              <AboutBullet>
                <strong style={{ color: '#e8f5e9' }}>Edibles and nano-emulsified beverages</strong>{' '}
                as the default and safest consumption method
              </AboutBullet>
              <AboutBullet>
                <strong style={{ color: '#e8f5e9' }}>Municipal opt-in required</strong> &mdash; no
                municipality forced to participate
              </AboutBullet>
              <AboutBullet>
                <strong style={{ color: '#e8f5e9' }}>Mandatory state-level server training</strong>{' '}
                tied to individual OCP registration cards
              </AboutBullet>
              <AboutBullet>
                <strong style={{ color: '#e8f5e9' }}>Cannabis Liability Act</strong> (Dram Shop law)
                for over-service civil liability
              </AboutBullet>
              <AboutBullet>
                <strong style={{ color: '#e8f5e9' }}>Impaired driving prevention plans</strong>{' '}
                including 24-hour no-tow parking and rideshare partnerships
              </AboutBullet>
              <AboutBullet>
                <strong style={{ color: '#e8f5e9' }}>Entertainment allowed</strong> (live music,
                trivia, yoga) &mdash; alcohol excluded
              </AboutBullet>
              <AboutBullet>
                <strong style={{ color: '#e8f5e9' }}>Exit bags for unconsumed product</strong>{' '}
                &mdash; child-proof, tamper-evident, just like retail
              </AboutBullet>
            </ul>

            <div
              className="rounded-lg p-3 mt-2"
              style={{
                background: 'rgba(74, 124, 78, 0.08)',
                border: '1px solid rgba(74, 124, 78, 0.12)',
              }}
            >
              <p className="text-xs leading-relaxed" style={{ color: '#4a7c4e' }}>
                These summaries were produced from the complete meeting recordings archived on the{' '}
                <AboutExternalLink href="https://www.youtube.com/playlist?list=PLdBrIirjKsezIN0zkfKawogPci7010WQY">
                  Maine OCP YouTube channel
                </AboutExternalLink>
                . All quotes are attributed with timestamps so you can verify them against the
                source footage.
              </p>
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
                'Insurance availability - no clear insurance pathway exists for cannabis hospitality businesses',
                'Consumer demand - more data needed on whether demand justifies the regulatory infrastructure',
                "Indoor smoking laws - potential conflict between cannabis consumption and Maine's existing indoor smoking prohibitions",
                'Highway safety - cannabis was detected in 27% of fatal crash fatalities and 29% of surviving drivers in serious crashes (Maine Department of Public Safety data)',
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
          <AboutSection title="The Legislation - LD 1365" icon="&#x2696;">
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
                'Requires municipal approval - municipalities must adopt local ordinances permitting cannabis hospitality establishments before any can operate.',
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
                    'The committee issued a divided report - no consensus reached. The bill remains in the legislative process.',
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
          <AboutSection title="Daily Operational Checklist" icon="OPS">
            <AboutParagraph>
              ChefFlow daily operations use the existing Tasks, Templates, and Daily Ops surfaces to
              track opening checks, inventory counts, cleaning work, station prep, and completion
              status without adding a separate checklist database.
            </AboutParagraph>
            <AboutParagraph>
              Chefs can build reusable checklist templates, generate them for the day, assign due
              times and stations, and mark tasks complete from the daily task board.
            </AboutParagraph>
            <div className="flex flex-wrap gap-3 pt-2">
              <AboutExternalLink href="/daily-checklist">Open Daily Checklist</AboutExternalLink>
              <AboutExternalLink href="/tasks/templates">Task Templates</AboutExternalLink>
            </div>
          </AboutSection>

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
                { label: 'Content Pipeline', status: 'live' },
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
            <div
              className="rounded-lg p-3"
              style={{ background: '#0a130a', border: '1px solid rgba(74, 124, 78, 0.12)' }}
            >
              <AboutParagraph>
                Use the content pipeline after eligible completed events to review photos, draft
                event-safe posts, approve the copy, and track what has been posted.
              </AboutParagraph>
              <a
                href="/content"
                className="inline-flex text-sm font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
                style={{ color: '#8bc34a' }}
              >
                Open Content Pipeline
              </a>
            </div>
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
                label: 'Final Report - January 31, 2025',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/2025-01/Final%20Report%20-%20Cannabis%20Hospitality%20Task%20Force%201.31.25.pdf',
              },
            ]}
          />

          <AboutLinkGroup
            title="Meeting Materials"
            links={[
              {
                label: 'Meeting 1 - Agenda & Materials',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%201.pdf',
              },
              {
                label: 'Meeting 2 - Agenda & Materials',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%202.pdf',
              },
              {
                label: 'Meeting 3 - Agenda & Materials',
                href: 'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Agenda%20%26%20Materials%20-%20CHTF%20Meeting%203.pdf',
              },
              {
                label: 'Meeting 4 - Agenda & Materials',
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
              { label: 'Meeting 1 - YouTube', href: 'https://youtu.be/sDfvYLgstE8?t=35' },
              { label: 'Meeting 2 - YouTube', href: 'https://youtu.be/gSy3_oFjPd0' },
              { label: 'Meeting 3 - YouTube', href: 'https://youtu.be/qjldeoZ2AE0' },
              { label: 'Meeting 4 - YouTube', href: 'https://youtu.be/aJ_Pma7dzSQ' },
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
                label: 'Maine Public - Task Force Offers Roadmap',
                href: 'https://www.mainepublic.org/maine/2025-02-04/state-task-force-offers-roadmap-for-considering-on-site-cannabis-consumption-businesses',
              },
              {
                label: 'Central Maine - Still a Long Way from Lounges',
                href: 'https://www.centralmaine.com/2025/02/25/maine-inches-toward-allowing-cannabis-social-clubs/',
              },
              {
                label: 'Spectrum News - Task Force Considers Lounges',
                href: 'https://spectrumlocalnews.com/me/maine/business/2024/08/01/maine-task-force-considers-cannabis-lounges--other-on-site-options-as-industry-looks-for-areas-of-growth',
              },
              {
                label: 'MaineBiz - Cannabis Hospitality Focus',
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
