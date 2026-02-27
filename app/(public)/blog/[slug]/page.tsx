import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlogPost, getAllBlogSlugs, BLOG_POSTS } from '@/lib/blog/posts'
import { JsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld'
import { BlogMarkdown } from '@/components/blog/blog-markdown'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type Props = { params: { slug: string } }

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPost(params.slug)
  if (!post) return { title: 'Post Not Found' }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${BASE_URL}/blog/${post.slug}`,
      siteName: 'ChefFlow',
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${post.slug}`,
    },
  }
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPost(params.slug)
  if (!post) notFound()

  return (
    <main>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.description,
          url: `${BASE_URL}/blog/${post.slug}`,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt || post.publishedAt,
          author: {
            '@type': 'Organization',
            name: post.author,
            url: BASE_URL,
          },
          publisher: {
            '@type': 'Organization',
            name: 'ChefFlow',
            url: BASE_URL,
            logo: {
              '@type': 'ImageObject',
              url: `${BASE_URL}/logo.jpg`,
            },
          },
          keywords: post.tags.join(', '),
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Blog', url: `${BASE_URL}/blog` },
          { name: post.title, url: `${BASE_URL}/blog/${post.slug}` },
        ]}
      />

      <article className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Blog
          </Link>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-950 text-brand-400 border border-brand-800/40"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-100 leading-tight mb-4">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-stone-500 mb-10 pb-10 border-b border-stone-700">
            <span>{post.author}</span>
            <span>
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span>{post.readingTime}</span>
          </div>

          {/* Content */}
          <BlogMarkdown content={post.content} />

          {/* CTA */}
          <div className="mt-16 rounded-xl border border-brand-700/50 bg-brand-950/40 p-8 text-center">
            <h2 className="text-2xl font-bold text-stone-100 mb-2">
              Ready to streamline your business?
            </h2>
            <p className="text-stone-300 mb-6">
              ChefFlow manages events, clients, menus, and payments — so you can focus on cooking.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Start your free trial
            </Link>
          </div>

          {/* Related Posts */}
          {(() => {
            const related = BLOG_POSTS.filter(
              (p) => p.slug !== post.slug && p.tags.some((tag) => post.tags.includes(tag))
            ).slice(0, 3)
            if (related.length === 0) return null
            return (
              <div className="mt-12 pt-12 border-t border-stone-700">
                <h2 className="text-2xl font-bold text-stone-100 mb-6">Related Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {related.map((relatedPost) => (
                    <Link
                      href={`/blog/${relatedPost.slug}`}
                      key={relatedPost.slug}
                      className="group rounded-lg border border-stone-700 p-4 transition-colors hover:border-brand-500"
                    >
                      <p className="text-xs text-stone-500 mb-2">{relatedPost.readingTime}</p>
                      <h3 className="font-semibold text-stone-100 text-sm line-clamp-2 mb-2 group-hover:text-brand-400 transition-colors">
                        {relatedPost.title}
                      </h3>
                      <p className="text-xs text-stone-400 line-clamp-3">
                        {relatedPost.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </article>
    </main>
  )
}
