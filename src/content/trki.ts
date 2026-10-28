// ТРКИ-2 «Письмо» alt testine benzer yazma görevleri (resmi sınav metinleri değildir; biçim ve kapsam benzer).

export type TaskKind = 'letter' | 'official' | 'essay'

export interface WritingTask {
  id: string
  kind: TaskKind
  title: string
  /** Rusça görev metni */
  ru: string
  /** Türkçe kısa açıklama */
  tr: string
  /** Mutlaka değinilecek noktalar (Rusça) */
  points: string[]
  minutes: number
  words: [number, number]
}

export const KIND_LABELS: Record<TaskKind, string> = {
  letter: 'Gayriresmî mektup',
  official: 'Resmî mektup / dilekçe',
  essay: 'Görüş yazısı',
}

export const TRKI_TASKS: WritingTask[] = [
  {
    id: 'l-study',
    kind: 'letter',
    title: 'Türkiye\'de okumak isteyen arkadaşına mektup',
    ru: 'Ваш друг из России хочет поступить в турецкий университет. Напишите ему письмо и помогите принять решение.',
    tr: 'Rus arkadaşın Türkiye\'de üniversite okumak istiyor. Ona mektup yaz, karar vermesine yardım et.',
    points: ['как поступить в университет', 'сколько стоит учёба и жизнь', 'как живут студенты', 'ваш совет'],
    minutes: 25,
    words: [150, 200],
  },
  {
    id: 'l-job',
    kind: 'letter',
    title: 'İki iş arasında kalan arkadaşına tavsiye',
    ru: 'Ваша подруга не может выбрать между хорошо оплачиваемой, но скучной работой и интересной работой с маленькой зарплатой. Напишите ей письмо с советом.',
    tr: 'Arkadaşın iyi maaşlı ama sıkıcı bir işle az maaşlı ama ilginç bir iş arasında kaldı. Tavsiye mektubu yaz.',
    points: ['поддержите подругу', 'плюсы и минусы каждой работы', 'ваш собственный опыт', 'что бы вы сделали на её месте'],
    minutes: 25,
    words: [150, 200],
  },
  {
    id: 'l-language',
    kind: 'letter',
    title: 'Dil öğrenemeyen arkadaşına mektup',
    ru: 'Ваш друг пишет, что никак не может выучить иностранный язык и хочет бросить. Ответьте ему: поделитесь своим опытом изучения русского языка.',
    tr: 'Arkadaşın yabancı dil öğrenemediğini ve bırakmak istediğini yazıyor. Rusça öğrenme deneyimini anlatarak cevap ver.',
    points: ['почему не надо бросать', 'какие трудности были у вас', 'какие методы вам помогли', 'конкретный план для друга'],
    minutes: 25,
    words: [150, 200],
  },
  {
    id: 'l-trip',
    kind: 'letter',
    title: 'Bir yolculuğu anlatan mektup',
    ru: 'Напишите письмо другу о самом интересном путешествии в вашей жизни. Посоветуйте, стоит ли ему поехать туда же.',
    tr: 'Arkadaşına hayatındaki en ilginç yolculuğu anlat; oraya gitmeye değer mi, tavsiyeni yaz.',
    points: ['куда и с кем вы ездили', 'что вам больше всего запомнилось', 'что было трудно или неожиданно', 'ваш совет'],
    minutes: 25,
    words: [150, 200],
  },
  {
    id: 'o-internship',
    kind: 'official',
    title: 'Petersburg\'da bir laboratuvara staj başvurusu',
    ru: 'Вы хотите пройти стажировку в зуботехнической лаборатории в Санкт-Петербурге. Напишите письмо руководителю лаборатории.',
    tr: 'Petersburg\'daki bir diş laboratuvarında staj yapmak istiyorsun. Laboratuvar yöneticisine resmî mektup yaz.',
    points: ['представьтесь', 'ваше образование и опыт работы', 'почему именно эта лаборатория', 'сроки и ваша просьба'],
    minutes: 20,
    words: [100, 150],
  },
  {
    id: 'o-dorm',
    kind: 'official',
    title: 'Dekanlığa yurt dilekçesi',
    ru: 'Напишите заявление в деканат с просьбой предоставить вам место в общежитии.',
    tr: 'Dekanlığa yurtta yer talep eden bir dilekçe yaz.',
    points: ['кому и от кого', 'ваша просьба', 'причина', 'дата и подпись'],
    minutes: 15,
    words: [60, 100],
  },
  {
    id: 'o-complaint',
    kind: 'official',
    title: 'İnternet mağazasına şikâyet',
    ru: 'Вы заказали товар в интернет-магазине, но он пришёл повреждённым и с опозданием. Напишите жалобу в службу поддержки.',
    tr: 'İnternetten aldığın ürün hasarlı ve geç geldi. Müşteri hizmetlerine şikâyet yaz.',
    points: ['что и когда вы заказали', 'в чём проблема', 'что вы уже сделали', 'чего вы требуете'],
    minutes: 20,
    words: [100, 150],
  },
  {
    id: 'e-ai',
    kind: 'essay',
    title: 'Yapay zekâ varken dil öğrenmek gerekli mi?',
    ru: 'Напишите сочинение на тему: «Нужно ли изучать иностранные языки, если есть переводчики на основе искусственного интеллекта?»',
    tr: '«Yapay zekâ çevirmenleri varken yabancı dil öğrenmek gerekli mi?» konulu görüş yazısı.',
    points: ['введение: актуальность темы', 'аргументы «за»', 'аргументы «против»', 'ваше мнение и вывод'],
    minutes: 30,
    words: [200, 250],
  },
  {
    id: 'e-city',
    kind: 'essay',
    title: 'Büyük şehir mi, küçük şehir mi?',
    ru: 'Напишите сочинение на тему: «Где лучше жить: в большом городе или в маленьком?»',
    tr: '«Büyük şehirde mi yaşamak daha iyi, küçük şehirde mi?» konulu görüş yazısı.',
    points: ['преимущества большого города', 'преимущества маленького города', 'пример из вашей жизни', 'вывод'],
    minutes: 30,
    words: [200, 250],
  },
  {
    id: 'e-money',
    kind: 'essay',
    title: 'İşte para mı, keyif mi?',
    ru: 'Напишите сочинение на тему: «Что важнее в работе: деньги или удовольствие?»',
    tr: '«İşte hangisi daha önemli: para mı, keyif mi?» konulu görüş yazısı.',
    points: ['почему люди выбирают деньги', 'почему важно любить свою работу', 'можно ли совместить одно и другое', 'ваше мнение'],
    minutes: 30,
    words: [200, 250],
  },
  {
    id: 'e-family',
    kind: 'essay',
    title: 'Modern insanın hayatında ailenin rolü',
    ru: 'Напишите сочинение на тему: «Роль семьи в жизни современного человека».',
    tr: '«Modern insanın hayatında ailenin rolü» konulu görüş yazısı.',
    points: ['что изменилось в семье за последние 50 лет', 'что осталось неизменным', 'семья в Турции и в России', 'вывод'],
    minutes: 30,
    words: [200, 250],
  },
  {
    id: 'e-profession',
    kind: 'essay',
    title: 'Öğrenci dergisi için mesleğini tanıt',
    ru: 'Студенческий журнал попросил вас написать статью о вашей профессии для молодых людей, которые выбирают, кем стать.',
    tr: 'Bir öğrenci dergisi, meslek seçen gençler için mesleğini tanıtan bir yazı istiyor.',
    points: ['чем занимается зубной техник', 'какие качества нужны', 'плюсы и минусы профессии', 'совет тем, кто выбирает профессию'],
    minutes: 30,
    words: [200, 250],
  },
]

export const taskById = (id: string) => TRKI_TASKS.find((t) => t.id === id)

export const TRKI_THEME = 'ТРКИ-2 yazma'
