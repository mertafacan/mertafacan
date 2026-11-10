import json
from pathlib import Path
R = Path(__file__).resolve().parent.parent
ev = json.load(open(R / 'events.json', encoding='utf8')); meta = json.load(open(R / 'data/meta.json')); by = {e['id']: e for e in ev['events']}
def fy(y): return f'MÖ {-y}' if y < 0 else str(y)
def mmss(t): return f'{int(t // 60)}:{int(t % 60):02d}'
o = ['# İstanbul: 2700 Yıllık Zaman Atlaması\n',
 f"Yatay (16:9), {meta['fps']} fps, **{meta['duration']/60:.1f} dakika** ({meta['frames']} kare). Anlatıcı yok: müzik, efektler ve Türkçe ekran yazıları. Referans videodaki gibi düşük poligonlu sıcak renkli 3B şehir; yıl, nüfus, imparatorluk, minik harita ve olay kartı ekranda.\n",
 '## Nasıl yapıldı\n- **Gerçek arazi:** AWS Terrain Tiles (ücretsiz, anahtarsız) yükseklik verisi → Boğaz, Haliç, Marmara, Adalar ve tepeler gerçek.\n- **Blender (`scene.py`):** arazi ve tüm yapılar (Ayasofya, Sultanahmet, Süleymaniye, surlar, Galata Kulesi, köprüler...) basit şekillerden kodla kuruldu, ink çizgili; `data/world.glb` olarak dışa aktarıldı.\n- **Şehir büyümesi (`city.py`):** 150 bin ev, 60 bin ağaç; her evin bir yapım yılı var, kent çekirdeklerinden (Sarayburnu, Galata, Üsküdar, Kadıköy...) yarıçap tablolarıyla büyür.\n- **Zaman çizelgesi (`timeline.mjs`):** `events.json` → her kare için yıl, kamera, ekran yazıları, olay animasyonları (gemiler karadan yürür, kuşatma, yangın...).\n- **Render (`render.html`):** three.js, toon gölgeleme; yıl ilerledikçe evler büyüyerek çıkar. Ekran yazıları HTML ile çizilir.\n- **Ses (`audio/mix.py`):** 6 ücretsiz Mixkit parçası çapraz geçişle, olay anlarında efektler, −14 LUFS.\n',
 '## Olaylar ve zamanları\n\n| süre | yıl | olay | açıklama |\n|---|---|---|---|']
for s in meta['schedule']:
    e = by[s['id']]; o.append(f"| {mmss(s['tHold'])} | {fy(e['year'])} {e['date']} | **{e['title']}** | {e['desc']} |")
o.append('\n## Notlar\n- Nüfus değerleri yaklaşık tahminlerdir (ekranda ≈).\n- Kartlardaki küçük resimler kodla çizilmiş stilize çizimlerdir; fotoğraf ya da indirilmiş görsel yok.\n- Binalar ve dokular stilize; yapıların konumu gerçek koordinatlara dayanır, ayrıntıları basitleştirilmiştir.\n- Müzik ve efektler Mixkit lisansı altındadır.\n')
(R / 'ISTANBUL.md').write_text('\n'.join(o), encoding='utf8'); print('ok')
