// Privacy Policy Page - Placeholder
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-stone-600 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="bg-brand-50 border border-brand-200 rounded-md p-6 mb-8">
              <p className="text-brand-900 font-medium">
                Privacy policy content coming soon.
              </p>
              <p className="text-brand-800 text-sm mt-2">
                We are committed to protecting your privacy. Our full privacy policy will be
                published here before launch.
              </p>
            </div>

            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
                <p className="text-stone-600">
                  Details about the information we collect will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
                <p className="text-stone-600">
                  Details about how we use your information will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Data Security</h2>
                <p className="text-stone-600">
                  Details about our data security practices will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
                <p className="text-stone-600">
                  Details about your privacy rights will be provided here.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
                <p className="text-stone-600">
                  If you have questions about our privacy practices, please contact us at{' '}
                  <a href="mailto:privacy@chefflow.com" className="text-brand-600 hover:underline">
                    privacy@chefflow.com
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
