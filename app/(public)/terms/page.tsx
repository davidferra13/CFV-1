import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — ChefFlow',
  description: 'Read the terms and conditions governing your use of the ChefFlow platform.',
}

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <div className="mb-10 border-b border-stone-700 pb-8">
        <h1 className="text-4xl font-bold tracking-tight text-stone-100">Terms of Service</h1>
        <p className="mt-3 text-sm text-stone-500">Last updated: March 21, 2026 — Version 2.0</p>
      </div>

      {/* Table of Contents */}
      <nav className="mb-12 rounded-xl border border-stone-700 bg-stone-800 p-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Contents
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-brand-400">
          {[
            'Acceptance of Terms',
            'Definitions',
            'Eligibility & Account Creation',
            'Platform Description & Role Clarification',
            'Chef-Specific Terms',
            'Client-Specific Terms',
            'Payments, Fees & Refunds',
            'Cancellation Policy',
            'Dispute Resolution',
            'Intellectual Property',
            'Disclaimer of Warranties',
            'Limitation of Liability',
            'Indemnification',
            'Account Termination & Suspension',
            'Privacy & Data Protection',
            'Third-Party Services',
            'AI Features Disclosure',
            'Acceptable Use Policy',
            'Loyalty Program',
            'Changes to These Terms',
            'General Provisions',
            'Contact',
          ].map((title, i) => (
            <li key={i}>
              <a href={`#s${i + 1}`} className="hover:underline">
                {title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-12 text-stone-300">
        {/* §1 */}
        <section id="s1">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">
            By creating an account or using the ChefFlow platform at cheflowhq.com (the
            &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service
            (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service. These Terms apply to
            all users, including Chefs, Clients, and guests who access the Service without an
            account.
          </p>
          <p className="mt-4 leading-relaxed">
            You must be at least 18 years old and legally capable of entering into binding contracts
            to create an account. By using the Service you represent that you meet these
            requirements.
          </p>
        </section>

        {/* §2 */}
        <section id="s2">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">2. Definitions</h2>
          <dl className="space-y-3 leading-relaxed">
            {[
              [
                'Chef',
                'An independent culinary professional who creates a ChefFlow account to manage their private chef or catering business.',
              ],
              [
                'Client',
                'A person who creates a ChefFlow account (via Chef invitation or standalone signup) and accesses the Client Portal.',
              ],
              [
                'Event',
                'A culinary service booking (dinner party, meal prep, private dining, catered event, etc.) tracked in ChefFlow.',
              ],
              [
                'Inquiry',
                "A request for culinary services submitted through a Chef's public page, or entered by a Chef on behalf of a Client.",
              ],
              ['Quote', 'A formal service proposal sent from a Chef to a Client through ChefFlow.'],
              [
                'Platform Fee',
                'The percentage ChefFlow deducts from Stripe-processed client payments before disbursing the remainder to the Chef. Disclosed in account settings and at Stripe Connect onboarding.',
              ],
              [
                'Stripe Connect',
                'The Stripe payment infrastructure used to process client-to-chef payments through ChefFlow.',
              ],
              [
                'Client Portal',
                'The authenticated interface at /my-events, /my-quotes, /my-chat, and related pages where Clients view Events, approve Quotes, and make payments.',
              ],
              [
                'Private AI',
                "ChefFlow's private AI (Ollama) running on ChefFlow's own infrastructure. Conversation content is processed privately and never stored on ChefFlow's servers — it stays in the Chef's browser.",
              ],
              [
                'Manual Payment',
                'A payment recorded in ChefFlow but processed outside Stripe (cash, Venmo, Zelle, PayPal, check).',
              ],
            ].map(([term, def]) => (
              <div key={term} className="grid grid-cols-[160px_1fr] gap-3">
                <dt className="font-semibold text-stone-100">{term}</dt>
                <dd>{def}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* §3 */}
        <section id="s3">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">
            3. Eligibility &amp; Account Creation
          </h2>
          <p className="mb-4 leading-relaxed">
            You must be 18 or older and legally capable of entering binding contracts. Accounts are
            limited to one per person unless ChefFlow grants written permission for additional
            accounts.
          </p>
          <p className="mb-3 leading-relaxed">You agree to:</p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Provide accurate, complete, and current information during registration and keep it
              updated
            </li>
            <li>Maintain the confidentiality of your account credentials</li>
            <li>
              Notify ChefFlow immediately at{' '}
              <a href="mailto:support@cheflowhq.com" className="text-brand-600 hover:underline">
                support@cheflowhq.com
              </a>{' '}
              if you suspect unauthorized access
            </li>
            <li>Not share login credentials with any other person</li>
          </ul>
          <p className="mt-4 leading-relaxed">
            ChefFlow reserves the right to decline account creation or terminate accounts at its
            discretion for violations of these Terms. No geographic restriction applies to account
            creation; you are solely responsible for complying with all local laws applicable to
            your use of the Service.
          </p>
        </section>

        {/* §4 */}
        <section id="s4">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">
            4. Platform Description &amp; Role Clarification
          </h2>

          <h3 className="mb-2 text-base font-semibold text-stone-200">What ChefFlow Provides</h3>
          <ul className="mb-6 list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Business management tools for independent Chefs: scheduling, client CRM, financial
              tracking, quote and invoice generation, receipt management, AI-assisted drafting, and
              reporting
            </li>
            <li>
              Payment processing via Stripe Connect: clients pay through ChefFlow&apos;s payment
              layer; ChefFlow disburses to the Chef after deducting the Platform Fee and Stripe fees
            </li>
            <li>
              Client Portal: a limited interface for Clients to view Events, approve Quotes, make
              payments, and message their Chef
            </li>
            <li>
              Public profiles: a public page for each Chef where prospective Clients can submit
              Inquiries
            </li>
          </ul>

          <h3 className="mb-2 text-base font-semibold text-stone-200">What ChefFlow Does NOT Do</h3>
          <p className="mb-3 leading-relaxed">
            ChefFlow is a software platform and payment intermediary, not a culinary service
            provider. ChefFlow does not:
          </p>
          <ul className="mb-6 list-disc space-y-2 pl-5 leading-relaxed">
            <li>Employ, supervise, or direct Chefs in the performance of culinary services</li>
            <li>Guarantee the quality, safety, taste, or outcome of any culinary service</li>
            <li>
              Verify Chef credentials, background check results, food handler certifications,
              licenses, or insurance status
            </li>
            <li>Provide food safety assurances to Clients</li>
            <li>
              Adjudicate disputes about culinary service quality (beyond Stripe payment disputes)
            </li>
            <li>Control how, when, where, or what Chefs cook</li>
          </ul>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Chef Acknowledgment</h3>
          <p className="mb-3 leading-relaxed">By creating a Chef account, you confirm:</p>
          <ol className="mb-6 list-decimal space-y-2 pl-5 leading-relaxed">
            <li>
              You are an independent business owner or contractor, not an employee of ChefFlow
            </li>
            <li>
              You are solely responsible for food safety, health code compliance, licensing, taxes,
              and insurance
            </li>
            <li>
              You have the legal right to conduct culinary services in your operating jurisdiction
            </li>
          </ol>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Client Acknowledgment</h3>
          <p className="mb-3 leading-relaxed">By creating a Client account, you confirm:</p>
          <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
            <li>
              You understand ChefFlow does not vet, endorse, or guarantee any Chef&apos;s
              qualifications
            </li>
            <li>
              You should independently verify a Chef&apos;s certifications, insurance, and
              references before booking
            </li>
            <li>Your contract for culinary services is with the Chef, not with ChefFlow</li>
          </ol>
        </section>

        {/* §5 */}
        <section id="s5">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">5. Chef-Specific Terms</h2>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            5.1 Independent Contractor Status
          </h3>
          <p className="leading-relaxed">
            Chefs are independent contractors, not employees, agents, or partners of ChefFlow.
            ChefFlow does not control the means or methods by which Chefs perform culinary services.
            Nothing in these Terms creates an employer-employee, joint venture, partnership, or
            franchisor-franchisee relationship. Chefs are solely responsible for paying
            self-employment taxes, income taxes, local taxes, and for filing all required tax
            returns. ChefFlow may issue IRS Form 1099-K or equivalent forms if required by
            applicable law.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">5.2 Chef Obligations</h3>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Maintain all licenses and permits required by applicable law, including food handler
              certifications, business licenses, health permits, and alcohol service licenses where
              applicable
            </li>
            <li>
              Comply with all food safety regulations applicable in the jurisdiction where services
              are performed
            </li>
            <li>Accurately disclose all ingredients and allergens to Clients before each Event</li>
            <li>
              Not misrepresent qualifications, certifications, cuisine specialties, or professional
              experience
            </li>
            <li>Respond to Client inquiries and dispute notices within 48 hours</li>
            <li>
              Carry appropriate general liability insurance (minimum $1,000,000 per occurrence
              recommended)
            </li>
          </ul>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            5.3 Stripe Connect &amp; Payments
          </h3>
          <p className="leading-relaxed">
            To receive client payments through ChefFlow, Chefs must complete Stripe Connect
            onboarding and agree to the{' '}
            <a
              href="https://stripe.com/legal/connect-account"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              Stripe Connected Account Agreement
            </a>
            . ChefFlow deducts the Platform Fee from each Stripe-processed payment before disbursing
            the net amount. The Platform Fee is disclosed at onboarding and in account settings; 30
            days&apos; notice is given before any fee change.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">5.4 Chef Content</h3>
          <p className="leading-relaxed">
            Chefs retain all copyright in menus, recipes, photos, pricing, and business content they
            store on ChefFlow. By uploading content, Chefs grant ChefFlow a non-exclusive,
            worldwide, royalty-free license to store, display, and transmit that content solely to
            operate the Service. This license terminates upon account deletion, subject to legal
            retention requirements. ChefFlow may use anonymized, aggregated,
            non-personally-identifiable data for platform analytics and improvement.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            5.5 Chef Prohibited Conduct
          </h3>
          <p className="mb-3 leading-relaxed">
            In addition to the Acceptable Use Policy (§18), Chefs must not:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Solicit Clients to pay outside ChefFlow for the purpose of evading the Platform Fee
            </li>
            <li>Create fake Client accounts, fake reviews, or fabricated testimonials</li>
            <li>
              Misrepresent ingredients, allergen content, sourcing claims, or certification status
            </li>
            <li>
              Add subcontractors or additional staff to an Event without disclosing this to the
              Client
            </li>
            <li>Serve alcohol at events without holding the applicable license</li>
            <li>
              Discriminate against Clients based on any protected characteristic under applicable
              law
            </li>
          </ul>
        </section>

        {/* §6 */}
        <section id="s6">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">6. Client-Specific Terms</h2>

          <h3 className="mb-2 mt-4 text-base font-semibold text-stone-200">
            6.1 Client Relationship
          </h3>
          <p className="leading-relaxed">
            Clients use ChefFlow to interact with their Chef. The service contract for culinary
            services is between the Client and the Chef. ChefFlow is a payment processing
            intermediary and software tool — not a party to, or guarantor of, culinary service
            agreements.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            6.2 Client Obligations
          </h3>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Provide accurate information including all dietary restrictions, allergies, event
              details, guest count, and venue access
            </li>
            <li>
              Disclose all known food allergies and dietary restrictions <strong>in writing</strong>{' '}
              before each Event using ChefFlow&apos;s allergy fields
            </li>
            <li>Grant the Chef appropriate access to the cooking space as agreed</li>
            <li>Pay agreed amounts on time per the payment schedule in the accepted Quote</li>
          </ul>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">6.3 Payments</h3>
          <p className="leading-relaxed">
            Clients authorize ChefFlow to charge payment methods on file for deposits, installments,
            and final balances as scheduled in the accepted Quote. Card payments are processed by
            Stripe; by making payments through ChefFlow, Clients agree to{' '}
            <a
              href="https://stripe.com/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              Stripe&apos;s terms of service
            </a>
            .
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            6.4 Chargebacks &amp; Disputes
          </h3>
          <p className="leading-relaxed">
            If you have a concern about a payment, please contact ChefFlow at{' '}
            <a href="mailto:support@cheflowhq.com" className="text-brand-600 hover:underline">
              support@cheflowhq.com
            </a>{' '}
            before initiating a credit card chargeback. Our dispute process is faster and preserves
            your relationship with your Chef. Chargebacks filed without first attempting resolution
            through ChefFlow may be treated as a violation of these Terms.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            6.5 Client Prohibited Conduct
          </h3>
          <p className="mb-3 leading-relaxed">
            In addition to the Acceptable Use Policy (§18), Clients must not:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Provide false event details, guest counts, or venue access information to influence
              pricing
            </li>
            <li>Harass, threaten, or demean Chefs through ChefFlow&apos;s messaging system</li>
            <li>Record or photograph a Chef at a private event without the Chef&apos;s consent</li>
            <li>File false, fraudulent, or retaliatory dispute or chargeback claims</li>
          </ul>
        </section>

        {/* §7 */}
        <section id="s7">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">
            7. Payments, Fees &amp; Refunds
          </h2>

          <h3 className="mb-2 mt-4 text-base font-semibold text-stone-200">
            7.1 How Payments Work
          </h3>
          <p className="leading-relaxed">
            Client payments are processed through Stripe Connect. ChefFlow acts as the payment
            collection agent for the Chef. From each Stripe-processed payment, ChefFlow deducts (1)
            the <strong>Platform Fee</strong> (percentage; disclosed in account settings) and (2){' '}
            <strong>Stripe processing fees</strong> (typically 2.9% + $0.30 per transaction in the
            US). The net amount is disbursed to the Chef&apos;s connected Stripe account on
            Stripe&apos;s standard payout schedule.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">7.2 Payment Plans</h3>
          <p className="leading-relaxed">
            Chefs may structure Events with deposit, installment, and final payment schedules set in
            the Quote. ChefFlow sends automated payment reminders per the Chef&apos;s configured
            schedule. If a Client misses a scheduled payment, ChefFlow may place the Event on hold
            until payment is received.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">7.3 Manual Payments</h3>
          <p className="leading-relaxed">
            Chefs may record Manual Payments (cash, Venmo, Zelle, PayPal, check) in ChefFlow&apos;s
            ledger. ChefFlow does not process, hold, verify, or dispute Manual Payments. Disputes
            involving Manual Payments are solely between the Chef and Client.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">7.4 Gift Cards</h3>
          <p className="leading-relaxed">
            Gift card purchases are processed via Stripe Checkout. Gift card balances are
            non-refundable credits against future Events with no cash value. Gift cards expire per
            the expiry date set by the issuing Chef, which must be disclosed at the time of
            purchase.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">7.5 Refunds</h3>
          <p className="leading-relaxed">
            Refunds for Event cancellations are governed by the Chef&apos;s published cancellation
            policy, not by ChefFlow. If a refund is approved, ChefFlow will process the Stripe
            reversal within 5–10 business days. Stripe processing fees are non-refundable.
            ChefFlow&apos;s Platform Fee may be refunded at ChefFlow&apos;s sole discretion.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            7.6 Platform Fee Changes
          </h3>
          <p className="leading-relaxed">
            ChefFlow will give at least 30 days&apos; written notice before modifying the Platform
            Fee. Continued use of the Service after the effective date constitutes acceptance.
          </p>
        </section>

        {/* §8 */}
        <section id="s8">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">8. Cancellation Policy</h2>
          <p className="mb-4 leading-relaxed">
            Each Chef publishes their own cancellation policy in their account settings. ChefFlow
            does not set or enforce universal cancellation terms between Chefs and Clients.
          </p>
          <p className="mb-4 leading-relaxed">
            If a Chef cancels an accepted Event without force majeure justification, the Client
            receives a full refund of all payments made, and the Chef may be subject to account
            review per §14.
          </p>
          <p className="leading-relaxed">
            Cancellations due to documented medical emergency, extreme weather, natural disaster, or
            other circumstances beyond a party&apos;s reasonable control may qualify for policy
            waivers. The Chef and Client should agree on the resolution directly; ChefFlow will
            process refunds consistent with their mutual agreement. ChefFlow does not adjudicate
            what qualifies as force majeure.
          </p>
        </section>

        {/* §9 */}
        <section id="s9">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">9. Dispute Resolution</h2>

          <h3 className="mb-2 mt-4 text-base font-semibold text-stone-200">
            9.1 Stripe Payment Disputes
          </h3>
          <p className="leading-relaxed">
            When a Client initiates a chargeback, ChefFlow will submit available evidence (event
            records, communications, payment history) on behalf of the Chef. The card network and
            issuing bank make the final determination. If a chargeback resolves in the Client&apos;s
            favor, ChefFlow may recover the disputed amount from the Chef&apos;s future Stripe
            payouts.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            9.2 Service Quality Disputes (Chef ↔ Client)
          </h3>
          <p className="leading-relaxed">
            ChefFlow provides communication logs, event records, Quote history, and payment records
            that both parties may use to support dispute resolution. ChefFlow does{' '}
            <strong>not</strong> adjudicate whether a culinary service met the Client&apos;s quality
            expectations — that is a matter between the Chef and Client. ChefFlow may refer parties
            to an independent mediation provider upon request; mediation costs are borne by the
            requesting party.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            9.3 Platform Disputes (User vs. ChefFlow)
          </h3>
          <p className="mb-3 leading-relaxed">
            For disputes about ChefFlow&apos;s own actions (account suspension, payment errors, data
            issues):
          </p>
          <ol className="mb-4 list-decimal space-y-2 pl-5 leading-relaxed">
            <li>
              Submit a written description of the dispute to{' '}
              <a href="mailto:support@cheflowhq.com" className="text-brand-600 hover:underline">
                support@cheflowhq.com
              </a>
            </li>
            <li>ChefFlow will respond within 15 business days</li>
            <li>
              If unresolved, the dispute proceeds to binding individual arbitration under JAMS rules
            </li>
          </ol>
          <p className="mb-2 leading-relaxed">
            <strong>Class action waiver:</strong> To the fullest extent permitted by law, users
            waive the right to bring or participate in class action lawsuits against ChefFlow.
          </p>
          <p className="leading-relaxed">
            <strong>Small claims exception:</strong> Either party may pursue claims in small claims
            court for disputes within the court&apos;s jurisdictional limit without invoking
            arbitration.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">9.4 Governing Law</h3>
          <p className="mb-3 leading-relaxed">
            These Terms are governed by applicable United States law. Jurisdiction-specific
            provisions:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              <strong>EU users:</strong> GDPR and EU consumer protection laws apply; mandatory
              arbitration may not apply per EU law
            </li>
            <li>
              <strong>UK users:</strong> UK consumer protection law applies where required
            </li>
            <li>
              <strong>Canadian users:</strong> PIPEDA applies; Quebec users are protected by
              Quebec&apos;s consumer protection act
            </li>
            <li>
              <strong>California users:</strong> CCPA/CPRA rights apply (see §15)
            </li>
          </ul>
        </section>

        {/* §10 */}
        <section id="s10">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">10. Intellectual Property</h2>

          <h3 className="mb-2 mt-4 text-base font-semibold text-stone-200">
            10.1 ChefFlow Platform IP
          </h3>
          <p className="leading-relaxed">
            All ChefFlow software, code, design, branding, trademarks, logos, documentation, and
            platform content are owned by ChefFlow and protected by applicable intellectual property
            law. You may not copy, reproduce, distribute, reverse-engineer, or create derivative
            works from the ChefFlow platform without written permission.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">10.2 Chef Content</h3>
          <p className="leading-relaxed">
            Chefs retain all copyright and ownership of menus, recipes, photos, pricing, client
            notes, and other content they create and upload. ChefFlow&apos;s license to Chef content
            is limited to operating the Service (see §5.4) and terminates upon account deletion.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">10.3 Client Content</h3>
          <p className="leading-relaxed">
            Clients retain rights to content they submit (event details, photos, messages,
            feedback). ChefFlow has a license to store and display this content to the relevant Chef
            solely to operate the Service.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">10.4 Feedback</h3>
          <p className="leading-relaxed">
            Any feedback, suggestions, or ideas you provide to ChefFlow may be implemented by
            ChefFlow without compensation, attribution, or obligation of any kind.
          </p>
        </section>

        {/* §11 */}
        <section id="s11">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">
            11. Disclaimer of Warranties
          </h2>
          <div className="rounded-lg border border-stone-600 bg-stone-800 p-5 font-mono text-sm uppercase leading-relaxed tracking-wide text-stone-200">
            <p>
              The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, either express or implied, including but not limited to
              implied warranties of merchantability, fitness for a particular purpose, or
              non-infringement.
            </p>
            <p className="mt-4">Chefflow does not warrant that:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>The service will be uninterrupted, timely, secure, or error-free</li>
              <li>Defects will be corrected</li>
              <li>The service or its infrastructure are free from viruses or harmful components</li>
              <li>
                Any chef&apos;s qualifications, licenses, background, or insurance status are valid
                or current
              </li>
              <li>
                Any culinary service will meet any particular standard of quality, safety, or
                satisfaction
              </li>
              <li>Results obtained from the service will be accurate or reliable</li>
            </ul>
          </div>
        </section>

        {/* §12 */}
        <section id="s12">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">12. Limitation of Liability</h2>
          <div className="rounded-lg border border-stone-600 bg-stone-800 p-5 font-mono text-sm uppercase leading-relaxed tracking-wide text-stone-200">
            <p>
              To the fullest extent permitted by applicable law, Chefflow and its officers,
              directors, employees, agents, and licensors shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including but not limited to:
              loss of profits or revenue, loss of data or business information, business
              interruption, reputational harm or loss of goodwill, cost of substitute services, or
              personal injury or property damage arising from culinary services provided by a chef.
            </p>
            <p className="mt-4">
              Chefflow&apos;s aggregate liability for any claim arising from or related to these
              terms or the service shall not exceed the total platform fees paid by or received from
              you in the twelve (12) months preceding the claim, or one hundred dollars (USD
              $100.00), whichever is greater.
            </p>
          </div>
          <p className="mt-4 leading-relaxed text-sm text-stone-300">
            The cap above does not apply to: ChefFlow&apos;s gross negligence or willful misconduct;
            death or personal injury directly caused by ChefFlow&apos;s negligence; fraudulent
            misrepresentation by ChefFlow; or any liability that cannot be limited by applicable law
            (including EU and UK consumer protection rights).
          </p>
        </section>

        {/* §13 */}
        <section id="s13">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">13. Indemnification</h2>

          <h3 className="mb-2 mt-4 text-base font-semibold text-stone-200">Chef Indemnification</h3>
          <p className="mb-3 leading-relaxed">
            Chefs agree to defend, indemnify, and hold ChefFlow, its affiliates, officers,
            directors, employees, and agents harmless from claims, liabilities, damages, losses, and
            expenses arising from:
          </p>
          <ul className="mb-6 list-disc space-y-2 pl-5 leading-relaxed">
            <li>Any culinary service provided or failed to be provided by the Chef</li>
            <li>
              Food safety violations, allergen incidents, foodborne illness, or health code
              violations
            </li>
            <li>Chef&apos;s breach of these Terms or violation of applicable law</li>
            <li>
              Third-party intellectual property claims related to Chef&apos;s menus, photos, or
              marketing content
            </li>
            <li>Claims by the Chef&apos;s employees, subcontractors, or assistants</li>
            <li>False or misleading representations in the Chef&apos;s profile</li>
          </ul>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Client Indemnification</h3>
          <p className="mb-3 leading-relaxed">
            Clients agree to defend, indemnify, and hold ChefFlow harmless from claims arising from:
          </p>
          <ul className="mb-6 list-disc space-y-2 pl-5 leading-relaxed">
            <li>Client&apos;s breach of these Terms</li>
            <li>False or fraudulent dispute or chargeback claims</li>
            <li>
              Claims by guests or third parties directly resulting from the Client&apos;s own acts
              or omissions at the Event venue (e.g., unsafe premises conditions, failure to disclose
              known hazards)
            </li>
            <li>Client&apos;s provision of false allergen or event information</li>
          </ul>

          <p className="leading-relaxed text-sm text-stone-300">
            <strong>Mutual carve-out:</strong> Neither party is required to indemnify the other for
            claims caused by the indemnified party&apos;s own gross negligence, willful misconduct,
            or fraudulent acts.
          </p>
        </section>

        {/* §14 */}
        <section id="s14">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">
            14. Account Termination &amp; Suspension
          </h2>

          <h3 className="mb-2 mt-4 text-base font-semibold text-stone-200">
            Immediate Termination (No Warning)
          </h3>
          <p className="mb-3 leading-relaxed">
            ChefFlow may terminate an account immediately and without prior notice for:
          </p>
          <ul className="mb-6 list-disc space-y-2 pl-5 leading-relaxed">
            <li>Payment fraud, identity theft, or financial misrepresentation</li>
            <li>Food safety violations causing documented illness or injury</li>
            <li>Sexual harassment or credible threats of violence directed at another user</li>
            <li>Illegal content, child exploitation, or activity facilitating serious harm</li>
            <li>
              Willful and repeated misrepresentation of credentials, allergens, or qualifications
            </li>
          </ul>

          <h3 className="mb-2 text-base font-semibold text-stone-200">
            Suspension with 14-Day Cure Period
          </h3>
          <p className="mb-3 leading-relaxed">
            ChefFlow may suspend an account with written notice and 14 days to remedy for:
          </p>
          <ul className="mb-6 list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Repeated Chef-initiated Event cancellations (more than 2 in any 60-day period) without
              documented force majeure
            </li>
            <li>Failure to respond to Client communications or dispute notices within 72 hours</li>
            <li>Accumulating Client quality complaints without good-faith remediation</li>
            <li>
              Failure to pay applicable ChefFlow fees after 30 days&apos; notice (when billing is
              active)
            </li>
          </ul>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Appeal Process</h3>
          <p className="mb-6 leading-relaxed">
            A suspended user may appeal within 14 days by sending a written appeal to{' '}
            <a href="mailto:support@cheflowhq.com" className="text-brand-600 hover:underline">
              support@cheflowhq.com
            </a>
            . ChefFlow will respond within 10 business days. Reinstatement is at ChefFlow&apos;s
            sole discretion.
          </p>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Effect of Termination</h3>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Your right to access the Service ceases immediately</li>
            <li>You have 30 days to download your data via the account export function</li>
            <li>
              After 30 days, ChefFlow may delete your account data, subject to legal retention
              obligations
            </li>
            <li>
              Transaction records and financial ledger entries are retained for a minimum of 7 years
            </li>
            <li>Sections §10, §11, §12, §13, and §9 survive termination</li>
          </ul>
        </section>

        {/* §15 */}
        <section id="s15">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">
            15. Privacy &amp; Data Protection
          </h2>
          <p className="mb-4 leading-relaxed">
            ChefFlow&apos;s full data practices are described in our{' '}
            <Link href="/privacy" className="text-brand-600 hover:underline">
              Privacy Policy
            </Link>
            , which is incorporated into these Terms by reference. ChefFlow does not sell personal
            data to third parties and does not use user data for third-party advertising. All data
            transmitted to and from ChefFlow is encrypted in transit (TLS) and at rest.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">AI Data Handling</h3>
          <p className="mb-4 leading-relaxed">
            Remy conversations are processed by ChefFlow&apos;s private AI infrastructure (Ollama)
            and are <strong>never stored on ChefFlow&apos;s servers</strong>. Conversation history
            lives in the Chef&apos;s browser (IndexedDB) and never leaves their device. ChefFlow
            collects only anonymous usage metrics (counts and categories — never conversation
            content).
          </p>
          <p className="mb-6 leading-relaxed">
            Some non-conversation features use external APIs for item-level data: Spoonacular
            (nutrition), Kroger and MealMe (grocery pricing), and Instacart (cart links). These
            services receive ingredient or product names only — never client PII, conversation
            content, or personally identifiable information. If Ollama is offline, private AI
            features display an error rather than fall back to any external AI service.
          </p>

          <h3 className="mb-2 text-base font-semibold text-stone-200">GDPR (EU Users)</h3>
          <p className="mb-6 leading-relaxed">
            ChefFlow processes EU personal data pursuant to GDPR Article 6(b) and 6(f). EU users
            have the right to access, rectify, erase, port, and restrict their personal data.
            Contact{' '}
            <a href="mailto:privacy@cheflowhq.com" className="text-brand-600 hover:underline">
              privacy@cheflowhq.com
            </a>{' '}
            to exercise these rights; ChefFlow will respond within 30 days. ChefFlow notifies
            affected users of confirmed data breaches within 72 hours.
          </p>

          <h3 className="mb-2 text-base font-semibold text-stone-200">CCPA (California Users)</h3>
          <p className="mb-6 leading-relaxed">
            California residents have the right to know what personal information ChefFlow collects,
            request deletion, and opt out of sale (ChefFlow does not sell personal information).
            Requests may be submitted to{' '}
            <a href="mailto:privacy@cheflowhq.com" className="text-brand-600 hover:underline">
              privacy@cheflowhq.com
            </a>
            .
          </p>

          <h3 className="mb-2 text-base font-semibold text-stone-200">PIPEDA (Canadian Users)</h3>
          <p className="leading-relaxed">
            ChefFlow collects, uses, and discloses personal information with the knowledge and
            consent of the individual. Consent may be withdrawn at any time, subject to legal or
            contractual restrictions. Contact{' '}
            <a href="mailto:privacy@cheflowhq.com" className="text-brand-600 hover:underline">
              privacy@cheflowhq.com
            </a>{' '}
            to submit a request.
          </p>
        </section>

        {/* §16 */}
        <section id="s16">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">16. Third-Party Services</h2>
          <p className="mb-4 leading-relaxed">
            The Service integrates with the following third-party providers. ChefFlow is not
            responsible for the terms, availability, security, or data practices of any third party.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-left">
                  <th className="pb-2 pr-4 font-semibold text-stone-100">Provider</th>
                  <th className="pb-2 pr-4 font-semibold text-stone-100">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {[
                  ['Stripe', 'Payment processing & Stripe Connect disbursements'],
                  ['Supabase', 'Database hosting & authentication'],
                  ['Vercel', 'Application hosting'],
                  ['Google', 'Calendar sync, Gmail integration (optional, Chef-authorized)'],
                  [
                    'Ollama',
                    'Private AI inference on ChefFlow infrastructure (conversations never stored on servers)',
                  ],
                  ['Resend', 'Transactional email delivery'],
                  [
                    'Spoonacular / Kroger / MealMe',
                    'Grocery pricing estimates (ingredient data only; no PII)',
                  ],
                  ['Instacart', 'Grocery cart link generation only (no pricing data transmitted)'],
                  ['OpenStreetMap', 'Address geocoding (address used; no PII stored by OSM)'],
                ].map(([provider, purpose]) => (
                  <tr key={provider}>
                    <td className="py-2 pr-4 font-medium text-stone-200">{provider}</td>
                    <td className="py-2 text-stone-300">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* §17 */}
        <section id="s17">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">17. AI Features Disclosure</h2>
          <p className="mb-4 leading-relaxed">
            ChefFlow incorporates AI-assisted features to help chefs with drafting, scheduling, and
            business analysis. By using these features, you acknowledge:
          </p>
          <ol className="list-decimal space-y-3 pl-5 leading-relaxed">
            <li>
              <strong>All AI output is a draft or suggestion.</strong> No AI output becomes
              canonical or takes effect without your explicit confirmation.
            </li>
            <li>
              <strong>AI does not make autonomous decisions.</strong> ChefFlow AI never initiates
              ledger entries, event state transitions, client data changes, or payments without
              human approval.
            </li>
            <li>
              <strong>Conversations are private by architecture.</strong> Remy conversations are
              processed on ChefFlow&apos;s own private infrastructure (Ollama) and are never stored
              on ChefFlow&apos;s servers. Conversation history lives in your browser only. ChefFlow
              structurally cannot access your conversation content.
            </li>
            <li>
              <strong>Some features use external APIs for non-sensitive data.</strong> Grocery
              pricing (Spoonacular, Kroger, MealMe) and cart links (Instacart) send item-level data
              only (e.g., &ldquo;broccoli price&rdquo;) — never client PII or conversation content.
            </li>
            <li>
              <strong>Ollama offline behavior.</strong> If Ollama is not running, private AI
              features will fail with an error message and will not fall back to any external AI
              provider.
            </li>
            <li>
              <strong>You may opt out.</strong> Any AI feature may be declined without losing access
              to the platform&apos;s core functionality.
            </li>
          </ol>
        </section>

        {/* §18 */}
        <section id="s18">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">18. Acceptable Use Policy</h2>

          <h3 className="mb-2 mt-4 text-base font-semibold text-stone-200">All Users</h3>
          <ul className="mb-6 list-disc space-y-2 pl-5 leading-relaxed">
            <li>No illegal activity or facilitating illegal activity</li>
            <li>No fraud, misrepresentation, or deliberate deception</li>
            <li>No harassment, threats, or discrimination based on any protected characteristic</li>
            <li>No unauthorized access, hacking, scraping, or bot usage</li>
            <li>No malware, viruses, ransomware, or other harmful code</li>
            <li>No circumvention of payment processing to avoid the Platform Fee</li>
            <li>No spam or unsolicited commercial communications</li>
            <li>No resale or sublicensing of Service access without written permission</li>
          </ul>

          <h3 className="mb-2 text-base font-semibold text-stone-200">
            Additional Prohibitions for Chefs
          </h3>
          <ul className="mb-6 list-disc space-y-2 pl-5 leading-relaxed">
            <li>No fake Client accounts, fabricated reviews, or manufactured testimonials</li>
            <li>No events without required local licenses or food handler certifications</li>
            <li>No alcohol service without the applicable license</li>
            <li>
              No misrepresentation of ingredient sourcing, allergen content, or dietary compliance
            </li>
            <li>No undisclosed subcontracting of culinary services</li>
          </ul>

          <h3 className="mb-2 text-base font-semibold text-stone-200">
            Additional Prohibitions for Clients
          </h3>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              No false event details, guest counts, or venue access information to manipulate
              pricing
            </li>
            <li>No fraudulent or retaliatory dispute or chargeback claims</li>
            <li>No recording or filming of a Chef at a private event without consent</li>
            <li>
              No harassment or public defamation of Chefs through platform reviews or messages
            </li>
          </ul>
        </section>

        {/* §19 */}
        <section id="s19">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">19. Loyalty Program</h2>
          <p className="mb-4 leading-relaxed">
            ChefFlow provides infrastructure for Chefs to run loyalty point programs for their
            Clients. Loyalty points:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Are awarded by Chefs to Clients at the Chef&apos;s configured rate</li>
            <li>Have no cash value and are non-transferable between Clients or Chefs</li>
            <li>May be redeemed for discounts on future Events as configured by the Chef</li>
            <li>May be modified or discontinued by the Chef with 30 days&apos; notice</li>
            <li>
              Expire per the expiry configuration set by the Chef, disclosed at the time of award
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            ChefFlow reserves the right to modify or discontinue the loyalty program infrastructure
            with 30 days&apos; notice.
          </p>
        </section>

        {/* §20 */}
        <section id="s20">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">20. Changes to These Terms</h2>
          <p className="leading-relaxed">
            ChefFlow reserves the right to modify these Terms at any time. For material changes, we
            will notify affected users by email and/or prominent in-app notice at least{' '}
            <strong>30 days</strong> before the changes take effect (15 days for minor or clarifying
            changes). Continued use of the Service after the effective date constitutes acceptance
            of the revised Terms. If you disagree with a change, you may terminate your account
            before the effective date without penalty.
          </p>
        </section>

        {/* §21 */}
        <section id="s21">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">21. General Provisions</h2>
          <dl className="space-y-4 leading-relaxed">
            <div>
              <dt className="font-semibold text-stone-100">Entire Agreement</dt>
              <dd className="mt-1">
                These Terms, together with the Privacy Policy and any service-specific addenda,
                constitute the entire agreement between you and ChefFlow and supersede all prior
                agreements.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-100">Severability</dt>
              <dd className="mt-1">
                If any provision is found to be unenforceable, it will be modified to the minimum
                extent necessary, or severed if modification is not possible. Remaining provisions
                continue in full force.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-100">No Waiver</dt>
              <dd className="mt-1">
                ChefFlow&apos;s failure to enforce any provision does not constitute a waiver of
                ChefFlow&apos;s right to enforce it in the future.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-100">Assignment</dt>
              <dd className="mt-1">
                You may not assign your rights or obligations without ChefFlow&apos;s prior written
                consent. ChefFlow may assign these Terms in connection with a merger, acquisition,
                or sale of assets, with notice to you.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-100">Force Majeure</dt>
              <dd className="mt-1">
                Neither party is liable for failure to perform obligations that are impossible due
                to circumstances beyond their reasonable control, including pandemic, natural
                disaster, government action, or telecommunications failure.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-100">Notice</dt>
              <dd className="mt-1">
                Legal notices to ChefFlow must be sent to{' '}
                <a href="mailto:legal@cheflowhq.com" className="text-brand-600 hover:underline">
                  legal@cheflowhq.com
                </a>
                . Notices to users will be sent to the email address on file.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-100">Electronic Agreement</dt>
              <dd className="mt-1">
                These Terms are a legally binding agreement entered into electronically. Your
                electronic agreement has the same legal effect as a physical signature.
              </dd>
            </div>
          </dl>
        </section>

        {/* §22 */}
        <section id="s22">
          <h2 className="mb-4 text-xl font-semibold text-stone-100">22. Contact</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Support', 'support@cheflowhq.com'],
              ['Legal', 'legal@cheflowhq.com'],
              ['Privacy', 'privacy@cheflowhq.com'],
              ['Security', 'security@cheflowhq.com'],
            ].map(([label, email]) => (
              <div key={label} className="rounded-lg border border-stone-700 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {label}
                </p>
                <a
                  href={`mailto:${email}`}
                  className="mt-1 block text-sm text-brand-600 hover:underline"
                >
                  {email}
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-12 border-t border-stone-700 pt-8">
        <Link href="/" className="text-sm font-medium text-stone-300 hover:text-stone-100">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  )
}
