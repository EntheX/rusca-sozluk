// Telifi bitmiş klasikler: metin ilk açılışta Vikikaynak'tan (ru.wikisource.org) indirilir ve cihaza kaydedilir.
import type { Level } from './graded'

export interface Classic {
  /** Vikikaynak sayfa adı */
  page: string
  title: string
  author: string
  level: Level
  note: string
}

export const CLASSICS: Classic[] = [
  { page: 'Лев и собачка (Толстой)', title: 'Лев и собачка', author: 'Л. Н. Толстой', level: 'B1', note: 'Çocuklar için yazılmış kısa öykü, ~300 kelime' },
  { page: 'Прыжок (Толстой)', title: 'Прыжок', author: 'Л. Н. Толстой', level: 'B1', note: 'Gemide geçen kısa öykü, ~500 kelime' },
  { page: 'Кавказский пленник (Толстой)', title: 'Кавказский пленник', author: 'Л. Н. Толстой', level: 'B1', note: 'Sade dille yazılmış uzun öykü, ~6.500 kelime' },
  {
    page: 'Толстый и тонкий (Чехов)/ПСС 1975 (ВТ, с ударениями)',
    title: 'Толстый и тонкий',
    author: 'А. П. Чехов',
    level: 'B2',
    note: 'Vurgu işaretli baskı, ~650 kelime',
  },
  { page: 'Смерть чиновника (Чехов)', title: 'Смерть чиновника', author: 'А. П. Чехов', level: 'B2', note: 'Kısa öykü, ~750 kelime' },
  { page: 'Хамелеон (Чехов)/Вариант ПСС Чехова 1974—1982', title: 'Хамелеон', author: 'А. П. Чехов', level: 'B2', note: 'Kısa öykü, ~900 kelime' },
  { page: 'Лошадиная фамилия (Чехов)', title: 'Лошадиная фамилия', author: 'А. П. Чехов', level: 'B2', note: 'Kısa öykü, ~950 kelime' },
  { page: 'Злоумышленник (Чехов)', title: 'Злоумышленник', author: 'А. П. Чехов', level: 'B2', note: 'Diyalog ağırlıklı kısa öykü, ~1.000 kelime' },
  { page: 'Ванька (Чехов, 1886)', title: 'Ванька', author: 'А. П. Чехов', level: 'B2', note: 'Kısa öykü, ~1.100 kelime' },
  { page: 'Каштанка (Чехов)', title: 'Каштанка', author: 'А. П. Чехов', level: 'B2', note: 'Bir köpeğin hikâyesi, ~5.500 kelime' },
  {
    page: 'Повести покойного Ивана Петровича Белкина (Пушкин)/Метель',
    title: 'Метель',
    author: 'А. С. Пушкин',
    level: 'C1',
    note: "«Belkin'in Öyküleri»nden, ~3.500 kelime",
  },
]
