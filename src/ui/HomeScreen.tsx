import { useLiveQuery } from 'dexie-react-hooks'
import { currentBlock, fmtRange } from '../content/calendar'
import { db, lemmaKey } from '../db'
import { getReadable } from '../logic/library'
import { IconArchive, IconBook, IconChart, IconCheck, IconHeadphones, IconLayers, IconRead, IconSettings, IconWrite } from './icons'
import { DAY_NAMES, THEME_PACKS, todayIndex } from '../content/themes'
import { isUsed, useActiveKeys, writeHref } from './ThemeScreen'
import { Say } from './Say'
import { lemmasOf } from '../content/themes'
import { useStreak } from './StreakCalendar'
import { IconCards, IconEar, IconExam, IconMic } from './icons'
import { GOAL } from './SummaryScreen'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Доброй ночи!'
  if (h < 12) return 'Доброе утро!'
  if (h < 18) return 'Добрый день!'
  return 'Добрый вечер!'
}

function Ring({ value }: { value: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const pct = Math.min(1, value / GOAL)
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${Math.max(pct * c, value > 0 ? 3 : 0)} ${c}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text)">
        {value.toLocaleString('tr-TR')}
      </text>
      <text x="60" y="78" textAnchor="middle" fontSize="11" fill="var(--muted)">
        / {GOAL.toLocaleString('tr-TR')}
      </text>
    </svg>
  )
}

export function HomeScreen() {
  const total = useLiveQuery(() => db.lemmas.where('useCount').above(0).count(), []) ?? 0
  const weekNew = useLiveQuery(() => db.lemmas.where('firstUsed').above(Date.now() - 7 * 86400000).filter((l) => l.useCount > 0).count(), []) ?? 0
  const texts = useLiveQuery(() => db.texts.where('status').equals('committed').count(), []) ?? 0
  const study = useLiveQuery(async () => {
    const active = new Set(await db.lemmas.where('useCount').above(0).primaryKeys())
    return (await db.study.toArray()).filter((s) => !active.has(s.id)).length
  }, []) ?? 0
  const lastRead = useLiveQuery(async () => {
    const p = await db.progress.orderBy('updatedAt').last()
    if (!p || p.finished) return null
    const r = await getReadable(p.key)
    return r ? { key: p.key, title: r.title } : null
  }, [])
  const listened = useLiveQuery(() => db.podcastLogs.where('date').above(Date.now() - 7 * 86400000).count(), []) ?? 0
  const cb = currentBlock()
  const pack = cb && cb.block.no ? THEME_PACKS[cb.block.no - 1] : undefined
  const dayNo = todayIndex()
  const streak = useStreak()
  const activeKeys = useActiveKeys()
  // Günün kelimesi: bu temadan henüz kullanmadığın bir kelime, her gün değişir
  const wotdPack = pack ?? THEME_PACKS[0]
  const pool = activeKeys ? wotdPack.words.filter((w) => !isUsed(w, activeKeys)) : []
  const dayNum = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000)
  const wotd = pool.length ? pool[(dayNum * 7919) % pool.length] : undefined
  const wotdSaved = useLiveQuery(async () => (wotd ? !!(await db.study.get(lemmaKey(lemmasOf(wotd)[0], wotd.pos))) : false), [wotd?.ru]) ?? false
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="home">
      <div className="hello">
        <div>
          <div className="muted small-text">{today}</div>
          <h2 lang="ru" style={{ margin: '2px 0 0' }}>
            {greeting()}
          </h2>
        </div>
      </div>

      <a className="card goal" href="#/ozet">
        <Ring value={total} />
        <div>
          <div className="muted small-text">Aktif kelime hedefi</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>
            {total === 0 ? 'İlk metnini yazınca sayaç başlar' : `%${((total / GOAL) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} tamam`}
          </div>
          <div className="small-text muted">
            Bu hafta +{weekNew} yeni kelime · {texts} metin
          </div>
          <div className="small-text" style={{ marginTop: 2 }}>
            {streak > 0 ? <strong>{streak} gün üst üste çalıştın</strong> : <span className="muted">Bugün başla, seri başlasın</span>}
          </div>
        </div>
      </a>

      {cb && (
        <div className="card theme-card">
          <div className="muted small-text">{cb.upcoming ? 'Yakında başlıyor' : 'Şu anki tema'} · Döngü {cb.block.cycle}</div>
          <div className="theme-name">
            {cb.block.no ? `Tema ${cb.block.no}: ` : ''}
            {cb.block.theme}
          </div>
          <div className="small-text muted">{fmtRange(cb.block)}</div>
          {pack && (
            <div className="today-topic">
              <div className="muted small-text">Bugünün konusu ({DAY_NAMES[dayNo]})</div>
              <strong>{pack.week[dayNo].title}</strong>
              <div className="small-text">{pack.week[dayNo].prompt}</div>
            </div>
          )}
          {cb.block.no > 0 && (
            <div className="row" style={{ marginTop: 10 }}>
              <a className="btn small primary" href={writeHref(cb.block.theme, dayNo)}>
                Bugünün konusunu yaz
              </a>
              <a className="btn small" href={'#/konus?tema=' + encodeURIComponent(cb.block.theme) + '&gun=' + dayNo}>
                Sesli anlat
              </a>
              <a className="btn small" href={'#/tema/' + cb.block.no}>
                Tema kelimeleri
              </a>
            </div>
          )}
        </div>
      )}

      {wotd && (
        <div className="card wotd">
          <div className="muted small-text">Günün kelimesi · {wotdPack.name}</div>
          <div>
            <span className="word" lang="ru">
              {wotd.ru}
            </span>
            <Say text={wotd.ru} />
          </div>
          <div>{wotd.tr}</div>
          <div className="small-text muted">Bugünkü metninde ya da konuşmanda kullan; kullanınca yeşile döner.</div>
          <div className="row" style={{ marginTop: 8 }}>
            <a className="btn small" href={writeHref(wotdPack.name, dayNo)}>
              Bununla yaz
            </a>
            <button
              className="small"
              disabled={wotdSaved}
              onClick={async () => {
                const l = lemmasOf(wotd)[0]
                await db.study.put({ id: lemmaKey(l, wotd.pos), lemma: l, pos: wotd.pos, meanings: [wotd.tr], sentence: '', source: 'Günün kelimesi', addedAt: Date.now() })
              }}
            >
              {wotdSaved ? 'Listede ✓' : 'Öğrenilecekler listesine ekle'}
            </button>
          </div>
        </div>
      )}

      <div className="tiles">
        <a className="tile" href="#/yaz">
          <IconWrite />
          <strong>Yaz</strong>
          <span>Metin yaz, kelimeler sözlüğe girsin</span>
        </a>
        <a className="tile" href="#/konus">
          <IconMic />
          <strong>Konuş</strong>
          <span>Günün konusunu 5 dakika anlat ve kaydet</span>
        </a>
        <a className="tile" href={lastRead ? '#/oku/' + encodeURIComponent(lastRead.key) : '#/oku'}>
          <IconRead />
          <strong>Oku</strong>
          <span lang={lastRead ? 'ru' : undefined}>{lastRead ? `Devam: ${lastRead.title}` : 'A1–C1 metinler ve klasikler'}</span>
        </a>
        <a className="tile" href="#/dinle">
          <IconHeadphones />
          <strong>Dinle</strong>
          <span>{listened ? `Bu hafta ${listened} bölüm` : 'Seviyene göre podcastler'}</span>
        </a>
        <a className="tile" href="#/ogren">
          <IconBook />
          <strong>Öğrenilecekler</strong>
          <span>{study ? `${study} kelime seni bekliyor` : 'Okurken eklediğin kelimeler'}</span>
        </a>
        <a className="tile" href="#/tekrar">
          <IconCards />
          <strong>Tekrar kartları</strong>
          <span>Kelimeleri kartlarla, aralıklı tekrarla çalış</span>
        </a>
        <a className="tile" href="#/tema">
          <IconLayers />
          <strong>Temalar</strong>
          <span>12 tema, günlük konular ve kelime listeleri</span>
        </a>
        <a className="tile" href="#/dikte">
          <IconEar />
          <strong>Dikte</strong>
          <span>Cümleyi dinle, yaz, farkları gör</span>
        </a>
        <a className="tile" href="#/trki">
          <IconExam />
          <strong>ТРКИ-2 yazma</strong>
          <span>Sınav tipi görevler, süre ve değerlendirme</span>
        </a>
        <a className="tile" href="#/hatalar">
          <IconCheck />
          <strong>Hata defteri</strong>
          <span>Hataların türe göre, alıştırmalar</span>
        </a>
      </div>

      <div className="links">
        <a href="#/sozluk">
          <IconBook /> Sözlük
        </a>
        <a href="#/ozet">
          <IconChart /> Özet
        </a>
        <a href="#/arsiv">
          <IconArchive /> Arşiv
        </a>
        <a href="#/ayarlar">
          <IconSettings /> Ayarlar
        </a>
      </div>
    </div>
  )
}
