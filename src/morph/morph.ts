// Az.js (OpenCorpora sözlüğü) üzerine ince bir katman.
// Saf modül: Az nesnesini dışarıdan alır, böylece hem tarayıcıda hem Node testlerinde çalışır.

import { MINOR_POS, PROPER, posFromGrammemes, type PosCode } from './tags'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AzLike = any

export interface Candidate {
  /** Sözlük hali: fiilde mastar, isimde tekil yalın, sıfatta eril tekil yalın. */
  lemma: string
  pos: PosCode
  /** Bu formun en olası çözümlemesinin etiketleri (OpenCorpora grammemleri). */
  grammemes: string[]
  /** Aynı lemma için diğer olası etiket setleri (ör. меня: belirtme / ilgi). */
  altGrammemes: string[][]
  /** 0..1 arası olasılık (OpenCorpora derlemindeki sıklığa göre). */
  score: number
}

export interface WordAnalysis {
  form: string
  /** Sözlükte bulundu mu? false ise yazım hatası olabilir. */
  known: boolean
  /** Lemma+türe göre gruplanmış, olasılığa göre sıralı adaylar. */
  candidates: Candidate[]
}

export interface Morph {
  analyze(word: string): WordAnalysis
  /** Bilinmeyen kelime için yazım önerileri (1 harf hatası). */
  suggest(word: string): string[]
}

const DICT_PARSERS = ['Dictionary', 'HyphenParticle', 'HyphenAdverb', 'HyphenWords']
/** Bu oranın altındaki çok düşük olasılıklı lemma adayları elenir (ör. «и» → ünlem). */
const MIN_SCORE = 0.01
/** Edat/bağlaç/küçük kelime adayları için daha yüksek eşik (ör. «было» → küçük kelime). */
const MIN_SCORE_FUNCTION = 0.1
const FUNCTION_POS = new Set(['prep', 'conj', 'part'])

export function cleanWord(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/[̀́]/g, '') // vurgu işaretleri
    .toLowerCase()
    .replace(/^[-]+|[-]+$/g, '')
}

/** ё/е farkını yok sayarak karşılaştırma anahtarı. */
export function foldYo(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е')
}

function grammemesOf(tag: any): string[] {
  return String(tag).split(/[ ,]+/).filter(Boolean)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function createMorph(Az: AzLike): Morph {
  function lemmaOf(p: any, g: string[]): string {
    let n: any = p.normalize()
    // Sıra sayıları (третий) OpenCorpora'da asıl sayıya (три) bağlı; sıfat halini koru.
    if (g[0] === 'ADJF' && g.includes('Anum') && p.inflect) {
      n = p.inflect(['ADJF', 'Anum', 'masc', 'sing', 'nomn']) || n
    }
    let lemma = String(n && n.word ? n.word : p.word)
    if (PROPER.some((x) => g.includes(x))) lemma = capitalize(lemma)
    return lemma
  }

  function rawParses(word: string): any[] {
    return Az.Morph(word, { typos: 0, stutter: 0, parsers: DICT_PARSERS }) as any[]
  }

  /** Özel isimler sözlükte büyük harfle durur: küçük, Büyük ve yazıldığı gibi hallerini dene. */
  function caseParses(form: string, raw: string): any[] {
    const seen = new Set<string>()
    const out: any[] = []
    for (const v of new Set([form, capitalize(form), raw.replace(/[\u0300\u0301]/g, '')])) {
      for (const p of rawParses(v)) {
        const k = p.word + '|' + String(p.tag) + '|' + p.normalize().word
        if (!seen.has(k)) {
          seen.add(k)
          out.push(p)
        }
      }
    }
    return out
  }

  function analyze(raw: string): WordAnalysis {
    const form = cleanWord(raw)
    const capitalized = /^[А-ЯЁ]/.test(raw.trim())
    let parses = caseParses(form, raw.trim())
    if (!parses.length) return { form, known: false, candidates: [] }

    // Kısaltma ve baş harf çözümlemelerini at; özel isimleri sadece büyük harfle yazılmışsa tut.
    const filtered = parses.filter((p) => {
      const g = grammemesOf(p.tag)
      if (g.includes('Abbr') || g.includes('Init')) return false
      if (!capitalized && (g.includes('Name') || g.includes('Surn') || g.includes('Patr'))) return false
      return true
    })
    if (filtered.length) parses = filtered

    type Group = Candidate & { parses: Array<{ g: string[]; s: number }> }
    const groups = new Map<string, Group>()
    for (const p of parses) {
      const g = grammemesOf(p.tag)
      const pos = posFromGrammemes(g)
      const lemma = lemmaOf(p, g)
      const key = lemma + '|' + pos
      const s = Number(p.score) || 0
      let grp = groups.get(key)
      if (!grp) {
        grp = { lemma, pos, grammemes: g, altGrammemes: [], score: 0, parses: [] }
        groups.set(key, grp)
      }
      grp.score += s
      grp.parses.push({ g, s })
    }

    let list = [...groups.values()]

    // «лучше» hem хороший hem хорошо'nun karşılaştırma hali: sıfat karşılaştırmasına zarf adayı ekle.
    for (const grp of [...list]) {
      if (grp.grammemes[0] !== 'COMP') continue
      const adv = grp.lemma.replace(/(ый|ий|ой)$/, 'о')
      if (adv === grp.lemma) continue
      const hasAdv = rawParses(adv).some((p) => grammemesOf(p.tag)[0] === 'ADVB' && p.normalize().word === adv)
      if (hasAdv && !list.some((x) => x.lemma === adv)) {
        list.push({ lemma: adv, pos: 'adv', grammemes: ['ADVB', 'COMP'], altGrammemes: [], score: grp.score / 2, parses: [] })
        grp.score /= 2
      }
    }

    // Aynı lemmanın işlev kelimesi türleri tek kelimedir (что: bağlaç/zamir/edat → tek «что»).
    list.sort((a, b) => b.score - a.score)
    const merged: Group[] = []
    for (const grp of list) {
      const same = merged.find(
        (m) => m.lemma === grp.lemma && (MINOR_POS.has(m.pos) || MINOR_POS.has(grp.pos)),
      )
      if (same) {
        same.score += grp.score
        same.parses.push(...grp.parses)
      } else merged.push(grp)
    }

    const total = merged.reduce((t, x) => t + x.score, 0) || 1
    let candidates: Candidate[] = merged.map((m) => {
      const ps = [...m.parses].sort((a, b) => b.s - a.s)
      if (ps.length) m.grammemes = ps[0].g
      const seen = new Set<string>([m.grammemes.join(',')])
      const alt: string[][] = []
      for (const p of ps) {
        const k = p.g.join(',')
        if (!seen.has(k)) {
          seen.add(k)
          alt.push(p.g)
        }
      }
      return { lemma: m.lemma, pos: m.pos, grammemes: m.grammemes, altGrammemes: alt, score: m.score / total }
    })
    candidates.sort((a, b) => b.score - a.score)
    if (candidates.length > 1) {
      const kept = candidates.filter((c) => c.score >= (FUNCTION_POS.has(c.pos) ? MIN_SCORE_FUNCTION : MIN_SCORE))
      if (kept.length) candidates = kept
      const t = candidates.reduce((s, c) => s + c.score, 0) || 1
      candidates = candidates.map((c) => ({ ...c, score: c.score / t }))
    }
    return { form, known: true, candidates }
  }

  function suggest(raw: string): string[] {
    const form = cleanWord(raw)
    const out: string[] = []
    try {
      const ps = Az.Morph(form, { typos: 1, stutter: 1, parsers: ['Dictionary'] }) as any[]
      for (const p of ps) {
        const w = String(p.word)
        if (w !== form && !out.includes(w)) out.push(w)
        if (out.length >= 6) break
      }
    } catch {
      /* öneri yoksa boş liste */
    }
    return out
  }

  return { analyze, suggest }
}
