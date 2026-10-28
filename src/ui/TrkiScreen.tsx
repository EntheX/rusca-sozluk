import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { KIND_LABELS, TRKI_TASKS, TRKI_THEME, taskById, type TaskKind } from '../content/trki'
import { db } from '../db'
import { words } from '../logic/dictation'
import { saveDraft } from '../logic/store'
import { go } from './hooks'

const draftKey = (id: string) => 'rs-trki-' + id
const readDraft = (id: string) => {
  try {
    return localStorage.getItem(draftKey(id)) ?? ''
  } catch {
    return ''
  }
}
const writeDraft = (id: string, v: string) => {
  try {
    if (v) localStorage.setItem(draftKey(id), v)
    else localStorage.removeItem(draftKey(id))
  } catch {
    /* depolama kapalıysa taslak yalnızca bellekte kalır */
  }
}

/** Görev listesi: türlere göre, daha önce yazılanlar işaretli. */
export function TrkiScreen() {
  const done = useLiveQuery(async () => {
    const m = new Map<string, number>()
    for (const t of await db.texts.toArray()) if (t.task) m.set(t.task.id, t.id)
    return m
  }, [])
  return (
    <div>
      <h2>ТРКИ-2 yazma görevleri</h2>
      <p className="small-text muted">
        Sınavın yazma bölümüne benzer görevler (resmî sınav soruları değil). Süre tutulur, kelime sayılır; bitirince metin çözümlenir ve Claude görevi
        ТРКИ-2 ölçütleriyle değerlendirir.
      </p>
      {(['letter', 'official', 'essay'] as TaskKind[]).map((k) => (
        <section key={k}>
          <h3>{KIND_LABELS[k]}</h3>
          <ul className="list card" style={{ padding: '4px 12px' }}>
            {TRKI_TASKS.filter((t) => t.kind === k).map((t) => (
              <li key={t.id}>
                <a href={'#/trki/' + t.id}>
                  <div>
                    <div className="title">
                      {t.title} {done?.has(t.id) && <span className="badge st-known">yazıldı</span>}
                    </div>
                    <div className="sub">
                      {t.minutes} dk · {t.words[0]}–{t.words[1]} kelime
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Tek görev: görev metni, sayaç, kelime sayısı, yazma alanı. */
export function TrkiTask({ id }: { id: string }) {
  const task = taskById(id)
  const [body, setBody] = useState(() => readDraft(id))
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const tick = useRef<number | null>(null)

  useEffect(() => {
    if (startedAt == null) return
    tick.current = window.setInterval(() => setNow(Date.now()), 1000)
    return () => void (tick.current && clearInterval(tick.current))
  }, [startedAt])
  useEffect(() => writeDraft(id, body), [id, body])

  if (!task) return <p>Görev bulunamadı. <a href="#/trki">Görevler</a></p>
  const n = words(body).length
  const elapsed = startedAt ? (now - startedAt) / 1000 : 0
  const left = task.minutes * 60 - elapsed
  const fmt = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, '0')}`
  const countClass = n < task.words[0] ? 'st-ambiguous' : n > task.words[1] ? 'st-unknown' : 'st-known'

  const finish = async () => {
    setBusy(true)
    const now = Date.now()
    const textId = await saveDraft({
      title: task.title,
      theme: TRKI_THEME,
      body,
      createdAt: now,
      updatedAt: now,
      task: { id: task.id, minutes: Math.max(1, Math.round(elapsed / 60)) },
    })
    writeDraft(id, '')
    go('yaz/' + textId)
  }

  return (
    <div>
      <p>
        <a href="#/trki">← Görevler</a>
      </p>
      <div className="muted small-text">
        {KIND_LABELS[task.kind]} · {task.minutes} dk · {task.words[0]}–{task.words[1]} kelime
      </div>
      <h2 style={{ marginTop: 2 }}>{task.title}</h2>
      <div className="card">
        <p lang="ru" style={{ marginTop: 0, fontWeight: 600 }}>
          {task.ru}
        </p>
        <p className="small-text muted">{task.tr}</p>
        <div className="small-text">Mutlaka değin:</div>
        <ul className="phrases" lang="ru">
          {task.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="trki-bar card">
        {startedAt == null ? (
          <button className="primary" onClick={() => setStartedAt(Date.now())}>
            Süreyi başlat ({task.minutes} dk)
          </button>
        ) : (
          <span className={'trki-time' + (left < 0 ? ' over' : '')}>
            {left < 0 ? '+' : ''}
            {fmt(left)}
          </span>
        )}
        <span className={'badge ' + countClass}>{n} kelime</span>
      </div>
      {left < 0 && startedAt != null && <div className="notice warn small-text">Süre doldu. Sınavda burada bırakman gerekirdi; istersen bitirip değerlendir.</div>}

      <textarea value={body} onChange={(e) => setBody(e.target.value)} lang="ru" spellCheck={false} placeholder="Здравствуй, …" style={{ minHeight: 320 }} />
      <p className="small-text muted">Sınavdaki gibi yazım denetimi kapalı. Taslak bu cihazda otomatik saklanır.</p>
      <button className="primary full" onClick={finish} disabled={busy || n < 10}>
        Bitir: çözümle ve değerlendir
      </button>
    </div>
  )
}
