// Rusça öğrenenler için ücretsiz dinlenebilen podcastler (bağlantılar; dinlemek için internet gerekir).
import type { Level } from './graded'

export interface Podcast {
  id: string
  title: string
  level: Level
  levelTo?: Level
  url: string
  note: string
}

export const PODCASTS: Podcast[] = [
  { id: 'rme', title: 'Russian Made Easy', level: 'A1', url: 'https://russianmadeeasy.com/', note: 'Sıfırdan başlayanlar için, İngilizce açıklamalı.' },
  { id: 'speaking', title: 'Speaking Russian', level: 'A1', levelTo: 'A2', url: 'https://open.spotify.com/show/1jUHSaIjsJyejFWHABWS85', note: 'Elvira Ivanova. Yavaş, kısa bölümler.' },
  { id: 'slow', title: 'Slow Russian', level: 'A2', levelTo: 'B1', url: 'https://realrussianclub.com/slowrussianpodcast/', note: 'Daria Molchanova. Yavaş ve net Rusça, günlük konular.' },
  { id: 'max', title: 'Learn Russian with Max', level: 'A2', levelTo: 'B2', url: 'https://www.russianwithmax.com/category/russian-podcast/', note: 'Anlaşılır Rusça, hayat ve kültür üzerine.' },
  { id: 'rpeu', title: 'Russian Podcast', level: 'B1', url: 'https://russianpodcast.eu/', note: 'Orta seviye; ses ücretsiz, metinler ücretli.' },
  { id: 'progress', title: 'Russian Progress', level: 'B1', levelTo: 'C1', url: 'https://www.youtube.com/results?search_query=Russian+Progress+podcast', note: 'Artem Nazarov. Tamamen Rusça, doğal hızda.' },
  { id: 'lampa', title: 'Зелёная лампа', level: 'B2', url: 'https://lampa.fm/', note: 'Üst-orta seviye, edebiyat ve kültür.' },
  { id: 'sbs', title: 'SBS Русский', level: 'C1', url: 'https://www.sbs.com.au/language/russian', note: 'Haber ve röportajlar, anadili hızında.' },
  { id: 'arzamas', title: 'Arzamas', level: 'C1', url: 'https://arzamas.academy/', note: 'Tarih, edebiyat ve sanat üzerine dersler.' },
  { id: 'postnauka', title: 'ПостНаука', level: 'C1', url: 'https://postnauka.ru/', note: 'Bilim insanlarıyla popüler bilim.' },
]
