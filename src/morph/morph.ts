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
  /** Sözlük halinden çekim tabloları (fiil, isim, sıfat); yoksa boş dizi. */
  paradigm(lemma: string, pos: PosCode): ParadigmTable[]
  /** Aynı lemmanın başka formları (alıştırmada yanlış seçenek olarak). */
  distractors(word: string, lemma: string): string[]
}

export interface ParadigmTable {
  title: string
  cols: string[]
  rows: Array<{ label: string; cells: string[] }>
  note?: string
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

  function paradigm(lemma: string, pos: PosCode): ParadigmTable[] {
    const want = pos === 'verb' ? 'INFN' : pos === 'noun' ? 'NOUN' : pos === 'adj' ? 'ADJF' : null
    if (!want) return []
    const base = cleanWord(lemma)
    const p = caseParses(base, lemma).find((x) => grammemesOf(x.tag)[0] === want && foldYo(String(x.normalize().word)) === foldYo(base))
    if (!p) return []
    const g = grammemesOf(p.tag)
    const f = (gr: string[]): string => {
      const r = p.inflect(gr)
      return r && r.word ? String(r.word) : '—'
    }
    const cap = (w: string) => (PROPER.some((x) => g.includes(x)) && w !== '—' ? capitalize(w) : w)
    const CASES: Array<[string, string]> = [
      ['nomn', 'Yalın (кто? что?)'],
      ['gent', 'İlgi (кого? чего?)'],
      ['datv', 'Yönelme (кому? чему?)'],
      ['accs', 'Belirtme (кого? что?)'],
      ['ablt', 'Araç (кем? чем?)'],
      ['loct', 'Bulunma (о ком? о чём?)'],
    ]

    if (want === 'INFN') {
      const perf = g.includes('perf')
      const t = perf ? 'futr' : 'pres'
      const persons: Array<[string, string, string]> = [
        ['я', '1per', 'sing'],
        ['ты', '2per', 'sing'],
        ['он / она', '3per', 'sing'],
        ['мы', '1per', 'plur'],
        ['вы', '2per', 'plur'],
        ['они', '3per', 'plur'],
      ]
      const bud = ['буду', 'будешь', 'будет', 'будем', 'будете', 'будут']
      const tables: ParadigmTable[] = [
        {
          title: perf ? 'Gelecek zaman (tamamlanmış)' : 'Şimdiki zaman / gelecek zaman',
          cols: perf ? ['', 'gelecek'] : ['', 'şimdiki', 'gelecek'],
          rows: persons.map(([label, per, num], i) => ({
            label,
            cells: perf ? [f([t, per, num])] : [f([t, per, num]), `${bud[i]} ${base}`],
          })),
          note: perf ? 'Tamamlanmış fiilin şimdiki zamanı yoktur; çekimli hali gelecek anlamı taşır.' : undefined,
        },
        {
          title: 'Geçmiş zaman',
          cols: ['', ''],
          rows: [
            { label: 'он (eril)', cells: [f(['past', 'masc'])] },
            { label: 'она (dişil)', cells: [f(['past', 'femn'])] },
            { label: 'оно (nötr)', cells: [f(['past', 'neut'])] },
            { label: 'они (çoğul)', cells: [f(['past', 'plur'])] },
          ],
        },
        {
          title: 'Emir kipi',
          cols: ['', ''],
          rows: [
            { label: 'ты', cells: [f(['impr', 'sing', 'excl'])] },
            { label: 'вы', cells: [f(['impr', 'plur', 'excl'])] },
          ],
        },
      ]
      return tables
    }

    if (want === 'NOUN') {
      const pltm = g.includes('Pltm')
      const sgtm = g.includes('Sgtm')
      return [
        {
          title: 'Hâl çekimi',
          cols: ['', ...(pltm ? [] : ['tekil']), ...(sgtm ? [] : ['çoğul'])],
          rows: CASES.map(([c, label]) => ({
            label,
            cells: [...(pltm ? [] : [cap(f([c, 'sing']))]), ...(sgtm ? [] : [cap(f([c, 'plur']))])],
          })),
          note: pltm ? 'Bu kelime yalnızca çoğul kullanılır.' : sgtm ? 'Bu kelime yalnızca tekil kullanılır.' : undefined,
        },
      ]
    }

    // Sıfat
    const tables: ParadigmTable[] = [
      {
        title: 'Hâl çekimi',
        cols: ['', 'eril', 'nötr', 'dişil', 'çoğul'],
        rows: CASES.map(([c, label]) => ({
          label,
          cells:
            c === 'accs'
              ? [`${f([c, 'masc', 'inan'])} / ${f([c, 'masc', 'anim'])}`, f([c, 'neut']), f([c, 'femn']), `${f([c, 'plur', 'inan'])} / ${f([c, 'plur', 'anim'])}`]
              : [f([c, 'masc']), f([c, 'neut']), f([c, 'femn']), f([c, 'plur'])],
        })),
        note: 'Belirtme halinde eril ve çoğulda: cansız / canlı.',
      },
    ]
    const short = [f(['ADJS', 'masc']), f(['ADJS', 'neut']), f(['ADJS', 'femn']), f(['ADJS', 'plur'])]
    const comp = f(['COMP'])
    if (short.some((x) => x !== '—') || comp !== '—') {
      tables.push({
        title: 'Kısa biçim ve karşılaştırma',
        cols: ['', ''],
        rows: [
          ...(short.some((x) => x !== '—') ? [{ label: 'kısa biçim', cells: [short.join(', ')] }] : []),
          ...(comp !== '—' ? [{ label: 'karşılaştırma', cells: [comp] }] : []),
        ],
      })
    }
    return tables
  }

  function distractors(word: string, lemma: string): string[] {
    const form = cleanWord(word)
    const parse = caseParses(form, word).find((x) => foldYo(String(x.normalize().word)) === foldYo(cleanWord(lemma)))
    if (!parse) return []
    const g = grammemesOf(parse.tag)
    const CASES = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct']
    let tags: string[][] = []
    if (g[0] === 'NOUN') tags = CASES.flatMap((c) => [[c, 'sing'], [c, 'plur']])
    else if (['ADJF', 'PRTF'].includes(g[0])) tags = CASES.flatMap((c) => ['masc', 'femn', 'neut', 'plur'].map((x) => [c, x]))
    else if (['VERB', 'INFN', 'GRND', 'PRTS'].includes(g[0])) {
      // Fiilin mastar parse'ından: şahıslar, geçmiş, emir, mastar, zarf-fiil
      const inf = caseParses(cleanWord(lemma), lemma).find((x) => grammemesOf(x.tag)[0] === 'INFN') ?? parse
      const t = grammemesOf(inf.tag).includes('perf') ? 'futr' : 'pres'
      const verbTags = [
        [t, '1per', 'sing'], [t, '2per', 'sing'], [t, '3per', 'sing'], [t, '1per', 'plur'], [t, '3per', 'plur'],
        ['past', 'masc'], ['past', 'femn'], ['past', 'plur'], ['impr', 'sing', 'excl'], ['GRND'], ['INFN'],
      ]
      const out = new Set<string>()
      for (const tg of verbTags) {
        const r = inf.inflect(tg)
        if (r && r.word) out.add(String(r.word))
      }
      out.add(String(inf.word))
      return [...out].filter((w) => foldYo(w) !== foldYo(form))
    }
    const out = new Set<string>()
    for (const tg of tags) {
      const r = parse.inflect(tg)
      if (r && r.word) out.add(String(r.word))
    }
    return [...out].filter((w) => foldYo(w) !== foldYo(form))
  }

  return { analyze, suggest, paradigm, distractors }
}
