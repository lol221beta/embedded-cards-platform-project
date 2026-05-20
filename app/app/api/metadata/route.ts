import { NextRequest, NextResponse } from 'next/server'
import { fetchMetadata } from '@/lib/metadata/fetcher'
import { cacheGet, cacheSet } from '@/lib/metadata/cache'
import type { MetadataResponse } from '@/types/metadata'

function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export async function GET(req: NextRequest): Promise<NextResponse<MetadataResponse>> {
  const url = req.nextUrl.searchParams.get('url')

  if (!url || !isValidUrl(url)) {
    return NextResponse.json(
      { data: null, error: 'Missing or invalid url parameter', cached: false },
      { status: 400 },
    )
  }

  // Normalise trailing slash so cache keys are consistent
  const key = url.replace(/\/$/, '')

  const cached = cacheGet(key)
  if (cached) {
    return NextResponse.json({ data: cached, error: null, cached: true })
  }

  const data = await fetchMetadata(key)
  cacheSet(key, data)

  return NextResponse.json({ data, error: null, cached: false })
}
