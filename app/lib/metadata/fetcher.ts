import type { LinkMetadata } from '@/types/metadata'
import { parseHtml } from './parser'

const TIMEOUT_MS = 6000
const MAX_BODY_BYTES = 2_000_000 // 2 MB — enough for full page body text extraction

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; EmbeddedCardsBot/1.0; +https://embedded-cards)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'ru,en;q=0.9',
}

export async function fetchMetadata(url: string): Promise<LinkMetadata> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timer)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    // Stream only up to MAX_BODY_BYTES to avoid memory issues on huge pages
    const reader = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let total = 0

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done || !value) break
        chunks.push(value)
        total += value.byteLength
        if (total >= MAX_BODY_BYTES) break
      }
      reader.cancel()
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length)
        merged.set(acc)
        merged.set(c, acc.length)
        return merged
      }, new Uint8Array(0)),
    )

    return { ...parseHtml(html, url), fetchedAt: Date.now() }
  } catch (err) {
    clearTimeout(timer)

    // Graceful degradation: return domain-level fallback
    let domain = url
    try { domain = new URL(url).hostname.replace(/^www\./, '') } catch {}

    return {
      url,
      canonical: url,
      title: domain,
      description: null,
      excerpt: null,
      wordCount: null,
      image: null,
      domain,
      source: 'fallback',
      fetchedAt: Date.now(),
    }
  }
}
