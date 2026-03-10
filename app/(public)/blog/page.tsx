import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/blog/posts'
import { NewsletterSignup } from '@/components/marketing/newsletter-signup'

export default function BlogIndexPage() {
  return (
    <div>
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 dark:text-stone-100 mb-4">
            ChefFlow Blog
          </h1>
          <p className="text-lg text-stone-600 dark:text-stone-300 mb-2">
            Short, practical guides for private chef operations.
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-500 mb-12">
            {BLOG_POSTS.length} articles published
          </p>

          <div className="space-y-8">
            {BLOG_POSTS.map((post) => (
              <article
                key={post.slug}
                className="group rounded-xl border border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-stone-900/60 p-6 transition-all hover:border-brand-300 dark:hover:border-brand-700/50 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800/40"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/blog/${post.slug}`} className="block">
                  <h2 className="text-xl md:text-2xl font-semibold text-stone-900 dark:text-stone-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors mb-2">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed mb-4">
                  {post.description}
                </p>
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>{post.author}</span>
                  <div className="flex items-center gap-3">
                    <span>{post.readingTime}</span>
                    <span>
                      {new Date(post.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Newsletter CTA */}
          <div className="mt-16 rounded-xl border border-brand-200 dark:border-brand-700/50 bg-brand-50/40 dark:bg-brand-950/40 p-8 text-center">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
              Get updates in your inbox
            </h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-4">
              Practical articles on pricing, clients, and operations. No spam.
            </p>
            <div className="max-w-sm mx-auto">
              <NewsletterSignup />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
