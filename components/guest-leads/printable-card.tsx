'use client'

type Props = {
  chefName: string
  tagline: string
  profileImage: string | null
  landingUrl: string
  occasion: string | null
  eventDate: string | null
}

export function PrintableCard({
  chefName,
  tagline,
  profileImage,
  landingUrl,
  occasion,
  eventDate,
}: Props) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(landingUrl)}`

  const dateLabel = eventDate
    ? new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-stone-800">
      {/* Print button (hidden when printing) */}
      <div className="print:hidden flex items-center justify-between px-6 py-4 bg-stone-900 border-b">
        <div>
          <h1 className="text-lg font-semibold text-stone-100">Table Card Preview</h1>
          <p className="text-sm text-stone-500">
            Print this card and place it on the dinner table at your events.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800"
          >
            Print Card
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-stone-600 text-stone-300 rounded-lg font-medium hover:bg-stone-800"
          >
            Back
          </button>
        </div>
      </div>

      {/* Card — optimized for 4x6 print */}
      <div className="flex items-center justify-center p-8 print:p-0">
        <div
          className="bg-stone-900 rounded-2xl shadow-lg print:shadow-none print:rounded-none overflow-hidden"
          style={{ width: '4in', height: '6in' }}
        >
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            {/* Chef photo */}
            {profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImage}
                alt={chefName}
                className="w-20 h-20 rounded-full object-cover mb-4 ring-2 ring-stone-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-stone-800 flex items-center justify-center mb-4 ring-2 ring-stone-200">
                <span className="text-2xl font-bold text-stone-400">
                  {chefName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Chef name */}
            <h2 className="text-xl font-bold text-stone-100">{chefName}</h2>
            <p className="text-sm text-stone-500 mt-0.5">{tagline}</p>

            {/* Occasion + date */}
            {(occasion || dateLabel) && (
              <p className="text-xs text-stone-400 mt-2">
                {occasion}
                {occasion && dateLabel ? ' — ' : ''}
                {dateLabel}
              </p>
            )}

            {/* Divider */}
            <div className="w-12 h-px bg-stone-700 my-5" />

            {/* CTA */}
            <p className="text-sm text-stone-400 mb-4 max-w-[2.5in] leading-relaxed">
              Enjoying tonight? Scan below to book your own private dining experience.
            </p>

            {/* QR Code */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Scan to connect"
              width={140}
              height={140}
              className="rounded-lg"
            />

            <p className="text-[10px] text-stone-300 mt-4">Scan with your phone's camera</p>
          </div>
        </div>
      </div>
    </div>
  )
}
