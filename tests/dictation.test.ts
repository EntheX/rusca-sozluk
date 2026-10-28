import { describe, expect, it } from 'vitest'
import { diffWords, score } from '../src/logic/dictation'

describe('dikte karşılaştırması', () => {
  it('büyük/küçük harf, ё/е ve noktalama farkı hata sayılmaz', () => {
    const ops = diffWords('Я пошёл в школу.', 'я пошел в школу')
    expect(ops.every((o) => o.kind === 'ok')).toBe(true)
    expect(score(ops)).toBe(100)
  })
  it('yanlış, eksik ve fazla kelimeler', () => {
    const ops = diffWords('Мы стали друзьями в колледже', 'Мы стали друзями колледже очень')
    expect(ops).toEqual([
      { kind: 'ok', word: 'Мы' },
      { kind: 'ok', word: 'стали' },
      { kind: 'wrong', word: 'друзьями', typed: 'друзями' },
      { kind: 'missing', word: 'в' },
      { kind: 'ok', word: 'колледже' },
      { kind: 'extra', typed: 'очень' },
    ])
    expect(score(ops)).toBeLessThan(100)
  })
})
