import { createRequire } from 'node:module'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createMorph, type Morph } from '../src/morph/morph'
import { tokenize } from '../src/morph/tokenize'
import { describeGrammemes } from '../src/morph/tags'

const require = createRequire(import.meta.url)
const Az = require('az')
let morph: Morph

beforeAll(async () => {
  const dicts = path.join(path.dirname(require.resolve('az/package.json')), 'dicts')
  await new Promise<void>((res, rej) => Az.Morph.init(dicts, (e: unknown) => (e ? rej(e) : res())))
  morph = createMorph(Az)
})

const lemmas = (w: string) => morph.analyze(w).candidates.map((c) => c.lemma)

describe('morfoloji', () => {
  it('поступил → поступить (geçmiş zaman, eril, tekil)', () => {
    const a = morph.analyze('поступил')
    expect(a.known).toBe(true)
    expect(a.candidates).toHaveLength(1)
    expect(a.candidates[0].lemma).toBe('поступить')
    expect(a.candidates[0].pos).toBe('verb')
    const d = describeGrammemes(a.candidates[0].grammemes)
    expect(d).toEqual(expect.arrayContaining(['geçmiş zaman', 'eril', 'tekil']))
  })

  it('людей → человек', () => {
    expect(lemmas('людей')).toEqual(['человек'])
  })

  it('лучше → хороший / хорошо (belirsiz)', () => {
    const l = lemmas('лучше')
    expect(l.length).toBeGreaterThan(1)
    expect(l).toContain('хороший')
    expect(l).toContain('хорошо')
  })

  it('идёт ve идет → идти', () => {
    expect(lemmas('идёт')).toEqual(['идти'])
    expect(lemmas('идет')).toEqual(['идти'])
  })

  it('стали → стать / сталь (belirsiz)', () => {
    const l = lemmas('стали')
    expect(l[0]).toBe('стать')
    expect(l).toContain('сталь')
  })

  it('isim, sıfat ve sıra sayısı sözlük hali', () => {
    expect(lemmas('городе')).toEqual(['город'])
    expect(lemmas('небольшом')).toEqual(['небольшой'])
    expect(lemmas('третьему')[0]).toBe('третий')
    expect(lemmas('первый')).toEqual(['первый'])
    expect(lemmas('было')).toEqual(['быть'])
    expect(lemmas('сделанный')).toEqual(['сделать'])
  })

  it('büyük harf, ё/е ve özel isim', () => {
    expect(lemmas('Турции')).toEqual(['Турция'])
    expect(lemmas('елку')).toEqual(['ёлка'])
  })

  it('işlev kelimeleri tek kelime sayılır', () => {
    expect(lemmas('что')).toEqual(['что'])
    expect(lemmas('и')).toEqual(['и'])
  })

  it('sözlükte olmayan kelime ve öneri', () => {
    const a = morph.analyze('поступл')
    expect(a.known).toBe(false)
    expect(morph.suggest('поступл')).toContain('поступил')
  })
})

describe('ayırıcı', () => {
  it('kelimeleri ve cümleleri ayırır', () => {
    const t = tokenize('Я родился в городе. В итоге я поступил в колледж! Кто-то, 2025.')
    expect(t.map((x) => x.text)).toEqual(['Я', 'родился', 'в', 'городе', 'В', 'итоге', 'я', 'поступил', 'в', 'колледж', 'Кто-то'])
    expect(t[7].sentence).toBe('В итоге я поступил в колледж!')
    expect(t[10].sentence).toBe('Кто-то, 2025.')
  })
})

describe('çekim tablosu', () => {
  const cell = (lemma: string, pos: Parameters<Morph['paradigm']>[1], t: number, r: number, c = 0) => morph.paradigm(lemma, pos)[t].rows[r].cells[c]
  it('tamamlanmış fiil: gelecek, geçmiş, emir', () => {
    expect(cell('поступить', 'verb', 0, 0)).toBe('поступлю')
    expect(cell('поступить', 'verb', 1, 1)).toBe('поступила')
    expect(cell('поступить', 'verb', 2, 0)).toBe('поступи')
  })
  it('tamamlanmamış fiil: şimdiki ve birleşik gelecek', () => {
    expect(cell('идти', 'verb', 0, 1, 0)).toBe('идёшь')
    expect(cell('читать', 'verb', 0, 0, 1)).toBe('буду читать')
    expect(cell('идти', 'verb', 1, 0)).toBe('шёл')
  })
  it('isim: человек → люди', () => {
    expect(cell('человек', 'noun', 0, 1, 1)).toBe('людей')
    expect(cell('человек', 'noun', 0, 4, 1)).toBe('людьми')
  })
  it('sıfat: karşılaştırma ve kısa biçim', () => {
    const t = morph.paradigm('хороший', 'adj')
    expect(t[0].rows[1].cells[2]).toBe('хорошей')
    expect(t[1].rows.map((r) => r.cells[0]).join(' ')).toContain('лучше')
  })
  it('çekimsiz türler için boş', () => {
    expect(morph.paradigm('очень', 'adv')).toEqual([])
  })
})
