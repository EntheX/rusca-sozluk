import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LEVELS } from '../content/graded'
import { db, type AudioRec } from '../db'
import { fmtDate, go } from './hooks'
import { ReadingText } from './ReadScreens'

const fmtTime = (s: number) => {
  if (!isFinite(s)) return '–:–'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}
const fmtSize = (b: number) => (b > 1e6 ? (b / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' MB' : Math.round(b / 1e3) + ' KB')

/** Tarayıcıdan verilerin silinmemesini iste (büyük ses dosyaları için önemli). */
async function askPersist() {
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* desteklenmiyorsa sorun değil */
  }
}

export function AudioList() {
  const audios = useLiveQuery(() => db.audios.orderBy('addedAt').reverse().toArray(), []) ?? []
  const [adding, setAdding] = useState(false)
  return (
    <section>
      <h3>Kendi ses dosyaların</h3>
      {audios.length > 0 && (
        <div className="card" style={{ padding: '4px 12px' }}>
          <ul className="list">
            {audios.map((a) => (
              <li key={a.id}>
                <a href={'#/dinle/a/' + a.id}>
                  <div style={{ minWidth: 0 }}>
                    <div className="title" lang="ru">
                      {a.title} <span className="lv">{a.level}</span>
                    </div>
                    <div className="sub">
                      {a.blob ? fmtSize(a.size) : 'ses dosyası bu cihazda yok'}
                      {a.duration ? ` · ${fmtTime(a.duration)}` : ''}
                      {a.transcript ? ' · metinli' : ''}
                      {a.position > 5 && a.duration && a.position < a.duration - 5 ? ` · ${fmtTime(a.position)}'de kaldın` : ''}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {adding ? (
        <AddAudio onDone={() => setAdding(false)} />
      ) : (
        <button className="full" onClick={() => setAdding(true)}>
          + Ses dosyası yükle (mp3, m4a, ogg…)
        </button>
      )}
      <p className="small-text muted">
        Yüklediğin ses dosyası cihazda saklanır ve internetsiz dinlenir. Yanına bölümün metnini (transkript) eklersen okuma modundaki gibi renkli
        okursun. Ses dosyaları JSON yedeğine girmez (çok büyük); başlık ve metin girer.
      </p>
    </section>
  )
}

function AddAudio({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState('B1')
  const [transcript, setTranscript] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const txtRef = useRef<HTMLInputElement>(null)

  const save = async () => {
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      await askPersist()
      const id = await db.audios.add({
        title: title.trim() || file.name.replace(/\.[^.]+$/, ''),
        level,
        blob: file,
        mime: file.type || 'audio/mpeg',
        size: file.size,
        transcript: transcript.trim(),
        position: 0,
        addedAt: Date.now(),
      })
      onDone()
      go('dinle/a/' + id)
    } catch (e) {
      setErr('Kaydedilemedi: ' + (e instanceof Error ? e.message : String(e)) + '. Cihazda yer kalmamış olabilir.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <button className="full" onClick={() => fileRef.current?.click()}>
        {file ? `✓ ${file.name} (${fmtSize(file.size)})` : 'Ses dosyası seç'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.ogg,.opus,.wav,.aac"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          setFile(f)
          if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''))
          e.target.value = ''
        }}
      />
      <label className="field" style={{ marginTop: 12 }}>
        <span>Başlık</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
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
        <span>
          Metin / transkript (isteğe bağlı) ·{' '}
          <button className="small" type="button" onClick={() => txtRef.current?.click()}>
            .txt'den al
          </button>
        </span>
        <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} lang="ru" style={{ minHeight: 120 }} placeholder="Bölümün Rusça metnini buraya yapıştır" />
      </label>
      <input
        ref={txtRef}
        type="file"
        accept=".txt,text/plain"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) setTranscript(await f.text())
        }}
      />
      {err && <div className="notice err">{err}</div>}
      <div className="row">
        <button className="primary" disabled={!file || busy} onClick={save}>
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button onClick={onDone}>Vazgeç</button>
      </div>
    </div>
  )
}

const SPEEDS = [0.75, 0.9, 1, 1.25]

export function AudioScreen({ id }: { id: number }) {
  const rec = useLiveQuery(async () => (await db.audios.get(id)) ?? null, [id])
  const logs = useLiveQuery(() => db.podcastLogs.where('podcastId').equals('a' + id).reverse().sortBy('date'), [id]) ?? []
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const lastSaved = useRef(0)
  // Gölgeleme: A-B döngüsü; isteğe bağlı olarak her tekrardan sonra konuşman için boşluk
  const [loopA, setLoopA] = useState<number | null>(null)
  const [loopB, setLoopB] = useState<number | null>(null)
  const [gap, setGap] = useState(true)
  const gapTimer = useRef<number | null>(null)
  useEffect(() => () => void (gapTimer.current && clearTimeout(gapTimer.current)), [])
  const replaceRef = useRef<HTMLInputElement>(null)

  const hasBlob = !!rec?.blob
  const url = useMemo(() => (rec?.blob ? URL.createObjectURL(rec.blob) : null), [rec?.blob])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  // Kaldığın yerden başlat
  const restored = useRef(false)
  const onLoaded = () => {
    const a = audioRef.current
    if (!a || !rec) return
    setDur(a.duration)
    if (!rec.duration && isFinite(a.duration)) db.audios.update(id, { duration: a.duration })
    if (!restored.current && rec.position > 0 && rec.position < a.duration - 3) a.currentTime = rec.position
    restored.current = true
  }
  const onTime = () => {
    const a = audioRef.current
    if (!a) return
    setTime(a.currentTime)
    if (loopA != null && loopB != null && a.currentTime >= loopB && !a.paused) {
      if (gap) {
        a.pause()
        // Bölüm kadar sessiz bekle (sen tekrar et), sonra başa dön
        gapTimer.current = window.setTimeout(() => {
          a.currentTime = loopA
          a.play()
        }, ((loopB - loopA) / a.playbackRate) * 1000 + 600)
      } else a.currentTime = loopA
      return
    }
    if (Math.abs(a.currentTime - lastSaved.current) > 5) {
      lastSaved.current = a.currentTime
      db.audios.update(id, { position: a.currentTime })
    }
  }
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed, url])

  if (rec === undefined) return <p className="muted">Yükleniyor…</p>
  if (!rec) return <p>Ses kaydı bulunamadı.</p>

  const seek = (d: number) => {
    const a = audioRef.current
    if (a) a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + d))
  }
  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) a.play()
    else a.pause()
  }

  return (
    <div>
      <p>
        <a href="#/dinle">← Dinle</a>
      </p>
      <h2 lang="ru" style={{ marginBottom: 2 }}>
        {rec.title}
      </h2>
      <p className="small-text muted">
        <span className="lv">{rec.level}</span> · {fmtDate(rec.addedAt)} · {fmtSize(rec.size)}
        {logs.length > 0 && ` · ${logs.length} kez dinledin`}
      </p>

      <div className="card player">
        {hasBlob && url ? (
          <>
            <audio
              ref={audioRef}
              src={url}
              preload="metadata"
              onLoadedMetadata={onLoaded}
              onTimeUpdate={onTime}
              onPlay={() => setPlaying(true)}
              onPause={() => {
                setPlaying(false)
                const a = audioRef.current
                if (a) db.audios.update(id, { position: a.currentTime })
              }}
              onEnded={() => db.audios.update(id, { position: 0 })}
            />
            <input
              type="range"
              className="seek"
              min={0}
              max={dur || 0}
              step={1}
              value={time}
              aria-label="Konum"
              onChange={(e) => {
                const a = audioRef.current
                if (a) a.currentTime = Number(e.target.value)
              }}
            />
            <div className="row small-text muted" style={{ justifyContent: 'space-between' }}>
              <span>{fmtTime(time)}</span>
              <span>{fmtTime(dur)}</span>
            </div>
            <div className="controls">
              <button onClick={() => seek(-10)} aria-label="10 saniye geri">
                −10 sn
              </button>
              <button className="primary play" onClick={toggle} aria-label={playing ? 'Duraklat' : 'Oynat'}>
                {playing ? '❚❚' : '▶'}
              </button>
              <button onClick={() => seek(10)} aria-label="10 saniye ileri">
                +10 sn
              </button>
            </div>
            <div className="shadow-box">
              <div className="small-text">
                <strong>Gölgeleme</strong>{' '}
                <span className="muted">
                  {loopA != null && loopB != null
                    ? `${fmtTime(loopA)} – ${fmtTime(loopB)} arası döngüde`
                    : 'bir bölümü döngüye al, dinle ve üstüne tekrar et'}
                </span>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <button
                  className="small"
                  onClick={() => {
                    const t = audioRef.current?.currentTime ?? 0
                    setLoopA(Math.max(0, t - 5))
                    setLoopB(t)
                    if (audioRef.current) {
                      audioRef.current.currentTime = Math.max(0, t - 5)
                      audioRef.current.play()
                    }
                  }}
                >
                  Son 5 sn'yi döngüle
                </button>
                <button className={'small' + (loopA != null ? ' primary' : '')} onClick={() => setLoopA(audioRef.current?.currentTime ?? 0)}>
                  A {loopA != null ? fmtTime(loopA) : ''}
                </button>
                <button
                  className={'small' + (loopB != null ? ' primary' : '')}
                  onClick={() => {
                    const t = audioRef.current?.currentTime ?? 0
                    if (loopA == null || t > loopA + 0.5) setLoopB(t)
                  }}
                >
                  B {loopB != null ? fmtTime(loopB) : ''}
                </button>
                {(loopA != null || loopB != null) && (
                  <button
                    className="small"
                    onClick={() => {
                      setLoopA(null)
                      setLoopB(null)
                      if (gapTimer.current) clearTimeout(gapTimer.current)
                    }}
                  >
                    Kaldır
                  </button>
                )}
              </div>
              <label className="row small-text" style={{ gap: 6, marginTop: 6 }}>
                <input type="checkbox" checked={gap} onChange={(e) => setGap(e.target.checked)} /> Her tekrardan sonra benim söylemem için bekle
              </label>
            </div>
            <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
              {SPEEDS.map((s) => (
                <button key={s} className={'small' + (speed === s ? ' primary' : '')} onClick={() => setSpeed(s)}>
                  {String(s).replace('.', ',')}×
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="notice warn">
            Bu kaydın ses dosyası bu cihazda yok (yedekten geldi). Aynı dosyayı yeniden seç:{' '}
            <button className="small" onClick={() => replaceRef.current?.click()}>
              Dosya seç
            </button>
          </div>
        )}
        <input
          ref={replaceRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) {
              await askPersist()
              await db.audios.update(id, { blob: f, mime: f.type, size: f.size })
            }
          }}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={() => db.podcastLogs.add({ podcastId: 'a' + id, date: Date.now(), note: rec.title })}>✓ Dinledim</button>
          <span className="grow" />
          <button
            className="danger small"
            onClick={async () => {
              if (!confirm(`«${rec.title}» ve ses dosyası silinsin mi?`)) return
              await db.audios.delete(id)
              await db.podcastLogs.where('podcastId').equals('a' + id).delete()
              go('dinle')
            }}
          >
            Sil
          </button>
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Metin</h3>
        {!editing && (
          <button
            className="small"
            onClick={() => {
              setDraft(rec.transcript)
              setEditing(true)
            }}
          >
            {rec.transcript ? 'Metni düzenle' : '+ Metin ekle'}
          </button>
        )}
      </div>
      {editing ? (
        <div className="card">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} lang="ru" style={{ minHeight: 200 }} placeholder="Bölümün Rusça metni" />
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="primary"
              onClick={async () => {
                await db.audios.update(id, { transcript: draft.trim() })
                setEditing(false)
              }}
            >
              Kaydet
            </button>
            <button onClick={() => setEditing(false)}>Vazgeç</button>
          </div>
        </div>
      ) : rec.transcript ? (
        <ReadingText body={rec.transcript} source={rec.title} />
      ) : (
        <p className="small-text muted">Bu kaydın metni yok. Birçok podcastin sitesinde bölüm metni olur; yapıştırırsan kelimeleri renkli görürsün.</p>
      )}
    </div>
  )
}

export type { AudioRec }
