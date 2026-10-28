import { StreakCalendar } from './StreakCalendar'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db, getThemes } from '../db'
import { POS_LABELS, POS_ORDER } from '../morph/tags'

export const GOAL = 10000

function startOfWeek(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // Pazartesi = 0
  d.setDate(d.getDate() - dow)
  return d.getTime()
}

function HBars({ rows }: { rows: Array<{ name: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div>
      {rows.map((r) => (
        <div className="hbar" key={r.name} title={`${r.name}: ${r.value}`}>
          <span className="name">{r.name}</span>
          <div className="track">
            <div className="fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="val">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function SummaryScreen() {
  const lemmas = useLiveQuery(() => db.lemmas.where('useCount').above(0).toArray(), [])
  const textCount = useLiveQuery(() => db.texts.where('status').equals('committed').count(), [])
  const themes = useLiveQuery(getThemes, []) ?? []

  const stats = useMemo(() => {
    if (!lemmas) return null
    const byPos = POS_ORDER.map((p) => ({ name: POS_LABELS[p], value: lemmas.filter((l) => l.pos === p).length })).filter(
      (r) => r.value > 0,
    )
    const themeNames = [...new Set([...themes, ...lemmas.flatMap((l) => l.themes)])]
    const byTheme = themeNames
      .map((t) => ({ name: t, value: lemmas.filter((l) => l.themes.includes(t)).length }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
    const thisWeek = startOfWeek(Date.now())
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = thisWeek - (7 - i) * 7 * 86400000
      // Yaz saati kaymalarına karşı haftanın başını yeniden hesapla
      const s = startOfWeek(start + 12 * 3600000)
      return { start: s, value: 0 }
    })
    for (const l of lemmas) {
      const w = startOfWeek(l.firstUsed)
      const e = weeks.find((x) => x.start === w)
      if (e) e.value++
    }
    const uses = lemmas.reduce((s, l) => s + l.useCount, 0)
    return { byPos, byTheme, weeks, uses }
  }, [lemmas, themes])

  if (!lemmas || !stats) return <p className="muted">Yükleniyor…</p>
  const total = lemmas.length
  const pct = Math.min(100, (total / GOAL) * 100)
  const maxW = Math.max(1, ...stats.weeks.map((w) => w.value))

  return (
    <div>
      <h2>Özet</h2>
      <StreakCalendar />
      <div className="card">
        <div className="muted small-text">Aktif kullandığın kelime</div>
        <div className="hero">
          {total.toLocaleString('tr-TR')} <span className="muted" style={{ fontSize: '1.1rem', fontWeight: 500 }}>/ {GOAL.toLocaleString('tr-TR')}</span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={GOAL} aria-valuenow={total}>
          <div style={{ width: `${Math.max(pct, total > 0 ? 0.5 : 0)}%` }} />
        </div>
        <div className="small-text muted">
          %{pct.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} · {textCount ?? 0} metin · {stats.uses.toLocaleString('tr-TR')} kelime kullanımı
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Son 8 haftada yeni kelimeler</h3>
        <div className="vbars">
          {stats.weeks.map((w) => (
            <div className="vbar" key={w.start} title={`${new Date(w.start).toLocaleDateString('tr-TR')} haftası: ${w.value} yeni kelime`}>
              <span className="v">{w.value || ''}</span>
              <div className="b" style={{ height: `${(w.value / maxW) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="vlabels">
          {stats.weeks.map((w, i) => (
            <span key={w.start}>{i === 7 ? 'bu hafta' : new Date(w.start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Türe göre</h3>
        {stats.byPos.length ? <HBars rows={stats.byPos} /> : <p className="muted">Henüz kelime yok.</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Temaya göre</h3>
        {stats.byTheme.length ? <HBars rows={stats.byTheme} /> : <p className="muted">Henüz kelime yok.</p>}
        <p className="small-text muted">Bir kelime birden çok temada kullanıldıysa her birinde sayılır.</p>
      </div>
    </div>
  )
}
