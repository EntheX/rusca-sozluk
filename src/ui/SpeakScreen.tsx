import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { currentBlock } from '../content/calendar'
import { DAY_NAMES, THEME_PACKS, packByName, todayIndex } from '../content/themes'
import { db, type RecordingRec } from '../db'
import { DayCard } from './ThemeScreen'
import { fmtDate } from './hooks'

const TARGET = 5 * 60

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function pickMime(): string {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return options.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) ?? ''
}

/** Günlük konuşma: günün konusu + 5 dakikalık kayıt + eski kayıtlar. */
export function SpeakScreen({ initialTheme, initialDay }: { initialTheme?: string; initialDay?: number }) {
  const cb = currentBlock()
  const defaultPack = packByName(initialTheme ?? '') ?? (cb && cb.block.no ? THEME_PACKS[cb.block.no - 1] : THEME_PACKS[0])
  const [packName, setPackName] = useState(defaultPack.name)
  const [day, setDay] = useState(initialDay ?? todayIndex())
  const pack = packByName(packName) ?? THEME_PACKS[0]
  const recordings = useLiveQuery(() => db.recordings.orderBy('at').reverse().toArray(), []) ?? []

  return (
    <div>
      <h2>Konuş</h2>
      <p className="small-text muted">
        Günde 5 dakika: konuyu sesli anlat ve kaydet. Kayıtlar cihazında kalır; haftalar sonra dinleyip ilerlemeni duyarsın.
      </p>
      <label className="field">
        <span>Tema</span>
        <select value={packName} onChange={(e) => setPackName(e.target.value)}>
          {THEME_PACKS.map((p, i) => (
            <option key={p.name} value={p.name}>
              {i + 1}. {p.name}
            </option>
          ))}
        </select>
      </label>
      <DayCard pack={pack} day={day} />
      <div className="row small-text" style={{ marginTop: -4, marginBottom: 12 }}>
        <button className="small" onClick={() => setDay((day + 6) % 7)}>
          ← Önceki gün
        </button>
        <button className="small" onClick={() => setDay((day + 1) % 7)}>
          Sonraki gün →
        </button>
      </div>
      <Recorder theme={pack.name} day={day} topic={pack.week[day].title} />
      {recordings.length > 0 && (
        <section>
          <h3>Kayıtların ({recordings.length})</h3>
          {recordings.map((r) => (
            <RecordingItem key={r.id} rec={r} />
          ))}
        </section>
      )}
    </div>
  )
}

function Recorder({ theme, day, topic }: { theme: string; day: number; topic: string }) {
  const [state, setState] = useState<'idle' | 'rec' | 'saving'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const recRef = useRef<MediaRecorder | null>(null)
  const startRef = useRef(0)

  useEffect(() => {
    if (state !== 'rec') return
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 250)
    return () => clearInterval(t)
  }, [state])

  // Sayfadan çıkılırsa mikrofonu bırak
  useEffect(() => () => recRef.current?.stream.getTracks().forEach((t) => t.stop()), [])

  const start = async () => {
    setErr(null)
    setSaved(false)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErr('Bu tarayıcı ses kaydını desteklemiyor.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickMime()
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks: Blob[] = []
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const duration = (Date.now() - startRef.current) / 1000
        const type = mr.mimeType || mime || 'audio/webm'
        const blob = new Blob(chunks, { type })
        await navigator.storage?.persist?.().catch(() => false)
        await db.recordings.add({ at: Date.now(), blob, mime: type, duration, theme, day, topic, note: '' })
        setState('idle')
        setSaved(true)
      }
      recRef.current = mr
      startRef.current = Date.now()
      setElapsed(0)
      mr.start(1000)
      setState('rec')
    } catch (e) {
      setErr(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin ver.' : 'Kayıt başlatılamadı: ' + String(e))
    }
  }

  const stop = () => {
    setState('saving')
    recRef.current?.stop()
  }

  const pct = Math.min(1, elapsed / TARGET)
  return (
    <div className="card recorder">
      <div className="rec-time" aria-live="polite">
        {fmt(elapsed)} <span className="muted small-text">/ {fmt(TARGET)}</span>
      </div>
      <div className="progress">
        <div style={{ width: `${pct * 100}%` }} />
      </div>
      {state === 'rec' ? (
        <button className="danger rec-btn" onClick={stop}>
          ■ Durdur ve kaydet
        </button>
      ) : (
        <button className="primary rec-btn" onClick={start} disabled={state === 'saving'}>
          ● Kayda başla
        </button>
      )}
      {elapsed >= TARGET && state === 'rec' && <div className="notice ok small-text">5 dakika tamam! İstersen devam et.</div>}
      {saved && <div className="notice ok small-text">Kaydedildi ✓ Bugünkü seriye sayıldı.</div>}
      {err && <div className="notice err small-text">{err}</div>}
    </div>
  )
}

function RecordingItem({ rec }: { rec: RecordingRec }) {
  const [url, setUrl] = useState<string | null>(null)
  const [note, setNote] = useState(rec.note)
  useEffect(() => {
    if (!rec.blob) return
    const u = URL.createObjectURL(rec.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [rec.blob])
  const remove = async () => {
    if (confirm('Bu kayıt silinsin mi?')) await db.recordings.delete(rec.id!)
  }
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <strong>{rec.topic}</strong>
        <span className="grow" />
        <span className="small-text muted">
          {fmtDate(rec.at)} · {fmt(rec.duration)}
        </span>
      </div>
      <div className="small-text muted">
        {rec.theme} · {DAY_NAMES[rec.day]}
      </div>
      {url ? <audio controls src={url} style={{ width: '100%', marginTop: 8 }} /> : <p className="small-text muted">Ses bu cihazda yok (yedekten geri yüklendi).</p>}
      <div className="row" style={{ marginTop: 6 }}>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== rec.note && db.recordings.update(rec.id!, { note })}
          placeholder="Not: takıldığın kelimeler…"
          className="grow"
        />
        <button className="small danger" onClick={remove}>
          Sil
        </button>
      </div>
    </div>
  )
}
