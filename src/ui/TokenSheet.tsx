import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, lemmaKey, type Choice } from '../db'
import { candidateChoice, type AnalyzedToken } from '../logic/analyze'
import type { Morph } from '../morph/morph'
import { describeGrammemes, POS_LABELS, POS_ORDER, type PosCode } from '../morph/tags'
import { lemmaHref } from './hooks'
import { MeaningsEditor } from './Meanings'
import { Say } from './Say'

export const STATUS_LABELS: Record<AnalyzedToken['status'], string> = {
  known: 'Sözlüğünde var',
  new: 'Yeni kelime',
  ambiguous: 'Belirsiz: seç',
  unknown: 'Sözlükte yok',
  skipped: 'Eklenmeyecek',
}

export function Tags({ grammemes }: { grammemes: string[] }) {
  const d = describeGrammemes(grammemes)
  if (!d.length) return null
  return (
    <div className="tags">
      {d.map((x) => (
        <span className="tag" key={x}>
          {x}
        </span>
      ))}
    </div>
  )
}

interface Props {
  token: AnalyzedToken
  morph: Morph
  pending: string[]
  onPending: (key: string, v: string[]) => void
  onChoose: (form: string, c: Choice | null) => void
  onCorrect: (token: AnalyzedToken, replacement: string) => void
  onClose: () => void
}

export function TokenSheet({ token, morph, pending, onPending, onChoose, onCorrect, onClose }: Props) {
  const c = token.choice
  const key = c && c.kind === 'lemma' ? lemmaKey(c.lemma, c.pos) : null
  const lemma = useLiveQuery(() => (key ? db.lemmas.get(key) : undefined), [key])
  const cands = token.analysis.candidates
  const [fix, setFix] = useState(token.text)
  const [custom, setCustom] = useState<{ lemma: string; pos: PosCode }>({ lemma: token.form, pos: 'noun' })
  const suggestions = token.analysis.known ? [] : morph.suggest(token.text)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sentenceMark = (() => {
    const i = token.sentence.indexOf(token.text)
    if (i < 0) return token.sentence
    return (
      <>
        {token.sentence.slice(0, i)}
        <mark>{token.text}</mark>
        {token.sentence.slice(i + token.text.length)}
      </>
    )
  })()

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`«${token.text}» kelimesi`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <div className="form">{token.text}</div>
            <span className={'badge st-' + token.status}>{STATUS_LABELS[token.status]}</span>
            {token.resolvedBy === 'memory' && <span className="badge"> önceki seçimin</span>}
          </div>
          <button className="small" onClick={onClose} aria-label="Kapat">
            Kapat
          </button>
        </div>
        <p className="muted small-text">{sentenceMark}</p>

        {/* Seçili lemma */}
        {c && c.kind === 'lemma' && (
          <div>
            <div className="lemma-line">
              <strong>{token.form}</strong> = <strong>{c.lemma}</strong> <span className="badge">{POS_LABELS[c.pos]}</span>
              <Say text={c.lemma} />
            </div>
            <Tags grammemes={c.grammemes} />
            {(() => {
              const cand = cands.find((x) => x.lemma === c.lemma && x.pos === c.pos)
              if (!cand || !cand.altGrammemes.length) return null
              return (
                <div className="small-text muted">
                  ya da:{' '}
                  {cand.altGrammemes
                    .slice(0, 3)
                    .map((g) => describeGrammemes(g).join(', '))
                    .join(' · ')}
                </div>
              )
            })()}
          </div>
        )}

        {/* Birden fazla aday: seçim */}
        {cands.length > 1 && token.status !== 'skipped' && (
          <>
            <h3>Hangi kelime?</h3>
            {cands.map((x) => {
              const on = !!c && c.kind === 'lemma' && c.lemma === x.lemma && c.pos === x.pos
              return (
                <label className={'option' + (on ? ' on' : '')} key={x.lemma + x.pos}>
                  <input type="radio" name="cand" checked={on} onChange={() => onChoose(token.form, candidateChoice(x))} />
                  <div>
                    <div>
                      <strong>{x.lemma}</strong> <span className="badge">{POS_LABELS[x.pos]}</span>{' '}
                      <span className="muted small-text">%{Math.round(x.score * 100)}</span>
                    </div>
                    <div className="small-text muted">{describeGrammemes(x.grammemes).join(', ')}</div>
                  </div>
                </label>
              )
            })}
            {token.status === 'ambiguous' && (
              <p className="small-text muted">Seçmezsen en olası seçenek (ilk sıradaki) kullanılır. Seçimin sonraki metinlerde hatırlanır.</p>
            )}
          </>
        )}

        {/* Bilinmeyen kelime */}
        {!token.analysis.known && token.status !== 'skipped' && (
          <>
            {token.status === 'unknown' && (
              <div className="notice err small-text">Bu form OpenCorpora sözlüğünde yok. Yazım hatası olabilir.</div>
            )}
            {suggestions.length > 0 && (
              <>
                <h3>Bunu mu demek istedin?</h3>
                <div className="row">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => onCorrect(token, s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            <h3>Düzelt</h3>
            <div className="row">
              <input type="text" className="grow" value={fix} onChange={(e) => setFix(e.target.value)} />
              <button onClick={() => onCorrect(token, fix)} disabled={!fix.trim() || fix === token.text}>
                Düzelt
              </button>
            </div>
            <h3>Yine de ekle</h3>
            <input
              type="text"
              aria-label="Sözlük hali"
              placeholder="Sözlük hali"
              value={custom.lemma}
              onChange={(e) => setCustom({ ...custom, lemma: e.target.value })}
              style={{ marginBottom: 8 }}
            />
            <div className="row">
              <select
                aria-label="Tür"
                className="grow"
                style={{ width: 'auto' }}
                value={custom.pos}
                onChange={(e) => setCustom({ ...custom, pos: e.target.value as PosCode })}
              >
                {POS_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {POS_LABELS[p]}
                  </option>
                ))}
              </select>
              <button
                className="primary"
                disabled={!custom.lemma.trim()}
                onClick={() =>
                  onChoose(token.form, { kind: 'lemma', lemma: custom.lemma.trim().toLowerCase(), pos: custom.pos, grammemes: [] })
                }
              >
                {token.status === 'unknown' ? 'Yine de ekle' : 'Güncelle'}
              </button>
            </div>
          </>
        )}

        {/* Anlamlar */}
        {key && token.status !== 'skipped' && (
          <>
            <h3>Türkçe anlam</h3>
            {lemma && lemma.meanings.length > 0 && (
              <p className="small-text">
                Sözlükte: <strong>{lemma.meanings.join(', ')}</strong>{' '}
                {lemma.useCount > 0 && (
                  <a href={lemmaHref(lemma.id)} onClick={onClose}>
                    kelimeyi aç
                  </a>
                )}
              </p>
            )}
            <MeaningsEditor
              value={pending}
              onChange={(v) => onPending(key, v)}
              placeholder={token.status === 'new' ? 'İsteğe bağlı: Türkçe anlam' : 'Yeni anlam ekle'}
            />
          </>
        )}

        <h3>Diğer</h3>
        <div className="row">
          {token.status === 'skipped' ? (
            <button onClick={() => onChoose(token.form, null)}>Geri al: sözlüğe ekle</button>
          ) : (
            <button onClick={() => onChoose(token.form, { kind: 'skip' })}>Bu kelimeyi sözlüğe ekleme</button>
          )}
          {token.resolvedBy === 'text' && token.status !== 'skipped' && cands.length > 0 && (
            <button onClick={() => onChoose(token.form, null)}>Seçimi sıfırla</button>
          )}
        </div>
        <p className="small-text muted">Seçimler bu metindeki aynı formun tüm geçişlerine uygulanır.</p>
      </div>
    </div>
  )
}
