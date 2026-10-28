import { useLiveQuery } from 'dexie-react-hooks'
import { currentStreak, dayKey, loadActivity, longestStreak } from '../logic/activity'

const WEEKS = 12

/** Son 12 haftanın etkinlik takvimi (sütun = hafta, satır = Pzt…Paz). */
export function StreakCalendar() {
  const days = useLiveQuery(loadActivity, [])
  if (!days) return null
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7)
  const cells: Array<{ key: string; n: number; future: boolean; label: string }> = []
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = dayKey(d)
    const a = days.get(key)
    const n = a ? a.texts + a.recordings + a.listens : 0
    const parts = a ? [a.texts && `${a.texts} metin`, a.recordings && `${a.recordings} kayıt`, a.listens && `${a.listens} dinleme`].filter(Boolean) : []
    cells.push({ key, n, future: d > today, label: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + (parts.length ? ': ' + parts.join(', ') : '') })
  }
  const streak = currentStreak(days)
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>Seri</h3>
        <span className="grow" />
        <span className="small-text muted">en uzun {longestStreak(days)} gün</span>
      </div>
      <p style={{ margin: '4px 0 8px' }}>
        <strong style={{ fontSize: '1.4rem' }}>{streak}</strong> gün üst üste
        {streak === 0 && <span className="small-text muted"> · bugün bir metin yaz ya da 5 dakika konuş</span>}
      </p>
      <div className="streak-grid" role="img" aria-label={`Son ${WEEKS} haftanın çalışma takvimi`}>
        {cells.map((c) => (
          <span key={c.key} title={c.label} className={'lv' + (c.future ? '-f' : Math.min(c.n, 3))} />
        ))}
      </div>
      <div className="small-text muted" style={{ marginTop: 6 }}>
        Yazdığın metinler, konuşma kayıtları ve «dinledim» işaretleri sayılır.
      </div>
    </div>
  )
}

/** Ana sayfa için tek satır. */
export function useStreak() {
  return useLiveQuery(async () => currentStreak(await loadActivity()), []) ?? 0
}
