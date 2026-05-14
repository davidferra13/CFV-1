import {
  createGoogleCustomSearchProvider,
  createMockWebResearchProvider,
  selectWebResearchProvider,
} from '@/lib/web-research'

export const metadata = {
  title: 'Web Research Health | ChefFlow',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function WebResearchHealthPage() {
  const selectedProvider = selectWebResearchProvider()
  const [selected, google, mock] = await Promise.all([
    selectedProvider.healthcheck(),
    createGoogleCustomSearchProvider().healthcheck(),
    createMockWebResearchProvider().healthcheck(),
  ])

  const providers = [selected, google, mock].filter(
    (provider, index, all) => all.findIndex((item) => item.provider === provider.provider) === index
  )

  return (
    <main className="min-h-screen bg-stone-950 px-6 py-12 text-stone-100">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-300">
          ChefFlow system health
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
          Trusted web research
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
          Provider status is shown without exposing API keys. External evidence remains separated
          from durable ChefFlow data, and public browse records require reviewed publication.
        </p>

        <section className="mt-8 overflow-hidden rounded-lg border border-stone-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-stone-900 text-stone-300">
              <tr>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Enabled</th>
                <th className="px-4 py-3 font-medium">Credentials</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.provider} className="border-t border-stone-800">
                  <td className="px-4 py-3 font-medium text-white">{provider.provider}</td>
                  <td className="px-4 py-3 text-stone-300">{provider.enabled ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-stone-300">{provider.credentialStatus}</td>
                  <td className="px-4 py-3 text-stone-300">{provider.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['Citations', 'External facts require visible source evidence.'],
            ['Review Gate', 'Candidates do not appear on browse pages until published.'],
            ['Secret Safety', 'Provider status never renders raw API keys.'],
          ].map(([label, description]) => (
            <div key={label} className="rounded-lg border border-stone-800 p-4">
              <h2 className="text-sm font-semibold text-white">{label}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-300">{description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
