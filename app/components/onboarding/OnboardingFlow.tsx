'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import type { LinkMetadata } from '@/types/metadata'

const ONBOARDING_KEY = 'mdx-cards-onboarded-v1'

function LiveCardPreview({ meta }: { meta: LinkMetadata }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {meta.image && !imgErr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.image}
          alt=""
          className="h-auto w-40 flex-shrink-0 object-cover"
          onError={() => setImgErr(true)}
        />
      )}
      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${meta.domain}&sz=32`}
            alt=""
            className="h-3.5 w-3.5 rounded-sm"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
          />
          <span className="text-sm text-gray-400">{meta.domain}</span>
        </div>
        <p className="text-base font-bold text-gray-900">{meta.title}</p>
        {(meta.excerpt ?? meta.description) && (
          <p className="text-sm text-gray-500 line-clamp-3">{meta.excerpt ?? meta.description}</p>
        )}
      </div>
    </div>
  )
}

interface OnboardingFlowProps {
  /** Called when onboarding is complete; passes the URL if the user fetched one */
  onDone: (url?: string) => void
}

export function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const [step, setStep]       = useState<'paste' | 'explain'>('paste')
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [meta, setMeta]       = useState<LinkMetadata | null>(null)
  const [error, setError]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [])

  const tryFetch = async (rawUrl: string) => {
    let u = rawUrl.trim()
    if (!u) return
    if (!u.startsWith('http')) u = 'https://' + u
    try { new URL(u) } catch { setError('Введите корректную ссылку'); return }

    setError('')
    setLoading(true)
    setMeta(null)

    try {
      const res  = await fetch(`/api/metadata?url=${encodeURIComponent(u)}`)
      const json = await res.json()
      if (json.data) {
        setMeta(json.data)
        setStep('explain')
      } else {
        setError('Не удалось загрузить. Попробуйте другой сайт.')
      }
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  const handleDone = (withUrl?: string) => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    onDone(withUrl)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6">

      {/* Step: paste URL */}
      {step === 'paste' && (
        <div className="flex w-full max-w-xl flex-col items-center gap-8 text-center">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 shadow-lg">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="2" width="8" height="8" rx="2" fill="white" opacity="0.9"/>
              <rect x="12" y="2" width="8" height="8" rx="2" fill="white" opacity="0.5"/>
              <rect x="2" y="12" width="8" height="8" rx="2" fill="white" opacity="0.5"/>
              <rect x="12" y="12" width="8" height="8" rx="2" fill="white" opacity="0.2"/>
            </svg>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Вставь любую ссылку</h1>
            <p className="mt-2 text-gray-500">Скопируй URL любого сайта, статьи или видео</p>
          </div>

          <div className="w-full">
            <div className={cn(
              'flex items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3.5 shadow-sm transition-all',
              error ? 'border-red-300' : 'border-gray-200 focus-within:border-gray-900',
            )}>
              <input
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && tryFetch(url)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text').trim()
                  if (text.startsWith('http')) {
                    setUrl(text)
                    setTimeout(() => tryFetch(text), 50)
                  }
                }}
                placeholder="https://любой-сайт.ru"
                className="flex-1 text-base text-gray-900 outline-none placeholder:text-gray-300"
              />
              {loading ? (
                <svg className="animate-spin flex-shrink-0 text-gray-400" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="9" cy="9" r="7" opacity="0.2"/>
                  <path d="M9 2a7 7 0 017 7" strokeLinecap="round"/>
                </svg>
              ) : (
                <button
                  onClick={() => tryFetch(url)}
                  disabled={!url.trim()}
                  className="flex-shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.97] disabled:opacity-30"
                >
                  Загрузить →
                </button>
              )}
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>

          <button
            onClick={() => handleDone()}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
          >
            Пропустить, уже знаю
          </button>

        </div>
      )}

      {/* Step: show result */}
      {step === 'explain' && meta && (
        <div className="flex w-full max-w-xl flex-col items-center gap-6">

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Вот твоя карточка</h2>
            <p className="mt-1 text-sm text-gray-500">
              Реальный текст страницы, без лишних шагов
            </p>
          </div>

          <div className="w-full">
            <LiveCardPreview meta={meta} />
          </div>

          <div className="w-full rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
            <div className="flex flex-col gap-2">
              {[
                'Запросили страницу через наш сервер — браузер не мог из-за CORS',
                'Извлекли реальный текст страницы, заголовок, изображение',
                'Готово к вставке в документ одной строкой',
              ].map((text) => (
                <div key={text} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-2xl border border-gray-200">
            <div className="grid grid-cols-2 divide-x divide-gray-200">
              <div className="bg-red-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Раньше</p>
                <p className="mt-2 font-mono text-sm text-gray-600 break-all">
                  {'[Текст](https://example.com)'}
                </p>
                <p className="mt-2 text-xs text-red-500">просто ссылка, ничего не видно</p>
              </div>
              <div className="bg-green-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-500">Теперь</p>
                <p className="mt-2 font-mono text-sm text-gray-600">{'<LinkCard url="…" />'}</p>
                <p className="mt-2 text-xs text-green-600">карточка с содержанием</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleDone(url.startsWith('http') ? url : 'https://' + url)}
            className="w-full rounded-2xl bg-gray-900 py-3.5 text-base font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
          >
            Добавить в документ →
          </button>

        </div>
      )}

    </div>
  )
}

export function useOnboarding() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY)
    if (!done) setShow(true)
  }, [])

  return {
    showOnboarding: show,
    finishOnboarding: () => setShow(false),
    resetOnboarding: () => {
      localStorage.removeItem(ONBOARDING_KEY)
      setShow(true)
    },
  }
}
