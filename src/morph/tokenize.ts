// Metni kelimelere ve cümlelere ayırma.

export interface Token {
  index: number
  start: number
  end: number
  /** Metinde yazıldığı gibi. */
  text: string
  sentence: string
}

const WORD_RE = /[А-Яа-яЁё́]+(?:-[А-Яа-яЁё́]+)*/g

/** Cümle aralıkları: . ! ? … ve satır sonlarına göre. */
export function splitSentences(body: string): Array<{ start: number; end: number; text: string }> {
  const out: Array<{ start: number; end: number; text: string }> = []
  const re = /[^.!?…\n]+(?:[.!?…]+["»”)]*)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const text = m[0].trim()
    if (text) out.push({ start: m.index, end: m.index + m[0].length, text })
  }
  return out
}

export function tokenize(body: string): Token[] {
  const sentences = splitSentences(body)
  const tokens: Token[] = []
  let m: RegExpExecArray | null
  let si = 0
  WORD_RE.lastIndex = 0
  while ((m = WORD_RE.exec(body))) {
    const start = m.index
    while (si < sentences.length - 1 && sentences[si].end <= start) si++
    tokens.push({
      index: tokens.length,
      start,
      end: start + m[0].length,
      text: m[0],
      sentence: sentences[si]?.text ?? '',
    })
  }
  return tokens
}
