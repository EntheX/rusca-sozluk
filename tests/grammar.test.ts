import { createRequire } from 'node:module'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createMorph, foldYo, type Morph } from '../src/morph/morph'
import { GRAMMAR, THEME_GRAMMAR, topicById } from '../src/content/grammar'
import { GRADED } from '../src/content/graded'
import { buildDrill, isCorrect } from '../src/logic/grammarDrill'
import { splitSentences } from '../src/morph/tokenize'
import { ERROR_TYPES } from '../src/logic/review'

const require = createRequire(import.meta.url)
const Az = require('az')
let morph: Morph

beforeAll(async () => {
  const dicts = path.join(path.dirname(require.resolve('az/package.json')), 'dicts')
  await new Promise<void>((res, rej) => Az.Morph.init(dicts, (e: unknown) => (e ? rej(e) : res())))
  morph = createMorph(Az)
})

const sentences = GRADED.flatMap((g) => splitSentences(g.body).map((s) => ({ text: s.text.trim(), source: g.title })))

describe('gramer', () => {
  it('her tema için geçerli bir gramer hedefi, hata türleri tanımlı', () => {
    expect(THEME_GRAMMAR).toHaveLength(12)
    for (const g of THEME_GRAMMAR) expect(topicById(g.topic), g.topic).toBeTruthy()
    for (const t of GRAMMAR) for (const e of t.errorTypes) expect(ERROR_TYPES as readonly string[]).toContain(e)
  })

  it('alıştırmalı her konu gerçek cümlelerden soru üretir; doğru cevap seçeneklerde var', () => {
    const report: string[] = []
    for (const t of GRAMMAR.filter((x) => x.drill)) {
      const items = buildDrill(t, [...(t.bank ?? []).map((text) => ({ text, source: 'örnek' })), ...sentences], morph, 8)
      report.push(`${t.id}: ${items.length}`)
      expect(items.length, t.id).toBeGreaterThan(2)
      for (const it of items) {
        expect(it.options.some((o) => isCorrect(it, o)), `${t.id} ${it.answer} ${it.options}`).toBe(true)
        expect(new Set(it.options.map(foldYo)).size).toBe(it.options.length)
        expect(it.sentence.slice(it.start, it.end).toLowerCase()).toBe(t.drill!.kind === 'aspect' ? it.lemma.toLowerCase() : it.answer.toLowerCase())
      }
    }
    console.log(report.join(' · '))
    if (process.env.DUMP)
      for (const t of GRAMMAR.filter((x) => x.drill))
        for (const it of buildDrill(t, [...(t.bank ?? []).map((text) => ({ text, source: 'örnek' })), ...sentences], morph, 2))
          console.log('DUMP', t.id, it.sentence.slice(0, it.start) + '___' + it.sentence.slice(it.end), '(' + it.lemma + ')', it.options.join('|'), '=>', it.answer, '/', it.hint)
  })
})

import { LEVEL_TESTS } from '../src/content/levelTests'

describe('seviye testleri', () => {
  it('her seviyede 20 soru, geçerli cevap ve konu', () => {
    expect(LEVEL_TESTS.map((t) => t.level)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1'])
    for (const t of LEVEL_TESTS) {
      expect(t.questions, t.level).toHaveLength(20)
      for (const q of t.questions) {
        expect(q.q, q.q).toContain('___')
        expect(q.a).toBeGreaterThanOrEqual(0)
        expect(q.a).toBeLessThan(q.o.length)
        expect(new Set(q.o).size, q.q).toBe(q.o.length)
        if (q.t) expect(topicById(q.t), q.t).toBeTruthy()
      }
    }
  })

  it('doğru cevaplardaki kelimeler morfoloji sözlüğünde var', () => {
    const bad: string[] = []
    for (const t of LEVEL_TESTS)
      for (const q of t.questions)
        for (const w of q.o[q.a].split(/[\s-]+/)) if (w && !morph.analyze(w).known) bad.push(`${t.level}: ${w}`)
    expect(bad).toEqual([])
  })
})
