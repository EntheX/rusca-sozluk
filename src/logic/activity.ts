// Seri takvimi: yazı, konuşma kaydı ve podcast dinleme yapılan günler.

import { db } from '../db'

export interface DayActivity {
  texts: number
  recordings: number
  listens: number
}

/** Yerel saatle YYYY-AA-GG */
export const dayKey = (t: number | Date) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function loadActivity(): Promise<Map<string, DayActivity>> {
  const m = new Map<string, DayActivity>()
  const add = (t: number, k: keyof DayActivity) => {
    const key = dayKey(t)
    const a = m.get(key) ?? { texts: 0, recordings: 0, listens: 0 }
    a[k]++
    m.set(key, a)
  }
  for (const t of await db.texts.where('status').equals('committed').toArray()) add(t.createdAt, 'texts')
  for (const r of await db.recordings.toArray()) add(r.at, 'recordings')
  for (const l of await db.podcastLogs.toArray()) add(l.date, 'listens')
  return m
}

/** Bugün (ya da henüz bir şey yapılmadıysa dün) biten kesintisiz gün sayısı. */
export function currentStreak(days: Map<string, DayActivity>, now = new Date()): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(dayKey(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function longestStreak(days: Map<string, DayActivity>): number {
  const keys = [...days.keys()].sort()
  let best = 0
  let run = 0
  let prev: Date | null = null
  for (const k of keys) {
    const [y, mo, da] = k.split('-').map(Number)
    const d = new Date(y, mo - 1, da)
    run = prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}
