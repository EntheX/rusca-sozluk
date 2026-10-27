import { useState } from 'react'

/** Türkçe anlam listesi: ekle / sil. Birden fazla anlam virgül veya noktalı virgülle de girilebilir. */
export function MeaningsEditor({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const parts = draft
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.length) return
    onChange([...value, ...parts.filter((p) => !value.includes(p))])
    setDraft('')
  }
  return (
    <div>
      {value.length > 0 && (
        <div className="chips">
          {value.map((m) => (
            <span className="chip" key={m}>
              {m}
              <button aria-label={`"${m}" anlamını sil`} onClick={() => onChange(value.filter((x) => x !== m))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="row">
        <input
          type="text"
          className="grow"
          value={draft}
          placeholder={placeholder ?? 'Türkçe anlam ekle'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button onClick={add} disabled={!draft.trim()}>
          Ekle
        </button>
      </div>
    </div>
  )
}
