// Türkçe etiketler ve OpenCorpora → uygulama türü eşlemesi.

export type PosCode =
  | 'verb'
  | 'noun'
  | 'adj'
  | 'adv'
  | 'pron'
  | 'num'
  | 'prep'
  | 'conj'
  | 'part'
  | 'other'

export const POS_LABELS: Record<PosCode, string> = {
  verb: 'Fiil',
  noun: 'İsim',
  adj: 'Sıfat',
  adv: 'Zarf',
  pron: 'Zamir',
  num: 'Sayı',
  prep: 'Edat',
  conj: 'Bağlaç',
  part: 'Küçük kelime',
  other: 'Diğer',
}

export const POS_ORDER: PosCode[] = ['noun', 'verb', 'adj', 'adv', 'pron', 'num', 'prep', 'conj', 'part', 'other']

/** Küçük (işlev) kelime sınıfları: aynı lemmanın bu türlerdeki çözümlemeleri tek kelime sayılır. */
export const MINOR_POS: ReadonlySet<PosCode> = new Set<PosCode>(['adv', 'pron', 'prep', 'conj', 'part', 'other'])

export function posFromGrammemes(g: readonly string[]): PosCode {
  const post = g[0]
  switch (post) {
    case 'NOUN':
      return 'noun'
    case 'ADJF':
      if (g.includes('Apro')) return 'pron'
      if (g.includes('Anum')) return 'num'
      return 'adj'
    case 'ADJS':
    case 'COMP':
      return 'adj'
    case 'VERB':
    case 'INFN':
    case 'PRTF':
    case 'PRTS':
    case 'GRND':
      return 'verb'
    case 'NUMR':
      return 'num'
    case 'ADVB':
    case 'PRED':
      return 'adv'
    case 'NPRO':
      return 'pron'
    case 'PREP':
      return 'prep'
    case 'CONJ':
      return 'conj'
    case 'PRCL':
    case 'INTJ':
      return 'part'
    default:
      return 'other'
  }
}

const FORM_TYPE: Record<string, string> = {
  INFN: 'mastar',
  PRTF: 'ortaç',
  PRTS: 'kısa ortaç',
  GRND: 'zarf-fiil (деепричастие)',
  ADJS: 'kısa sıfat',
  COMP: 'karşılaştırma derecesi',
  PRED: 'yüklem zarfı',
  INTJ: 'ünlem',
}

// Gösterim sırası: biçim türü, zaman, şahıs, cins, sayı, hal, görünüş, çatı, kip
const GROUPS: Array<Record<string, string>> = [
  FORM_TYPE,
  { past: 'geçmiş zaman', pres: 'şimdiki zaman', futr: 'gelecek zaman' },
  { '1per': '1. şahıs', '2per': '2. şahıs', '3per': '3. şahıs' },
  { masc: 'eril', femn: 'dişil', neut: 'nötr', 'Ms-f': 'ortak cins' },
  { sing: 'tekil', plur: 'çoğul' },
  {
    nomn: 'yalın hal (И.п.)',
    gent: 'ilgi hali (Р.п.)',
    gen1: 'ilgi hali (Р.п.)',
    gen2: 'ilgi hali 2 (Р.п., -у)',
    datv: 'yönelme hali (Д.п.)',
    accs: 'belirtme hali (В.п.)',
    acc2: 'belirtme hali 2 (В.п.)',
    ablt: 'araç hali (Т.п.)',
    loct: 'bulunma hali (П.п.)',
    loc1: 'bulunma hali (П.п.)',
    loc2: 'bulunma hali 2 (П.п., -у)',
    voct: 'seslenme hali',
  },
  { perf: 'tamamlanmış görünüş (СВ)', impf: 'tamamlanmamış görünüş (НСВ)' },
  { actv: 'etken', pssv: 'edilgen' },
  { impr: 'emir kipi' },
]

/** "VERB,perf,intr masc,sing,past,indc" gibi etiketleri okunur Türkçeye çevirir. */
export function describeGrammemes(g: readonly string[]): string[] {
  const out: string[] = []
  for (const group of GROUPS) {
    for (const gr of g) {
      const label = group[gr]
      if (label && !out.includes(label)) out.push(label)
    }
  }
  return out
}

/** Özel isim etiketleri: lemma büyük harfle yazılır. */
export const PROPER = ['Geox', 'Name', 'Surn', 'Patr', 'Orgn', 'Trad']
