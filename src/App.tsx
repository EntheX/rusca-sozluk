import { useEffect, useState } from 'react'
import { isDemo, setDemo } from './db'
import { seedDemo } from './logic/demo'
import { loadMorph } from './morph/loadMorph'
import { AudioScreen } from './ui/AudioScreens'
import { ArchiveScreen, TextView } from './ui/ArchiveScreen'
import { DictionaryScreen, LemmaDetail } from './ui/DictionaryScreen'
import { MorphContext, useRoute, type MorphState } from './ui/hooks'
import { useInstall } from './ui/install'
import { HomeScreen } from './ui/HomeScreen'
import { IconBook, IconHeadphones, IconHome, IconRead, IconSettings, IconWrite } from './ui/icons'
import { PodcastScreen } from './ui/PodcastScreen'
import { LibraryScreen, ReaderScreen, StudyScreen } from './ui/ReadScreens'
import { SettingsScreen } from './ui/SettingsScreen'
import { SummaryScreen } from './ui/SummaryScreen'
import { WriteScreen } from './ui/WriteScreen'

const NAV = [
  { path: '', label: 'Ana sayfa', Icon: IconHome, match: ['', 'ozet', 'arsiv', 'ayarlar'] },
  { path: 'yaz', label: 'Yaz', Icon: IconWrite, match: ['yaz'] },
  { path: 'oku', label: 'Oku', Icon: IconRead, match: ['oku'] },
  { path: 'dinle', label: 'Dinle', Icon: IconHeadphones, match: ['dinle'] },
  { path: 'sozluk', label: 'Sözlük', Icon: IconBook, match: ['sozluk', 'ogren'] },
]

export default function App({ offlineReady }: { offlineReady: boolean }) {
  const { parts, query } = useRoute()
  const [ms, setMs] = useState<MorphState>({ status: 'loading' })
  const [seeding, setSeeding] = useState(isDemo())
  const { canInstall, install } = useInstall()

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

  const section = parts[0] ?? ''
  let screen: React.ReactNode
  if (seeding) screen = <p className="muted">Demo verisi hazırlanıyor…</p>
  else if (section === '') screen = <HomeScreen />
  else if (section === 'yaz')
    screen = (
      <WriteScreen
        key={parts[1] ?? (query.get('demo') ? 'demo' : 'new:' + (query.get('tema') ?? ''))}
        textId={parts[1] ? Number(parts[1]) : undefined}
        demo={query.get('demo') === '1'}
        initialTheme={query.get('tema') ?? undefined}
      />
    )
  else if (section === 'oku') screen = parts[1] ? <ReaderScreen key={parts.slice(1).join('/')} bookKey={parts.slice(1).join('/')} /> : <LibraryScreen />
  else if (section === 'dinle') screen = parts[1] === 'a' && parts[2] ? <AudioScreen key={parts[2]} id={Number(parts[2])} /> : <PodcastScreen />
  else if (section === 'ogren') screen = <StudyScreen />
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
          <h1>
            <a href="#/" style={{ color: 'inherit', textDecoration: 'none' }}>
              Rusça Sözlüğüm
            </a>
          </h1>
          <div className="actions">
          {ms.status === 'loading' && <span className="small-text muted">sözlük yükleniyor…</span>}
          {ms.status !== 'loading' && canInstall && (
            <button className="small primary" onClick={install}>
              Uygulamayı yükle
            </button>
          )}
          <a className="btn icon-btn" href="#/ayarlar" aria-label="Ayarlar">
            <IconSettings />
          </a>
          </div>
        </header>
        {isDemo() && (
          <div className="demo-banner">
            <strong>Demo modu.</strong> Örnek verilerle çalışıyorsun; gerçek sözlüğün etkilenmez. Sarı ve kırmızı örnek için{' '}
            <a href="#/arsiv">Arşiv</a>'deki «Örnek» taslağını aç.{' '}
            <button className="small" onClick={() => setDemo(false)}>
              Demodan çık
            </button>
          </div>
        )}
        <main>{screen}</main>
      </div>
      <nav className="nav" aria-label="Ana menü">
        <div className="nav-inner">
          {NAV.map(({ path, label, Icon, match }) => (
            <a key={path} href={'#/' + path} className={match.includes(section) ? 'active' : ''} aria-current={match.includes(section) ? 'page' : undefined}>
              <Icon />
              {label}
            </a>
          ))}
        </div>
      </nav>
    </MorphContext.Provider>
  )
}
