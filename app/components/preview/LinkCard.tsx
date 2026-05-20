'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { LinkMetadata } from '@/types/metadata'

interface LinkCardProps {
  metadata: LinkMetadata
  className?: string
}

function readingTime(wordCount: number | null): string | null {
  if (!wordCount) return null
  const min = Math.max(1, Math.round(wordCount / 200))
  return `${min} мин чтения · ${wordCount.toLocaleString('ru')} слов`
}

export function LinkCard({ metadata, className }: LinkCardProps) {
  const [imgError, setImgError] = useState(false)
  const hasImage = !!metadata.image && !imgError
  const rt = readingTime(metadata.wordCount)

  // Use excerpt (real body text) as primary content, fall back to description
  const bodyText = metadata.excerpt ?? metadata.description

  return (
    <a
      href={metadata.canonical}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white',
        'transition-all duration-200 hover:border-gray-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)]',
        'no-underline',
        className,
      )}
    >
      {/* Hero image — top banner if available */}
      {hasImage && (
        <div className="relative h-40 w-full overflow-hidden bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={metadata.image!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-3 p-5">

        {/* Source row */}
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${metadata.domain}&sz=32`}
            alt=""
            className="h-3.5 w-3.5 flex-shrink-0 rounded-sm"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
          />
          <span className="text-xs font-medium text-gray-400">{metadata.domain}</span>
          {rt && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">{rt}</span>
            </>
          )}
        </div>

        {/* Title */}
        <p className="text-base font-semibold leading-snug text-gray-900 transition-colors group-hover:text-gray-700">
          {metadata.title}
        </p>

        {/* Body excerpt — the real content, not the marketing blurb */}
        {bodyText && (
          <p className="line-clamp-4 text-sm leading-relaxed text-gray-600">
            {bodyText}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-300">
            {metadata.source}
          </span>
          <svg
            width="11" height="11" viewBox="0 0 11 11" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            className="text-gray-300 transition-colors group-hover:text-gray-500"
          >
            <path d="M4.5 2H2v7h7V6.5M6.5 2H9v2.5M9 2L5 6"/>
          </svg>
        </div>

      </div>
    </a>
  )
}

export function LinkCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded-sm animate-pulse bg-gray-100" />
          <div className="h-3 w-24 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="h-5 w-4/5 animate-pulse rounded bg-gray-200" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-3.5 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-100" />
          <div className="h-3.5 w-5/6 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mt-1 border-t border-gray-100 pt-3">
          <div className="h-3 w-12 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>
  )
}

export function LinkCardError({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="6"/><path d="M7 4v3.5M7 10h.01" strokeLinecap="round"/>
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-red-700">Не удалось загрузить страницу</p>
        <p className="truncate text-xs text-red-400">{url}</p>
      </div>
    </div>
  )
}
