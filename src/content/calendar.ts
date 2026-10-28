// Çalışma planındaki 2 haftalık tema takvimi (Döngü 1 ve 2).

export interface ThemeBlock {
  theme: string
  /** Tema numarası (0 = tekrar haftası) */
  no: number
  cycle: 1 | 2
  start: string
  end: string
}

const T = [
  'Ben ve hayatım',
  'İş ve meslek',
  'Ev, şehir, günlük yaşam',
  'Yemek, alışveriş, para',
  'Sağlık ve beden',
  'Seyahat ve ulaşım',
  'Eğitim ve dil öğrenme',
  'Boş zaman, spor, hobiler',
  'Medya ve teknoloji',
  'Kültür ve sanat',
  'Doğa, iklim, ekoloji',
  'Toplum, aile, gelenekler',
]

const b = (no: number, cycle: 1 | 2, start: string, end: string): ThemeBlock => ({
  theme: no ? T[no - 1] : 'Tekrar haftası (1–4. temalar)',
  no,
  cycle,
  start,
  end,
})

export const CALENDAR: ThemeBlock[] = [
  b(1, 1, '2026-11-02', '2026-11-15'),
  b(2, 1, '2026-11-16', '2026-11-29'),
  b(3, 1, '2026-11-30', '2026-12-13'),
  b(4, 1, '2026-12-14', '2026-12-27'),
  b(0, 1, '2026-12-28', '2027-01-03'),
  b(5, 1, '2027-01-04', '2027-01-17'),
  b(6, 1, '2027-01-18', '2027-01-31'),
  b(7, 1, '2027-02-01', '2027-02-14'),
  b(8, 1, '2027-02-15', '2027-02-28'),
  b(9, 1, '2027-03-01', '2027-03-14'),
  b(10, 1, '2027-03-15', '2027-03-28'),
  b(11, 1, '2027-03-29', '2027-04-11'),
  b(12, 1, '2027-04-12', '2027-04-25'),
  b(1, 2, '2027-04-26', '2027-05-09'),
  b(2, 2, '2027-05-10', '2027-05-23'),
  b(3, 2, '2027-05-24', '2027-06-06'),
  b(4, 2, '2027-06-07', '2027-06-20'),
  b(5, 2, '2027-06-21', '2027-07-04'),
  b(6, 2, '2027-07-05', '2027-07-18'),
  b(7, 2, '2027-07-19', '2027-08-01'),
  b(8, 2, '2027-08-02', '2027-08-15'),
  b(9, 2, '2027-08-16', '2027-08-29'),
  b(10, 2, '2027-08-30', '2027-09-12'),
  b(11, 2, '2027-09-13', '2027-09-26'),
  b(12, 2, '2027-09-27', '2027-10-10'),
]

const day = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

/** Bugünün teması; takvim başlamadıysa ilk blok "yakında" olarak döner. */
export function currentBlock(now = new Date()): { block: ThemeBlock; upcoming: boolean } | null {
  const today = day(now)
  const cur = CALENDAR.find((x) => x.start <= today && today <= x.end)
  if (cur) return { block: cur, upcoming: false }
  const next = CALENDAR.find((x) => x.start > today)
  return next ? { block: next, upcoming: true } : null
}

export const fmtRange = (b: ThemeBlock) => {
  const f = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  return `${f(b.start)} – ${f(b.end)}`
}
