import type { Metadata } from 'next'
import Link from 'next/link'
import { CookiePreferencesButton } from '@/components/privacy/cookie-preferences-button'
import {
  CORE_DATA_PROCESSORS,
  INTERNAL_DATA_PRACTICES,
  OPTIONAL_PRIVACY_INTEGRATIONS,
  PRIVACY_COMMITMENTS,
  PRIVACY_POLICY_LAST_UPDATED,
} from '@/lib/compliance/privacy-policy'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how ChefFlow collects, uses, and protects your personal information.',
  alternates: {
    canonical: `${BASE_URL}/privacy`,
  },
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <div className="mb-10 border-b border-stone-700/60 pb-8">
        <h1 className="text-4xl font-bold tracking-[-0.04em] text-stone-100">Privacy Policy</h1>
        <p className="mt-3 text-sm text-stone-500">Last updated: {PRIVACY_POLICY_LAST_UPDATED}</p>
      </div>

      <div className="space-y-10 text-stone-300">
        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">1. Introduction</h2>
          <p className="leading-relaxed">
            ChefFlow (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the
            ChefFlow platform at cheflowhq.com (the &ldquo;Service&rdquo;), a business operations
            tool designed for private chefs and their clients. This Privacy Policy explains what
            information we collect, how we use it, who we share it with, and what choices you have.
            By using the Service you agree to the practices described here.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">2. Information We Collect</h2>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Account information</h3>
          <p className="mb-4 leading-relaxed">
            When you create an account we collect your name, email address, and a hashed password.
            Chefs may also provide a business name, public profile tagline, bio, and profile photo.
          </p>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Event and client data</h3>
          <p className="mb-4 leading-relaxed">
            Chefs enter information about their events (dates, menus, guest counts, locations) and
            their clients (names, email addresses, contact details, dietary preferences). This data
            belongs to the chef who entered it and is processed on their behalf.
          </p>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Payment information</h3>
          <p className="mb-4 leading-relaxed">
            Payments are processed by Stripe. We do not store full credit card numbers or sensitive
            payment details on our servers. Stripe provides us with a token and basic transaction
            metadata (amount, status, last four digits) that we use to display financial records.
          </p>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Usage data</h3>
          <p className="mb-4 leading-relaxed">
            We collect information about how you interact with the Service, such as pages visited,
            features used, and actions taken. This helps us understand what is working and what
            needs improvement.
          </p>

          <h3 className="mb-2 text-base font-semibold text-stone-200">
            Live presence, activity, and admin review
          </h3>
          <p className="mb-3 leading-relaxed">
            ChefFlow includes operational monitoring so chefs can see client portal activity and
            authorized platform operators can keep the service reliable and secure. These signals
            are used for support, abuse prevention, moderation, troubleshooting, product
            improvement, and workflow continuity.
          </p>
          <ul className="mb-4 list-disc space-y-2 pl-5 leading-relaxed">
            {INTERNAL_DATA_PRACTICES.map((practice) => (
              <li key={practice.id}>
                <strong className="text-stone-200">{practice.title}</strong> - {practice.detail}
              </li>
            ))}
          </ul>

          <h3 className="mb-2 text-base font-semibold text-stone-200">Inquiry submissions</h3>
          <p className="mb-3 leading-relaxed">
            When a prospective client submits an inquiry through a chef&apos;s booking form (either
            on the chef&apos;s own website via our embeddable widget, or through a chef&apos;s
            ChefFlow profile), we collect the information provided in the form. This includes name,
            email address, phone number, event date, location, guest count, budget, dietary
            preferences, allergy information, and any free-form notes.
          </p>
          <p className="mb-3 leading-relaxed">
            Allergy and dietary restriction information is health-related data. By submitting the
            inquiry form, you agree to our Terms and this Privacy Policy, which covers the
            collection and use of this information. This data is used solely to help the chef
            prepare for your event safely.
          </p>
          <p className="mb-3 leading-relaxed">
            After you submit an inquiry, the following actions occur automatically on our platform:
          </p>
          <ul className="mb-3 list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              Your information is stored in our database and made available to the chef you are
              inquiring with.
            </li>
            <li>
              A confirmation email is sent to you via Resend (our email provider) acknowledging
              receipt of your inquiry.
            </li>
            <li>
              A private conversation thread is created between you and the chef to facilitate
              communication.
            </li>
            <li>
              An automated lead-scoring process runs on your inquiry details (event type, guest
              count, budget) to help the chef prioritize responses. This process does not make any
              decisions on your behalf.
            </li>
            <li>
              Your IP address is logged at the time of submission for spam and fraud prevention.
            </li>
          </ul>
          <p className="leading-relaxed">
            If you did not initiate this inquiry yourself and believe your information was submitted
            without your knowledge, please contact us at{' '}
            <a href="mailto:privacy@cheflowhq.com" className="text-brand-400 hover:underline">
              privacy@cheflowhq.com
            </a>{' '}
            and we will remove your data promptly.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">
            3. How We Use Your Information
          </h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>To create and manage your account and authenticate your identity</li>
            <li>To provide, operate, and improve the Service</li>
            <li>To process payments and maintain financial records on your behalf</li>
            <li>
              To send transactional emails (account confirmation, payment receipts, event
              notifications)
            </li>
            <li>To respond to support requests submitted via the contact form</li>
            <li>To detect and prevent fraud or abuse</li>
            <li>To comply with legal obligations</li>
          </ul>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
            {PRIVACY_COMMITMENTS.map((commitment) => (
              <li key={commitment.id}>
                <strong className="text-stone-200">{commitment.title}</strong> {commitment.detail}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">
            4. Third-Party Service Providers
          </h2>
          <p className="mb-4 leading-relaxed">
            We share information with third parties only to the extent necessary to operate the
            Service:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            {CORE_DATA_PROCESSORS.map((processor) => (
              <li key={processor.id}>
                <strong className="text-stone-200">{processor.name}</strong> - {processor.purpose}{' '}
                {processor.dataShared}{' '}
                <a
                  href={processor.privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:underline"
                >
                  {processor.name}&apos;s Privacy Policy
                </a>
                .{processor.notes ? ` ${processor.notes}` : ''}
              </li>
            ))}
          </ul>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            Optional user-enabled integrations
          </h3>
          <p className="mb-4 leading-relaxed">
            Some integrations are only used when a chef chooses to turn them on. When that happens,
            ChefFlow sends the minimum data needed to operate the requested integration.
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            {OPTIONAL_PRIVACY_INTEGRATIONS.map((processor) => (
              <li key={processor.id}>
                <strong className="text-stone-200">{processor.name}</strong> - {processor.purpose}{' '}
                {processor.dataShared}{' '}
                <a
                  href={processor.privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:underline"
                >
                  {processor.name}&apos;s Privacy Policy
                </a>
                .
              </li>
            ))}
          </ul>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">
            Data storage and hosting
          </h3>
          <p className="leading-relaxed">
            Your account data, client records, and event information are stored in a PostgreSQL
            database hosted on infrastructure we own and operate. We do not use third-party cloud
            database providers. Your data does not leave our servers except when shared with the
            service providers listed above for their specific purposes.
          </p>

          <h3 className="mb-2 mt-6 text-base font-semibold text-stone-200">AI-assisted features</h3>
          <p className="leading-relaxed">
            The Service includes an optional AI assistant (Remy) that helps chefs with tasks like
            drafting messages and organizing information. When you use AI-assisted features,
            relevant context from your ChefFlow workspace is processed through ChefFlow&apos;s single
            Ollama-compatible AI runtime to generate responses. In production this runtime is
            operated as a private ChefFlow service; in development it may run locally for testing.
            There is no silent fallback to a second AI provider. If the runtime is unavailable, AI
            features fail clearly. ChefFlow does not use AI to generate recipes or tell chefs what
            to cook, and you can use the Service without engaging AI features.
          </p>

          <p className="mt-4 leading-relaxed">
            Each provider listed above is contractually or operationally required to protect your
            information and use it only for the purpose of delivering their services to us.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">5. Data Retention</h2>
          <p className="leading-relaxed">
            We retain your account data for as long as your account is active. If you close your
            account, your data remains accessible to you for 30 days, after which it may be archived
            or deleted at our discretion. Event records and financial ledger entries are retained
            for a minimum of seven years to comply with standard accounting practices. You may
            request earlier deletion of non-financial personal data (see Section 6). Short-lived
            live presence is maintained in memory and expires automatically, while stored activity
            and route breadcrumb records may be retained for security, support, product operations,
            and customer data export.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">6. Your Rights and Choices</h2>
          <p className="mb-4 leading-relaxed">
            Depending on where you are located, you may have the following rights regarding your
            personal information:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              <strong className="text-stone-200">Access</strong> - request a copy of the personal
              data we hold about you
            </li>
            <li>
              <strong className="text-stone-200">Correction</strong> - request that we correct
              inaccurate or incomplete information
            </li>
            <li>
              <strong className="text-stone-200">Deletion</strong> - request deletion of your
              personal data (subject to legal retention requirements)
            </li>
            <li>
              <strong className="text-stone-200">Portability</strong> - request your data in a
              structured, machine-readable format
            </li>
            <li>
              <strong className="text-stone-200">Objection</strong> - object to processing of your
              data in certain circumstances
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            To exercise any of these rights, use our{' '}
            <a href="/data-request" className="text-brand-400 hover:underline">
              self-serve data request form
            </a>{' '}
            or email us at{' '}
            <a href="mailto:privacy@cheflowhq.com" className="text-brand-400 hover:underline">
              privacy@cheflowhq.com
            </a>
            . We will respond within 30 days. We may need to verify your identity before fulfilling
            your request.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">7. Cookies and Tracking</h2>
          <p className="leading-relaxed">
            We use cookies and similar technologies to keep you signed in, remember your
            preferences, and understand how the Service is used. We do not use third-party
            advertising cookies. Product analytics is loaded only after you accept analytics
            cookies, and we respect Do Not Track where supported. Session cookies are deleted when
            you close your browser. Persistent cookies (such as authentication tokens) have a
            defined expiry and are stored securely. You can configure your browser to reject
            cookies, but some features of the Service may not function correctly without them.
          </p>
          <CookiePreferencesButton />
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">8. Security</h2>
          <p className="leading-relaxed">
            We implement industry-standard security measures including encrypted connections (TLS),
            hashed passwords, row-level security on our database, and access controls that limit
            data access to authorized users. No method of transmission or storage is 100% secure. If
            you become aware of a security issue, please contact us immediately at{' '}
            <a href="mailto:security@cheflowhq.com" className="text-brand-400 hover:underline">
              security@cheflowhq.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">9. Children&apos;s Privacy</h2>
          <p className="leading-relaxed">
            The Service is not directed to individuals under the age of 18. We do not knowingly
            collect personal information from children. If we become aware that a child has provided
            us with personal information, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">10. Changes to This Policy</h2>
          <p className="leading-relaxed">
            We may update this Privacy Policy from time to time. When we do, we will revise the
            &ldquo;Last updated&rdquo; date at the top of this page. If the changes are material, we
            will notify you by email or by a prominent notice in the Service. Continued use of the
            Service after the effective date of any changes constitutes your acceptance of the
            revised policy.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-100">11. Contact Us</h2>
          <p className="leading-relaxed">
            If you have questions or concerns about this Privacy Policy or our data practices,
            please contact us at:
          </p>
          <address className="mt-4 not-italic leading-relaxed">
            <strong className="text-stone-200">ChefFlow</strong>
            <br />
            <a href="mailto:privacy@cheflowhq.com" className="text-brand-400 hover:underline">
              privacy@cheflowhq.com
            </a>
          </address>
        </section>
      </div>

      <div className="mt-12 border-t border-stone-700/60 pt-8">
        <Link href="/" className="text-sm font-medium text-stone-400 hover:text-stone-100">
          &larr; Back to Home
        </Link>
      </div>
    </main>
  )
}
