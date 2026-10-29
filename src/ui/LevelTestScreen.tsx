import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { topicById } from '../content/grammar'
import { LEVEL_TESTS, PASS_RATE, testByLevel } from '../content/levelTests'
import { db } from '../db'
import { fmtDate } from './hooks'

const LETTERS = ['А', 'Б', 'В', 'Г']
const fmt = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, '0')}`

export function LevelTestScreen({ level }: { level: string }) {
  const test = testByLevel(level)
  const history = useLiveQuery(() => db.testResults.where('level').equals(level).reverse().sortBy('at'), [level]) ?? []
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [idx, setIdx] = useState(0)
  const [finished, setFinished] = useState<{ correct: number; seconds: number } | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (startedAt == null || finished) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [startedAt, finished])

  if (!test) return <p>Test bulunamadı. <a href="#/gramer">Gramer</a></p>
  const qs = test.questions
  const next = LEVEL_TESTS[LEVEL_TESTS.findIndex((t) => t.level === level) + 1]

  const start = () => {
    setAnswers(new Array(qs.length).fill(-1))
    setIdx(0)
    setFinished(null)
    setStartedAt(Date.now())
  }

  const finish = async () => {
    const correct = qs.filter((q, i) => answers[i] === q.a).length
    const seconds = Math.round((Date.now() - (startedAt ?? Date.now())) / 1000)
    await db.testResults.add({ level, at: Date.now(), correct, total: qs.length, seconds, answers })
    setFinished({ correct, seconds })
    window.scrollTo(0, 0)
  }

  // Başlangıç ekranı
  if (startedAt == null)
    return (
      <div>
        <p>
          <a href="#/gramer">← Gramer</a>
        </p>
        <h2>
          {test.level} seviye testi
        </h2>
        <p className="small-text muted" lang="ru">
          {test.name} · Лексика. Грамматика
        </p>
        <div className="card">
          <p style={{ marginTop: 0 }}>
            {qs.length} soru · önerilen süre {test.minutes} dakika · geçme sınırı %{Math.round(PASS_RATE * 100)}
          </p>
          <p className="small-text muted">
            Her soruda boşluğa uyan seçeneği işaretle. Süre dolsa da devam edebilirsin, ama sınav koşullarına alışmak için süreye uymaya çalış. Bu
            sorular ТРКИ formatına benzer, resmî sınav soruları değildir.
          </p>
          <button className="primary full" onClick={start}>
            Teste başla
          </button>
        </div>
        {history.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Önceki denemelerin</h3>
            <ul className="list">
              {history.slice(0, 8).map((r) => (
                <li key={r.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>{fmtDate(r.at)}</span>
                  <span>
                    <strong className={r.correct / r.total >= PASS_RATE ? 'ok-text' : ''}>
                      {r.correct}/{r.total}
                    </strong>{' '}
                    <span className="small-text muted">· {fmt(r.seconds)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )

  // Sonuç ekranı
  if (finished) {
    const rate = finished.correct / qs.length
    const passed = rate >= PASS_RATE
    const wrongTopics = new Map<string, number>()
    qs.forEach((q, i) => {
      if (answers[i] !== q.a && q.t) wrongTopics.set(q.t, (wrongTopics.get(q.t) ?? 0) + 1)
    })
    return (
      <div>
        <p>
          <a href="#/gramer">← Gramer</a>
        </p>
        <h2>{test.level} sonucu</h2>
        <div className={'notice ' + (passed ? 'ok' : 'warn')}>
          <strong>
            {finished.correct}/{qs.length} (%{Math.round(rate * 100)})
          </strong>{' '}
          · {fmt(finished.seconds)} · {passed ? 'Geçtin!' : `Geçmek için en az ${Math.ceil(qs.length * PASS_RATE)} doğru gerekiyor.`}
        </div>
        {passed && next && (
          <a className="btn primary full" href={'#/test/' + next.level} onClick={() => setStartedAt(null)}>
            Sıradaki seviye: {next.level}
          </a>
        )}
        {wrongTopics.size > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Tekrar etmen gereken konular</h3>
            <ul>
              {[...wrongTopics.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([id, n]) => (
                  <li key={id}>
                    <a href={'#/gramer/' + id}>{topicById(id)?.title}</a> <span className="muted small-text">({n} hata)</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
        <h3>Cevaplar</h3>
        {qs.map((q, i) => {
          const ok = answers[i] === q.a
          return (
            <div key={i} className={'card test-review' + (ok ? '' : ' wrong')}>
              <div className="small-text muted">
                {i + 1}. {ok ? '✓' : answers[i] < 0 ? '— boş' : '✗'}
              </div>
              <p lang="ru" style={{ margin: '4px 0' }}>
                {q.q.replace('___', q.o[q.a].toUpperCase())}
              </p>
              {!ok && answers[i] >= 0 && (
                <p className="small-text" lang="ru" style={{ margin: 0 }}>
                  Senin cevabın: <del>{q.o[answers[i]]}</del>
                </p>
              )}
              <p className="small-text muted" style={{ marginBottom: 0 }}>
                {q.e}
              </p>
            </div>
          )
        })}
        <button className="full" onClick={() => setStartedAt(null)}>
          Kapat
        </button>
      </div>
    )
  }

  // Soru ekranı
  const q = qs[idx]
  const left = test.minutes * 60 - (now - startedAt) / 1000
  const answered = answers.filter((a) => a >= 0).length
  const [before, after] = q.q.split('___')
  return (
    <div>
      <div className="trki-bar card">
        <span className="small-text">
          {idx + 1} / {qs.length} · {answered} cevaplandı
        </span>
        <span className={'trki-time' + (left < 0 ? ' over' : '')}>
          {left < 0 ? '+' : ''}
          {fmt(left)}
        </span>
      </div>
      <div className="card">
        <p className="drill-sentence" lang="ru">
          {before}
          <span className="blank">{answers[idx] >= 0 ? q.o[answers[idx]] : '_____'}</span>
          {after}
        </p>
        <div className="choices">
          {q.o.map((o, i) => (
            <button
              key={o}
              className={'choice' + (answers[idx] === i ? ' picked' : '')}
              lang="ru"
              onClick={() => {
                const a = [...answers]
                a[idx] = i
                setAnswers(a)
                if (idx + 1 < qs.length) setTimeout(() => setIdx(idx + 1), 250)
              }}
            >
              <span className="letter">{LETTERS[i]}</span> {o}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
          ← Önceki
        </button>
        <button onClick={() => setIdx(Math.min(qs.length - 1, idx + 1))} disabled={idx === qs.length - 1}>
          Sonraki →
        </button>
        <span className="grow" />
        <button className="primary" onClick={finish}>
          Bitir
        </button>
      </div>
      <div className="q-dots" aria-label="Sorular">
        {qs.map((_, i) => (
          <button key={i} className={(i === idx ? 'on ' : '') + (answers[i] >= 0 ? 'done' : '')} onClick={() => setIdx(i)} aria-label={`Soru ${i + 1}`}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
