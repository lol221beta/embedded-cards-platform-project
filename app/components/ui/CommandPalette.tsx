'use client'

import { useEffect, useRef, useState } from 'react'
import type { Doc } from '@/hooks/useDocuments'
import { cn } from '@/lib/cn'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  docs: Doc[]
  onSelectDoc: (id: string) => void
  onCreateDoc: () => void
}

type ResultItem =
  | { type: 'doc'; doc: Doc }
  | { type: 'action'; label: string; shortcut?: string; action: () => void }

export function CommandPalette({ open, onClose, docs, onSelectDoc, onCreateDoc }: CommandPaletteProps) {
  const [query, setQuery]   = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) { setQuery(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30) }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open ? onClose() : void 0 }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const q = query.toLowerCase().trim()

  const results: ResultItem[] = [
    ...(q === '' || 'новый'.includes(q) || 'создать'.includes(q)
      ? [{ type: 'action' as const, label: 'Создать новый документ', shortcut: '⌘N', action: () => { onCreateDoc(); onClose() } }]
      : []),
    ...docs
      .filter((d) => !q || d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
      .map((doc) => ({ type: 'doc' as const, doc })),
  ]

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) {
      const item = results[cursor]
      if (item.type === 'action') item.action()
      else { onSelectDoc(item.doc.id); onClose() }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M12 12l2 2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={handleKey}
            placeholder="Поиск документов или действий..."
            className="flex-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-400">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Ничего не найдено</p>
          ) : (
            results.map((item, idx) => {
              const active = idx === cursor
              if (item.type === 'action') {
                return (
                  <button
                    key={`action-${item.label}`}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      active ? 'bg-gray-100' : 'hover:bg-gray-50',
                    )}
                    onClick={() => { item.action(); onClose() }}
                    onMouseEnter={() => setCursor(idx)}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-white">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M6 2v8M2 6h8"/>
                      </svg>
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-900">{item.label}</span>
                    {item.shortcut && <kbd className="text-xs text-gray-400">{item.shortcut}</kbd>}
                  </button>
                )
              }
              const { doc } = item
              const words = doc.content.trim() ? doc.content.trim().split(/\s+/).length : 0
              return (
                <button
                  key={doc.id}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    active ? 'bg-gray-100' : 'hover:bg-gray-50',
                  )}
                  onClick={() => { onSelectDoc(doc.id); onClose() }}
                  onMouseEnter={() => setCursor(idx)}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 1h6l3 3v7a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z" strokeLinejoin="round"/>
                      <path d="M7 1v3h3" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-gray-900">{doc.title}</span>
                    <span className="text-xs text-gray-400">{words} слов</span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
          <span><kbd className="mr-1">↑↓</kbd>навигация</span>
          <span><kbd className="mr-1">Enter</kbd>выбрать</span>
          <span><kbd className="mr-1">Esc</kbd>закрыть</span>
        </div>
      </div>
    </div>
  )
}
