'use client'

import { useEffect, useRef, useState } from 'react'
import type { Doc } from '@/hooks/useDocuments'
import { cn } from '@/lib/cn'

interface QuickUrlBarProps {
  onAdd: (url: string) => void
}

function QuickUrlBar({ onAdd }: QuickUrlBarProps) {
  const [val, setVal]         = useState('')
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    let u = val.trim()
    if (!u) return
    if (!u.startsWith('http')) u = 'https://' + u
    try { new URL(u) } catch { return }

    setStatus('loading')
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(u)}`)
      await res.json()
    } catch { /* ignore */ } finally {
      onAdd(u)
      setVal('')
      setStatus('done')
      setTimeout(() => { setStatus('idle'); inputRef.current?.focus() }, 1200)
    }
  }

  return (
    <div className="px-3 pb-3 pt-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Добавить ссылку</p>
      <div className={cn(
        'flex items-center rounded-xl border bg-white px-2.5 py-2 transition-all',
        status === 'done' ? 'border-green-300 bg-green-50' : 'border-gray-200 focus-within:border-gray-400',
      )}>
        <input
          ref={inputRef}
          value={status === 'done' ? 'Добавлено!' : val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Вставь URL → Enter"
          disabled={status !== 'idle'}
          className={cn(
            'w-full bg-transparent text-xs outline-none',
            status === 'done' ? 'font-medium text-green-700' : 'text-gray-700 placeholder:text-gray-300',
            status === 'loading' && 'opacity-50',
          )}
        />
      </div>
    </div>
  )
}

const URL_RE = /https?:\/\/[^\s"<>)[\]]+/g
const CARD_RE = /<LinkCard\s+url="([^"]+)"/g

function getDocStats(doc: Doc) {
  const words = doc.content.trim() ? doc.content.trim().split(/\s+/).length : 0
  const cards = [...doc.content.matchAll(CARD_RE)].length
  const urls  = [...(doc.content.match(URL_RE) ?? [])].length
  return { words, cards, urls }
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60_000)  return 'только что'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

interface DocItemProps {
  doc: Doc
  active: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onRename: (title: string) => void
}

function DocItem({ doc, active, onSelect, onDelete, onDuplicate, onRename }: DocItemProps) {
  const [menu, setMenu]     = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]   = useState(doc.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef  = useRef<HTMLDivElement>(null)
  const { words, cards } = getDocStats(doc)

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.select(), 10)
  }, [editing])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    if (menu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menu])

  const commitRename = () => {
    const t = draft.trim()
    if (t && t !== doc.title) onRename(t)
    setEditing(false)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={cn(
        'group relative flex flex-col gap-0.5 rounded-lg px-3 py-2.5 cursor-pointer select-none',
        'transition-all duration-100',
        active
          ? 'bg-gray-900 text-white'
          : 'hover:bg-gray-100 text-gray-700',
      )}
    >
      {/* Title */}
      {editing ? (
        <input
          ref={inputRef}
          className="w-full rounded bg-white px-1 text-sm font-medium text-gray-900 outline-none ring-1 ring-primary-500"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setDraft(doc.title); setEditing(false) }
            e.stopPropagation()
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={cn('truncate text-sm font-medium', active ? 'text-white' : 'text-gray-800')}>
          {doc.title}
        </span>
      )}

      {/* Meta */}
      <div className={cn('flex items-center gap-2 text-xs', active ? 'text-gray-400' : 'text-gray-400')}>
        <span>{timeAgo(doc.updatedAt)}</span>
        <span>·</span>
        <span>{words} сл.</span>
        {cards > 0 && <><span>·</span><span>{cards} карт.</span></>}
      </div>

      {/* Context menu button */}
      <button
        className={cn(
          'absolute right-2 top-2.5 rounded p-0.5 opacity-0 transition-opacity',
          'group-hover:opacity-100',
          active ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700',
          menu && 'opacity-100',
        )}
        onClick={(e) => { e.stopPropagation(); setMenu((v) => !v) }}
        title="Действия"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="7" cy="3" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="7" cy="11" r="1.2"/>
        </svg>
      </button>

      {/* Dropdown menu */}
      {menu && (
        <div
          ref={menuRef}
          className="absolute right-2 top-8 z-50 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { label: 'Переименовать', action: () => { setEditing(true); setMenu(false) } },
            { label: 'Дублировать', action: () => { onDuplicate(); setMenu(false) } },
            { label: 'Удалить', action: () => { onDelete(); setMenu(false) }, danger: true },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className={cn(
                'flex w-full items-center px-3 py-2 text-left text-sm transition-colors',
                item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface DocSidebarProps {
  docs: Doc[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onRename: (id: string, title: string) => void
  onOpenPalette: () => void
  onAddUrl: (url: string) => void
  onOpenRoadmap: () => void
}

export function DocSidebar({
  docs,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
  onRename,
  onOpenPalette,
  onAddUrl,
  onOpenRoadmap,
}: DocSidebarProps) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()) || d.content.toLowerCase().includes(query.toLowerCase()))
    : docs

  const totalCards = docs.reduce((acc, d) => acc + [...d.content.matchAll(CARD_RE)].length, 0)

  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">

      {/* Logo + brand */}
      <div className="flex h-12 items-center gap-2.5 border-b border-gray-200 px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="1" fill="white" opacity="0.9"/>
            <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.5"/>
            <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.5"/>
            <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.25"/>
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-900">MDX Cards</span>
      </div>

      {/* Quick URL bar */}
      <QuickUrlBar onAdd={onAddUrl} />

      {/* Search / Command */}
      <div className="border-t border-gray-100 px-3 pt-3">
        <button
          onClick={onOpenPalette}
          className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="5" cy="5" r="3.5"/><path d="M9 9l1.5 1.5" strokeLinecap="round"/>
          </svg>
          <span className="flex-1 text-left">Поиск...</span>
          <kbd className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>
      </div>

      {/* Section: documents */}
      <div className="px-3 pt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Документы</span>
          <button
            onClick={onCreate}
            className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
            title="Новый документ"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M7 3v8M3 7h8"/>
            </svg>
          </button>
        </div>

        {/* Inline search if many docs */}
        {docs.length > 5 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Фильтр..."
            className="mb-2 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-gray-400"
          />
        )}
      </div>

      {/* Doc list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">Нет документов</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((doc) => (
              <DocItem
                key={doc.id}
                doc={doc}
                active={doc.id === activeId}
                onSelect={() => onSelect(doc.id)}
                onDelete={() => onDelete(doc.id)}
                onDuplicate={() => onDuplicate(doc.id)}
                onRename={(title) => onRename(doc.id, title)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-3 py-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex flex-col gap-0.5">
            <span>{docs.length} документ{docs.length !== 1 ? 'ов' : ''}</span>
            <span>{totalCards} карточек</span>
          </div>
          <button
            onClick={onOpenRoadmap}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100"
            title="Роадмап"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="5.5" cy="5.5" r="4.5"/>
              <path d="M5.5 3v2.5l1.5 1.5"/>
            </svg>
            Роадмап
          </button>
        </div>
      </div>

    </aside>
  )
}
