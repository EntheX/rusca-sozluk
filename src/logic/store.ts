// Sözlüğe yazma, metin silme, istatistiklerin yeniden hesaplanması, yedekleme.

import { db, getFormChoices, getThemes, lemmaKey, setSetting, type Choice, type LemmaRec, type TextRec, type UsageRec } from '../db'
import type { AnalyzedToken } from './analyze'
import { POS_LABELS } from '../morph/tags'

/** Lemma kayıtlarının sayaçlarını kullanım kayıtlarından yeniden üret. */
export async function recomputeLemmas(keys: Iterable<string>) {
  for (const key of new Set(keys)) {
    const lemma = await db.lemmas.get(key)
    if (!lemma) continue
    const us = await db.usages.where('lemmaId').equals(key).toArray()
    const themes = [...new Set(us.map((u) => u.theme).filter(Boolean))]
    const dates = us.map((u) => u.date)
    await db.lemmas.put({
      ...lemma,
      useCount: us.length,
      themes,
      firstUsed: dates.length ? Math.min(...dates) : lemma.firstUsed,
      lastUsed: dates.length ? Math.max(...dates) : lemma.lastUsed,
    })
  }
}

/** Bu metin dışındaki kullanımlara göre sözlükte "var" sayılan lemma anahtarları. */
export async function knownKeysExcluding(textId?: number): Promise<Set<string>> {
  const active = await db.lemmas.where('useCount').above(0).toArray()
  const known = new Set(active.map((l) => l.id))
  if (textId != null) {
    const own = await db.usages.where('textId').equals(textId).toArray()
    const ownCount = new Map<string, number>()
    for (const u of own) ownCount.set(u.lemmaId, (ownCount.get(u.lemmaId) ?? 0) + 1)
    for (const l of active) if ((ownCount.get(l.id) ?? 0) >= l.useCount) known.delete(l.id)
  }
  return known
}

export interface CommitResult {
  textId: number
  newLemmas: string[]
  usageCount: number
}

/**
 * Metni kaydet ve sözlüğe yaz. Metin daha önce yazıldıysa eski kullanımları silinip yeniden yazılır,
 * böylece düzenleme sonrası sayılar her zaman doğrudur.
 */
export async function commitText(
  text: Omit<TextRec, 'id' | 'status' | 'choices'> & { id?: number },
  tokens: AnalyzedToken[],
  pendingMeanings: Record<string, string[]>,
  userChoices: Record<string, Choice>,
): Promise<CommitResult> {
  return db.transaction('rw', [db.texts, db.lemmas, db.usages, db.settings], async () => {
    const now = Date.now()
    const choices: Record<string, Choice> = {}
    for (const t of tokens) {
      // Elle yapılan seçimler ve kırmızı/sarı kelimeler için kaydedilen seçimler metne yazılır.
      if (t.choice && (t.resolvedBy === 'text' || t.status === 'ambiguous')) choices[t.form] = t.choice
    }

    const rec: TextRec = {
      ...(text as TextRec),
      updatedAt: now,
      status: 'committed',
      choices,
    }
    const textId = (await db.texts.put(rec)) as number

    const old = await db.usages.where('textId').equals(textId).toArray()
    const affected = new Set(old.map((u) => u.lemmaId))
    await db.usages.where('textId').equals(textId).delete()

    const newLemmas: string[] = []
    const usages: UsageRec[] = []
    for (const t of tokens) {
      const c = t.choice
      if (!c || c.kind !== 'lemma' || t.status === 'skipped') continue
      const key = lemmaKey(c.lemma, c.pos)
      affected.add(key)
      let lemma = await db.lemmas.get(key)
      if (!lemma) {
        lemma = {
          id: key,
          lemma: c.lemma,
          pos: c.pos,
          meanings: [],
          themes: [],
          firstUsed: rec.createdAt,
          lastUsed: rec.createdAt,
          useCount: 0,
          custom: !t.analysis.known || undefined,
          createdAt: now,
        }
        await db.lemmas.put(lemma)
      }
      if (lemma.useCount === 0 && !newLemmas.includes(key) && !old.some((u) => u.lemmaId === key)) newLemmas.push(key)
      usages.push({
        lemmaId: key,
        textId,
        form: t.form,
        grammemes: c.grammemes,
        sentence: t.sentence,
        tokenIndex: t.index,
        theme: rec.theme,
        date: rec.createdAt,
      })
    }
    await db.usages.bulkAdd(usages)

    for (const [key, ms] of Object.entries(pendingMeanings)) {
      const l = await db.lemmas.get(key)
      if (!l) continue
      const merged = [...l.meanings]
      for (const m of ms.map((x) => x.trim()).filter(Boolean)) if (!merged.includes(m)) merged.push(m)
      await db.lemmas.update(key, { meanings: merged })
    }

    await recomputeLemmas(affected)

    // Belirsiz formlar için kullanıcı seçimlerini hatırla.
    if (Object.keys(userChoices).length) {
      const fc = await getFormChoices()
      for (const [form, c] of Object.entries(userChoices)) if (c.kind === 'lemma') fc[form] = c
      await setSetting('formChoices', fc)
    }

    return { textId, newLemmas, usageCount: usages.length }
  })
}

/** Henüz sözlüğe yazılmamış taslak olarak kaydet. */
export async function saveDraft(text: Omit<TextRec, 'id' | 'status' | 'choices'> & { id?: number }): Promise<number> {
  const existing = text.id != null ? await db.texts.get(text.id) : undefined
  const rec: TextRec = {
    ...(text as TextRec),
    updatedAt: Date.now(),
    status: existing?.status ?? 'draft',
    choices: existing?.choices ?? {},
  }
  return (await db.texts.put(rec)) as number
}

export async function deleteText(id: number) {
  await db.transaction('rw', [db.texts, db.lemmas, db.usages], async () => {
    const us = await db.usages.where('textId').equals(id).toArray()
    await db.usages.where('textId').equals(id).delete()
    await db.texts.delete(id)
    await recomputeLemmas(us.map((u) => u.lemmaId))
  })
}

export async function setMeanings(key: string, meanings: string[]) {
  await db.lemmas.update(key, { meanings: meanings.map((m) => m.trim()).filter(Boolean) })
}

/** Tema adını değiştir: metinler, kullanımlar ve lemmalar birlikte güncellenir. */
export async function renameTheme(from: string, to: string) {
  await db.transaction('rw', [db.texts, db.lemmas, db.usages, db.settings], async () => {
    const themes = await getThemes()
    await setSetting('themes', themes.map((t) => (t === from ? to : t)))
    await db.texts.where('theme').equals(from).modify({ theme: to })
    const us = await db.usages.filter((u) => u.theme === from).toArray()
    for (const u of us) await db.usages.update(u.id!, { theme: to })
    await recomputeLemmas(us.map((u) => u.lemmaId))
  })
}

/* ---------- Yedekleme ---------- */

export interface Backup {
  app: 'rusca-sozluk'
  version: 1
  exportedAt: string
  texts: TextRec[]
  lemmas: LemmaRec[]
  usages: UsageRec[]
  settings: Array<{ key: string; value: unknown }>
}

export async function exportBackup(): Promise<Backup> {
  return {
    app: 'rusca-sozluk',
    version: 1,
    exportedAt: new Date().toISOString(),
    texts: await db.texts.toArray(),
    lemmas: await db.lemmas.toArray(),
    usages: await db.usages.toArray(),
    settings: await db.settings.toArray(),
  }
}

/** Yedeği geri yükler; mevcut verinin TAMAMI yedektekiyle değiştirilir. */
export async function importBackup(data: unknown) {
  const b = data as Backup
  if (!b || b.app !== 'rusca-sozluk' || !Array.isArray(b.texts) || !Array.isArray(b.lemmas) || !Array.isArray(b.usages)) {
    throw new Error('Bu dosya bir Rusça Sözlük yedeği değil.')
  }
  await db.transaction('rw', [db.texts, db.lemmas, db.usages, db.settings], async () => {
    await Promise.all([db.texts.clear(), db.lemmas.clear(), db.usages.clear(), db.settings.clear()])
    await db.texts.bulkPut(b.texts)
    await db.lemmas.bulkPut(b.lemmas)
    await db.usages.bulkPut(b.usages)
    await db.settings.bulkPut(b.settings ?? [])
  })
}

function csvCell(v: string | number): string {
  const s = String(v)
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

const day = (t: number) => new Date(t).toISOString().slice(0, 10)

/** Sözlüğü CSV olarak (noktalı virgül ayraçlı, Türkçe Excel ile uyumlu) üretir. */
export async function exportCsv(): Promise<string> {
  const lemmas = (await db.lemmas.where('useCount').above(0).toArray()).sort((a, b) => a.lemma.localeCompare(b.lemma, 'ru'))
  const usages = await db.usages.toArray()
  const forms = new Map<string, Set<string>>()
  for (const u of usages) {
    if (!forms.has(u.lemmaId)) forms.set(u.lemmaId, new Set())
    forms.get(u.lemmaId)!.add(u.form)
  }
  const head = ['lemma', 'tür', 'anlamlar', 'kullanım sayısı', 'ilk kullanım', 'son kullanım', 'temalar', 'formlar']
  const rows = lemmas.map((l) => [
    l.lemma,
    POS_LABELS[l.pos],
    l.meanings.join(', '),
    l.useCount,
    day(l.firstUsed),
    day(l.lastUsed),
    l.themes.join(', '),
    [...(forms.get(l.id) ?? [])].join(', '),
  ])
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
