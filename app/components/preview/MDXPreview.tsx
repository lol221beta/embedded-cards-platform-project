'use client'

import { useMemo } from 'react'
import { LinkCard, LinkCardSkeleton, LinkCardError } from './LinkCard'
import { useMetadata } from '@/hooks/useMetadata'
import { cn } from '@/lib/cn'

// Regex: detect bare URLs and <LinkCard url="..." /> components
const URL_RE = /https?:\/\/[^\s"<>)[\]]+/g
const LINK_CARD_RE = /<LinkCard\s+url="([^"]+)"(?:[^/]|\/(?!>))*\/>/g

type Block =
  | { type: 'text'; content: string }
  | { type: 'linkcard'; url: string }

function parseBlocks(mdx: string): Block[] {
  const blocks: Block[] = []
  let last = 0

  const regex = new RegExp(LINK_CARD_RE.source, 'g')
  let match: RegExpExecArray | null

  while ((match = regex.exec(mdx)) !== null) {
    if (match.index > last) {
      blocks.push({ type: 'text', content: mdx.slice(last, match.index) })
    }
    blocks.push({ type: 'linkcard', url: match[1] })
    last = match.index + match[0].length
  }

  if (last < mdx.length) {
    blocks.push({ type: 'text', content: mdx.slice(last) })
  }

  return blocks
}

// ─── Markdown-like renderer for text blocks ───────────────────────────────────
function renderText(text: string): React.ReactNode {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) {
      out.push(<h1 key={i} className="mb-4 mt-6 text-2xl font-bold text-gray-900">{line.slice(2)}</h1>)
    } else if (line.startsWith('## ')) {
      out.push(<h2 key={i} className="mb-3 mt-5 text-xl font-semibold text-gray-900">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      out.push(<h3 key={i} className="mb-2 mt-4 text-base font-semibold text-gray-900">{line.slice(4)}</h3>)
    } else if (line.startsWith('> ')) {
      out.push(
        <blockquote key={i} className="my-3 border-l-4 border-gray-200 pl-4 text-sm italic text-gray-500">
          {line.slice(2)}
        </blockquote>,
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      out.push(
        <li key={i} className="ml-5 list-disc text-sm text-gray-700">{line.slice(2)}</li>,
      )
    } else if (line.match(/^\d+\. /)) {
      out.push(
        <li key={i} className="ml-5 list-decimal text-sm text-gray-700">{line.replace(/^\d+\. /, '')}</li>,
      )
    } else if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      out.push(
        <pre key={i} className="my-3 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
    } else if (line.trim() === '') {
      out.push(<div key={i} className="h-3" />)
    } else {
      out.push(
        <p key={i} className="my-1.5 text-sm leading-relaxed text-gray-700">
          {inlineMarkdown(line)}
        </p>,
      )
    }

    i++
  }

  return out
}

function inlineMarkdown(text: string): React.ReactNode {
  // Bold, italic, inline code, links
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[.+?\]\(.+?\))/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="rounded bg-gray-100 px-1 py-0.5 text-xs font-mono text-gray-800">{part.slice(1, -1)}</code>
    }
    const linkMatch = part.match(/^\[(.+?)\]\((.+?)\)$/)
    if (linkMatch) {
      return <a key={idx} href={linkMatch[2]} className="text-primary-600 underline underline-offset-2" target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>
    }
    return part
  })
}

// ─── Individual card block ─────────────────────────────────────────────────────
function CardBlock({ url }: { url: string }) {
  const state = useMetadata(url)

  if (state.status === 'idle' || state.status === 'loading') {
    return <LinkCardSkeleton />
  }
  if (state.status === 'error') {
    return <LinkCardError url={url} />
  }

  return <LinkCard metadata={state.data} />
}

// ─── Main preview ──────────────────────────────────────────────────────────────
interface MDXPreviewProps {
  value: string
  className?: string
}

export function MDXPreview({ value, className }: MDXPreviewProps) {
  const blocks = useMemo(() => parseBlocks(value), [value])

  if (!value.trim()) {
    return (
      <div className={cn('flex items-center justify-center text-sm text-gray-300', className)}>
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="4" y="4" width="24" height="24" rx="4" opacity="0.4"/>
              <path d="M10 11h12M10 15h8M10 19h10" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400">Начните вводить текст</p>
          <p className="mt-1 text-xs text-gray-300">Вставьте URL — карточка появится автоматически</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {blocks.map((block, idx) => {
        if (block.type === 'linkcard') {
          return (
            <div key={idx} className="my-4">
              <CardBlock url={block.url} />
            </div>
          )
        }
        return (
          <div key={idx}>{renderText(block.content)}</div>
        )
      })}
    </div>
  )
}
