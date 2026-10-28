import { describe, expect, it } from 'vitest'
import { answer, isDue, MAX_BOX } from '../src/logic/srs'

describe('aralıklı tekrar', () => {
  const now = 1_800_000_000_000
  it('bilinen kart kutu atlar ve aralık büyür', () => {
    const a = answer(undefined, 'x|noun', true, now)
    expect(a.box).toBe(1)
    const b = answer(a, 'x|noun', true, now)
    expect(b.box).toBe(2)
    expect(b.due - now).toBeGreaterThan(a.due - now)
    expect(isDue(b, now)).toBe(false)
  })
  it('bilinmeyen kart başa döner ve hemen tekrar gelir', () => {
    const a = answer({ id: 'x', box: 4, due: now, reps: 3, lapses: 0, lastSeen: 0 }, 'x', false, now)
    expect(a.box).toBe(0)
    expect(a.lapses).toBe(1)
    expect(isDue(a, now + 61_000)).toBe(true)
  })
  it('kutu sınırı aşılmaz', () => {
    let c = answer(undefined, 'x', true, now)
    for (let i = 0; i < 10; i++) c = answer(c, 'x', true, now)
    expect(c.box).toBe(MAX_BOX)
  })
})
