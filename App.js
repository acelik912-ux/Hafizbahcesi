import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Image, Pressable, Dimensions, PanResponder, ScrollView, StatusBar, StyleSheet, BackHandler } from 'react-native';
import DATA from './src/data.json';
import { TREE_IMG, FRUIT_IMG, SCENE, IMG } from './src/assets';

const { width: SW, height: SH } = Dimensions.get('window');
const F = SH * 0.62;            // odak uzaklığı
const HY = SH * 0.46;           // ufuk çizgisi
const COLORS = ['siyah', 'kırmızı', 'sarı', 'yeşil', 'lacivert'];
const TREES = DATA.trees.map((t, i) => ({
  ...t, wW: t.wh * t.aspect,
  x: (t.n % 2 === 1 ? 3.4 : -3.4), z: 9 + (t.n - 1) * 6.5,
  page: DATA.pages[i],
}));
const Z_MAX = TREES[TREES.length - 1].z - 6;
const ease = (u) => u * u * (3 - 2 * u);

// ---------- kamera ----------
const cam = { x: 0, y: 1.6, z: -3 };
const listeners = new Set();           // her karede çağrılır
let tween = null;
function flyTo(to, ms, onDone) {
  const from = { ...cam }; const t0 = Date.now();
  if (tween) tween.cancel && tween.cancel();
  const tk = { dead: false, cancel() { this.dead = true; } }; tween = tk;
  const step = () => {
    if (tk.dead) return;
    const u = Math.min(1, (Date.now() - t0) / ms), e = ease(u);
    cam.x = from.x + (to.x - from.x) * e; cam.y = from.y + (to.y - from.y) * e; cam.z = from.z + (to.z - from.z) * e;
    tick();
    if (u < 1) requestAnimationFrame(step); else onDone && onDone();
  };
  requestAnimationFrame(step);
}
function tick() { listeners.forEach((f) => f()); }
function useCamera(fn) { useEffect(() => { listeners.add(fn); fn(); return () => listeners.delete(fn); }, []); }

// dünya -> ekran: {cx, by(taban y), s}
function project(X, Z) {
  const d = Z - cam.z; if (d < 0.25) return null;
  const s = F / d;
  return { cx: SW / 2 + s * (X - cam.x), by: HY + s * cam.y, s, d };
}

// ---------- dünyadaki nesne (ağaç) ----------
function WorldTree({ t, onPress }) {
  const ref = useRef(null);
  const BW = Math.round(t.wW * 100), BH = Math.round(t.wh * 100);
  useCamera(() => {
    const p = project(t.x, t.z); if (!p || !ref.current) { ref.current && ref.current.setNativeProps({ style: { opacity: 0 } }); return; }
    const sc = p.s / 100, sH = t.wh * p.s;
    const off = p.cx < -t.wW * p.s || p.cx > SW + t.wW * p.s;
    const op = off ? 0 : Math.max(0, Math.min(1, 1.4 - (p.d - 20) / 22)) * Math.min(1, (p.d - 0.25) / 0.6);
    ref.current.setNativeProps({ style: { opacity: op, transform: [{ translateX: p.cx - BW / 2 }, { translateY: p.by - sH / 2 - BH / 2 }, { scale: sc }] } });
  });
  return (
    <Pressable ref={ref} onPress={onPress} style={{ position: 'absolute', left: 0, top: 0, width: BW, height: BH, opacity: 0 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: BW * 0.1, width: BW * 0.8, bottom: -BH * 0.025, height: BH * 0.07, borderRadius: BH, backgroundColor: 'rgba(10,20,5,0.32)' }} />
      <Image source={TREE_IMG[t.n]} style={{ width: BW, height: BH }} resizeMode="contain" />
    </Pressable>
  );
}
function TreeLabel({ t }) {
  const ref = useRef(null);
  const a = t.page.ayat[0];
  useCamera(() => {
    const p = project(t.x, t.z); if (!p || !ref.current) { ref.current && ref.current.setNativeProps({ style: { opacity: 0 } }); return; }
    const k = Math.max(0.5, Math.min(1.1, p.s / 380));
    const op = p.d > 1.5 && p.d < 26 ? Math.min(1, (26 - p.d) / 8) : 0;
    ref.current.setNativeProps({ style: { opacity: op, transform: [{ translateX: p.cx - 80 }, { translateY: p.by + 8 }, { scale: k }] } });
  });
  return (
    <View ref={ref} pointerEvents="none" style={[S.label, { opacity: 0 }]}>
      <Text style={S.labelTx}>{t.n} · {t.name}</Text>
      <Image source={IMG[a.start.file]} style={{ width: 150, height: 150 * a.start.h / a.start.w, maxHeight: 40 }} resizeMode="contain" />
    </View>
  );
}
// ---------- meyve ----------
function Fruit({ t, i, picked, current, onPress, showPlate }) {
  const ref = useRef(null);
  const [fx, fy] = t.anch[i];
  const X = t.x + (fx - 0.5) * t.wW, Y = (1 - fy) * t.wh, Z = t.z - 0.2;
  const fwW = t.fw * t.wW; const BW = 100, BH = 100;
  const a = t.page.ayat[i];
  useCamera(() => {
    if (!ref.current) return;
    const d = Z - cam.z; if (d < 0.25) { ref.current.setNativeProps({ style: { opacity: 0 } }); return; }
    const s = F / d, cx = SW / 2 + s * (X - cam.x), cy = HY - s * (Y - cam.y);
    const sc = (fwW * s) / BW;
    ref.current.setNativeProps({ style: { opacity: 1, transform: [{ translateX: cx - BW / 2 }, { translateY: cy - BH / 2 }, { scale: sc }] } });
  });
  if (picked) return null;
  return (
    <Pressable ref={ref} onPress={onPress} style={{ position: 'absolute', left: 0, top: 0, width: BW, height: BH, opacity: 0 }}>
      <Image source={FRUIT_IMG[t.n][i % 5]} style={{ width: BW, height: BH }} resizeMode="contain" />
      {showPlate && (
        <View style={[S.plate, current && { borderColor: '#F2C94C', borderWidth: 3 }]}>
          <Text style={S.plateNo}>{i + 1}</Text>
          <Image source={IMG[a.start.file]} style={{ width: 120, height: 34 }} resizeMode="contain" />
        </View>
      )}
    </Pressable>
  );
}

// ---------- ana uygulama ----------
export default function App() {
  const [mode, setMode] = useState('intro');   // intro | garden | tree | climb | panel | page
  const [tree, setTree] = useState(null);
  const [k, setK] = useState(0);               // aktif meyve
  const [picked, setPicked] = useState(0);     // toplanan meyve sayısı (tırmanış sırasında)
  const [sheet, setSheet] = useState(0);
  const gateRef = useRef(null); const bgRef = useRef(null); const lightRef = useRef(null);
  const modeRef = useRef(mode); modeRef.current = mode;
  const dragRef = useRef({ z: 0 });

  // arka plan + kapı kameradan sürülür
  useEffect(() => {
    const f = () => {
      const g = gateRef.current, b = bgRef.current;
      if (b) b.setNativeProps({ style: { transform: [{ scale: 1.05 + 0.03 * Math.max(0, cam.z) / 40 }, { translateY: -Math.min(40, cam.y * 6) + 10 }] } });
      if (g) { const u = Math.max(0, Math.min(1, (cam.z + 3) / 5)); g.setNativeProps({ style: { opacity: 1 - ease(Math.max(0, (u - 0.55) / 0.45)), transform: [{ scale: 1 + 1.6 * ease(u) }] } }); }
    };
    listeners.add(f); return () => listeners.delete(f);
  }, []);
  // giriş sahnesi: kapıdan geç ve bahçeye yürü
  useEffect(() => {
    cam.x = 0; cam.y = 1.6; cam.z = -3; tick();
    const t = setTimeout(() => flyTo({ x: 0, y: 1.6, z: 3 }, 6500, () => { setMode('garden'); dragRef.current.z = 3; }), 700);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modeRef.current === 'tree' || modeRef.current === 'page' || modeRef.current === 'panel' || modeRef.current === 'climb') { leave(); return true; }
      return false;
    });
    return () => h.remove();
  }, []);

  // bahçede yürüme (dikey sürükle)
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => modeRef.current === 'garden' && Math.abs(g.dy) > 8,
    onPanResponderGrant: () => { if (tween) tween.cancel(); dragRef.current.z = cam.z; },
    onPanResponderMove: (e, g) => { cam.z = Math.max(0, Math.min(Z_MAX, dragRef.current.z - g.dy * 0.035)); tick(); },
    onPanResponderRelease: (e, g) => { const v = -g.vy * 3.2; if (Math.abs(v) > 0.4) flyTo({ x: 0, y: 1.6, z: Math.max(0, Math.min(Z_MAX, cam.z + v * 2.2)) }, 700); },
  })).current;

  const approach = (t) => ({ x: t.x, y: t.wh * 0.42, z: t.z - 0.68 * t.wh });
  const goTree = useCallback((t, quick) => {
    setTree(t); setK(0); setPicked(0); setMode('tree');
    flyTo(approach(t), quick ? 1800 : 3200);
  }, []);
  const walkTo = (t) => { // ağaca yürüyerek git
    setMode('garden'); flyTo({ x: 0, y: 1.6, z: Math.max(0, t.z - 7) }, 2600, () => goTree(t));
  };
  function fruitPos(t, i) {
    const [fx, fy] = t.anch[i]; const fwW = t.fw * t.wW;
    const sFruit = (SW * 0.42) / fwW;
    return { x: t.x + (fx - 0.5) * t.wW, y: (1 - fy) * t.wh, z: t.z - 0.2 - F / sFruit };
  }
  const gotoFruit = (t, i, ms) => {
    setK(i); setMode('climb');
    flyTo(fruitPos(t, i), ms, () => { setTimeout(() => { setPicked(i + 1); setMode('panel'); }, 450); });
  };
  const start = () => gotoFruit(tree, 0, 3800);
  const next = () => {
    if (k + 1 >= tree.anch.length) { setSheet(0); setMode('page'); flyTo(approach(tree), 1200); }
    else gotoFruit(tree, k + 1, 2400);
  };
  const tapFruit = (i) => { if (mode === 'tree') { setPicked(i); gotoFruit(tree, i, 2600); } };
  const STEP = 6.5;                       // iki ağaç arası mesafe
  const step = (dir) => {                 // ilerle / geri: bir adım yürü
    if (mode !== 'garden') return;
    flyTo({ x: 0, y: 1.6, z: Math.max(0, Math.min(Z_MAX, cam.z + dir * STEP)) }, 1800);
  };
  function leave() {
    const t = tree; setMode('garden'); setPicked(0);
    flyTo({ x: 0, y: 1.6, z: Math.max(0, (t ? t.z : 6) - 6) }, 2600);
  }

  const a = tree && mode !== 'tree' && tree.page.ayat[k];
  return (
    <View style={S.root} {...pan.panHandlers}>
      <StatusBar hidden />
      <Image ref={bgRef} source={SCENE.ground} style={S.bg} resizeMode="cover" />
      {TREES.map((t) => <WorldTree key={t.n} t={t} onPress={() => (modeRef.current === 'garden' ? walkTo(t) : null)} />)}
      {TREES.map((t) => <TreeLabel key={'l' + t.n} t={t} />)}
      {tree && (mode === 'tree' || mode === 'climb' || mode === 'panel') && tree.anch.map((_, i) => (
        <Fruit key={'f' + tree.n + i} t={tree} i={i} picked={mode !== 'tree' && i < picked && !(mode === 'climb' && i === k)}
          current={i === k && mode !== 'tree'} showPlate onPress={() => tapFruit(i)} />
      ))}
      <Image ref={gateRef} source={SCENE.gate} pointerEvents="none" style={[S.bg, { zIndex: 5 }]} resizeMode="cover" />

      {mode === 'garden' && (
        <>
          <View style={S.top}><Text style={S.topTx}>Hafız Bahçesi · 1. Cüz</Text></View>
          <ScrollView horizontal style={S.chips} contentContainerStyle={{ paddingHorizontal: 10 }} showsHorizontalScrollIndicator={false}>
            {TREES.map((t) => (
              <Pressable key={t.n} style={S.chip} onPress={() => walkTo(t)}><Text style={S.chipTx}>{t.n} · {t.name}</Text></Pressable>
            ))}
          </ScrollView>
          <View style={S.walk}>
            <Pressable style={S.walkB} onPress={() => step(-1)}><Text style={S.walkTx}>▼ Geri</Text></Pressable>
            <Pressable style={[S.walkB, S.walkMain]} onPress={() => step(1)}><Text style={[S.walkTx, { fontSize: 19 }]}>İlerle ▲</Text></Pressable>
          </View>
          <Text style={S.hint}>Yürümek için yukarı kaydır · ağaca dokun</Text>
        </>
      )}
      {mode === 'tree' && tree && (
        <>
          <View style={S.top}><Text style={S.topTx}>{tree.n} · {tree.name} · {tree.anch.length} ayet</Text></View>
          <Pressable style={S.btn} onPress={start}><Text style={S.btnTx}>Tırman ▲</Text></Pressable>
          <Pressable style={S.back} onPress={leave}><Text style={S.backTx}>‹ Bahçe</Text></Pressable>
        </>
      )}
      {mode === 'climb' && tree && <View style={S.top}><Text style={S.topTx}>{k + 1}/{tree.anch.length} · {COLORS[k % 5]}</Text></View>}
      {mode === 'panel' && a && (
        <View style={S.panel}>
          <Text style={S.pTitle}>{a.sname} · {a.no}. ayet</Text>
          <Image source={IMG[a.full.file]} style={{ width: SW - 40, height: (SW - 40) * a.full.h / a.full.w }} resizeMode="contain" />
          <Text style={S.meal}>{a.meal}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Pressable style={[S.pb, { flex: 1 }]} onPress={next}><Text style={S.pbTx}>{k + 1 >= tree.anch.length ? 'Sayfayı aç' : 'Sonraki meyve ›'}</Text></Pressable>
            <Pressable style={S.pb} onPress={leave}><Text style={S.pbTx}>✕</Text></Pressable>
          </View>
        </View>
      )}
      {mode === 'page' && tree && (
        <View style={S.page}>
          <Image source={SCENE.light} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} resizeMode="cover" />
          <Pressable onPress={() => setSheet((sheet + 1) % tree.page.sheets.length)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Image source={IMG[tree.page.sheets[sheet].file]} style={{ width: SW - 24, height: (SW - 24) * tree.page.sheets[sheet].h / tree.page.sheets[sheet].w, borderWidth: 4, borderColor: '#D4AF37' }} resizeMode="contain" />
          </Pressable>
          <Text style={S.pageTx}>{tree.page.title}{tree.page.sheets.length > 1 ? ` · sayfa ${sheet + 1}/${tree.page.sheets.length} (dokun)` : ''}</Text>
          <Pressable style={S.btn} onPress={leave}><Text style={S.btnTx}>Bahçeye dön</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E1410', overflow: 'hidden' },
  bg: { position: 'absolute', left: 0, top: 0, width: SW, height: SH },
  top: { position: 'absolute', top: 36, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,.55)', borderRadius: 14, padding: 12, zIndex: 20 },
  topTx: { color: '#F2C94C', fontWeight: '700', fontSize: 17, textAlign: 'center' },
  chips: { position: 'absolute', bottom: 54, left: 0, right: 0, zIndex: 20, maxHeight: 46 },
  chip: { backgroundColor: 'rgba(255,246,217,.92)', borderColor: '#D4AF37', borderWidth: 2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  chipTx: { fontWeight: '700', color: '#222' },
  walk: { position: 'absolute', bottom: 108, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12, zIndex: 25 },
  walkB: { backgroundColor: 'rgba(0,0,0,.6)', borderColor: '#F2C94C', borderWidth: 2, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 12 },
  walkMain: { backgroundColor: '#0B0B0B', paddingHorizontal: 36 },
  walkTx: { color: '#F2C94C', fontWeight: '800', fontSize: 16 },
  hint: { position: 'absolute', bottom: 18, alignSelf: 'center', color: '#ddd', fontSize: 13, zIndex: 20 },
  label: { position: 'absolute', left: 0, top: 0, width: 160, alignItems: 'center', backgroundColor: 'rgba(255,246,217,.94)', borderColor: '#D4AF37', borderWidth: 2, borderRadius: 10, padding: 4 },
  labelTx: { fontWeight: '800', fontSize: 14, color: '#222' },
  plate: { position: 'absolute', left: -10, top: 104, width: 120, backgroundColor: 'rgba(255,246,217,.95)', borderColor: '#D4AF37', borderWidth: 2, borderRadius: 8, alignItems: 'center', padding: 2 },
  plateNo: { position: 'absolute', left: 3, top: 0, fontSize: 11, fontWeight: '800', color: '#222' },
  btn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#0B0B0B', borderColor: '#F2C94C', borderWidth: 2, borderRadius: 18, paddingHorizontal: 34, paddingVertical: 14, zIndex: 30 },
  btnTx: { color: '#F2C94C', fontWeight: '800', fontSize: 18 },
  back: { position: 'absolute', top: 100, left: 16, backgroundColor: 'rgba(0,0,0,.55)', borderRadius: 12, padding: 10, zIndex: 20 },
  backTx: { color: '#fff', fontWeight: '700' },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FAF6E8', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderColor: '#D4AF37', borderTopWidth: 3, padding: 20, paddingBottom: 30, zIndex: 40 },
  pTitle: { fontWeight: '800', fontSize: 18, color: '#222', marginBottom: 8 },
  meal: { color: '#333', fontSize: 16, marginTop: 8 },
  pb: { backgroundColor: '#0B0B0B', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14, alignItems: 'center' },
  pbTx: { color: '#F2C94C', fontWeight: '800', fontSize: 17 },
  page: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0E1410', zIndex: 50 },
  pageTx: { color: '#F2C94C', textAlign: 'center', fontWeight: '700', fontSize: 16, marginBottom: 100 },
});
