import { parse } from 'node-html-parser'
import type { LinkMetadata, MetadataSource } from '@/types/metadata'

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function resolveUrl(base: string, path: string | undefined): string | null {
  if (!path) return null
  try { return new URL(path, base).href } catch { return null }
}

function truncate(s: string | null | undefined, max: number): string | null {
  if (!s) return null
  const t = s.trim()
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

/**
 * Extract meaningful body text from parsed HTML.
 * Prefers semantic containers (article, main, [role=main]) over full body.
 * Strips nav, header, footer, scripts, ads, sidebars.
 * Returns up to `maxChars` of clean text + total word count.
 */
function extractBodyText(html: string, maxChars = 600): { excerpt: string | null; wordCount: number | null } {
  try {
    const root = parse(html)

    // Remove noise elements entirely
    const noise = [
      'script', 'style', 'noscript', 'nav', 'header', 'footer',
      'aside', 'iframe', 'svg', 'figure', 'figcaption',
      '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
      '[aria-hidden="true"]', '.nav', '.menu', '.sidebar', '.ad', '.cookie',
      '#nav', '#menu', '#sidebar', '#header', '#footer',
    ]
    noise.forEach((sel) => {
      try { root.querySelectorAll(sel).forEach((el) => el.remove()) } catch { /* ignore */ }
    })

    // Try semantic containers first
    const containers = [
      'article',
      '[role="main"]',
      'main',
      '.post-content', '.entry-content', '.article-content', '.article-body',
      '.content', '.story', '.body-text', '#content', '#main',
    ]

    let textNode: { text: string } | null = null
    for (const sel of containers) {
      try {
        const el = root.querySelector(sel)
        if (el && el.text.trim().length > 200) { textNode = el; break }
      } catch { /* ignore */ }
    }

    if (!textNode) textNode = root.querySelector('body') ?? root

    // Clean whitespace
    const raw = textNode.text
      .replace(/\s+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim()

    if (!raw || raw.length < 30) return { excerpt: null, wordCount: null }

    const wordCount = raw.split(/\s+/).filter(Boolean).length
    const excerpt   = raw.length > maxChars ? raw.slice(0, maxChars - 1) + '…' : raw

    return { excerpt, wordCount }
  } catch {
    return { excerpt: null, wordCount: null }
  }
}

export function parseHtml(html: string, fetchedUrl: string): Omit<LinkMetadata, 'fetchedAt'> {
  const root   = parse(html)
  const domain = extractDomain(fetchedUrl)

  // Always extract body text — it's our core value
  const { excerpt, wordCount } = extractBodyText(html)

  // ── 1. Open Graph ──────────────────────────────────────────────────────────
  const og = (prop: string) =>
    root.querySelector(`meta[property="og:${prop}"]`)?.getAttribute('content') ?? null

  const ogTitle = og('title')
  const ogImage = resolveUrl(fetchedUrl, og('image') ?? undefined)
  const ogUrl   = og('url') ?? fetchedUrl

  if (ogTitle) {
    return {
      url: fetchedUrl, canonical: ogUrl,
      title: truncate(ogTitle, 120)!,
      description: truncate(og('description'), 300),
      excerpt, wordCount,
      image: ogImage, domain, source: 'og',
    }
  }

  // ── 2. JSON-LD ─────────────────────────────────────────────────────────────
  const ldScripts = root.querySelectorAll('script[type="application/ld+json"]')
  for (const script of ldScripts) {
    try {
      const data       = JSON.parse(script.text)
      const candidates = Array.isArray(data) ? data : [data]
      for (const item of candidates) {
        const title = item.headline ?? item.name ?? null
        if (!title) continue
        const imageRaw = Array.isArray(item.image) ? item.image[0] : item.image
        const image    = resolveUrl(fetchedUrl, typeof imageRaw === 'string' ? imageRaw : imageRaw?.url ?? undefined)
        return {
          url: fetchedUrl, canonical: item.url ?? fetchedUrl,
          title: truncate(title, 120)!,
          description: truncate(item.description, 300),
          excerpt, wordCount,
          image, domain, source: 'json-ld',
        }
      }
    } catch { /* malformed JSON */ }
  }

  // ── 3. Twitter Cards ───────────────────────────────────────────────────────
  const tw = (name: string) =>
    root.querySelector(`meta[name="twitter:${name}"]`)?.getAttribute('content') ?? null

  const twTitle = tw('title')
  if (twTitle) {
    return {
      url: fetchedUrl, canonical: fetchedUrl,
      title: truncate(twTitle, 120)!,
      description: truncate(tw('description'), 300),
      excerpt, wordCount,
      image: resolveUrl(fetchedUrl, tw('image') ?? undefined),
      domain, source: 'twitter',
    }
  }

  // ── 4. HTML meta tags ──────────────────────────────────────────────────────
  const metaName  = (name: string) =>
    root.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ??
    root.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ?? null
  const metaTitle = root.querySelector('title')?.text?.trim() ?? null
  const canonical =
    root.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? fetchedUrl

  if (metaTitle) {
    return {
      url: fetchedUrl, canonical: resolveUrl(fetchedUrl, canonical) ?? fetchedUrl,
      title: truncate(metaTitle, 120)!,
      description: truncate(metaName('description'), 300),
      excerpt, wordCount,
      image: null, domain, source: 'meta',
    }
  }

  // ── 5. Fallback ────────────────────────────────────────────────────────────
  const firstH1 = root.querySelector('h1')?.text?.trim() ?? null
  return {
    url: fetchedUrl, canonical: fetchedUrl,
    title: truncate(firstH1 ?? domain, 120)!,
    description: null,
    excerpt, wordCount,
    image: null, domain, source: 'fallback',
  }
}
