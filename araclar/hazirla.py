#!/usr/bin/env python3
"""Hafız Bahçesi - görsel hazırlama aracı.

Yeni (gerçekçi) ağaç PNG'lerini assets/agac/agac_NN.png olarak koyduktan sonra çalıştır:
    python3 araclar/hazirla.py            # src/data.json'daki aspect + meyve konumlarını yeniden üretir
    python3 araclar/hazirla.py --onizle   # her ağaç için araclar/onizle/NN.png (meyve noktaları çizili) üretir

Her ağaçta, o sayfadaki ayet sayısı kadar meyve konumu (anch) ağacın yaprak/gövde yoğunluğundan
otomatik seçilir. Konumlar aşağıdan yukarıya, soldan sağa zikzakla sıralanır: tırmanış alttan başlar.
Meyve rengi sırası uygulamada i % 5 (siyah, kırmızı, sarı, yeşil, lacivert).
"""
import json, sys, os, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'src', 'data.json')
AGAC = os.path.join(ROOT, 'assets', 'agac')
COLORS = [(20, 20, 20), (220, 30, 30), (240, 200, 30), (40, 170, 60), (25, 40, 130)]


def canopy_points(img, n):
    """img: RGBA. Dönen: (aspect, [[x,y]...] 0..1 tam görsel koordinatı, fw)"""
    W0, H0 = img.size
    sc = min(1.0, 360.0 / max(W0, H0))
    small = img.convert('RGBA').resize((max(1, int(W0 * sc)), max(1, int(H0 * sc))), Image.LANCZOS) if sc < 1 else img.convert('RGBA')
    W, H = small.size
    a = np.asarray(small).astype(int)
    alpha = a[..., 3] > 200
    ys, xs = np.where(alpha)
    if len(xs) == 0:
        raise SystemExit('Şeffaf olmayan piksel yok: ' + str(img.size))
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    # yaprak maskesi: yeşil/gri-yeşil baskın (gövde kahverengi: kırmızı > yeşil). Boşlukları kapat.
    leaf = alpha & (a[..., 1] >= a[..., 0] - 3)
    leaf = ndi.binary_closing(leaf, iterations=max(2, int(bw * 0.03))) & alpha
    leaf[int(y0 + bh * 0.80):, :] = False
    lab, nl = ndi.label(leaf)
    if nl > 1:
        sizes = ndi.sum(leaf, lab, range(1, nl + 1)); leaf = lab == (1 + int(np.argmax(sizes)))
    m = leaf if leaf.sum() >= n * 80 else alpha & (np.arange(H)[:, None] < y0 + bh * 0.7)
    cw = max(1, int(m.any(0).sum()))
    r = max(2, int(cw * 0.07))
    core = ndi.binary_erosion(m, iterations=r)
    if core.sum() < n * 40:
        core = ndi.binary_erosion(m, iterations=max(1, r // 2))
    if core.sum() < n * 15:
        core = m
    cy, cx = np.where(core)
    area = len(cx)
    # tutarlı (tohumlu) farthest-point örnekleme: önce yoğunluk merkezine en yakın, sonra en uzak noktalar
    rng = np.random.default_rng(7)
    idx = rng.choice(len(cx), size=min(len(cx), 6000), replace=False)
    P = np.stack([cx[idx], cy[idx]], 1).astype(float)
    # y ekseni biraz daha ağır: dikeyde de yayılsın
    Ps = P * np.array([1.0, 1.25])
    chosen = [int(np.argmin(((Ps - Ps.mean(0)) ** 2).sum(1)))]
    d = ((Ps - Ps[chosen[0]]) ** 2).sum(1)
    for _ in range(n - 1):
        j = int(np.argmax(d)); chosen.append(j)
        d = np.minimum(d, ((Ps - Ps[j]) ** 2).sum(1))
    pts = P[chosen]
    # alttan yukarı, satır bandı içinde soldan sağa/sağdan sola zikzak
    rows = max(2, int(round(math.sqrt(n * 1.3))))
    order = np.argsort(-pts[:, 1])
    pts = pts[order]
    bands = np.array_split(np.arange(len(pts)), rows)
    out = []
    for bi, b in enumerate(bands):
        seg = pts[b]
        seg = seg[np.argsort(seg[:, 0])]
        if bi % 2: seg = seg[::-1]
        out.extend(seg.tolist())
    pts = np.array(out)
    spacing = math.sqrt(area / max(n, 1))
    fw = float(np.clip(0.55 * spacing / W, 0.055, 0.15))
    return W / H, [[round(x / W, 3), round(y / H, 3)] for x, y in pts], round(fw, 3)


def main():
    onizle = '--onizle' in sys.argv
    data = json.load(open(DATA, encoding='utf-8'))
    if onizle:
        os.makedirs(os.path.join(ROOT, 'araclar', 'onizle'), exist_ok=True)
    for t in data['trees']:
        n = t['n']
        path = os.path.join(AGAC, 'agac_%02d.png' % n)
        img = Image.open(path)
        cnt = len(data['pages'][n - 1]['ayat'])
        asp, anch, fw = canopy_points(img, cnt)
        t['aspect'] = round(asp, 3); t['anch'] = anch; t['fw'] = fw
        print('%2d %-16s %4dx%-4d ayet=%2d fw=%.3f' % (n, t['name'], img.size[0], img.size[1], cnt, fw))
        if onizle:
            bg = Image.new('RGBA', img.size, (200, 220, 200, 255)); bg.alpha_composite(img.convert('RGBA'))
            dr = ImageDraw.Draw(bg); W, H = img.size; r = fw * W / 2
            for i, (x, y) in enumerate(anch):
                c = COLORS[i % 5]
                dr.ellipse([x * W - r, y * H - r, x * W + r, y * H + r], fill=c + (255,), outline=(255, 255, 255, 255), width=max(1, int(r / 8)))
                dr.text((x * W - r / 3, y * H - r / 3), str(i + 1), fill=(255, 255, 255, 255))
            bg.convert('RGB').save(os.path.join(ROOT, 'araclar', 'onizle', '%02d.png' % n))
    json.dump(data, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('src/data.json güncellendi')


if __name__ == '__main__':
    main()
