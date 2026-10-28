import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { ReviewPanel } from './ReviewScreens'
import { db } from '../db'
import { deleteText } from '../logic/store'
import { tokenize } from '../morph/tokenize'
import { fmtDate, go } from './hooks'

export function ArchiveScreen() {
  const texts = useLiveQuery(() => db.texts.orderBy('createdAt').reverse().toArray(), [])
  const [q, setQ] = useState('')
  if (!texts) return <p className="muted">Yükleniyor…</p>
  const fq = q.trim().toLowerCase()
  const list = fq ? texts.filter((t) => (t.title + ' ' + t.body + ' ' + t.theme).toLowerCase().includes(fq)) : texts
  return (
    <div>
      <h2>Metin arşivi</h2>
      {texts.length > 0 && (
        <input type="search" placeholder="Metinlerde ara" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      )}
      {list.length === 0 ? (
        <div className="empty">
          {texts.length === 0 ? (
            <>
              Henüz metin yok. <a href="#/yaz">İlk metnini yaz</a>.
            </>
          ) : (
            'Sonuç yok.'
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 12px' }}>
          <ul className="list">
            {list.map((t) => (
              <li key={t.id}>
                <a href={'#/arsiv/' + t.id}>
                  <div style={{ minWidth: 0 }}>
                    <div className="title">
                      {t.title} {t.status === 'draft' && <span className="badge st-ambiguous">taslak</span>}
                    </div>
                    <div className="sub">
                      {fmtDate(t.createdAt)} · {t.theme} · {tokenize(t.body).length} kelime
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function TextView({ id, highlight }: { id: number; highlight?: number }) {
  const text = useLiveQuery(() => db.texts.get(id), [id])
  const usageCount = useLiveQuery(() => db.usages.where('textId').equals(id).count(), [id])
  const tokens = useMemo(() => (text ? tokenize(text.body) : []), [text])
  if (text === undefined) return <p className="muted">Yükleniyor…</p>
  if (!text) return <p>Metin bulunamadı.</p>

  const parts: React.ReactNode[] = []
  let pos = 0
  for (const t of tokens) {
    if (t.index !== highlight) continue
    parts.push(text.body.slice(pos, t.start))
    parts.push(
      <span className="tok hl" key="hl" ref={(el) => el?.scrollIntoView({ block: 'center' })}>
        {text.body.slice(t.start, t.end)}
      </span>,
    )
    pos = t.end
  }
  parts.push(text.body.slice(pos))

  const remove = async () => {
    if (!confirm(`«${text.title}» silinsin mi? Bu metindeki kelime kullanımları sözlükten düşülecek.`)) return
    await deleteText(id)
    go('arsiv')
  }

  return (
    <div>
      <p>
        <a href="#/arsiv">← Arşiv</a>
      </p>
      <h2>{text.title}</h2>
      <p className="small-text muted">
        {fmtDate(text.createdAt)} · {text.theme} · {tokens.length} kelime
        {text.status === 'committed' ? ` · sözlükte ${usageCount ?? 0} kullanım` : ' · taslak (sözlüğe yazılmadı)'}
      </p>
      <div className="card">
        <div className="analyzed" lang="ru">
          {parts}
        </div>
      </div>
      {text.status === 'committed' && <ReviewPanel text={text} />}
      <div className="row">
        <a className="btn primary" href={'#/yaz/' + id}>
          {text.status === 'draft' ? 'Devam et' : 'Düzenle'}
        </a>
        <button className="danger" onClick={remove}>
          Sil
        </button>
      </div>
    </div>
  )
}
