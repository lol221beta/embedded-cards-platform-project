'use client'

import { useCallback, useEffect, useState } from 'react'

export interface Doc {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'mdx-cards-documents'
const ACTIVE_KEY  = 'mdx-cards-active-doc'

const STARTER: Doc = {
  id: 'welcome',
  title: 'Добро пожаловать',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  content: `# MDX Link Cards

Это персональная платформа для MDX-документов со встраиваемыми карточками внешних источников.

## Как работает

Вставьте любую ссылку в текст — платформа автоматически загрузит метаданные через сервер (CORS-независимо) и покажет карточку в превью.

Нажмите **«Вставить карточку»** во всплывающей панели, чтобы заменить URL на JSX-компонент:

<LinkCard url="https://nextjs.org" />

<LinkCard url="https://github.com" />

## Формат карточки

Карточка хранится как обычный JSX-компонент в MDX-файле. Это означает:

- **Портативность** — файл работает в любом Next.js / Gatsby проекте
- **Версионирование** — документы живут в git, как обычный код  
- **Расширяемость** — компонент можно кастомизировать под любой дизайн

## Метаданные

Агрегатор извлекает данные с приоритетом:
**Open Graph** → JSON-LD → Twitter Cards → Microdata → meta-теги → fallback

> Попробуйте вставить https://vercel.com или любую другую ссылку прямо сюда
`,
}

function load(): Doc[] {
  if (typeof window === 'undefined') return [STARTER]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [STARTER]
    const docs = JSON.parse(raw) as Doc[]
    return docs.length ? docs : [STARTER]
  } catch {
    return [STARTER]
  }
}

function save(docs: Doc[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
  } catch {}
}

function makeDoc(title = 'Новый документ'): Doc {
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    content: `# ${title}\n\n`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function useDocuments() {
  const [docs, setDocs]       = useState<Doc[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const loaded  = load()
    const savedId = localStorage.getItem(ACTIVE_KEY)
    const active  = loaded.find((d) => d.id === savedId) ?? loaded[0]
    setDocs(loaded)
    setActiveId(active.id)
    setHydrated(true)
  }, [])

  const activeDoc = docs.find((d) => d.id === activeId) ?? docs[0]

  const persist = useCallback((next: Doc[]) => {
    setDocs(next)
    save(next)
  }, [])

  const updateContent = useCallback(
    (content: string) => {
      if (!activeId) return
      setDocs((prev) => {
        const next = prev.map((d) =>
          d.id === activeId ? { ...d, content, updatedAt: Date.now() } : d,
        )
        save(next)
        return next
      })
    },
    [activeId],
  )

  const updateTitle = useCallback(
    (title: string) => {
      if (!activeId) return
      setDocs((prev) => {
        const next = prev.map((d) =>
          d.id === activeId ? { ...d, title, updatedAt: Date.now() } : d,
        )
        save(next)
        return next
      })
    },
    [activeId],
  )

  const createDoc = useCallback(
    (title?: string) => {
      const doc = makeDoc(title)
      setDocs((prev) => {
        const next = [doc, ...prev]
        save(next)
        return next
      })
      setActiveId(doc.id)
      localStorage.setItem(ACTIVE_KEY, doc.id)
      return doc.id
    },
    [],
  )

  const deleteDoc = useCallback(
    (id: string) => {
      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== id)
        const fallback = next.length ? next[0] : makeDoc()
        const toSave = next.length ? next : [fallback]
        save(toSave)
        if (id === activeId) {
          setActiveId(fallback.id)
          localStorage.setItem(ACTIVE_KEY, fallback.id)
        }
        return toSave
      })
    },
    [activeId],
  )

  const switchDoc = useCallback((id: string) => {
    setActiveId(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }, [])

  const duplicateDoc = useCallback(
    (id: string) => {
      const src = docs.find((d) => d.id === id)
      if (!src) return
      const copy = { ...makeDoc(src.title + ' (копия)'), content: src.content }
      setDocs((prev) => {
        const next = [copy, ...prev]
        save(next)
        return next
      })
      setActiveId(copy.id)
      localStorage.setItem(ACTIVE_KEY, copy.id)
    },
    [docs],
  )

  return {
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
    persist,
  }
}
