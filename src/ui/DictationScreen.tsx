import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { GRADED, LEVELS } from '../content/graded'
import { db } from '../db'
import { diffWords, score, words, type DiffOp } from '../logic/dictation'
import { splitSentences } from '../morph/tokenize'
import { canSay, say } from './Say'

type Source = 'mine' | string

function sentencesOf(body: string): string[] {
  return splitSentences(body)
    .map((s) => s.text.trim())
    .filter((s) => {
      const n = words(s).length
      return n >= 4 && n <= 18 && /[а-яё]/i.test(s)
    })
}

/** Dikte: cümleyi dinle, yaz, farkları gör. */
export function DictationScreen() {
  const [source, setSource] = useState<Source>('mine')
  const mine = useLiveQuery(async () => (await db.texts.where('status').equals('committed').toArray()).flatMap((t) => sentencesOf(t.body)), [])
  const pool = useMemo(() => {
    if (source === 'mine') return mine ?? []
    return GRADED.filter((g) => g.level === source).flatMap((g) => sentencesOf(g.body))
  }, [source, mine])
  const [idx, setIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<DiffOp[] | null>(null)
  const [session, setSession] = useState<number[]>([])

  const pick = () => {
    if (!pool.length) return
    setIdx(Math.floor(Math.random() * pool.length))
    setTyped('')
    setResult(null)
  }
  // Kaynak değişince yeni cümle seç
  useEffect(pick, [pool])

  const sentence = pool[idx]
  const check = () => {
    if (!sentence) return
    const ops = diffWords(sentence, typed)
    setResult(ops)
    setSession((s) => [...s, score(ops)])
  }

  return (
    <div>
      <h2>Dikte</h2>
      <p className="small-text muted">Cümleyi dinle, duyduğunu yaz, sonra farkları gör. Büyük/küçük harf, noktalama ve ё/е farkı hata sayılmaz.</p>
      {!canSay() && <div className="notice warn">Bu tarayıcıda sesli okuma yok; dikte için Chrome ya da Edge kullan.</div>}
      <label className="field">
        <span>Cümleler nereden gelsin?</span>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="mine">Kendi metinlerim</option>
          {LEVELS.filter((lv) => GRADED.some((g) => g.level === lv)).map((lv) => (
            <option key={lv} value={lv}>
              Okuma metinleri · {lv}
            </option>
          ))}
        </select>
      </label>

      {!sentence ? (
        <div className="empty">
          {source === 'mine' ? (
            <>
              Henüz sözlüğe yazılmış metnin yok. <a href="#/yaz">Bir metin yaz</a> ya da yukarıdan okuma metinlerini seç.
            </>
          ) : (
            'Bu seviyede cümle bulunamadı.'
          )}
        </div>
      ) : (
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <button className="primary grow" onClick={() => say(sentence, 0.8)}>
              ▶ Dinle
            </button>
            <button className="grow" onClick={() => say(sentence, 0.55)}>
              Yavaş dinle
            </button>
          </div>
          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            lang="ru"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Duyduğunu buraya yaz…"
            style={{ minHeight: 90 }}
            disabled={!!result}
          />
          {result ? (
            <>
              <div className="dictation-result" lang="ru">
                {result.map((o, i) =>
                  o.kind === 'ok' ? (
                    <span key={i} className="d-ok">
                      {o.word}{' '}
                    </span>
                  ) : o.kind === 'wrong' ? (
                    <span key={i} className="d-wrong">
                      <del>{o.typed}</del> <ins>{o.word}</ins>{' '}
                    </span>
                  ) : o.kind === 'missing' ? (
                    <span key={i} className="d-missing">
                      <ins>{o.word}</ins>{' '}
                    </span>
                  ) : (
                    <span key={i} className="d-extra">
                      <del>{o.typed}</del>{' '}
                    </span>
                  ),
                )}
              </div>
              <p className="small-text">
                <strong>%{score(result)}</strong> doğru · Doğrusu: <span lang="ru">{sentence}</span>
              </p>
              <button className="primary full" onClick={pick}>
                Sonraki cümle
              </button>
            </>
          ) : (
            <div className="row">
              <button className="primary grow" onClick={check} disabled={!typed.trim()}>
                Kontrol et
              </button>
              <button className="grow" onClick={pick}>
                Başka cümle
              </button>
            </div>
          )}
        </div>
      )}
      {session.length > 0 && (
        <p className="small-text muted">
          Bu oturum: {session.length} cümle, ortalama %{Math.round(session.reduce((a, b) => a + b, 0) / session.length)}
        </p>
      )}
    </div>
  )
}
