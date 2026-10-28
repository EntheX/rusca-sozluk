import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, type ReviewRec, type TextRec } from '../db'
import { buildPrompt, levelValue, parseReview, quickCheck } from '../logic/review'
import { fmtDate, useMorph } from './hooks'

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s)
    return true
  } catch {
    // Eski tarayıcılar / izin yoksa: geçici textarea ile kopyala
    const ta = document.createElement('textarea')
    ta.value = s
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

/** Metin sayfasında: hızlı kontrol + Claude değerlendirmesi + geçmiş değerlendirmeler. */
export function ReviewPanel({ text }: { text: TextRec }) {
  const reviews = useLiveQuery(() => db.reviews.where('textId').equals(text.id).sortBy('at'), [text.id]) ?? []
  const latest = reviews[reviews.length - 1]
  const [open, setOpen] = useState(false)
  return (
    <section>
      <h3>Değerlendirme</h3>
      <QuickCheckCard text={text} />
      {latest && <ReviewView review={latest} stale={latest.body !== text.body} />}
      {open ? (
        <ClaudeFlow text={text} onDone={() => setOpen(false)} />
      ) : (
        <button className={latest ? 'full' : 'primary full'} onClick={() => setOpen(true)}>
          {latest ? 'Yeniden değerlendir' : 'Claude ile değerlendir (seviye + tüm hatalar)'}
        </button>
      )}
      {reviews.length > 1 && (
        <p className="small-text muted">
          Önceki değerlendirmeler:{' '}
          {reviews
            .slice(0, -1)
            .map((r) => `${fmtDate(r.at)} ${r.level}${r.score ? ' · ' + r.score + '/10' : ''}`)
            .join(' — ')}
        </p>
      )}
    </section>
  )
}

function QuickCheckCard({ text }: { text: TextRec }) {
  const ms = useMorph()
  const q = useMemo(() => (ms.status === 'ready' ? quickCheck(text.body, text.theme, ms.morph) : null), [ms, text.body, text.theme])
  if (!q) return null
  return (
    <div className="card">
      <div className="muted small-text" style={{ marginBottom: 6 }}>
        Hızlı kontrol (internetsiz)
      </div>
      <div className="stats-row">
        <div>
          <strong>{q.words}</strong>
          <span>kelime</span>
        </div>
        <div>
          <strong>{q.sentences}</strong>
          <span>cümle</span>
        </div>
        <div>
          <strong>{q.avgSentence.toLocaleString('tr-TR')}</strong>
          <span>kelime / cümle</span>
        </div>
        {q.themeTotal > 0 && (
          <div>
            <strong>{q.themeUsed.length}</strong>
            <span>tema kelimesi</span>
          </div>
        )}
      </div>
      {q.unknown.length > 0 ? (
        <p className="small-text" style={{ marginBottom: 0 }}>
          <span className="st-unknown-text">Sözlükte bulunamayan {q.unknown.length} kelime</span> (yazım hatası olabilir):{' '}
          <span lang="ru">{q.unknown.join(', ')}</span>
        </p>
      ) : (
        <p className="small-text muted" style={{ marginBottom: 0 }}>
          Bütün kelimeler morfoloji sözlüğünde var; yazım hatası görünmüyor. Dilbilgisi hataları için Claude değerlendirmesini kullan.
        </p>
      )}
      {q.avgSentence > 0 && q.avgSentence < 6 && q.words > 20 && (
        <p className="small-text muted" style={{ marginBottom: 0 }}>
          Cümlelerin kısa. B2 için «который», «потому что», «хотя», «если бы» ile cümleleri birleştirmeyi dene.
        </p>
      )}
    </div>
  )
}

function ClaudeFlow({ text, onDone }: { text: TextRec; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const copyAndOpen = async () => {
    const ok = await copyText(buildPrompt(text))
    setCopied(ok)
    if (ok) window.open('https://claude.ai/new', '_blank', 'noopener')
    else setErr('Kopyalanamadı. Tarayıcı izin vermedi.')
  }

  const save = async () => {
    const p = parseReview(raw)
    if (p.raw && !p.errors.length && p.level === '?') {
      setErr('Cevapta değerlendirme bulunamadı. Claude\'un cevabının tamamını (JSON bloğuyla birlikte) yapıştır.')
      return
    }
    await db.reviews.add({ ...p, textId: text.id, at: Date.now(), body: text.body })
    onDone()
  }

  return (
    <div className="card">
      <ol className="steps">
        <li>
          <button className="primary small" onClick={copyAndOpen}>
            İstemi kopyala ve Claude'u aç
          </button>
          {copied && <span className="small-text muted"> Kopyalandı ✓</span>}
        </li>
        <li>Claude'da yeni sohbete yapıştır ve gönder.</li>
        <li>Gelen cevabın tamamını kopyala (cevabın altındaki kopyala düğmesi) ve buraya yapıştır:</li>
      </ol>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder='```json { "seviye": … }```' style={{ minHeight: 120 }} />
      {err && <div className="notice err">{err}</div>}
      <div className="row">
        <button className="primary" disabled={!raw.trim()} onClick={save}>
          Değerlendirmeyi kaydet
        </button>
        <button onClick={onDone}>Vazgeç</button>
      </div>
    </div>
  )
}

export function ReviewView({ review, stale }: { review: ReviewRec; stale?: boolean }) {
  const [showFixed, setShowFixed] = useState(false)
  return (
    <div className="card review">
      <div className="row" style={{ alignItems: 'center' }}>
        <span className="level-badge">{review.level}</span>
        {review.score != null && <strong>{review.score.toLocaleString('tr-TR')}/10</strong>}
        <span className="grow" />
        <span className="small-text muted">{fmtDate(review.at)}</span>
      </div>
      {stale && <div className="notice warn small-text">Metni bu değerlendirmeden sonra düzenledin; istersen yeniden değerlendir.</div>}
      {review.summary && <p>{review.summary}</p>}
      {review.errors.length > 0 ? (
        <>
          <h4>{review.errors.length} hata</h4>
          <ul className="errors">
            {review.errors.map((e, i) => (
              <li key={i}>
                <span className="badge">{e.type}</span>{' '}
                <span lang="ru">
                  <del>{e.wrong}</del> → <ins>{e.right}</ins>
                </span>
                {e.note && <div className="small-text muted">{e.note}</div>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        !review.raw && <p className="notice ok">Hata bulunmadı. Harika!</p>
      )}
      {review.strengths.length > 0 && (
        <>
          <h4>İyi yaptıkların</h4>
          <ul>
            {review.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}
      {review.tips.length > 0 && (
        <>
          <h4>Bir sonraki metin için</h4>
          <ul>
            {review.tips.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}
      {review.corrected && (
        <>
          <button className="small" onClick={() => setShowFixed(!showFixed)}>
            {showFixed ? 'Düzeltilmiş metni gizle' : 'Düzeltilmiş metni göster'}
          </button>
          {showFixed && (
            <p lang="ru" className="corrected">
              {review.corrected}
            </p>
          )}
        </>
      )}
      {review.raw && <p className="small-text" style={{ whiteSpace: 'pre-wrap' }}>{review.raw}</p>}
    </div>
  )
}

/** Hata defteri: bütün değerlendirmelerdeki hatalar, türe göre; seviye geçmişi. */
export function MistakesScreen() {
  const data = useLiveQuery(async () => {
    const reviews = await db.reviews.orderBy('at').toArray()
    const texts = new Map((await db.texts.toArray()).map((t) => [t.id, t]))
    // Her metnin yalnızca en son değerlendirmesi hata sayımına girer
    const lastByText = new Map<number, ReviewRec>()
    for (const r of reviews) lastByText.set(r.textId, r)
    return { reviews, texts, last: [...lastByText.values()] }
  }, [])
  const [type, setType] = useState<string | null>(null)
  if (!data) return <p className="muted">Yükleniyor…</p>
  const all = data.last.flatMap((r) => r.errors.map((e) => ({ ...e, textId: r.textId, at: r.at })))
  const byType = new Map<string, number>()
  for (const e of all) byType.set(e.type, (byType.get(e.type) ?? 0) + 1)
  const types = [...byType.entries()].sort((a, b) => b[1] - a[1])
  const max = types[0]?.[1] ?? 1
  const list = all.filter((e) => !type || e.type === type).sort((a, b) => b.at - a.at)
  const history = data.reviews.filter((r) => levelValue(r.level) != null)

  return (
    <div>
      <h2>Hata defteri</h2>
      {all.length === 0 && history.length === 0 ? (
        <div className="empty">
          Henüz değerlendirilmiş metin yok. Bir metni sözlüğe yazdıktan sonra «Claude ile değerlendir» de; hatalar burada toplanır.
        </div>
      ) : (
        <>
          {history.length > 0 && (
            <div className="card">
              <div className="muted small-text">Seviye geçmişi</div>
              <div className="level-history">
                {history.slice(-12).map((r) => (
                  <a key={r.id} href={'#/arsiv/' + r.textId} title={data.texts.get(r.textId)?.title}>
                    <span className="level-badge">{r.level}</span>
                    <span className="small-text muted">{new Date(r.at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {types.length > 0 && (
            <div className="card">
              <div className="muted small-text" style={{ marginBottom: 6 }}>
                En sık hataların (her metnin son değerlendirmesi)
              </div>
              {types.map(([t, n]) => (
                <button key={t} className={'bar-row' + (type === t ? ' on' : '')} onClick={() => setType(type === t ? null : t)}>
                  <span className="bar-label">{t}</span>
                  <span className="bar">
                    <span style={{ width: `${(n / max) * 100}%` }} />
                  </span>
                  <span className="bar-n">{n}</span>
                </button>
              ))}
            </div>
          )}
          {list.length > 0 && (
            <div className="card">
              <ul className="errors">
                {list.map((e, i) => (
                  <li key={i}>
                    <span className="badge">{e.type}</span>{' '}
                    <span lang="ru">
                      <del>{e.wrong}</del> → <ins>{e.right}</ins>
                    </span>
                    {e.note && <div className="small-text muted">{e.note}</div>}
                    <div className="small-text">
                      <a href={'#/arsiv/' + e.textId}>{data.texts.get(e.textId)?.title ?? 'metin'}</a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
