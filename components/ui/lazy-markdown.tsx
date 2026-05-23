'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })

type MarkdownProps = ComponentProps<typeof ReactMarkdown>

export function LazyMarkdown(props: MarkdownProps) {
  return <ReactMarkdown {...props} />
}
