import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { currentBlock } from '../content/calendar'
import { GRADED } from '../content/graded'
import { GRAMMAR, THEME_GRAMMAR, topicById, type GrammarTopic } from '../content/grammar'
import { LEVEL_TESTS } from '../content/levelTests'
import { db, type ReviewRec } from '../db'
import { buildDrill, isCorrect, type DrillItem } from '../logic/grammarDrill'
import { splitSentences } from '../morph/tokenize'
import { useMorph } from './hooks'
import { copyText } from './ReviewScreens'
import { Say } from './Say'

/** Her metnin son değerlendirmesindeki hata türü sayıları */
function useErrorCounts() {
  return useLiveQuery(async () => {
    const last = new Map<number, ReviewRec>()
    for (const r of await db.reviews.orderBy('at').toArray()) last.set(r.textId, r)
    const m = new Map<string, number>()
    for (const r of last.values()) for (const e of r.errors) m.set(e.type, (m.get(e.type) ?? 0) + 1)
    return m
  }, [])
}

/** Hata defterine göre en çok çalışılması gereken konu */
export function topicForErrors(counts: Map<string, number> | undefined): { topic: GrammarTopic; n: number; type: string } | null {
  if (!counts || !counts.size) return null
  const [type, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const topic = GRAMMAR.find((t) => t.errorTypes[0] === type) ?? GRAMMAR.find((t) => t.errorTypes.includes(type))
  return topic ? { topic, n, type } : null
}

export function GrammarScreen() {
  const cb = currentBlock()
  const weekly = cb && cb.block.no ? THEME_GRAMMAR[cb.block.no - 1] : undefined
  const weeklyTopic = weekly ? topicById(weekly.topic) : undefined
  const errors = useErrorCounts()
  const suggested = topicForErrors(errors)
  const best = useLiveQuery(async () => {
    const m = new Map<string, number>()
    for (const r of await db.testResults.toArray()) m.set(r.level, Math.max(m.get(r.level) ?? 0, r.correct / r.total))
    return m
  }, [])

  return (
    <div>
      <h2>Gramer</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Seviye testleri</h3>
        <p className="small-text muted">
          ТРКИ «Лексика. Грамматика» bölümüne benzer 20 soruluk mini denemeler. Geçme sınırı %66. A1'den başla, geçtikçe bir üst seviyeye geç.
        </p>
        <div className="level-tests">
          {LEVEL_TESTS.map((t) => {
            const b = best?.get(t.level)
            return (
              <a key={t.level} href={'#/test/' + t.level} className={'level-test' + (b != null && b >= 0.66 ? ' passed' : '')}>
                <strong>{t.level}</strong>
                <span>{b != null ? `%${Math.round(b * 100)}` : 'başla'}</span>
              </a>
            )
          })}
        </div>
      </div>

      {weekly && weeklyTopic && (
        <a className="card resume" href={'#/gramer/' + weeklyTopic.id}>
          <span className="muted small-text">Bu haftanın gramer konusu · {cb!.block.theme}</span>
          <strong>{weeklyTopic.title}</strong>
          <span className="small-text">Hedef: {weekly.goal}</span>
        </a>
      )}
      {suggested && (
        <a className="card resume" href={'#/gramer/' + suggested.topic.id}>
          <span className="muted small-text">Hata defterine göre</span>
          <strong>{suggested.topic.title}</strong>
          <span className="small-text">
            En sık hatan «{suggested.type}» ({suggested.n} kez). Bu konuyu tekrar et ve alıştırma yap.
          </span>
        </a>
      )}

      {(['B1', 'B1–B2', 'B2'] as const).map((lv) => (
        <section key={lv}>
          <h3>
            <span className="lv">{lv}</span>
          </h3>
          <ul className="list card" style={{ padding: '4px 12px' }}>
            {GRAMMAR.filter((t) => t.level === lv).map((t) => (
              <li key={t.id}>
                <a href={'#/gramer/' + t.id}>
                  <div>
                    <div className="title">{t.title}</div>
                    <div className="sub" lang="ru">
                      {t.ru}
                    </div>
                  </div>
                  {t.drill && <span className="badge">alıştırma</span>}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  )
}

export function TopicScreen({ id }: { id: string }) {
  const t = topicById(id)
  const [copied, setCopied] = useState(false)
  if (!t) return <p>Konu bulunamadı. <a href="#/gramer">Gramer</a></p>
  const askClaude = async () => {
    const prompt = `Rusça öğreniyorum (B1, hedef ТРКИ-2/B2). Konu: «${t.ru}» (${t.title}). Bana bu konuda Türkçe çok kısa bir hatırlatma yap, sonra zorluğu giderek artan 10 alıştırma cümlesi ver (boşluk doldurma ya da dönüştürme). Ben cevaplayınca kontrol et ve hatalarımı Türkçe açıkla. Cevapları ben yazmadan verme. Örnekleri mümkünse diş teknisyenliği ve günlük hayattan seç.`
    if (await copyText(prompt)) {
      setCopied(true)
      window.open('https://claude.ai/new', '_blank', 'noopener')
    }
  }
  return (
    <div>
      <p>
        <a href="#/gramer">← Gramer</a>
      </p>
      <div className="muted small-text">
        <span className="lv">{t.level}</span>
      </div>
      <h2 style={{ marginBottom: 2 }}>{t.title}</h2>
      <p className="small-text muted" lang="ru">
        {t.ru}
      </p>
      <p>{t.summary}</p>
      {t.sections.map((s) => (
        <div key={s.h} className="card grammar-section">
          <h3 style={{ marginTop: 0 }}>{s.h}</h3>
          {s.table && (
            <div className="table-scroll">
              <table className="forms">
                <thead>
                  <tr>
                    {s.table.cols.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((c, j) => (
                        <td key={j} lang={/[а-яё]/i.test(c) ? 'ru' : undefined}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.text && <Paragraphs text={s.text} />}
          {s.examples && (
            <ul className="phrases">
              {s.examples.map(([ru, tr]) => (
                <li key={ru}>
                  <span lang="ru">{ru}</span>
                  <Say text={ru} />
                  <div className="small-text muted">{tr}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <div className="row">
        {t.drill && (
          <a className="btn primary" href={'#/gramer/' + t.id + '/alistirma'}>
            Alıştırma yap
          </a>
        )}
        <button onClick={askClaude}>{copied ? 'Kopyalandı ✓ Claude\'a yapıştır' : 'Claude\'dan bu konuda alıştırma iste'}</button>
      </div>
    </div>
  )
}

/** Otomatik alıştırma: kendi metinlerinden, okuma metinlerinden ve konu örneklerinden 10 soru. */
export function DrillScreen({ id }: { id: string }) {
  const t = topicById(id)
  const ms = useMorph()
  const texts = useLiveQuery(() => db.texts.where('status').equals('committed').toArray(), [])
  const [round, setRound] = useState(0)
  const items = useMemo<DrillItem[] | null>(() => {
    if (!t || ms.status !== 'ready' || !texts) return null
    const pool = [
      ...(t.bank ?? []).map((text) => ({ text, source: 'Konu örneği' })),
      ...texts.flatMap((x) => splitSentences(x.body).map((s) => ({ text: s.text.trim(), source: 'Metnin: ' + x.title }))),
      ...GRADED.flatMap((g) => splitSentences(g.body).map((s) => ({ text: s.text.trim(), source: g.title }))),
    ]
    return buildDrill(t, pool, ms.morph, 10)
    // round değişince yeni sorular
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, ms, texts, round])
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)

  if (!t || !t.drill) return <p>Bu konu için otomatik alıştırma yok. <a href={'#/gramer/' + id}>Konuya dön</a></p>
  if (!items) return <p className="muted">Sorular hazırlanıyor…</p>
  if (!items.length) return <p>Yeterli cümle bulunamadı. Biraz daha metin yazınca alıştırma çıkar.</p>

  const restart = () => {
    setRound(round + 1)
    setIdx(0)
    setChosen(null)
    setCorrect(0)
  }

  if (idx >= items.length)
    return (
      <div>
        <p>
          <a href={'#/gramer/' + id}>← {t.title}</a>
        </p>
        <h2>Alıştırma bitti</h2>
        <div className={'notice ' + (correct / items.length >= 0.66 ? 'ok' : 'warn')}>
          {items.length} sorudan {correct} doğru (%{Math.round((correct / items.length) * 100)}).
        </div>
        <button className="primary full" onClick={restart}>
          Yeni 10 soru
        </button>
      </div>
    )

  const it = items[idx]
  const ok = chosen != null && isCorrect(it, chosen)
  const before = it.sentence.slice(0, it.start)
  const after = it.sentence.slice(it.end)

  return (
    <div>
      <p>
        <a href={'#/gramer/' + id}>← {t.title}</a>
      </p>
      <div className="muted small-text">
        Soru {idx + 1} / {items.length} · {correct} doğru
      </div>
      <p className="small-text">{t.drill.prompt}</p>
      <div className="card">
        <p className="drill-sentence" lang="ru">
          {before}
          <span className={'blank' + (chosen ? (ok ? ' ok' : ' bad') : '')}>{chosen ? (ok ? (t.drill.kind === 'aspect' ? it.lemma : it.answer) : chosen) : '_____'}</span>
          {after}
        </p>
        {t.drill.kind === 'form' && (
          <p className="small-text muted" lang="ru">
            ({it.lemma})
          </p>
        )}
        <div className="choices">
          {it.options.map((o) => {
            const cls = chosen == null ? '' : isCorrect(it, o) ? ' ok' : o === chosen ? ' bad' : ''
            return (
              <button key={o} className={'choice' + cls} lang="ru" disabled={chosen != null} onClick={() => (setChosen(o), isCorrect(it, o) && setCorrect(correct + 1))}>
                {o}
              </button>
            )
          })}
        </div>
        {chosen != null && (
          <>
            <p className="small-text">
              {ok ? '✓ Doğru. ' : '✗ Doğrusu: '}
              {!ok && (
                <strong lang="ru">{it.answer}</strong>
              )}{' '}
              <span className="muted">({it.hint})</span>
            </p>
            <p className="small-text muted">Kaynak: {it.source}</p>
            <button className="primary full" onClick={() => (setIdx(idx + 1), setChosen(null))}>
              {idx + 1 < items.length ? 'Sonraki' : 'Sonucu gör'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
