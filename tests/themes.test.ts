import { createRequire } from 'node:module'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createMorph, type Morph } from '../src/morph/morph'
import { DEFAULT_THEMES } from '../src/db'
import { THEME_PACKS, lemmasOf } from '../src/content/themes'

const require = createRequire(import.meta.url)
const Az = require('az')
let morph: Morph

beforeAll(async () => {
  const dicts = path.join(path.dirname(require.resolve('az/package.json')), 'dicts')
  await new Promise<void>((res, rej) => Az.Morph.init(dicts, (e: unknown) => (e ? rej(e) : res())))
  morph = createMorph(Az)
})

describe('tema paketleri', () => {
  it('her plan teması için 7 gün ve en az 50 kelime var', () => {
    expect(THEME_PACKS.map((p) => p.name)).toEqual(DEFAULT_THEMES.filter((t) => t !== 'Serbest'))
    for (const p of THEME_PACKS) {
      expect(p.week, p.name).toHaveLength(7)
      expect(p.words.length, p.name).toBeGreaterThanOrEqual(50)
      for (const d of p.week) expect(d.phrases.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('her kelime morfoloji sözlüğünde kendi lemması ve türüyle bulunuyor', () => {
    const bad: string[] = []
    for (const p of THEME_PACKS)
      for (const w of p.words) {
        if (!w.ru || !w.tr) bad.push(`${p.name}: boş kayıt`)
        for (const l of lemmasOf(w)) {
          const a = morph.analyze(l)
          const ok = a.candidates.some((c) => c.lemma === l && c.pos === w.pos)
          if (!ok) bad.push(`${p.name}: ${l} (${w.pos}) → ${a.candidates.map((c) => c.lemma + '/' + c.pos).join(', ') || 'yok'}`)
        }
      }
    expect(bad).toEqual([])
  })
})
