import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { currentBlock } from '../content/calendar'
import { THEME_PACKS, lemmasOf } from '../content/themes'
import { db, lemmaKey, type CardRec } from '../db'
import { answer, isDue } from '../logic/srs'
import { POS_LABELS } from '../morph/tags'
import { Say } from './Say'

type Source = 'ogren' | 'tema' | 'sozluk'

interface Card {
  id: string
  ru: string
  tr: string
  pos: string
  example?: string
}

const NEW_PER_SESSION = 15

const SOURCES: Array<{ id: Source; label: string }> = [
  { id: 'ogren', label: 'Öğrenilecekler' },
  { id: 'tema', label: 'Tema kelimeleri' },
  { id: 'sozluk', label: 'Sözlüğüm' },
]

async function loadDeck(source: Source, themeNo: number): Promise<Card[]> {
  if (source === 'ogren') {
    const active = new Set((await db.lemmas.where('useCount').above(0).primaryKeys()) as string[])
    return (await db.study.toArray())
      .filter((s) => !active.has(s.id))
      .map((s) => ({ id: s.id, ru: s.lemma, tr: s.meanings.join(', ') || '(anlam eklenmedi)', pos: s.pos, example: s.sentence }))
  }
  if (source === 'tema') {
    const pack = THEME_PACKS[themeNo - 1] ?? THEME_PACKS[0]
    return pack.words.map((w) => ({ id: lemmaKey(lemmasOf(w)[0], w.pos), ru: w.ru, tr: w.tr, pos: w.pos }))
  }
  const lemmas = (await db.lemmas.where('useCount').above(0).toArray()).filter((l) => l.meanings.length)
  const out: Card[] = []
  for (const l of lemmas) {
    const u = await db.usages.where('lemmaId').equals(l.id).last()
    out.push({ id: l.id, ru: l.lemma, tr: l.meanings.join(', '), pos: l.pos, example: u?.sentence })
  }
  return out
}

export function CardsScreen() {
  const cb = currentBlock()
  const [source, setSource] = useState<Source>('ogren')
  const [themeNo, setThemeNo] = useState(cb && cb.block.no ? cb.block.no : 1)
  const [reverse, setReverse] = useState(false)
  const deck = useLiveQuery(() => loadDeck(source, themeNo), [source, themeNo])
  const progress = useLiveQuery(async () => new Map((await db.cards.toArray()).map((c) => [c.id, c])), [])
  // Oturum kuyruğu: bir kez kurulur, cevaplandıkça değişir
  const [queue, setQueue] = useState<Card[] | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState({ known: 0, again: 0 })

  const stats = useMemo(() => {
    if (!deck || !progress) return null
    const due = deck.filter((c) => progress.has(c.id) && isDue(progress.get(c.id))).length
    const fresh = deck.filter((c) => !progress.has(c.id)).length
    const learned = deck.filter((c) => (progress.get(c.id)?.box ?? 0) >= 3).length
    return { due, fresh, learned, total: deck.length }
  }, [deck, progress])

  // Kaynak değişince oturumu sıfırla
  useEffect(() => {
    setQueue(null)
    setRevealed(false)
    setDone({ known: 0, again: 0 })
  }, [source, themeNo])

  const start = () => {
    if (!deck || !progress) return
    const due = deck.filter((c) => progress.has(c.id) && isDue(progress.get(c.id))).sort((a, b) => progress.get(a.id)!.due - progress.get(b.id)!.due)
    const fresh = deck.filter((c) => !progress.has(c.id)).slice(0, NEW_PER_SESSION)
    setQueue([...due, ...fresh])
    setDone({ known: 0, again: 0 })
    setRevealed(false)
  }

  const respond = async (known: boolean) => {
    if (!queue?.length) return
    const card = queue[0]
    const prev: CardRec | undefined = await db.cards.get(card.id)
    await db.cards.put(answer(prev, card.id, known))
    setDone((d) => (known ? { ...d, known: d.known + 1 } : { ...d, again: d.again + 1 }))
    // Bilinmeyen kart kuyruğun 3 kart sonrasına (ya da sonuna) geri döner
    const rest = queue.slice(1)
    if (!known) rest.splice(Math.min(3, rest.length), 0, card)
    setQueue(rest)
    setRevealed(false)
  }

  const card = queue?.[0]

  return (
    <div>
      <h2>Tekrar kartları</h2>
      <p className="small-text muted">Bildiğin kelime giderek daha seyrek gelir (1, 2, 4, 8, 16, 32 gün); bilmediğin hemen tekrar gelir.</p>
      <div className="tabs" role="tablist">
        {SOURCES.map((s) => (
          <button key={s.id} role="tab" aria-selected={source === s.id} className={source === s.id ? 'on' : ''} onClick={() => setSource(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      {source === 'tema' && (
        <label className="field">
          <span>Tema</span>
          <select value={themeNo} onChange={(e) => setThemeNo(Number(e.target.value))}>
            {THEME_PACKS.map((p, i) => (
              <option key={p.name} value={i + 1}>
                {i + 1}. {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!queue && stats && (
        <div className="card">
          {stats.total === 0 ? (
            <p style={{ margin: 0 }}>
              {source === 'ogren' ? (
                <>
                  Öğrenilecekler listen boş. <a href="#/oku">Bir şey okurken</a> bilmediğin kelimelere dokunup ekle.
                </>
              ) : (
                'Sözlüğünde anlamı yazılmış kelime yok. Sözlükteki kelimelere Türkçe anlam ekledikçe burada çıkarlar.'
              )}
            </p>
          ) : (
            <>
              <div className="stats-row">
                <div>
                  <strong>{stats.due}</strong>
                  <span>tekrar zamanı</span>
                </div>
                <div>
                  <strong>{Math.min(stats.fresh, NEW_PER_SESSION)}</strong>
                  <span>yeni kart</span>
                </div>
                <div>
                  <strong>
                    {stats.learned}/{stats.total}
                  </strong>
                  <span>oturmuş</span>
                </div>
              </div>
              <label className="row small-text" style={{ gap: 8, marginBottom: 10 }}>
                <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} /> Türkçeden Rusçaya sor
              </label>
              <button className="primary full" onClick={start} disabled={stats.due + stats.fresh === 0}>
                {stats.due + stats.fresh === 0 ? 'Bugünlük bitti, yarın gel' : 'Başla'}
              </button>
            </>
          )}
        </div>
      )}

      {queue && card && (
        <div className="card flashcard">
          <div className="small-text muted">
            {queue.length} kart kaldı · {POS_LABELS[card.pos as keyof typeof POS_LABELS] ?? card.pos}
          </div>
          <div className="fc-front" lang={reverse ? undefined : 'ru'}>
            {reverse ? card.tr : card.ru}
            {!reverse && <Say text={card.ru} />}
          </div>
          {revealed ? (
            <>
              <div className="fc-back" lang={reverse ? 'ru' : undefined}>
                {reverse ? card.ru : card.tr}
                {reverse && <Say text={card.ru} />}
              </div>
              {card.example && (
                <p className="small-text" lang="ru">
                  «{card.example}»
                </p>
              )}
              <div className="row">
                <button className="grow" onClick={() => respond(false)}>
                  Bilmiyordum
                </button>
                <button className="primary grow" onClick={() => respond(true)}>
                  Biliyordum
                </button>
              </div>
            </>
          ) : (
            <button className="primary full" onClick={() => setRevealed(true)}>
              Cevabı göster
            </button>
          )}
        </div>
      )}

      {queue && !card && (
        <div className="card">
          <div className="notice ok" style={{ marginTop: 0 }}>
            Oturum bitti: {done.known} biliyordun, {done.again} kez tekrar ettin.
          </div>
          <button className="full" onClick={() => setQueue(null)}>
            Tamam
          </button>
        </div>
      )}
    </div>
  )
}
