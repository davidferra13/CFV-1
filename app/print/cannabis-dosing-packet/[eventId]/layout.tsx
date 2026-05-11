// Print layout for cannabis dosing packet, no chef nav wrapper
// Root app/layout.tsx still provides <html>, <body>, and Tailwind CSS
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.5in; }
        }
      `}</style>
      {children}
    </>
  )
}
