// Print layout - no chef nav wrapper, just the page content
// Root app/layout.tsx still provides <html>, <body>, and Tailwind CSS
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.75in; }
        }
      `}</style>
      {children}
    </>
  )
}
