// Her tema için: 7 günlük konuşma/yazı rotasyonu ve en az 50 kelimelik liste (fiil, sıfat, zarf).
// Fiillerde «tamamlanmış / tamamlanmamış» çift olarak verilir; ikisi de sözlükte kendi lemmasıyla sayılır.

export type WordPos = 'verb' | 'adj' | 'adv'

export interface ThemeWord {
  /** Lemma; fiilde «tamamlanmış / tamamlanmamış» çifti olabilir */
  ru: string
  tr: string
  pos: WordPos
}

export interface ThemeDay {
  title: string
  prompt: string
  /** «Rusça — Türkçe» kalıplar; her gün en az 5 tanesini kullan */
  phrases: string[]
}

export interface ThemePack {
  name: string
  ru: string
  week: ThemeDay[]
  words: ThemeWord[]
}

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

/** Pazar her temada aynı: haftanın takıldığın yerleri. */
const sunday = (topic: string): ThemeDay => ({
  title: 'Haftanın tekrarı',
  prompt: `Bu hafta takıldığın kelimeleri ve kalıpları topla. Claude'a «bu kelimeleri kullanarak bana ${topic} hakkında 5 soru sor» de ve cevaplarını yaz.`,
  phrases: ['Мне было трудно сказать… — …demekte zorlandım', 'Я не знал, как будет по-русски… — …Rusçada nasıl denir bilmiyordum', 'Задай мне вопросы о… — Bana … hakkında sorular sor'],
})

/** Kelime listesi kısa yazımı: "ru = tr; ru = tr" */
const list = (pos: WordPos, s: string): ThemeWord[] =>
  s
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [ru, tr] = x.split('=').map((y) => y.trim())
      return { ru, tr, pos }
    })

export const THEME_PACKS: ThemePack[] = [
  {
    name: 'Ben ve hayatım',
    ru: 'Я и моя жизнь',
    week: [
      {
        title: 'Çocukluğun ve okul yılların',
        prompt: 'Nerede doğdun, nasıl bir çocuktun, okulda en çok neyi sevdin?',
        phrases: ['в детстве — çocukken', 'школьные годы — okul yılları', 'я родился в… — …da doğdum', 'я вырос в… — …da büyüdüm', 'мне нравилось… — …yı severdim', 'когда мне было десять лет — on yaşındayken'],
      },
      {
        title: 'Mesleğe nasıl başladın',
        prompt: 'Diş teknisyenliğini nasıl seçtin? Okula girişin, ilk işin, ilk günün.',
        phrases: ['поступить в колледж — üniversiteye/koleje girmek', 'устроиться на работу — işe girmek', 'окончить учёбу — okulu bitirmek', 'выбрать профессию — meslek seçmek', 'в первый день — ilk gün', 'мне повезло — şanslıydım'],
      },
      {
        title: 'Bir arkadaşını ya da ağabeyini anlat',
        prompt: 'Karakteri nasıl, kime benziyor, sizi ne bağlıyor? Her şeyi он/она ile anlat.',
        phrases: ['он похож на… — …ya benziyor', 'у него добрый характер — iyi huyludur', 'мы знакомы с… — …dan beri tanışıyoruz', 'он всегда готов помочь — her zaman yardıma hazırdır', 'она умеет… — …yı bilir/becerir', 'мы часто спорим — sık sık tartışırız'],
      },
      {
        title: 'Hayatını değiştiren bir karar',
        prompt: 'Hangi kararı verdin, neden, şimdi ne düşünüyorsun? Pişmanlık var mı?',
        phrases: ['принять решение — karar vermek', 'жалеть о… — …dan pişman olmak', 'я долго думал — uzun süre düşündüm', 'это изменило мою жизнь — bu hayatımı değiştirdi', 'если бы я не… — eğer …mesaydım', 'в итоге — sonunda'],
      },
      {
        title: 'Ünlü bir Rus ya da dizi karakterinin hayatı',
        prompt: 'Biyografisini anlat. Bilmediğin yerleri uydurabilirsin.',
        phrases: ['родился в семье… — … bir ailede doğdu', 'стремился к… — …ya ulaşmaya çalıştı', 'прославился благодаря… — … sayesinde ünlendi', 'всю жизнь — bütün hayatı boyunca', 'после смерти — ölümünden sonra', 'его называют… — ona … derler'],
      },
      {
        title: '5 yıl sonraki hayalindeki sen',
        prompt: 'Nerede yaşıyorsun, ne iş yapıyorsun, Rusçan ne durumda?',
        phrases: ['мечтать о… — …yı hayal etmek', 'планы на будущее — gelecek planları', 'через пять лет — beş yıl sonra', 'я надеюсь, что… — umarım ki…', 'я буду свободно говорить — akıcı konuşacağım', 'хочу добиться… — …ya ulaşmak istiyorum'],
      },
      sunday('kendim ve hayatım'),
    ],
    words: [
      ...list('verb', 'родиться = doğmak; вырасти / расти = büyümek; поступить / поступать = (okula) girmek; окончить / оканчивать = bitirmek, mezun olmak; переехать / переезжать = taşınmak; жениться = evlenmek (erkek); стать / становиться = olmak, haline gelmek; измениться / меняться = değişmek; повзрослеть / взрослеть = büyümek, olgunlaşmak; вспомнить / вспоминать = hatırlamak; пожалеть / жалеть = pişman olmak, acımak; гордиться = gurur duymak; увлечься / увлекаться = merak salmak; отличаться = farklı olmak; зависеть = bağlı olmak; бояться = korkmak; надеяться = ummak; достигнуть / достигать = ulaşmak, başarmak; научиться / учиться = öğrenmek; мечтать = hayal etmek; стремиться = çabalamak, can atmak'),
      ...list('adj', 'общительный = girişken, konuşkan; застенчивый = utangaç; упрямый = inatçı; добрый = iyi kalpli; ответственный = sorumluluk sahibi; трудолюбивый = çalışkan; ленивый = tembel; счастливый = mutlu; беззаботный = kaygısız; родной = öz, ana (dil/şehir); взрослый = yetişkin; младший = küçük (kardeş); старший = büyük (kardeş); похожий = benzer; решительный = kararlı; любопытный = meraklı; спокойный = sakin'),
      ...list('adv', 'однажды = bir gün, bir keresinde; прежде = önceden, eskiden; теперь = artık, şimdi; тогда = o zaman; постепенно = yavaş yavaş; сразу = hemen; вдруг = birden; наконец = nihayet; всегда = her zaman; никогда = asla; давно = çoktan, uzun zamandır; недавно = yakın zamanda; иногда = bazen; обычно = genellikle; впервые = ilk kez; совсем = tamamen'),
    ],
  },
  {
    name: 'İş ve meslek',
    ru: 'Работа и профессия',
    week: [
      {
        title: 'Sıradan bir iş günün',
        prompt: 'Sabah laboratuvara geldiğinden akşam çıkana kadar ne yapıyorsun?',
        phrases: ['рабочий день начинается в… — iş günü …da başlar', 'сначала я… — önce …', 'после обеда — öğleden sonra', 'я заканчиваю работу в… — işi …da bitiririm', 'у меня много заказов — çok siparişim var', 'в перерыве — molada'],
      },
      {
        title: 'Bir kronun yapılışı',
        prompt: 'Ölçüden teslime kadar adım adım anlat (edilgen yapıyı dene: делается, изготавливается).',
        phrases: ['сначала снимают слепок — önce ölçü alınır', 'модель отливают из гипса — model alçıdan dökülür', 'коронку изготавливают из… — kron …dan yapılır', 'затем — ardından', 'на последнем этапе — son aşamada', 'работа требует точности — iş hassasiyet ister'],
      },
      {
        title: 'Bir iş arkadaşını anlat',
        prompt: 'Ne iş yapıyor, nasıl biri, onunla nasıl çalışıyorsunuz? он/она ile.',
        phrases: ['он отвечает за… — …dan sorumlu', 'она работает здесь уже… — …dır burada çalışıyor', 'с ним легко работать — onunla çalışmak kolay', 'он всегда помогает новичкам — yeni gelenlere hep yardım eder', 'у неё большой опыт — büyük tecrübesi var', 'мы хорошо ладим — iyi anlaşırız'],
      },
      {
        title: 'İşte yaşadığın bir sorun',
        prompt: 'Acil bir sipariş, hatalı bir ölçü, zor bir hekim. Ne oldu, nasıl çözdün?',
        phrases: ['возникла проблема — bir sorun çıktı', 'пришлось переделать — yeniden yapmak zorunda kaldık', 'я не успевал — yetiştiremiyordum', 'мы договорились — anlaştık', 'в конце концов — sonunda', 'я справился с… — …nın üstesinden geldim'],
      },
      {
        title: 'Bir Rus meslektaşın kariyeri',
        prompt: 'Rusya\'da bir diş teknisyeninin hayatını hayal et: eğitimi, maaşı, işi.',
        phrases: ['он учился в медицинском колледже — tıp kolejinde okudu', 'работает в частной клинике — özel klinikte çalışıyor', 'зарабатывает — kazanıyor', 'мечтает открыть свою лабораторию — kendi laboratuvarını açmayı hayal ediyor', 'его ценят — ona değer veriyorlar', 'он перешёл в… — …ya geçti'],
      },
      {
        title: 'Mesleğinin geleceği',
        prompt: 'Dijital teknoloji, CAD/CAM, 3D yazıcılar. 10 yıl sonra işin nasıl olacak?',
        phrases: ['в будущем — gelecekte', 'технологии заменят… — teknoloji …nın yerini alacak', 'я хочу освоить… — …yı öğrenmek istiyorum', 'спрос на… растёт — …ya talep artıyor', 'я думаю, что… — bence…', 'с одной стороны… с другой стороны — bir yandan… öte yandan'],
      },
      sunday('işim'),
    ],
    words: [
      ...list('verb', 'работать = çalışmak; устроиться / устраиваться = (işe) girmek, yerleşmek; уволиться / увольняться = işten ayrılmak; заработать / зарабатывать = kazanmak; получить / получать = almak; заказать / заказывать = sipariş etmek; изготовить / изготавливать = imal etmek; обработать / обрабатывать = işlemek; отшлифовать / шлифовать = zımparalamak, cilalamak; отполировать / полировать = parlatmak; примерить / примерять = prova etmek, denemek; исправить / исправлять = düzeltmek; сдать / сдавать = teslim etmek; опоздать / опаздывать = geç kalmak; успеть / успевать = yetişmek; справиться / справляться = başa çıkmak; договориться / договариваться = anlaşmak; ответить / отвечать = cevap vermek, sorumlu olmak; руководить = yönetmek; повысить / повышать = yükseltmek, terfi ettirmek; нанять / нанимать = işe almak; устать / уставать = yorulmak'),
      ...list('adj', 'трудный = zor; сложный = karmaşık; точный = hassas, kesin; аккуратный = özenli, titiz; опытный = deneyimli; начинающий = yeni başlayan; срочный = acil; зубной = diş (sıfat); рабочий = iş (sıfat); занятой = meşgul; выгодный = kârlı; постоянный = sürekli, kalıcı; временный = geçici; частный = özel; государственный = devlet (sıfat); медицинский = tıbbi; профессиональный = profesyonel'),
      ...list('adv', 'срочно = acilen; вовремя = zamanında; тщательно = özenle; точно = tam olarak; быстро = hızlı; медленно = yavaş; заранее = önceden; вручную = elle; ежедневно = her gün; допоздна = geç saate kadar; обязательно = mutlaka; полностью = tamamen; сначала = önce; потом = sonra; аккуратно = dikkatlice'),
    ],
  },
  {
    name: 'Ev, şehir, günlük yaşam',
    ru: 'Дом, город, повседневная жизнь',
    week: [
      {
        title: 'Evini anlat',
        prompt: 'Kaç oda, hangi kat, en sevdiğin köşe, pencereden ne görünüyor?',
        phrases: ['я живу в квартире на… этаже — …. kattaki bir dairede yaşıyorum', 'из окна видно… — pencereden … görünüyor', 'в гостиной стоит… — salonda … var', 'мой любимый уголок — en sevdiğim köşe', 'квартира небольшая, но уютная — daire küçük ama sıcak', 'рядом с домом — evin yanında'],
      },
      {
        title: 'Sabah rutinin',
        prompt: 'Uyanmandan evden çıkışına kadar her şey. Dönüşlü fiillere dikkat (просыпаться, одеваться).',
        phrases: ['я просыпаюсь в… — …da uyanırım', 'встаю не сразу — hemen kalkmam', 'умываюсь и одеваюсь — yüzümü yıkar giyinirim', 'на завтрак я ем… — kahvaltıda … yerim', 'выхожу из дома — evden çıkarım', 'добираюсь до работы на… — işe … ile giderim'],
      },
      {
        title: 'Komşunu anlat',
        prompt: 'Komşun nasıl biri, ne yapar, aranızda nasıl bir ilişki var? он/она ile.',
        phrases: ['мой сосед живёт… — komşum … yaşıyor', 'он часто шумит — sık sık gürültü yapar', 'мы здороваемся — selamlaşırız', 'она всегда угощает… — hep … ikram eder', 'однажды он помог мне — bir keresinde bana yardım etti', 'мы почти не общаемся — neredeyse hiç konuşmayız'],
      },
      {
        title: 'Şehrin artıları ve eksileri',
        prompt: 'Yaşadığın şehirde neyi seviyorsun, neyi değiştirirdin?',
        phrases: ['мне нравится, что… — …ı seviyorum', 'меня раздражает… — … beni sinirlendiriyor', 'пробки — trafik sıkışıklığı', 'в центре города — şehir merkezinde', 'если бы я был мэром — belediye başkanı olsaydım', 'жизнь здесь дорогая — burada hayat pahalı'],
      },
      {
        title: 'Petersburg\'daki bir gününü hayal et',
        prompt: 'SPbGU yıllarındaki bir gününü ya da bir Petersburglunun gününü anlat (geçmiş zaman).',
        phrases: ['я жил в общежитии — yurtta kalıyordum', 'ездил на метро — metroyla giderdim', 'гулял по Невскому — Nevski\'de gezerdim', 'белые ночи — beyaz geceler', 'было холодно, но красиво — soğuktu ama güzeldi', 'я скучаю по… — …yı özlüyorum'],
      },
      {
        title: 'Hayalindeki ev',
        prompt: 'Nerede, nasıl bir ev? Odalar, bahçe, komşuluk.',
        phrases: ['я хотел бы жить в… — …da yaşamak isterdim', 'дом с садом — bahçeli ev', 'на берегу моря — deniz kıyısında', 'там будет… — orada … olacak', 'я сам отремонтирую — kendim tadilat yapacağım', 'главное, чтобы… — önemli olan …'],
      },
      sunday('evim ve şehrim'),
    ],
    words: [
      ...list('verb', 'снять / снимать = kiralamak; убрать / убирать = toplamak, temizlemek; помыть / мыть = yıkamak; приготовить / готовить = hazırlamak, pişirmek; постирать / стирать = (çamaşır) yıkamak; погладить / гладить = ütülemek; проснуться / просыпаться = uyanmak; встать / вставать = kalkmak; лечь / ложиться = yatmak; отремонтировать / ремонтировать = tamir etmek, tadilat yapmak; заплатить / платить = ödemek; жить = yaşamak; находиться = bulunmak; погулять / гулять = gezmek; добраться / добираться = ulaşmak, varmak; ездить = (araçla) gidip gelmek; ходить = yürümek, gidip gelmek; вынести / выносить = dışarı çıkarmak; включить / включать = açmak (cihaz); выключить / выключать = kapatmak; сломаться / ломаться = bozulmak; починить / чинить = onarmak'),
      ...list('adj', 'уютный = rahat, sıcak (ev); просторный = ferah; тесный = dar, sıkışık; светлый = aydınlık; тёмный = karanlık; шумный = gürültülü; тихий = sessiz; чистый = temiz; грязный = kirli; удобный = kullanışlı, rahat; современный = modern; старый = eski; многоэтажный = çok katlı; центральный = merkezi; соседний = komşu, yan; дорогой = pahalı; дешёвый = ucuz'),
      ...list('adv', 'дома = evde; домой = eve; рядом = yanında, yakında; далеко = uzak; близко = yakın; недалеко = uzak değil; снаружи = dışarıda; наверху = yukarıda; внизу = aşağıda; вокруг = etrafta; утром = sabah; вечером = akşam; днём = gündüz; ночью = gece; рано = erken; поздно = geç'),
    ],
  },
  {
    name: 'Yemek, alışveriş, para',
    ru: 'Еда, покупки, деньги',
    week: [
      {
        title: 'Dün ne yedin',
        prompt: 'Kahvaltı, öğle, akşam. Nerede, kiminle, nasıldı?',
        phrases: ['на завтрак я ел… — kahvaltıda … yedim', 'на обед — öğle yemeğinde', 'на ужин — akşam yemeğinde', 'было очень вкусно — çok lezzetliydi', 'я перекусил — atıştırdım', 'я не успел поесть — yemek yemeye vaktim olmadı'],
      },
      {
        title: 'Bir yemeğin tarifi',
        prompt: 'Sevdiğin bir Türk yemeğini Rus arkadaşına anlatır gibi adım adım tarif et (emir kipi: возьми, нарежь).',
        phrases: ['возьми… — … al', 'нарежь мелко — ince doğra', 'обжарь на масле — yağda kavur', 'добавь соль и перец — tuz ve biber ekle', 'вари двадцать минут — yirmi dakika pişir', 'подавай горячим — sıcak servis et'],
      },
      {
        title: 'Ailende kim nasıl alışveriş yapar',
        prompt: 'Annen, baban ya da eşin: tutumlu mu, savurgan mı? он/она ile.',
        phrases: ['она экономит на… — …dan tasarruf eder', 'он тратит много денег на… — …ya çok para harcar', 'она всегда сравнивает цены — hep fiyatları karşılaştırır', 'он покупает всё подряд — gördüğü her şeyi alır', 'по скидке — indirimle', 'она торгуется на рынке — pazarda pazarlık yapar'],
      },
      {
        title: 'Para hakkında fikrin',
        prompt: 'Biriktirmek mi, yaşamak mı? Borç vermek, kredi, maaş hakkında ne düşünüyorsun?',
        phrases: ['копить деньги — para biriktirmek', 'брать в кредит — krediyle almak', 'дать в долг — borç vermek', 'деньги не главное — para önemli değil', 'по-моему — bana göre', 'жить по средствам — gelirine göre yaşamak'],
      },
      {
        title: 'Bir Rus mutfağı ya da markette bir Rus',
        prompt: 'Борщ, пельмени ya da Rusya\'da bir market alışverişi. Bir Rus\'un gözünden anlat.',
        phrases: ['в России обычно едят… — Rusya\'da genelde … yenir', 'на праздник готовят… — bayramda … pişirilir', 'она пошла в магазин за… — … almak için markete gitti', 'на кассе — kasada', 'оплатить картой — kartla ödemek', 'сдача — para üstü'],
      },
      {
        title: 'Bir ay sınırsız paran olsa',
        prompt: 'Ne alırdın, nereye giderdin, kime ne verirdin? (Şart kipi: бы)',
        phrases: ['если бы у меня было много денег — çok param olsaydı', 'я бы купил… — … alırdım', 'я бы подарил… — … hediye ederdim', 'я бы помог… — …ya yardım ederdim', 'я бы ни за что не… — asla …mazdım', 'это моя мечта — bu benim hayalim'],
      },
      sunday('yemek ve para'),
    ],
    words: [
      ...list('verb', 'купить / покупать = satın almak; потратить / тратить = harcamak; сэкономить / экономить = tasarruf etmek; накопить / копить = biriktirmek; стоить = değerinde olmak, tutmak (fiyat); оплатить / оплачивать = ödemesini yapmak; занять / занимать = borç almak; одолжить / одалживать = ödünç vermek; вернуть / возвращать = geri vermek; выбрать / выбирать = seçmek; попробовать / пробовать = tatmak, denemek; сварить / варить = kaynatmak, pişirmek; пожарить / жарить = kızartmak; нарезать / резать = doğramak, kesmek; испечь / печь = (fırında) pişirmek; покушать / кушать = yemek yemek; выпить / пить = içmek; похудеть / худеть = kilo vermek; продать / продавать = satmak; обменять / обменивать = değiştirmek (döviz); торговаться = pazarlık etmek; перекусить / перекусывать = atıştırmak'),
      ...list('adj', 'вкусный = lezzetli; острый = acı (baharat); солёный = tuzlu; сладкий = tatlı; кислый = ekşi; горький = acı (tat); свежий = taze; сытый = tok; голодный = aç; бесплатный = ücretsiz; жадный = cimri, açgözlü; щедрый = cömert; домашний = ev yapımı; полезный = faydalı; жирный = yağlı; фирменный = (mekâna) özel, markalı; наличный = nakit'),
      ...list('adv', 'дорого = pahalı; дёшево = ucuz; вкусно = lezzetli; бесплатно = bedava; много = çok; немного = biraz; достаточно = yeterince; слишком = fazla, aşırı; почти = neredeyse; вместе = birlikte; отдельно = ayrı ayrı; экономно = tutumlu; щедро = cömertçe; сытно = doyurucu; остро = acılı'),
    ],
  },
  {
    name: 'Sağlık ve beden',
    ru: 'Здоровье и тело',
    week: [
      {
        title: 'Son hastalığın',
        prompt: 'En son ne zaman hastalandın? Belirtiler, doktor, iyileşme.',
        phrases: ['я заболел — hastalandım', 'у меня болело горло — boğazım ağrıyordu', 'поднялась температура — ateşim çıktı', 'я пошёл к врачу — doktora gittim', 'врач выписал… — doktor … yazdı', 'через неделю я поправился — bir hafta sonra iyileştim'],
      },
      {
        title: 'Diş hekiminde bir hasta',
        prompt: 'Muayeneden protez takılmasına kadar bir hastanın yolculuğunu anlat.',
        phrases: ['пациент жалуется на боль — hasta ağrıdan şikâyet ediyor', 'врач осматривает полость рта — hekim ağız içini muayene ediyor', 'нужно удалить зуб — dişin çekilmesi gerekiyor', 'поставить пломбу — dolgu yapmak', 'протез сидит хорошо — protez iyi oturuyor', 'не больно — acımıyor'],
      },
      {
        title: 'Spor yapan birini anlat',
        prompt: 'Sağlıklı yaşayan bir tanıdığını anlat: ne yer, ne zaman uyur, hangi sporu yapar? он/она ile.',
        phrases: ['он следит за здоровьем — sağlığına dikkat eder', 'она бегает по утрам — sabahları koşar', 'он не курит и не пьёт — sigara ve içki kullanmaz', 'ложится спать рано — erken yatar', 'она в хорошей форме — formu iyi', 'он никогда не болеет — hiç hastalanmaz'],
      },
      {
        title: 'Kötü bir alışkanlığın',
        prompt: 'Bırakmak istediğin bir alışkanlık: neden başladın, neden zor, ne yapacaksın?',
        phrases: ['вредная привычка — kötü alışkanlık', 'бросить курить — sigarayı bırakmak', 'я пытаюсь… — …ya çalışıyorum', 'мне трудно отказаться от… — …dan vazgeçmek zor', 'сидячий образ жизни — hareketsiz yaşam', 'с понедельника начну — pazartesi başlayacağım'],
      },
      {
        title: 'Ünlü bir Rus doktor ya da sporcu',
        prompt: 'Pirogov, Pavlov ya da bir Rus sporcu. Hayatını anlat, bilmediğini uydur.',
        phrases: ['он посвятил жизнь медицине — hayatını tıbba adadı', 'открыл новый метод — yeni bir yöntem buldu', 'спас тысячи жизней — binlerce hayat kurtardı', 'она выиграла олимпиаду — olimpiyatı kazandı', 'несмотря на травму — sakatlığına rağmen', 'он стал символом… — …nın sembolü oldu'],
      },
      {
        title: 'Sağlıklı bir yıl planı',
        prompt: 'Önümüzdeki yıl sağlığın için ne yapacaksın? Somut adımlar.',
        phrases: ['я начну заниматься спортом — spora başlayacağım', 'буду больше спать — daha çok uyuyacağım', 'перестану есть… — … yemeyi bırakacağım', 'пройду обследование — check-up yaptıracağım', 'раз в неделю — haftada bir', 'главное — не сдаваться — önemli olan pes etmemek'],
      },
      sunday('sağlık'),
    ],
    words: [
      ...list('verb', 'заболеть / болеть = hastalanmak, ağrımak; вылечить / лечить = tedavi etmek; лечиться = tedavi olmak; выздороветь / выздоравливать = iyileşmek; простудиться / простужаться = üşütmek; кашлять = öksürmek; чихнуть / чихать = hapşırmak; проглотить / глотать = yutmak; записаться / записываться = randevu almak, kaydolmak; осмотреть / осматривать = muayene etmek; удалить / удалять = çekmek, çıkarmak; запломбировать / пломбировать = dolgu yapmak; тренироваться = antrenman yapmak; поправиться / поправляться = iyileşmek, kilo almak; почувствовать / чувствовать = hissetmek; беспокоить = rahatsız etmek; навредить / вредить = zarar vermek; рисковать = risk almak; дышать = nefes almak; спать = uyumak; отдохнуть / отдыхать = dinlenmek; жаловаться = şikâyet etmek'),
      ...list('adj', 'здоровый = sağlıklı; больной = hasta; слабый = zayıf, güçsüz; сильный = güçlü; усталый = yorgun; хронический = kronik; вредный = zararlı; бледный = solgun; высокий = uzun boylu, yüksek; худой = zayıf; полный = kilolu, dolu; стройный = ince, biçimli; опасный = tehlikeli; серьёзный = ciddi; лёгкий = hafif, kolay; тяжёлый = ağır; заразный = bulaşıcı'),
      ...list('adv', 'плохо = kötü; хорошо = iyi; больно = acıyor; тяжело = zor, ağır; легко = kolay; регулярно = düzenli; полезно = faydalı; вредно = zararlı; немедленно = derhal; осторожно = dikkatli; постоянно = sürekli; редко = nadiren; часто = sık; бодро = dinç, canlı; правильно = doğru'),
    ],
  },
  {
    name: 'Seyahat ve ulaşım',
    ru: 'Путешествия и транспорт',
    week: [
      {
        title: 'Unutamadığın bir yolculuk',
        prompt: 'Nereye gittin, kiminle, ne oldu? Hareket fiillerine dikkat (поехал, приехал, уехал).',
        phrases: ['мы поехали в… — …ya gittik', 'приехали поздно вечером — gece geç vardık', 'остановились в гостинице — otelde kaldık', 'больше всего мне запомнилось… — en çok … aklımda kaldı', 'на обратном пути — dönüş yolunda', 'это было незабываемо — unutulmazdı'],
      },
      {
        title: 'İşe gidiş yolun',
        prompt: 'Evden işe nasıl gidiyorsun? Aktarma, süre, yolda ne yapıyorsun?',
        phrases: ['я езжу на автобусе — otobüsle gidiyorum', 'пересаживаюсь на… — …ya aktarma yaparım', 'дорога занимает… — yol … sürer', 'выхожу на остановке… — … durağında inerim', 'в дороге я слушаю… — yolda … dinlerim', 'иду пешком до… — …ya kadar yürürüm'],
      },
      {
        title: 'Çok gezen birini anlat',
        prompt: 'Gezmeyi seven bir tanıdığın: nerelere gitti, nasıl seyahat ediyor? он/она ile.',
        phrases: ['она объездила всю Европу — bütün Avrupa\'yı gezdi', 'он путешествует налегке — hafif yükle seyahat eder', 'она всегда бронирует заранее — hep önceden rezervasyon yapar', 'он любит путешествовать один — yalnız gezmeyi sever', 'она привозит сувениры — hediyelik eşya getirir', 'он побывал в… — …da bulundu'],
      },
      {
        title: 'Yolda başına gelen bir aksilik',
        prompt: 'Kaçırılan uçak, kaybolan bavul, yanlış tren. Ne oldu, nasıl çözdün?',
        phrases: ['я опоздал на самолёт — uçağı kaçırdım', 'потерялся багаж — bagaj kayboldu', 'я заблудился — kayboldum', 'рейс задержали — uçuş ertelendi', 'пришлось ждать — beklemek zorunda kaldım', 'всё закончилось хорошо — her şey iyi bitti'],
      },
      {
        title: 'Transsibirya yolculuğu',
        prompt: 'Moskova\'dan Vladivostok\'a trenle giden birinin yolculuğunu anlat.',
        phrases: ['поезд отправляется в… — tren …da kalkar', 'в купе ехали… — kompartımanda … vardı', 'пили чай из подстаканников — bardak tutucuyla çay içtiler', 'за окном — pencerenin dışında', 'поезд шёл семь дней — tren yedi gün gitti', 'наконец он прибыл в… — sonunda …ya ulaştı'],
      },
      {
        title: 'Bir sonraki tatilin planı',
        prompt: 'Rusya\'ya ya da başka bir yere bir gezi planla: rota, ulaşım, bütçe.',
        phrases: ['я собираюсь поехать в… — …ya gitmeyi planlıyorum', 'забронирую билеты — biletleri ayırtacağım', 'сначала полечу в… — önce …ya uçacağım', 'хочу посетить… — …yı ziyaret etmek istiyorum', 'возьму с собой… — yanıma … alacağım', 'вернусь через… — … sonra döneceğim'],
      },
      sunday('seyahat'),
    ],
    words: [
      ...list('verb', 'путешествовать = seyahat etmek; поехать / ехать = (araçla) gitmek; полететь / лететь = uçmak; летать = uçmak (gidip gelmek); забронировать / бронировать = rezervasyon yapmak; пересесть / пересаживаться = aktarma yapmak; сесть / садиться = binmek, oturmak; выйти / выходить = inmek, çıkmak; прилететь / прилетать = uçakla varmak; уехать / уезжать = ayrılmak, gitmek; приехать / приезжать = varmak, gelmek; собраться / собираться = hazırlanmak, niyet etmek; упаковать / упаковывать = paketlemek; потерять / терять = kaybetmek; заблудиться = yolunu kaybetmek; посетить / посещать = ziyaret etmek; сфотографировать / фотографировать = fotoğraf çekmek; отправиться / отправляться = yola çıkmak; вернуться / возвращаться = geri dönmek; остановиться / останавливаться = durmak, konaklamak; встретить / встречать = karşılamak; проводить / провожать = uğurlamak'),
      ...list('adj', 'прямой = direkt; международный = uluslararası; внутренний = iç (hat); далёкий = uzak; ближний = yakın; туристический = turistik; незабываемый = unutulmaz; живописный = pitoresk; местный = yerel; иностранный = yabancı; ручной = el (bagajı); комфортный = konforlu; дальний = uzak (yol); обратный = dönüş (sıfat); свободный = boş, serbest; железнодорожный = demiryolu (sıfat); пассажирский = yolcu (sıfat)'),
      ...list('adv', 'вперёд = ileri; назад = geri; налево = sola; направо = sağa; прямо = dümdüz; пешком = yürüyerek; туда = oraya; обратно = geri; сюда = buraya; впереди = önde; сзади = arkada; долго = uzun süre; ненадолго = kısa süreliğine; везде = her yerde; далеко = uzakta'),
    ],
  },
  {
    name: 'Eğitim ve dil öğrenme',
    ru: 'Образование и изучение языков',
    week: [
      {
        title: 'Rusçaya nasıl başladın',
        prompt: 'İlk Rusça kelimen, neden Rusça, SPbGU\'ya nasıl gittin?',
        phrases: ['я начал учить русский, потому что… — Rusça öğrenmeye … için başladım', 'первое слово, которое я выучил — öğrendiğim ilk kelime', 'поступил на подготовительный факультет — hazırlık fakültesine girdim', 'сначала было трудно — başta zordu', 'постепенно я привык — yavaş yavaş alıştım', 'сдал экзамен ТРКИ-1 — ТРКИ-1 sınavını geçtim'],
      },
      {
        title: 'Nasıl çalışıyorsun',
        prompt: 'Şu anki yöntemin: yazma, dinleme, kelime. Neler işe yarıyor, neler yaramıyor?',
        phrases: ['каждый день я пишу… — her gün … yazıyorum', 'слушаю подкасты на работе — işte podcast dinliyorum', 'повторяю слова — kelimeleri tekrar ediyorum', 'лучше всего помогает… — en çok … yardımcı oluyor', 'мне не хватает практики — pratiğim yetersiz', 'я стараюсь говорить с друзьями — arkadaşlarla konuşmaya çalışıyorum'],
      },
      {
        title: 'Unutamadığın bir öğretmen',
        prompt: 'Bir öğretmenini anlat: nasıl ders anlatırdı, sana ne kattı? он/она ile, geçmiş zaman.',
        phrases: ['она объясняла очень понятно — çok anlaşılır anlatırdı', 'он был строгим, но справедливым — sert ama adildi', 'она научила меня… — bana … öğretti', 'на его уроках — onun derslerinde', 'я благодарен ей за… — … için ona minnettarım', 'она верила в меня — bana inanırdı'],
      },
      {
        title: 'Türk ve Rus eğitim sistemi',
        prompt: 'İki sistemi karşılaştır: sınavlar, üniversite, öğrenci hayatı.',
        phrases: ['в Турции… а в России… — Türkiye\'de … Rusya\'da ise…', 'по сравнению с… — …ya kıyasla', 'бесплатное образование — ücretsiz eğitim', 'вступительные экзамены — giriş sınavları', 'на мой взгляд — bana göre', 'и то и другое — her ikisi de'],
      },
      {
        title: 'Lomonosov\'un hayatı',
        prompt: 'Balıkçı köyünden Moskova\'ya yürüyen Lomonosov\'u ya da başka bir Rus bilim insanını anlat.',
        phrases: ['он родился в деревне — köyde doğdu', 'пешком ушёл в Москву — Moskova\'ya yürüyerek gitti', 'поступил в академию — akademiye girdi', 'основал университет — üniversite kurdu', 'занимался физикой и химией — fizik ve kimyayla uğraştı', 'его имя носит… — … onun adını taşıyor'],
      },
      {
        title: 'ТРКИ-2 günü',
        prompt: 'Sınav gününü hayal et: hazırlık, sınav, sonuç. Gelecek zaman.',
        phrases: ['я буду готовиться к… — …ya hazırlanacağım', 'сдам экзамен на «отлично» — sınavı pekiyiyle geçeceğim', 'устная часть — sözlü bölüm', 'письменная часть — yazılı bölüm', 'я не буду волноваться — heyecanlanmayacağım', 'получу сертификат — sertifika alacağım'],
      },
      sunday('dil öğrenme'),
    ],
    words: [
      ...list('verb', 'выучить / учить = ezberlemek, öğrenmek; изучить / изучать = incelemek, öğrenmek; запомнить / запоминать = aklında tutmak; забыть / забывать = unutmak; повторить / повторять = tekrar etmek; понять / понимать = anlamak; объяснить / объяснять = açıklamak; подготовиться / готовиться = hazırlanmak; написать / писать = yazmak; прочитать / читать = okumak; перевести / переводить = çevirmek; произнести / произносить = telaffuz etmek; ошибиться / ошибаться = hata yapmak; заниматься = ders çalışmak, uğraşmak; освоить / осваивать = öğrenip ustalaşmak; проверить / проверять = kontrol etmek; списать / списывать = kopya çekmek; привыкнуть / привыкать = alışmak; сдать / сдавать = (sınav) vermek, geçmek; провалиться / проваливаться = (sınavda) kalmak; стараться = çabalamak; говорить = konuşmak'),
      ...list('adj', 'грамотный = dilbilgisi doğru, bilgili; понятный = anlaşılır; непонятный = anlaşılmaz; устный = sözlü; письменный = yazılı; разговорный = konuşma (dili); способный = yetenekli; внимательный = dikkatli; прилежный = çalışkan (öğrenci); языковой = dil (sıfat); учебный = eğitim, ders (sıfat); правильный = doğru; начальный = başlangıç; средний = orta (seviye); строгий = sert, katı; справедливый = adil; подготовительный = hazırlık (sıfat)'),
      ...list('adv', 'свободно = akıcı; бегло = akıcı, hızlı; правильно = doğru; неправильно = yanlış; внимательно = dikkatle; наизусть = ezbere; вслух = sesli; понятно = anlaşılır; ясно = açık, net; грамотно = doğru (dil); устно = sözlü olarak; письменно = yazılı olarak; по-русски = Rusça; дословно = kelimesi kelimesine; по-английски = İngilizce'),
    ],
  },
  {
    name: 'Boş zaman, spor, hobiler',
    ru: 'Свободное время, спорт, хобби',
    week: [
      {
        title: 'Geçen hafta sonun',
        prompt: 'Cumartesi ve pazar ne yaptın? Saat saat anlat.',
        phrases: ['в субботу утром — cumartesi sabahı', 'я выспался — uykumu aldım', 'мы встретились с друзьями — arkadaşlarla buluştuk', 'провёл весь день… — bütün günü … geçirdim', 'вечером мы пошли в… — akşam …ya gittik', 'я отлично отдохнул — çok iyi dinlendim'],
      },
      {
        title: 'Hobin',
        prompt: 'Boş zamanında ne yaparsın? Nasıl başladın, sana ne veriyor?',
        phrases: ['я увлекаюсь… — …ya merakım var', 'в свободное время — boş zamanımda', 'это помогает мне расслабиться — rahatlamama yardım ediyor', 'я занимаюсь этим уже… — …dır bununla uğraşıyorum', 'меня привлекает… — … beni cezbediyor', 'я трачу на это… — buna … harcıyorum'],
      },
      {
        title: 'Bir taraftarı anlat',
        prompt: 'Futbol ya da başka bir spor tutkunu bir tanıdığın. Maç günü nasıl olur? он/она ile.',
        phrases: ['он болеет за… — …yı tutar', 'не пропускает ни одного матча — hiçbir maçı kaçırmaz', 'когда команда проигрывает — takım kaybedince', 'она знает всех игроков — bütün oyuncuları tanır', 'он кричит перед телевизором — televizyonun karşısında bağırır', 'для него это больше, чем игра — onun için oyundan öte'],
      },
      {
        title: 'Boş zaman mı, ek iş mi',
        prompt: 'Boş zaman lüks mü? Türkiye\'de çalışan biri boş zamanını nasıl korur? Fikrini savun.',
        phrases: ['у меня почти нет свободного времени — neredeyse hiç boş vaktim yok', 'нужно уметь отдыхать — dinlenmeyi bilmek gerek', 'я считаю, что… — …a inanıyorum', 'баланс между работой и жизнью — iş-yaşam dengesi', 'с другой стороны — öte yandan', 'поэтому — bu yüzden'],
      },
      {
        title: 'Bir Rus satranççı ya da sporcu',
        prompt: 'Kasparov, Karpov ya da başka bir Rus şampiyon. Kariyerini anlat.',
        phrases: ['он начал играть в шахматы в… лет — … yaşında satranca başladı', 'стал чемпионом мира — dünya şampiyonu oldu', 'победил в турнире — turnuvayı kazandı', 'проиграл в финале — finalde kaybetti', 'тренировался по восемь часов — günde sekiz saat çalıştı', 'закончил карьеру — kariyerini bitirdi'],
      },
      {
        title: 'Öğrenmek istediğin yeni bir hobi',
        prompt: 'Hangi hobiyi, neden, nasıl başlayacaksın?',
        phrases: ['я давно хотел научиться… — uzun zamandır … öğrenmek istiyordum', 'запишусь на курсы — kursa yazılacağım', 'куплю всё необходимое — gereken her şeyi alacağım', 'буду заниматься по выходным — hafta sonları çalışacağım', 'надеюсь, у меня получится — umarım başarırım', 'это будет интересно — ilginç olacak'],
      },
      sunday('boş zaman'),
    ],
    words: [
      ...list('verb', 'сыграть / играть = oynamak, çalmak; бегать = koşmak; плавать = yüzmek; кататься = (bisiklet, kayak) kaymak, gezmek; интересоваться = ilgilenmek; нарисовать / рисовать = resim yapmak; спеть / петь = şarkı söylemek; танцевать = dans etmek; собрать / собирать = toplamak, biriktirmek; посмотреть / смотреть = izlemek; послушать / слушать = dinlemek; победить / побеждать = yenmek; проиграть / проигрывать = kaybetmek; выиграть / выигрывать = kazanmak; болеть = (takım) tutmak; провести / проводить = (zaman) geçirmek; поймать / ловить = yakalamak (balık); расслабиться / расслабляться = rahatlamak; пригласить / приглашать = davet etmek; встретиться / встречаться = buluşmak; выспаться / высыпаться = uykusunu almak; пропустить / пропускать = kaçırmak'),
      ...list('adj', 'активный = aktif; спортивный = sportif; любимый = en sevilen; азартный = heyecanlı, tutkulu; увлекательный = sürükleyici; скучный = sıkıcı; весёлый = neşeli; командный = takım (sıfat); настольный = masa (oyunu); выходной = tatil (günü); летний = yaz (sıfat); зимний = kış (sıfat); приятный = hoş; интересный = ilginç; редкий = nadir; шахматный = satranç (sıfat); музыкальный = müzikal'),
      ...list('adv', 'весело = eğlenceli; скучно = sıkıcı; интересно = ilginç; приятно = hoş; активно = aktif olarak; летом = yazın; зимой = kışın; весной = ilkbaharda; осенью = sonbaharda; охотно = seve seve; азартно = tutkuyla; вдвоём = iki kişi; втроём = üç kişi; иногда = bazen; часами = saatlerce'),
    ],
  },
  {
    name: 'Medya ve teknoloji',
    ru: 'СМИ и технологии',
    week: [
      {
        title: 'Telefonunla bir günün',
        prompt: 'Telefonunu gün içinde ne için kullanıyorsun? Hangi uygulamalar, kaç saat?',
        phrases: ['первым делом я проверяю… — ilk iş …yı kontrol ederim', 'я сижу в телефоне… — … telefondayım', 'пользуюсь приложением… — … uygulamasını kullanırım', 'пишу сообщения — mesaj yazarım', 'смотрю видео — video izlerim', 'экранное время — ekran süresi'],
      },
      {
        title: 'Haberleri nasıl takip ediyorsun',
        prompt: 'Haberleri nereden alıyorsun? Rusça haber kaynakların var mı?',
        phrases: ['я узнаю новости из… — haberleri …dan öğrenirim', 'подписан на канал… — … kanalına aboneyim', 'читаю заголовки — başlıkları okurum', 'доверять источнику — kaynağa güvenmek', 'фейковые новости — sahte haberler', 'по телевизору — televizyonda'],
      },
      {
        title: 'Teknolojiden anlayan birini anlat',
        prompt: 'Her şeyi tamir eden ya da hep yeni cihaz alan bir tanıdığın. он/она ile.',
        phrases: ['он разбирается в компьютерах — bilgisayardan anlar', 'она всегда покупает новые гаджеты — hep yeni cihaz alır', 'он настроил мне… — bana … kurdu', 'она ведёт блог — blog yazıyor', 'у него тысячи подписчиков — binlerce takipçisi var', 'он не может без интернета — internetsiz yapamaz'],
      },
      {
        title: 'Sosyal medya: iyi mi kötü mü',
        prompt: 'Sosyal medyanın artıları ve eksileri. Kendi fikrini gerekçeleriyle yaz.',
        phrases: ['социальные сети — sosyal ağlar', 'с одной стороны… с другой стороны — bir yandan… öte yandan', 'зависимость от телефона — telefon bağımlılığı', 'это позволяет… — bu … imkânı verir', 'я убеждён, что… — eminim ki…', 'в конечном счёте — sonuç olarak'],
      },
      {
        title: 'Bir Rus mucit',
        prompt: 'Popov (radyo), Zworykin (televizyon) ya da Pajitnov (Tetris). Hikâyesini anlat.',
        phrases: ['он изобрёл… — …yı icat etti', 'изобретение изменило мир — icat dünyayı değiştirdi', 'работал над… — … üzerinde çalıştı', 'эмигрировал в… — …ya göç etti', 'его игра стала популярной — oyunu popüler oldu', 'он получил признание — tanındı'],
      },
      {
        title: '2035\'te bir gün',
        prompt: 'Yapay zekâ, akıllı ev, dijital laboratuvar. 2035\'te bir günün nasıl geçecek?',
        phrases: ['искусственный интеллект — yapay zekâ', 'роботы будут делать… — robotlar … yapacak', 'всё будет работать автоматически — her şey otomatik çalışacak', 'я смогу… — …abileceğim', 'боюсь, что… — korkarım ki…', 'жизнь станет проще — hayat kolaylaşacak'],
      },
      sunday('medya ve teknoloji'),
    ],
    words: [
      ...list('verb', 'скачать / скачивать = indirmek; загрузить / загружать = yüklemek; установить / устанавливать = kurmak; удалить / удалять = silmek; найти / искать = bulmak / aramak; переслать / пересылать = iletmek; отправить / отправлять = göndermek; позвонить / звонить = aramak (telefon); подписаться / подписываться = abone olmak; опубликовать / публиковать = yayınlamak; обсудить / обсуждать = tartışmak, konuşmak; сообщить / сообщать = bildirmek; распространить / распространять = yaymak; обновить / обновлять = güncellemek; зависнуть / зависать = donmak (cihaz); сохранить / сохранять = kaydetmek; воспользоваться / пользоваться = kullanmak; нажать / нажимать = basmak; зарядить / заряжать = şarj etmek; поверить / верить = inanmak; изобрести / изобретать = icat etmek; разбираться = anlamak (bir konudan)'),
      ...list('adj', 'новый = yeni; последний = son; цифровой = dijital; социальный = sosyal; мобильный = mobil; беспроводный = kablosuz; надёжный = güvenilir; ложный = yanlış, sahte; достоверный = doğru, güvenilir; популярный = popüler; бесполезный = faydasız; зависимый = bağımlı; электронный = elektronik; умный = akıllı; виртуальный = sanal; искусственный = yapay; технический = teknik'),
      ...list('adv', 'бесконечно = sonsuzca; удобно = rahat, kullanışlı; надёжно = güvenle; случайно = yanlışlıkla, tesadüfen; публично = herkesin önünde; открыто = açıkça; анонимно = anonim olarak; сейчас = şimdi; сегодня = bugün; вчера = dün; автоматически = otomatik olarak; мгновенно = anında; бесплатно = ücretsiz; круглосуточно = gece gündüz, 7/24; заново = yeniden'),
    ],
  },
  {
    name: 'Kültür ve sanat',
    ru: 'Культура и искусство',
    week: [
      {
        title: 'Son izlediğin film ya da dizi',
        prompt: 'Konusu ne, kimler oynuyor, beğendin mi? Spoiler vermeden anlat.',
        phrases: ['фильм рассказывает о… — film … hakkında', 'главную роль играет… — başrolde … oynuyor', 'действие происходит в… — olaylar …da geçiyor', 'мне понравилось, как… — …ı beğendim', 'концовка — final, son', 'советую посмотреть — izlemeni tavsiye ederim'],
      },
      {
        title: 'Seni etkileyen bir kitap',
        prompt: 'Hangi kitap, ne zaman okudun, sende ne değiştirdi?',
        phrases: ['эта книга произвела на меня впечатление — bu kitap beni etkiledi', 'автор описывает… — yazar …yı anlatıyor', 'главный герой — ana karakter', 'я прочитал её за… — onu …da okudum', 'меня тронуло… — … bana dokundu', 'я перечитывал её несколько раз — birkaç kez tekrar okudum'],
      },
      {
        title: 'Sanatçı bir tanıdığın',
        prompt: 'Resim yapan, müzik çalan ya da yazan biri. Eserleri nasıl? он/она ile.',
        phrases: ['он играет на гитаре — gitar çalar', 'она пишет стихи — şiir yazar', 'у неё настоящий талант — gerçek bir yeteneği var', 'он выступал на сцене — sahnede performans yaptı', 'её картины висят в… — tabloları …da asılı', 'он сам сочиняет музыку — müziği kendisi besteler'],
      },
      {
        title: 'Sanat herkes için mi',
        prompt: 'Müzeler, tiyatrolar pahalı mı? Devlet sanatı desteklemeli mi? Fikrini savun.',
        phrases: ['искусство должно быть доступным — sanat erişilebilir olmalı', 'государство должно поддерживать… — devlet …yı desteklemeli', 'билеты слишком дорогие — biletler çok pahalı', 'я не согласен с тем, что… — …a katılmıyorum', 'во-первых… во-вторых… — birincisi… ikincisi…', 'таким образом — böylece'],
      },
      {
        title: 'Çehov, Dostoyevski ya da Çaykovski',
        prompt: 'Bir Rus sanatçının hayatını anlat; bilmediğin yerleri uydur.',
        phrases: ['он написал… — … yazdı', 'его произведения переведены на… — eserleri …ya çevrildi', 'он был врачом по профессии — mesleği doktordu', 'вдохновлялся… — …dan ilham aldı', 'его музыку знают во всём мире — müziğini bütün dünya biliyor', 'при жизни он был… — hayattayken … idi'],
      },
      {
        title: 'Petersburg\'da bir kültür günü',
        prompt: 'Ermitaj, Mariinski, bir konser. İdeal kültür gününü planla.',
        phrases: ['утром схожу в Эрмитаж — sabah Ermitaj\'a giderim', 'посмотрю балет — bale izlerim', 'куплю билеты заранее — biletleri önceden alırım', 'на выставке современного искусства — çağdaş sanat sergisinde', 'вечером пойду на концерт — akşam konsere giderim', 'это будет мечта — rüya gibi olur'],
      },
      sunday('kültür ve sanat'),
    ],
    words: [
      ...list('verb', 'создать / создавать = yaratmak; исполнить / исполнять = icra etmek, seslendirmek; сняться / сниматься = (filmde) oynamak; изобразить / изображать = tasvir etmek; вдохновить / вдохновлять = ilham vermek; восхищаться = hayran olmak; поразить / поражать = şaşırtmak, etkilemek; понравиться / нравиться = hoşuna gitmek; похвалить / хвалить = övmek; критиковать = eleştirmek; оценить / оценивать = değerlendirmek; аплодировать = alkışlamak; выставить / выставлять = sergilemek; сочинить / сочинять = bestelemek, yazmak; описать / описывать = betimlemek; отразить / отражать = yansıtmak; развить / развивать = geliştirmek; тронуть / трогать = dokunmak, duygulandırmak; выступить / выступать = sahneye çıkmak; перечитать / перечитывать = yeniden okumak; поставить / ставить = sahnelemek, koymak; рассказать / рассказывать = anlatmak'),
      ...list('adj', 'известный = tanınmış; знаменитый = ünlü; талантливый = yetenekli; гениальный = dahiyane; классический = klasik; художественный = sanatsal; театральный = tiyatro (sıfat); литературный = edebi; трогательный = dokunaklı; глубокий = derin; яркий = canlı, parlak; народный = halk (sıfat); бездарный = yeteneksiz; впечатляющий = etkileyici; главный = ana, baş; современный = çağdaş; оригинальный = özgün'),
      ...list('adv', 'красиво = güzel; талантливо = yetenekle; ярко = canlı; глубоко = derinden; искренне = içtenlikle; гениально = dahice; трогательно = dokunaklı; громко = yüksek sesle; тихо = sessizce; особенно = özellikle; прекрасно = harika; ужасно = berbat, korkunç; живо = canlı; посмертно = ölümünden sonra; заслуженно = hak ederek'),
    ],
  },
  {
    name: 'Doğa, iklim, ekoloji',
    ru: 'Природа, климат, экология',
    week: [
      {
        title: 'Bugünkü hava ve mevsim',
        prompt: 'Bugün hava nasıl? En sevdiğin mevsim hangisi, neden?',
        phrases: ['сегодня солнечно — bugün güneşli', 'идёт дождь — yağmur yağıyor', 'дует сильный ветер — sert rüzgâr esiyor', 'на улице холодно — dışarısı soğuk', 'моё любимое время года — en sevdiğim mevsim', 'я терпеть не могу жару — sıcağa dayanamam'],
      },
      {
        title: 'Doğada bir günün',
        prompt: 'Dağ, orman ya da deniz kenarında geçirdiğin bir günü anlat.',
        phrases: ['мы поехали за город — şehir dışına çıktık', 'гуляли по лесу — ormanda yürüdük', 'купались в море — denizde yüzdük', 'развели костёр — ateş yaktık', 'свежий воздух — temiz hava', 'я почувствовал себя свободным — kendimi özgür hissettim'],
      },
      {
        title: 'Doğayı seven birini anlat',
        prompt: 'Çevreye duyarlı, kamp yapan ya da bahçeyle uğraşan bir tanıdığın. он/она ile.',
        phrases: ['она сортирует мусор — çöpünü ayrıştırır', 'он выращивает овощи — sebze yetiştirir', 'она не пользуется пакетами — poşet kullanmaz', 'он ездит на велосипеде — bisiklete biner', 'она волонтёр в… — …da gönüllü', 'он часто ходит в походы — sık sık kampa gider'],
      },
      {
        title: 'İklim değişikliği',
        prompt: 'Türkiye\'de iklim değişikliğinin etkileri. Ne yapılmalı? Fikrini savun.',
        phrases: ['глобальное потепление — küresel ısınma', 'засуха — kuraklık', 'лесные пожары — orman yangınları', 'нужно сократить выбросы — emisyonları azaltmak gerek', 'каждый из нас может… — her birimiz …abiliriz', 'если ничего не делать — hiçbir şey yapılmazsa'],
      },
      {
        title: 'Baykal gölü ya da Sibirya',
        prompt: 'Baykal\'ı ya da Sibirya\'da yaşayan birini anlat: iklim, doğa, hayat.',
        phrases: ['Байкал — самое глубокое озеро в мире — Baykal dünyanın en derin gölü', 'зимой озеро замерзает — kışın göl donar', 'температура опускается до… — sıcaklık …ya düşer', 'здесь водятся… — burada … yaşar', 'местные жители — yerli halk', 'природа здесь суровая — doğa burada sert'],
      },
      {
        title: 'Yeşil bir gelecek',
        prompt: '20 yıl sonra şehrin nasıl olsun? Sen kendi hayatında neyi değiştireceksin?',
        phrases: ['я начну экономить воду — su tasarrufuna başlayacağım', 'будет больше парков — daha çok park olacak', 'электромобили заменят… — elektrikli arabalar …nın yerini alacak', 'солнечная энергия — güneş enerjisi', 'я перестану покупать… — … almayı bırakacağım', 'это зависит от нас — bu bize bağlı'],
      },
      sunday('doğa ve iklim'),
    ],
    words: [
      ...list('verb', 'загрязнить / загрязнять = kirletmek; охранять = korumak; сберечь / беречь = korumak, sakınmak; выбросить / выбрасывать = atmak; переработать / перерабатывать = geri dönüştürmek; рассортировать / сортировать = ayrıştırmak; вырубить / вырубать = (ağaç) kesmek; посадить / сажать = dikmek; растаять / таять = erimek; замёрзнуть / замерзать = donmak; дуть = esmek; светить = parlamak; греть = ısıtmak; вымереть / вымирать = nesli tükenmek; исчезнуть / исчезать = yok olmak; угрожать = tehdit etmek; нагреться / нагреваться = ısınmak; затопить / затоплять = su basmak; спасти / спасать = kurtarmak; страдать = acı çekmek; потеплеть = havanın ısınması; похолодать = havanın soğuması; израсходовать / расходовать = harcamak, tüketmek; вырастить / выращивать = yetiştirmek'),
      ...list('adj', 'экологический = ekolojik; природный = doğal; дикий = vahşi; солнечный = güneşli; дождливый = yağmurlu; снежный = karlı; облачный = bulutlu; ветреный = rüzgârlı; жаркий = sıcak (hava); холодный = soğuk; тёплый = ılık; влажный = nemli; сухой = kuru; морской = deniz (sıfat); лесной = orman (sıfat); глобальный = küresel; суровый = sert, çetin'),
      ...list('adv', 'жарко = sıcak; холодно = soğuk; тепло = ılık; прохладно = serin; солнечно = güneşli; пасмурно = kapalı (hava); ветрено = rüzgârlı; сыро = rutubetli; душно = boğucu; морозно = ayazlı; скользко = kaygan; грязно = kirli; чисто = temiz; бережно = özenle, koruyarak; навсегда = sonsuza dek'),
    ],
  },
  {
    name: 'Toplum, aile, gelenekler',
    ru: 'Общество, семья, традиции',
    week: [
      {
        title: 'Ailen',
        prompt: 'Aileni tanıt: kimler var, ne iş yapıyorlar, nerede yaşıyorlar?',
        phrases: ['у меня большая семья — kalabalık bir ailem var', 'мои родители живут в… — ailem …da yaşıyor', 'я младший сын — en küçük oğlum', 'мы часто собираемся вместе — sık sık bir araya geliriz', 'я очень близок с… — … ile çok yakınım', 'семья для меня — это… — aile benim için …'],
      },
      {
        title: 'Bir bayram ya da düğün',
        prompt: 'Ailende bir bayramı ya da katıldığın bir düğünü anlat.',
        phrases: ['мы празднуем… — … kutlarız', 'вся семья собирается за столом — bütün aile sofrada toplanır', 'по традиции — geleneğe göre', 'дети целуют руки старшим — çocuklar büyüklerin elini öper', 'дарить подарки — hediye vermek', 'свадьба длилась три дня — düğün üç gün sürdü'],
      },
      {
        title: 'Büyükanneni ya da büyükbabanı anlat',
        prompt: 'Hayatı, karakteri, sana öğrettikleri. он/она ile, geçmiş zaman.',
        phrases: ['моя бабушка родилась в… — anneannem …da doğdu', 'он прожил долгую жизнь — uzun bir ömür sürdü', 'она рассказывала нам сказки — bize masal anlatırdı', 'он научил меня… — bana … öğretti', 'она была очень заботливой — çok şefkatliydi', 'я часто вспоминаю его — onu sık sık hatırlarım'],
      },
      {
        title: 'Gelenekler değişiyor mu',
        prompt: 'Eski ve yeni nesil: evlilik, aile, büyüklere saygı. Neler değişti, iyi mi kötü mü?',
        phrases: ['раньше было принято… — eskiden … âdetti', 'сегодня молодёжь… — bugün gençler…', 'поколение — kuşak', 'уважение к старшим — büyüklere saygı', 'я думаю, что это нормально — bence bu normal', 'традиции нужно сохранять — gelenekler korunmalı'],
      },
      {
        title: 'Rus Yeni Yılı ya da Maslenitsa',
        prompt: 'Bir Rus ailesinin Yeni Yıl ya da Maslenitsa kutlamasını anlat.',
        phrases: ['Новый год — главный праздник — Yeni Yıl en önemli bayram', 'наряжают ёлку — yılbaşı ağacı süslenir', 'Дед Мороз приносит подарки — Ayaz Dede hediye getirir', 'на Масленицу пекут блины — Maslenitsa\'da krep pişirilir', 'в полночь — gece yarısı', 'загадывают желание — dilek tutarlar'],
      },
      {
        title: 'Kendi kuracağın aile',
        prompt: 'İleride nasıl bir aile hayatı istiyorsun? Hangi gelenekleri sürdüreceksin?',
        phrases: ['я хочу, чтобы мои дети… — çocuklarımın … istiyorum', 'буду воспитывать… — … yetiştireceğim', 'сохраню традицию… — … geleneğini sürdüreceğim', 'мы будем вместе праздновать — birlikte kutlayacağız', 'главное — взаимное уважение — önemli olan karşılıklı saygı', 'дети будут говорить по-русски — çocuklar Rusça konuşacak'],
      },
      sunday('aile ve gelenekler'),
    ],
    words: [
      ...list('verb', 'отпраздновать / праздновать = kutlamak; отметить / отмечать = kutlamak, işaretlemek; поздравить / поздравлять = tebrik etmek; подарить / дарить = hediye etmek; развестись / разводиться = boşanmak; воспитать / воспитывать = yetiştirmek, terbiye etmek; уважать = saygı duymak; позаботиться / заботиться = ilgilenmek, bakmak; поссориться / ссориться = kavga etmek; помириться / мириться = barışmak; помочь / помогать = yardım etmek; доверять = güvenmek; соблюсти / соблюдать = uymak (geleneğe); угостить / угощать = ikram etmek; навестить / навещать = ziyaret etmek; познакомиться / знакомиться = tanışmak; расстаться / расставаться = ayrılmak; обидеться / обижаться = gücenmek; простить / прощать = affetmek; родить / рожать = doğurmak; ухаживать = bakmak, kur yapmak; собраться / собираться = toplanmak'),
      ...list('adj', 'семейный = aile (sıfat); близкий = yakın; дальний = uzak (akraba); традиционный = geleneksel; религиозный = dindar, dini; праздничный = bayram (sıfat); свадебный = düğün (sıfat); дружный = birbirine bağlı; многодетный = çok çocuklu; единственный = tek; заботливый = şefkatli; вежливый = kibar; гостеприимный = misafirperver; равный = eşit; общественный = toplumsal; новогодний = yılbaşı (sıfat); старинный = eski, köklü'),
      ...list('adv', 'дружно = el birliğiyle; вежливо = kibarca; строго = sıkı, sert; честно = dürüstçe; справедливо = adilce; традиционно = geleneksel olarak; взаимно = karşılıklı; торжественно = törenle; ежегодно = her yıl; издавна = eskiden beri; по-прежнему = eskisi gibi; навсегда = sonsuza dek; заботливо = şefkatle; уважительно = saygıyla; тепло = sıcak, içten'),
    ],
  },
]

export const DAY_NAMES = DAYS
export const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export const packByName = (name: string) => THEME_PACKS.find((p) => p.name === name)

/** Bugünün günü: Pazartesi = 0 … Pazar = 6 */
export const todayIndex = (d = new Date()) => (d.getDay() + 6) % 7

/** Fiil çiftini ayrı lemmalara böl */
export const lemmasOf = (w: ThemeWord) => w.ru.split('/').map((x) => x.trim())
