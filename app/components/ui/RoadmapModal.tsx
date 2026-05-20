'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/cn'

const ROADMAP: {
  status: 'done' | 'next' | 'planned' | 'idea'
  title: string
  desc: string
}[] = [
  // Done
  { status: 'done', title: 'MDX-редактор с подсветкой синтаксиса', desc: 'CodeMirror 6, live превью бок о бок' },
  { status: 'done', title: 'Server-side агрегация метаданных', desc: 'CORS bypass через API — работает с любым сайтом' },
  { status: 'done', title: 'Карточки ссылок (LinkCard)', desc: 'OG, JSON-LD, Twitter Card, HTML meta — автоматический парсинг' },
  { status: 'done', title: 'Документы в localStorage', desc: 'Без аккаунта, данные остаются в браузере' },
  { status: 'done', title: 'Экспорт в .mdx', desc: 'Файл готов к использованию в Next.js, Astro, Docusaurus' },
  { status: 'done', title: 'Command Palette (⌘K)', desc: 'Быстрый переход между документами' },

  // Next sprint
  { status: 'next', title: 'Onboarding — живая демонстрация', desc: 'Первый запуск показывает карточку без объяснений' },
  { status: 'next', title: 'Quick URL bar в сайдбаре', desc: 'Вставил URL → Enter → карточка в документе' },
  { status: 'next', title: 'Cards view — галерея карточек', desc: 'Все ссылки текущего документа в виде сетки' },

  // Planned
  { status: 'planned', title: 'Публикация документа по ссылке', desc: 'Shareable URL — документ рендерится как страница' },
  { status: 'planned', title: 'Drag & drop порядка карточек', desc: 'Перетащи карточку выше/ниже в документе' },
  { status: 'planned', title: 'Коллекции / теги', desc: 'Группировка документов по проектам или темам' },
  { status: 'planned', title: 'Кастомизация карточки', desc: 'Задай своё название, описание, обложку вручную' },
  { status: 'planned', title: 'Облачная синхронизация', desc: 'Документы доступны на всех устройствах' },
  { status: 'planned', title: 'Импорт закладок (Chrome, Safari)', desc: 'Загрузи HTML-экспорт браузера → карточки' },

  // Ideas
  { status: 'idea', title: 'AI-саммари страницы', desc: 'Автоматически напиши TL;DR для любой ссылки' },
  { status: 'idea', title: 'Расширение для браузера', desc: 'Добавь ссылку из любой вкладки одним кликом' },
  { status: 'idea', title: 'Интеграция с Notion / Obsidian', desc: 'Импорт/экспорт из существующих воркспейсов' },
  { status: 'idea', title: 'Публичные коллекции', desc: 'Поделись курируемой лентой ссылок с командой' },
]

const STATUS_META = {
  done:    { label: 'Готово',     color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  next:    { label: 'В работе',   color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500 animate-pulse' },
  planned: { label: 'Запланировано', color: 'bg-gray-100 text-gray-600',  dot: 'bg-gray-400' },
  idea:    { label: 'Идея',       color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
}

const GROUPS = [
  { status: 'done'    as const, label: 'Уже сделано' },
  { status: 'next'    as const, label: 'Прямо сейчас' },
  { status: 'planned' as const, label: 'Запланировано' },
  { status: 'idea'    as const, label: 'Идеи' },
]

interface RoadmapModalProps {
  open: boolean
  onClose: () => void
}

export function RoadmapModal({ open, onClose }: RoadmapModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-8 py-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Роадмап</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Что уже работает и куда движемся
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-8 py-6">
          <div className="flex flex-col gap-8">
            {GROUPS.map(({ status, label }) => {
              const items = ROADMAP.filter((r) => r.status === status)
              const meta  = STATUS_META[status]
              return (
                <div key={status}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn('inline-flex h-1.5 w-1.5 rounded-full', meta.dot)} />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((item) => (
                      <div
                        key={item.title}
                        className={cn(
                          'flex items-start gap-3 rounded-xl p-3.5',
                          status === 'done' ? 'bg-gray-50' : 'bg-white border border-gray-100',
                        )}
                      >
                        <span className={cn('mt-1 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', meta.color)}>
                          {meta.label}
                        </span>
                        <div>
                          <p className={cn('text-sm font-medium', status === 'done' ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-800')}>
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-8 py-4">
          <p className="text-xs text-gray-400">
            Есть идея? Напиши — добавим в список.
          </p>
        </div>

      </div>
    </div>
  )
}
