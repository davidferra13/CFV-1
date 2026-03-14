import Image from 'next/image'

type AppLogoProps = {
  size?: number
  className?: string
}

export function AppLogo({ size = 32, className = '' }: AppLogoProps) {
  return (
    <Image
      src="/logo.jpg"
      alt="ChefFlow logo"
      width={size}
      height={size}
      className={`rounded-lg object-cover ${className}`.trim()}
      priority
    />
  )
}
