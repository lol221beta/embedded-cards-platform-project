export type MetadataSource = 'og' | 'json-ld' | 'twitter' | 'microdata' | 'meta' | 'fallback'

export interface LinkMetadata {
  url: string
  canonical: string
  title: string
  description: string | null
  /** Actual body text extracted from the page, not OG description */
  excerpt: string | null
  /** Approximate word count of the full page body */
  wordCount: number | null
  image: string | null
  domain: string
  source: MetadataSource
  fetchedAt: number
}

export interface MetadataResponse {
  data: LinkMetadata | null
  error: string | null
  cached: boolean
}
