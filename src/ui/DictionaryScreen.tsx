import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, getThemes, type LemmaRec } from '../db'
import { foldYo } from '../morph/morph'
import { describeGrammemes, POS_LABELS, POS_ORDER, type PosCode } from '../morph/tags'
import { setMeanings } from '../logic/store'
import { fmtDate, lemmaHref, useMorph } from './hooks'
import { MeaningsEditor } from './Meanings'
import { SozlukTabs } from './ReadScreens'
import { Say } from './Say'

type Sort = 'alpha' | 'newest' | 'recent' | 'count'
type Period = 'all' | '7' | '30' | '90' | '365'

const PAGE = 100

export function DictionaryScreen() {
  const ms = useMorph()
  const lemmas = useLiveQuery(() => db.lemmas.where('useCount').above(0).toArray(), []) ?? null
  const themes = useLiveQuery(getThemes, []) ?? []
  const [q, setQ] = useState('')
  const [pos, setPos] = useState<PosCode | ''>('')
  const [theme, setTheme] = useState('')
  const [period, setPeriod] = useState<Period>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [limit, setLimit] = useState(PAGE)

  const list = useMemo(() => {
    if (!lemmas) return []
    const fq = foldYo(q.trim())
    // Arama bir çekimli form olabilir (людей → человек): morfolojiyle lemmasını da ara.
    const viaMorph = new Set<string>()
    if (fq && ms.status === 'ready' && /^[а-яё-]+$/i.test(q.trim())) {
      for (const c of ms.morph.analyze(q.trim()).candidates) viaMorph.add(foldYo(c.lemma))
    }
    const since = period === 'all' ? 0 : Date.now() - Number(period) * 86400000
    const out = lemmas.filter(
      (l) =>
        (!pos || l.pos === pos) &&
        (!theme || l.themes.includes(theme)) &&
        l.firstUsed >= since &&
        (!fq ||
          foldYo(l.lemma).includes(fq) ||
          viaMorph.has(foldYo(l.lemma)) ||
          l.meanings.some((m) => m.toLocaleLowerCase('tr').includes(q.trim().toLocaleLowerCase('tr')))),
    )
    const cmp: Record<Sort, (a: LemmaRec, b: LemmaRec) => number> = {
      alpha: (a, b) => a.lemma.localeCompare(b.lemma, 'ru'),
      newest: (a, b) => b.firstUsed - a.firstUsed || a.lemma.localeCompare(b.lemma, 'ru'),
      recent: (a, b) => b.lastUsed - a.lastUsed,
      count: (a, b) => b.useCount - a.useCount || a.lemma.localeCompare(b.lemma, 'ru'),
    }
    return out.sort(cmp[sort])
  }, [lemmas, q, pos, theme, period, sort, ms])

  if (!lemmas) return <p className="muted">Yükleniyor…</p>

  return (
    <div>
      <SozlukTabs current="aktif" />
      <div className="filters">
        <input
          type="search"
          className="wide"
          placeholder="Ara: kelime, çekimli form ya da Türkçe anlam"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setLimit(PAGE)
          }}
        />
        <select aria-label="Tür" value={pos} onChange={(e) => setPos(e.target.value as PosCode | '')}>
          <option value="">Tüm türler</option>
          {POS_ORDER.map((p) => (
            <option key={p} value={p}>
              {POS_LABELS[p]}
            </option>
          ))}
        </select>
        <select aria-label="Tema" value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">Tüm temalar</option>
          {themes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select aria-label="Tarih" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
          <option value="all">Tüm zamanlar</option>
          <option value="7">Son 7 gün eklenen</option>
          <option value="30">Son 30 gün eklenen</option>
          <option value="90">Son 3 ay eklenen</option>
          <option value="365">Son 1 yıl eklenen</option>
        </select>
        <select aria-label="Sıralama" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="newest">En yeni eklenen</option>
          <option value="recent">Son kullanılan</option>
          <option value="count">En çok kullanılan</option>
          <option value="alpha">Alfabetik (А–Я)</option>
        </select>
      </div>
      <p className="small-text muted">{list.length} kelime</p>
      {list.length === 0 ? (
        <div className="empty">
          {lemmas.length === 0 ? (
            <>
              Sözlüğün henüz boş. <a href="#/yaz">İlk metnini yaz</a>.
            </>
          ) : (
            'Bu filtreyle kelime bulunamadı.'
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 12px' }}>
          <ul className="list">
            {list.slice(0, limit).map((l) => (
              <li key={l.id}>
                <a href={lemmaHref(l.id)}>
                  <div style={{ minWidth: 0 }}>
                    <div>
                      <span className="title" lang="ru">
                        {l.lemma}
                      </span>{' '}
                      <span className="badge">{POS_LABELS[l.pos]}</span>
                    </div>
                    <div className="sub">{l.meanings.join(', ') || '—'}</div>
                  </div>
                  <span className="count" title="Kullanım sayısı">
                    {l.useCount}×
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {list.length > limit && (
        <button className="full" onClick={() => setLimit(limit + PAGE)}>
          Daha fazla göster ({list.length - limit})
        </button>
      )}
    </div>
  )
}

export function LemmaDetail({ id }: { id: string }) {
  const lemma = useLiveQuery(() => db.lemmas.get(id), [id])
  const usages = useLiveQuery(() => db.usages.where('lemmaId').equals(id).toArray(), [id]) ?? []
  const texts = useLiveQuery(async () => {
    const ids = [...new Set(usages.map((u) => u.textId))]
    const ts = await db.texts.bulkGet(ids)
    return new Map(ts.filter(Boolean).map((t) => [t!.id, t!]))
  }, [usages])

  const forms = useMemo(() => {
    const m = new Map<string, { form: string; grammemes: string[]; count: number }>()
    for (const u of usages) {
      const k = u.form + '|' + u.grammemes.join(',')
      const e = m.get(k)
      if (e) e.count++
      else m.set(k, { form: u.form, grammemes: u.grammemes, count: 1 })
    }
    return [...m.values()].sort((a, b) => b.count - a.count)
  }, [usages])

  if (lemma === undefined) return <p className="muted">Yükleniyor…</p>
  if (!lemma) return <p>Kelime bulunamadı.</p>

  const sorted = [...usages].sort((a, b) => b.date - a.date || a.tokenIndex - b.tokenIndex)

  return (
    <div>
      <p>
        <a href="#/sozluk">← Sözlük</a>
      </p>
      <h2 lang="ru" style={{ fontSize: '1.8rem', marginBottom: 4 }}>
        {lemma.lemma} <Say text={lemma.lemma} /> <span className="badge">{POS_LABELS[lemma.pos]}</span>
        {lemma.custom && <span className="badge">elle eklendi</span>}
      </h2>
      <p className="small-text muted">
        {lemma.useCount} kez kullandın · ilk: {fmtDate(lemma.firstUsed)} · son: {fmtDate(lemma.lastUsed)}
        {lemma.themes.length > 0 && <> · {lemma.themes.join(', ')}</>}
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Anlamlar</h3>
        <MeaningsEditor value={lemma.meanings} onChange={(v) => setMeanings(lemma.id, v)} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Kullandığın formlar</h3>
        <table className="forms">
          <thead>
            <tr>
              <th>Form</th>
              <th>Dilbilgisi</th>
              <th>Sayı</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => (
              <tr key={f.form + f.grammemes.join()}>
                <td lang="ru">
                  <strong>{f.form}</strong>
                </td>
                <td>{describeGrammemes(f.grammemes).join(', ') || '—'}</td>
                <td>{f.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Cümleler ({sorted.length})</h3>
        {sorted.map((u) => {
          const t = texts?.get(u.textId)
          return (
            <div className="sentence" key={u.id}>
              <div lang="ru">
                <Highlight sentence={u.sentence} form={u.form} />
              </div>
              <div className="small-text muted">
                <a href={`#/arsiv/${u.textId}?w=${u.tokenIndex}`}>{t?.title ?? 'Metin'}</a> · {fmtDate(u.date)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Highlight({ sentence, form }: { sentence: string; form: string }) {
  const lower = sentence.toLowerCase()
  const re = new RegExp('(^|[^а-яё])(' + form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[^а-яё]|$)', 'i')
  const m = re.exec(lower)
  if (!m) return <>{sentence}</>
  const start = m.index + m[1].length
  const end = start + m[2].length
  return (
    <>
      {sentence.slice(0, start)}
      <mark>{sentence.slice(start, end)}</mark>
      {sentence.slice(end)}
    </>
  )
}
