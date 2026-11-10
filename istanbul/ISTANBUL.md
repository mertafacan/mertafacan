# İstanbul: 2700 Yıllık Zaman Atlaması

Yatay (16:9), 30 fps, **11.7 dakika** (21018 kare). Anlatıcı yok: müzik, efektler ve Türkçe ekran yazıları. Referans videodaki gibi düşük poligonlu sıcak renkli 3B şehir; yıl, nüfus, imparatorluk, minik harita ve olay kartı ekranda.

## Nasıl yapıldı
- **Gerçek arazi:** AWS Terrain Tiles (ücretsiz, anahtarsız) yükseklik verisi → Boğaz, Haliç, Marmara, Adalar ve tepeler gerçek.
- **Blender (`scene.py`):** arazi ve tüm yapılar (Ayasofya, Sultanahmet, Süleymaniye, surlar, Galata Kulesi, köprüler...) basit şekillerden kodla kuruldu, ink çizgili; `data/world.glb` olarak dışa aktarıldı.
- **Şehir büyümesi (`city.py`):** 150 bin ev, 60 bin ağaç; her evin bir yapım yılı var, kent çekirdeklerinden (Sarayburnu, Galata, Üsküdar, Kadıköy...) yarıçap tablolarıyla büyür.
- **Zaman çizelgesi (`timeline.mjs`):** `events.json` → her kare için yıl, kamera, ekran yazıları, olay animasyonları (gemiler karadan yürür, kuşatma, yangın...).
- **Render (`render.html`):** three.js, toon gölgeleme; yıl ilerledikçe evler büyüyerek çıkar. Ekran yazıları HTML ile çizilir.
- **Ses (`audio/mix.py`):** 6 ücretsiz Mixkit parçası çapraz geçişle, olay anlarında efektler, −14 LUFS.

## Olaylar ve zamanları

| süre | yıl | olay | açıklama |
|---|---|---|---|
| 0:10 | MÖ 660  | **BYZANTION KURULUYOR** | Megaralı Byzas ve kolonistleri, Sarayburnu'nda üç yanı denizle çevrili küçük bir liman kenti kurar. |
| 0:37 | MÖ 513  | **DAREİOS'UN TEKNE KÖPRÜSÜ** | Pers kralı I. Dareios, Boğaz'ı yan yana dizilmiş teknelerle geçer ve ordusunu Trakya'ya taşır. |
| 1:03 | 203  | **HİPODROM VE YENİ SURLAR** | Septimius Severus şehri yeniden kurar; 196'da yıkılan Byzantion'a dev bir Hipodrom ve yeni surlar kazandırır. |
| 1:29 | 330 11 Mayıs | **KONSTANTİNOPOLİS: YENİ ROMA** | İmparator I. Konstantin kenti Roma'nın yeni başkenti ilan eder. Nüfus ve şehir hızla büyümeye başlar. |
| 1:57 | 413  | **THEODOSİUS SURLARI** | II. Theodosius kenti kara tarafında 6 km'lik çifte surla çevirir. Bu surlar bin yıl boyunca aşılamaz. |
| 2:25 | 532 Ocak | **NİKA İSYANI** | Hipodromdaki isyan şehri alevler içinde bırakır. Yangın, Ayasofya'nın yeniden inşasının yolunu açar. |
| 2:48 | 537 27 Aralık | **AYASOFYA AÇILIYOR** | Beş yılda tamamlanan Ayasofya, yüzlerce yıl boyunca dünyanın en büyük kubbeli yapısı olacaktır. |
| 3:21 | 626 Temmuz-Ağustos | **AVAR VE PERS KUŞATMASI** | Avarlar ve Persler denizden ve karadan saldırır; şehir surlarına ve donanmasına güvenerek dayanır. |
| 3:46 | 717  | **ARAP KUŞATMASI** | Emevi donanması Marmara'ya girer. Rum ateşi kullanan Bizans gemileri kuşatmayı kırar. |
| 4:11 | 1204 13 Nisan | **DÖRDÜNCÜ HAÇLI SEFERİ** | Haçlılar ve Venedik donanması şehri ele geçirip yağmalar. Kent bir süre Latin İmparatorluğu'nun başkenti olur. |
| 4:37 | 1261 25 Temmuz | **BİZANS ŞEHRİ GERİ ALIYOR** | VIII. Mikhael Palaiologos şehre yeniden girer. Ama kent artık harap ve nüfusu eriyip gitmiştir. |
| 4:59 | 1348  | **GALATA'DA CENEVİZ KULESİ** | Haliç'in karşı kıyısında Cenevizli tüccarlar Galata'yı sur ve kuleyle donatır; ticaret yeniden canlanır. |
| 5:23 | 1452 Ağustos | **RUMELİ HİSARI** | Fatih Sultan Mehmed, Boğaz'ın en dar yerinde dört ayda dev bir kale yaptırır ve Karadeniz yolunu keser. |
| 5:44 | 1453 22 Nisan | **GEMİLER KARADAN YÜRÜYOR** | Haliç'in girişi zincirle kapalıdır. Osmanlı donanması yağlanmış kaydırakların üstünde tepeyi aşıp Haliç'e iner. |
| 6:13 | 1453 29 Mayıs | **İSTANBUL'UN FETHİ** | 53 günlük kuşatmanın ardından Osmanlı ordusu surları aşar. Konstantinopolis bir imparatorluğun başkenti İstanbul olur. |
| 6:48 | 1478  | **TOPKAPI SARAYI** | Sarayburnu'nda yükselen saray, dört yüzyıl boyunca Osmanlı imparatorluğunun yönetim merkezi olacaktır. |
| 7:13 | 1557  | **SÜLEYMANİYE CAMİİ** | Mimar Sinan, Kanuni Sultan Süleyman için Haliç'e hâkim tepede kubbesi ve dört minaresiyle bir başyapıt yükseltir. |
| 7:41 | 1616  | **SULTANAHMET CAMİİ** | I. Ahmed'in emriyle altı minareli cami Ayasofya'nın karşısına yükselir; İstanbul'un silueti tamamlanır. |
| 8:07 | 1856  | **BOĞAZ KIYILARINDA YENİ SARAYLAR** | Galata Köprüsü (1845) iki yakayı bağlar; Batılı tarzda Dolmabahçe Sarayı Boğaz kıyısında yükselir. |
| 8:32 | 1908  | **HAYDARPAŞA GARI** | Demiryolu İstanbul'u Anadolu'ya bağlar. Buharlı vapurlar Boğaz'ı iki kıyı arasında mekik dokur. |
| 8:54 | 1923 29 Ekim | **CUMHURİYET İLAN EDİLİYOR** | Kurtuluş Savaşı'nın ardından Türkiye Cumhuriyeti kurulur. Başkent Ankara olur; İstanbul ülkenin en büyük şehri olarak kalır. |
| 9:19 | 1973 30 Ekim | **BOĞAZİÇİ KÖPRÜSÜ** | İki kıta, ilk kez kalıcı bir köprüyle birleşir. Şehir göçle hızla büyür; nüfus birkaç on yılda katlanır. |
| 9:45 | 2000  | **ŞEHRİN YÜKSELEN SİLUETİ** | Levent ve Maslak'ta gökdelenler yükselir; Fatih Sultan Mehmed Köprüsü ve çevre yolları şehri kuzeye doğru taşır. |
| 10:08 | 2013 29 Ekim | **MARMARAY: DENİZİN ALTINDAN** | Boğaz'ın altından geçen tüp tünel iki yakayı raylı sistemle bağlar; günde milyonlarca kişi iki kıta arasında gidip gelir. |
| 10:29 | 2016 26 Ağustos | **YAVUZ SULTAN SELİM KÖPRÜSÜ** | Boğaz'ın kuzeyinde 322 metre yüksekliğindeki kuleleriyle dünyanın en yüksek köprü ayaklarından biri açılır. |
| 10:50 | 2018 29 Ekim | **İSTANBUL HAVALİMANI** | Karadeniz kıyısında kurulan dev havalimanı, İstanbul'u dünyanın en önemli aktarma merkezlerinden biri yapar. |
| 11:11 | 2025  | **İKİ KITANIN ŞEHRİ** | Yaklaşık 2700 yılda bir liman kasabasından 15 milyonluk bir metropole. İstanbul hâlâ iki kıtayı ve binlerce yılı birbirine bağlıyor. |

## Notlar
- Nüfus değerleri yaklaşık tahminlerdir (ekranda ≈).
- Kartlardaki küçük resimler kodla çizilmiş stilize çizimlerdir; fotoğraf ya da indirilmiş görsel yok.
- Binalar ve dokular stilize; yapıların konumu gerçek koordinatlara dayanır, ayrıntıları basitleştirilmiştir.
- Müzik ve efektler Mixkit lisansı altındadır.
