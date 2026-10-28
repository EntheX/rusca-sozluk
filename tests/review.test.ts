import { describe, expect, it } from 'vitest'
import { levelValue, parseReview } from '../src/logic/review'

describe('Claude cevabını çözme', () => {
  it('kod bloğundaki JSON okunur', () => {
    const raw = 'İşte değerlendirme:\n```json\n{"seviye":"B1+","puan":"7/10","ozet":"İyi.","hatalar":[{"tur":"yazım","yanlis":"поступл","dogru":"поступил","aciklama":"-ил"}],"duzeltilmis":"Я поступил.","guclu":["akıcı"],"oneriler":["bağlaç kullan",],}\n```'
    const r = parseReview(raw)
    expect(r.level).toBe('B1+')
    expect(r.score).toBe(7)
    expect(r.errors).toEqual([{ type: 'yazım', wrong: 'поступл', right: 'поступил', note: '-ил' }])
    expect(r.corrected).toBe('Я поступил.')
    expect(r.tips).toEqual(['bağlaç kullan'])
    expect(r.raw).toBeUndefined()
  })

  it('JSON yoksa ham metin ve seviye saklanır', () => {
    const r = parseReview('Seviyen B2 civarında, birkaç hata var.')
    expect(r.level).toBe('B2')
    expect(r.raw).toContain('birkaç hata')
  })

  it('seviye sıralaması', () => {
    expect(levelValue('B1')).toBeLessThan(levelValue('B1+')!)
    expect(levelValue('B1+')).toBeLessThan(levelValue('B2')!)
    expect(levelValue('?')).toBeNull()
  })
})
