import { useMemo } from 'react'
import { foldYo } from '../morph/morph'
import { POS_LABELS, type PosCode } from '../morph/tags'
import { useMorph } from './hooks'
import { Say } from './Say'

/** Çekim tabloları; kullandığın formlar yeşil işaretlenir. */
export function ParadigmView({ lemma, pos, used = [] }: { lemma: string; pos: PosCode; used?: string[] }) {
  const ms = useMorph()
  const tables = useMemo(() => (ms.status === 'ready' ? ms.morph.paradigm(lemma, pos) : []), [ms, lemma, pos])
  const usedSet = useMemo(() => new Set(used.map(foldYo)), [used])
  if (ms.status !== 'ready') return <p className="small-text muted">Morfoloji sözlüğü yükleniyor…</p>
  if (!tables.length) return <p className="small-text muted">Bu kelime türü çekimlenmez.</p>
  const mark = (cell: string) =>
    cell.split(/(\s*\/\s*|,\s*)/).map((part, i) =>
      usedSet.has(foldYo(part.replace(/^буд\S+ /, ''))) && !/^\s*[/,]/.test(part) ? (
        <mark key={i} className="used-form">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  return (
    <div className="paradigm">
      {tables.map((t) => (
        <div key={t.title} className="card">
          <h4 style={{ marginTop: 0 }}>{t.title}</h4>
          <table className="forms">
            {t.cols.some(Boolean) && (
              <thead>
                <tr>
                  {t.cols.map((c, i) => (
                    <th key={i}>{c}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {t.rows.map((r) => (
                <tr key={r.label}>
                  <td className="small-text muted">{r.label}</td>
                  {r.cells.map((c, i) => (
                    <td key={i} lang="ru">
                      {mark(c)}
                      {c !== '—' && !c.includes('/') && !c.includes(',') && <Say text={c} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {t.note && <p className="small-text muted" style={{ marginBottom: 0 }}>{t.note}</p>}
        </div>
      ))}
      {used.length > 0 && <p className="small-text muted">Yeşil: yazılarında kullandığın formlar.</p>}
    </div>
  )
}

/** Tek başına çekim sayfası: #/cekim?w=поступить&p=verb */
export function ParadigmScreen({ word, pos }: { word: string; pos: PosCode }) {
  return (
    <div>
      <p>
        <a href="#" onClick={(e) => (e.preventDefault(), history.back())}>
          ← Geri
        </a>
      </p>
      <h2 lang="ru" style={{ marginBottom: 2 }}>
        {word} <Say text={word} /> <span className="badge">{POS_LABELS[pos]}</span>
      </h2>
      <p className="small-text muted">Çekim tablosu (OpenCorpora sözlüğünden, internetsiz)</p>
      <ParadigmView lemma={word} pos={pos} />
    </div>
  )
}

export const paradigmHref = (lemma: string, pos: string) => `#/cekim?w=${encodeURIComponent(lemma)}&p=${pos}`
