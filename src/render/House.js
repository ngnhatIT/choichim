import * as THREE from 'three';
import {
  bananaLeaf, brickPaving, encausticTile, grass, leafy, palmFrond, plaster, roofTiles, terracottaFloor, waterNormal, wood, woodPanel,
} from './textures.js';

const FLOOR_Y = 0.45; // nền nhà rường đắp cao, lên bằng bậc tam cấp
export { FLOOR_Y };

// Vân nổi lấy luôn từ ảnh màu (chỗ tối lõm: mạch vữa, thớ gỗ, rãnh ngói); vật cắt alpha (lá) thì
// không, thay vào đó mép lá mịn nhờ alpha-to-coverage trên MSAA
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({
  color, roughness: 0.8, ...(extra.map ? (extra.alphaTest ? { alphaToCoverage: true } : { bumpMap: extra.map, bumpScale: 1.4 }) : {}), ...extra,
});
// Mặt nước: gợn sóng trôi chậm, bóng loáng, hơi trong để thấy cá
const waterMat = (color) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.03, ior: 1.33, normalMap: waterNormal(), normalScale: new THREE.Vector2(0.4, 0.4), transparent: true, opacity: 0.88,
});

function box(w, h, d, material, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
function cyl(rt, rb, h, material, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function sph(r, material, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 4)), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
// Tán lá: dùng chung một khối cầu méo lồi lõm (không tròn trịa), co giãn theo từng chùm.
// Độ méo tính theo hướng nên các đỉnh trùng nhau dời như nhau, mặt không hở; pháp tuyến giữ hướng tâm cho tán mềm.
const BLOB = (() => {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const d = 1 + 0.11 * Math.sin(v.x * 5 + 1.3) * Math.sin(v.y * 4 + 0.4) * Math.sin(v.z * 6 + 2.1) + 0.05 * Math.sin(v.x * 13 + v.z * 9) * Math.sin(v.y * 11);
    p.setXYZ(i, v.x * d, v.y * d, v.z * d);
  }
  return g;
})();
// Vân lá lốm đốm + bump: tán thấy rõ từng chùm lá, không phẳng lì
const foliage = (color) => std(color, { map: leafy('#D8D8D8', [5, 3]), roughness: 0.72 });
function blob(r, material, x, y, z, sy = 0.8) {
  const m = new THREE.Mesh(BLOB, material);
  m.position.set(x, y, z); m.scale.set(r, r * sy, r); m.rotation.y = Math.random() * 6;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
/** Phiến lá cong rủ (lá chuối, tàu cau): gốc ở gốc tọa độ, ngả về +z rồi rủ xuống. */
function leafGeo(w, len, droop) {
  const g = new THREE.PlaneGeometry(w, len, 1, 8).translate(0, len / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getY(i) / len; p.setZ(i, droop * t * t); }
  g.computeVertexNormals();
  return g;
}

/** Khối hộp đặt dọc đoạn a → b (xà, kèo, bờ chảy, đầu đao). */
function beamBetween(a, b, w, h, material) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, va.distanceTo(vb)), material);
  m.position.copy(va).add(vb).multiplyScalar(0.5); m.lookAt(vb);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/**
 * Mặt mái từ các đa giác phẳng: faces = [[đỉnh...], (đỉnh) => uv theo mét]. Tự đảo chiều tam giác cho mặt
 * trên nhìn lên (down = false) hoặc mặt dưới nhìn xuống (down = true, làm ván lót, đòn tay thấy từ trong nhà).
 */
function roofGeo(faces, down = false) {
  const pos = [], uv = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const [pts, f] of faces) for (let i = 1; i < pts.length - 1; i++) {
    let tri = [pts[0], pts[i], pts[i + 1]];
    a.fromArray(tri[0]); b.fromArray(tri[1]).sub(a); c.fromArray(tri[2]).sub(a);
    if ((b.cross(c).y > 0) === down) tri = [tri[0], tri[2], tri[1]];
    for (const p of tri) { pos.push(...p); uv.push(...f(p)); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Mái bốn mái: hai mái dài trước sau, hai mái chái tam giác ở hai đầu hồi, cùng độ dốc. */
function hipRoofGeo(x0, x1, z0, z1, y, pitch, down = false) {
  const h = (z0 - z1) / 2, rz = (z0 + z1) / 2, ry = y + h * pitch, k = Math.hypot(1, pitch);
  const A = [x0, y, z0], B = [x1, y, z0], C = [x1, y, z1], D = [x0, y, z1], E = [x0 + h, ry, rz], F = [x1 - h, ry, rz];
  return roofGeo([
    [[A, B, F, E], (p) => [p[0], (z0 - p[2]) * k]],
    [[C, D, E, F], (p) => [-p[0], (p[2] - z1) * k]],
    [[D, A, E], (p) => [p[2], (p[0] - x0) * k]],
    [[B, C, F], (p) => [-p[2], (x1 - p[0]) * k]],
  ], down);
}

// Nhà rường 3 gian 2 chái, đối xứng qua trục cổng - bình phong - bể cạn (x = AX), mặt tiền nhìn ra +z
const AX = -1.0;
const BAYS = [2.0, 2.6, 3.0, 2.6, 2.0]; // chái trái, gian trái, gian giữa, gian phải, chái phải
const XS = BAYS.reduce((a, w) => [...a, a[a.length - 1] + w], [AX - BAYS.reduce((s, w) => s + w, 0) / 2]); // 6 hàng vì
const XL = XS[0], XR = XS[5];
const ZF = 2.0, ZW = 0.2, ZB = -4.0; // hàng cột hiên, vách mặt tiền (cột quân trước), vách hậu (cột quân sau)
const RZ = (ZW + ZB) / 2, ZC = [RZ + 1.0, RZ - 1.0]; // đường nóc, hai hàng cột cái
const PITCH = 0.85, RIDGE_Y = FLOOR_Y + 5.2, WALL_H = 3.25; // mái chính dốc ~40°
const mainY = (z) => RIDGE_Y - Math.abs(z - RZ) * PITCH;
const EAVE = { f: RZ + 2.7, b: RZ - 2.7, x0: XL - 0.5, x1: XR + 0.5 }; // mép mái chính
const EAVE_Y = mainY(EAVE.f);
// Mái hiên thấp, thoải, tách tầng dưới mái chính như nhà rường Huế
const HIEN = { y0: FLOOR_Y + 2.85, slope: 0.28, z1: ZF + 0.6 };
const hienY = (z) => HIEN.y0 - (z - ZW) * HIEN.slope;
const KITCHEN = { x0: 6.2, x1: 9.2, zb: -5.2, zf: -1.2, h: 2.6 };

/**
 * Nhà vườn Huế: nhà rường ba gian hai chái trên nền cao, bậc tam cấp giữa, hiên chạy suốt mặt tiền.
 * Trục đối xứng x = -1: cổng - bình phong - bể cạn non bộ - sân gạch - gian giữa thờ tự.
 * Theo x: chái trái (-7.1..-5.1) | gian trái (..-2.5) | gian giữa (..0.5) | gian phải (..3.1) | chái phải (..5.1).
 * Nhà ngang làm bếp tách riêng phía sau bên phải. Quanh nhà: chè tàu, cau, chuối, mít, thanh trà, giếng.
 */
export class House {
  constructor() {
    this.group = new THREE.Group();
    this.lights = [];
    this.emissive = [];
    this.smoke = [];
    this.sway = [];
    this.wetMats = [];
    const G = this.group, F = FLOOR_Y;

    // Mặt đất, sân gạch trước nhà, lối ra cổng
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), std('#ffffff', { map: grass() }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    G.add(ground);
    const pz0 = ZB - 0.4, pz1 = ZF + 0.4; // mép nền
    this.wetMats.push(this.plane(16, 5.1, brickPaving([8, 2.55]), AX, 0.006, pz1 + 2.55).material);
    this.wetMats.push(this.plane(1.8, 2.2, brickPaving([1, 1.1]), AX, 0.006, 8.4).material);

    // Nền nhà cao, bó đá; hiên lát gạch Bát Tràng, ba gian lát gạch bông, hai chái gạch đất
    G.add(box(XR - XL + 0.8, F, pz1 - pz0, std('#ffffff', { map: plaster('#9A9184', [6, 0.4]) }), AX, F / 2, (pz0 + pz1) / 2));
    this.plane(XR - XL + 0.8, pz1 - ZW, terracottaFloor([18, 3]), AX, F + 0.002, (ZW + pz1) / 2);
    this.plane(XS[4] - XS[1], ZW - ZB, encausticTile([13, 7]), AX, F + 0.002, (ZW + ZB) / 2, { roughness: 0.32, bumpMap: null }); // gạch bông mài phẳng, bóng
    for (const i of [0, 4]) this.plane(BAYS[i], ZW - ZB, terracottaFloor([3, 6]), (XS[i] + XS[i + 1]) / 2, F + 0.002, (ZW + ZB) / 2);
    // Bậc tam cấp trước gian giữa, hai bên bó đá
    const step = std('#9C9585', { roughness: 0.9 });
    for (const j of [1, 2]) G.add(box(2.6, (F * (3 - j)) / 3, 0.32, step, AX, (F * (3 - j)) / 6, pz1 + 0.32 * j - 0.16));
    for (const s of [-1, 1]) G.add(box(0.24, F * 0.85, 0.66, step, AX + s * 1.42, F * 0.425, pz1 + 0.33));

    this.ruong();
    this.walls();
    this.roof();

    // Đèn lồng đỏ dưới hiên hai bên lối vào gian giữa
    this.lantern(XS[2] + 0.45, F + 1.8, 1.3);
    this.lantern(XS[3] - 0.45, F + 1.8, 1.3);
    // Chậu cây hai đầu hiên
    this.pot(XL + 0.5, 1.0, 0.55, '#2E5B2E');
    this.pot(XR - 0.5, 1.0, 0.42, '#3C6B34');

    this.garden();
    this.livingRoom();
    this.kitchen();
  }

  plane(w, d, map, x, y, z, extra = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std('#ffffff', { map, ...extra }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  /**
   * Bộ khung rường: bốn hàng cột trên đá tảng (hiên, quân trước, cái, quân sau), xà dọc xà ngang,
   * trụ trốn đỡ đòn dông, kèo hai mái, kẻ chéo đỡ mái hiên, đòn tay dưới mái.
   */
  ruong() {
    const G = this.group, F = FLOOR_Y;
    const col = std('#ffffff', { map: wood('#5B2A1A'), roughness: 0.55 });
    const beam = std('#ffffff', { map: wood('#4E2617'), roughness: 0.6 });
    const stone = std('#8C877C', { roughness: 0.95 });
    const post = (x, z, top, r = 0.1) => {
      G.add(cyl(r, r + 0.012, top - F, col, x, (F + top) / 2, z));
      G.add(cyl(r + 0.08, r + 0.1, 0.12, stone, x, F + 0.06, z, 10)); // đá tảng
    };
    const hienTop = hienY(ZF) - 0.1, WT = F + WALL_H, CT = F + 3.6;
    for (const x of XS) {
      post(x, ZF, hienTop, 0.09); post(x, ZW, WT); post(x, ZB, WT);
      G.add(beamBetween([x, F + 2.62, ZW + 0.05], [x, hienTop + 0.02, ZF], 0.1, 0.13, beam)); // kẻ hiên
    }
    for (const x of XS.slice(1, 5)) { // bốn bộ vì giữa nhà
      for (const z of ZC) post(x, z, CT, 0.12);
      G.add(beamBetween([x, WT, ZW], [x, WT, ZB], 0.13, 0.17, beam)); // xà lòng
      G.add(beamBetween([x, CT, ZC[0]], [x, CT, ZC[1]], 0.14, 0.2, beam)); // xà cái
      G.add(box(0.12, RIDGE_Y - 0.16 - CT, 0.12, beam, x, (RIDGE_Y - 0.16 + CT) / 2, RZ)); // trụ trốn
      for (const z of [EAVE.f - 0.1, EAVE.b + 0.1]) G.add(beamBetween([x, mainY(z) - 0.17, z], [x, RIDGE_Y - 0.17, RZ], 0.1, 0.13, beam)); // kèo
    }
    // Xà dọc đầu cột các hàng, đòn dông
    for (const [z, y] of [[ZF, hienTop + 0.02], [ZW, WT], [ZB, WT], [ZC[0], CT], [ZC[1], CT]]) G.add(beamBetween([XL, y, z], [XR, y, z], 0.13, 0.15, beam));
    const h = (EAVE.f - EAVE.b) / 2;
    G.add(beamBetween([EAVE.x0 + h, RIDGE_Y - 0.16, RZ], [EAVE.x1 - h, RIDGE_Y - 0.16, RZ], 0.14, 0.16, beam));
    // Đòn tay: mái trước, mái sau ngắn dần theo mái chái; mái hiên chạy suốt
    for (const d of [0.75, 1.5, 2.2]) {
      for (const z of [EAVE.f - d, EAVE.b + d]) G.add(beamBetween([EAVE.x0 + d, mainY(z) - 0.13, z], [EAVE.x1 - d, mainY(z) - 0.13, z], 0.08, 0.08, beam));
    }
    for (const z of [0.9, 1.6]) G.add(beamBetween([EAVE.x0 + 0.1, hienY(z) - 0.1, z], [EAVE.x1 - 0.1, hienY(z) - 0.1, z], 0.07, 0.07, beam));
  }

  /**
   * Vách: gian giữa cửa bức bàn mở toang (cánh xếp vào hai bên), hai gian bên "thượng song hạ bản"
   * (dưới ván kín, trên chấn song thật để nắng lọt), hai chái và tường hồi xây gạch trát vôi, có cửa sổ chớp.
   */
  walls() {
    const G = this.group, F = FLOOR_Y, T = 0.1;
    const plas = std('#ffffff', { map: plaster('#E4D6B4', [2, 1]) });
    const plank = std('#ffffff', { map: wood('#5E2F1C', [1, 2]), roughness: 0.6 });
    const board = std('#ffffff', { map: wood('#4E2617'), roughness: 0.6 });
    const bar = std('#6E3E26', { roughness: 0.6 });
    const doorMat = std('#ffffff', { map: woodPanel([1, 2]) });
    const back = std('#ffffff', { map: woodPanel([2, 1]) });
    for (let i = 0; i < 5; i++) {
      const a = XS[i] + 0.1, b = XS[i + 1] - 0.1, w = b - a, cx = (a + b) / 2, chai = i === 0 || i === 4;
      if (chai) {
        G.add(box(w, WALL_H, T, plas, cx, F + WALL_H / 2, ZW));
        this.shutters(cx, ZW + 0.05);
      } else {
        G.add(box(w, WALL_H - 2.5, T, board, cx, F + 2.5 + (WALL_H - 2.5) / 2, ZW)); // ván gió trên cửa
        if (i === 2) {
          for (const s of [-1, 1]) for (let k = 0; k < 2; k++) G.add(box(0.04, 2.45, 0.7, doorMat, (s < 0 ? a : b) - s * (0.05 + k * 0.06), F + 1.23, ZW - 0.4));
        } else {
          G.add(box(w, 1.1, T, plank, cx, F + 0.55, ZW));
          G.add(box(w, 0.07, T + 0.03, board, cx, F + 1.13, ZW)); // ngưỡng song
          const n = Math.round(w / 0.12);
          for (let k = 1; k < n; k++) G.add(box(0.035, 1.35, 0.05, bar, a + (k * w) / n, F + 1.82, ZW));
        }
      }
      G.add(box(w, WALL_H, T, chai ? plas : back, cx, F + WALL_H / 2, ZB));
    }
    for (const x of [XL, XR]) G.add(box(0.2, WALL_H, ZW - ZB, plas, x, F + WALL_H / 2, (ZW + ZB) / 2));
  }

  /** Mái ngói liệt: mái chính bốn mái (bờ nóc, bờ chảy, đầu đao cong, hồ lô giữa nóc) và mái hiên thấp phía trước. */
  roof() {
    const G = this.group;
    const tiles = std('#B89A8C', { map: roofTiles([0.7, 1.1]) }); // ngói liệt lâu năm: sẫm, ngả nâu rêu
    this.wetMats.push(tiles);
    const under = std('#ffffff', { map: wood('#5A3622', [0.6, 0.6]) });
    const ridgeMat = std('#D9CFB8', { roughness: 0.9 }), gutter = std('#E6DCC4');
    const add = (geo, mat, dy = 0) => { const m = new THREE.Mesh(geo, mat); m.position.y = dy; m.castShadow = m.receiveShadow = true; G.add(m); };
    const { x0, x1, f, b } = EAVE, h = (f - b) / 2;
    add(hipRoofGeo(x0, x1, f, b, EAVE_Y, PITCH), tiles);
    add(hipRoofGeo(x0, x1, f, b, EAVE_Y, PITCH, true), under, -0.07);
    const hy1 = hienY(HIEN.z1), k = Math.hypot(1, HIEN.slope);
    const hien = [[[[x0, HIEN.y0, ZW], [x1, HIEN.y0, ZW], [x1, hy1, HIEN.z1], [x0, hy1, HIEN.z1]], (p) => [p[0], (p[2] - ZW) * k]]];
    add(roofGeo(hien), tiles);
    add(roofGeo(hien, true), under, -0.06);
    // Diềm mái, bờ nóc, bờ chảy theo bốn đường chái, đầu đao cong vút ở bốn góc
    for (const [z, y] of [[f, EAVE_Y], [b, EAVE_Y], [HIEN.z1, hy1]]) G.add(beamBetween([x0, y - 0.03, z], [x1, y - 0.03, z], 0.06, 0.1, gutter));
    for (const x of [x0, x1]) G.add(beamBetween([x, HIEN.y0 + 0.04, ZW], [x, hy1 + 0.04, HIEN.z1], 0.14, 0.1, ridgeMat));
    const E = [x0 + h, RIDGE_Y, RZ], Fr = [x1 - h, RIDGE_Y, RZ];
    G.add(beamBetween([E[0] - 0.1, RIDGE_Y + 0.12, RZ], [Fr[0] + 0.1, RIDGE_Y + 0.12, RZ], 0.3, 0.26, ridgeMat));
    for (const [cx, cz, sx, sz] of [[x0, f, -1, 1], [x1, f, 1, 1], [x1, b, 1, -1], [x0, b, -1, -1]]) {
      const top = sx < 0 ? E : Fr;
      G.add(beamBetween([cx, EAVE_Y + 0.07, cz], [top[0], RIDGE_Y + 0.07, RZ], 0.16, 0.14, ridgeMat));
      G.add(beamBetween([cx, EAVE_Y + 0.07, cz], [cx + sx * 0.32, EAVE_Y + 0.4, cz + sz * 0.32], 0.15, 0.11, ridgeMat));
    }
    for (const [p, s] of [[E, -1], [Fr, 1]]) G.add(beamBetween([p[0], RIDGE_Y + 0.15, RZ], [p[0] + s * 0.3, RIDGE_Y + 0.55, RZ], 0.2, 0.14, ridgeMat)); // đuôi kìm
    // Hồ lô giữa nóc
    const glaze = std('#3E7A5C', { roughness: 0.35 }), gold = std('#C9A040', { metalness: 0.5, roughness: 0.4 });
    G.add(box(0.36, 0.14, 0.3, ridgeMat, AX, RIDGE_Y + 0.31, RZ));
    G.add(sph(0.17, glaze, AX, RIDGE_Y + 0.52, RZ));
    G.add(sph(0.11, glaze, AX, RIDGE_Y + 0.76, RZ));
    G.add(cyl(0.02, 0.04, 0.16, gold, AX, RIDGE_Y + 0.92, RZ, 8));
  }

  /** Vườn nhà Huế. */
  garden() {
    const G = this.group;
    // Hàng chè tàu xén thấp bao quanh, chừa lối cổng
    const hedge = (x0, x1, z0, z1) => {
      const w = Math.max(0.6, x1 - x0), d = Math.max(0.6, z1 - z0);
      G.add(box(w, 0.95, d, std('#ffffff', { map: leafy('#3B6A2C', [w / 1.2, 1]) }), (x0 + x1) / 2, 0.475, (z0 + z1) / 2));
    };
    hedge(-12.6, -2.2, 9.2, 9.8); hedge(0.2, 10.4, 9.2, 9.8);
    hedge(-12.6, -12.0, -7.4, 9.2); hedge(9.8, 10.4, -7.4, 9.2); hedge(-12.0, 9.8, -7.4, -6.8);
    // Cổng trụ gạch
    const pillar = std('#ffffff', { map: plaster('#D6C59C', [1, 2]) });
    for (const x of [-2.15, 0.15]) {
      G.add(box(0.5, 2.1, 0.5, pillar, x, 1.05, 9.5));
      G.add(box(0.64, 0.12, 0.64, std('#8E7B62'), x, 2.16, 9.5));
      G.add(sph(0.16, std('#B4583A'), x, 2.36, 9.5, 10));
    }
    this.screenWall(-1.0, 8.1);
    this.rockPool(-1.0, 5.4);

    // Cây: cau cao vút, chuối, mít, thanh trà, hoa giấy (vườn sau và hai bên, chừa sân trước trống, nắng)
    [[-10.8, -4.2, 6.2], [-8.4, -5.8, 5.4], [-4.6, -6.1, 6.0], [5.5, -5.6, 6.4], [8.6, -6.3, 5.5], [-8.6, 6.8, 5.6], [5.0, 7.4, 5.1], [-11.2, 5.6, 6.0]]
      .forEach(([x, z, h]) => this.areca(x, z, h));
    [[-11.2, -0.8], [-10.4, 0.5], [8.6, 1.6], [7.6, 3.2], [7.0, 6.0]].forEach(([x, z]) => this.banana(x, z));
    this.jackfruit(-10.2, -5.0);
    this.pomelo(2.2, -6.2);
    this.pomelo(-9.4, 5.2);
    this.pomelo(3.6, 5.3);
    this.bougainvillea(-9.4, -2.2);
    this.well(-10.2, 2.7);
    // Chậu kiểng trên bệ gạch dọc mép sân trước hiên, chừa lối bậc tam cấp
    [[-6.6, 3.2], [-2.95, 3.2], [0.95, 3.2], [4.6, 3.2]].forEach(([x, z], i) => this.bonsai(x, z, i));
    // Lũy tre, vườn nhà hàng xóm ở xa làm nền
    const far = [foliage('#3A5A30'), foliage('#456B35'), foliage('#33502B')];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + Math.random() * 0.1, r = 24 + Math.random() * 7, s = 2.5 + Math.random() * 2.5;
      const m = blob(s, far[i % 3], Math.cos(a) * r - 1, s * 0.7, Math.sin(a) * r, 0.9);
      m.castShadow = false; G.add(m);
    }
  }

  /** Bình phong trước nhà: tường vôi, ô giữa đắp nổi, mũ ngói. */
  screenWall(x, z) {
    const G = this.group;
    G.add(box(2.8, 0.25, 0.5, std('#8C877C'), x, 0.125, z));
    G.add(box(2.6, 1.5, 0.3, std('#ffffff', { map: plaster('#E8DCC0', [2, 1]) }), x, 1.0, z));
    G.add(box(1.4, 0.9, 0.04, std('#7D3524', { roughness: 0.6 }), x, 1.0, z + 0.17));
    G.add(box(1.2, 0.72, 0.05, std('#C9A040', { metalness: 0.3, roughness: 0.5 }), x, 1.0, z + 0.18));
    G.add(sph(0.18, std('#7D3524'), x, 1.0, z + 0.2, 16)); // chữ Phúc tròn cách điệu
    const cap = box(2.9, 0.12, 0.5, std('#ffffff', { map: roofTiles([2, 1]) }), x, 1.81, z); G.add(cap);
    for (const s of [-1, 1]) { const d = box(0.4, 0.08, 0.12, std('#D9CFB8'), x + s * 1.5, 1.92, z); d.rotation.z = s * 0.5; G.add(d); }
  }

  /** Bể cạn với hòn non bộ, cây cảnh nhỏ, cá trong nước. */
  rockPool(x, z) {
    const G = this.group;
    const rim = std('#9C9483', { roughness: 0.9 });
    const W = 2.2, D = 1.2, H = 0.55;
    G.add(box(W, H, 0.12, rim, x, H / 2, z - D / 2)); G.add(box(W, H, 0.12, rim, x, H / 2, z + D / 2));
    G.add(box(0.12, H, D, rim, x - W / 2, H / 2, z)); G.add(box(0.12, H, D, rim, x + W / 2, H / 2, z));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, D - 0.12), waterMat('#2F5C57'));
    water.rotation.x = -Math.PI / 2; water.position.set(x, H - 0.08, z); water.receiveShadow = true; G.add(water);
    const rock = std('#7C7A70', { roughness: 1, flatShading: true });
    const rocks = [[0, 0.35, 0, 0.42], [-0.25, 0.85, 0.05, 0.3], [0.18, 0.95, -0.05, 0.26], [-0.05, 1.3, 0, 0.18], [0.45, 0.45, 0.15, 0.22]];
    for (const [dx, y, dz, r] of rocks) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rock);
      m.position.set(x + dx, y, z + dz); m.scale.y = 1.4; m.rotation.set(Math.random(), Math.random(), 0); m.castShadow = true; G.add(m);
    }
    const leaf = foliage('#3E6B30');
    for (const [dx, y, dz] of [[-0.32, 1.12, 0.05], [0.25, 1.2, 0], [0.02, 1.5, 0.02]]) G.add(blob(0.13, leaf, x + dx, y, z + dz, 0.5));
    // Mấy con cá chép đỏ lượn
    this.fish = [];
    const fishMat = std('#E2672C', { roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), fishMat); f.scale.set(2.2, 0.6, 0.9);
      G.add(f); this.fish.push({ f, cx: x, cz: z, ph: i * 2.1, r: 0.55 + i * 0.12, y: H - 0.1 });
    }
  }

  /** Cây cau: thân mảnh có đốt, bẹ xanh, tán tàu lá xòe. */
  areca(x, z, h) {
    const G = this.group;
    const lean = (Math.random() - 0.5) * 0.08;
    const trunk = cyl(0.07, 0.1, h, std('#9A9384'), x, h / 2, z, 10); trunk.rotation.z = lean; G.add(trunk);
    const tx = x - (Math.sin(lean) * h) / 2, top = h / 2 + (Math.cos(lean) * h) / 2;
    G.add(cyl(0.09, 0.08, 0.7, std('#5E8A3A'), tx, top + 0.3, z, 10)); // bẹ
    const g = this.swayGroup(tx, top + 0.6, z, 0.05);
    const mat = std('#ffffff', { map: palmFrond(), alphaTest: 0.5, side: THREE.DoubleSide });
    const geo = leafGeo(0.55, 1.9, 0.9);
    for (let i = 0; i < 9; i++) {
      const arm = new THREE.Group(); arm.rotation.y = (i / 9) * Math.PI * 2 + Math.random() * 0.3;
      const m = new THREE.Mesh(geo, mat); m.rotation.x = 0.6 + Math.random() * 0.5; m.castShadow = true;
      arm.add(m); g.add(arm);
    }
    // Buồng cau
    const nut = std('#7A8F2E');
    for (let i = 0; i < 5; i++) g.add(sph(0.05, nut, Math.cos(i) * 0.12, -0.25 - (i % 2) * 0.06, Math.sin(i) * 0.12, 8));
  }

  /** Bụi chuối: thân giả xanh nâu, lá to rách mép, buồng chuối. */
  banana(x, z) {
    const G = this.group;
    const mat = std('#ffffff', { map: bananaLeaf(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
    const n = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n; k++) {
      const h = 1.3 + Math.random() * 0.8, px = x + (Math.random() - 0.5) * 0.7, pz = z + (Math.random() - 0.5) * 0.7;
      G.add(cyl(0.09, 0.13, h, std('#7C8A4A'), px, h / 2, pz, 10));
      const g = this.swayGroup(px, h, pz, 0.08);
      const geo = leafGeo(0.6, 1.7 + Math.random() * 0.4, 0.7);
      for (let i = 0; i < 6; i++) {
        const arm = new THREE.Group(); arm.rotation.y = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
        const m = new THREE.Mesh(geo, mat); m.rotation.x = 0.35 + Math.random() * 0.6; m.castShadow = true;
        arm.add(m); g.add(arm);
      }
      if (k === 0) { // buồng chuối và bắp chuối
        const fr = std('#8FA33A');
        for (let i = 0; i < 4; i++) g.add(blob(0.1, fr, 0.25, -0.15 - i * 0.12, 0.05, 1.1));
        g.add(sph(0.08, std('#6B2A3A'), 0.27, -0.7, 0.05, 10));
      }
    }
  }

  /** Cây mít: tán sẫm dày, quả mọc trên thân. */
  jackfruit(x, z) {
    const G = this.group;
    G.add(cyl(0.18, 0.28, 3.2, std('#5D4630'), x, 1.6, z, 10));
    for (const a of [0.6, 2.4, 4.2]) {
      const b = cyl(0.06, 0.09, 1.4, std('#5D4630'), x + Math.cos(a) * 0.4, 3.1, z + Math.sin(a) * 0.4, 8);
      b.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); G.add(b);
    }
    const g = this.swayGroup(x, 3.0, z, 0.02);
    const dark = foliage('#2F5527'), mid = foliage('#3D6B30');
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.5;
      g.add(blob(0.7 + Math.random() * 0.5, i % 3 ? dark : mid, Math.cos(a) * r, 0.5 + Math.random() * 1.8, Math.sin(a) * r * 0.8));
    }
    const fruit = std('#8C9A3E', { roughness: 0.95 });
    for (const [dx, y, dz] of [[0.26, 1.6, 0.1], [-0.22, 2.1, 0.15], [0.1, 2.5, -0.25]]) {
      const f = sph(0.16, fruit, x + dx, y, z + dz, 10); f.scale.y = 1.6; G.add(f);
    }
  }

  /** Cây thanh trà (bưởi Huế): tán vừa, quả xanh vàng. */
  pomelo(x, z) {
    const G = this.group;
    G.add(cyl(0.1, 0.15, 1.8, std('#6A5440'), x, 0.9, z, 10));
    const g = this.swayGroup(x, 1.6, z, 0.03);
    const leaf = foliage('#47803A');
    for (let i = 0; i < 11; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.9;
      g.add(blob(0.5 + Math.random() * 0.3, leaf, Math.cos(a) * r, 0.3 + Math.random() * 1.0, Math.sin(a) * r));
    }
    const fruit = std('#C9C24A', { roughness: 0.6 });
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      g.add(sph(0.12, fruit, Math.cos(a) * 0.95, 0.2 + Math.random() * 0.9, Math.sin(a) * 0.95, 10));
    }
  }

  /** Giếng gạch tròn có trục kéo gàu. */
  well(x, z) {
    const G = this.group;
    const brick = std('#ffffff', { map: brickPaving([2, 0.6]) });
    brick.side = THREE.DoubleSide;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.64, 0.8, 20, 1, true), brick);
    ring.position.set(x, 0.4, z); ring.castShadow = true; G.add(ring);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 6, 24), std('#9C9483'));
    lip.rotation.x = Math.PI / 2; lip.position.set(x, 0.8, z); G.add(lip);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.58, 20), waterMat('#1B2A2C'));
    water.rotation.x = -Math.PI / 2; water.position.set(x, 0.45, z); G.add(water);
    const wd = std('#ffffff', { map: wood('#5C3B22') });
    for (const s of [-1, 1]) G.add(box(0.08, 1.4, 0.08, wd, x + s * 0.7, 0.7, z));
    const axle = cyl(0.04, 0.04, 1.5, wd, x, 1.3, z, 8); axle.rotation.z = Math.PI / 2; G.add(axle);
    G.add(cyl(0.005, 0.005, 0.5, std('#C2B28C'), x, 1.05, z, 4));
    G.add(cyl(0.09, 0.07, 0.14, std('#6B4A2E'), x, 0.75, z, 10)); // gàu
  }

  /** Chậu kiểng sứ men lam trên bệ gạch. */
  bonsai(x, z, i) {
    const G = this.group;
    G.add(box(0.5, 0.5, 0.5, std('#ffffff', { map: brickPaving([0.5, 0.5]) }), x, 0.25, z));
    G.add(cyl(0.24, 0.18, 0.22, std('#E8E6DE', { roughness: 0.3 }), x, 0.61, z, 16));
    G.add(cyl(0.245, 0.245, 0.05, std('#2C4A7E', { roughness: 0.3 }), x, 0.66, z, 16));
    const trunk = cyl(0.025, 0.05, 0.5, std('#5A4232'), x, 0.95, z, 6); trunk.rotation.z = (i % 2 ? 1 : -1) * 0.35; G.add(trunk);
    const g = this.swayGroup(x + (i % 2 ? -0.12 : 0.12), 1.12, z, 0.03);
    const leaf = foliage(i % 2 ? '#3A6A2E' : '#4C7A34');
    for (const [dx, dy] of [[0, 0.06], [-0.18, -0.06], [0.16, -0.1]]) g.add(blob(0.14, leaf, dx, dy, 0, 0.45));
  }

  shutters(x, z) {
    const G = this.group;
    G.add(box(1.4, 1.3, 0.05, std('#3A2A1C'), x, FLOOR_Y + 1.7, z));
    const sh = std('#ffffff', { map: wood('#2F6A55') });
    for (const s of [-1, 1]) {
      const p = box(0.62, 1.22, 0.05, sh, x + s * 0.34, FLOOR_Y + 1.7, z + 0.03);
      G.add(p);
      for (let i = 0; i < 8; i++) G.add(box(0.56, 0.02, 0.02, std('#244F40'), x + s * 0.34, FLOOR_Y + 1.2 + i * 0.14, z + 0.07));
    }
  }

  lantern(x, y, z) {
    const red = std('#C8281E', { emissive: '#7A1408', emissiveIntensity: 0.15 });
    const gold = std('#C9A040', { metalness: 0.5, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), red);
    body.scale.y = 1.15; body.position.set(x, y, z);
    this.group.add(body);
    this.group.add(cyl(0.08, 0.08, 0.04, gold, x, y + 0.2, z));
    this.group.add(cyl(0.08, 0.08, 0.04, gold, x, y - 0.2, z));
    this.group.add(cyl(0.005, 0.005, 0.5, gold, x, y + 0.45, z));
    const tassel = cyl(0.015, 0.03, 0.18, std('#D9A23A'), x, y - 0.32, z);
    this.group.add(tassel);
    this.emissive.push({ mat: red, base: 0.15, night: 2.2 });
    const light = new THREE.PointLight('#FF9A55', 0, 6, 2);
    light.position.set(x, y, z);
    this.group.add(light);
    this.lights.push({ light, night: 4 });
  }

  /** Nhóm cây lay theo gió: gốc xoay ở chân. */
  swayGroup(x, y, z, amp) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    this.group.add(g);
    this.sway.push({ g, amp, ph: Math.random() * 6, f: 0.8 + Math.random() * 0.5 });
    return g;
  }

  pot(x, z, h, leaf) {
    this.group.add(cyl(0.2, 0.15, 0.32, std('#A55A34'), x, FLOOR_Y + 0.16, z));
    const g = this.swayGroup(x, FLOOR_Y + 0.32, z, 0.05);
    const lm = std(leaf);
    for (let i = 0; i < 7; i++) g.add(sph(0.14 + Math.random() * 0.06, lm, rand(-0.15, 0.15), 0.03 + h * Math.random(), rand(-0.12, 0.12), 10));
    g.add(cyl(0.025, 0.03, h, std('#5B3A24'), 0, h / 2, 0));
  }

  bougainvillea(x, z) {
    const green = std('#355E2B'), pink = std('#D2357F');
    const g = this.swayGroup(x, 0, z, 0.035);
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.9;
      g.add(sph(0.18 + Math.random() * 0.12, Math.random() < 0.55 ? pink : green, Math.cos(a) * r, 0.3 + Math.random() * 1.3, Math.sin(a) * r * 0.6, 10));
    }
  }

  /** Cây cỏ lay theo gió. wind: 0 (lặng) .. 1.4 (gió mạnh) */
  update(t, wind) {
    waterNormal().offset.set(t * 0.012, t * 0.007 * (1 + wind));
    for (const s of this.sway) {
      const a = s.amp * wind;
      s.g.rotation.z = Math.sin(t * s.f * 1.7 + s.ph) * a + Math.sin(t * s.f * 4.1 + s.ph * 2) * a * 0.3;
      s.g.rotation.x = Math.sin(t * s.f * 1.3 + s.ph * 1.7) * a * 0.6;
    }
    for (const p of this.fish) { // cá lượn vòng chậm trong bể cạn
      const a = t * 0.35 + p.ph;
      p.f.position.set(p.cx + Math.cos(a) * p.r * 0.85, p.y, p.cz + Math.sin(a) * p.r * 0.35);
      p.f.rotation.y = -a - Math.PI / 2;
    }
  }

  /**
   * Nội thất ba gian hai chái: gian giữa thờ tự và tiếp khách, gian trái sập gụ (chỗ treo lồng "phòng khách"),
   * gian phải tủ chè; chái trái rương gỗ, chái phải phản nằm.
   */
  livingRoom() {
    const G = this.group, F = FLOOR_Y;
    const lacquer = std('#ffffff', { map: wood('#5A2318'), roughness: 0.45 });
    const gold = std('#C9A040', { metalness: 0.6, roughness: 0.35 });
    // Bàn thờ gian giữa, kê sát vách hậu
    const ax = AX, az = ZB + 0.45;
    G.add(box(1.4, 0.06, 0.5, lacquer, ax, F + 1.05, az));
    for (const sx of [-0.62, 0.62]) for (const sz of [-0.2, 0.2]) G.add(box(0.06, 1.03, 0.06, lacquer, ax + sx, F + 0.515, az + sz));
    G.add(box(1.4, 0.12, 0.5, lacquer, ax, F + 0.25, az));
    G.add(cyl(0.08, 0.06, 0.1, gold, ax, F + 1.13, az + 0.05));
    const incense = std('#B3261E');
    for (const dx of [-0.02, 0, 0.02]) {
      const stick = cyl(0.003, 0.003, 0.3, incense, ax + dx, F + 1.3, az + 0.05, 5);
      stick.rotation.z = dx * 6; G.add(stick);
    }
    const ember = new THREE.MeshBasicMaterial({ color: '#FF7A2E' });
    this.incenseTip = sph(0.006, ember, ax, F + 1.45, az + 0.05, 6);
    G.add(this.incenseTip);
    G.add(box(0.26, 0.34, 0.03, std('#3B2A20'), ax - 0.35, F + 1.25, az - 0.12));
    G.add(box(0.2, 0.26, 0.032, std('#A89A86'), ax - 0.35, F + 1.25, az - 0.105));
    const fruit = ['#E4502E', '#F0C23B', '#7DB043', '#E07F2B', '#C93A5B'];
    fruit.forEach((c, i) => G.add(sph(0.045, std(c), ax + 0.25 + (i % 3) * 0.07, F + 1.12 + Math.floor(i / 3) * 0.06, az + 0.03, 10)));
    // Hoành phi sơn son thếp vàng và đôi câu đối
    G.add(box(1.5, 0.42, 0.06, std('#8E1B12', { roughness: 0.4 }), ax, F + 2.55, ZB + 0.1));
    G.add(box(1.36, 0.3, 0.07, gold, ax, F + 2.55, ZB + 0.11));
    for (const dx of [-0.95, 0.95]) {
      G.add(box(0.2, 1.5, 0.05, std('#1E1612', { roughness: 0.4 }), ax + dx, F + 1.75, ZB + 0.1));
      for (let i = 0; i < 5; i++) G.add(box(0.1, 0.1, 0.02, gold, ax + dx, F + 1.15 + i * 0.28, ZB + 0.13));
    }
    for (const dx of [-0.55, 0.55]) {
      const lamp = std('#D3241A', { emissive: '#D3241A', emissiveIntensity: 0.4 });
      G.add(cyl(0.035, 0.035, 0.12, lamp, ax + dx, F + 1.14, az + 0.12, 10));
      this.emissive.push({ mat: lamp, base: 0.6, night: 2.5 });
    }
    const altarLight = new THREE.PointLight('#FF5A3A', 0, 3, 2);
    altarLight.position.set(ax, F + 1.4, az + 0.4);
    G.add(altarLight); this.lights.push({ light: altarLight, night: 1.6, day: 0.3 });

    // Bộ bàn trà, đôi ghế bành tiếp khách trước bàn thờ
    const wd = std('#ffffff', { map: wood('#4A2817'), roughness: 0.5 });
    const tz = -1.7;
    G.add(box(1.0, 0.05, 0.6, wd, ax, F + 0.62, tz));
    for (const sx of [-0.44, 0.44]) for (const sz of [-0.25, 0.25]) G.add(box(0.05, 0.6, 0.05, wd, ax + sx, F + 0.3, tz + sz));
    for (const s of [-1, 1]) {
      const cx = ax + s * 0.88;
      G.add(box(0.5, 0.05, 0.5, wd, cx, F + 0.44, tz));
      G.add(box(0.05, 0.6, 0.5, wd, cx + s * 0.23, F + 0.75, tz)); // tựa lưng
      for (const sz of [-0.23, 0.23]) {
        G.add(box(0.5, 0.04, 0.05, wd, cx, F + 0.64, tz + sz)); // tay vịn
        for (const sx of [-0.22, 0.22]) G.add(box(0.045, 0.44, 0.045, wd, cx + sx, F + 0.22, tz + sz));
      }
    }
    const teapot = std('#E9E4D8', { roughness: 0.25 });
    G.add(sph(0.06, teapot, ax - 0.05, F + 0.7, tz, 12));
    for (const dx of [0.1, 0.17, 0.24]) G.add(cyl(0.02, 0.016, 0.03, teapot, ax + dx - 0.05, F + 0.66, tz + 0.1, 10));

    // Sập gụ gian trái, phía trước chỗ treo lồng
    const sx0 = (XS[1] + XS[2]) / 2;
    G.add(box(1.9, 0.08, 1.15, lacquer, sx0, F + 0.45, -0.9));
    G.add(box(1.86, 0.1, 1.1, lacquer, sx0, F + 0.36, -0.9)); // diềm sập
    for (const dx of [-0.88, 0.88]) for (const dz of [-0.5, 0.5]) G.add(box(0.1, 0.32, 0.1, lacquer, sx0 + dx, F + 0.16, -0.9 + dz));
    // Tủ chè gian phải sát vách hậu, trên bày bình hoa, khay trà
    const tx0 = (XS[3] + XS[4]) / 2;
    G.add(box(1.9, 0.95, 0.45, lacquer, tx0, F + 0.6, ZB + 0.32));
    for (const dx of [-0.88, 0.88]) G.add(box(0.08, 0.13, 0.4, lacquer, tx0 + dx, F + 0.065, ZB + 0.32));
    for (const dx of [-0.45, 0.45]) G.add(box(0.8, 0.6, 0.02, std('#2A1810', { roughness: 0.3 }), tx0 + dx, F + 0.62, ZB + 0.56));
    G.add(cyl(0.09, 0.06, 0.32, std('#2C4A7E', { roughness: 0.25 }), tx0 - 0.5, F + 1.24, ZB + 0.32, 14));
    G.add(sph(0.12, std('#D2357F'), tx0 - 0.5, F + 1.46, ZB + 0.32, 10));
    G.add(cyl(0.2, 0.2, 0.03, gold, tx0 + 0.4, F + 1.09, ZB + 0.32, 16));
    G.add(box(1.2, 0.7, 0.04, std('#ffffff', { map: plaster('#C9B98E', [1, 1]) }), tx0, F + 2.0, ZB + 0.08)); // tranh treo
    // Bức thư pháp giấy dó treo vách hậu gian trái, sau chỗ treo lồng
    G.add(box(0.62, 1.3, 0.02, std('#E8DFC8', { roughness: 0.95 }), sx0 + 0.75, F + 1.75, ZB + 0.07));
    for (let i = 0; i < 4; i++) G.add(box(0.16 + (i % 2) * 0.08, 0.12, 0.01, std('#1E1612'), sx0 + 0.75, F + 2.15 - i * 0.26, ZB + 0.085));
    for (const y of [F + 1.1, F + 2.4]) G.add(cyl(0.015, 0.015, 0.72, lacquer, sx0 + 0.75, y, ZB + 0.08, 6).rotateZ(Math.PI / 2));
    // Chái trái: rương gỗ khóa đồng; chái phải: phản gỗ
    G.add(box(1.0, 0.55, 0.55, lacquer, (XS[0] + XS[1]) / 2, F + 0.28, ZB + 0.4));
    G.add(box(0.1, 0.1, 0.02, gold, (XS[0] + XS[1]) / 2, F + 0.42, ZB + 0.68));
    const bx = (XS[4] + XS[5]) / 2;
    G.add(box(1.5, 0.06, 1.9, wd, bx, F + 0.45, -2.6));
    for (const dx of [-0.68, 0.68]) for (const dz of [-0.88, 0.88]) G.add(box(0.08, 0.42, 0.08, wd, bx + dx, F + 0.21, -2.6 + dz));
    G.add(box(1.4, 0.05, 1.8, std('#C9B58C', { roughness: 0.95 }), bx, F + 0.5, -2.6)); // chiếu cói

    // Đèn treo gian giữa và gian trái (trong nhà rường kín, ban ngày vẫn hơi tối)
    for (const [x, day, night] of [[ax, 1.6, 7], [sx0, 1.2, 4]]) {
      const lamp = new THREE.PointLight('#FFD39A', 0, 7, 2);
      lamp.position.set(x, F + 2.75, -1.0);
      G.add(lamp); this.lights.push({ light: lamp, night, day });
      const bulb = std('#FFF3D6', { emissive: '#FFE2A8', emissiveIntensity: 0.1 });
      G.add(sph(0.08, bulb, x, F + 2.8, -1.0, 10));
      G.add(cyl(0.004, 0.004, 0.45, std('#222'), x, F + 3.05, -1.0, 4));
      this.emissive.push({ mat: bulb, base: 0.1, night: 3 });
    }

    this.smokeAnchor = new THREE.Vector3(ax, F + 1.48, az + 0.05);
  }

  /** Nhà ngang làm bếp, tách riêng phía sau bên phải: tường vôi, mái ngói hai mái thấp, cửa mở ra sân. */
  kitchen() {
    const G = this.group, F = FLOOR_Y, K = KITCHEN;
    const cx = (K.x0 + K.x1) / 2, cz = (K.zb + K.zf) / 2, w = K.x1 - K.x0, d = K.zf - K.zb;
    const cream = std('#ffffff', { map: plaster('#DCCBA2', [2, 1]) });
    G.add(box(w + 0.4, F, d + 0.4, std('#ffffff', { map: plaster('#9A9184', [2, 0.4]) }), cx, F / 2, cz));
    this.plane(w, d, terracottaFloor([4, 5]), cx, F + 0.002, cz);
    // Tường: hậu, hai hồi, mặt trước chừa cửa đi
    G.add(box(w, K.h, 0.14, cream, cx, F + K.h / 2, K.zb));
    for (const x of [K.x0, K.x1]) G.add(box(0.14, K.h, d, cream, x, F + K.h / 2, cz));
    const dx0 = 7.75, dx1 = 8.65;
    G.add(box(dx0 - K.x0, K.h, 0.14, cream, (K.x0 + dx0) / 2, F + K.h / 2, K.zf));
    G.add(box(K.x1 - dx1, K.h, 0.14, cream, (dx1 + K.x1) / 2, F + K.h / 2, K.zf));
    G.add(box(dx1 - dx0, K.h - 2.1, 0.14, cream, (dx0 + dx1) / 2, F + 2.1 + (K.h - 2.1) / 2, K.zf));
    G.add(box(0.9, 0.12, 0.3, std('#9C9585'), (dx0 + dx1) / 2, F - 0.06, K.zf + 0.32)); // bậc cửa
    // Mái hai mái, hồi tam giác hai đầu
    const p = 0.45, ze0 = K.zf + 0.4, ze1 = K.zb - 0.4, ey = F + K.h - 0.1, ry = ey + (ze0 - cz) * p, k = Math.hypot(1, p);
    const gx0 = K.x0 - 0.3, gx1 = K.x1 + 0.3;
    const faces = [
      [[[gx0, ey, ze0], [gx1, ey, ze0], [gx1, ry, cz], [gx0, ry, cz]], (q) => [q[0], (ze0 - q[2]) * k]],
      [[[gx1, ey, ze1], [gx0, ey, ze1], [gx0, ry, cz], [gx1, ry, cz]], (q) => [-q[0], (q[2] - ze1) * k]],
    ];
    const tiles = std('#B89A8C', { map: roofTiles([0.7, 1.1]) }); // ngói liệt lâu năm: sẫm, ngả nâu rêu
    this.wetMats.push(tiles);
    const roofTop = new THREE.Mesh(roofGeo(faces), tiles); roofTop.castShadow = roofTop.receiveShadow = true; G.add(roofTop);
    const roofUnder = new THREE.Mesh(roofGeo(faces, true), std('#ffffff', { map: wood('#5A3622', [0.6, 0.6]) }));
    roofUnder.position.y = -0.06; roofUnder.receiveShadow = true; G.add(roofUnder);
    const ridgeMat = std('#D9CFB8', { roughness: 0.9 });
    G.add(beamBetween([gx0, ry + 0.08, cz], [gx1, ry + 0.08, cz], 0.24, 0.2, ridgeMat));
    for (const z of [ze0, ze1]) G.add(beamBetween([gx0, ey - 0.03, z], [gx1, ey - 0.03, z], 0.06, 0.1, std('#E6DCC4')));
    const s = new THREE.Shape();
    s.moveTo(K.zf, F + K.h - 0.02); s.lineTo(cz, ry - 0.06); s.lineTo(K.zb, F + K.h - 0.02);
    const gableGeo = new THREE.ShapeGeometry(s).rotateY(-Math.PI / 2);
    for (const x of [K.x0, K.x1]) {
      const g = new THREE.Mesh(gableGeo, std('#ffffff', { map: plaster('#DCCBA2', [1, 0.5]), side: THREE.DoubleSide }));
      g.position.x = x; g.castShadow = g.receiveShadow = true; G.add(g);
    }

    // Bệ bếp sát hồi phải: bếp ga, chảo chống dính
    const tileMat = std('#E7E2D6', { roughness: 0.35 });
    const bx = K.x1 - 0.4, bz = -3.3;
    G.add(box(0.62, 0.85, 2.6, std('#8A8174'), bx, F + 0.425, bz));
    G.add(box(0.64, 0.04, 2.62, tileMat, bx, F + 0.87, bz));
    G.add(box(0.42, 0.1, 0.7, std('#1F1F22', { roughness: 0.4 }), bx, F + 0.94, bz - 0.3));
    for (const dz of [-0.17, 0.17]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 20), std('#555'));
      ring.rotation.x = Math.PI / 2; ring.position.set(bx, F + 1.0, bz - 0.3 + dz); G.add(ring);
    }
    const pan = cyl(0.14, 0.12, 0.05, std('#2A2A2E', { roughness: 0.3 }), bx, F + 1.03, bz - 0.47, 20);
    G.add(pan);
    const handle = box(0.035, 0.025, 0.26, std('#1A1A1A'), bx - 0.2, F + 1.05, bz - 0.6);
    handle.rotation.y = -0.6; G.add(handle);
    this.panPos = new THREE.Vector3(bx, F + 1.08, bz - 0.47);
    // Kệ và hũ trên vách hậu
    G.add(box(1.4, 0.04, 0.3, std('#7A5A3A'), 8.3, F + 1.9, K.zb + 0.22));
    ['#C9A27A', '#9E3E2A', '#E8DDC6', '#567A4E'].forEach((c, i) => G.add(cyl(0.07, 0.07, 0.2, std(c), 7.8 + i * 0.34, F + 2.02, K.zb + 0.22, 12)));
    // Cửa sổ chớp xanh nhìn ra vườn sau
    G.add(box(1.0, 0.8, 0.05, std('#BFE0EA', { emissive: '#7FB7CC', emissiveIntensity: 0.25 }), 6.95, F + 1.6, K.zb + 0.1));
    G.add(box(1.1, 0.9, 0.04, std('#2F6A55'), 6.95, F + 1.6, K.zb + 0.08));
    const sill = std('#2F6A55');
    for (let i = 1; i < 6; i++) G.add(box(0.03, 0.8, 0.04, sill, 6.45 + i * 0.167, F + 1.6, K.zb + 0.15)); // song cửa sổ
    G.add(box(1.1, 0.05, 0.12, sill, 6.95, F + 1.18, K.zb + 0.13));
    const kl = new THREE.PointLight('#FFE0B0', 0, 6, 2);
    kl.position.set(cx, F + 2.3, cz);
    G.add(kl); this.lights.push({ light: kl, night: 5, day: 0.8 });
    // Lu nước trước hiên bếp
    const jar = std('#5E3B26', { roughness: 0.35 });
    for (const [x, z, r] of [[9.05, -0.55, 0.34], [9.4, 0.25, 0.28]]) {
      const j = sph(r, jar, x, r * 0.95, z, 14); j.scale.y = 1.15; G.add(j);
      G.add(cyl(r * 0.6, r * 0.6, 0.04, std('#1E2A2E', { roughness: 0.1 }), x, r * 2.05, z, 14));
    }
  }

  /** night: 0 (ngày) .. 1 (đêm) */
  setNight(night) {
    for (const l of this.lights) l.light.intensity = (l.day || 0) * (1 - night) + l.night * night;
    for (const e of this.emissive) e.mat.emissiveIntensity = e.base + (e.night - e.base) * night;
  }

  /** wet: 0 (khô) .. 1 (ướt sũng): ngói, gạch sân ngoài trời sẫm màu và bóng nước. */
  setWet(wet) {
    for (const m of this.wetMats) { m.roughness = 0.8 - 0.62 * wet; m.color.copy(m.userData.dry ??= m.color.clone()).multiplyScalar(1 - 0.38 * wet); }
  }
}

/** Cây treo lồng bằng gỗ, di chuyển giữa các vị trí. */
export class Stand {
  constructor() {
    this.group = new THREE.Group();
    const wd = std('#ffffff', { map: wood('#5C3B22') });
    this.group.add(box(0.6, 0.05, 0.08, wd, 0, 0.025, 0));
    this.group.add(box(0.08, 0.05, 0.6, wd, 0, 0.025, 0));
    this.group.add(cyl(0.022, 0.028, 2.1, wd, 0, 1.05, 0));
    const arm = cyl(0.016, 0.016, 0.44, wd, 0, 2.05, 0.2);
    arm.rotation.x = Math.PI / 2; this.group.add(arm);
    this.group.add(cyl(0.003, 0.003, 0.06, std('#888', { metalness: 0.6 }), 0, 2.02, 0.38, 6));
    this.hookTop = new THREE.Vector3(0, 1.99, 0.38);
  }
}

function rand(a, b) { return a + Math.random() * (b - a); }
