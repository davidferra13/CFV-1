import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/blog/posts'

export default function BlogIndexPage() {
  return (
    <main>
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-100 mb-4">The ChefFlow Blog</h1>
          <p className="text-lg text-stone-400 mb-12">
            Tips, guides, and insights for private chefs — pricing, client management, and growing
            your business.
          </p>

          <div className="space-y-8">
            {BLOG_POSTS.map((post) => (
              <article
                key={post.slug}
                className="group rounded-xl border border-stone-700 bg-stone-900/60 p-6 transition-all hover:border-brand-700/50 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-950 text-brand-400 border border-brand-800/40"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/blog/${post.slug}`} className="block">
                  <h2 className="text-xl md:text-2xl font-semibold text-stone-100 group-hover:text-brand-400 transition-colors mb-2">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-stone-400 text-sm leading-relaxed mb-4">{post.description}</p>
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
        </div>
      </section>
    </main>
  )
}
