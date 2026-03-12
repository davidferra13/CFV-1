export default function KDSLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950">{children}</body>
    </html>
  )
}
