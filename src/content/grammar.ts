// Gramer konuları: B1 → B2 (ТРКИ-2 gramer kapsamına göre). Açıklamalar Türkçe, örnekler Rusça.

export type DrillKind = 'form' | 'aspect'

export interface GrammarTable {
  cols: string[]
  rows: string[][]
}

export interface GrammarSection {
  h: string
  /** Türkçe açıklama; paragraflar boş satırla ayrılır */
  text?: string
  table?: GrammarTable
  /** [Rusça, Türkçe] */
  examples?: Array<[string, string]>
}

export interface GrammarTopic {
  id: string
  title: string
  ru: string
  level: 'B1' | 'B1–B2' | 'B2'
  summary: string
  sections: GrammarSection[]
  /** Hata defterindeki hangi hata türleri bu konuya bağlı */
  errorTypes: string[]
  /** Otomatik alıştırma: hangi kelimeler soru olur (grammem filtresi) */
  drill?: { kind: DrillKind; any?: string[]; all?: string[]; none?: string[]; lemmaRe?: string; prompt: string }
  /** Alıştırma için ek örnek cümleler (kendi metinlerin ve okuma metinlerine ek) */
  bank?: string[]
  /** Yazıda kullanımı saymak için (en olası çözümlemenin etiketleri) */
  detect?: { any?: string[]; lemmas?: string[] }
}

export const GRAMMAR: GrammarTopic[] = [
  {
    id: 'haller',
    title: 'Hâller ve edatlar',
    ru: 'Падежи и предлоги',
    level: 'B1',
    summary: 'Rusçadaki 6 hâl, hangi soruya cevap verdiği ve hangi edatlarla kullanıldığı. Hatalarının çoğu burada çıkar.',
    sections: [
      {
        h: 'Altı hâl',
        table: {
          cols: ['Hâl', 'Soru', 'Ne zaman', 'Sık edatlar'],
          rows: [
            ['Yalın (И.п.)', 'кто? что?', 'özne', '—'],
            ['İlgi (Р.п.)', 'кого? чего?', 'iyelik, «yok», miktar, 5+ sayı', 'у, без, для, до, из, от, после, около, кроме'],
            ['Yönelme (Д.п.)', 'кому? чему?', 'kime verilir, yaş, «gerek/hoşuma gidiyor»', 'к, по'],
            ['Belirtme (В.п.)', 'кого? что?', 'nesne, yöne hareket (в/на)', 'в, на (nereye?), через, про'],
            ['Araç (Т.п.)', 'кем? чем?', 'araç, «olmak» (стать, быть), ile birlikte', 'с, над, под, перед, за, между'],
            ['Bulunma (П.п.)', 'о ком? о чём? где?', 'yer (в/на), hakkında (о)', 'в, на (nerede?), о'],
          ],
        },
      },
      {
        h: 'Tekil isim sonları (özet)',
        table: {
          cols: ['Hâl', 'eril (стол)', 'nötr (окно)', 'dişil (книга)', 'dişil -ь (дверь)'],
          rows: [
            ['Р.п.', 'стола', 'окна', 'книги', 'двери'],
            ['Д.п.', 'столу', 'окну', 'книге', 'двери'],
            ['В.п.', 'стол (canlı: брата)', 'окно', 'книгу', 'дверь'],
            ['Т.п.', 'столом', 'окном', 'книгой', 'дверью'],
            ['П.п.', 'о столе', 'об окне', 'о книге', 'о двери'],
          ],
        },
        text: 'Çoğulda ilgi hâli en zorudur: столов, окон, книг, дверей. Canlı erillerde ve tüm canlı çoğullarda belirtme = ilgi (вижу брата, вижу друзей).',
      },
      {
        h: 'Türk öğrencilerin tipik hataları',
        text: '«Yok» ve «gerek»: у меня нет времени (ilgi), мне нужна помощь (yönelme). Türkçedeki -de/-e ayrımı в/на + bulunma/belirtme ile kurulur: я в Москве (neredeyim) ama я еду в Москву (nereye).\n\nбыть/стать ile meslek araç hâlinde: он стал врачом, я работаю техником.',
        examples: [
          ['Я живу в Измире, но часто езжу в Стамбул.', "İzmir'de yaşıyorum ama sık sık İstanbul'a giderim."],
          ['У моего брата нет машины.', 'Ağabeyimin arabası yok.'],
          ['Мне нравится работать с керамикой.', 'Seramikle çalışmak hoşuma gidiyor.'],
          ['После работы я встречаюсь с друзьями.', 'İşten sonra arkadaşlarımla buluşurum.'],
        ],
      },
    ],
    errorTypes: ['hâl eki', 'edat', 'uyum'],
    drill: { kind: 'form', any: ['NOUN'], none: ['nomn'], prompt: 'Parantezdeki ismi cümleye uyan hâle koy.' },
  },
  {
    id: 'gorunus',
    title: 'Fiil görünüşü',
    ru: 'Вид глагола',
    level: 'B1',
    summary: 'Tamamlanmış (СВ) ve tamamlanmamış (НСВ) fiil: hangisi ne zaman? Rusçanın en önemli konusu.',
    sections: [
      {
        h: 'Temel kural',
        text: 'НСВ (tamamlanmamış): süreç, tekrar, alışkanlık, genel bilgi. СВ (tamamlanmış): sonuç, tek seferlik bitmiş eylem.\n\nŞimdiki zaman yalnızca НСВ ile kurulur. СВ fiilin çekimli hali geleceği anlatır (я сделаю = yapacağım).',
        table: {
          cols: ['Durum', 'НСВ', 'СВ'],
          rows: [
            ['süreç / sonuç', 'Я долго писал письмо.', 'Я написал письмо.'],
            ['tekrar / tek sefer', 'Каждый день я покупаю хлеб.', 'Вчера я купил хлеб.'],
            ['gelecek', 'Я буду читать весь вечер.', 'Я прочитаю книгу к пятнице.'],
            ['emir (genel / somut)', 'Садитесь, пожалуйста!', 'Сядьте здесь.'],
            ['olumsuz emir', 'Не забывай!', '—'],
          ],
        },
      },
      {
        h: 'İşaret kelimeleri',
        text: 'НСВ ister: всегда, часто, обычно, каждый день, долго, иногда, начинать/кончать/продолжать + mastar, нельзя (yasak).\n\nСВ ister: вдруг, сразу, наконец, уже (sonuç), за + süre (за час написал).',
        examples: [
          ['Я начал учить русский в 2019 году.', "2019'da Rusça öğrenmeye başladım."],
          ['Он вдруг понял, что ошибся.', 'Birden hata yaptığını anladı.'],
          ['Коронку изготавливают за три дня.', 'Kron üç günde yapılır (genel süreç).'],
          ['Я изготовил коронку за три дня.', 'Kronu üç günde yaptım (sonuç).'],
        ],
      },
    ],
    errorTypes: ['fiil görünüşü'],
    drill: { kind: 'aspect', any: ['VERB', 'INFN'], prompt: 'Cümlede hangi görünüş kullanılmış? Doğru fiili seç.' },
  },
  {
    id: 'hareket',
    title: 'Hareket fiilleri ve önekler',
    ru: 'Глаголы движения',
    level: 'B1–B2',
    summary: 'идти/ходить, ехать/ездить ve при-, у-, в-, вы-, пере- gibi öneklerle anlam değişimi.',
    sections: [
      {
        h: 'Tek yön / çok yön',
        table: {
          cols: ['Tek yön (şu an, bir kez)', 'Çok yön (gidip gelme, alışkanlık)', 'Anlam'],
          rows: [
            ['идти', 'ходить', 'yürüyerek gitmek'],
            ['ехать', 'ездить', 'araçla gitmek'],
            ['лететь', 'летать', 'uçmak'],
            ['плыть', 'плавать', 'yüzmek'],
            ['нести', 'носить', 'taşımak (elde)'],
            ['вести', 'водить', 'götürmek (yürüyerek)'],
            ['везти', 'возить', 'götürmek (araçla)'],
            ['бежать', 'бегать', 'koşmak'],
          ],
        },
        text: 'Я иду на работу (şu an yoldayım). Я хожу на работу пешком (genelde). Вчера я ходил в кино = gittim ve döndüm.',
      },
      {
        h: 'Önekler',
        table: {
          cols: ['Önek', 'Anlam', 'Örnek'],
          rows: [
            ['при-', 'varmak', 'Он пришёл домой.'],
            ['у-', 'ayrılmak', 'Она ушла с работы в шесть.'],
            ['в- / во-', 'içeri girmek', 'Врач вошёл в кабинет.'],
            ['вы-', 'dışarı çıkmak', 'Я вышел из автобуса.'],
            ['пере-', 'karşıya geçmek, taşınmak', 'Мы переехали в новый дом.'],
            ['под-', 'yaklaşmak', 'Он подошёл к окну.'],
            ['от-', 'uzaklaşmak', 'Отойди от двери.'],
            ['до-', '…e kadar varmak', 'Как доехать до центра?'],
            ['за-', 'uğramak', 'Я зашёл в аптеку.'],
            ['про-', 'geçmek, önünden geçmek', 'Мы прошли мимо музея.'],
          ],
        },
        text: 'Önek alan tek yön fiil СВ olur (прийти, уехать), önek alan çok yön fiil НСВ çiftidir (приходить, уезжать). Dikkat: ехать → приезжать, плыть → приплывать.',
      },
    ],
    errorTypes: ['hareket fiili'],
    drill: {
      kind: 'form',
      any: ['VERB'],
      all: ['past'],
      lemmaRe: '(идти|йти|ходить|ехать|езжать|ездить|лететь|летать|плыть|плывать|плавать|нести|носить|вести|водить|везти|возить|бежать|бегать)$',
      prompt: 'Parantezdeki hareket fiilini cümleye uyan geçmiş zaman formuna koy.',
    },
  },
  {
    id: 'cekim',
    title: 'Fiil çekimi (şimdiki ve gelecek zaman)',
    ru: 'Спряжение глаголов',
    level: 'B1',
    summary: '1. çekim (-ешь) ve 2. çekim (-ишь), ses değişimleri ve düzensiz fiiller.',
    sections: [
      {
        h: 'İki çekim',
        table: {
          cols: ['', 'I (читать)', 'II (говорить)', 'düzensiz: хотеть'],
          rows: [
            ['я', 'читаю', 'говорю', 'хочу'],
            ['ты', 'читаешь', 'говоришь', 'хочешь'],
            ['он/она', 'читает', 'говорит', 'хочет'],
            ['мы', 'читаем', 'говорим', 'хотим'],
            ['вы', 'читаете', 'говорите', 'хотите'],
            ['они', 'читают', 'говорят', 'хотят'],
          ],
        },
        text: '-ить ile biten fiillerin çoğu 2. çekimdir. 2. çekimde я formunda ses değişimi olur: любить → люблю, ходить → хожу, просить → прошу, видеть → вижу.\n\nСВ fiil aynı sonlarla geleceği anlatır: я напишу, ты напишешь.',
        examples: [
          ['Я вожу машину, а брат ездит на метро.', 'Ben araba kullanırım, ağabeyim metroya biner.'],
          ['Ты можешь мне помочь?', 'Bana yardım edebilir misin?'],
        ],
      },
    ],
    errorTypes: ['fiil çekimi'],
    drill: { kind: 'form', any: ['VERB'], all: ['indc'], none: ['past'], prompt: 'Parantezdeki fiili özneye uyan şimdiki/gelecek zaman formuna koy.' },
  },
  {
    id: 'kotoryy',
    title: 'который ile ilgi cümleleri',
    ru: 'Придаточные с «который»',
    level: 'B1–B2',
    summary: '«…olan» yapısı: который cins ve sayıyı isimden, hâli kendi cümlesinden alır.',
    sections: [
      {
        h: 'Kural',
        text: 'Türkçedeki «-en/-an, -dığı» yapısını Rusça genelde который ile kurar. Cinsiyet ve sayı önceki isimden gelir, hâl ise yan cümledeki görevinden.',
        table: {
          cols: ['Cümle', 'Neden bu hâl?'],
          rows: [
            ['Врач, который работает у нас, — мой друг.', 'özne → yalın'],
            ['Врач, которого я знаю, …', 'знать кого? → belirtme'],
            ['Врач, которому я позвонил, …', 'позвонить кому? → yönelme'],
            ['Врач, с которым я работаю, …', 'работать с кем? → araç'],
            ['Клиника, в которой я работаю, …', 'работать где? → bulunma, dişil'],
          ],
        },
        examples: [
          ['Это лаборатория, в которой я начал работать.', 'Bu, çalışmaya başladığım laboratuvar.'],
          ['Пациентка, которой мы сделали протез, довольна.', 'Protez yaptığımız hasta memnun.'],
        ],
      },
    ],
    bank: [
      'Это лаборатория, в которой я начал работать.',
      'Врач, которому я позвонил, сразу ответил.',
      'Я встретил друга, с которым учился в колледже.',
      'Книга, которую ты мне подарил, очень интересная.',
      'Пациентка, которой мы сделали протез, довольна.',
      'Город, о котором я рассказываю, находится на юге Турции.',
    ],
    errorTypes: ['söz dizimi', 'uyum'],
    drill: { kind: 'form', any: ['Apro'], lemmaRe: '^который$', prompt: 'Parantezdeki «который»u doğru cins, sayı ve hâle koy.' },
    detect: { lemmas: ['который'] },
  },
  {
    id: 'sart',
    title: 'Şart kipi ve amaç: если, если бы, чтобы',
    ru: 'Условное наклонение',
    level: 'B1–B2',
    summary: 'Gerçek şart (если), gerçek dışı şart (если бы + geçmiş zaman) ve amaç (чтобы).',
    sections: [
      {
        h: 'Gerçek ve gerçek dışı şart',
        table: {
          cols: ['Tür', 'Yapı', 'Örnek'],
          rows: [
            ['gerçek', 'если + gelecek/şimdiki', 'Если будет время, я позвоню.'],
            ['gerçek dışı', 'если бы + geçmiş, … бы + geçmiş', 'Если бы у меня было время, я бы позвонил.'],
            ['dilek', 'хотел бы + mastar', 'Я хотел бы жить у моря.'],
          ],
        },
        text: 'бы her zaman geçmiş zaman formuyla gelir (zaman anlamı yoktur): я бы поехал = giderdim / gitmiş olurdum.',
      },
      {
        h: 'чтобы',
        text: 'Özne aynıysa чтобы + mastar: Я учу русский, чтобы работать в России. Özne farklıysa чтобы + geçmiş zaman: Я хочу, чтобы ты приехал.',
        examples: [
          ['Если бы я не поступил в колледж, я бы не стал техником.', 'Okula girmeseydim teknisyen olmazdım.'],
          ['Врач попросил, чтобы я сделал коронку к пятнице.', "Hekim kronu cumaya kadar yapmamı istedi."],
        ],
      },
    ],
    errorTypes: ['fiil çekimi', 'söz dizimi'],
    detect: { lemmas: ['бы', 'чтобы'] },
  },
  {
    id: 'ortac',
    title: 'Ortaçlar',
    ru: 'Причастия',
    level: 'B2',
    summary: 'Yazı dilinin olmazsa olmazı: читающий, прочитанный… ТРКИ-2 okuma ve yazmasında çok çıkar.',
    sections: [
      {
        h: 'Dört ortaç',
        table: {
          cols: ['Tür', 'Yapılış', 'Örnek', 'Anlam'],
          rows: [
            ['etken şimdiki', 'НСВ (они) -ут/-ят → -ущий/-ящий', 'работающий', 'çalışan'],
            ['etken geçmiş', 'geçmiş -л → -вший', 'работавший, поступивший', 'çalışmış olan, girmiş olan'],
            ['edilgen şimdiki', 'НСВ (мы) + -ый', 'изучаемый', 'incelenen'],
            ['edilgen geçmiş', 'СВ → -нный / -тый', 'сделанный, открытый', 'yapılmış, açılmış'],
          ],
        },
        text: 'Ortaç sıfat gibi çekimlenir ve isme uyar. Kısa edilgen ortaç yüklem olur: Работа сделана. Коронка изготовлена из циркония.\n\nОртаç ile который aynı anlamı verir: Техник, работающий у нас = Техник, который работает у нас.',
        examples: [
          ['Мост, изготовленный в нашей лаборатории, прослужит много лет.', 'Laboratuvarımızda yapılan köprü uzun yıllar dayanır.'],
          ['Студенты, изучающие русский язык, часто смотрят фильмы.', 'Rusça öğrenen öğrenciler sık sık film izler.'],
        ],
      },
    ],
    bank: [
      'Техник, работающий в нашей лаборатории, окончил колледж в Петербурге.',
      'Коронка, изготовленная из циркония, выглядит очень естественно.',
      'Пациенты, пришедшие утром, ждали врача в коридоре.',
      'Я прочитал статью, написанную известным стоматологом.',
      'Студенты, изучающие русский язык, часто смотрят российские фильмы.',
      'Мы обсудили проблему, возникшую во время работы.',
      'Модель, сделанная вчера, оказалась неточной.',
      'Девушка, сидящая у окна, — моя сестра.',
      'В письме, полученном от друга, было много новостей.',
      'Я помню город, в котором вырос, и людей, живших рядом с нами.',
    ],
    errorTypes: ['fiil çekimi', 'uyum', 'üslup'],
    drill: { kind: 'form', any: ['PRTF', 'PRTS'], prompt: 'Parantezdeki fiilden cümleye uyan ortacı yap.' },
    detect: { any: ['PRTF', 'PRTS'] },
  },
  {
    id: 'zarf-fiil',
    title: 'Zarf-fiiller',
    ru: 'Деепричастия',
    level: 'B2',
    summary: '«…arak, …ınca, …ıp»: читая, прочитав. İki eylemi tek cümlede bağlar.',
    sections: [
      {
        h: 'Yapılış ve anlam',
        table: {
          cols: ['Tür', 'Yapılış', 'Örnek', 'Türkçe'],
          rows: [
            ['НСВ (eşzamanlı)', 'они: -ут/-ят → -я/-а', 'читая, работая, слушая', 'okurken, çalışarak'],
            ['СВ (önce biten)', 'geçmiş -л → -в / -вшись', 'прочитав, вернувшись', 'okuyunca, dönünce'],
          ],
        },
        text: 'Kural: zarf-fiilin öznesi ana cümlenin öznesiyle aynı olmalı. Yanlış: «Подходя к дому, пошёл дождь» (yağmur eve yaklaşmıyor!). Doğru: Когда я подходил к дому, пошёл дождь.',
        examples: [
          ['Работая в лаборатории, я слушаю подкасты.', 'Laboratuvarda çalışırken podcast dinlerim.'],
          ['Окончив колледж, я устроился на работу.', 'Okulu bitirince işe girdim.'],
        ],
      },
    ],
    bank: [
      'Работая в лаборатории, я слушаю русские подкасты.',
      'Окончив колледж, я сразу устроился на работу.',
      'Вернувшись домой, он долго не мог уснуть.',
      'Читая эту книгу, я выписываю новые слова.',
      'Получив заказ, техник начинает делать модель.',
      'Она говорила, улыбаясь и глядя мне в глаза.',
      'Приехав в Петербург, я поступил на подготовительный факультет.',
      'Не зная языка, трудно жить в чужой стране.',
      'Закончив работу, мы пошли в кафе.',
      'Слушая музыку, я забываю об усталости.',
    ],
    errorTypes: ['fiil çekimi', 'söz dizimi', 'üslup'],
    drill: { kind: 'form', any: ['GRND'], prompt: 'Parantezdeki fiilden zarf-fiil yap.' },
    detect: { any: ['GRND'] },
  },
  {
    id: 'sayi',
    title: 'Sayı + isim',
    ru: 'Числительные и существительные',
    level: 'B1–B2',
    summary: '1 стол, 2 стола, 5 столов: sayıdan sonra hangi hâl? Yaş, fiyat, saat.',
    sections: [
      {
        h: 'Kural',
        table: {
          cols: ['Sayı', 'İsim', 'Örnek'],
          rows: [
            ['1, 21, 31…', 'tekil yalın', 'один год, двадцать одна книга'],
            ['2–4, 22–24…', 'tekil ilgi', 'два года, три книги'],
            ['5–20, 25–30…, много, мало, сколько', 'çoğul ilgi', 'пять лет, много книг'],
          ],
        },
        text: 'Yaş yönelme hâliyle: Мне тридцать два года. Брату сорок лет.\n\nSayı da çekimlenir: с двумя друзьями, в пяти городах. Sıra sayıları sıfattır: в третьем классе, на втором этаже.',
        examples: [
          ['Я работаю техником уже семь лет.', 'Yedi yıldır teknisyen olarak çalışıyorum.'],
          ['В нашей лаборатории четыре техника и два врача.', 'Laboratuvarımızda dört teknisyen ve iki hekim var.'],
        ],
      },
    ],
    errorTypes: ['hâl eki', 'uyum'],
  },
  {
    id: 'donuslu',
    title: 'Dönüşlü fiiller ve edilgen yapı',
    ru: 'Возвратные глаголы и пассив',
    level: 'B1–B2',
    summary: '-ся eki: dönüşlülük, karşılıklılık ve edilgenlik (Дом строится).',
    sections: [
      {
        h: '-ся\'nin anlamları',
        table: {
          cols: ['Anlam', 'Örnek'],
          rows: [
            ['kendine (dönüşlü)', 'умываться, одеваться'],
            ['karşılıklı', 'встречаться, знакомиться, ссориться'],
            ['edilgen (НСВ)', 'Коронки изготавливаются из керамики.'],
            ['yalnız -ся ile var', 'бояться, смеяться, нравиться, надеяться'],
          ],
        },
        text: 'Ünlüden sonra -сь: я учусь, она училась. Edilgen yapı: НСВ ise -ся (Дом строится), СВ ise kısa ortaç (Дом построен).\n\nTipik hata: учить (bir şeyi öğrenmek, nesne alır: учу слова) ile учиться (okumak, öğrenci olmak: учусь в колледже) karışır.',
        examples: [
          ['Мы познакомились в Петербурге.', "Petersburg'da tanıştık."],
          ['Модель отливается из гипса.', 'Model alçıdan dökülür.'],
        ],
      },
    ],
    errorTypes: ['fiil çekimi', 'kelime seçimi'],
    drill: { kind: 'form', any: ['VERB'], lemmaRe: '(ся|сь)$', prompt: 'Parantezdeki dönüşlü fiili doğru forma koy.' },
  },
  {
    id: 'kiyas',
    title: 'Karşılaştırma',
    ru: 'Сравнительная и превосходная степень',
    level: 'B1',
    summary: 'больше, лучше, интереснее; самый; чем ve ilgi hâliyle karşılaştırma.',
    sections: [
      {
        h: 'Yapılar',
        table: {
          cols: ['Yapı', 'Örnek'],
          rows: [
            ['sıfat + -ее', 'интересный → интереснее, быстрый → быстрее'],
            ['düzensiz', 'хороший → лучше, плохой → хуже, большой → больше, маленький → меньше'],
            ['ses değişimli', 'дорогой → дороже, простой → проще, молодой → моложе'],
            ['чем / ilgi hâli', 'Москва больше, чем Казань = Москва больше Казани'],
            ['en (самый)', 'самый трудный экзамен, самая интересная работа'],
          ],
        },
        examples: [
          ['Цирконий прочнее, чем металлокерамика.', 'Zirkonyum metal-seramikten daha dayanıklı.'],
          ['Это самый сложный случай в моей практике.', 'Bu, mesleğimdeki en zor vaka.'],
        ],
      },
    ],
    errorTypes: ['hâl eki', 'kelime seçimi'],
    detect: { any: ['COMP', 'Supr'], lemmas: ['самый'] },
  },
  {
    id: 'emir',
    title: 'Emir kipi',
    ru: 'Повелительное наклонение',
    level: 'B1',
    summary: 'читай / читайте, скажи, давай(те) + mastar; kibar istekler.',
    sections: [
      {
        h: 'Yapılış',
        table: {
          cols: ['они formu', 'Emir', 'Örnek'],
          rows: [
            ['читают (ünlü)', '-й / -йте', 'читай, читайте'],
            ['говорят (vurgu sonda)', '-и / -ите', 'говори, говорите'],
            ['встанут (vurgu kökte)', '-ь / -ьте', 'встань, встаньте'],
            ['düzensiz', '', 'дай, ешь, пей, будь'],
          ],
        },
        text: 'Kibar istek: Скажите, пожалуйста… Не могли бы вы…? Birlikte yapalım: давай(те) + СВ gelecek (давай пойдём) ya da + НСВ mastar (давайте работать).\n\nOlumsuz emirde genelde НСВ: Не опаздывай! (СВ olumsuz = uyarı: Не опоздай! geç kalma sakın).',
        examples: [
          ['Откройте рот, пожалуйста.', 'Ağzınızı açın lütfen.'],
          ['Давай встретимся после работы.', 'İşten sonra buluşalım.'],
        ],
      },
    ],
    bank: [
      'Откройте рот, пожалуйста.',
      'Позвони мне вечером.',
      'Не забывай повторять слова каждый день.',
      'Садитесь, пожалуйста, врач скоро придёт.',
      'Скажите, как доехать до центра?',
      'Пейте больше воды и отдыхайте.',
    ],
    errorTypes: ['fiil çekimi'],
    drill: { kind: 'form', any: ['VERB'], all: ['impr'], prompt: 'Parantezdeki fiilden emir kipi yap.' },
    detect: { any: ['impr'] },
  },
]

export const topicById = (id: string) => GRAMMAR.find((t) => t.id === id)

/** Her temanın haftalık gramer hedefi (tema sırasıyla 1–12). */
export const THEME_GRAMMAR: Array<{ topic: string; goal: string; target: number }> = [
  { topic: 'gorunus', goal: 'geçmişte süreç (НСВ) ve sonuç (СВ) fiillerini birlikte kullan', target: 0 },
  { topic: 'donuslu', goal: 'işini edilgen yapıyla anlat (изготавливается, сделан)', target: 0 },
  { topic: 'kotoryy', goal: 'en az 2 kez «который» kullan', target: 2 },
  { topic: 'sayi', goal: 'fiyat ve miktarları sayı + isimle yaz', target: 0 },
  { topic: 'emir', goal: 'en az 3 emir kipi kullan (doktor tavsiyesi gibi)', target: 3 },
  { topic: 'hareket', goal: 'önekli hareket fiilleri kullan (приехал, вышел, пересел)', target: 0 },
  { topic: 'sart', goal: 'en az 1 kez «если бы» ya da «чтобы» kullan', target: 1 },
  { topic: 'kiyas', goal: 'en az 2 karşılaştırma yap (больше, лучше, самый)', target: 2 },
  { topic: 'zarf-fiil', goal: 'en az 2 zarf-fiil kullan (работая, окончив)', target: 2 },
  { topic: 'ortac', goal: 'en az 2 ortaç kullan (написанный, работающий)', target: 2 },
  { topic: 'haller', goal: 'edatları ve hâlleri çeşitlendir (без, кроме, между, через)', target: 0 },
  { topic: 'cekim', goal: 'farklı şahıslarla yaz: он/она, мы, они', target: 0 },
]
