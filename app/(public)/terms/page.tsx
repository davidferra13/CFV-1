import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — ChefFlow',
  description: 'Read the terms and conditions governing your use of the ChefFlow platform.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <div className="mb-10 border-b border-stone-200 pb-8">
        <h1 className="text-4xl font-bold tracking-tight text-stone-900">Terms of Service</h1>
        <p className="mt-3 text-sm text-stone-500">Last updated: March 1, 2026</p>
      </div>

      <div className="space-y-10 text-stone-700">
        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">
            By creating an account or using the ChefFlow platform at cheflowhq.com (the
            &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;).
            If you do not agree, do not use the Service. These Terms apply to all users, including chefs,
            clients, and guests who interact with the Service without an account.
          </p>
          <p className="mt-4 leading-relaxed">
            You must be at least 18 years old to create an account. By using the Service you represent
            that you meet this requirement and have the legal authority to enter into this agreement.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">2. Description of Service</h2>
          <p className="leading-relaxed">
            ChefFlow is a business operations platform for private chefs. It provides tools for managing
            events, menus, client communications, proposals, and payments. ChefFlow is a software platform
            only — we are not a party to any agreement between a chef and their client, do not employ
            chefs, and do not guarantee the quality or safety of any culinary services arranged through
            the platform.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">3. Accounts and Registration</h2>
          <p className="mb-4 leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials and for
            all activity that occurs under your account. You agree to:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Provide accurate, complete, and current information during registration</li>
            <li>Update your information if it changes</li>
            <li>Notify us immediately at{' '}
              <a href="mailto:support@cheflowhq.com" className="text-brand-600 hover:underline">
                support@cheflowhq.com
              </a>{' '}
              if you suspect unauthorized access to your account
            </li>
            <li>Not share your account credentials with others</li>
          </ul>
          <p className="mt-4 leading-relaxed">
            We reserve the right to suspend or terminate accounts that violate these Terms or that
            have been inactive for an extended period.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">4. Subscription and Billing</h2>
          <p className="mb-4 leading-relaxed">
            Chef accounts are offered on a subscription basis. Where applicable:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              <strong>Free trial</strong> — new chef accounts may include a 14-day free trial. No payment
              is required to start the trial. At the end of the trial, a subscription fee will be charged
              unless you cancel beforehand.
            </li>
            <li>
              <strong>Billing</strong> — subscriptions are billed monthly in advance. Payment is processed
              securely by Stripe.
            </li>
            <li>
              <strong>Cancellation</strong> — you may cancel your subscription at any time from your
              account settings. Access continues until the end of the current billing period; no partial
              refunds are issued for unused time.
            </li>
            <li>
              <strong>Price changes</strong> — we will give at least 30 days&apos; notice before
              increasing subscription prices. Continued use after the effective date constitutes
              acceptance of the new price.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            Client portal access is provided at no charge to clients of subscribed chefs.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">5. Acceptable Use</h2>
          <p className="mb-4 leading-relaxed">
            You agree to use the Service only for lawful purposes and in a manner that does not infringe
            the rights of others. You must not:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Upload or transmit false, misleading, or fraudulent information</li>
            <li>Impersonate another person or entity</li>
            <li>Use the Service to process payments for unlawful goods or services</li>
            <li>Attempt to gain unauthorized access to the Service or its underlying systems</li>
            <li>Scrape, crawl, or extract data from the Service in bulk without written permission</li>
            <li>Introduce malware, viruses, or other harmful code</li>
            <li>Use the Service to send unsolicited communications (spam)</li>
            <li>
              Violate any applicable law, including consumer protection, food safety, or tax regulations
              in your jurisdiction
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">6. Chef and Client Relationship</h2>
          <p className="leading-relaxed">
            ChefFlow provides a platform that facilitates business relationships between chefs and their
            clients. We are not an employer, agent, or representative of any chef. Chefs are independent
            professionals and are solely responsible for the services they provide, including compliance
            with applicable food handling laws, licensing requirements, health and safety standards,
            and tax obligations. ChefFlow is not liable for any disputes, damages, or losses arising
            from the services provided by a chef or received by a client.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">7. Payment Processing</h2>
          <p className="leading-relaxed">
            Payments between chefs and clients are processed by Stripe. By accepting payments through
            ChefFlow, chefs agree to{' '}
            <a
              href="https://stripe.com/legal/ssa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              Stripe&apos;s Connected Account Agreement
            </a>
            . ChefFlow does not hold client funds on its own behalf. Standard Stripe processing fees
            apply; ChefFlow does not charge additional transaction fees beyond the subscription.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">8. Intellectual Property</h2>
          <p className="mb-4 leading-relaxed">
            <strong>ChefFlow content</strong> — The Service, including its design, code, branding, and
            documentation, is owned by ChefFlow and protected by intellectual property law. You may not
            copy, reproduce, or create derivative works without our written permission.
          </p>
          <p className="leading-relaxed">
            <strong>Your content</strong> — You retain ownership of the content you upload to the
            Service (menus, client notes, event descriptions, photos, etc.). By uploading content, you
            grant ChefFlow a limited license to store, display, and process that content for the purpose
            of operating the Service on your behalf. We do not claim ownership of your content and do
            not use it for any other purpose.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">9. Privacy</h2>
          <p className="leading-relaxed">
            Your use of the Service is also governed by our{' '}
            <Link href="/privacy" className="text-brand-600 hover:underline">
              Privacy Policy
            </Link>
            , which is incorporated into these Terms by reference.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">10. Disclaimer of Warranties</h2>
          <p className="leading-relaxed">
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties
            of any kind, either express or implied, including but not limited to warranties of
            merchantability, fitness for a particular purpose, or non-infringement. We do not warrant
            that the Service will be uninterrupted, error-free, or free of viruses or other harmful
            components. We do not warrant that results obtained from the Service will be accurate
            or reliable.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">11. Limitation of Liability</h2>
          <p className="leading-relaxed">
            To the fullest extent permitted by applicable law, ChefFlow and its officers, directors,
            employees, and agents shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including loss of profits, data, or goodwill, arising
            out of or in connection with your use of the Service, even if we have been advised of the
            possibility of such damages. Our total liability for any claim arising from or related to
            the Service shall not exceed the greater of (a) the amount you paid us in the three months
            preceding the claim, or (b) $100.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">12. Indemnification</h2>
          <p className="leading-relaxed">
            You agree to indemnify and hold ChefFlow and its affiliates harmless from any claims,
            liabilities, damages, losses, and expenses (including reasonable legal fees) arising out
            of your use of the Service, your violation of these Terms, or your violation of any
            third-party rights.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">13. Termination</h2>
          <p className="leading-relaxed">
            Either party may terminate these Terms at any time. You may terminate by cancelling your
            account. We may terminate or suspend your access immediately, without prior notice, if we
            reasonably believe you have violated these Terms or pose a risk to the platform or other
            users. Upon termination, your right to use the Service ceases immediately. Sections that
            by their nature should survive termination (including Sections 10, 11, 12) will survive.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">14. Governing Law</h2>
          <p className="leading-relaxed">
            These Terms are governed by and construed in accordance with the laws of the United States,
            without regard to conflict-of-law principles. Any disputes arising from these Terms or the
            Service shall be resolved in a court of competent jurisdiction. You waive any right to a
            jury trial in connection with any action or litigation in any way arising out of or related
            to these Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">15. Changes to These Terms</h2>
          <p className="leading-relaxed">
            We reserve the right to modify these Terms at any time. When we do, we will revise the
            &ldquo;Last updated&rdquo; date. For material changes, we will notify you by email or by
            a prominent notice in the Service at least 15 days before the changes take effect.
            Continued use of the Service after the effective date constitutes acceptance of the
            revised Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">16. Contact Us</h2>
          <p className="leading-relaxed">
            Questions about these Terms should be directed to:
          </p>
          <address className="mt-4 not-italic leading-relaxed">
            <strong>ChefFlow</strong>
            <br />
            <a href="mailto:legal@cheflowhq.com" className="text-brand-600 hover:underline">
              legal@cheflowhq.com
            </a>
          </address>
        </section>
      </div>

      <div className="mt-12 border-t border-stone-200 pt-8">
        <Link
          href="/"
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          &larr; Back to Home
        </Link>
      </div>
    </main>
  )
}
