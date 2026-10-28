// Dikte: yazılan cümleyi doğrusuyla kelime kelime karşılaştır.

export type DiffOp =
  | { kind: 'ok'; word: string }
  | { kind: 'wrong'; word: string; typed: string }
  | { kind: 'missing'; word: string }
  | { kind: 'extra'; typed: string }

const WORD_RE = /[А-Яа-яЁёA-Za-z0-9]+(?:-[А-Яа-яЁё]+)*/g
const norm = (w: string) => w.toLowerCase().replace(/ё/g, 'е')

export const words = (s: string) => s.match(WORD_RE) ?? []

export function diffWords(correct: string, typed: string): DiffOp[] {
  const a = words(correct)
  const b = words(typed)
  const n = a.length
  const m = b.length
  // LCS tablosu
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = norm(a[i]) === norm(b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const raw: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (norm(a[i]) === norm(b[j])) {
      raw.push({ kind: 'ok', word: a[i] })
      i++
      j++
    } else if (L[i + 1][j] >= L[i][j + 1]) raw.push({ kind: 'missing', word: a[i++] })
    else raw.push({ kind: 'extra', typed: b[j++] })
  }
  while (i < n) raw.push({ kind: 'missing', word: a[i++] })
  while (j < m) raw.push({ kind: 'extra', typed: b[j++] })
  // Ardışık eksik/fazla grubu içinde sırayla eşleştir → yanlış yazılmış kelime
  const out: DiffOp[] = []
  let k = 0
  while (k < raw.length) {
    if (raw[k].kind === 'ok') {
      out.push(raw[k++])
      continue
    }
    const miss: string[] = []
    const extra: string[] = []
    while (k < raw.length && raw[k].kind !== 'ok') {
      const x = raw[k++]
      if (x.kind === 'missing') miss.push(x.word)
      else if (x.kind === 'extra') extra.push(x.typed)
    }
    const pairs = Math.min(miss.length, extra.length)
    for (let p = 0; p < pairs; p++) out.push({ kind: 'wrong', word: miss[p], typed: extra[p] })
    for (const w of miss.slice(pairs)) out.push({ kind: 'missing', word: w })
    for (const t of extra.slice(pairs)) out.push({ kind: 'extra', typed: t })
  }
  return out
}

/** Doğru kelime oranı (0–100) */
export function score(ops: DiffOp[]): number {
  const total = ops.filter((o) => o.kind !== 'extra').length
  const extra = ops.filter((o) => o.kind === 'extra').length
  const ok = ops.filter((o) => o.kind === 'ok').length
  return total ? Math.max(0, Math.round(((ok - extra * 0.5) / total) * 100)) : 0
}
