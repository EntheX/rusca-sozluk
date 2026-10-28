import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { getThemes, isDemo, setDemo, setSetting } from '../db'
import { download, exportBackup, exportCsv, importBackup, renameTheme } from '../logic/store'
import { ankiDictionary, ankiMistakes, ankiThemes } from '../logic/anki'

export type ThemeMode = 'auto' | 'light' | 'dark'
export const THEME_KEY = 'rs-theme'

export function applyThemeMode(mode: ThemeMode) {
  if (mode === 'auto') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', mode)
  const dark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141413' : '#f6f5f1')
}

export function readThemeMode(): ThemeMode {
  try {
    return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'auto'
  } catch {
    return 'auto'
  }
}

const stamp = () => new Date().toISOString().slice(0, 10)

export function SettingsScreen({ offlineReady }: { offlineReady: boolean }) {
  const themes = useLiveQuery(getThemes, []) ?? []
  const [mode, setMode] = useState<ThemeMode>(readThemeMode)
  const [newTheme, setNewTheme] = useState('')
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [ankiMsg, setAnkiMsg] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const changeMode = (m: ThemeMode) => {
    setMode(m)
    try {
      localStorage.setItem(THEME_KEY, m)
    } catch {
      /* depolama kapalıysa sadece bu oturum için */
    }
    applyThemeMode(m)
  }

  const addTheme = async () => {
    const t = newTheme.trim()
    if (!t || themes.includes(t)) return
    await setSetting('themes', [...themes, t])
    setNewTheme('')
  }

  const move = async (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= themes.length) return
    const next = [...themes]
    ;[next[i], next[j]] = [next[j], next[i]]
    await setSetting('themes', next)
  }

  const saveRename = async () => {
    if (!editing) return
    const to = editing.to.trim()
    if (to && to !== editing.from && !themes.includes(to)) await renameTheme(editing.from, to)
    setEditing(null)
  }

  const onImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      if (!confirm('Yedek geri yüklensin mi? Bu cihazdaki TÜM veri yedektekiyle değiştirilecek.')) return
      await importBackup(data)
      setMsg({ kind: 'ok', text: `Yedek yüklendi: ${data.texts.length} metin, ${data.lemmas.length} kelime.` })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) })
    }
  }

  const toggleDemo = () => setDemo(!isDemo())

  return (
    <div>
      <h2>Ayarlar</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Görünüm</h3>
        <div className="row">
          {(
            [
              ['auto', 'Sistem'],
              ['light', 'Açık'],
              ['dark', 'Koyu'],
            ] as const
          ).map(([m, l]) => (
            <button key={m} className={mode === m ? 'primary' : ''} onClick={() => changeMode(m)} aria-pressed={mode === m}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Temalar</h3>
        <p className="small-text muted">Yazma ekranındaki tema listesi. Adını değiştirdiğin tema eski metinlerde ve sözlükte de güncellenir.</p>
        <ul className="list">
          {themes.map((t, i) => (
            <li key={t} style={{ padding: '6px 0' }}>
              {editing?.from === t ? (
                <div className="row">
                  <input
                    type="text"
                    className="grow"
                    value={editing.to}
                    autoFocus
                    onChange={(e) => setEditing({ from: t, to: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                  />
                  <button className="small primary" onClick={saveRename}>
                    Kaydet
                  </button>
                  <button className="small" onClick={() => setEditing(null)}>
                    Vazgeç
                  </button>
                </div>
              ) : (
                <div className="row">
                  <span className="grow">{t}</span>
                  <button className="small" aria-label={`${t} yukarı`} onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </button>
                  <button className="small" aria-label={`${t} aşağı`} onClick={() => move(i, 1)} disabled={i === themes.length - 1}>
                    ↓
                  </button>
                  <button className="small" onClick={() => setEditing({ from: t, to: t })}>
                    Adını değiştir
                  </button>
                  <button
                    className="small danger"
                    aria-label={`${t} temasını listeden çıkar`}
                    onClick={() => confirm(`«${t}» listeden çıkarılsın mı? Eski metinler bu temayı korur.`) && setSetting('themes', themes.filter((x) => x !== t))}
                  >
                    Sil
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="row" style={{ marginTop: 8 }}>
          <input
            type="text"
            className="grow"
            placeholder="Yeni tema"
            value={newTheme}
            onChange={(e) => setNewTheme(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTheme()}
          />
          <button onClick={addTheme} disabled={!newTheme.trim()}>
            Ekle
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Yedekleme</h3>
        <p className="small-text muted">
          Tüm veri sadece bu cihazda. Diğer cihaza taşımak için yedeği indir, dosyayı diğer cihaza gönder (ör. Telegram, e-posta, Drive) ve
          orada «Yedeği geri yükle» de.
        </p>
        <div className="stack">
          <button
            className="full"
            onClick={async () => download(`rusca-sozluk-yedek-${stamp()}.json`, JSON.stringify(await exportBackup()), 'application/json')}
          >
            Tüm veriyi indir (JSON)
          </button>
          <button className="full" onClick={() => fileRef.current?.click()}>
            Yedeği geri yükle
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
              e.target.value = ''
            }}
          />
          <button className="full" onClick={async () => download(`rusca-sozluk-${stamp()}.csv`, await exportCsv(), 'text/csv;charset=utf-8')}>
            Sözlüğü CSV olarak indir
          </button>
        </div>
        {msg && <div className={'notice ' + msg.kind}>{msg.text}</div>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Anki'ye aktar</h3>
        <p className="small-text muted">
          İndirdiğin .txt dosyasını Anki'de Dosya → İçe aktar ile aç (Android'de AnkiDroid: menü → İçe aktar). Ayırıcı ve etiket sütunu dosyada
          tanımlı, ayar yapman gerekmez.
        </p>
        <div className="stack">
          <button
            className="full"
            onClick={async () => {
              const r = await ankiDictionary()
              download(`anki-sozlugum-${stamp()}.txt`, r.text, 'text/plain;charset=utf-8')
              setAnkiMsg({ kind: 'ok', text: `${r.count} kelime Anki dosyasına yazıldı.` })
            }}
          >
            Sözlüğüm (kendi cümlelerimle)
          </button>
          <button
            className="full"
            onClick={() => {
              const r = ankiThemes()
              download(`anki-tema-kelimeleri-${stamp()}.txt`, r.text, 'text/plain;charset=utf-8')
              setAnkiMsg({ kind: 'ok', text: `${r.count} tema kelimesi Anki dosyasına yazıldı.` })
            }}
          >
            12 temanın kelimeleri
          </button>
          <button
            className="full"
            onClick={async () => {
              const r = await ankiMistakes()
              if (!r.count) return setAnkiMsg({ kind: 'warn', text: 'Hata defterin boş; önce bir metni Claude ile değerlendir.' })
              download(`anki-hatalarim-${stamp()}.txt`, r.text, 'text/plain;charset=utf-8')
              setAnkiMsg({ kind: 'ok', text: `${r.count} hata Anki dosyasına yazıldı.` })
            }}
          >
            Hata defterim
          </button>
        </div>
        {ankiMsg && <div className={'notice ' + ankiMsg.kind}>{ankiMsg.text}</div>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Demo modu</h3>
        <p className="small-text muted">
          Örnek metinlerle dolu ayrı bir sözlük açar. Gerçek verine dokunmaz; demodan çıkınca kendi sözlüğüne dönersin.
        </p>
        <button className="full" onClick={toggleDemo}>
          {isDemo() ? 'Demodan çık' : 'Demo modunu aç'}
        </button>
      </div>

      <div className="card small-text">
        <h3 style={{ marginTop: 0 }}>Hakkında</h3>
        <p>
          {offlineReady ? '✓ Çevrimdışı kullanıma hazır.' : 'Çevrimdışı dosyalar hazırlanıyor (ilk açılışta internet gerekli).'}
        </p>
        <p className="muted">
          Morfoloji: Az.js (MIT) ve OpenCorpora sözlüğü (CC BY-SA). Veriler tarayıcının IndexedDB deposunda tutulur; sunucuya hiçbir şey
          gönderilmez. Sürüm 1.
        </p>
      </div>
    </div>
  )
}
