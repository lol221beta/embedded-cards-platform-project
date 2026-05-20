'use client'

import { useMemo } from 'react'
import { LinkCard, LinkCardSkeleton } from './LinkCard'
import { useMetadata } from '@/hooks/useMetadata'

const CARD_RE = /<LinkCard\s+url="([^"]+)"/g

function GalleryCard({ url }: { url: string }) {
  const state = useMetadata(url)
  if (state.status === 'loading' || state.status === 'idle') return <LinkCardSkeleton />
  if (state.status !== 'success') return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 transition-all hover:border-gray-300"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
        <path d="M7 1.5C3.96 1.5 1.5 3.96 1.5 7S3.96 12.5 7 12.5 12.5 10.04 12.5 7 10.04 1.5 7 1.5z"/>
        <path d="M7 4.5v3l2 2"/>
      </svg>
      <span className="truncate">{url}</span>
    </a>
  )
  return <LinkCard metadata={state.data} />
}

interface CardsGalleryProps {
  content: string
  onEmpty?: () => void
}

export function CardsGallery({ content, onEmpty }: CardsGalleryProps) {
  const urls = useMemo(() => {
    const matches = [...content.matchAll(CARD_RE)]
    return [...new Set(matches.map((m) => m[1]))]
  }, [content])

  if (urls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="3" width="10" height="10" rx="3"/>
            <rect x="15" y="3" width="10" height="10" rx="3"/>
            <rect x="3" y="15" width="10" height="10" rx="3"/>
            <rect x="15" y="15" width="10" height="10" rx="3" opacity="0.3"/>
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-gray-700">Пока нет карточек</p>
          <p className="mt-1 text-sm text-gray-400">
            Вставь URL в сайдбаре или в редакторе
          </p>
        </div>
        {onEmpty && (
          <button
            onClick={onEmpty}
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-gray-800"
          >
            Добавить первую ссылку
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Карточки документа</h2>
          <p className="text-xs text-gray-400">{urls.length} ссылк{urls.length === 1 ? 'а' : urls.length < 5 ? 'и' : ''}  сохранены как компоненты</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {urls.map((url) => (
          <GalleryCard key={url} url={url} />
        ))}
      </div>
    </div>
  )
}
