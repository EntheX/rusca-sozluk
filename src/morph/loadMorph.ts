// Tarayıcıda Az.js'i ve sözlükleri yükler (ilk açılışta ağdan, sonra service worker önbelleğinden).

import { createMorph, type Morph } from './morph'

declare global {
  interface Window {
    Az?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

let promise: Promise<Morph> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Az.js yüklenemedi'))
    document.head.appendChild(s)
  })
}

export function loadMorph(): Promise<Morph> {
  if (promise) return promise
  promise = (async () => {
    const base = import.meta.env.BASE_URL + 'az/'
    if (!window.Az) await loadScript(base + 'az.min.js')
    const Az = window.Az
    // Az'ın XHR yükleyicisi hata durumunda hiç dönmüyor; fetch ile değiştir.
    Az.load = (url: string, type: string, cb: (e: unknown, d?: unknown) => void) => {
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(url + ': ' + r.status)
          return type === 'json' ? r.json() : r.arrayBuffer()
        })
        .then((d) => cb(null, d), (e) => cb(e))
    }
    await new Promise<void>((resolve, reject) =>
      Az.Morph.init(base + 'dicts', (err: unknown) => (err ? reject(err) : resolve())),
    )
    return createMorph(Az)
  })()
  promise.catch(() => {
    promise = null
  })
  return promise
}
