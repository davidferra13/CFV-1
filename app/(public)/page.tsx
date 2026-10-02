import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, ChefHat, Compass } from '@/components/ui/icons'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import styles from './home.module.css'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Good food starts here',
  description:
    'Discover food, plan something worth sharing, find a chef, and run your food business with ChefFlow.',
  path: '/',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'ChefFlow — food, people, and possibilities',
})

const paths = [
  {
    href: '/eat',
    icon: Compass,
    label: 'Find something delicious',
    detail: 'Explore chefs, menus, and food near you.',
    number: '01',
  },
  {
    href: '/hub',
    icon: CalendarDays,
    label: 'Bring people together',
    detail: 'Make a dinner plan and keep your group in the loop.',
    number: '02',
  },
  {
    href: '/find',
    icon: ChefHat,
    label: 'Let a chef take care of it',
    detail: 'Find the right chef for your table.',
    number: '03',
  },
] as const

export default function Home() {
  return (
    <div className={styles.home} data-testid="food-home">
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>A place for your appetite</p>
          <h1 id="home-title">
            Good food.
            <br />
            Your way.
          </h1>
          <p className={styles.description}>
            Your next great meal, the people you share it with, and the chefs who make it happen.
          </p>
          <Link href="/eat" className={styles.primary}>
            Find your next meal <ArrowRight aria-hidden="true" size={18} />
          </Link>
          <p className={styles.subtle}>Explore first. No account needed.</p>
        </div>
        <figure className={styles.figure}>
          <Image
            src="/images/hero-bg.jpg"
            alt="A plated dish of colorful beets, carrot ribbons, and fresh herbs"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 55vw"
            className={styles.photo}
          />
          <figcaption className={styles.caption}>Made with care. Shared with people.</figcaption>
        </figure>
      </section>
      <section className={styles.paths} aria-labelledby="paths-title">
        <div className={styles.sectionHeading}>
          <h2 id="paths-title">What sounds good?</h2>
          <p>Start with what you want to do.</p>
        </div>
        <div className={styles.pathGrid}>
          {paths.map(({ href, icon: Icon, label, detail, number }) => (
            <Link key={href} href={href} className={styles.path}>
              <div className={styles.pathTop}>
                <Icon size={22} aria-hidden="true" />
                <span>{number}</span>
              </div>
              <h3>{label}</h3>
              <p>{detail}</p>
              <ArrowRight size={20} aria-hidden="true" className={styles.pathArrow} />
            </Link>
          ))}
        </div>
      </section>
      <section className={styles.professional} aria-labelledby="professional-title">
        <div>
          <p className={styles.eyebrow}>For the people behind the food</p>
          <h2 id="professional-title">A clearer day in your kitchen.</h2>
          <p>
            Clients, menus, events, and payments. Keep the work connected so you can focus on the
            food.
          </p>
        </div>
        <Link href="/for-operators" className={styles.secondary}>
          Explore the chef workspace <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </div>
  )
}
