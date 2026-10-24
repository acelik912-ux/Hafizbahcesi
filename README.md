# Hafız Bahçesi
Ayrı uygulama: kapıdan bahçeye gir, ağaca yaklaş, tırman, meyveleri sırayla topla, sayfa açılsın.
## Görsel değiştirme (yüksek kalite)
assets/agac/agac_NN.png  – meyvesiz ağaç (şeffaf arka plan)
assets/meyve/meyve_NN_0..4.png – siyah, kırmızı, sarı, yeşil, lacivert meyve
assets/sahne/*.png – kapı, zemin, ışık
Aynı adla değiştirmek yeterli. Meyve konumları src/data.json içindeki "anch" alanındadır.
## APK
GitHub > Actions > Android APK > Run workflow

## Yeni gerçekçi görselleri yükleme (adım adım)
1. Canva'dan indir ve şu adlarla GitHub'a yükle (aynı adlı dosyanın üstüne yaz):
   - `assets/agac/agac_01.png … agac_20.png` – meyvesiz, gerçekçi ağaç, **şeffaf arka planlı PNG**, tercihen 1080×1440 veya büyük
   - `assets/sahne/sahne_01_kapi_eller.png` – kapıya dokunan eller (1080×1920)
   - `assets/sahne/sahne_03_bahce_zemin.png` – boş bahçe: ufuk, çimen, taş patika (1080×1920, ağaçsız)
2. `python3 araclar/hazirla.py --onizle` çalıştır: her ağaçtaki ayet sayısı kadar meyve konumunu
   otomatik seçer (`src/data.json`) ve `araclar/onizle/NN.png` içinde kontrol için çizer.
3. Konum beğenilmezse `src/data.json` içindeki o ağacın `anch` değerleri elle düzeltilebilir.

Meyve renk sırası: 1. siyah, 2. kırmızı, 3. sarı, 4. yeşil, 5. lacivert, sonra tekrar (12 ayet = 5+5+2).
