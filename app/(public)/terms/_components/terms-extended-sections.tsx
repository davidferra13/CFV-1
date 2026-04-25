import Link from 'next/link'

export default function TermsExtendedSections() {
  return (
    <>
      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">
          4. Pricing and Voluntary Contributions
        </h2>
        <p className="mb-4 leading-relaxed">
          ChefFlow is free for all chef accounts. All features are included at no cost. Where
          applicable:
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong>Voluntary contributions</strong> - chefs may optionally make a recurring monthly
            contribution to support ongoing development. Contributions do not change feature access
            and can be ended at any time.
          </li>
          <li>
            <strong>Support management</strong> - voluntary monthly contributions are handled
            securely by Stripe.
          </li>
          <li>
            <strong>Ending support</strong> - you may end your contribution at any time from your
            account settings. No partial refunds are issued for unused time.
          </li>
          <li>
            <strong>Contribution changes</strong> - we will give at least 30 days&apos; notice
            before changing suggested monthly contribution amounts. Continued use after the
            effective date constitutes acceptance of the updated terms.
          </li>
        </ul>
        <p className="mt-4 leading-relaxed">
          Client portal access is provided at no charge to all clients.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">5. Acceptable Use</h2>
        <p className="mb-4 leading-relaxed">
          You agree to use the Service only for lawful purposes and in a manner that does not
          infringe the rights of others. You must not:
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Upload or transmit false, misleading, or fraudulent information</li>
          <li>Impersonate another person or entity</li>
          <li>Use the Service to process payments for unlawful goods or services</li>
          <li>Attempt to gain unauthorized access to the Service or its underlying systems</li>
          <li>
            Scrape, crawl, or extract data from the Service in bulk without written permission
          </li>
          <li>Introduce malware, viruses, or other harmful code</li>
          <li>Use the Service to send unsolicited communications (spam)</li>
          <li>
            Violate any applicable law, including consumer protection, food safety, or tax
            regulations in your jurisdiction
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">
          6. Chef and Client Relationship
        </h2>
        <p className="leading-relaxed">
          ChefFlow provides a platform that facilitates business relationships between chefs and
          their clients. We are not an employer, agent, or representative of any chef. Chefs are
          independent professionals and are solely responsible for the services they provide,
          including compliance with applicable food handling laws, licensing requirements, health
          and safety standards, and tax obligations. ChefFlow is not liable for any disputes,
          damages, or losses arising from the services provided by a chef or received by a client.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">7. Payment Processing</h2>
        <p className="leading-relaxed">
          Payments between chefs and clients are processed by Stripe. By accepting payments through
          ChefFlow, chefs agree to{' '}
          <a
            href="https://stripe.com/legal/ssa"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:underline"
          >
            Stripe&apos;s Connected Account Agreement
          </a>
          . ChefFlow does not hold client funds on its own behalf. Standard Stripe processing fees
          apply; ChefFlow does not charge additional transaction fees.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">8. Intellectual Property</h2>
        <p className="mb-4 leading-relaxed">
          <strong>ChefFlow content</strong> - The Service, including its design, code, branding, and
          documentation, is owned by ChefFlow and protected by intellectual property law. You may
          not copy, reproduce, or create derivative works without our written permission.
        </p>
        <p className="leading-relaxed">
          <strong>Your content</strong> - You retain ownership of the content you upload to the
          Service (menus, client notes, event descriptions, photos, etc.). By uploading content, you
          grant ChefFlow a limited license to store, display, and process that content for the
          purpose of operating the Service on your behalf. We do not claim ownership of your content
          and do not use it for any other purpose.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">9. Privacy</h2>
        <p className="leading-relaxed">
          Your use of the Service is also governed by our{' '}
          <Link href="/privacy" className="text-brand-400 hover:underline">
            Privacy Policy
          </Link>
          , which is incorporated into these Terms by reference.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">10. Disclaimer of Warranties</h2>
        <p className="leading-relaxed">
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
          warranties of any kind, either express or implied, including but not limited to warranties
          of merchantability, fitness for a particular purpose, or non-infringement. We do not
          warrant that the Service will be uninterrupted, error-free, or free of viruses or other
          harmful components. We do not warrant that results obtained from the Service will be
          accurate or reliable.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">11. Limitation of Liability</h2>
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
        <h2 className="mb-4 text-xl font-semibold text-stone-100">12. Indemnification</h2>
        <p className="leading-relaxed">
          You agree to indemnify and hold ChefFlow and its affiliates harmless from any claims,
          liabilities, damages, losses, and expenses (including reasonable legal fees) arising out
          of your use of the Service, your violation of these Terms, or your violation of any
          third-party rights.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">13. Termination</h2>
        <p className="leading-relaxed">
          Either party may terminate these Terms at any time. You may terminate by cancelling your
          account. We may terminate or suspend your access immediately, without prior notice, if we
          reasonably believe you have violated these Terms or pose a risk to the platform or other
          users. Upon termination, your right to use the Service ceases immediately. Sections that
          by their nature should survive termination (including Sections 10, 11, 12) will survive.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">14. Governing Law</h2>
        <p className="leading-relaxed">
          These Terms are governed by and construed in accordance with the laws of the Commonwealth
          of Massachusetts, United States, without regard to conflict-of-law principles. Any
          disputes arising from these Terms or the Service shall be resolved in a court of competent
          jurisdiction. You waive any right to a jury trial in connection with any action or
          litigation in any way arising out of or related to these Terms.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">15. Changes to These Terms</h2>
        <p className="leading-relaxed">
          We reserve the right to modify these Terms at any time. When we do, we will revise the
          &ldquo;Last updated&rdquo; date. For material changes, we will notify you by email or by a
          prominent notice in the Service at least 15 days before the changes take effect. Continued
          use of the Service after the effective date constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">16. Contact Us</h2>
        <p className="leading-relaxed">Questions about these Terms should be directed to:</p>
        <address className="mt-4 not-italic leading-relaxed">
          <strong>ChefFlow</strong>
          <br />
          <a href="mailto:legal@cheflowhq.com" className="text-brand-400 hover:underline">
            legal@cheflowhq.com
          </a>
        </address>
      </section>
    </>
  )
}
