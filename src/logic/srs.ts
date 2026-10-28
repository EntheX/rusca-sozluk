// Basit aralıklı tekrar: Leitner kutuları. Bilinen kart her seferinde daha geç gelir.

import type { CardRec } from '../db'

const DAY = 86400000
/** Kutu → bir sonraki tekrara kadar gün */
export const INTERVALS = [0, 1, 2, 4, 8, 16, 32]
export const MAX_BOX = INTERVALS.length - 1
/** Bilinmeyen kart aynı oturumda kaç dakika sonra tekrar gelsin */
export const RELEARN_MS = 60 * 1000

export function answer(card: CardRec | undefined, id: string, known: boolean, now = Date.now()): CardRec {
  const c: CardRec = card ?? { id, box: 0, due: now, reps: 0, lapses: 0, lastSeen: 0 }
  if (known) {
    const box = Math.min(MAX_BOX, c.box + 1)
    return { ...c, box, due: now + INTERVALS[box] * DAY - 3600000, reps: c.reps + 1, lastSeen: now }
  }
  return { ...c, box: 0, due: now + RELEARN_MS, reps: c.reps + 1, lapses: c.lapses + (c.box > 0 ? 1 : 0), lastSeen: now }
}

export const isDue = (c: CardRec | undefined, now = Date.now()) => !c || c.due <= now
