import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { LEVELS } from '../content/graded'
import { PODCASTS, type Podcast } from '../content/podcasts'
import { db } from '../db'
import { fmtDate } from './hooks'

type Item = Podcast & { user?: number }

export function PodcastScreen() {
  const logs = useLiveQuery(() => db.podcastLogs.orderBy('date').reverse().toArray(), []) ?? []
  const users = useLiveQuery(() => db.userPodcasts.toArray(), []) ?? []
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const all: Item[] = [
    ...PODCASTS,
    ...users.map((u) => ({ id: 'u' + u.id, user: u.id, title: u.title, url: u.url, level: u.level as Podcast['level'], note: u.note })),
  ]
  const weekAgo = Date.now() - 7 * 86400000
  const thisWeek = logs.filter((l) => l.date >= weekAgo).length

  return (
    <div>
      <h2>Dinle</h2>
      <p className="small-text muted">
        Seviyene göre Rusça podcastler. Dinlediğin bölümü işaretle, kaptığın kelimeleri not al. Bu hafta {thisWeek} bölüm dinledin.
      </p>
      {LEVELS.map((lv) => {
        const items = all.filter((p) => p.level === lv)
        if (!items.length) return null
        return (
          <section key={lv}>
            <h3>
              <span className="lv">{lv}</span>
            </h3>
            {items.map((p) => (
              <PodcastCard key={p.id} p={p} logs={logs.filter((l) => l.podcastId === p.id)} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
            ))}
          </section>
        )
      })}
      <h3>Kendi podcastini ekle</h3>
      {adding ? <AddPodcast onDone={() => setAdding(false)} /> : <button className="full" onClick={() => setAdding(true)}>+ Podcast ekle</button>}
      <p className="small-text muted">Podcastler dış sitelerde açılır; dinlemek için internet gerekir. Notların cihazda saklanır ve yedeğe dahildir.</p>
    </div>
  )
}

function PodcastCard({ p, logs, open, onToggle }: { p: Item; logs: Array<{ id?: number; date: number; note: string }>; open: boolean; onToggle: () => void }) {
  const [note, setNote] = useState('')
  const save = async () => {
    await db.podcastLogs.add({ podcastId: p.id, date: Date.now(), note: note.trim() })
    setNote('')
  }
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="title">
            <strong>{p.title}</strong> <span className="lv">{p.levelTo ? `${p.level}–${p.levelTo}` : p.level}</span>
          </div>
          <div className="small-text muted">{p.note}</div>
          {logs.length > 0 && <div className="small-text">{logs.length} bölüm dinledin · son: {fmtDate(logs[0].date)}</div>}
        </div>
        <a className="btn small primary" href={p.url} target="_blank" rel="noopener noreferrer">
          Dinle ↗
        </a>
      </div>
      <button className="small" style={{ marginTop: 8 }} onClick={onToggle}>
        {open ? 'Kapat' : 'Dinledim / not ekle'}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Hangi bölüm? Kaptığın kelimeler, ifadeler… (isteğe bağlı)"
            lang="ru"
            style={{ minHeight: 90 }}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="primary" onClick={save}>
              ✓ Dinledim
            </button>
            {p.user != null && (
              <button className="danger" onClick={() => confirm(`«${p.title}» silinsin mi?`) && db.userPodcasts.delete(p.user!)}>
                Podcasti sil
              </button>
            )}
          </div>
          {logs.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {logs.map((l) => (
                <div key={l.id} className="sentence small-text">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="muted">{fmtDate(l.date)}</span>
                    <button className="small" onClick={() => db.podcastLogs.delete(l.id!)} aria-label="Kaydı sil">
                      Sil
                    </button>
                  </div>
                  {l.note && (
                    <div lang="ru" style={{ whiteSpace: 'pre-wrap' }}>
                      {l.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddPodcast({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [level, setLevel] = useState('B1')
  const [note, setNote] = useState('')
  const valid = title.trim() && /^https?:\/\//.test(url.trim())
  return (
    <div className="card">
      <label className="field">
        <span>Ad</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        <span>Bağlantı (Spotify, YouTube, site…)</span>
        <input type="text" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
      </label>
      <label className="field">
        <span>Seviye</span>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Not</span>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="row">
        <button
          className="primary"
          disabled={!valid}
          onClick={async () => {
            await db.userPodcasts.add({ title: title.trim(), url: url.trim(), level, note: note.trim() })
            onDone()
          }}
        >
          Ekle
        </button>
        <button onClick={onDone}>Vazgeç</button>
      </div>
    </div>
  )
}
