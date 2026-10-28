import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CLASSICS } from '../content/classics'
import { GRADED, LEVELS } from '../content/graded'
import { db, lemmaKey, type StudyRec } from '../db'
import { analyzeBody, type AnalyzedToken } from '../logic/analyze'
import { addPastedBook, addUserBook, classicByKey, downloadClassic, getReadable, type Readable } from '../logic/library'
import { describeGrammemes, POS_LABELS } from '../morph/tags'
import { go, lemmaHref, useMorph } from './hooks'
import { MeaningsEditor } from './Meanings'
import { Tags } from './TokenSheet'
import { Say } from './Say'
import { ParadigmView } from './Paradigm'

/* ---------- Kütüphane ---------- */

export function LibraryScreen() {
  const books = useLiveQuery(() => db.books.toArray(), []) ?? []
  const progress = useLiveQuery(() => db.progress.toArray(), []) ?? []
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const prog = new Map(progress.map((p) => [p.key, p]))
  const have = new Set(books.map((b) => b.key))
  const userBooks = books.filter((b) => b.source === 'user')
  const last = [...progress].sort((a, b) => b.updatedAt - a.updatedAt)[0]

  const openClassic = async (page: string) => {
    const key = 'ws:' + page
    if (!have.has(key)) {
      const c = CLASSICS.find((x) => x.page === page)!
      setBusy(key)
      setErr(null)
      try {
        await downloadClassic(c)
      } catch (e) {
        setErr(`«${c.title}» indirilemedi: ${e instanceof Error ? e.message : e}. İnternet bağlantını kontrol et.`)
        setBusy(null)
        return
      }
      setBusy(null)
    }
    go('oku/' + encodeURIComponent(key))
  }

  const badge = (key: string) => {
    const p = prog.get(key)
    if (!p) return null
    return p.finished ? <span className="badge st-known">okundu</span> : <span className="badge st-new">devam</span>
  }

  return (
    <div>
      <h2>Oku</h2>
      <p className="small-text muted">
        Okurken kelimeler sözlüğüne göre renklenir: <span className="rd known">bildiğin</span> düz, <span className="rd new">yeni</span>{' '}
        mavi, <span className="rd study">öğrenilecek</span> sarı. Dokun: anlam ve dilbilgisi, öğrenilecekler listesine ekle.
      </p>
      {last && (
        <a className="card resume" href={'#/oku/' + encodeURIComponent(last.key)}>
          <span className="muted small-text">Kaldığın yer</span>
          <ResumeTitle k={last.key} chapter={last.chapter} />
        </a>
      )}
      {err && <div className="notice err">{err}</div>}

      {LEVELS.map((lv) => {
        const graded = GRADED.filter((g) => g.level === lv)
        const classics = CLASSICS.filter((c) => c.level === lv)
        const mine = userBooks.filter((b) => b.level === lv)
        if (!graded.length && !classics.length && !mine.length) return null
        return (
          <section key={lv}>
            <h3>
              <span className="lv">{lv}</span>
            </h3>
            <div className="card" style={{ padding: '4px 12px' }}>
              <ul className="list">
                {graded.map((g) => (
                  <li key={g.id}>
                    <a href={'#/oku/' + encodeURIComponent('g:' + g.id)}>
                      <div>
                        <div className="title" lang="ru">
                          {g.title}
                        </div>
                        <div className="sub">Seviyeli metin · {g.theme}</div>
                      </div>
                      {badge('g:' + g.id)}
                    </a>
                  </li>
                ))}
                {classics.map((c) => {
                  const key = 'ws:' + c.page
                  return (
                    <li key={key}>
                      <button className="li-btn" onClick={() => openClassic(c.page)} disabled={busy === key}>
                        <div>
                          <div className="title" lang="ru">
                            {c.title} <span className="muted small-text">— {c.author}</span>
                          </div>
                          <div className="sub">
                            {c.note}
                            {!have.has(key) && ' · ilk açılışta indirilir'}
                          </div>
                        </div>
                        {busy === key ? <span className="small-text muted">indiriliyor…</span> : badge(key)}
                      </button>
                    </li>
                  )
                })}
                {mine.map((b) => (
                  <li key={b.key}>
                    <a href={'#/oku/' + encodeURIComponent(b.key)}>
                      <div>
                        <div className="title" lang="ru">
                          {b.title}
                        </div>
                        <div className="sub">
                          Senin eklediğin{b.author ? ' · ' + b.author : ''} · {b.chapters.length} bölüm
                        </div>
                      </div>
                      {badge(b.key)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )
      })}

      <h3>Kendi metnini ya da kitabını ekle</h3>
      {adding ? <AddBook onDone={() => setAdding(false)} /> : <button className="full" onClick={() => setAdding(true)}>+ Metin veya kitap ekle (.txt, .epub)</button>}
      <p className="small-text muted">Klasikler Vikikaynak'tan (ru.wikisource.org) indirilir; telifi bitmiş eserlerdir. İndirilen metin cihazda kalır, sonra internetsiz okunur.</p>
    </div>
  )
}

function ResumeTitle({ k, chapter }: { k: string; chapter: number }) {
  const r = useLiveQuery(() => getReadable(k), [k])
  if (!r) return <strong>…</strong>
  return (
    <strong lang="ru">
      {r.title}
      {r.chapters.length > 1 && <span className="muted small-text"> · {r.chapters[chapter]?.title}</span>}
    </strong>
  )
}

function AddBook({ onDone }: { onDone: () => void }) {
  const [level, setLevel] = useState('B1')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const finish = (key: string) => {
    onDone()
    go('oku/' + encodeURIComponent(key))
  }
  return (
    <div className="card">
      <label className="field">
        <span>Seviye</span>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <button className="full" onClick={() => fileRef.current?.click()}>
        Dosya seç (.txt veya .epub)
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.epub,text/plain,application/epub+zip"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            finish((await addUserBook(f, level)).key)
          } catch (x) {
            setErr(x instanceof Error ? x.message : String(x))
          }
        }}
      />
      <p className="small-text muted" style={{ textAlign: 'center' }}>
        ya da metni yapıştır
      </p>
      <label className="field">
        <span>Başlık</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        <span>Metin</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} lang="ru" style={{ minHeight: 140 }} />
      </label>
      {err && <div className="notice err">{err}</div>}
      <div className="row">
        <button className="primary" disabled={!body.trim()} onClick={async () => finish((await addPastedBook(title, body, level)).key)}>
          Ekle
        </button>
        <button onClick={onDone}>Vazgeç</button>
      </div>
    </div>
  )
}

/* ---------- Okuma ---------- */

export function ReaderScreen({ bookKey }: { bookKey: string }) {
  const [book, setBook] = useState<Readable | null | undefined>(undefined)
  const progress = useLiveQuery(async () => (await db.progress.get(bookKey)) ?? null, [bookKey])
  const [chapter, setChapter] = useState<number | null>(null)

  useEffect(() => {
    getReadable(bookKey).then(setBook)
  }, [bookKey])
  useEffect(() => {
    if (chapter == null && progress !== undefined) setChapter(progress?.chapter ?? 0)
  }, [progress, chapter])

  const ch = book && chapter != null ? book.chapters[Math.min(chapter, book.chapters.length - 1)] : null

  useEffect(() => {
    if (book && chapter != null) db.progress.put({ key: bookKey, chapter, updatedAt: Date.now(), finished: progress?.finished })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey, chapter, book])

  if (book === undefined || chapter == null) return <p className="muted">Yükleniyor…</p>
  if (!book) return <p>Metin bulunamadı.</p>
  const n = book.chapters.length
  const isLast = chapter >= n - 1
  const classic = classicByKey(bookKey)

  return (
    <div>
      <p>
        <a href="#/oku">← Kütüphane</a>
      </p>
      <h2 lang="ru" style={{ marginBottom: 2 }}>
        {book.title}
      </h2>
      <p className="small-text muted">
        {book.author} · <span className="lv">{book.level}</span>
        {n > 1 && (
          <>
            {' '}
            · {ch?.title} ({chapter + 1}/{n})
          </>
        )}
      </p>
      <ReadingText key={bookKey + ':' + chapter} body={ch?.body ?? ''} source={book.title} scope={n > 1 ? 'bölümde' : 'metinde'} />
      <div className="row">
        {chapter > 0 && <button onClick={() => (setChapter(chapter - 1), window.scrollTo(0, 0))}>← Önceki</button>}
        <span className="grow" />
        {!isLast ? (
          <button className="primary" onClick={() => (setChapter(chapter + 1), window.scrollTo(0, 0))}>
            Sonraki bölüm →
          </button>
        ) : (
          <button
            className="primary"
            onClick={async () => {
              await db.progress.put({ key: bookKey, chapter, updatedAt: Date.now(), finished: true })
              go('oku')
            }}
          >
            ✓ Bitirdim
          </button>
        )}
      </div>
      {classic && <p className="small-text muted">Kaynak: Vikikaynak, «{classic.page}». Kamu malı (public domain).</p>}
    </div>
  )
}

/** Sözlüğe göre renklendirilmiş okuma metni: istatistik, kelime paneli, öğrenilecekler. */
export function ReadingText({ body, source, scope = 'metinde' }: { body: string; source: string; scope?: string }) {
  const ms = useMorph()
  const active = useLiveQuery(() => db.lemmas.where('useCount').above(0).primaryKeys(), [])
  const study = useLiveQuery(() => db.study.toArray(), [])
  const [sel, setSel] = useState<number | null>(null)
  const knownKeys = useMemo(() => new Set(active ?? []), [active])
  const studyMap = useMemo(() => new Map((study ?? []).map((s) => [s.id, s])), [study])
  const tokens = useMemo(() => {
    if (!body || ms.status !== 'ready') return []
    return analyzeBody(body, ms.morph, { knownKeys, textChoices: {}, formChoices: {} })
  }, [body, ms, knownKeys])

  const keyOf = (t: AnalyzedToken) => (t.choice && t.choice.kind === 'lemma' ? lemmaKey(t.choice.lemma, t.choice.pos) : null)
  const cls = (t: AnalyzedToken) => {
    const k = keyOf(t)
    if (!k) return 'unk'
    if (knownKeys.has(k)) return 'known'
    if (studyMap.has(k)) return 'study'
    return 'new'
  }

  const stats = useMemo(() => {
    const all = new Set<string>()
    let known = 0
    let st = 0
    for (const t of tokens) {
      const k = keyOf(t)
      if (!k || all.has(k)) continue
      all.add(k)
      if (knownKeys.has(k)) known++
      else if (studyMap.has(k)) st++
    }
    return { total: all.size, known, study: st }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, knownKeys, studyMap])

  const parts: React.ReactNode[] = []
  let pos = 0
  for (const t of tokens) {
    if (t.start > pos) parts.push(body.slice(pos, t.start))
    parts.push(
      <span key={t.index} className={'rd ' + cls(t) + (sel === t.index ? ' selected' : '')} role="button" tabIndex={0} onClick={() => setSel(t.index)}>
        {body.slice(t.start, t.end)}
      </span>,
    )
    pos = t.end
  }
  parts.push(body.slice(pos))

  const selToken = sel != null ? tokens.find((t) => t.index === sel) : undefined

  return (
    <>
      {ms.status === 'ready' && stats.total > 0 && (
        <div className="card small-text">
          Bu {scope} {stats.total} farklı kelime var: <strong>{stats.known}</strong> tanesi sözlüğünde (%
          {Math.round((stats.known / stats.total) * 100)}), {stats.study > 0 && <>{stats.study} öğrenilecek, </>}
          <strong>{stats.total - stats.known - stats.study}</strong> yeni.
          <div className="progress" style={{ height: 8 }}>
            <div style={{ width: `${(stats.known / stats.total) * 100}%`, background: 'var(--known-line)' }} />
          </div>
        </div>
      )}
      <div className="card reader" lang="ru">
        {ms.status !== 'ready' ? <div className="analyzed">{body}</div> : <div className="analyzed reading">{parts}</div>}
      </div>
      {selToken && <ReaderSheet token={selToken} source={source} study={studyMap} known={knownKeys} onClose={() => setSel(null)} />}
    </>
  )
}

function ReaderSheet({
  token,
  source,
  study,
  known,
  onClose,
}: {
  token: AnalyzedToken
  source: string
  study: Map<string, StudyRec>
  known: Set<string>
  onClose: () => void
}) {
  const cands = token.analysis.candidates
  const [idx, setIdx] = useState(0)
  const c = cands[idx]
  const key = c ? lemmaKey(c.lemma, c.pos) : null
  const lemma = useLiveQuery(() => (key ? db.lemmas.get(key) : undefined), [key])
  const st = key ? study.get(key) : undefined
  const [meanings, setMeanings] = useState<string[]>([])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const addStudy = async () => {
    if (!c || !key) return
    await db.study.put({ id: key, lemma: c.lemma, pos: c.pos, meanings, sentence: token.sentence, source, addedAt: Date.now() })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`«${token.text}» kelimesi`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="form" lang="ru">
            {token.text} <Say text={token.text} />
          </div>
          <button className="small" onClick={onClose}>
            Kapat
          </button>
        </div>
        {!c ? (
          <div className="notice err small-text">Bu kelime morfoloji sözlüğünde yok (özel isim ya da eski bir yazım olabilir).</div>
        ) : (
          <>
            <div className="lemma-line" lang="ru">
              <strong>{token.form}</strong> = <strong>{c.lemma}</strong> <span className="badge">{POS_LABELS[c.pos]}</span>{' '}
              {key && known.has(key) && <span className="badge st-known">sözlüğünde</span>}
              {st && <span className="badge st-ambiguous">öğrenilecek</span>}
            </div>
            {['verb', 'noun', 'adj'].includes(c.pos) && (
              <details className="sheet-paradigm">
                <summary className="small-text">Çekim tablosu</summary>
                <ParadigmView lemma={c.lemma} pos={c.pos} />
              </details>
            )}
            <Tags grammemes={c.grammemes} />
            {cands.length > 1 && (
              <div className="row small-text" style={{ margin: '6px 0' }}>
                <span className="muted">Başka olasılık:</span>
                {cands.map((x, i) => (
                  <button key={x.lemma + x.pos} className={'small' + (i === idx ? ' primary' : '')} onClick={() => setIdx(i)}>
                    {x.lemma} · {POS_LABELS[x.pos]}
                  </button>
                ))}
              </div>
            )}
            {c.altGrammemes.length > 0 && (
              <div className="small-text muted">ya da: {c.altGrammemes.slice(0, 2).map((g) => describeGrammemes(g).join(', ')).join(' · ')}</div>
            )}
            {lemma && lemma.meanings.length > 0 && (
              <p>
                Anlamı: <strong>{lemma.meanings.join(', ')}</strong>
              </p>
            )}
            {st && st.meanings.length > 0 && !(lemma && lemma.meanings.length) && (
              <p>
                Anlamı: <strong>{st.meanings.join(', ')}</strong>
              </p>
            )}
            {key && known.has(key) ? (
              <p className="small-text">
                Bu kelimeyi yazılarında kullanmışsın. <a href={lemmaHref(key)}>Kelimeyi aç</a>
              </p>
            ) : st ? (
              <>
                <h3>Anlam</h3>
                <MeaningsEditor value={st.meanings} onChange={(v) => db.study.update(st.id, { meanings: v })} />
                <button className="full" style={{ marginTop: 10 }} onClick={() => db.study.delete(st.id)}>
                  Öğrenilecekler listesinden çıkar
                </button>
              </>
            ) : (
              <>
                <h3>Öğrenilecekler listesine ekle</h3>
                <MeaningsEditor value={meanings} onChange={setMeanings} placeholder="İsteğe bağlı: Türkçe anlam" />
                <button className="primary full" style={{ marginTop: 10 }} onClick={addStudy}>
                  + Öğrenilecekler listesine ekle
                </button>
                <p className="small-text muted">Bu kelimeyi bir yazında kullandığında aktif sözlüğüne geçer.</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- Öğrenilecekler ---------- */

export function StudyScreen() {
  const study = useLiveQuery(() => db.study.orderBy('addedAt').reverse().toArray(), []) ?? null
  const active = useLiveQuery(() => db.lemmas.where('useCount').above(0).primaryKeys(), []) ?? []
  const used = new Set(active)
  const [showUsed, setShowUsed] = useState(false)
  if (!study) return <p className="muted">Yükleniyor…</p>
  const open = study.filter((s) => !used.has(s.id))
  const done = study.filter((s) => used.has(s.id))
  const list = showUsed ? done : open
  return (
    <div>
      <SozlukTabs current="ogren" />
      <p className="small-text muted">
        Okurken eklediğin kelimeler. Bir yazında kullandığında «kullandıkların» kısmına geçer ve aktif sözlüğünde sayılır. <a href="#/tekrar">Kartlarla çalış →</a>
      </p>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className={showUsed ? '' : 'primary'} onClick={() => setShowUsed(false)}>
          Öğrenilecek ({open.length})
        </button>
        <button className={showUsed ? 'primary' : ''} onClick={() => setShowUsed(true)}>
          Kullandıkların ({done.length})
        </button>
      </div>
      {list.length === 0 ? (
        <div className="empty">
          {showUsed ? 'Henüz listeden kullandığın kelime yok.' : <>Liste boş. <a href="#/oku">Bir şey oku</a> ve bilmediğin kelimelere dokun.</>}
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 12px' }}>
          {list.map((s) => (
            <div key={s.id} className="sentence">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong lang="ru">{s.lemma}</strong> <Say text={s.lemma} /> <span className="badge">{POS_LABELS[s.pos]}</span>{' '}
                  {used.has(s.id) && <a href={lemmaHref(s.id)} className="small-text">sözlükte aç</a>}
                </div>
                <button className="small" onClick={() => db.study.delete(s.id)} aria-label={`${s.lemma} sil`}>
                  Sil
                </button>
              </div>
              <div className="small-text" lang="ru">
                {s.sentence}
              </div>
              <div className="small-text muted">{s.source}</div>
              <MeaningsEditor value={s.meanings} onChange={(v) => db.study.update(s.id, { meanings: v })} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SozlukTabs({ current }: { current: 'aktif' | 'ogren' }) {
  const count = useLiveQuery(() => db.study.count(), []) ?? 0
  return (
    <div className="tabs" role="tablist">
      <a href="#/sozluk" role="tab" aria-selected={current === 'aktif'} className={current === 'aktif' ? 'on' : ''}>
        Aktif sözlük
      </a>
      <a href="#/ogren" role="tab" aria-selected={current === 'ogren'} className={current === 'ogren' ? 'on' : ''}>
        Öğrenilecekler{count ? ` (${count})` : ''}
      </a>
    </div>
  )
}
