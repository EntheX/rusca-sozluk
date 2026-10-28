import Dexie, { type EntityTable } from 'dexie'
import type { PosCode } from './morph/tags'

/** Bir kelime formu için yapılan seçim. */
export type Choice =
  | { kind: 'lemma'; lemma: string; pos: PosCode; grammemes: string[] }
  | { kind: 'skip' }

export interface TextRec {
  id: number
  title: string
  theme: string
  body: string
  createdAt: number
  updatedAt: number
  /** draft: çözümlendi ama sözlüğe yazılmadı; committed: sözlüğe yazıldı. */
  status: 'draft' | 'committed'
  /** Bu metinde form bazında yapılan seçimler (küçük harfli form → seçim). */
  choices: Record<string, Choice>
}

export interface LemmaRec {
  /** Anahtar: "lemma|tür" (ör. "стать|verb"). */
  id: string
  lemma: string
  pos: PosCode
  meanings: string[]
  themes: string[]
  firstUsed: number
  lastUsed: number
  /** 0 ise sözlükte sayılmaz (metni silinmiş), ama anlamları saklanır. */
  useCount: number
  /** Morfoloji sözlüğünde yoktu, elle eklendi. */
  custom?: boolean
  createdAt: number
}

export interface UsageRec {
  id?: number
  lemmaId: string
  textId: number
  form: string
  grammemes: string[]
  sentence: string
  tokenIndex: number
  theme: string
  date: number
}

export interface BookRec {
  /** "ws:<Vikikaynak sayfası>" ya da "u:<zaman damgası>" */
  key: string
  title: string
  author: string
  level: string
  source: 'wikisource' | 'user'
  chapters: Array<{ title: string; body: string }>
  addedAt: number
}

/** Okuma ilerlemesi (hem yerleşik metinler hem kitaplar için, anahtar: kitap anahtarı). */
export interface ProgressRec {
  key: string
  chapter: number
  updatedAt: number
  finished?: boolean
}

/** Okurken "öğrenilecekler" listesine eklenen kelime. */
export interface StudyRec {
  /** lemma anahtarı ("lemma|tür") */
  id: string
  lemma: string
  pos: PosCode
  meanings: string[]
  sentence: string
  source: string
  addedAt: number
}

export interface PodcastLogRec {
  id?: number
  podcastId: string
  date: number
  note: string
}

export interface UserPodcastRec {
  id?: number
  title: string
  url: string
  level: string
  note: string
}

/** Kullanıcının yüklediği ses dosyası (podcast bölümü vb.), isteğe bağlı transkriptle. */
export interface ReviewError {
  /** Hata türü (ERROR_TYPES'tan biri ya da serbest) */
  type: string
  wrong: string
  right: string
  note: string
}

/** Bir metnin Claude değerlendirmesi. Metin sonradan değişirse body farkından anlaşılır. */
export interface ReviewRec {
  id?: number
  textId: number
  at: number
  /** Değerlendirilen metin (sonradan düzenlendiyse eski kalır) */
  body: string
  level: string
  score?: number
  summary: string
  errors: ReviewError[]
  corrected: string
  strengths: string[]
  tips: string[]
  /** JSON çözülemezse yapıştırılan ham metin */
  raw?: string
}

export interface AudioRec {
  id?: number
  title: string
  level: string
  /** Yedekten geri yüklenen kayıtlarda ses dosyası yoktur. */
  blob?: Blob
  mime: string
  size: number
  transcript: string
  position: number
  duration?: number
  addedAt: number
}

export interface SettingRec {
  key: string
  value: unknown
}

export type DB = Dexie & {
  texts: EntityTable<TextRec, 'id'>
  lemmas: EntityTable<LemmaRec, 'id'>
  usages: EntityTable<UsageRec, 'id'>
  settings: EntityTable<SettingRec, 'key'>
  books: EntityTable<BookRec, 'key'>
  progress: EntityTable<ProgressRec, 'key'>
  study: EntityTable<StudyRec, 'id'>
  podcastLogs: EntityTable<PodcastLogRec, 'id'>
  userPodcasts: EntityTable<UserPodcastRec, 'id'>
  audios: EntityTable<AudioRec, 'id'>
  reviews: EntityTable<ReviewRec, 'id'>
}

export const DEMO_KEY = 'rs-demo'

export function isDemo(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

/** Demo modunu aç/kapat: ayrı veritabanına geçmek için sayfa yeniden yüklenir. */
export function setDemo(on: boolean) {
  try {
    if (on) localStorage.setItem(DEMO_KEY, '1')
    else localStorage.removeItem(DEMO_KEY)
  } catch {
    return
  }
  location.replace(location.pathname + (on ? '#/yaz?demo=1' : '#/'))
  location.reload()
}

export function openDb(name: string): DB {
  const d = new Dexie(name) as DB
  d.version(1).stores({
    texts: '++id, createdAt, updatedAt, theme, status',
    lemmas: 'id, lemma, pos, firstUsed, lastUsed, useCount, *themes',
    usages: '++id, lemmaId, textId, form, date',
    settings: 'key',
  })
  d.version(2).stores({
    books: 'key, level, addedAt',
    progress: 'key, updatedAt',
    study: 'id, addedAt',
    podcastLogs: '++id, podcastId, date',
    userPodcasts: '++id',
  })
  d.version(3).stores({
    audios: '++id, addedAt',
  })
  d.version(4).stores({
    reviews: '++id, textId, at',
  })
  return d
}

export const db: DB = openDb(isDemo() ? 'rusca-sozluk-demo' : 'rusca-sozluk')

export const lemmaKey = (lemma: string, pos: PosCode) => `${lemma}|${pos}`

export const DEFAULT_THEMES = [
  'Ben ve hayatım',
  'İş ve meslek',
  'Ev, şehir, günlük yaşam',
  'Yemek, alışveriş, para',
  'Sağlık ve beden',
  'Seyahat ve ulaşım',
  'Eğitim ve dil öğrenme',
  'Boş zaman, spor, hobiler',
  'Medya ve teknoloji',
  'Kültür ve sanat',
  'Doğa, iklim, ekoloji',
  'Toplum, aile, gelenekler',
  'Serbest',
]

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const r = await db.settings.get(key)
  return r ? (r.value as T) : fallback
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

export async function getThemes(): Promise<string[]> {
  return getSetting<string[]>('themes', DEFAULT_THEMES)
}

/** Daha önce belirsiz bir form için yapılan seçimler (form → seçim); sonraki metinlerde otomatik uygulanır. */
export async function getFormChoices(): Promise<Record<string, Choice>> {
  return getSetting<Record<string, Choice>>('formChoices', {})
}
