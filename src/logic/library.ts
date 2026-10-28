// Kütüphane: yerleşik metinler, Vikikaynak'tan indirilen klasikler ve kullanıcının yüklediği kitaplar.

import { strFromU8, unzipSync } from 'fflate'
import { db, type BookRec } from '../db'
import { CLASSICS, type Classic } from '../content/classics'
import { GRADED } from '../content/graded'

export interface Readable {
  key: string
  title: string
  author: string
  level: string
  chapters: Array<{ title: string; body: string }>
}

/** Uzun metni ~4000 karakterlik bölümlere, paragraf sınırından böl. */
export function splitChapters(paragraphs: string[], baseTitle = 'Bölüm', size = 4000): Array<{ title: string; body: string }> {
  const out: Array<{ title: string; body: string }> = []
  let cur: string[] = []
  let len = 0
  for (const p of paragraphs) {
    if (len > 0 && len + p.length > size) {
      out.push({ title: `${baseTitle} ${out.length + 1}`, body: cur.join('\n\n') })
      cur = []
      len = 0
    }
    cur.push(p)
    len += p.length
  }
  if (cur.length) out.push({ title: `${baseTitle} ${out.length + 1}`, body: cur.join('\n\n') })
  return out
}

/** HTML'den okunacak paragrafları çıkar (lisans kutuları, tablolar, dipnot numaraları hariç). */
export function htmlToParagraphs(html: string): string[] {
  const d = new DOMParser().parseFromString(html, 'text/html')
  d.querySelectorAll('table, style, script, .licenseContainer, [class*="license"], .ws-noexport, .noprint, sup, .mw-editsection').forEach((e) =>
    e.remove(),
  )
  d.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
  const root = d.querySelector('.mw-parser-output') ?? d.body
  const blocks = [...root.querySelectorAll('p, h1, h2, h3, h4, div.poem, blockquote')]
  const out: string[] = []
  for (const el of blocks) {
    if (el.closest('div.poem') && el.tagName !== 'DIV') continue
    const clean = (el.textContent ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim()
    // Vikikaynak içindekiler satırı ("I · II · III") okunacak metin değil
    const isToc = clean.includes('·') && /^[IVXLC0-9\s·.,-]+$/.test(clean)
    if (clean && !isToc) out.push(clean)
  }
  return out
}

export async function downloadClassic(c: Classic): Promise<BookRec> {
  const url =
    'https://ru.wikisource.org/w/api.php?action=parse&prop=text&format=json&origin=*&redirects=1&disableeditsection=1&page=' +
    encodeURIComponent(c.page)
  const r = await fetch(url)
  if (!r.ok) throw new Error('Vikikaynak yanıt vermedi (' + r.status + ')')
  const j = await r.json()
  if (!j.parse) throw new Error('Metin bulunamadı: ' + c.page)
  const paragraphs = htmlToParagraphs(j.parse.text['*'])
  if (!paragraphs.length) throw new Error('Metin boş geldi')
  const rec: BookRec = {
    key: 'ws:' + c.page,
    title: c.title,
    author: c.author,
    level: c.level,
    source: 'wikisource',
    chapters: splitChapters(paragraphs),
    addedAt: Date.now(),
  }
  await db.books.put(rec)
  return rec
}

/** Yerleşik metin ya da indirilmiş/yüklenmiş kitap. */
export async function getReadable(key: string): Promise<Readable | null> {
  if (key.startsWith('g:')) {
    const g = GRADED.find((x) => x.id === key.slice(2))
    return g ? { key, title: g.title, author: 'Rusça Sözlüğüm', level: g.level, chapters: [{ title: g.title, body: g.body }] } : null
  }
  const b = await db.books.get(key)
  return b ? { key, title: b.title, author: b.author, level: b.level, chapters: b.chapters } : null
}

export const classicByKey = (key: string) => CLASSICS.find((c) => 'ws:' + c.page === key)

/* ---------- Kullanıcı kitapları ---------- */

export function parseTxt(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n|\n(?=\s{2,})/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
}

/** EPUB: OPF'deki okuma sırasına göre XHTML dosyalarını birleştir; her dosya bir bölüm. */
export function parseEpub(data: Uint8Array): { title: string; author: string; chapters: Array<{ title: string; body: string }> } {
  const files = unzipSync(data)
  const text = (name: string) => (files[name] ? strFromU8(files[name]) : '')
  const container = new DOMParser().parseFromString(text('META-INF/container.xml'), 'application/xml')
  const opfPath = container.querySelector('rootfile')?.getAttribute('full-path')
  if (!opfPath) throw new Error('Geçerli bir EPUB değil')
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : ''
  const opf = new DOMParser().parseFromString(text(opfPath), 'application/xml')
  const title = opf.getElementsByTagName('dc:title')[0]?.textContent?.trim() || 'Kitap'
  const author = opf.getElementsByTagName('dc:creator')[0]?.textContent?.trim() || ''
  const manifest = new Map<string, string>()
  for (const it of [...opf.getElementsByTagName('item')]) manifest.set(it.getAttribute('id') ?? '', it.getAttribute('href') ?? '')
  const chapters: Array<{ title: string; body: string }> = []
  for (const ref of [...opf.getElementsByTagName('itemref')]) {
    const href = manifest.get(ref.getAttribute('idref') ?? '')
    if (!href) continue
    const path = decodeURIComponent(base + href.split('#')[0])
    const html = text(path)
    if (!html) continue
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const heading = doc.querySelector('h1, h2, h3')?.textContent?.trim()
    const ps = [...doc.querySelectorAll('p, h1, h2, h3, h4')].map((p) => p.textContent?.replace(/\s+/g, ' ').trim() ?? '').filter(Boolean)
    if (ps.join('').length < 80) continue
    for (const part of splitChapters(ps, heading || `Bölüm ${chapters.length + 1}`, 8000)) chapters.push(part)
  }
  if (!chapters.length) throw new Error('EPUB içinde okunacak metin bulunamadı')
  // Uzun bölüm bölünmüşse başlıklar "X 1, X 2" olur; tek parçaysa sade başlık
  return { title, author, chapters: chapters.map((c) => ({ ...c, title: c.title.replace(/ 1$/, '') })) }
}

export async function addUserBook(file: File, level: string): Promise<BookRec> {
  let rec: BookRec
  const key = 'u:' + Date.now()
  if (/\.epub$/i.test(file.name)) {
    const e = parseEpub(new Uint8Array(await file.arrayBuffer()))
    rec = { key, title: e.title, author: e.author, level, source: 'user', chapters: e.chapters, addedAt: Date.now() }
  } else {
    const ps = parseTxt(await file.text())
    if (!ps.length) throw new Error('Dosya boş')
    rec = { key, title: file.name.replace(/\.[^.]+$/, ''), author: '', level, source: 'user', chapters: splitChapters(ps), addedAt: Date.now() }
  }
  await db.books.put(rec)
  return rec
}

export async function addPastedBook(title: string, body: string, level: string): Promise<BookRec> {
  const rec: BookRec = {
    key: 'u:' + Date.now(),
    title: title.trim() || 'Metin',
    author: '',
    level,
    source: 'user',
    chapters: splitChapters(parseTxt(body)),
    addedAt: Date.now(),
  }
  await db.books.put(rec)
  return rec
}
