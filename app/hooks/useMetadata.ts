'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LinkMetadata } from '@/types/metadata'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: LinkMetadata; cached: boolean }
  | { status: 'error'; message: string }

const inFlight = new Map<string, Promise<void>>()

export function useMetadata(url: string | null) {
  const [state, setState] = useState<State>({ status: 'idle' })
  const lastUrl = useRef<string | null>(null)

  const fetch_ = useCallback(async (u: string) => {
    if (lastUrl.current === u && state.status === 'success') return

    setState({ status: 'loading' })
    lastUrl.current = u

    if (inFlight.has(u)) {
      await inFlight.get(u)
      return
    }

    const promise = (async () => {
      try {
        const res = await fetch(`/api/metadata?url=${encodeURIComponent(u)}`)
        const json = await res.json()
        if (json.data) {
          setState({ status: 'success', data: json.data, cached: json.cached })
        } else {
          setState({ status: 'error', message: json.error ?? 'Unknown error' })
        }
      } catch {
        setState({ status: 'error', message: 'Network error' })
      } finally {
        inFlight.delete(u)
      }
    })()

    inFlight.set(u, promise)
    await promise
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!url) {
      setState({ status: 'idle' })
      return
    }
    fetch_(url)
  }, [url, fetch_])

  return state
}
