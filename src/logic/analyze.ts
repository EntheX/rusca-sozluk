// Metni çözümle ve her kelimeyi kişisel sözlüğe göre renklendir.

import type { Choice } from '../db'
import { lemmaKey } from '../db'
import type { Candidate, Morph, WordAnalysis } from '../morph/morph'
import { tokenize, type Token } from '../morph/tokenize'

/**
 * known: sözlükte var (yeşil) · new: yeni (mavi) · ambiguous: birden çok lemma, seçilmedi (sarı)
 * unknown: morfoloji sözlüğünde yok (kırmızı) · skipped: sözlüğe eklenmeyecek (gri)
 */
export type TokenStatus = 'known' | 'new' | 'ambiguous' | 'unknown' | 'skipped'

export interface AnalyzedToken extends Token {
  form: string
  analysis: WordAnalysis
  /** Geçerli seçim; sarı kelimelerde en olası aday ön seçilidir. */
  choice: Choice | null
  status: TokenStatus
  /** Belirsiz kelime bir seçimle çözüldüyse nereden geldiği. */
  resolvedBy?: 'text' | 'memory'
}

export interface AnalyzeContext {
  /** Sözlükte (bu metin dışında) en az bir kez kullanılmış lemma anahtarları. */
  knownKeys: Set<string>
  /** Bu metinde daha önce yapılan seçimler. */
  textChoices: Record<string, Choice>
  /** Önceki metinlerde belirsiz formlar için yapılan seçimler. */
  formChoices: Record<string, Choice>
}

export function candidateChoice(c: Candidate): Choice {
  return { kind: 'lemma', lemma: c.lemma, pos: c.pos, grammemes: c.grammemes }
}

function statusFor(choice: Choice, known: Set<string>): TokenStatus {
  if (choice.kind === 'skip') return 'skipped'
  return known.has(lemmaKey(choice.lemma, choice.pos)) ? 'known' : 'new'
}

export function analyzeToken(token: Token, morph: Morph, ctx: AnalyzeContext): AnalyzedToken {
  const analysis = morph.analyze(token.text)
  const form = analysis.form
  const own = ctx.textChoices[form]
  const base = { ...token, form, analysis }

  if (own) return { ...base, choice: own, status: statusFor(own, ctx.knownKeys), resolvedBy: 'text' }
  if (!analysis.known) return { ...base, choice: null, status: 'unknown' }

  const cands = analysis.candidates
  if (cands.length === 1) {
    const choice = candidateChoice(cands[0])
    return { ...base, choice, status: statusFor(choice, ctx.knownKeys) }
  }

  const mem = ctx.formChoices[form]
  if (mem && mem.kind === 'lemma') {
    const match = cands.find((c) => c.lemma === mem.lemma && c.pos === mem.pos)
    if (match) {
      const choice = candidateChoice(match)
      return { ...base, choice, status: statusFor(choice, ctx.knownKeys), resolvedBy: 'memory' }
    }
  }
  return { ...base, choice: candidateChoice(cands[0]), status: 'ambiguous' }
}

export function analyzeBody(body: string, morph: Morph, ctx: AnalyzeContext): AnalyzedToken[] {
  const cache = new Map<string, WordAnalysis>()
  const cached: Morph = {
    paradigm: morph.paradigm,
    distractors: morph.distractors,
    analyze: (w) => {
      let a = cache.get(w)
      if (!a) {
        a = morph.analyze(w)
        cache.set(w, a)
      }
      return a
    },
    suggest: morph.suggest,
  }
  return tokenize(body).map((t) => analyzeToken(t, cached, ctx))
}

/** Bir kelimeye kullanıcı seçimi uygula ve aynı formdaki tüm kelimeleri güncelle. */
export function applyChoice(tokens: AnalyzedToken[], form: string, choice: Choice, known: Set<string>): AnalyzedToken[] {
  return tokens.map((t) =>
    t.form === form ? { ...t, choice, status: statusFor(choice, known), resolvedBy: 'text' as const } : t,
  )
}

export function countByStatus(tokens: AnalyzedToken[]): Record<TokenStatus, number> {
  const r: Record<TokenStatus, number> = { known: 0, new: 0, ambiguous: 0, unknown: 0, skipped: 0 }
  for (const t of tokens) r[t.status]++
  return r
}
