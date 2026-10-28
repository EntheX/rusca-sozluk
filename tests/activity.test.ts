import { describe, expect, it } from 'vitest'
import { currentStreak, dayKey, longestStreak, type DayActivity } from '../src/logic/activity'

const a: DayActivity = { texts: 1, recordings: 0, listens: 0 }
const map = (...ds: string[]) => new Map(ds.map((d) => [d, a]))

describe('seri', () => {
  const now = new Date(2026, 10, 10, 9) // 10 Kasım
  it('bugün dahil kesintisiz günler', () => {
    expect(currentStreak(map('2026-11-08', '2026-11-09', '2026-11-10'), now)).toBe(3)
  })
  it('bugün henüz çalışılmadıysa dünden geriye sayar', () => {
    expect(currentStreak(map('2026-11-08', '2026-11-09'), now)).toBe(2)
  })
  it('boşluk seriyi bitirir', () => {
    expect(currentStreak(map('2026-11-07', '2026-11-09', '2026-11-10'), now)).toBe(2)
    expect(currentStreak(map('2026-11-07'), now)).toBe(0)
  })
  it('en uzun seri ay sınırını geçer', () => {
    expect(longestStreak(map('2026-10-30', '2026-10-31', '2026-11-01', '2026-11-05'))).toBe(3)
  })
  it('yerel tarih anahtarı', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})
