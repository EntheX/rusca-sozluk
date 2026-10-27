import { useEffect, useState } from 'react'
import { isDemo } from './db'
import { seedDemo } from './logic/demo'
import { loadMorph } from './morph/loadMorph'
import { ArchiveScreen, TextView } from './ui/ArchiveScreen'
import { DictionaryScreen, LemmaDetail } from './ui/DictionaryScreen'
import { MorphContext, useRoute, type MorphState } from './ui/hooks'
import { IconArchive, IconBook, IconChart, IconSettings, IconWrite } from './ui/icons'
import { SettingsScreen } from './ui/SettingsScreen'
import { SummaryScreen } from './ui/SummaryScreen'
import { WriteScreen } from './ui/WriteScreen'

const NAV = [
  { path: 'yaz', label: 'Yaz', Icon: IconWrite },
  { path: 'sozluk', label: 'Sözlük', Icon: IconBook },
  { path: 'ozet', label: 'Özet', Icon: IconChart },
  { path: 'arsiv', label: 'Arşiv', Icon: IconArchive },
  { path: 'ayarlar', label: 'Ayarlar', Icon: IconSettings },
]

export default function App({ offlineReady }: { offlineReady: boolean }) {
  const { parts, query } = useRoute()
  const [ms, setMs] = useState<MorphState>({ status: 'loading' })
  const [seeding, setSeeding] = useState(isDemo())

  useEffect(() => {
    loadMorph().then(
      async (morph) => {
        if (isDemo()) {
          await seedDemo(morph)
          setSeeding(false)
        }
        setMs({ status: 'ready', morph })
      },
      (e) => setMs({ status: 'error', error: e instanceof Error ? e.message : String(e) }),
    )
  }, [])

  const section = parts[0] ?? 'yaz'
  let screen: React.ReactNode
  if (seeding) screen = <p className="muted">Demo verisi hazırlanıyor…</p>
  else if (section === 'yaz')
    screen = <WriteScreen key={parts[1] ?? (query.get('demo') ? 'demo' : 'new')} textId={parts[1] ? Number(parts[1]) : undefined} demo={query.get('demo') === '1'} />
  else if (section === 'sozluk') screen = parts[1] ? <LemmaDetail id={parts.slice(1).join('/')} /> : <DictionaryScreen />
  else if (section === 'ozet') screen = <SummaryScreen />
  else if (section === 'arsiv')
    screen = parts[1] ? (
      <TextView id={Number(parts[1])} highlight={query.get('w') != null ? Number(query.get('w')) : undefined} />
    ) : (
      <ArchiveScreen />
    )
  else if (section === 'ayarlar') screen = <SettingsScreen offlineReady={offlineReady} />
  else screen = <p>Sayfa bulunamadı.</p>

  return (
    <MorphContext.Provider value={ms}>
      <div className="app">
        <header className="topbar">
          <h1>Rusça Sözlüğüm</h1>
          {ms.status === 'loading' && <span className="small-text muted">sözlük yükleniyor…</span>}
        </header>
        {isDemo() && (
          <div className="demo-banner">
            <strong>Demo modu.</strong> Örnek verilerle çalışıyorsun; gerçek sözlüğün etkilenmez. Sarı ve kırmızı örnek için{' '}
            <a href="#/arsiv">Arşiv</a>'deki «Örnek» taslağını aç. <a href="#/ayarlar">Demodan çık</a>
          </div>
        )}
        <main>{screen}</main>
      </div>
      <nav className="nav" aria-label="Ana menü">
        <div className="nav-inner">
          {NAV.map(({ path, label, Icon }) => (
            <a key={path} href={'#/' + path} className={section === path ? 'active' : ''} aria-current={section === path ? 'page' : undefined}>
              <Icon />
              {label}
            </a>
          ))}
        </div>
      </nav>
    </MorphContext.Provider>
  )
}
