import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { currentBlock } from '../content/calendar'
import { DAY_NAMES, DAY_SHORT, THEME_PACKS, lemmasOf, todayIndex, type ThemePack, type ThemeWord, type WordPos } from '../content/themes'
import { db, lemmaKey } from '../db'
import { Say } from './Say'
import { paradigmHref } from './Paradigm'

const POS_TITLES: Record<WordPos, string> = { verb: 'Fiiller', adj: 'Sıfatlar', adv: 'Zarflar' }

/** Sözlükte (aktif) kullanılan lemma anahtarları */
export const useActiveKeys = () => useLiveQuery(async () => new Set((await db.lemmas.where('useCount').above(0).primaryKeys()) as string[]), [])

export const isUsed = (w: ThemeWord, keys: Set<string>) => lemmasOf(w).some((l) => keys.has(lemmaKey(l, w.pos)))

export const writeHref = (theme: string, day?: number) =>
  '#/yaz?tema=' + encodeURIComponent(theme) + (day != null ? '&gun=' + day : '')

/** Bütün temalar: kullanılan kelime oranı. */
export function ThemesScreen() {
  const keys = useActiveKeys()
  const cb = currentBlock()
  return (
    <div>
      <h2>Temalar</h2>
      <p className="small-text muted">Her temada 7 günlük yazı/konuşma rotasyonu ve en az 50 kelime (fiil, sıfat, zarf). Yeşil olanları bir metninde kullandın.</p>
      <ul className="list card" style={{ padding: '4px 12px' }}>
        {THEME_PACKS.map((p, i) => {
          const used = keys ? p.words.filter((w) => isUsed(w, keys)).length : 0
          return (
            <li key={p.name}>
              <a href={'#/tema/' + (i + 1)}>
                <div>
                <div className="title">
                  {i + 1}. {p.name} {cb?.block.theme === p.name && <span className="badge">{cb.upcoming ? 'sıradaki' : 'şu an'}</span>}
                </div>
                <div className="sub">
                  <span lang="ru">{p.ru}</span> · {used}/{p.words.length} kelime kullanıldı
                </div>
                </div>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ThemeScreen({ no }: { no: number }) {
  const pack = THEME_PACKS[no - 1]
  const keys = useActiveKeys()
  const studied = useLiveQuery(async () => new Set((await db.study.toCollection().primaryKeys()) as string[]), [])
  const [day, setDay] = useState(todayIndex())
  const [msg, setMsg] = useState<string | null>(null)
  if (!pack) return <p>Tema bulunamadı. <a href="#/tema">Temalar</a></p>
  const used = keys ? pack.words.filter((w) => isUsed(w, keys)) : []

  const addUnused = async () => {
    if (!keys) return
    const now = Date.now()
    const recs = pack.words
      .filter((w) => !isUsed(w, keys))
      .flatMap((w) => {
        const l = lemmasOf(w)[0]
        const id = lemmaKey(l, w.pos)
        return studied?.has(id) ? [] : [{ id, lemma: l, pos: w.pos, meanings: [w.tr], sentence: '', source: 'Tema: ' + pack.name, addedAt: now }]
      })
    await db.study.bulkPut(recs)
    setMsg(`${recs.length} kelime öğrenilecekler listesine eklendi.`)
  }

  return (
    <div>
      <p>
        <a href="#/tema">← Temalar</a>
      </p>
      <h2>
        {no}. {pack.name}
      </h2>
      <p className="small-text muted" lang="ru">
        {pack.ru}
      </p>

      <h3>Haftalık rotasyon</h3>
      <p className="small-text muted">Günde 5 dakika: yaz ya da sesli anlat. Her gün listeden en az 5 kalıp kullan.</p>
      <div className="day-tabs" role="tablist">
        {DAY_NAMES.map((d, i) => (
          <button key={d} className={(i === day ? 'on' : '') + (i === todayIndex() ? ' today' : '')} onClick={() => setDay(i)} aria-selected={i === day}>
            {DAY_SHORT[i]}
          </button>
        ))}
      </div>
      <DayCard pack={pack} day={day} />

      <h3>
        Kelimeler · {used.length}/{pack.words.length} kullanıldı
      </h3>
      <div className="progress" style={{ marginBottom: 12 }}>
        <div style={{ width: `${(used.length / pack.words.length) * 100}%` }} />
      </div>
      {(['verb', 'adj', 'adv'] as WordPos[]).map((pos) => (
        <div key={pos} className="card">
          <h4 style={{ marginTop: 0 }}>{POS_TITLES[pos]}</h4>
          <ul className="theme-words">
            {pack.words
              .filter((w) => w.pos === pos)
              .map((w) => {
                const u = keys ? isUsed(w, keys) : false
                return (
                  <li key={w.ru} className={u ? 'used' : ''}>
                    <a lang="ru" href={paradigmHref(lemmasOf(w)[0], w.pos)} className="plain-link">
                      {w.ru}
                    </a>
                    <Say text={w.ru} />
                    <span className="muted"> — {w.tr}</span>
                    {u && <span aria-label="kullanıldı"> ✓</span>}
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
      {msg && <div className="notice ok">{msg}</div>}
      <div className="row">
        <a className="btn primary" href={writeHref(pack.name, day)}>
          Bu temada yaz
        </a>
        <button onClick={addUnused} disabled={used.length === pack.words.length}>
          Kullanmadıklarımı öğrenilecekler listesine ekle
        </button>
      </div>
    </div>
  )
}

/** Bir günün konusu: başlık, soru, kalıplar. Pazar günü Claude'a soru istemi kopyalanabilir. */
export function DayCard({ pack, day, compact }: { pack: ThemePack; day: number; compact?: boolean }) {
  const d = pack.week[day]
  const keys = useActiveKeys()
  const [copied, setCopied] = useState(false)
  const copyQuestions = async () => {
    const unused = keys ? pack.words.filter((w) => !isUsed(w, keys)) : pack.words
    const words = unused
      .sort(() => Math.random() - 0.5)
      .slice(0, 12)
      .map((w) => lemmasOf(w)[0])
    const prompt = `Rusça öğreniyorum (B1, hedef B2). «${pack.ru}» temasındayım. Şu kelimeleri kullanarak bana Rusça 5 soru sor, cevaplarımı yazınca hatalarımı Türkçe açıkla: ${words.join(', ')}`
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      window.open('https://claude.ai/new', '_blank', 'noopener')
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="card day-card">
      <div className="muted small-text">
        {DAY_NAMES[day]}
        {compact ? ' · ' + pack.name : ''}
      </div>
      <div className="day-title">{d.title}</div>
      <p style={{ margin: '4px 0 8px' }}>{d.prompt}</p>
      <ul className="phrases">
        {d.phrases.map((p) => {
          const [ru, tr] = p.split(' — ')
          return (
            <li key={p}>
              <span lang="ru">{ru}</span>
              <Say text={ru.replace(/…/g, '')} />
              {tr && <span className="muted"> — {tr}</span>}
            </li>
          )
        })}
      </ul>
      {day === 6 && (
        <button className="small" onClick={copyQuestions}>
          {copied ? 'Kopyalandı ✓ Claude\'a yapıştır' : 'Claude\'dan 5 soru iste (kullanmadığın kelimelerle)'}
        </button>
      )}
    </div>
  )
}
