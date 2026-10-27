// Demo modu: ayrı bir veritabanına örnek metinler yükler (gerçek verine dokunmaz).

import { db, setSetting, DEFAULT_THEMES } from '../db'
import type { Morph } from '../morph/morph'
import { analyzeBody } from './analyze'
import { commitText, knownKeysExcluding } from './store'

const WEEK = 7 * 86400000

const SEED: Array<{ title: string; theme: string; body: string; weeksAgo: number; meanings?: Record<string, string[]> }> = [
  {
    title: 'Меня зовут Кан',
    theme: 'Ben ve hayatım',
    body: 'Меня зовут Кан. Я живу в Турции, в большом городе. Я очень люблю свой город и море.',
    weeksAgo: 6,
    meanings: { 'жить|verb': ['yaşamak'], 'город|noun': ['şehir'], 'любить|verb': ['sevmek'], 'море|noun': ['deniz'] },
  },
  {
    title: 'Моя работа',
    theme: 'İş ve meslek',
    body: 'Я работаю зубным техником. Каждый день я делаю коронки и мосты. Работа трудная, но интересная.',
    weeksAgo: 4,
    meanings: { 'работать|verb': ['çalışmak'], 'коронка|noun': ['kron (diş)'], 'мост|noun': ['köprü', 'köprü protez'] },
  },
  {
    title: 'Выходные',
    theme: 'Boş zaman, spor, hobiler',
    body: 'В выходные я гуляю с друзьями на берегу моря. Вечером я читаю книги на русском языке.',
    weeksAgo: 2,
    meanings: { 'гулять|verb': ['yürüyüşe çıkmak', 'gezmek'], 'берег|noun': ['kıyı'] },
  },
  {
    title: 'Учёба',
    theme: 'Eğitim ve dil öğrenme',
    body: 'Каждый вечер я пишу короткий текст по-русски. Это помогает мне не забывать язык.',
    weeksAgo: 0,
  },
]

/** Sarı ve kırmızı örnek gösteren, sözlüğe yazılmamış bir taslak. */
const DRAFT = {
  title: 'Örnek: belirsiz ve hatalı kelimeler',
  theme: 'Serbest',
  body: 'Мы стали друзьями в колледже. Это лучше, чем ничего. Потом я поступл в университет.',
}

export async function seedDemo(morph: Morph) {
  if ((await db.texts.count()) > 0) return
  await setSetting('themes', DEFAULT_THEMES)
  const now = Date.now()
  for (const s of SEED) {
    const createdAt = now - s.weeksAgo * WEEK - 3600000
    const known = await knownKeysExcluding()
    // «Кан» sözlükte Cannes (yer adı) olarak geçiyor: isim olduğu için sözlüğe ekleme.
    const tokens = analyzeBody(s.body, morph, { knownKeys: known, textChoices: { кан: { kind: 'skip' } }, formChoices: {} })
    await commitText({ title: s.title, theme: s.theme, body: s.body, createdAt, updatedAt: createdAt }, tokens, s.meanings ?? {}, {})
  }
  await db.texts.add({ ...DRAFT, createdAt: now, updatedAt: now, status: 'draft', choices: {} } as never)
}
