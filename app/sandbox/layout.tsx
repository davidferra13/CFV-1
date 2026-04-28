export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-cf-portal="sandbox"
      data-cf-surface="home-v2"
      className="relative flex min-h-screen flex-col overflow-x-clip bg-[#e5ded2]"
    >
      {children}
    </div>
  )
}
