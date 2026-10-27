import { createContext, useContext, useEffect, useState } from 'react'
import type { Morph } from '../morph/morph'

export type MorphState = { status: 'loading' } | { status: 'ready'; morph: Morph } | { status: 'error'; error: string }

export const MorphContext = createContext<MorphState>({ status: 'loading' })
export const useMorph = () => useContext(MorphContext)

/** Basit hash yönlendirici: "#/sozluk/стать|verb" → ['sozluk', 'стать|verb'] */
export function useRoute(): { parts: string[]; query: URLSearchParams } {
  const read = () => {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
    const [path, q] = h.split('?')
    return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(q ?? '') }
  }
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export const go = (path: string) => {
  location.hash = '#/' + path
}

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })

export const lemmaHref = (id: string) => '#/sozluk/' + encodeURIComponent(id)
