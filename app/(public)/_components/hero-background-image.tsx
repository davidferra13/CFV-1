import Image from 'next/image'

export function HeroBackgroundImage() {
  return (
    <>
      <style>{`
        @keyframes ken-burns {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.08) translate(-1%, -0.5%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-bg-ken-burns { animation: none !important; }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          opacity: 0.25,
        }}
      >
        <Image
          src="/images/hero-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          priority
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAALABQDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAUGBAf/xAAjEAACAQQBAwUAAAAAAAAAAAACAwEABAYRBwcSIRMjMTJC/8QAFgEBAQEAAAAAAAAAAAAAAAAABQME/8QAGxEBAAICAwAAAAAAAAAAAAAAAQACERIhIjH/2gAMAwEAAhEDEQA/AF+Y5Y/H+PWFkoze7xBDG+2lvTjPsiXzCbYRO5Q4vcg/zFUa0resPWAT18d0brRw9nb25ExCQWe58jGqMs62yHMVrbo1fGdLnmQKd90RRUFLT39poqwuJkak/9k="
          style={{
            objectFit: 'cover',
            objectPosition: 'center 40%',
            animation: 'ken-burns 20s ease-out forwards',
          }}
          className="hero-bg-ken-burns"
        />
      </div>
    </>
  )
}
