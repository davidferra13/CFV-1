type Props = {
  chefId: string
  featureSlug: string
  children: React.ReactNode
  mode?: 'block' | 'blur' | 'hide'
}

export async function UpgradeGate({ children }: Props) {
  return <>{children}</>
}
