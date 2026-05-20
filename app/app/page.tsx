'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { DocSidebar } from '@/components/sidebar/DocSidebar'
import { MDXPreview } from '@/components/preview/MDXPreview'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { RoadmapModal } from '@/components/ui/RoadmapModal'
import { UrlSuggestion } from '@/components/editor/UrlSuggestion'
import { OnboardingFlow, useOnboarding } from '@/components/onboarding/OnboardingFlow'
import { CardsGallery } from '@/components/preview/CardsGallery'
import { useDocuments } from '@/hooks/useDocuments'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/cn'

const MDXEditor = dynamic(
  () => import('@/components/editor/MDXEditor').then((m) => m.MDXEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3a7 7 0 100 14A7 7 0 0010 3z" opacity="0.3"/>
            <path d="M10 3a7 7 0 017 7" strokeLinecap="round"/>
          </svg>
          <span className="text-xs">Загрузка редактора...</span>
        </div>
      </div>
    ),
  },
)

type ViewMode = 'editor' | 'split' | 'preview' | 'cards'

const CARD_RE = /<LinkCard\s+url="([^"]+)"/g

function getStats(content: string) {
  const words    = content.trim() ? content.trim().split(/\s+/).length : 0
  const chars    = content.length
  const cards    = [...content.matchAll(CARD_RE)].length
  const readMin  = Math.max(1, Math.round(words / 200))
  const bareUrls = (content.match(/https?:\/\/[^\s"<>)[\]]+/g) ?? [])
    .filter((u) => !content.includes(`url="${u.replace(/[.,;!?)\]]+$/, '')}"`) )
    .length
  return { words, chars, cards, readMin, bareUrls }
}

function timeAgoShort(ts: number) {
  const diff = Date.now() - ts
  if (diff < 10_000) return 'только что'
  if (diff < 60_000) return `${Math.floor(diff / 1000)} с назад`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`
  return `${Math.floor(diff / 3_600_000)} ч назад`
}

export default function EditorPage() {
  const {
    docs,
    activeDoc,
    activeId,
    hydrated,
    updateContent,
    updateTitle,
    createDoc,
    deleteDoc,
    switchDoc,
    duplicateDoc,
  } = useDocuments()

  const [viewMode, setViewMode]         = useState<ViewMode>('split')
  const [paletteOpen, setPaletteOpen]   = useState(false)
  const [roadmapOpen, setRoadmapOpen]   = useState(false)
  const [suggestedUrl, setSuggestedUrl] = useState<string | null>(null)
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(new Set())
  const [savedTs, setSavedTs]           = useState<number>(Date.now())
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft]     = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef  = useRef<HTMLInputElement>(null)

  const { showOnboarding, finishOnboarding } = useOnboarding()

  // Keep a ref so onboarding callback always sees the latest activeDoc
  const activeDocRef = useRef(activeDoc)
  useEffect(() => { activeDocRef.current = activeDoc }, [activeDoc])

  const handleOnboardingDone = useCallback((insertUrl?: string) => {
    if (insertUrl) {
      const doc = activeDocRef.current
      const tag = `\n<LinkCard url="${insertUrl}" />\n`
      if (doc) {
        updateContent(doc.content + tag)
      }
    }
    finishOnboarding()
  }, [finishOnboarding, updateContent])

  const debouncedContent = useDebounce(activeDoc?.content ?? '', 400)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'k') { e.preventDefault(); setPaletteOpen(true) }
      if (meta && e.key === 'n') { e.preventDefault(); createDoc() }
      if (meta && e.key === '\\') { e.preventDefault(); setViewMode((v) => v === 'split' ? 'editor' : 'split') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [createDoc])

  // Auto-save indicator
  useEffect(() => {
    if (!activeDoc) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSavedTs(Date.now()), 1000)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [activeDoc?.content])

  // Title editing
  useEffect(() => {
    if (titleEditing) {
      setTitleDraft(activeDoc?.title ?? '')
      setTimeout(() => titleRef.current?.select(), 10)
    }
  }, [titleEditing, activeDoc?.title])

  // Switch doc → reset suggestions
  useEffect(() => {
    setSuggestedUrl(null)
    setDismissedUrls(new Set())
  }, [activeId])

  const handleUrlsDetected = useCallback(
    (newUrls: string[]) => {
      for (const url of newUrls) {
        const clean = url.replace(/[.,;!?)\]]+$/, '')
        if (!dismissedUrls.has(clean) && !(activeDoc?.content ?? '').includes(`url="${clean}"`)) {
          setSuggestedUrl(clean)
          break
        }
      }
    },
    [dismissedUrls, activeDoc?.content],
  )

  const handleInsertCard = useCallback(
    (url: string) => {
      if (!activeDoc) return
      const tag = `<LinkCard url="${url}" />`
      updateContent(activeDoc.content.replace(url, tag))
      setSuggestedUrl(null)
      setDismissedUrls((d) => new Set([...d, url]))
    },
    [activeDoc, updateContent],
  )

  const handleDismiss = useCallback((url: string) => {
    setSuggestedUrl(null)
    setDismissedUrls((d) => new Set([...d, url]))
  }, [])

  // Quick URL bar — insert card at end of document
  const handleAddUrl = useCallback((url: string) => {
    if (!activeDoc) return
    const tag = `\n<LinkCard url="${url}" />\n`
    updateContent(activeDoc.content + tag)
    setDismissedUrls((d) => new Set([...d, url]))
    setSuggestedUrl(null)
  }, [activeDoc, updateContent])

  const handleExport = () => {
    if (!activeDoc) return
    const blob = new Blob([activeDoc.content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${activeDoc.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '-')}.mdx`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const commitTitleRename = () => {
    const t = titleDraft.trim()
    if (t && t !== activeDoc?.title) updateTitle(t)
    setTitleEditing(false)
  }

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 text-gray-300">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3a9 9 0 100 18A9 9 0 0012 3z" opacity="0.2"/>
            <path d="M12 3a9 9 0 019 9" strokeLinecap="round"/>
          </svg>
          <span className="text-sm">Загрузка...</span>
        </div>
      </div>
    )
  }

  const stats   = getStats(activeDoc?.content ?? '')
  const content = activeDoc?.content ?? ''

  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* ── Onboarding ──────────────────────────────────────────────────── */}
      {showOnboarding && <OnboardingFlow onDone={handleOnboardingDone} />}

      {/* ── Command Palette ─────────────────────────────────────────────── */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        docs={docs}
        onSelectDoc={(id) => { switchDoc(id); setPaletteOpen(false) }}
        onCreateDoc={() => { createDoc(); setPaletteOpen(false) }}
      />

      {/* ── Roadmap ─────────────────────────────────────────────────────── */}
      <RoadmapModal open={roadmapOpen} onClose={() => setRoadmapOpen(false)} />

      {/* ── Left Sidebar ────────────────────────────────────────────────── */}
      <DocSidebar
        docs={docs}
        activeId={activeId}
        onSelect={switchDoc}
        onCreate={createDoc}
        onDelete={deleteDoc}
        onDuplicate={duplicateDoc}
        onRename={(id, title) => { if (id === activeId) updateTitle(title) }}
        onOpenPalette={() => setPaletteOpen(true)}
        onAddUrl={handleAddUrl}
        onOpenRoadmap={() => setRoadmapOpen(true)}
      />

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Toolbar */}
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 gap-4">

          {/* Doc title */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {titleEditing ? (
              <input
                ref={titleRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitleRename()
                  if (e.key === 'Escape') setTitleEditing(false)
                }}
                className="h-7 rounded-md border border-gray-300 px-2 text-sm font-semibold text-gray-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                style={{ minWidth: 120 }}
              />
            ) : (
              <button
                onDoubleClick={() => setTitleEditing(true)}
                title="Двойной клик для переименования"
                className="truncate text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors"
              >
                {activeDoc?.title ?? 'Документ'}
              </button>
            )}
          </div>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {[
              { mode: 'editor'  as ViewMode, icon: 'M3 4h18M3 8h18M3 12h10',                       label: 'Редактор' },
              { mode: 'split'   as ViewMode, icon: 'M12 3v18M3 3h18v18H3z',                        label: 'Оба' },
              { mode: 'preview' as ViewMode, icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', label: 'Превью' },
              { mode: 'cards'   as ViewMode, icon: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z', label: 'Карточки' },
            ].map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                className={cn(
                  'rounded-md p-1.5 transition-all',
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600',
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon}/>
                </svg>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {stats.bareUrls > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><circle cx="5.5" cy="5.5" r="5.5" opacity="0.2"/><circle cx="5.5" cy="5.5" r="2" /></svg>
                {stats.bareUrls} URL без карточки
              </div>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 1v7M3 5l3 3 3-3M1 9v1a1 1 0 001 1h8a1 1 0 001-1V9"/>
              </svg>
              .mdx
            </button>
            <button
              onClick={() => createDoc()}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 2v8M2 6h8"/>
              </svg>
              Новый
            </button>
          </div>
        </header>

        {/* Panes */}
        <div className="flex min-h-0 flex-1 overflow-hidden">

          {/* Cards gallery view */}
          {viewMode === 'cards' && (
            <div className="w-full overflow-y-auto bg-white">
              <CardsGallery
                content={content}
                onEmpty={() => setViewMode('editor')}
              />
            </div>
          )}

          {/* Editor pane */}
          {(viewMode === 'editor' || viewMode === 'split') && (
            <div
              className={cn(
                'relative flex flex-col overflow-hidden border-gray-200 bg-white',
                viewMode === 'split' ? 'w-1/2 border-r' : 'w-full',
              )}
            >
              {/* Pane label */}
              <div className="flex h-7 flex-shrink-0 items-center border-b border-gray-100 bg-gray-50/50 px-5 gap-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-300">MDX</span>
                <div className="flex-1" />
                <span className="text-[11px] text-gray-300">⌘Z отмена · ⌘⇧Z повтор</span>
              </div>

              {/* CodeMirror */}
              <div className="relative flex-1 overflow-hidden">
                <MDXEditor
                  value={content}
                  onChange={updateContent}
                  onUrlsDetected={handleUrlsDetected}
                  className="h-full"
                />

                {/* URL Suggestion popup */}
                {suggestedUrl && (
                  <div className="absolute bottom-4 left-4 right-4 z-30">
                    <UrlSuggestion
                      url={suggestedUrl}
                      onInsert={handleInsertCard}
                      onDismiss={() => handleDismiss(suggestedUrl)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview pane */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div
              className={cn(
                'flex flex-col overflow-hidden bg-white',
                viewMode === 'split' ? 'w-1/2' : 'w-full',
              )}
            >
              {/* Pane label */}
              <div className="flex h-7 flex-shrink-0 items-center border-b border-gray-100 bg-gray-50/50 px-5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-300">Превью</span>
              </div>

              <MDXPreview
                value={debouncedContent}
                className="flex-1 overflow-y-auto px-10 py-8"
              />
            </div>
          )}

        </div>

        {/* Status bar */}
        <footer className="flex h-7 flex-shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5">
          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <span>{stats.words} слов</span>
            <span>·</span>
            <span>{stats.chars} символов</span>
            <span>·</span>
            <span>~{stats.readMin} мин чтения</span>
            <span>·</span>
            <span>{stats.cards} карточек</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
            <span>Сохранено {timeAgoShort(savedTs)}</span>
          </div>
        </footer>

      </div>
    </div>
  )
}
