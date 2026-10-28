import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { currentBlock } from '../content/calendar'
import { db, getFormChoices, getThemes, lemmaKey, type Choice } from '../db'
import { analyzeBody, candidateChoice, countByStatus, type AnalyzedToken } from '../logic/analyze'
import { commitText, knownKeysExcluding, saveDraft, setMeanings, type CommitResult } from '../logic/store'
import { POS_LABELS } from '../morph/tags'
import { go, lemmaHref, useMorph } from './hooks'
import { MeaningsEditor } from './Meanings'
import { STATUS_LABELS, TokenSheet } from './TokenSheet'

export const DEMO_TEXT = {
  title: 'О себе',
  theme: 'Ben ve hayatım',
  body: 'Я родился и вырос в небольшом городе на юге Турции. В итоге я поступил в колледж.',
}

type Phase = 'edit' | 'review' | 'done'

export function AnalyzedText({
  body,
  tokens,
  selected,
  onPick,
}: {
  body: string
  tokens: AnalyzedToken[]
  selected?: number | null
  onPick?: (t: AnalyzedToken) => void
}) {
  const parts: React.ReactNode[] = []
  let pos = 0
  for (const t of tokens) {
    if (t.start > pos) parts.push(body.slice(pos, t.start))
    const cls = ['tok', t.status, t.resolvedBy && t.status !== 'skipped' && t.analysis.candidates.length > 1 ? 'resolved' : '', selected === t.index ? 'selected' : '']
    parts.push(
      <span
        key={t.index}
        className={cls.filter(Boolean).join(' ')}
        role="button"
        tabIndex={0}
        title={STATUS_LABELS[t.status]}
        onClick={() => onPick?.(t)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick?.(t))}
      >
        {body.slice(t.start, t.end)}
      </span>,
    )
    pos = t.end
  }
  if (pos < body.length) parts.push(body.slice(pos))
  return <div className="analyzed">{parts}</div>
}

export function Legend({ counts }: { counts?: Record<AnalyzedToken['status'], number> }) {
  const items: Array<[AnalyzedToken['status'], string]> = [
    ['known', 'sözlüğünde var'],
    ['new', 'yeni'],
    ['ambiguous', 'belirsiz'],
    ['unknown', 'sözlükte yok'],
    ['skipped', 'eklenmeyecek'],
  ]
  return (
    <div className="legend">
      {items
        .filter(([k]) => !counts || counts[k] > 0 || k !== 'skipped')
        .map(([k, l]) => (
          <span key={k}>
            <i className={'dot ' + k} /> {l}
            {counts ? ` (${counts[k]})` : ''}
          </span>
        ))}
    </div>
  )
}

export function WriteScreen({ textId, demo, initialTheme }: { textId?: number; demo?: boolean; initialTheme?: string }) {
  const ms = useMorph()
  const themes = useLiveQuery(getThemes, []) ?? []
  const [id, setId] = useState<number | undefined>(textId)
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [body, setBody] = useState('')
  const [createdAt, setCreatedAt] = useState(Date.now())
  const [loaded, setLoaded] = useState(textId == null)
  const [phase, setPhase] = useState<Phase>('edit')
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Record<string, string[]>>({})
  const [ctx, setCtx] = useState<{ known: Set<string>; formChoices: Record<string, Choice> } | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<CommitResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Var olan metni yükle
  useEffect(() => {
    if (textId == null) return
    db.texts.get(textId).then((t) => {
      if (t) {
        setTitle(t.title)
        setTheme(t.theme)
        setBody(t.body)
        setCreatedAt(t.createdAt)
        setChoices(t.choices ?? {})
      }
      setLoaded(true)
    })
  }, [textId])

  // Yeni metinde varsayılan tema: bağlantıyla gelen ya da takvimdeki güncel tema
  useEffect(() => {
    if (theme || textId != null || !themes.length) return
    const cal = currentBlock()
    const pick = [initialTheme, cal && !cal.upcoming ? cal.block.theme : undefined].find((t) => t && themes.includes(t))
    setTheme(pick ?? themes[0])
  }, [themes, theme, textId, initialTheme])

  const tokens = useMemo(() => {
    if (phase === 'edit' || ms.status !== 'ready' || !ctx) return []
    return analyzeBody(body, ms.morph, { knownKeys: ctx.known, textChoices: choices, formChoices: ctx.formChoices })
  }, [phase, ms, ctx, body, choices])
  const counts = useMemo(() => countByStatus(tokens), [tokens])
  const newLemmaCount = useMemo(() => {
    const s = new Set<string>()
    for (const t of tokens) if (t.status === 'new' && t.choice?.kind === 'lemma') s.add(lemmaKey(t.choice.lemma, t.choice.pos))
    return s.size
  }, [tokens])

  const analyze = useCallback(async () => {
    setError(null)
    if (!body.trim()) {
      setError('Önce bir metin yaz.')
      return
    }
    setBusy(true)
    try {
      const newId = await saveDraft({ id, title: title.trim() || 'Başlıksız', theme, body, createdAt, updatedAt: Date.now() })
      setId(newId)
      const [known, formChoices] = await Promise.all([knownKeysExcluding(newId), getFormChoices()])
      setCtx({ known, formChoices })
      setPhase('review')
      window.scrollTo(0, 0)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }, [body, id, title, theme, createdAt])

  // Demo: örnek metni yaz ve otomatik çözümle
  useEffect(() => {
    if (demo && textId == null && !body) {
      setTitle(DEMO_TEXT.title)
      setTheme(DEMO_TEXT.theme)
      setBody(DEMO_TEXT.body)
      // Yenilemede örnek metin tekrar oluşturulmasın
      history.replaceState(null, '', '#/yaz')
    }
  }, [demo, textId, body])
  useEffect(() => {
    if (demo && body === DEMO_TEXT.body && phase === 'edit' && ms.status === 'ready' && !busy && !ctx) analyze()
  }, [demo, body, phase, ms.status, busy, ctx, analyze])

  const choose = (form: string, c: Choice | null) => {
    setChoices((prev) => {
      const next = { ...prev }
      if (c) next[form] = c
      else delete next[form]
      return next
    })
    setPicked((prev) => {
      const next = new Set(prev)
      if (c) next.add(form)
      else next.delete(form)
      return next
    })
  }

  const correct = (t: AnalyzedToken, replacement: string) => {
    const r = replacement.trim()
    if (!r) return
    setBody(body.slice(0, t.start) + r + body.slice(t.end))
    setSel(null)
  }

  const useMostLikely = () => {
    const next = { ...choices }
    for (const t of tokens) if (t.status === 'ambiguous') next[t.form] = candidateChoice(t.analysis.candidates[0])
    setChoices(next)
  }

  const commit = async () => {
    if ((counts.ambiguous > 0 || counts.unknown > 0) && !confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    setBusy(true)
    try {
      const userChoices: Record<string, Choice> = {}
      for (const t of tokens) if (picked.has(t.form) && t.analysis.candidates.length > 1 && t.choice) userChoices[t.form] = t.choice
      const r = await commitText(
        { id, title: title.trim() || 'Başlıksız', theme, body, createdAt, updatedAt: Date.now() },
        tokens,
        pending,
        userChoices,
      )
      setId(r.textId)
      setResult(r)
      setPhase('done')
      window.scrollTo(0, 0)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setId(undefined)
    setTitle('')
    setBody('')
    setChoices({})
    setPicked(new Set())
    setPending({})
    setCtx(null)
    setResult(null)
    setCreatedAt(Date.now())
    setPhase('edit')
    if (textId != null || demo) go('yaz')
  }

  if (!loaded) return <p className="muted">Yükleniyor…</p>

  if (phase === 'done' && result) return <DoneView result={result} textId={result.textId} onNew={reset} />

  const selToken = sel != null ? tokens.find((t) => t.index === sel) : undefined

  return (
    <div>
      <h2>{textId != null ? 'Metni düzenle' : 'Yaz'}</h2>
      {phase === 'edit' && (
        <div className="card">
          <label className="field">
            <span>Başlık</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ör. Мой день" />
          </label>
          <label className="field">
            <span>
              Tema · <a href="#/ayarlar">listeyi düzenle</a>
            </span>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              {!themes.includes(theme) && theme && <option value={theme}>{theme}</option>}
              {themes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Metin (Rusça)</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Сегодня я…"
              lang="ru"
              spellCheck
            />
          </label>
          {error && <div className="notice err">{error}</div>}
          {ms.status === 'loading' && <p className="small-text muted">Morfoloji sözlüğü yükleniyor (ilk açılışta ~6 MB)…</p>}
          {ms.status === 'error' && <div className="notice err">Morfoloji sözlüğü yüklenemedi: {ms.error}</div>}
          <button className="primary full" onClick={analyze} disabled={busy || ms.status !== 'ready'}>
            Kaydet ve çözümle
          </button>
        </div>
      )}

      {phase === 'review' && (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{title || 'Başlıksız'}</strong> <span className="badge">{theme}</span>
              </div>
              <button className="small" onClick={() => setPhase('edit')}>
                Metni düzenle
              </button>
            </div>
            <Legend counts={counts} />
            <AnalyzedText body={body} tokens={tokens} selected={sel} onPick={(t) => setSel(t.index)} />
            <p className="small-text muted">Bir kelimeye dokun: sözlük hali, türü ve dilbilgisi bilgisi.</p>
          </div>

          {counts.ambiguous > 0 && (
            <div className="notice warn">
              <strong>{counts.ambiguous} belirsiz kelime</strong> var. Dokunup doğru olanı seç ya da{' '}
              <button className="small" onClick={useMostLikely}>
                hepsinde en olasıyı kullan
              </button>
            </div>
          )}
          {counts.unknown > 0 && (
            <div className="notice err">
              <strong>{counts.unknown} kelime</strong> morfoloji sözlüğünde yok. Dokunup düzelt ya da «yine de ekle» de; dokunmazsan
              sözlüğe eklenmez.
            </div>
          )}
          {confirming && (
            <div className="notice warn">
              {counts.ambiguous > 0 && <div>Belirsiz kelimelerde en olası seçenek kullanılacak.</div>}
              {counts.unknown > 0 && <div>Kırmızı kelimeler sözlüğe eklenmeyecek.</div>}
              <div className="row" style={{ marginTop: 8 }}>
                <button className="primary" onClick={commit} disabled={busy}>
                  Yine de yaz
                </button>
                <button onClick={() => setConfirming(false)}>Vazgeç</button>
              </div>
            </div>
          )}
          {error && <div className="notice err">{error}</div>}
          {!confirming && (
            <button className="primary full" onClick={commit} disabled={busy}>
              Sözlüğe yaz · {newLemmaCount} yeni kelime
            </button>
          )}
        </>
      )}

      {selToken && ms.status === 'ready' && (
        <TokenSheet
          key={selToken.index + ':' + selToken.form}
          token={selToken}
          morph={ms.morph}
          pending={
            selToken.choice?.kind === 'lemma' ? (pending[lemmaKey(selToken.choice.lemma, selToken.choice.pos)] ?? []) : []
          }
          onPending={(k, v) => setPending({ ...pending, [k]: v })}
          onChoose={choose}
          onCorrect={correct}
          onClose={() => setSel(null)}
        />
      )}
    </div>
  )
}

function DoneView({ result, textId, onNew }: { result: CommitResult; textId: number; onNew: () => void }) {
  const lemmas = useLiveQuery(() => db.lemmas.bulkGet(result.newLemmas), [result.newLemmas]) ?? []
  return (
    <div>
      <h2>Sözlüğe yazıldı</h2>
      <div className="notice ok">
        {result.usageCount} kelime kullanımı kaydedildi, <strong>{result.newLemmas.length} yeni kelime</strong> eklendi.
      </div>
      {result.newLemmas.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Yeni kelimeler</h3>
          <p className="small-text muted">İstersen Türkçe anlamlarını şimdi ekle (sonra sözlükten de ekleyebilirsin).</p>
          {lemmas.map(
            (l) =>
              l && (
                <div key={l.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: 6 }}>
                    <a href={lemmaHref(l.id)}>
                      <strong>{l.lemma}</strong>
                    </a>{' '}
                    <span className="badge">{POS_LABELS[l.pos]}</span>
                  </div>
                  <MeaningsEditor value={l.meanings} onChange={(v) => setMeanings(l.id, v)} />
                </div>
              ),
          )}
        </div>
      )}
      <div className="row">
        <button className="primary" onClick={onNew}>
          Yeni metin yaz
        </button>
        <a className="btn" href={'#/arsiv/' + textId}>
          Metni gör
        </a>
      </div>
    </div>
  )
}
