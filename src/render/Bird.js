import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { budgieBarring, contourTextures, featherTexture, fuzzTexture, scaleTexture } from './textures.js';

const lerp = (a, b, k) => a + (b - a) * k;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => clamp(v, 0, 1);
const sstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));
// Đường bao lên – giữ – xuống cho một động tác dài `dur` giây
const env = (t, dur, up, down) => Math.min(clamp01(t / up), clamp01((dur - t) / down));
const hex = (h) => new THREE.Color(h);
const mixHex = (a, b, k) => '#' + hex(a).lerp(hex(b), k).getHexString();
const shade = (h, k) => '#' + hex(h).multiplyScalar(k).getHexString();

/**
 * Bộ lông theo tuổi: a = 0 lông non (model.juvenile ghi đè), 1 = lông trưởng thành; ở giữa là đang thay lông.
 * Chim non nhỏ hơn, đuôi ngắn hơn, đầu to so với thân.
 */
export function stageModel(model, a = 1, old = false) {
  // Chim lâu năm: lông kém bóng, màu hơi bạc đi một chút
  // (chân vảy dày, bạc màu, lông mất độ bóng là dấu hiệu tuổi người nuôi hay để ý)
  if (old) return { ...model, glossK: 0.5, plumpK: 1.04, colors: Object.fromEntries(Object.entries(model.colors).map(([k, v]) => [k, mixHex(v, k === 'legs' ? '#D2CABC' : '#8C877E', k === 'legs' ? 0.4 : 0.2)])) };
  const J = model.juvenile;
  if (!J || a >= 1) return model;
  const colors = { ...model.colors };
  for (const [k, v] of Object.entries(J.colors || {})) {
    if (v === null) { if (a < 0.6) delete colors[k]; continue; } // mảng màu chưa mọc (má đỏ chào mào)
    colors[k] = colors[k] ? mixHex(v, colors[k], a) : v;
  }
  const young = a < 0.5;
  return {
    ...model, colors, size: model.size * lerp(0.9, 1, a), tail: model.tail * lerp(0.78, 1, a), headK: lerp(1.07, 1, a),
    crestK: lerp(J.crestK ?? 1, 1, a), ringK: lerp(J.ringK ?? 1, 1, a),
    darkEye: J.darkEye && young, foreheadBars: J.foreheadBars && young, scalyBreast: J.scalyBreast && a < 0.7,
  };
}

// Máy yếu (ít nhân CPU): bớt một nửa số lớp lông tơ để giữ khung hình mượt
const FUZZ_Q = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4 ? 0.5 : 1;

const BODY_Y = 0.05;            // tâm thân so với bàn chân (đơn vị model, size = 1)
const TIB = 0.026, TAR = 0.024; // đùi-ống (khuất trong lông) và cẳng chân
const HIP = [0.004, -0.022];    // khớp hông trong khung thân

// ---------------------------------------------------------------------------
// Hình học dùng chung cho mọi con chim (tạo một lần)
let G = null;
function shared() {
  if (G) return G;
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  // Thân thuôn: tròn ở ngực, thon về phía đuôi. Trục +x là phía trước.
  const torso = lathe([[0, -0.058], [0.012, -0.05], [0.022, -0.038], [0.03, -0.022], [0.035, -0.006],
    [0.037, 0.008], [0.035, 0.022], [0.028, 0.036], [0.017, 0.047], [0, 0.054]], 22); // hai đầu khép kín, không hở lỗ ở ngực
  torso.rotateZ(-Math.PI / 2);
  // Lông vũ: tấm phẳng hơi cong (gốc ở gốc tọa độ, ngọn ở x = -1, rộng 1 theo z, cong lên theo y), uv u: gốc → ngọn
  const feather = new THREE.PlaneGeometry(1, 1, 6, 2);
  {
    const p = feather.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = p.getY(i);
      p.setXYZ(i, -u, 0.09 * (1 - 4 * v * v) - 0.05 * u * u, v);
    }
    feather.computeVertexNormals();
  }
  const featherV = feather.clone().rotateX(Math.PI / 2); // dựng đứng: lông cánh, mào
  // Cẳng chân: dài 1 theo -y (gốc ở khớp gót). Ngón: dài theo +x.
  const tarsus = new THREE.CylinderGeometry(0.0021, 0.0026, 1, 7).translate(0, -0.5, 0);
  const toe1 = (len, a) => new THREE.CylinderGeometry(0.0011, 0.0015, len, 5).rotateZ(-Math.PI / 2).translate(len / 2, 0, 0).rotateY(a);
  const toesFront = mergeGeometries([toe1(0.013, 0.5), toe1(0.015, 0), toe1(0.013, -0.5)]);
  const toeBack = toe1(0.01, Math.PI);
  // Vẹt: chân đối ngón (2 ngón trước, 2 ngón sau)
  const toesFront2 = mergeGeometries([toe1(0.013, 0.28), toe1(0.014, -0.28)]);
  const toeBack2 = mergeGeometries([toe1(0.012, Math.PI - 0.3), toe1(0.011, Math.PI + 0.3)]);
  G = { sphere: new THREE.SphereGeometry(1, 24, 16), lo: new THREE.SphereGeometry(1, 12, 8), torso, feather, featherV, tarsus, toesFront, toeBack, toesFront2, toeBack2,
    ring: new THREE.TorusGeometry(1, 0.22, 6, 18), lid: new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2) };
  return G;
}

/** Mỏ: hình nón nằm ngang (gốc x = 0, chóp x = len), uốn cong xuống theo `curve`. */
function billGeo(len, r, curve, deep = 1) {
  // Tiện theo đường bao hơi phồng (ConeGeometry thiếu nửa số tam giác ở hình nhỏ này, nhìn lởm chởm)
  const prof = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(r * Math.pow(1 - t, 0.8) + 1e-5, len * t)); }
  const g = new THREE.LatheGeometry(prof, 16).rotateZ(-Math.PI / 2); // đáy mở, khuất trong đầu
  g.scale(1, deep, 0.8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / len; p.setY(i, p.getY(i) - curve * x * x * len * 0.6); }
  g.computeVertexNormals();
  return g;
}

/** Tô màu từng đỉnh: fn(x, y, z, outColor). */
function paint(geo, fn) {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    fn(p.getX(i), p.getY(i), p.getZ(i), c);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// ---------------------------------------------------------------------------
// Dáng điệu từng loài. Suy ra từ cờ của model; bảng TUNE chỉ tinh chỉnh thêm theo khóa loài.
const TUNE = {
  // flapHz: nhịp vỗ cánh (đã chậm hơn thật một chút cho mắt kịp thấy); gloss: độ bóng lông, sheen: màu ánh
  yenphung: { posture: 0.95, tailDown: 1.1, head: 0.0255, plump: 1.06, wing: 1.1, tailN: 6, tailShape: 0.42, tailW: 0.0095, fan: 0.045, hopRate: 0.7, flapHz: 13, gloss: 0.35, sheen: '#7A9A60' },
  chaomao: { posture: 0.72, tailDown: 0.85, head: 0.0228, long: 1.05, bill: [0.018, 0.0056, 0.25], hopRate: 1.3, flapHz: 10, gloss: 0.3, sheen: '#505058', twoFoot: 1 },
  sao: { posture: 0.45, tailDown: 0.5, head: 0.0204, plump: 1.0, long: 1.14, wing: 1.1, tailShape: 0.96, tailW: 0.0145, bill: [0.024, 0.0072, 0.12], hopRate: 0.8, flapHz: 7.5, gloss: 0.75, sheen: '#3050A8' },
  chichchoe: { posture: 0.58, head: 0.0226, plump: 0.96, long: 1.06, tailShape: 0.72, tailW: 0.0128, fan: 0.055, bill: [0.022, 0.0054, 0.2], flapHz: 10, gloss: 0.7, sheen: '#3050A8' },
  khuyen: { posture: 0.62, tailDown: 0.65, head: 0.0262, tailShape: 1.05, tailW: 0.0118, bill: [0.019, 0.0046, 0.3], flapHz: 13.5, gloss: 0.1, sheen: '#8A9A70', twoFoot: 1 },
  hoami: { posture: 0.68, tailDown: 0.62, head: 0.0246, plump: 1.04, wing: 0.86, tailShape: 0.78, tailW: 0.0145, bill: [0.021, 0.0066, 0.3], flapHz: 9.5, gloss: 0.08, sheen: '#9A8268' },
};

function traitsFor(key, model) {
  const C = model.colors;
  const T = {
    posture: 0.65, tailDown: 0.7, head: 0.024, plump: 1, long: 1, wing: 1, tailN: 8, tailShape: 0.85, tailW: 0.013, fan: 0.065,
    bill: [0.021, 0.006, 0.2], gape: 0.45, ring: 0.0016, hopRate: 1, gestures: {}, bold: 0, parrot: !!model.parrot, flapHz: 10, gloss: 0.25, sheen: '#808080', twoFoot: 0,
  };
  // Cờ có sẵn trong species.model → dáng điệu riêng
  if (model.parrot) Object.assign(T, { posture: 0.95, bill: [0.016, 0.0072, 1.3], gape: 0.3 }, { gestures: { bob: 1.3, sidestep: 1.2 } });
  if (model.crest) T.gestures.crest = 1.1;
  if (model.tailUp) { T.tailDown = -0.62; T.gestures.cock = 1.5; }
  if (model.tuft) T.gestures = { bow: 1, sidestep: 0.6 };
  if (model.brow) { T.gestures.flick = 1.3; T.bold = 1; }
  if (C.eyeRing && !model.brow) { T.ring = 0.0024; T.gestures.fidget = 1.6; T.hopRate = 2.8; }
  Object.assign(T, TUNE[key] || {});
  T.head *= 1.1 * (model.headK || 1); // đầu to hơn thật một chút: tỉ lệ "dễ thương" (Kindchenschema), xem docs/GAME_RESEARCH.md
  T.ring *= model.ringK ?? 1; // chim non: vòng mắt còn mảnh
  T.gloss *= model.glossK ?? 1;
  T.plump *= model.plumpK ?? 1;
  if (T.twoFoot) T.gestures.sidestep = (T.gestures.sidestep || 0) + 0.8; // nhảy hai chân dọc cầu
  // Màu phụ suy ra từ màu sẵn có
  T.throat = C.throat || C.whiteCheek || (model.lowBelly || model.parrot ? C.head : mixHex(C.head, C.belly, 0.5));
  T.vent = C.vent || C.tailTip || C.belly;
  T.breast = C.throat || null;
  T.band = model.crest ? shade(C.body, 0.45) : null;
  T.nape = model.parrot ? mixHex(C.head, C.body, 0.55) : null;
  T.tailBase = T.tailDown - T.posture; // góc đuôi so với thân
  return T;
}

// ---------------------------------------------------------------------------
// Tư thế: mỗi khóa là một tham số, được làm mượt về đích với tốc độ riêng
const RATES = {
  lean: 9, crouch: 8, fluff: 3, roll: 8, twist: 6, hYaw: 30, hPitch: 30, hRoll: 24, neck: 12, dip: 12, beak: 34, throat: 16,
  wingL: 10, wingR: 10, liftL: 8, liftR: 8, raise: 7, tail: 9, fan: 7, wag: 9, crest: 5, legL: 9, legR: 9, eyes: 26,
};
const KEYS = Object.keys(RATES);
const newPose = () => { const p = {}; for (const k of KEYS) p[k] = 0; p.eyes = 1; return p; };
const OSC = ['bob', 'lean', 'roll', 'crouch', 'hYaw', 'hPitch', 'hRoll', 'neck', 'dip', 'beak', 'tail', 'wag', 'fan', 'wing', 'flap', 'flare', 'footX', 'footY', 'grip'];
const zeroOsc = (o) => { for (const k of OSC) o[k] = 0; o.flapF = 14; return o; };

// Tư thế mổ: k = 0 sẵn sàng (đầu cúi nhìn), 1 = mỏ chạm thức ăn
function peckPose(p, o, k) {
  p.lean = -0.6; p.crouch = 0.3; p.neck = 0.3; p.hPitch = -0.75; p.fluff = Math.min(p.fluff, 0);
  o.lean += -0.85 * k; o.crouch += 0.3 * k; o.neck += 0.7 * k; o.dip += k; o.hPitch += -0.65 * k;
}

// Các hoạt động thường ngày. go: chỗ cần tới trước (cóng ăn, cóng nước, kẹp đồ tươi)
const ACTS = {
  idle: { dur: [1.2, 3.6], tick(a, dt, f, g) { this.idleLook(dt, f, g); } },
  settle: { dur: [3, 6], tick(a, dt, f, g) { g.fluff = Math.max(g.fluff, 0.45); g.crouch = 0.45; g.neck = -0.6; this.idleLook(dt, f, g, 0.35); } },
  hop: { dur: [0.05, 0.1], start(a, f) { this.goTo(this.randomSpot(f)); }, tick(a, dt, f, g) { this.idleLook(dt, f, g); } },
  back: { dur: [0.05, 0.1], start(a, f) { this.goTo(this.randomSpot(f, false)); }, tick(a, dt, f, g) { this.idleLook(dt, f, g); } },
  peck: { go: 'food', dur: [2.5, 5], tick(a, dt, f, g, o) { this.peckTick(a, dt, f, g, o, 0.2); } },
  search: { go: 'food', dur: [1.4, 2.4], tick(a, dt, f, g, o) { this.peckTick(a, dt, f, g, o, 0.55); } },
  nibble: { go: 'fresh', dur: [2, 3.6], tick(a, dt, f, g, o) { this.peckTick(a, dt, f, g, o, 0.3); } },
  drink: { go: 'water', dur: [2.2, 3.4], tick(a, dt, f, g, o) { this.drinkTick(a, dt, f, g, o); } },
  seekWater: { go: 'water', dur: [1.4, 2.2], tick(a, dt, f, g, o) { this.peckTick(a, dt, f, g, o, 0.6); g.beak = 0.35; } },
  preen: { dur: [2, 4], tick(a, dt, f, g, o) { this.preenTick(a, dt, f, g, o); } },
  stretch: { dur: [1.4, 1.7], tick(a, dt, f, g) { this.stretchTick(a, dt, f, g); } },
  glance: { dur: [1.2, 2.4], tick(a, dt, f, g) { this.lookAtCam(a, f, g, 0.35); } },
  shake: { dur: [0.85, 1.05], tick(a, dt, f, g, o) { this.shakeTick(a, f, g, o); } },
  flutter: { dur: [0.7, 1.2], start(a, f) { if (Math.random() < 0.5 && !f.reduceMotion) this.goTo(this.barSpot()); }, tick(a, dt, f, g, o) { this.flutterTick(a, dt, f, g, o); } },
  floor: { dur: [2.2, 4], start() { this.goTo(this.floorSpot()); }, tick(a, dt, f, g, o) { a.kmax = 0.3; this.peckTick(a, dt, f, g, o, 0.45); } },
  hide: {
    dur: [3, 6],
    start(a, f) { this.goTo({ perch: this.perchIndex(), z: rand(-0.09, -0.06), face: this.defaultFace(this.perchIndex()) }); },
    tick(a, dt, f, g) { g.fluff = -0.6; g.crouch = 0.25; g.lean = 0.15; this.idleLook(dt, { nervous: true }, g, 1.3); },
  },
  pant: { dur: [2, 4], tick(a, dt, f, g, o) { g.beak = 0.45; o.beak += Math.sin(this.time * 13) * 0.15; g.liftL = g.liftR = 0.7; g.fluff = -0.4; g.hPitch = 0.1; this.idleLook(dt, f, g, 0.4); } },
  // Dáng riêng từng loài
  bob: { dur: [1.2, 2.2], tick(a, dt, f, g, o) { this.bobTick(a, dt, f, g, o); } },
  sidestep: { dur: [1, 1.8], tick(a, dt, f, g, o) { this.sidestepTick(a, dt, f, g, o); } },
  bow: { dur: [1.8, 2.6], tick(a, dt, f, g, o) { this.bowTick(a, f, g, o); } },
  flick: { dur: [0.7, 1.3], tick(a, dt, f, g, o) { this.flickTick(a, dt, f, g, o); } },
  cock: { dur: [1.9, 2.6], tick(a, dt, f, g, o) { this.cockTick(a, f, g, o); } },
  crest: { dur: [1.6, 3], tick(a, dt, f, g, o) { g.crest = env(a.t, a.dur, 0.15, 0.7); g.lean = 0.1; this.idleLook(dt, f, g, 1.3); if (a.t < 0.2) o.tail -= 0.25 * bump(a.t / 0.2); } },
  fidget: { dur: [0.9, 1.6], tick(a, dt, f, g) { this.fidgetTick(a, dt, f, g); } },
  // Phản ứng với thao tác người chơi
  attend: { dur: [2.6, 3.4], tick(a, dt, f, g, o) { this.attendTick(a, dt, f, g, o); } },
  curious: { dur: [1.6, 2.4], tick(a, dt, f, g) { a.side ??= Math.random() < 0.5 ? -1 : 1; if (a.t > a.dur * 0.55 && !a.flip) { a.flip = 1; a.side = -a.side; } this.lookAtCam(a, f, g, 0.55); } },
  startle: {
    dur: [1.6, 2.2],
    start(a, f) { this.goTo(this.randomSpot(f, true)); },
    tick(a, dt, f, g, o) { if (a.t < 0.6) this.flutterTick({ t: a.t, dur: 0.6 }, dt, f, g, o); g.fluff = -0.6; g.lean = 0.25; g.crest = 1; this.idleLook(dt, { nervous: true }, g, 1.4); },
  },
  grip: { dur: [1.3, 1.8], tick(a, dt, f, g) { g.crouch = 0.65; g.fluff = -0.3; g.liftL = g.liftR = 0.35; g.lean = -0.1; this.idleLook(dt, { nervous: true }, g, 1.2); } },
  wake: { dur: [2.4, 2.8], tick(a, dt, f, g, o) { if (a.t < 1.5) this.stretchTick({ t: a.t, dur: 1.5, kind: 'up' }, dt, f, g); else this.shakeTick({ t: a.t - 1.5, dur: a.dur - 1.5 }, f, g, o); } },
  // Chim non đói: hạ mình, ngửa đầu há mỏ, hai cánh rung run run như đòi bố mẹ mớm mồi
  beg: { dur: [1.4, 2.4], tick(a, dt, f, g, o) { this.begTick(a, dt, f, g, o); } },
  alert: { dur: [1, 1.6], tick(a, dt, f, g) { g.fluff = -0.4; g.lean = 0.2; g.hPitch = 0.15; g.crest = 0.8; this.idleLook(dt, { nervous: true }, g, 1.3); } },
};

/**
 * Chim dựng từ khối cơ bản. Mặt hướng +x, gốc tọa độ ở bàn chân (đứng trên cầu).
 * Thông số hình dáng lấy từ SPECIES[x].model; hành vi do World truyền vào qua update(dt, flags).
 */
export class Bird {
  constructor() {
    this.group = new THREE.Group();
    this.time = 0;
    this.pose = newPose();
    this.goal = newPose();
    this.osc = zeroOsc({});
    this.imp = { bob: 0, tail: 0, fan: 0, land: 0, wob: 0, settle: 0 };
    this.look = { yaw: 0, pitch: 0, roll: 0, timer: 0 };
    this.act = null;
    this.queue = [];
    this.hop = null;
    this.spot = null;
    this.yawGoal = 0;
    this.panicT = 0;
    this.mode = 'normal';
    this.flapPh = 0;
    this.nextBlink = 2; this.blinkT = 0;
    this.splash = 0; // cường độ văng nước lúc rũ mình (World đọc để phun giọt)
    this.v = new THREE.Vector3();
    this.mats = []; this.geos = []; this.texs = []; this.featherMats = []; this.wingMats = []; this.shells = [];
  }

  // -------------------------------------------------------------------------
  // Dựng hình
  build(model, key = '') {
    this.dispose();
    const g = shared();
    const C = model.colors;
    const T = this.traits = traitsFor(key, model);
    this.model = model; this.key = key;
    const M = (color, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...extra }); this.mats.push(m); return m; };
    // Lông thân: vân lông vảy cá + pháp tuyến, ánh bóng theo loài (chích chòe, sáo ánh lam; họa mi, khuyên mờ mịn)
    const contour = contourTextures();
    const plume = (color, rep = [6, 4], extra = {}) => {
      const map = contour.color.clone(), nm = contour.normal.clone();
      map.repeat.set(...rep); nm.repeat.set(...rep); map.needsUpdate = nm.needsUpdate = true;
      this.texs.push(map, nm);
      const m = new THREE.MeshPhysicalMaterial({
        color, map, normalMap: nm, normalScale: new THREE.Vector2(0.22, 0.22), roughness: 0.88 - T.gloss * 0.38, metalness: 0,
        sheen: 0.12 + T.gloss * 0.2, sheenColor: new THREE.Color(T.sheen), sheenRoughness: 0.5,
        clearcoat: T.gloss * 0.45, clearcoatRoughness: 0.42, ...extra,
      });
      this.mats.push(m); return m;
    };
    const ftex = featherTexture();
    const featherMat = (color) => {
      const m = new THREE.MeshStandardMaterial({ color, map: ftex, alphaTest: 0.35, side: THREE.DoubleSide, transparent: true, roughness: 0.78 - T.gloss * 0.35 });
      this.mats.push(m); this.featherMats.push(m); return m;
    };
    const mesh = (geo, mat, sx, sy, sz, x = 0, y = 0, z = 0, parent) => {
      const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent?.add(m); return m;
    };
    // Lông tơ: các lớp vỏ (shell) nở dọc pháp tuyến, cắt bằng mật độ ngẫu nhiên → viền mềm, xốp như lông thật.
    // Một InstancedMesh mỗi phần, gl_InstanceID là chỉ số lớp; con của mesh gốc nên co giãn, xù lông theo.
    const fz = fuzzTexture();
    const fuzz = (base, len, rep, layers = 6) => {
      layers = Math.max(2, Math.round(layers * FUZZ_Q));
      const am = fz.clone(); am.wrapS = am.wrapT = THREE.RepeatWrapping; am.repeat.set(...rep); am.needsUpdate = true;
      this.texs.push(am);
      const vc = !!base.geometry.attributes.color;
      const m = new THREE.MeshStandardMaterial({ color: vc ? '#ffffff' : base.material.color, vertexColors: vc, alphaMap: am, alphaTest: 0.5, roughness: 0.95 });
      const L = (len / base.scale.y).toFixed(5);
      m.onBeforeCompile = (sh) => {
        sh.vertexShader = 'varying float vLay;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          `#include <begin_vertex>\nvLay = (float(gl_InstanceID) + 1.0) / ${layers}.0;\ntransformed += objectNormal * ${L} * vLay;`);
        sh.fragmentShader = 'varying float vLay;\n' + sh.fragmentShader.replace('#include <alphamap_fragment>',
          'diffuseColor.a = step(0.18 + 0.78 * vLay, texture2D(alphaMap, vAlphaMapUv).g);\ndiffuseColor.rgb *= mix(0.82, 1.08, vLay);')
          // Viền sáng Fresnel ở mép dáng: chim lông tối vẫn nổi khỏi nền phòng tối
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0) * vLay;\ntotalEmissiveRadiance += (diffuseColor.rgb * 0.5 + vec3(0.09, 0.08, 0.06)) * rim;');
      };
      m.customProgramCacheKey = () => `fuzz${L}/${layers}`;
      this.mats.push(m);
      const sh = new THREE.InstancedMesh(base.geometry, m, layers);
      sh.frustumCulled = false;
      base.add(sh); this.shells.push(sh);
      return sh;
    };
    const root = new THREE.Group();
    root.scale.setScalar(model.size);
    this.group.add(root);

    // Chân có khớp: hông → (đùi khuất trong lông) → gót → cẳng → bàn chân với ngón quặp cầu
    const legMat = M(C.legs, { roughness: 0.6, map: scaleTexture() });
    const thighMat = plume(C.belly, [2, 2]);
    const legs = [-1, 1].map((s) => {
      const hip = new THREE.Group(); root.add(hip);
      mesh(g.lo, thighMat, 0.0085, TIB * 0.5, 0.0075, 0, -TIB * 0.42, 0, hip);
      const heel = new THREE.Group(); heel.position.y = -TIB; hip.add(heel);
      mesh(g.tarsus, legMat, 1, TAR, 1, 0, 0, 0, heel);
      const foot = new THREE.Group(); foot.position.y = -TAR; heel.add(foot);
      const front = new THREE.Mesh(T.parrot ? g.toesFront2 : g.toesFront, legMat), back = new THREE.Mesh(T.parrot ? g.toeBack2 : g.toeBack, legMat);
      foot.add(front, back);
      return { s, hip, heel, foot, front, back };
    });

    // Thân: một khối thuôn tô màu lưng, bụng, hậu môn theo đỉnh
    const body = new THREE.Group(); body.position.y = BODY_Y; root.add(body);
    const vc = plume('#ffffff', [11, 8], { vertexColors: true });
    const vcHead = plume('#ffffff', [14, 7], { vertexColors: true });
    const top = hex(C.body), bot = hex(C.belly), vent = hex(T.vent), band = T.band && hex(T.band), breast = T.breast && hex(T.breast);
    const torsoGeo = paint(g.torso.clone(), (x, y, z, out) => {
      const u = x / 0.054, v = y / 0.037, w = Math.abs(z) / 0.037;
      out.copy(top);
      const b = model.lowBelly ? -0.42 + 0.05 * u : -0.2 + 0.42 * u; // ranh giới lưng – bụng
      let k = sstep(b + 0.09, b - 0.09, v);
      if (model.lowBelly) k *= sstep(0.62, 0.3, u);
      out.lerp(bot, k);
      if (breast) out.lerp(breast, sstep(0.3, 0.8, u) * sstep(0.45, -0.2, v) * (model.scalyBreast ? 0.35 + 0.65 * sstep(0.1, 0.6, Math.sin(x * 900) * Math.sin(z * 700 + 1)) : 1)); // chích chòe non: ngực lốm đốm vảy
      if (band) out.lerp(band, Math.exp(-((u - 0.52) ** 2) / 0.018) * sstep(0.25, 0.6, w) * sstep(0.5, 0, v) * 0.9);
      out.lerp(vent, sstep(-0.5, -0.85, u) * sstep(0.1, -0.45, v));
      out.multiplyScalar(0.8 + 0.2 * sstep(-1, 0.1, v)); // bóng tối tự nhiên dưới bụng
    });
    this.geos.push(torsoGeo);
    const torso = mesh(torsoGeo, vc, T.long, T.plump, T.plump * 0.82, 0, 0, 0, body);
    torso.castShadow = true;
    fuzz(torso, 0.0026, [7, 5], 7);
    const ventM = mesh(g.lo, plume(T.vent, [3, 2]), 0.017, 0.009, 0.013, -0.04, -0.017, 0, body); // lông dưới đuôi
    fuzz(ventM, 0.0022, [3, 2], 5);

    // Cánh có khớp vai → khuỷu → cổ tay. Dựng ở tư thế xếp: mặt cánh áp sườn (mặt phẳng xy của vai),
    // xương hướng ra sau (-x). Dang cánh = xoay vai quanh trục thân; duỗi = xoay khuỷu, cổ tay trong mặt cánh.
    // Mỗi lông là một tấm riêng (lông bay sơ cấp ở bàn tay, thứ cấp ở cẳng tay, lông phủ lớn phủ lên gốc).
    const W = T.wing;
    const wingMat = model.barring ? M('#ffffff', { map: budgieBarring(), roughness: 0.7 }) : plume(C.wing, [4, 3], { clearcoat: T.gloss * 0.15 });
    const mcMat = featherMat(model.barring ? shade(C.wing, 0.6) : C.wing);
    const flightMat = featherMat(shade(C.wing, 0.72));
    const gcMat = featherMat(C.wingBar || C.wing);
    this.wingMats = [flightMat, gcMat];
    const wings = [-1, 1].map((s) => {
      const sh = new THREE.Group(); sh.position.set(0.02, 0.012, s * 0.027); body.add(sh);
      const elbow = new THREE.Group(); sh.add(elbow);
      const wrist = new THREE.Group(); elbow.add(wrist);
      const cards = [];
      const card = (parent, mat, len, wid, x, y, z, a0, a1, cast) => {
        const m = mesh(g.featherV, mat, len, wid, wid, x, y, z, parent); m.castShadow = !!cast;
        cards.push({ m, a0, a1, joint: parent === wrist ? 2 : parent === sh ? 0 : 1, x0: x });
      };
      // Lông bay thứ cấp (cẳng tay) – xếp: chĩa ra sau hơi xuống; mở: xếp hàng dọc mép sau
      for (let i = 0; i < 5; i++) card(elbow, flightMat, (0.031 - i * 0.0008) * W, 0.0125, -0.0015 - i * 0.0024, -0.0015, s * (0.0013 - i * 0.0002), 0.16 + i * 0.035, 0.06 + i * 0.1, i === 2);
      // Lông bay sơ cấp (bàn tay) – ngoài cùng dài nhất, xòe như quạt khi mở
      for (let i = 0; i < 6; i++) card(wrist, flightMat, (0.036 + i * 0.0016) * W, 0.0115, -0.001 - i * 0.0019, -0.0008, s * (0.0006 - i * 0.00022), 0.04 + i * 0.022, 0.62 + i * 0.17, i === 5);
      // Lông phủ lớn (phủ gốc lông thứ cấp)
      for (let i = 0; i < 5; i++) card(elbow, gcMat, 0.018 * W, 0.0105, 0.002 - i * 0.0032, -0.0028, s * 0.0034, 0.1 + i * 0.03, 0.05 + i * 0.09, i === 2);
      // Lông phủ nhỏ ở vai (khối tròn trên cánh xếp)
      const cov = mesh(g.sphere, wingMat, 0.02 * W, 0.0115, 0.0068, -0.008 * W, 0.0035, s * 0.0016, sh);
      cov.castShadow = true;
      if (!model.barring) fuzz(cov, 0.0012, [3, 2], 4);
      // Lông phủ giữa: một hàng lông nhỏ viền mép dưới khối lông phủ cho mềm mại
      for (let i = 0; i < 6; i++) card(sh, mcMat, 0.0125 * W, 0.0085, 0.004 - i * 0.0034 * W, -0.0045 + i * 0.0003, s * 0.0056, 0.25 + i * 0.04, 0.15 + i * 0.08);
      if (C.wingPatch) mesh(g.lo, M(C.wingPatch), 0.0075, 0.0055, 0.0032, -0.003, -0.004, s * 0.0034, wrist);
      return { s, sh, elbow, wrist, cards };
    });

    // Đuôi: nhiều lông xếp quạt
    const tailPivot = new THREE.Group(); tailPivot.position.set(-0.047, -0.003, 0); tailPivot.rotation.order = 'YZX'; body.add(tailPivot);
    const tailMat = featherMat(C.tail), edgeMat = C.tailEdge ? featherMat(C.tailEdge) : null, tipMat = C.tailTip ? featherMat(C.tailTip) : null;
    const N = T.tailN, L = 0.075 * model.tail, half = (N - 1) / 2;
    const tail = [];
    for (let i = 0; i < N; i++) {
      const c = i - half, edge = Math.abs(c) / half;
      const len = L * lerp(1, T.tailShape, edge * edge);
      const m = mesh(g.feather, edgeMat && edge > 0.5 ? edgeMat : tailMat, len, T.tailW * 1.3, T.tailW * 1.3, 0, (1 - edge) * 0.0014, 0, tailPivot);
      m.rotation.x = 0.3 * c / half; // xếp hình mái: lông ngoài rủ xuống, nhìn ngang vẫn thấy bản đuôi
      m.castShadow = true;
      if (tipMat) mesh(g.feather, tipMat, 0.24, 1.04, 1.04, -0.76, 0.004, 0, m);
      tail.push({ m, c, len });
    }
    const tailTip = new THREE.Object3D(); tailTip.position.x = -L; tailPivot.add(tailTip);
    // Lông phủ trên đuôi: khối mềm nối lưng với đuôi
    fuzz(mesh(g.lo, plume(C.body, [3, 2]), 0.022, 0.0055, 0.011, -0.004, 0.0035, 0, tailPivot), 0.0016, [3, 2], 4);

    // Cổ (luôn giữ đầu ngang) và họng phồng khi hót
    const neck = new THREE.Group(); neck.position.set(0.032, 0.02, 0); body.add(neck);
    const hr = T.head, hs = hr / 0.024;
    const throat = mesh(g.lo, plume(T.throat, [3, 3]), 0.014 * hs, 0.016 * hs, 0.0185 * hs, 0.005, -0.006, 0, neck);
    throat.userData.base = throat.scale.clone();
    fuzz(throat, 0.0022, [4, 4], 6);
    // Gáy: lấp chỗ nối đầu với lưng để đầu liền thân, không như người tuyết
    fuzz(mesh(g.lo, plume(T.nape || mixHex(C.head, C.body, 0.35), [3, 3]), 0.016 * hs, 0.016 * hs, 0.0175 * hs, -0.008, 0.002, 0, neck), 0.002, [4, 4], 5);

    // Đầu
    const head = new THREE.Group(); head.rotation.order = 'YZX'; head.position.set(0.006, 0.014, 0); neck.add(head);
    const hTop = hex(C.head), hThroat = hex(T.throat), cheekW = C.whiteCheek && hex(C.whiteCheek), nape = T.nape && hex(T.nape);
    const headGeo = paint(g.sphere.clone(), (x, y, z, out) => {
      out.copy(hTop);
      if (nape) out.lerp(nape, sstep(-0.05, -0.6, x) * sstep(-0.6, 0.1, y));
      out.lerp(hThroat, sstep(-0.22, -0.58, y) * sstep(-0.5, 0.05, x));
      if (cheekW) {
        out.lerp(cheekW, sstep(0.3, 0.55, Math.abs(z)) * sstep(-0.08, -0.28, y) * sstep(-0.55, -0.25, x));
        out.lerp(hTop, Math.exp(-((y + 0.62 - 0.25 * x) ** 2) / 0.006) * sstep(-0.1, 0.25, x) * sstep(0.2, 0.5, Math.abs(z))); // vạch đen dưới má
      }
      out.multiplyScalar(0.84 + 0.16 * sstep(-0.95, -0.2, y)); // dưới cằm tối hơn
    });
    this.geos.push(headGeo);
    const skull = mesh(headGeo, vcHead, hr * 1.04, hr, hr * 0.9, 0, 0, 0, head);
    skull.castShadow = true;
    fuzz(skull, 0.0011, [9, 6], 5);
    const decal = (dir, sx, sy, sz, mat, spin = 0, geo = g.lo) => {
      const d = new THREE.Vector3(...dir).normalize();
      const m = mesh(geo, mat, sx * hs, sy * hs, sz * hs, d.x * hr * 1.0, d.y * hr * 0.96, d.z * hr * 0.92, head);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
      m.rotateZ(spin);
      return m;
    };

    // Mắt: tròng đen bóng, đốm sáng, vòng mắt (khuyên, họa mi), vệt mi trắng (họa mi)
    const eyeR = 0.0049 * hs * (T.ring > 0.002 ? 0.9 : 1);
    const whiteIris = T.parrot && !model.darkEye; // yến phụng trưởng thành có vòng mống mắt trắng; con non mắt đen tuyền
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: whiteIris ? '#D9D4C8' : T.parrot ? '#17110C' : C.iris || '#4A2914', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 }); this.mats.push(eyeMat);
    const pupilMat = M('#050403', { roughness: 0.2 });
    const lidMat = M(C.head, { roughness: 0.85 });
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' }); this.mats.push(glint);
    const ringMat = C.eyeRing ? M(C.eyeRing, { roughness: 0.6 }) : null;
    const eyes = [-1, 1].map((s) => {
      const d = new THREE.Vector3(0.43, 0.27, s * 0.86).normalize().multiplyScalar(hr * 0.93);
      const holder = new THREE.Group(); holder.position.copy(d); head.add(holder);
      const ball = new THREE.Group(); holder.add(ball);
      mesh(g.lo, eyeMat, eyeR, eyeR, eyeR, 0, 0, 0, ball);
      mesh(g.lo, pupilMat, eyeR * (whiteIris ? 0.5 : 0.68), eyeR * (whiteIris ? 0.5 : 0.68), eyeR * 0.34, 0, 0, s * eyeR * 0.8, ball);
      // Hai đốm sáng: một to phía trên trước, một nhỏ phía dưới sau → mắt long lanh, có hồn
      mesh(g.lo, glint, eyeR * 0.28, eyeR * 0.28, eyeR * 0.2, eyeR * 0.36, eyeR * 0.4, s * eyeR * 0.84, ball);
      mesh(g.lo, glint, eyeR * 0.12, eyeR * 0.12, eyeR * 0.1, -eyeR * 0.3, -eyeR * 0.36, s * eyeR * 0.9, ball);
      const lid = mesh(g.lid, lidMat, eyeR * 1.14, eyeR * 1.14, eyeR * 1.14, 0, 0, 0, holder); // mí dưới kéo lên khi chớp
      if (ringMat) {
        const r = mesh(g.ring, ringMat, eyeR * 1.25, eyeR * 1.25, T.ring / 0.22 / 1.0 * 0.6, 0, 0, s * eyeR * 0.15, holder);
        const rk = T.ring / 0.0024; // 1 = vòng mắt đầy đặn của chim trưởng thành
        r.scale.set(eyeR * (1 + 0.2 * rk) + T.ring * 0.5, eyeR * (1 + 0.2 * rk) + T.ring * 0.5, eyeR * (0.5 + 0.5 * rk));
      }
      if (model.brow) { // vệt mi trắng kéo dài sau mắt
        const st = decal([-0.05, 0.36, s * 0.93], 0.0115, 0.0023, 0.0018, ringMat || M('#F4F0E6'));
        st.rotateZ(s * 0.18);
      }
      return { ball, lid, s };
    });

    // Mỏ
    const [bl, br, curve] = T.bill;
    const billMat = M('#ffffff', { roughness: 0.38, vertexColors: true });
    const billBase = hex(shade(C.bill, 0.82)), billTip = hex(mixHex(C.bill, '#F4EEDC', 0.18));
    const tint = (geo, len) => paint(geo, (x, y, z, out) => out.copy(billBase).lerp(billTip, sstep(0.1, 1, x / len)));
    const upper = new THREE.Group(); upper.position.set(hr * 0.78, -hr * (T.parrot ? 0.02 : 0.1), 0); head.add(upper);
    const uGeo = tint(billGeo(bl, br, curve, T.parrot ? 1.45 : 1), bl); this.geos.push(uGeo);
    upper.add(new THREE.Mesh(uGeo, billMat));
    const beakTip = new THREE.Object3D(); beakTip.position.set(bl * 0.95, -curve * bl * 0.55, 0); upper.add(beakTip);
    const lower = new THREE.Group(); lower.position.set(hr * 0.72, -hr * (T.parrot ? 0.3 : 0.29), 0); head.add(lower);
    // Hàm dưới hẹp hơn hàm trên: hai mặt không trùng nhau nên không bị chập hình (z-fighting)
    const lGeo = tint(billGeo(bl * (T.parrot ? 0.55 : 0.88), br * 0.74, T.parrot ? -0.6 : -0.1, 0.7).scale(1, 1, 0.84), bl * (T.parrot ? 0.55 : 0.88)); this.geos.push(lGeo);
    lower.add(new THREE.Mesh(lGeo, billMat));

    // Chi tiết đầu từng loài
    if (model.parrot) {
      decal([0.9, 0.12, 0], 0.0065, 0.004, 0.0045, M(C.cere || '#4F6FC8'), 0); // mũi (cere): trống xanh dương, mái nâu; con non hồng nhạt
      if (model.foreheadBars) { // con non: vằn đen kéo tới trán, sát mũi
        const bar = M('#2B2A1E');
        for (const [y, w] of [[0.42, 0.0105], [0.6, 0.0115], [0.76, 0.01]]) decal([0.82 - y * 0.55, y, 0], w, 0.0009, 0.0012, bar);
      }
      for (const s of [-1, 1]) fuzz(decal([0.4, -0.55, s * 0.73], 0.0058, 0.0072, 0.0026, M(C.cheek, { roughness: 0.9 })), 0.0006, [2, 2], 4); // má tím
      const dot = M('#141414');
      for (const zz of [-0.42, -0.16, 0.16, 0.42]) decal([0.68, -0.72, zz], 0.0022, 0.0022, 0.0016, dot); // đốm cổ
    } else if (C.cheek) {
      for (const s of [-1, 1]) fuzz(decal([-0.05, -0.08, s * 0.99], 0.0072, 0.0046, 0.0018, M(C.cheek, { roughness: 0.9 }), s * 0.25), 0.0007, [2, 2], 4); // túm lông đỏ sau mắt chào mào
    }
    let crest = null;
    if (model.crest || model.tuft) {
      crest = new THREE.Group(); head.add(crest);
      const cm = featherMat(C.head);
      const list = model.crest
        ? [[0.054, 0.0115, 0, 0], [0.046, 0.0115, 0.15, 0.0016], [0.046, 0.0115, 0.15, -0.0016], [0.036, 0.012, 0.34, 0], [0.026, 0.012, 0.56, 0]]
        : [[0.019, 0.0075, 0, 0], [0.016, 0.007, 0.35, 0.0025], [0.016, 0.007, 0.35, -0.0025], [0.013, 0.007, 0.7, 0]];
      for (const [len, w, a, z] of list) { const m = mesh(g.featherV, cm, len, w, w, -a * 0.012, 0, z, crest); m.rotation.z = a; m.castShadow = true; }
      crest.userData.k = model.crestK ?? 1; // chim non: mào, chỏm lông còn ngắn
      if (model.crest) { crest.position.set(hr * 0.12, hr * 0.84, 0); crest.userData.rest = -Math.PI / 2 + 0.32; crest.userData.up = -0.5; }
      else { crest.position.set(hr * 0.8, hr * 0.42, 0); crest.userData.rest = -Math.PI / 2 - 0.55; crest.userData.up = -0.25; }
    }

    this.parts = { root, body, torso, legs, wings, tailPivot, tail, tailTip, neck, throat, head, skull, eyes, upper, lower, beakTip, crest, vent: ventM };
    this.pose = newPose(); this.goal = newPose();
    this.molted = null;
    this.applyPose(this.pose, zeroOsc({}));
    this.measure();
  }

  dispose() {
    for (const sh of this.shells || []) sh.dispose();
    this.group.clear();
    for (const m of this.mats) m.dispose();
    for (const g of this.geos) g.dispose();
    for (const t of this.texs) t.dispose();
    this.mats = []; this.geos = []; this.texs = []; this.featherMats = []; this.wingMats = [];
    this.parts = null;
  }

  /** Đo tầm với của mỏ khi mổ và độ dài thân (đơn vị lồng) để chọn chỗ đứng hợp lý. */
  measure() {
    const P = this.parts, s = this.group.scale.x, v = this.v;
    const saveYaw = this.group.rotation.y, savePos = this.group.position.clone();
    this.group.rotation.y = 0; this.group.position.set(0, 0, 0);
    const local = (o) => { this.group.updateMatrixWorld(true); o.getWorldPosition(v); return this.group.worldToLocal(v).multiplyScalar(s); };
    const rest = newPose();
    this.applyPose(rest, zeroOsc({}));
    const front = local(P.beakTip).x, back = -local(P.tailTip).x;
    const p = newPose(), o = zeroOsc({});
    peckPose(p, o, 1);
    this.applyPose(p, o);
    const tip = local(P.beakTip);
    this.reach = { h: Math.hypot(tip.x, tip.z), y: tip.y };
    this.extent = { front, back };
    this.applyPose(this.pose, zeroOsc({}));
    this.group.rotation.y = saveYaw; this.group.position.copy(savePos);
    this.computeStations();
  }

  // -------------------------------------------------------------------------
  // Chỗ đứng trong lồng
  /** cage: { perches: [{x, y}], targets: { food, water, fresh: {x, y, z} }, R } */
  setCage(cage) {
    this.perches = cage.perches; this.targets = cage.targets; this.R = cage.R;
    this.computeStations();
    const i = 1;
    this.spot = { perch: i, z: 0, face: this.defaultFace(i) };
    const p = this.spotPos(this.spot);
    this.group.position.set(p.x, p.y, p.z);
    this.group.rotation.y = this.yawGoal = p.yaw;
    this.hop = null; this.act = null; this.queue.length = 0;
  }

  computeStations() {
    if (!this.perches || !this.reach) return;
    const m = 0.02, lim = this.R - m;
    // Quay mặt vào giữa lồng được không (mỏ và đuôi không chạm nan)?
    this.fitsIn = this.perches.map((p) => {
      const s = -Math.sign(p.x) || 1;
      const a = p.x + s * this.extent.front, b = p.x - s * this.extent.back;
      return Math.abs(a) < lim && Math.abs(b) < lim;
    });
    this.stations = {};
    for (const [key, c] of Object.entries(this.targets || {})) {
      let best = null;
      this.perches.forEach((p, i) => {
        const dy = p.y - c.y;
        if (dy < -0.015 || dy > 0.1) return;
        const score = Math.abs(p.x - c.x) + Math.abs(dy - 0.03);
        if (!best || score < best.score) best = { i, p, score };
      });
      if (!best) continue;
      const { p, i } = best, dx = c.x - p.x;
      const along = Math.sqrt(Math.max(0, this.reach.h ** 2 - dx * dx));
      const z = clamp(c.z - (Math.sign(c.z) || 1) * along, -0.13, 0.13);
      this.stations[key] = { x: p.x, y: p.y, z, yaw: Math.atan2(-(c.z - z), dx), perch: i };
    }
  }

  defaultFace(i) {
    const p = this.perches[i];
    const out = p.x < 0 ? -1 : 1; // mặc định quay ra ngoài để đuôi dài nằm trong lồng
    return this.fitsIn?.[i] && Math.random() < 0.3 ? -out : out;
  }

  perchIndex() {
    const s = this.spot;
    if (!s) return 0;
    if (typeof s === 'string') return this.stations[s]?.perch ?? 0;
    return s.perch ?? (s.x < 0 ? 0 : 1);
  }

  spotPos(s) {
    if (typeof s === 'string') return this.stations[s];
    if (s.floor || s.air) return s;
    const p = this.perches[s.perch];
    return { x: p.x, y: p.y, z: s.z, yaw: s.face > 0 ? 0 : Math.PI };
  }

  randomSpot(f, other = Math.random() < 0.7) {
    const cur = this.perchIndex();
    const i = other ? 1 - cur : cur;
    const z = f?.nervous ? rand(-0.09, -0.04) : rand(-0.075, 0.075);
    return { perch: i, z, face: this.defaultFace(i) };
  }
  /** Một chỗ trên sàn lồng (chim nhảy xuống nhặt hạt rơi). */
  floorSpot() {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.09;
    return { floor: true, x: Math.cos(a) * r, y: 0.004, z: Math.sin(a) * r, yaw: Math.random() * Math.PI * 2 };
  }

  /** Điểm sát nan lồng giữa không trung (hoảng thì lao vào nan rồi rơi lại). */
  barSpot() {
    const a = Math.random() * Math.PI * 2, r = this.R - 0.085 - 0.02 * this.model.size;
    return { air: true, x: Math.cos(a) * r, y: rand(0.2, 0.28), z: Math.sin(a) * r, yaw: Math.atan2(-Math.sin(a), Math.cos(a)) };
  }


  /** Nhảy tới chỗ `spot` (cầu + vị trí z, hoặc tên trạm 'food' | 'water' | 'fresh'). */
  goTo(spot) {
    const to = this.spotPos(spot);
    if (!to) return false;
    const p = this.group.position;
    const dx = to.x - p.x, dy = to.y - p.y, dz = to.z - p.z;
    const dist = Math.hypot(dx, dz);
    this.spot = spot;
    if (dist < 0.004 && Math.abs(dy) < 0.004) { this.turnTo(to.yaw); return true; }
    const big = Math.abs(dy) > 0.01 || dist > 0.06 || !!spot.air;
    // Số cú vỗ theo quãng đường; thời gian bay = số cú vỗ / nhịp vỗ của loài + lúc hãm
    const beats = big ? clamp(Math.round(Math.hypot(dist, dy) / 0.07) + 1, 1, 4) : 0;
    const flare = 0.13, dur = big ? beats / this.traits.flapHz + flare + 0.05 : rand(0.13, 0.19);
    const wait = big ? 0.12 : 0.06;
    this.hop = {
      from: p.clone(), to: new THREE.Vector3(to.x, to.y, to.z), p: 0, wait, wait0: wait, dur, flareT: big ? flare / dur : 0, beats,
      h: big ? 0.03 + Math.max(0, dy) * 0.55 : 0.012,
      flap: big, yaw: big ? Math.atan2(-dz, dx) : null, end: to.yaw,
    };
    return true;
  }


  /** Quay người; quay nhiều thì nhún một cái nhảy tại chỗ. */
  turnTo(yaw) {
    if (Math.abs(wrap(yaw - this.yawGoal)) > 1 && !this.hop) {
      const p = this.group.position;
      this.hop = { from: p.clone(), to: p.clone(), p: 0, wait: 0.04, dur: 0.17, h: 0.012, flap: false, yaw: null, end: yaw };
    }
    this.yawGoal = yaw;
  }

  turnAround() {
    const s = this.spot;
    if (!s || typeof s === 'string' || s.floor || s.air) return;
    const face = -s.face, i = s.perch;
    const out = this.perches[i].x < 0 ? -1 : 1;
    if (face !== out && !this.fitsIn?.[i]) return;
    this.spot = { ...s, face };
    this.turnTo(face > 0 ? 0 : Math.PI);
  }

  // -------------------------------------------------------------------------
  // Hành vi
  /** Yêu cầu phản ứng (World.onAct). Phản ứng mới nhất thay phản ứng cũ chưa chạy. */
  react(type) { this.queue[0] = type; }

  startReaction(type, f) {
    const map = {
      food: f.eat ? 'peck' : 'search', fresh: f.fresh ? 'nibble' : 'curious', water: f.water ? 'drink' : 'seekWater',
      startle: 'startle', shake: 'shake', settle: 'settle', wake: 'wake', attend: 'attend', curious: 'curious',
      grip: 'grip', alert: 'alert', cower: 'hide',
    };
    if (type === 'panic') { this.panicT = rand(2.6, 3.4); this.act = null; return; }
    if (type === 'cower') this.panicT = 0.8;
    if (map[type]) this.act = this.makeAct(map[type], f);
  }

  makeAct(type, f) {
    const A = ACTS[type];
    const a = { type, t: 0, dur: rand(...A.dur), go: A.go, arrived: !A.go };
    if (a.go && !this.stations?.[a.go]) a.arrived = true;
    if (a.arrived) A.start?.call(this, a, f);
    return a;
  }

  nextAct(f) {
    const T = this.traits;
    const calm = f.covered || f.sick || f.drowsy;
    const w = { idle: calm ? 4 : f.nervous ? 1 : 1.4 };
    if (f.eat) w.peck = f.hungry ? 7 : calm ? 0.5 : 1.3;
    else if (f.hungry && !calm) w.search = 2.5;
    if (f.fresh && !calm) w.nibble = 0.6;
    if (f.young && f.peckish && !calm) w.beg = f.hungry ? 4 : 1.5;
    if (f.overFire && !calm) { w.flutter = (w.flutter || 0) + 1.2; w.hop = (w.hop || 0) + 2; }
    if (f.water) w.drink = (f.hot ? 1.4 : 0.4) * (calm ? 0.5 : 1);
    else if (!calm) w.seekWater = 2.5;
    w.preen = 0.55 + (f.wet ? 2.2 : 0) + (f.molt ? 1 : 0) + (f.itch ? 2.5 : 0) + (f.ragged ? 1.2 : 0) + (f.lowFire ? 0.8 : 0);
    if (f.covered && !f.sick) w.settle = 3;
    if (!calm) {
      w.stretch = 0.25;
      w.hop = (0.4 + 1.6 * f.active) * T.hopRate;
      if (f.camNear && !f.nervous) w.glance = 0.25 + (f.trust || 0) / 140;
      if (f.nervous) { w.flutter = 0.35; if (this.group.position.z > -0.05) w.hide = 1.2; }
      if (f.wet) w.shake = 1.4;
      w.floor = f.nervous ? 0.05 : 0.35;
      if (f.hot) w.pant = 3;
      for (const [k, v] of Object.entries(T.gestures)) w[k] = v * (0.4 + f.active) * (f.nervous ? 0.3 : 1);
      if (T.bold) w.glance = (w.glance || 0) + 0.2;
    }
    let total = 0;
    for (const k in w) total += w[k];
    let r = Math.random() * total, type = 'idle';
    for (const k in w) { r -= w[k]; if (r <= 0) { type = k; break; } }
    // Đang ở cóng mà việc mới không cần cóng: thường quay về cầu trước
    if (typeof this.spot === 'string' && ACTS[type].go !== this.spot && type !== 'hop' && Math.random() < 0.75) type = 'back';
    if (this.spot?.floor && type !== 'floor' && type !== 'hop') type = 'back'; // nhặt xong thì bay về cầu
    return this.makeAct(type, f);
  }

  /**
   * f: cờ trạng thái do World suy ra từ S:
   * { sleep, drowsy, covered, sick, itch, molt, wet, bathing, fluff, eat, hungry, water, fresh, hot,
   *   nervous, active, trust, camNear, cam, sing, voice, onset }
   */
  update(dt, f) {
    if (!this.parts) return;
    this.time += dt;
    const t = this.time, T = this.traits, g = this.goal, o = zeroOsc(this.osc);
    for (const k of KEYS) g[k] = 0;
    g.eyes = 1;
    for (const k in this.imp) this.imp[k] *= Math.exp(-dt * 7);
    this.panicT = Math.max(0, this.panicT - dt);
    this.splash = 0; this.dust = 0;

    if (this.queue.length && !this.hop) this.startReaction(this.queue.shift(), f);

    let mode = 'normal';
    if (f.sleep) mode = 'sleep';
    else if (this.panicT > 0) mode = 'panic';
    else if (f.bathing) mode = 'bath';
    else if (f.sing) mode = 'sing';
    if (mode !== this.mode) {
      if (mode === 'sleep') this.tuck = Math.random() < 0.5 ? -1 : 1;
      if (this.mode === 'sleep' && mode === 'normal') this.act = this.makeAct('wake', f);
      this.mode = mode;
    }

    if (mode === 'normal') {
      if (!this.act || (this.act.t >= this.act.dur && !this.hop)) this.act = this.nextAct(f);
      const a = this.act;
      if (!a.arrived) {
        if (!this.hop) {
          if (this.spot === a.go) { a.arrived = true; ACTS[a.type].start?.call(this, a, f); }
          else if (!this.goTo(a.go)) a.arrived = true;
        }
        this.idleLook(dt, f, g);
      } else {
        a.t += dt;
        ACTS[a.type].tick.call(this, a, dt, f, g, o);
      }
    } else this[mode + 'Mode'](dt, f, g, o);

    this.tickHop(dt, f, o);

    // Lớp nền: xù lông, ốm, nhát, thay lông
    if (f.fluff && mode !== 'panic') g.fluff = Math.max(g.fluff, f.sick ? 0.95 : 0.7);
    if (f.fluff && mode === 'normal') g.neck -= 0.3; // lạnh, ốm: rụt cổ
    if (f.sick && mode !== 'sleep') { g.eyes = Math.min(g.eyes, 0.45); g.crouch = Math.max(g.crouch, 0.3); g.neck -= 0.5; g.tail += 0.15; }
    if (f.nervous && mode === 'normal' && !f.covered) { g.fluff = Math.min(g.fluff, -0.35); g.crest = Math.max(g.crest, 0.6); }
    if (f.drowsy && mode === 'normal') { g.eyes = Math.min(g.eyes, 0.55); g.neck -= 0.4; }
    if (T.bold && mode === 'normal') { g.lean += 0.1; g.hPitch += 0.06; } // họa mi: dáng ngực ưỡn
    if (f.excited && mode === 'normal') g.crest = Math.max(g.crest, 0.5);
    if (f.lowFire && mode === 'normal') { g.fluff = Math.max(g.fluff, 0.35); g.crest = 0; g.neck -= 0.25; g.tail += 0.1; } // xuống lửa: thu mình
    if (f.ragged && mode !== 'sleep') g.fluff = Math.max(g.fluff, 0.2); // lông xơ không ép sát thân
    if (f.molt !== this.molted) this.setMolt(f.molt);
    if (f.molt && mode === 'normal' && Math.random() < dt * 0.04) this.loose = 1; // mùa thay lông: lông rụng lác đác

    // Giọng: mỏ, họng khớp biên độ tiếng
    const voice = mode === 'sleep' ? 0 : f.voice || 0;
    g.beak = Math.max(g.beak, voice);
    g.throat = Math.max(g.throat, (mode === 'sleep' ? 0 : f.throat ?? voice) * 0.9);
    if (f.onset && mode !== 'sleep') {
      this.imp.bob += 1; this.imp.tail += mode === 'sing' ? 1 : 0.4;
      if (T.gestures.cock && mode === 'sing') this.imp.fan += 1;
    }
    o.bob -= this.imp.bob * 0.0022;
    o.tail -= this.imp.tail * 0.22;
    o.fan += this.imp.fan * 0.5;
    o.crouch += this.imp.land * 0.4;
    // Đáp xuống: đuôi, thân lắc giữ thăng bằng; rồi xếp cánh và rũ nhẹ cho lông vào nếp
    const still = f.reduceMotion ? 0.3 : 1;
    const wob = this.imp.wob * still;
    o.lean += Math.sin(t * 15) * 0.12 * wob; o.tail += Math.sin(t * 15 + 1.2) * 0.45 * wob; o.fan += 0.3 * wob;
    const st = this.imp.settle * (1 - this.imp.land) * still;
    o.wing += 0.22 * st * Math.abs(Math.sin(t * 38)); o.roll += Math.sin(t * 31) * 0.05 * st;
    this.breath = Math.sin(t * (f.sick || f.hot ? 9 : mode === 'sleep' ? 2.4 : 4.6));

    // Thở, chớp mắt
    o.bob += this.breath * 0.0003;
    if (t > this.nextBlink) { this.blinkT = 0.12; this.nextBlink = t + rand(2.2, 5.5); }
    this.blinkT = Math.max(0, this.blinkT - dt);
    if (this.blinkT > 0) g.eyes = Math.min(g.eyes, 0.08);
    if (f.cold) o.roll += Math.sin(t * 47) * 0.012; // run vì lạnh

    // Làm mượt về tư thế đích rồi áp vào khung xương
    const P = this.pose;
    for (const k of KEYS) P[k] += (g[k] - P[k]) * (1 - Math.exp(-dt * RATES[k]));
    this.flapPh += dt * o.flapF * Math.PI * 2;
    const dy = wrap(this.yawGoal - this.group.rotation.y);
    this.group.rotation.y += dy * (1 - Math.exp(-dt * (this.hop ? 14 : 9)));
    this.applyPose(P, o);
  }

  tickHop(dt, f, o) {
    const H = this.hop;
    if (!H) return;
    if (H.yaw !== null) this.yawGoal = H.yaw;
    if (H.wait > 0) { // lấy đà: nhún sâu dần, nghiêng người tới, cánh hơi nới
      H.wait -= dt;
      const k = sstep(0, 1, 1 - H.wait / H.wait0);
      o.crouch += 0.65 * k; o.lean -= 0.18 * k; o.tail -= 0.12 * k;
      if (H.flap) o.wing += 0.15 * k;
      if (H.wait <= 0) this.flapPh = Math.PI / 2; // cú vỗ đầu tiên là cú đập xuống
      return;
    }
    H.p = Math.min(1, H.p + dt / H.dur);
    const e = H.p, s = H.flap ? e : e * e * (3 - 2 * e);
    this.group.position.lerpVectors(H.from, H.to, s);
    this.group.position.y += bump(Math.pow(e, H.flap ? 0.8 : 1)) * H.h;
    // Chân đạp bật lên
    o.crouch += e < 0.12 ? -0.5 * bump(e / 0.12) : 0;
    o.grip += bump(clamp01((e - 0.05) / 0.9));
    if (H.flap) {
      const fz = 1 - H.flareT;
      const air = clamp01(e / 0.08) * (1 - sstep(fz, 1, e));
      o.flap = Math.max(o.flap, air); o.flapF = H.beats / (fz * H.dur);
      o.lean -= 0.4 * air;                      // thân nằm ngang khi bay
      o.footY += 0.02 * air; o.footX -= 0.012 * air; // co chân sát bụng
      // Hãm: thân dựng, cánh dang quét trước, đuôi xòe hạ xuống, chân với ra trước
      const fk = sstep(fz - 0.06, fz + 0.5 * (1 - fz), e);
      o.flare = Math.max(o.flare, fk);
      o.lean += 0.6 * fk; o.fan += fk; o.tail += 0.4 * fk;
      o.footX += 0.016 * fk; o.footY += 0.008 * fk * (1 - e);
    } else { // nhảy hai chân: cánh hé nhẹ, chân co
      o.wing += 0.18 * bump(e);
      o.footY += 0.006 * bump(e);
    }
    if (H.p >= 1) {
      this.hop = null; this.yawGoal = H.end;
      this.imp.land = H.flap ? 1 : 0.5; this.imp.wob = H.flap ? 1 : 0.4;
      if (H.flap) this.imp.settle = 1;
      if (this.spot?.air) this.goTo(this.randomSpot({ nervous: true }, Math.random() < 0.5)); // va nan lồng rồi rơi về cầu
    }
  }


  // ---- Các chế độ đặc biệt ----
  sleepMode(dt, f, g) {
    g.fluff = 1; g.crouch = 0.75; g.eyes = 0; g.tail = 0.12;
    if (f.tuck !== false) { const s = this.tuck || 1; g.hYaw = s * 2.65; g.hPitch = -0.35; g.hRoll = s * 0.25; g.neck = -1; }
    else { g.hPitch = -0.3; g.neck = -0.8; }
  }

  panicMode(dt, f, g, o) {
    g.lean = 0.35; g.fluff = -0.6; g.crest = 1;
    o.flap = 1; o.flapF = this.traits.flapHz * 1.1;
    o.bob += Math.abs(Math.sin(this.time * 15)) * 0.005;
    this.idleLook(dt, { nervous: true }, g, 2);
    if (!this.hop && Math.random() < dt * 2.2) {
      const r = Math.random();
      this.goTo(r < 0.35 ? this.barSpot() : r < 0.5 ? this.floorSpot() : this.randomSpot({ nervous: Math.random() < 0.5 }, Math.random() < 0.6));
    }
  }

  bathMode(dt, f, g, o) {
    const c = (this.time * 1.15) % 1;
    g.fluff = 0.9; g.crouch = 0.6; g.lean = -0.3; g.fan = 0.6;
    if (c < 0.55) { // nhúng mình, vẫy cánh
      o.flap = 0.55; o.flapF = this.traits.flapHz * 1.2;
      o.hPitch -= 0.45 * bump(c / 0.55); o.dip += 0.4 * bump(c / 0.55);
      o.roll += Math.sin(this.time * 31) * 0.12;
      this.splash = 0.6;
    } else { // rũ mình
      const k = bump((c - 0.55) / 0.45);
      o.roll += Math.sin(this.time * 55) * 0.38 * k;
      o.hRoll += Math.sin(this.time * 55 + 1) * 0.5 * k;
      o.wag += Math.sin(this.time * 50) * 0.4 * k;
      this.splash = k;
    }
  }

  singMode(dt, f, g, o) {
    const T = this.traits, v = f.voice || 0;
    if (typeof this.spot === 'string' && !this.hop) this.goTo(this.randomSpot(f, false)); // hót trên cầu, không cúi vào cóng
    g.lean = 0.14 + T.bold * 0.08;
    g.hPitch = 0.3 + 0.32 * v;
    g.fluff = 0.12;
    g.crest = 1;
    g.throat = v;
    if (T.gestures.cock) { g.tail = -0.3 - 0.3 * v; g.fan = 0.25 + 0.45 * v; } // chích chòe: đuôi vểnh, xòe theo tiếng
    if (T.bold) { g.liftL = g.liftR = 0.3; g.fan = Math.max(g.fan, 0.45); } // họa mi: xệ cánh, xòe đuôi
    if (T.gestures.fidget) o.roll += Math.sin(this.time * 38) * 0.03 * v; // khuyên rung người
    // Giữa các câu thì quay đầu nhìn quanh
    const L = this.look;
    L.timer -= dt;
    if (L.timer <= 0) { L.yaw = rand(-0.6, 0.6); L.timer = rand(0.8, 2); }
    g.hYaw = L.yaw * (1 - v * 0.6);
  }

  // ---- Từng hoạt động ----
  idleLook(dt, f, g, k = 1) {
    const L = this.look;
    L.timer -= dt;
    if (L.timer <= 0) {
      const nerv = f.nervous ? 1 : 0;
      L.yaw = rand(-0.9, 0.9) * (1 + 0.4 * nerv);
      L.pitch = rand(-0.15, 0.35);
      L.roll = Math.random() < 0.25 ? rand(-0.35, 0.35) : 0;
      L.timer = rand(0.5, 2.2) * (nerv ? 0.35 : 1) / Math.max(0.3, k);
    }
    g.hYaw = L.yaw * Math.min(1, k); g.hPitch += L.pitch * Math.min(1, k); g.hRoll = L.roll;
  }

  peckTick(a, dt, f, g, o, lookChance) {
    peckPose(g, o, 0);
    a.ph = (a.ph ?? 0) + dt;
    if (a.look) { // ngẩng lên nhìn quanh, nhai
      g.lean = -0.25; g.hPitch = -0.1; g.neck = 0;
      this.idleLook(dt, f, g, 0.6);
      o.beak += Math.max(0, Math.sin(this.time * 24)) * 0.12;
      if (a.ph > a.look) { a.look = 0; a.ph = 0; }
      return;
    }
    const cyc = a.cyc ??= rand(0.28, 0.42);
    const k = (a.ph < 0.2 ? bump(a.ph / 0.2) : 0) * (a.kmax ?? 1);
    o.lean = 0; o.crouch = 0; o.neck = 0; o.dip = 0; o.hPitch = 0;
    peckPose(g, o, k);
    g.beak = Math.max(g.beak, k * 0.25);
    if (a.ph >= cyc) {
      a.ph = 0; a.cyc = rand(0.26, 0.42);
      if (Math.random() < lookChance) a.look = rand(0.4, 0.9);
    }
  }

  drinkTick(a, dt, f, g, o) {
    const cyc = 1.1, ph = (a.t % cyc) / cyc;
    if (ph < 0.5) { const k = sstep(0, 0.35, ph) * sstep(0.5, 0.42, ph); peckPose(g, o, k); g.beak = 0.15; }
    else { // ngẩng lên cho nước trôi xuống (vẹt không cần ngửa)
      g.lean = -0.15; g.hPitch = this.traits.parrot ? 0 : 0.6 * bump((ph - 0.5) / 0.5); g.neck = 0.1;
      g.throat = 0.25 * bump((ph - 0.5) / 0.5);
    }
  }

  preenTick(a, dt, f, g, o) {
    a.tt = (a.tt ?? 0) - dt;
    if (a.tt <= 0) { a.target = ['wingL', 'wingR', 'chest', 'back', 'tail'][(Math.random() * 5) | 0]; a.tt = rand(0.9, 1.6); a.s = Math.random() < 0.5 ? -1 : 1; }
    g.fluff = Math.max(g.fluff, 0.5);
    const s = a.target === 'wingL' ? -1 : a.target === 'wingR' ? 1 : a.s;
    switch (a.target) {
      case 'wingL': case 'wingR':
        g.hYaw = -s * 2.0; g.hPitch = -0.55; g.hRoll = -s * 0.45; g.neck = -0.3; g[s < 0 ? 'liftL' : 'liftR'] = 0.4; break;
      case 'chest': g.hYaw = s * 0.25; g.hPitch = -1.3; g.neck = 0.1; g.dip = 0.3; g.lean = -0.1; break;
      case 'back': g.hYaw = -s * 2.6; g.hPitch = -0.2; g.neck = -0.6; break;
      default: g.hYaw = -s * 2.45; g.hPitch = -0.9; g.lean = -0.2; g.wag = -s * 0.35; g.fan = 0.45; g.neck = -0.2;
    }
    const t = this.time;
    o.hPitch += Math.sin(t * 26) * 0.07; o.hYaw += Math.sin(t * 19) * 0.05;
    o.beak += 0.1 + Math.sin(t * 31) * 0.1;
    if (Math.random() < dt * (f.molt ? 0.25 : 0.03)) this.loose = 1; // rỉa rơi một chiếc lông
  }

  stretchTick(a, dt, f, g) {
    a.kind ??= Math.random() < 0.35 ? 'up' : 'side';
    a.side ??= Math.random() < 0.5 ? -1 : 1;
    const e = env(a.t, a.dur, 0.35, 0.45);
    if (a.kind === 'up') { g.raise = e; g.hPitch = -0.25 * e; g.fluff = 0.3 * e; g.lean = -0.1 * e; return; }
    const side = a.side < 0 ? 'L' : 'R';
    g['wing' + side] = e; g['leg' + side] = e;
    g.fan = 0.85 * e; g.wag = a.side * 0.3 * e; g.lean = -0.15 * e; g.hYaw = -a.side * 0.4 * e; g.hPitch = 0.1 * e;
  }

  /** Quay đầu về phía camera, một mắt nhìn, nghiêng đầu `tilt`. */
  lookAtCam(a, f, g, tilt) {
    a.side ??= Math.random() < 0.5 ? -1 : 1;
    if (!f.cam) return;
    const v = this.group.worldToLocal(this.v.copy(f.cam));
    const cy = wrap(Math.atan2(-v.z, v.x));
    const yaw = clamp(cy + a.side * 0.55, -2.3, 2.3);
    g.twist = clamp((cy - yaw) * 0.6, -0.5, 0.5);
    g.hYaw = yaw;
    g.hPitch = clamp(Math.atan2(v.y - 0.1, Math.hypot(v.x, v.z)), -0.5, 0.6);
    g.hRoll = a.side * tilt;
  }

  shakeTick(a, f, g, o) {
    // Rũ mình: lắc đầu trước, rồi cả thân xoay qua lại, lông xù hết cỡ; xong thì lông áp sát lại
    const u = clamp01(a.t / a.dur), t = this.time;
    const hk = bump(u / 0.32), bk = bump((u - 0.25) / 0.6);
    g.fluff = u < 0.85 ? 1 : -0.3;
    o.hRoll += Math.sin(t * 57) * 0.65 * hk; o.hYaw += Math.sin(t * 57 + 1) * 0.3 * hk;
    o.roll += Math.sin(t * 69) * 0.38 * bk; o.hRoll -= Math.sin(t * 69) * 0.3 * bk;
    o.wag += Math.sin(t * 69 + 0.8) * 0.45 * bk; o.fan += 0.5 * bk;
    o.wing += 0.25 * bk * Math.abs(Math.sin(t * 40));
    if (f.wet || f.bathing) this.splash = Math.max(this.splash, bk);
    else this.dust = Math.max(this.dust, bk);
    if (!a.dropped && u > 0.5) { a.dropped = 1; if (Math.random() < (f.molt ? 0.6 : 0.15)) this.loose = 1; }
  }


  flutterTick(a, dt, f, g, o) {
    const e = bump(clamp01(a.t / a.dur));
    g.lean = 0.35; g.fluff = -0.5; g.crest = 1;
    o.flap = Math.max(o.flap, e); o.flapF = this.traits.flapHz;
    o.bob += Math.abs(Math.sin(this.time * 15)) * 0.006 * e;
    this.idleLook(dt, { nervous: true }, g, 1.5);
  }

  bobTick(a, dt, f, g, o) { // yến phụng gật gù
    const e = env(a.t, a.dur, 0.15, 0.2), w = Math.sin(this.time * 44);
    o.hPitch += w * 0.22 * e; o.neck += w * 0.4 * e; o.bob += w * 0.0018 * e;
    g.fluff = 0.25;
    a.yaw ??= rand(-0.6, 0.6); g.hYaw = a.yaw;
    if (!f.voice) o.beak += (Math.sin(this.time * 31) > 0.5 ? 0.22 : 0) * e;
  }

  sidestepTick(a, dt, f, g, o) { // bước ngang dọc cầu (yến phụng, sáo)
    if (typeof this.spot === 'string') { this.goTo(this.randomSpot(f, false)); return; }
    a.n ??= 2 + ((Math.random() * 3) | 0);
    if (!this.hop && a.n > 0 && a.t > (a.next ?? 0)) {
      const z0 = this.group.position.z;
      a.dir ??= z0 > 0.04 ? -1 : z0 < -0.04 ? 1 : Math.random() < 0.5 ? -1 : 1;
      this.goTo({ ...this.spot, z: clamp(z0 + a.dir * 0.02, -0.085, 0.085) });
      a.n--; a.next = a.t + rand(0.2, 0.32);
    }
    o.roll += Math.sin(this.time * 18) * 0.06;
    if (this.traits.gestures.bow) o.hPitch += Math.sin(this.time * 16) * 0.16; // sáo: vừa đi vừa gật đầu
  }

  bowTick(a, f, g, o) { // sáo cúi chào, xù lông đầu
    const per = a.dur / 3, k = Math.sin(Math.PI * ((a.t % per) / per)) ** 2;
    g.fluff = 0.45;
    o.lean -= 0.5 * k; o.hPitch -= 0.55 * k; o.neck += 0.3 * k; o.fan += 0.6 * k; o.tail -= 0.2 * k; o.bob -= 0.003 * k;
  }

  flickTick(a, dt, f, g, o) { // họa mi vẩy cánh
    const per = 0.32, ph = (a.t % per) / per, k = ph < 0.4 ? bump(ph / 0.4) : 0;
    o.wing += 0.6 * k; o.tail -= 0.18 * k; o.fan += 0.3 * k;
    g.lean = 0.12; g.hPitch = 0.12;
    this.idleLook(dt, f, g, 0.8);
  }

  cockTick(a, f, g, o) { // chích chòe vểnh đuôi rồi hạ từ từ, xòe đuôi
    const up = 0.12, down = Math.max(0.5, a.dur - up - 0.2);
    const k = a.t < up ? a.t / up : Math.max(0, 1 - (a.t - up) / down);
    o.tail -= 0.85 * sstep(0, 1, k);
    o.fan += 0.9 * bump(clamp01((a.t - up) / down));
    if (a.t < up) o.bob -= 0.003;
    g.hPitch = 0.1;
  }

  fidgetTick(a, dt, f, g) { // khuyên nhảy liên tục
    a.n ??= 2 + ((Math.random() * 3) | 0);
    if (!this.hop && a.n > 0 && a.t > (a.next ?? 0)) {
      a.n--; a.next = a.t + rand(0.18, 0.35);
      const r = Math.random();
      if (r < 0.3) this.turnAround();
      else if (r < 0.55 || typeof this.spot === 'string') this.goTo(this.randomSpot(f, true));
      else this.goTo({ ...this.spot, z: clamp(this.group.position.z + rand(-0.04, 0.04), -0.08, 0.08) });
    }
    this.idleLook(dt, { nervous: true }, g, 1.4);
  }

  begTick(a, dt, f, g, o) {
    const e = env(a.t, a.dur, 0.2, 0.3), t = this.time;
    g.crouch = 0.45 * e; g.fluff = 0.4; g.lean = -0.1;
    this.lookAtCam(a, f, g, 0.15);
    g.hPitch = Math.max(g.hPitch, 0.45) * e;
    g.liftL = g.liftR = 0.55 * e;
    o.wing += (0.15 + 0.2 * Math.abs(Math.sin(t * 38))) * e; // cánh rung nhanh
    o.beak += (0.35 + 0.25 * Math.max(0, Math.sin(t * 9))) * e;
  }

  attendTick(a, dt, f, g, o) { // nghe người nói: quay đầu nhìn, nghiêng qua lại
    if (a.t > (a.flipAt ?? 0.9)) { a.side = -(a.side ?? 1); a.flipAt = a.t + rand(0.7, 1.1); }
    this.lookAtCam(a, f, g, 0.45);
    g.crest = 0.7;
    if (this.traits.gestures.bob && a.t > 1.2) { const w = Math.sin(this.time * 44); o.hPitch += w * 0.18; o.neck += w * 0.3; }
  }

  setMolt(on) {
    this.molted = on;
    const tail = this.parts.tail, n = tail.length;
    tail.forEach((f, i) => {
      const gap = on && (i === 1 || i === n - 2);
      f.m.visible = !gap;
      f.m.scale.x = f.len * (on ? 0.75 + 0.15 * Math.sin(i * 7.3) : 1);
    });
  }

  // -------------------------------------------------------------------------
  /** Áp tư thế P (đã làm mượt) cộng dao động o vào khung xương. */
  applyPose(P, o) {
    const B = this.parts, T = this.traits;
    if (!B) return;
    const crouch = clamp(P.crouch + o.crouch, -0.5, 1);
    const drop = crouch * 0.012;
    const pitch = T.posture + P.lean + o.lean;
    B.body.position.set(0, BODY_Y - drop + o.bob, 0);
    B.body.rotation.set(P.roll + o.roll, P.twist, pitch, 'YXZ');
    const puffK = 1 + 0.14 * P.fluff;
    // Thở: ngực phồng xẹp; xù lông từng vùng (bụng, hậu môn, họng xù nhiều hơn lưng)
    const br = (this.breath || 0) * (1 + 0.6 * clamp01(P.fluff));
    B.torso.scale.set(T.long * (1 + 0.04 * P.fluff), T.plump * puffK * (1 + 0.014 * br), T.plump * 0.82 * puffK * (1 + 0.02 * br));
    B.vent.scale.set(0.017 * (1 + 0.25 * P.fluff), 0.009 * (1 + 0.5 * P.fluff), 0.013 * (1 + 0.35 * P.fluff));
    B.skull.scale.set(T.head * 1.04 * (1 + 0.06 * P.fluff), T.head * (1 + 0.07 * P.fluff), T.head * 0.9 * (1 + 0.07 * P.fluff));
    // Chân: IK hai đoạn, bàn chân giữ trên cầu, gót gập về sau
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const hipX = HIP[0] * cp - HIP[1] * sp, hipY = BODY_Y - drop + o.bob + HIP[0] * sp + HIP[1] * cp;
    for (const Lg of B.legs) {
      const st = Lg.s < 0 ? P.legL : P.legR;
      const fx = 0.003 + o.footX - st * 0.03, fy = o.footY + st * 0.014;
      let dx = fx - hipX, dy = fy - hipY;
      let d = Math.hypot(dx, dy);
      const dMax = TIB + TAR - 0.0005, dMin = Math.abs(TIB - TAR) + 0.004;
      if (d > dMax) { dx *= dMax / d; dy *= dMax / d; d = dMax; } else if (d < dMin) { dx *= dMin / d; dy *= dMin / d; d = dMin; }
      const phi = Math.atan2(dy, dx);
      const alpha = Math.acos(clamp((TIB * TIB + d * d - TAR * TAR) / (2 * TIB * d), -1, 1));
      const th1 = phi - alpha; // đùi lệch về sau → gót nhô ra sau
      const kx = hipX + TIB * Math.cos(th1), ky = hipY + TIB * Math.sin(th1);
      const th2 = Math.atan2(hipY + dy - ky, hipX + dx - kx);
      Lg.hip.position.set(hipX, hipY, Lg.s * 0.0095);
      Lg.hip.rotation.z = th1 + Math.PI / 2;
      Lg.heel.rotation.z = th2 - th1;
      Lg.foot.rotation.z = -(th2 + Math.PI / 2);
      const curl = clamp01(0.75 - o.grip - st * 0.6);
      Lg.front.rotation.z = -curl * 0.9;
      Lg.back.rotation.z = curl * 0.7;
    }
    // Cổ giữ đầu gần như ngang dù thân cúi hay ưỡn
    B.neck.rotation.z = -pitch * 0.9;
    B.neck.position.set(0.032, 0.02 - 0.004 * Math.max(0, -P.neck), 0);
    const ext = P.neck + o.neck, dip = P.dip + o.dip;
    B.head.position.set(0.006 + 0.012 * ext, 0.014 - 0.03 * dip + 0.004 * Math.min(0, ext), 0);
    B.head.rotation.set(P.hRoll + o.hRoll, P.hYaw + o.hYaw, P.hPitch + o.hPitch);
    const th = B.throat, tb = th.userData.base, puff = clamp01(P.throat);
    const tf = 1 + 0.18 * P.fluff;
    th.scale.set(tb.x * (1 + 0.25 * puff) * tf, tb.y * (1 + 0.5 * puff + 0.5 * dip) * tf, tb.z * (1 + 0.45 * puff) * tf);
    th.position.set(0.005 + 0.008 * ext + 0.004 * puff, -0.006 - 0.015 * dip, 0);
    // Mỏ
    const beak = clamp01(P.beak + o.beak);
    B.lower.rotation.z = -beak * T.gape;
    B.upper.rotation.z = beak * T.gape * 0.22;
    // Cánh: dang (vai quanh trục thân), duỗi (khuỷu, cổ tay), xòe lông theo độ duỗi.
    // Vỗ cánh như chim thật: đập xuống cánh duỗi hết, lông sơ cấp xòe như ngón tay;
    // nâng lên cổ tay gập, cánh khép lại cho đỡ cản gió, lông sơ cấp khép.
    // Hãm trước khi đáp (flare): cánh dang rộng, quét ra trước.
    const fl = clamp01(o.flap), ph = this.flapPh, el = Math.sin(ph), cph = Math.cos(ph);
    const dn = sstep(-0.25, 0.55, -cph);
    const flare = clamp01(o.flare);
    for (const Wg of B.wings) {
      const L = Wg.s < 0;
      const stretch = clamp01((L ? P.wingL : P.wingR) + o.wing), lift = L ? P.liftL : P.liftR;
      let abduct = lerp(lift * 0.38 + stretch * 0.32 + P.raise * 2.3, 1.5 + 1.15 * el, fl);
      let open = clamp01(lerp(Math.max(stretch, lift * 0.15, P.raise * 0.6), lerp(0.45, 1, dn), fl));
      abduct = lerp(abduct, 1.75 + 0.15 * Math.sin(this.time * 30), flare);
      open = lerp(open, 1, flare);
      const flex = fl * (1 - dn) * (1 - flare); // cổ tay gập khi nâng cánh
      const fingers = Math.max(fl * dn, flare);
      const sA = 0.75 * open + 0.3 * fl * dn + 0.2 * flare, eA = 0.45 * open * (1 - 0.3 * flex), wA = 0.25 * open - 0.6 * flex;
      const sweep = (stretch * 0.35 - P.raise * 0.3) * (1 - fl) * (1 - flare) - 0.5 * flare + 0.2 * flex;
      Wg.sh.rotation.set(-Wg.s * abduct, 0, sA + sweep);
      Wg.elbow.position.set(-0.01 - 0.008 * open, -0.003, 0);
      Wg.elbow.rotation.z = eA;
      Wg.wrist.position.set(-0.012 - 0.01 * open, -0.001, 0);
      Wg.wrist.rotation.z = wA;
      const fo = open * (1 - 0.5 * flex);
      Wg.cards.forEach((c, i) => {
        const prim = i >= 5 && i <= 10 ? i - 7.5 : 0; // lông sơ cấp: tách khe như ngón tay
        c.m.rotation.z = lerp(c.a0, c.a1, fo) - sA - (c.joint ? eA : 0) - (c.joint === 2 ? wA : 0) + fingers * prim * 0.08;
        if (c.joint) c.m.position.x = c.x0 * (1 + 0.9 * open); // gốc lông giãn theo xương duỗi
      });
    }
    // Nhòe chuyển động: lông cánh mờ đi lúc cánh quét nhanh nhất
    const blur = 1 - 0.38 * fl * Math.abs(cph) * (1 - flare);
    for (const m of this.wingMats) m.opacity = blur;
    // Đuôi
    B.tailPivot.rotation.set(0, P.wag + o.wag, T.tailBase + P.tail + o.tail);
    const fan = clamp01(P.fan + o.fan);
    for (const F of B.tail) F.m.rotation.y = F.c * T.fan * (1 + 2.6 * fan);
    // Mào
    if (B.crest) {
      const c = clamp01(P.crest), u = B.crest.userData;
      B.crest.rotation.z = u.rest + u.up * c;
      B.crest.scale.set(u.k, u.k * (0.9 + 0.15 * c), u.k);
    }
    // Mắt
    // Mí dưới: úp vào trong đầu khi mở, kéo lên phủ mắt khi nhắm
    const shut = 1 - clamp01(P.eyes);
    for (const e of B.eyes) e.lid.rotation.x = e.s * (Math.PI / 2) * (1 - 2 * shut);
  }

  /** Một chiếc lông rời (màu lông thân) để World thả rơi. Dùng chung hình học, vật liệu riêng. */
  looseFeather() {
    const m = new THREE.Mesh(shared().feather, new THREE.MeshStandardMaterial({ map: featherTexture(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8 }));
    m.scale.set(0.02, 0.008, 0.008);
    return m;
  }

  /** Màu lông để tô chiếc lông rời. */
  plumeColor(out) { return out.set(Math.random() < 0.5 ? this.model.colors.body : this.model.colors.belly); }

  /** Vị trí đầu chim trong không gian thế giới (để gắn nốt nhạc, bong bóng lời). */
  headWorld(target) {
    if (!this.parts) return target.set(0, 0, 0);
    return this.parts.head.getWorldPosition(target);
  }

  /** Vị trí mỏ (thế giới), để phun giọt nước, nốt nhạc. */
  beakWorld(target) {
    if (!this.parts) return target.set(0, 0, 0);
    return this.parts.beakTip.getWorldPosition(target);
  }
}
