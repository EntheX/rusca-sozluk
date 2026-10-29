// Metin değerlendirmesi: çevrimdışı hızlı kontrol + Claude için istem ve cevabın çözülmesi.

import type { ReviewRec, TextRec } from '../db'
import { taskById } from '../content/trki'
import { THEME_PACKS, lemmasOf, packByName } from '../content/themes'
import { THEME_GRAMMAR, topicById } from '../content/grammar'
import type { Morph } from '../morph/morph'
import { splitSentences, tokenize } from '../morph/tokenize'

export const ERROR_TYPES = [
  'yazım',
  'hâl eki',
  'uyum',
  'fiil görünüşü',
  'fiil çekimi',
  'hareket fiili',
  'edat',
  'kelime seçimi',
  'söz dizimi',
  'noktalama',
  'üslup',
] as const

/* ---------- Çevrimdışı hızlı kontrol ---------- */

export interface QuickCheck {
  words: number
  unique: number
  sentences: number
  avgSentence: number
  /** Morfoloji sözlüğünde bulunmayan kelimeler (çoğu yazım hatası) */
  unknown: string[]
  /** Tema listesinden kullanılan kelimeler */
  themeUsed: string[]
  themeTotal: number
  /** Temanın haftalık gramer hedefi ve metinde kaç kez kullanıldığı */
  grammar?: { topicId: string; title: string; goal: string; count: number; target: number }
}

export function quickCheck(body: string, theme: string, morph: Morph): QuickCheck {
  const tokens = tokenize(body)
  const lemmas = new Set<string>()
  const themeNo = THEME_PACKS.findIndex((p) => p.name === theme)
  const goal = themeNo >= 0 ? THEME_GRAMMAR[themeNo] : undefined
  const topic = goal ? topicById(goal.topic) : undefined
  const detect = topic?.detect
  let used = 0
  const unknown = new Set<string>()
  for (const t of tokens) {
    const a = morph.analyze(t.text)
    if (!a.known) {
      // Büyük harfle başlayan bilinmeyenler çoğunlukla isimdir; yine de göster
      unknown.add(t.text)
      continue
    }
    for (const c of a.candidates) lemmas.add(c.lemma)
    const top = a.candidates[0]
    if (detect && top && (detect.any?.some((g) => top.grammemes.includes(g)) || detect.lemmas?.includes(top.lemma))) used++
  }
  const sentences = splitSentences(body).filter((s) => /[а-яё]/i.test(s.text)).length || 1
  const pack = packByName(theme)
  const themeUsed = pack ? pack.words.filter((w) => lemmasOf(w).some((l) => lemmas.has(l))).map((w) => w.ru) : []
  return {
    words: tokens.length,
    unique: new Set(tokens.map((t) => t.text.toLowerCase())).size,
    sentences,
    avgSentence: Math.round((tokens.length / sentences) * 10) / 10,
    unknown: [...unknown],
    themeUsed,
    themeTotal: pack?.words.length ?? 0,
    grammar: goal && topic ? { topicId: topic.id, title: topic.title, goal: goal.goal, count: detect ? used : -1, target: goal.target } : undefined,
  }
}

/* ---------- Claude istemi ---------- */

export function buildPrompt(text: Pick<TextRec, 'title' | 'theme' | 'body' | 'task'>, target = 'ТРКИ-2 (B2)'): string {
  const task = text.task ? taskById(text.task.id) : undefined
  const taskPart = task
    ? `
Bu metin ТРКИ-2 «Письмо» alt testine benzer bir görev için yazıldı. Görev:
«${task.ru}»
Değinilmesi gerekenler: ${task.points.join('; ')}.
Beklenen uzunluk: ${task.words[0]}–${task.words[1]} kelime, süre ${task.minutes} dakika; ben ${text.task!.minutes} dakikada yazdım.
Özet kısmında görevi ne kadar yerine getirdiğimi (tüm noktalara değinmiş miyim, üslup türe uygun mu: mektup/resmî yazı/görüş yazısı), metnin yapısını ve ТРКИ-2 düzeyinde geçer olup olmayacağını da değerlendir.
`
    : ''
  return `Rusça öğreniyorum (şu an yaklaşık B1, hedefim ${target}). Aşağıdaki metni bir Rusça öğretmeni gibi değerlendir.

Kurallar:
- Metindeki TÜM hataları bul: yazım, hâl ekleri, uyum, fiil görünüşü, fiil çekimi, hareket fiilleri, edatlar, kelime seçimi, söz dizimi, noktalama, üslup. Küçük hataları da atlama.
- Her hata için yanlış kısmı metinde geçtiği gibi, doğrusunu ve Türkçe kısa bir açıklama yaz.
- Seviyeyi CEFR olarak tahmin et (A2, B1, B1+, B2, B2+, C1…) ve 10 üzerinden puan ver.
- Açıklamalar, özet ve öneriler Türkçe olsun.
- Cevabını SADECE aşağıdaki biçimde, tek bir JSON kod bloğu olarak ver; JSON dışında hiçbir şey yazma.

\`\`\`json
{
  "seviye": "B1",
  "puan": 7,
  "ozet": "Genel değerlendirme, 2-3 cümle",
  "hatalar": [
    { "tur": "${ERROR_TYPES.join(' | ')}", "yanlis": "я поступл", "dogru": "я поступил", "aciklama": "Geçmiş zaman eril eki -л: поступил." }
  ],
  "duzeltilmis": "Metnin tamamen düzeltilmiş hali",
  "guclu": ["İyi yaptığım şeyler"],
  "oneriler": ["Bir sonraki metin için 2-3 somut öneri"]
}
\`\`\`

${taskPart}
Başlık: ${text.title}
Tema: ${text.theme}

Metin:
${text.body}`
}

/* ---------- Claude cevabını çöz ---------- */

type Parsed = Omit<ReviewRec, 'id' | 'textId' | 'at' | 'body'>

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))
const arr = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])

/** Yapıştırılan cevaptan JSON'u bul (kod bloğu, düz JSON ya da metin içinde). */
export function parseReview(raw: string): Parsed {
  const text = raw.trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidates = [fenced?.[1], text, text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)].filter(Boolean) as string[]
  for (const c of candidates) {
    try {
      const j = JSON.parse(c.trim().replace(/,\s*([}\]])/g, '$1'))
      if (!j || typeof j !== 'object') continue
      const score = Number(String(j.puan ?? j.score ?? '').replace(',', '.').split('/')[0])
      return {
        level: str(j.seviye ?? j.level) || '?',
        score: isFinite(score) && score > 0 ? score : undefined,
        summary: str(j.ozet ?? j.summary),
        errors: (Array.isArray(j.hatalar ?? j.errors) ? (j.hatalar ?? j.errors) : [])
          .map((e: Record<string, unknown>) => ({
            type: str(e.tur ?? e.type) || 'diğer',
            wrong: str(e.yanlis ?? e.wrong),
            right: str(e.dogru ?? e.right),
            note: str(e.aciklama ?? e.note),
          }))
          .filter((e: { wrong: string; right: string }) => e.wrong || e.right),
        corrected: str(j.duzeltilmis ?? j.corrected),
        strengths: arr(j.guclu ?? j.strengths),
        tips: arr(j.oneriler ?? j.tips),
      }
    } catch {
      /* sonraki adayı dene */
    }
  }
  // JSON yoksa en azından seviyeyi yakalamaya çalış, metni olduğu gibi sakla
  const lv = text.match(/\b(A1|A2|B1\+?|B2\+?|C1|C2)\b/)
  return { level: lv?.[1] ?? '?', summary: '', errors: [], corrected: '', strengths: [], tips: [], raw: text }
}

/** Seviyeyi grafikte sıralamak için sayıya çevir (B1 = 3, B1+ = 3.5 …). */
export function levelValue(level: string): number | null {
  const m = level.match(/([ABC])([12])(\+)?/)
  if (!m) return null
  return ({ A: 0, B: 2, C: 4 } as Record<string, number>)[m[1]] + Number(m[2]) + (m[3] ? 0.5 : 0)
}
