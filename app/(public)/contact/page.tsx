import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Contact Us | ChefFlow',
  description: 'Have questions about ChefFlow? Get in touch with our team.',
}

const ContactForm = dynamic(() => import('./_components/contact-form'), {
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      <div className="lg:col-span-2">
        <div className="border border-stone-200 rounded-lg p-6 space-y-6">
          <div className="h-6 w-48 loading-bone loading-bone-light" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 w-20 bg-stone-100 rounded animate-pulse mb-2" />
              <div className="h-10 bg-stone-100 rounded animate-pulse" />
            </div>
          ))}
          <div className="h-12 bg-brand-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="lg:col-span-1">
        <div className="border border-stone-200 rounded-lg p-6">
          <div className="h-6 w-40 loading-bone loading-bone-light mb-6" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-lg animate-pulse flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 loading-bone loading-bone-light" />
                  <div className="h-3 w-full bg-stone-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
})

export default function ContactPage() {
  return (
    <main>
      {/* Page Header - server rendered */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4">Get in Touch</h1>
          <p className="text-lg md:text-xl text-stone-600">
            Have questions? We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Contact Form and Info - lazy loaded */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto">
          <Suspense>
            <ContactForm />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
