import { createRng } from '../core/rng.js';

/**
 * Tiếng hót từng loài: âm tiết là dữ liệu, ghép thành câu theo "ngữ pháp" mô phỏng cách hót thật.
 * Hàm thuần, không đụng Web Audio (test được trên Node). Định dạng nốt xem synth.js.
 *
 * Cấp giọng L (0..4, data/song.js): 0 chỉ kêu lí nhí (subsong), 1 hót rời rạc, 2 tròn câu,
 * 3 hót đổ dài, 4 giọng vàng. Cấp càng cao câu càng dài, càng nhiều kiểu, càng to và sáng.
 */

export const CHIP = [0, 1, 0.55, 0];
export const CLICK = [0, 1, 0.2, 0];
export const SOFT = [0, 0.5, 0.9, 1, 0.8, 0.5, 0];
const SWELL = [0, 0.4, 0.8, 1, 0.95, 0.85, 0.6, 0];

export const R = (r, a, b) => a + (b - a) * r();
export const pick = (r, a) => a[Math.floor(r() * a.length)];
// Biến tấu nhẹ một âm tiết: lệch cao độ và độ dài ±k, nhân cao độ p
const vary = (s, r, k = 0.05, p = 1) => ({ ...s, d: s.d * R(r, 1 - k, 1 + k), f: s.f.map((x) => x * p * R(r, 1 - k, 1 + k)) });

/** Bộ ghép nốt nối tiếp theo thời gian. */
export function seq() {
  const out = [];
  let t = 0;
  return { out, get t() { return t; }, add(s, gap = 0) { out.push({ ...s, t }); t += s.d + gap; }, rest(x) { t += x; } };
}

export function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/** Giọng riêng mỗi cá thể (theo tên): cao độ ±5%, nhịp ±8%, bộ câu hót riêng (seed). */
export function voiceOf(key) {
  const seed = hash(key), r = createRng(seed);
  return { seed, pitch: 0.95 + 0.1 * r(), tempo: 0.92 + 0.16 * r() };
}

// ---------- Chào mào: cụm 3–6 tiếng trong, luyến lên xuống 1,5–3,5 kHz; con sung "đổ" chuỗi dài liền mạch
const CM = {
  chit: { d: 0.06, f: [2100, 2900, 3150] },
  tu: { d: 0.12, f: [2950, 2450, 1800] },
  huyt: { d: 0.15, f: [1650, 2050, 2800, 2950] },
  liu: { d: 0.13, f: [1950, 3000, 3150, 2250] },
  ro: { d: 0.14, f: [2550, 1700, 1650, 2450], fm: [38, 70] },
  che: { d: 0.09, f: [2450, 2250], h: [1, 0.45, 0.25], fm: [75, 120] },
  quyt: { d: 0.2, f: [1750, 2350, 3100, 3200, 2900] },
  riu: { d: 0.1, f: [3150, 2550, 3000] },
};

function cmRep(r) { // mỗi con thuộc 10 câu riêng
  return Array.from({ length: 10 }, () => {
    const n = 3 + Math.floor(r() * 4);
    return Array.from({ length: n }, (_, i) => {
      const k = pick(r, i === 0 ? ['chit', 'huyt', 'liu', 'riu', 'che'] : i === n - 1 ? ['tu', 'quyt', 'liu', 'ro'] : Object.keys(CM));
      const s = vary(CM[k], r, 0.06);
      if (i === n - 1) s.d *= 1.3; // tiếng cuối kéo dài, kết câu
      return { ...s, gap: R(r, 0.02, 0.06) };
    });
  });
}

function cmSing(w, L, rep, r, dur) {
  const pool = rep.slice(0, 2 + 2 * L);
  let m = pick(r, pool);
  while (w.t < dur) {
    if (L >= 3 && r() < (L === 4 ? 0.35 : 0.2)) { // "đổ": chuỗi dài, liền hơi, lượn lên xuống
      const n = Math.round(R(r, 8, 10 + 5 * (L - 2)));
      for (let i = 0; i < n; i++) {
        const s = vary(CM[pick(r, ['liu', 'tu', 'huyt', 'ro', 'riu', 'chit'])], r, 0.04, 1 + 0.05 * Math.sin(i * 0.9));
        w.add({ ...s, d: s.d * 0.85, g: 0.75 + (0.25 * i) / n }, R(r, 0.012, 0.03));
      }
    } else {
      for (const s of L === 1 ? m.slice(0, 2 + (r() < 0.5)) : m) w.add(L === 1 ? vary(s, r, 0.04) : s, s.gap);
    }
    w.rest(L === 1 ? R(r, 0.6, 1.1) : L === 2 ? R(r, 0.45, 0.9) : R(r, 0.2, 0.45));
    if (r() > 0.45) m = pick(r, pool); // giữ câu cũ khoảng một nửa số lần
  }
}

// ---------- Chích chòe than: huýt dài ngọt lên xuống 1,5–5 kHz xen tiếng láy; mỗi câu một kiểu, ít lặp
function ccSing(w, L, rep, r, dur) {
  while (w.t < dur) {
    const lo = R(r, 1500, 2300), hi = Math.min(5000, lo * R(r, 1.8, 2.3));
    const n = 2 + Math.floor(r() * (L + 1));
    const kinds = r() < 0.5 ? ['slur', 'whistle'] : ['whistle'];
    for (let i = 1; i < n; i++) {
      const x = r();
      kinds.push(x < 0.38 ? 'whistle' : x < 0.6 ? 'slur' : x < 0.8 && L >= 2 ? 'trill' : x < 0.93 && L >= 3 ? 'flourish' : x < 0.97 ? 'slur' : 'rasp');
    }
    for (const k of kinds) {
      if (k === 'whistle') {
        const a = R(r, lo, hi), b = R(r, lo, hi), x = r();
        const f = x < 0.3 ? [Math.min(a, b), Math.max(a, b)] : x < 0.6 ? [Math.max(a, b), Math.min(a, b)]
          : x < 0.85 ? [a, Math.min(5000, Math.max(a, b) * 1.2), b] : [a, a * 1.02, a * 0.99];
        w.add({ d: R(r, 0.22, 0.5), f, e: SWELL, fm: x >= 0.85 ? [R(r, 6, 9), a * 0.012] : undefined }, R(r, 0.03, 0.1));
      } else if (k === 'slur') {
        const a = R(r, lo * 1.1, hi / 1.1);
        w.add({ d: R(r, 0.06, 0.12), f: r() < 0.5 ? [a * 0.78, a * 1.1] : [a * 1.1, a * 0.75] }, R(r, 0.03, 0.08));
      } else if (k === 'trill') { // láy: chuỗi nốt ngắn 15–22 nốt/giây, trượt dần xuống
        let x = R(r, 3000, 4400);
        for (let i = 0, m = 5 + Math.floor(r() * (3 + 2 * L)); i < m; i++, x *= 0.985) {
          w.add({ d: R(r, 0.028, 0.04), f: [x * 1.1, x * 0.88], e: CHIP }, R(r, 0.014, 0.024));
        }
        w.rest(R(r, 0.03, 0.08));
      } else if (k === 'flourish') { // nốt hoa mỹ zíc zắc cuối câu
        const a = R(r, lo, hi / 1.35);
        for (let i = 0, m = 3 + Math.floor(r() * 3); i < m; i++) w.add({ d: R(r, 0.05, 0.07), f: i % 2 ? [a * 1.3, a * 1.02] : [a, a * 1.32], e: CHIP }, 0.015);
        w.rest(0.05);
      } else w.add({ d: R(r, 0.05, 0.08), f: [2300, 2000], n: 0.65, q: 2.5, h: [1, 0.5, 0.3], fm: [110, 200] }, R(r, 0.04, 0.1));
    }
    w.rest(Math.max(0.25, R(r, 0.5, 1.3) - 0.08 * L));
  }
}

// ---------- Họa mi: giọng vang ấm 1,2–4 kHz, có họa âm; mỗi motif lặp 2–4 lần rồi đổi
const HM = {
  tiu: { d: 0.15, f: [1450, 2250, 2350] },
  heo: { d: 0.24, f: [2650, 2250, 1450] },
  vong: { d: 0.2, f: [1550, 2650, 2050] },
  chi: { d: 0.09, f: [2250, 2650] },
  lun: { d: 0.28, f: [1400, 1700, 2550, 2850, 2450] },
  vu: { d: 0.14, f: [2950, 2150, 2750] },
  ngan: { d: 0.32, f: [1950, 2050, 2000], fm: [6.5, 35], e: SWELL },
  sang: { d: 0.08, f: [2850, 3500, 3200] },
  lay: { d: 0.18, f: [2400, 2600], am: 24 },
};

function hmRep(r) {
  return Array.from({ length: 12 }, () => {
    const p = R(r, 0.9, 1.1), n = 2 + Math.floor(r() * 4);
    return Array.from({ length: n }, () => ({ ...vary(HM[pick(r, Object.keys(HM))], r, 0.06, p), gap: R(r, 0.03, 0.08) }));
  });
}

function hmSing(w, L, rep, r, dur) {
  const pool = rep.slice(0, 2 + 2 * L);
  let m;
  while (w.t < dur) {
    const prev = m;
    do m = pick(r, pool); while (m === prev);
    const reps = L === 1 ? 1 + Math.floor(r() * 2) : 2 + Math.floor(r() * (L >= 3 ? 3 : 2));
    for (let k = 0; k < reps && (k < 2 || w.t < dur); k++) {
      for (const s of m) w.add(vary(s, r, 0.015), s.gap);
      w.rest(R(r, 0.1, 0.22));
    }
    if (L === 4 && r() < 0.3) { // chuỗi láy lên rộn ràng
      let x = R(r, 1500, 1800);
      for (let i = 0, n = 6 + Math.floor(r() * 4); i < n; i++, x *= 1.07) w.add({ d: R(r, 0.045, 0.06), f: [x, x * 1.22], e: CHIP }, 0.02);
      w.rest(0.1);
    }
    w.rest(Math.max(0.15, R(r, 0.3, 0.65) - 0.04 * L));
  }
}

// ---------- Vành khuyên: cao, mảnh 3,5–7,5 kHz; chuỗi nốt rất nhanh (12–18 nốt/giây) liền mạch, "líu"
function khNote(r, c, top) {
  const a = R(r, 450, 1000), x = r();
  const f = x < 0.3 ? [c - a, c + a] : x < 0.55 ? [c + a, c - a] : x < 0.75 ? [c - a, c + a * 0.8, c - a * 0.3]
    : x < 0.9 ? [c + a, c - a * 0.8, c + a * 0.3] : [c * 0.97, c * 1.03, c];
  return { d: R(r, 0.038, 0.052), f: f.map((v) => Math.min(top, Math.max(3500, v))), e: CHIP };
}

function khSing(w, L, rep, r, dur) {
  const top = 6600 + 225 * L;
  const run = [0, [4, 8], [10, 20], [20, 40], [40, 90]][L], gap = [0, [0.5, 0.9], [0.35, 0.6], [0.2, 0.4], [0.1, 0.2]][L];
  while (w.t < dur) {
    let c = R(r, 4600, 5600);
    const done = [];
    for (let i = 0, n = Math.round(R(r, ...run)); i < n; i++) {
      c = Math.min(top - 700, Math.max(4200, c + R(r, -650, 650)));
      const s = i > 3 && r() < 0.2 ? done[done.length - 2] : khNote(r, c, top); // nhắc lại tiếng trước: "tíu líu tíu"
      done.push(s);
      w.add({ ...s, g: R(r, 0.65, 1) }, R(r, 0.017, 0.027));
    }
    if (L >= 3 && r() < 0.2) w.add({ d: R(r, 0.25, 0.4), f: [6300, 5600], am: R(r, 24, 30), e: SWELL }, 0.05); // tiếng rung dài
    w.rest(R(r, ...gap));
  }
}

// ---------- Sáo mỏ ngà: lách chách, rè, lục cục trong cổ, tiếng "kéc", xen tiếng huýt; 0,8–3 kHz, nhiều ồn
const SAO = {
  kek: { d: 0.07, f: [1900, 1500], h: [1, 0.7, 0.5, 0.35, 0.25], fm: [170, 380], n: 0.5, q: 3 },
  chur: { d: 0.16, f: [2600, 1300], h: [1, 0.6, 0.4, 0.3], fm: [90, 240], n: 0.25, q: 2 },
  wheet: { d: 0.2, f: [1500, 2300, 2850], h: [1, 0.12] },
  tew: { d: 0.18, f: [2850, 2400, 1700], h: [1, 0.12] },
  rasp: { d: 0.25, f: [1500, 1300], h: [1, 0.6, 0.4], n: 0.75, q: 1.3, am: 55 },
  click: { d: 0.008, f: [3000], n: 1, q: 1.5, e: CLICK },
  glug: { d: 0.06, f: [900, 1350, 1000], h: [1, 0.5, 0.3], fm: [45, 110] },
};

function saoSing(w, L, rep, r, dur) {
  const many = (s, a, b, g1, g2, k = 0.05, p = 1) => { for (let i = 0, n = a + Math.floor(r() * (b - a + 1)); i < n; i++) w.add(vary(s, r, k, p), R(r, g1, g2)); };
  while (w.t < dur) {
    const x = r();
    if (x < 0.22) many(SAO.kek, 2, 4, 0.06, 0.1); // kéc kéc kéc
    else if (x < 0.4) many(SAO.glug, 3, 6, 0.005, 0.02, 0.1, R(r, 0.85, 1.2)); // lục cục
    else if (x < 0.55) many(SAO.click, 2, 4, 0.03, 0.07, 0.2);
    else if (x < 0.72 + 0.04 * L) w.add(vary(r() < 0.5 ? SAO.wheet : SAO.tew, r, 0.06));
    else if (x < 0.88 + 0.02 * L) w.add(vary(SAO.chur, r, 0.06));
    else w.add(vary(SAO.rasp, r, 0.08));
    w.rest(R(r, 0.04, 0.18));
  }
}

// ---------- Yến phụng: líu lo liên tục nhỏ nhẹ, tiếng "chiếp" điều tần giàu họa âm, rè rè, lách tách
const YP = {
  chirrup: { d: 0.13, f: [2200, 3300, 2700], h: [1, 0.6, 0.45, 0.3, 0.2, 0.12], fm: [42, 320] },
  soft: { d: 0.07, f: [2600, 3400], h: [1, 0.3, 0.1] },
  softd: { d: 0.07, f: [3500, 2700], h: [1, 0.3, 0.1] },
  click: { d: 0.006, f: [4000], n: 1, q: 2, e: CLICK },
  buzz: { d: 0.15, f: [1900, 2050], h: [1, 0.7, 0.55, 0.4, 0.3], am: 80, n: 0.3, q: 2 },
  peep: { d: 0.05, f: [3800, 4200], h: [1, 0.2] },
  churr: { d: 0.1, f: [2800, 2300], h: [1, 0.7, 0.5, 0.35], fm: [95, 400], n: 0.2, q: 2 },
};

function ypSing(w, L, rep, r, dur) {
  let p = 1;
  while (w.t < dur) {
    p = Math.min(1.15, Math.max(0.85, p * R(r, 0.94, 1.06))); // giọng trôi lên xuống
    const k = pick(r, ['chirrup', 'soft', 'softd', 'soft', 'click', 'click', 'buzz', 'peep', 'churr']);
    w.add({ ...vary(YP[k], r, 0.08, p), g: R(r, 0.5, 0.9) }, R(r, 0.01, 0.05));
    if (r() < 0.08 - 0.01 * L) w.rest(R(r, 0.15, 0.4));
  }
}

/** Mỗi loài: âm sắc mặc định, dải tần, câu hót. talk: loài học nói (không có cấp giọng, chỉ líu lo). */
export const SONGS = {
  chaomao: { tone: [1, 0.22, 0.07], range: [1500, 3500], rep: cmRep, sing: cmSing, syl: Object.values(CM) },
  chichchoe: {
    tone: [1, 0.08], range: [1500, 5000], sing: ccSing,
    syl: [{ d: 0.25, f: [2000, 3200], e: SWELL }, { d: 0.1, f: [3400, 2400] }, { d: 0.3, f: [3000, 2200], e: SWELL }],
  },
  hoami: { tone: [1, 0.38, 0.14, 0.05], range: [1200, 4000], rep: hmRep, sing: hmSing, syl: Object.values(HM) },
  khuyen: { tone: [1, 0.05], range: [3500, 7500], sing: khSing, syl: [{ d: 0.045, f: [4800, 5600] }, { d: 0.05, f: [6000, 5000] }] },
  sao: { talk: true, tone: [1, 0.3], range: [800, 3000], sing: saoSing },
  yenphung: { talk: true, tone: [1, 0.3], range: [1500, 4500], sing: ypSing },
};

/** Ghép một hiệp hót dài khoảng `dur` giây. seed: bộ câu riêng của cá thể; rng: ngẫu nhiên từng hiệp. */
/**
 * young (0..1): độ "non" của giọng. Chim non tập hót (subsong rồi plastic song): nhỏ tiếng, cao độ chưa vững,
 * nốt dài ngắn thất thường, hay bỏ dở giữa câu. 0 = giọng đã định của chim trưởng thành.
 */
export function compose(sp, L, { seed = 1, rng = Math.random, dur = 5, young = 0 } = {}) {
  const S = SONGS[sp], w = seq();
  L = Math.max(0, Math.min(4, Math.round(L)));
  if (!S.talk && L === 0) { // chưa ra giọng: kêu lí nhí, lộn xộn
    while (w.t < dur) w.add({ ...vary(rng() < 0.55 ? CALLS[sp].call : pick(rng, S.syl), rng, 0.08), g: R(rng, 0.35, 0.7) }, R(rng, 0.15, 0.55));
  } else S.sing(w, L, S.rep?.(createRng(seed)), rng, dur);
  const g = 0.55 + 0.1125 * L, p = 0.97 + 0.015 * L; // cấp cao: to hơn, sáng hơn
  let out = w.out.map((n) => ({ ...n, h: n.h || S.tone, g: (n.g ?? 1) * g, f: n.f.map((x) => x * p) }));
  if (young > 0) {
    const kept = out.filter(() => rng() > 0.25 * young);
    out = (kept.length ? kept : out.slice(0, 1)).map((n) => ({
      ...n, g: n.g * (1 - 0.4 * young), d: n.d * R(rng, 1, 1 + 0.3 * young), f: n.f.map((x) => x * R(rng, 1 - 0.07 * young, 1 + 0.07 * young)),
    }));
  }
  return out;
}

// ---------- Tiếng gọi: call = tiếng gọi bạn, beg = đói khát kêu chiêm chiếp, alarm = hoảng, weak = ốm yếu
export const CALLS = {
  chaomao: { call: { d: 0.07, f: [2300, 3300, 3000] }, beg: { d: 0.05, f: [2900, 3500, 3350] }, alarm: { d: 0.13, f: [2700, 2400], h: [1, 0.5, 0.3], am: 48, n: 0.55, q: 3 } },
  chichchoe: { call: { d: 0.22, f: [3200, 3600, 2800], e: SWELL }, beg: { d: 0.06, f: [3400, 3900] }, alarm: { d: 0.16, f: [2500, 2300], h: [1, 0.6, 0.4], am: 60, n: 0.7, q: 2 } },
  hoami: { call: { d: 0.1, f: [1900, 2500] }, beg: { d: 0.07, f: [2400, 2900] }, alarm: { d: 0.18, f: [1800, 1600], h: [1, 0.6, 0.4], am: 35, n: 0.6, q: 2.5 } },
  khuyen: { call: { d: 0.09, f: [6300, 5000] }, beg: { d: 0.045, f: [5400, 6200] }, alarm: { d: 0.07, f: [4800, 4300], fm: [90, 300], n: 0.45, q: 4 } },
  sao: { call: SAO.kek, beg: { d: 0.07, f: [2200, 2600], h: [1, 0.5, 0.3] }, alarm: { d: 0.12, f: [2100, 1700], h: [1, 0.7, 0.5], fm: [150, 400], n: 0.75, q: 1.8 } },
  yenphung: { call: YP.chirrup, beg: { d: 0.08, f: [2800, 3400], h: [1, 0.5, 0.3], fm: [40, 200] }, alarm: { d: 0.2, f: [3000, 3600, 2800], h: [1, 0.7, 0.5, 0.4], fm: [60, 600], n: 0.5, q: 1.5 } },
};
const CALL_N = { call: [1, 2, 0.16], beg: [3, 6, 0.08], alarm: [2, 4, 0.1], weak: [1, 2, 0.25] };

export function call(sp, kind, r = Math.random) {
  const w = seq(), [a, b, gap] = CALL_N[kind], base = CALLS[sp][kind === 'weak' ? 'call' : kind];
  for (let i = 0, n = a + Math.floor(r() * (b - a + 1)); i < n; i++) {
    let s = vary(base, r, 0.04);
    if (kind === 'weak') s = { ...s, d: s.d * 1.35, f: s.f.map((x) => x * 0.92), g: 0.35, n: Math.min(0.6, (s.n || 0) + 0.25), q: s.q || 3 };
    w.add({ h: SONGS[sp].tone, ...s }, gap * R(r, 0.8, 1.3));
  }
  return w.out;
}

// ---------- Vẹt, sáo nhại tiếng người khi không có giọng đọc tiếng Việt: mỗi tiếng một nốt rè theo thanh điệu
const TONES = { '̀': [0.95, 0.78], '́': [1, 1.3], '̉': [0.95, 0.8, 0.92], '̃': [1, 0.88, 1.32], '̣': [0.9, 0.72] };

export function speechNotes(text, r = Math.random) {
  const w = seq();
  for (const word of text.normalize('NFD').toLowerCase().split(/\s+/).filter(Boolean)) {
    const tone = Object.keys(TONES).find((k) => word.includes(k)), c = TONES[tone] || [1, 1.02];
    if (/^(ch|x|s|th|ph|kh|tr)/.test(word)) w.add({ d: 0.05, f: [4500], n: 1, q: 1.5, g: 0.35 }); // phụ âm xát
    w.add({ d: tone === '̣' ? 0.11 : R(r, 0.15, 0.2), f: c.map((k) => 1250 * k), h: [1, 0.7, 0.55, 0.4, 0.3, 0.2], fm: [7, 25], n: 0.12, q: 2, g: 0.8 }, R(r, 0.04, 0.08));
  }
  return w.out;
}

// ---------- Chim trời ở xa (âm thanh môi trường)
export const WILD = {
  se: (r) => { // chim sẻ: chíp chíp
    const w = seq();
    for (let i = 0, n = 2 + Math.floor(r() * 4); i < n; i++) w.add({ d: R(r, 0.04, 0.06), f: [R(r, 3600, 4400), R(r, 4600, 5200), R(r, 3800, 4200)], h: [1, 0.35, 0.1] }, R(r, 0.07, 0.14));
    return w.out;
  },
  cugay: (r) => { // cu gáy: cúc cù... cu
    const p = R(r, 0.92, 1.08), h = [1, 0.2];
    return [
      { t: 0, d: 0.16, f: [520 * p, 600 * p, 560 * p], h, e: SOFT },
      { t: 0.32, d: 0.38, f: [580 * p, 640 * p, 500 * p], h, e: SOFT, fm: [12, 8] },
      { t: 0.95, d: 0.22, f: [540 * p, 480 * p], h, e: SOFT },
    ];
  },
  chaomao: (r) => { const w = seq(); for (const s of cmRep(r)[0]) w.add(s, s.gap); return w.out; },
  chichchoe: (r) => [{ t: 0, d: R(r, 0.3, 0.5), f: [R(r, 1800, 2500), R(r, 3000, 3800)], e: SWELL }],
  bimbip: (r) => { // bìm bịp: bịp bịp bịp trầm, nhanh dần
    const w = seq();
    for (let i = 0, n = 4 + Math.floor(r() * 5), g = 0.24; i < n; i++, g *= 0.88) w.add({ d: 0.13, f: [430, 380], h: [1, 0.4, 0.15], e: SOFT }, g);
    return w.out;
  },
};

/**
 * Nhịp hót thật khi ngồi nghe lâu (chế độ "Nghe chim"), tính bằng giây thật, cấp giọng cao nhất, giờ bình thường.
 * phrase: độ dài một câu; gap: nghỉ giữa hai câu; n: số câu một hiệp; rest: nghỉ giữa hai hiệp.
 * Chim thật không hót liên tục: hót thành hiệp, nghỉ chuyền cầu, rỉa lông rồi hót tiếp; sáng sớm hót dày nhất,
 * trưa nắng thưa nhất. Thời gian nghỉ ngoài đời dài hơn (vài phút), ở đây rút gọn để người nghe không chờ quá lâu.
 */
export const SESSION = {
  // Số đo: chào mào câu 3–6 tiếng ~1,2–2,5 s; chích chòe câu 5,1 ± 2,2 s, nghỉ xấp xỉ bằng câu; họa mi mỗi motif
  // lặp 2–4 lần, câu 3–8 s; khuyên chuỗi nhanh 2–6 s. Xem docs/LIFECYCLE_RESEARCH.md mục 3.
  chaomao: { phrase: [1.2, 2.5], gap: [2, 6], n: [6, 14], rest: [25, 70] },
  chichchoe: { phrase: [3, 7], gap: [2.5, 6], n: [8, 18], rest: [30, 80] },
  hoami: { phrase: [3, 7], gap: [2.5, 6], n: [6, 14], rest: [35, 90] },
  khuyen: { phrase: [2, 5], gap: [1, 4], n: [5, 12], rest: [20, 55] },
  sao: { phrase: [2, 5.5], gap: [2.5, 7], n: [4, 9], rest: [30, 75] },
  yenphung: { phrase: [4, 11], gap: [1, 3.5], n: [5, 14], rest: [20, 60] },
};

/** Lên một hiệp hót: [{ dur, gap }] và thời gian nghỉ sau hiệp. L: cấp giọng 0..4, hour: giờ trong game. */
export function planBout(sp, L, hour, r = Math.random) {
  const T = SESSION[sp];
  // Tỉ lệ thời gian hót mỗi giờ (ước lượng): bình minh 35–50%, 9–11 giờ 10–15%, trưa 2–5%, chiều 10–20%
  const dawn = hour >= 5.5 && hour < 9, noon = hour >= 11 && hour < 14.5, late = hour >= 9 && hour < 11;
  const k = L / 4; // cấp thấp: câu ngắn, ngập ngừng, hiệp ngắn, nghỉ lâu
  const n = Math.max(2, Math.round(R(r, ...T.n) * (0.45 + 0.55 * k) * (dawn ? 1.3 : 1)));
  const phrases = Array.from({ length: n }, () => ({ dur: R(r, ...T.phrase) * (0.55 + 0.45 * k), gap: R(r, ...T.gap) * (1.5 - 0.5 * k) }));
  const rest = R(r, ...T.rest) * (1.6 - 0.6 * k) * (dawn ? 0.6 : noon ? 4 : late ? 1.6 : 1.2);
  return { phrases, rest };
}
