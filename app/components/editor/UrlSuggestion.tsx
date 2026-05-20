'use client'

import { useMetadata } from '@/hooks/useMetadata'
import { LinkCardSkeleton } from '@/components/preview/LinkCard'
import { cn } from '@/lib/cn'

interface UrlSuggestionProps {
  url: string
  onInsert: (url: string) => void
  onDismiss: () => void
}

export function UrlSuggestion({ url, onInsert, onDismiss }: UrlSuggestionProps) {
  const state = useMetadata(url)
  const ready = state.status === 'success'

  return (
    <div className={cn(
      'rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden',
      'ring-1 ring-gray-200/50',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="white">
              <path d="M4.5 0C2 0 0 2 0 4.5S2 9 4.5 9 9 7 9 4.5 7 0 4.5 0zm0 7V4H3m3 0L4.5 2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-700">Обнаружена ссылка</span>
          {state.status === 'success' && state.cached && (
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">из кэша</span>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M10 2L2 10M2 2l8 8"/>
          </svg>
        </button>
      </div>

      {/* Card preview */}
      <div className="p-3">
        {(state.status === 'loading' || state.status === 'idle') && <LinkCardSkeleton />}

        {state.status === 'error' && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
            <span>⚠</span> Не удалось загрузить метаданные
          </div>
        )}

        {state.status === 'success' && (
          <div className="flex gap-3">
            {state.data.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.data.image}
                alt=""
                className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
              />
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-[11px] font-medium text-gray-400">{state.data.domain}</p>
              <p className="line-clamp-2 text-sm font-semibold text-gray-900">{state.data.title}</p>
              {state.data.description && (
                <p className="line-clamp-1 text-xs text-gray-500">{state.data.description}</p>
              )}
              <p className="mt-1 text-[10px] text-gray-300">Источник: {state.data.source}</p>
            </div>
          </div>
        )}
      </div>

      {/* URL display */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
        <p className="truncate text-[11px] font-mono text-gray-400">{url}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
        <button
          onClick={() => onInsert(url)}
          disabled={!ready}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all',
            'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 1v7M3 5l3 3 3-3M1 10h10"/>
          </svg>
          Вставить карточку
        </button>
        <button
          onClick={onDismiss}
          className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
        >
          Оставить URL
        </button>
      </div>
    </div>
  )
}
