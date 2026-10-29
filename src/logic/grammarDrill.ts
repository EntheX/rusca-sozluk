// Gramer alıştırması: gerçek cümlelerden boşluk doldurma soruları üretir (çoktan seçmeli).

import type { GrammarTopic } from '../content/grammar'
import { THEME_PACKS, lemmasOf } from '../content/themes'
import { foldYo, type Morph } from '../morph/morph'
import { describeGrammemes } from '../morph/tags'
import { tokenize } from '../morph/tokenize'

export interface DrillItem {
  sentence: string
  start: number
  end: number
  answer: string
  lemma: string
  options: string[]
  hint: string
  source: string
}

/** Tema listelerindeki görünüş çiftleri: her iki yönde */
export function aspectPairs(): Map<string, string> {
  const m = new Map<string, string>()
  for (const p of THEME_PACKS)
    for (const w of p.words) {
      const ls = lemmasOf(w)
      if (w.pos === 'verb' && ls.length === 2) {
        m.set(ls[0], ls[1])
        m.set(ls[1], ls[0])
      }
    }
  return m
}

function matches(g: string[], lemma: string, f: NonNullable<GrammarTopic['drill']>): boolean {
  if (f.lemmaRe && !new RegExp(f.lemmaRe).test(lemma)) return false
  if (f.any && !f.any.some((x) => g.includes(x))) return false
  if (f.all && !f.all.every((x) => g.includes(x))) return false
  if (f.none && f.none.some((x) => g.includes(x))) return false
  return true
}

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

/** Büyük harfle başlıyorsa seçenekleri de büyük harfle göster */
const likeCase = (w: string, model: string) => (/^[А-ЯЁ]/.test(model) ? w.charAt(0).toUpperCase() + w.slice(1) : w)

export function buildDrill(topic: GrammarTopic, sentences: Array<{ text: string; source: string }>, morph: Morph, max = 10): DrillItem[] {
  const f = topic.drill
  if (!f) return []
  const pairs = f.kind === 'aspect' ? aspectPairs() : null
  const items: DrillItem[] = []
  const seen = new Set<string>()
  for (const s of shuffle(sentences)) {
    for (const t of shuffle(tokenize(s.text))) {
      const a = morph.analyze(t.text)
      if (a.candidates.length !== 1) continue
      const c = a.candidates[0]
      if (!matches(c.grammemes, c.lemma, f)) continue
      const key = c.lemma + '|' + foldYo(t.text)
      if (seen.has(key)) continue
      let options: string[]
      if (f.kind === 'aspect') {
        const other = pairs!.get(c.lemma)
        if (!other) continue
        // Cevap metindeki form; yanlış seçenek diğer görünüşün aynı kişi/zamandaki formu olmayabilir, o yüzden mastarları sor
        options = shuffle([c.lemma, other])
        items.push({
          sentence: s.text,
          start: t.start,
          end: t.end,
          answer: c.lemma,
          lemma: t.text,
          options,
          hint: c.grammemes.includes('perf') ? 'tamamlanmış (СВ)' : 'tamamlanmamış (НСВ)',
          source: s.source,
        })
      } else {
        if (foldYo(t.text) === foldYo(c.lemma) && !c.grammemes.includes('GRND')) continue
        let ds = morph.distractors(t.text, c.lemma)
        // Geçmiş zaman tekilde cins farkı (я/ты шёл–шла) iki cevabı da doğru yapabilir: diğer cinsleri çıkar
        if (c.grammemes.includes('past') && c.grammemes.includes('sing'))
          ds = ds.filter((d) => !morph.analyze(d).candidates.some((x) => x.grammemes.includes('past') && x.grammemes.includes('sing')))
        ds = shuffle(ds).slice(0, 3)
        if (ds.length < 2) continue
        options = shuffle([t.text.toLowerCase(), ...ds]).map((o) => likeCase(o, t.text))
        items.push({
          sentence: s.text,
          start: t.start,
          end: t.end,
          answer: t.text,
          lemma: c.lemma,
          options,
          hint: describeGrammemes(c.grammemes).join(', '),
          source: s.source,
        })
      }
      seen.add(key)
      break // her cümleden bir soru
    }
    if (items.length >= max) break
  }
  return items
}

export const isCorrect = (item: DrillItem, choice: string) => foldYo(choice) === foldYo(item.answer)
