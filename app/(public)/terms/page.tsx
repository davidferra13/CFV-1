// Terms of Service Page - Placeholder
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Terms of Service - ChefFlow' }
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-stone-600 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="bg-brand-50 border border-brand-200 rounded-md p-6 mb-8">
              <p className="text-brand-900 font-medium">
                Terms of service content coming soon.
              </p>
              <p className="text-brand-800 text-sm mt-2">
                Our complete terms of service will be published here before launch.
              </p>
            </div>

            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">Agreement to Terms</h2>
                <p className="text-stone-600">
                  Details about the agreement to terms will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Use of Service</h2>
                <p className="text-stone-600">
                  Details about acceptable use of the service will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">User Accounts</h2>
                <p className="text-stone-600">
                  Details about user account responsibilities will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Payment Terms</h2>
                <p className="text-stone-600">
                  Details about payment terms and billing will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
                <p className="text-stone-600">
                  Details about limitation of liability will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Termination</h2>
                <p className="text-stone-600">
                  Details about account termination will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
                <p className="text-stone-600">
                  If you have questions about our terms of service, please contact us at{' '}
                  <a href="mailto:legal@chefflow.com" className="text-brand-600 hover:underline">
                    legal@chefflow.com
                  </a>
                </p>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t">
              <Link href="/">
                <Button variant="secondary">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
