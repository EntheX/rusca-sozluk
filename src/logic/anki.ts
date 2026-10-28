// Anki'ye aktarım: sekmeyle ayrılmış metin, Anki'nin dosya başlığı satırlarıyla (Dosya → İçe aktar).

import { db, type ReviewRec } from '../db'
import { THEME_PACKS } from '../content/themes'
import { POS_LABELS } from '../morph/tags'

const clean = (s: string) => s.replace(/[\t\r\n]+/g, ' ').trim()
const tag = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9çğıöşü]+/gi, '_').replace(/^_|_$/g, '')

function toAnki(rows: Array<[string, string, string]>): string {
  return ['#separator:tab', '#html:false', '#tags column:3', ...rows.map((r) => r.map(clean).join('\t'))].join('\n') + '\n'
}

/** Aktif sözlük: ön yüz kelime + kendi cümlen, arka yüz anlam ve tür. */
export async function ankiDictionary(): Promise<{ text: string; count: number }> {
  const lemmas = await db.lemmas.where('useCount').above(0).toArray()
  const rows: Array<[string, string, string]> = []
  for (const l of lemmas) {
    const u = await db.usages.where('lemmaId').equals(l.id).last()
    const front = u ? `${l.lemma} — «${u.sentence}»` : l.lemma
    const back = [l.meanings.join(', ') || '(anlam eklenmedi)', POS_LABELS[l.pos]].join(' · ')
    rows.push([front, back, ['rusca_sozluk', ...l.themes.map(tag)].join(' ')])
  }
  return { text: toAnki(rows), count: rows.length }
}

/** Tema kelimeleri: ön yüz Rusça, arka yüz Türkçe; etiket tema adı. */
export function ankiThemes(): { text: string; count: number } {
  const rows: Array<[string, string, string]> = THEME_PACKS.flatMap((p, i) =>
    p.words.map((w): [string, string, string] => [w.ru, w.tr, `tema_${i + 1} ${tag(p.name)}`]),
  )
  return { text: toAnki(rows), count: rows.length }
}

/** Hatalar: ön yüz yanlış hal, arka yüz doğrusu ve açıklaması. */
export async function ankiMistakes(): Promise<{ text: string; count: number }> {
  const last = new Map<number, ReviewRec>()
  for (const r of await db.reviews.orderBy('at').toArray()) last.set(r.textId, r)
  const rows: Array<[string, string, string]> = [...last.values()].flatMap((r) =>
    r.errors.map((e): [string, string, string] => [`Hata ne? ${e.wrong}`, `${e.right}${e.note ? ' — ' + e.note : ''}`, `hata ${tag(e.type)}`]),
  )
  return { text: toAnki(rows), count: rows.length }
}
