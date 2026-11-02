import * as THREE from 'three';
import {
  bananaLeaf, brickPaving, encausticTile, grass, leafy, palmFrond, plaster, roofTiles, terracottaFloor, wood, woodPanel,
} from './textures.js';

const FLOOR_Y = 0.15;
export { FLOOR_Y };

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

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
// Tán lá: dùng chung một khối cầu, co giãn theo từng chùm
const BLOB = new THREE.IcosahedronGeometry(1, 2);
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

// Nhà rường: trục x như cũ, mặt trước nhìn ra +z
const XL = -5.6, XR = 3.6, ZB = -2.95, ZF = 1.7; // mép nhà, hàng cột hiên
const EAVE = { z: 2.45, y: FLOOR_Y + 2.85 }, RIDGE = { z: -0.6, y: FLOOR_Y + 4.8 };
const ROOF_X = (XL + XR) / 2, ROOF_W = XR - XL + 1.1;

/**
 * Nhà vườn Huế cắt lớp nhìn từ phía trước, trải theo trục x:
 * sân (x < -5.6) | hiên chái trái (-5.6..-1.2) | gian giữa thờ tự (-1.2..3.6) | nhà bếp (3.6..7.6)
 * Quanh nhà: sân gạch, bể cạn non bộ, bình phong, hàng chè tàu, cổng trụ, cau, chuối, mít, thanh trà, giếng.
 */
export class House {
  constructor() {
    this.group = new THREE.Group();
    this.lights = [];
    this.emissive = [];
    this.smoke = [];
    this.sway = [];
    const G = this.group;

    // Mặt đất, sân gạch, lối vào cổng
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), std('#ffffff', { map: grass() }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    G.add(ground);
    this.plane(14.5, 9.6, brickPaving([7, 4.8]), -2.6, 0.006, 1.5);
    this.plane(1.8, 3.0, brickPaving([1, 1.5]), -1.0, 0.006, 7.8);

    // Nền nhà: bó vỉa gạch, lát gạch Bát Tràng ở hiên, gạch bông gian giữa, gạch đất bếp
    G.add(box(13.4, FLOOR_Y, 4.9, std('#7E6A55'), 1.0, FLOOR_Y / 2, -0.6));
    this.plane(4.4, 4.8, terracottaFloor([6, 6.5]), -3.4, FLOOR_Y + 0.002, -0.6);
    this.plane(4.8, 4.8, encausticTile([8, 8]), 1.2, FLOOR_Y + 0.002, -0.6, { roughness: 0.55 });
    this.plane(4.0, 4.8, terracottaFloor([7, 8]), 5.6, FLOOR_Y + 0.002, -0.6);
    G.add(box(XR - XL, 0.08, 0.4, std('#8F8172'), ROOF_X, 0.04, 1.95)); // bậc thềm

    this.ruong();
    this.roof();
    this.kitchenShell();

    // Đèn lồng đỏ dưới hiên
    this.lantern(-4.3, FLOOR_Y + 2.45, 1.0);
    this.lantern(-2.0, FLOOR_Y + 2.45, 1.0);

    // Chậu cây trên hiên
    this.pot(-4.6, -2.3, 0.55, '#2E5B2E');
    this.pot(-1.8, -2.35, 0.42, '#3C6B34');

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

  /** Khung gỗ nhà rường: cột lim trên chân tảng, vì kèo, vách "thượng song hạ bản", cửa bức bàn. */
  ruong() {
    const G = this.group;
    const col = std('#ffffff', { map: wood('#5B2A1A'), roughness: 0.55 });
    const beam = std('#ffffff', { map: wood('#4E2617'), roughness: 0.6 });
    const stone = std('#8C877C', { roughness: 0.95 });
    const wallH = 3.35;
    // Vách gỗ phía sau hiên và gian giữa
    G.add(box(XR - XL, wallH, 0.14, std('#ffffff', { map: woodPanel([7, 1]) }), ROOF_X, FLOOR_Y + wallH / 2, ZB));
    // Vách ngăn giữa hiên và gian giữa, cửa bức bàn mở
    const panel = std('#ffffff', { map: woodPanel([1, 1]) });
    G.add(box(0.14, wallH, 0.75, panel, -1.2, FLOOR_Y + wallH / 2, -2.5));
    G.add(box(0.14, wallH - 2.45, 1.3, std('#ffffff', { map: wood('#4E2617') }), -1.2, FLOOR_Y + 2.45 + (wallH - 2.45) / 2, -1.45));
    G.add(box(0.14, wallH, 0.4, panel, -1.2, FLOOR_Y + wallH / 2, -0.6));
    const doorMat = std('#ffffff', { map: woodPanel([1, 2]) });
    const d1 = box(0.05, 2.4, 0.62, doorMat, -1.05, FLOOR_Y + 1.2, -2.0); d1.rotation.y = 0.9; G.add(d1);
    const d2 = box(0.05, 2.4, 0.62, doorMat, -1.05, FLOOR_Y + 1.2, -0.9); d2.rotation.y = -0.9; G.add(d2);

    // Cột: hàng hiên phía trước, hàng hông trái để ngỏ ra sân
    const posts = [[-5.4, ZF], [-3.3, ZF], [-1.2, ZF], [1.2, ZF], [3.4, ZF], [-5.4, -0.6], [-5.4, ZB + 0.15], [3.4, ZB + 0.15]];
    const topAt = (z) => EAVE.y + ((EAVE.z - z) / (EAVE.z - RIDGE.z)) * (RIDGE.y - EAVE.y) - 0.12;
    for (const [x, z] of posts) {
      const h = Math.min(topAt(z), FLOOR_Y + 3.3) - FLOOR_Y;
      G.add(cyl(0.1, 0.11, h, col, x, FLOOR_Y + h / 2, z));
      G.add(cyl(0.17, 0.2, 0.14, stone, x, FLOOR_Y + 0.07, z, 10));
    }
    // Xà dọc hàng hiên, vì kèo ngang ở hai đầu và giữa nhà, trụ trốn đỡ nóc
    const by = FLOOR_Y + 3.15;
    G.add(box(XR - XL + 0.2, 0.16, 0.16, beam, ROOF_X, by, ZF));
    for (const x of [-5.4, -1.2, 3.4]) {
      G.add(box(0.14, 0.18, ZF - ZB, beam, x, by, (ZF + ZB) / 2));
      G.add(box(0.12, RIDGE.y - by - 0.1, 0.12, beam, x, (RIDGE.y + by) / 2 - 0.05, RIDGE.z));
      for (const s of [-1, 1]) { // kèo chéo
        const len = Math.hypot(2.1, RIDGE.y - by - 0.15);
        const k = box(0.1, 0.12, len, beam, x, by + (RIDGE.y - by) / 2 - 0.05, RIDGE.z + s * 1.05);
        k.rotation.x = s * Math.atan2(RIDGE.y - by - 0.15, 2.1); G.add(k);
      }
    }
    // Hồi nhà hai đầu
    const s = new THREE.Shape();
    const roofY = (z) => topAt(z) + 0.05;
    s.moveTo(ZF, by - 0.1); s.lineTo(ZF, roofY(ZF)); s.lineTo(RIDGE.z, RIDGE.y - 0.08); s.lineTo(ZB, roofY(2 * RIDGE.z - ZB)); s.lineTo(ZB, by - 0.1);
    const gableGeo = new THREE.ShapeGeometry(s).rotateY(-Math.PI / 2);
    const gableMat = std('#ffffff', { map: plaster('#E4D6B4', [2, 1]), side: THREE.DoubleSide });
    for (const x of [XL, XR]) {
      const g = new THREE.Mesh(gableGeo, gableMat); g.position.x = x; g.castShadow = true; g.receiveShadow = true; G.add(g);
    }
  }

  /** Mái ngói liệt hai mái, bờ nóc có hồ lô, bốn góc đao cong. */
  roof() {
    const G = this.group;
    const tiles = std('#ffffff', { map: roofTiles([7, 4]) });
    const under = std('#ffffff', { map: wood('#5A3622', [8, 1]) });
    const edge = std('#7A3A22');
    const dz = EAVE.z - RIDGE.z, dy = EAVE.y - RIDGE.y;
    const len = Math.hypot(dz, dy), ang = Math.atan2(-dy, dz);
    const mats = [edge, edge, tiles, under, edge, edge];
    const gutter = std('#E6DCC4'), ridgeMat = std('#D9CFB8', { roughness: 0.9 });
    for (const s of [1, -1]) { // mái trước, mái sau
      const zc = RIDGE.z + (s * dz) / 2;
      const r = new THREE.Mesh(new THREE.BoxGeometry(ROOF_W, 0.12, len + 0.1), mats);
      r.position.set(ROOF_X, (EAVE.y + RIDGE.y) / 2, zc); r.rotation.x = s * ang;
      r.castShadow = true; r.receiveShadow = true; G.add(r);
      // Bờ chảy hai đầu mái
      for (const x of [ROOF_X - ROOF_W / 2 + 0.08, ROOF_X + ROOF_W / 2 - 0.08]) {
        const b = box(0.18, 0.16, len + 0.1, ridgeMat, x, (EAVE.y + RIDGE.y) / 2 + 0.12, zc); b.rotation.x = s * ang; G.add(b);
      }
      // Đòn tay dưới mái
      for (let t = 0.12; t < 0.95; t += 0.2) {
        G.add(box(ROOF_W - 0.6, 0.09, 0.09, under, ROOF_X, EAVE.y + (RIDGE.y - EAVE.y) * t - 0.13, RIDGE.z + s * dz * (1 - t)));
      }
      G.add(box(ROOF_W, 0.06, 0.08, gutter, ROOF_X, EAVE.y - 0.04, RIDGE.z + s * (dz + 0.04))); // diềm mái
      // Đao cong ở góc
      for (const e of [-1, 1]) {
        const d = box(0.7, 0.1, 0.16, ridgeMat, ROOF_X + e * (ROOF_W / 2 + 0.1), EAVE.y + 0.18, RIDGE.z + s * dz);
        d.rotation.z = e * 0.55; G.add(d);
      }
    }
    // Bờ nóc và đuôi kìm uốn lên ở hai đầu
    G.add(box(ROOF_W - 0.2, 0.24, 0.32, ridgeMat, ROOF_X, RIDGE.y + 0.12, RIDGE.z));
    for (const e of [-1, 1]) {
      const k = box(0.5, 0.14, 0.3, ridgeMat, ROOF_X + e * (ROOF_W / 2 - 0.05), RIDGE.y + 0.38, RIDGE.z);
      k.rotation.z = e * 0.9; G.add(k);
    }
    // Hồ lô giữa nóc
    const glaze = std('#3E7A5C', { roughness: 0.35 }), gold = std('#C9A040', { metalness: 0.5, roughness: 0.4 });
    G.add(box(0.36, 0.14, 0.3, ridgeMat, ROOF_X, RIDGE.y + 0.31, RIDGE.z));
    G.add(sph(0.17, glaze, ROOF_X, RIDGE.y + 0.52, RIDGE.z));
    G.add(sph(0.11, glaze, ROOF_X, RIDGE.y + 0.76, RIDGE.z));
    G.add(cyl(0.02, 0.04, 0.16, gold, ROOF_X, RIDGE.y + 0.92, RIDGE.z, 8));
  }

  /** Nhà bếp nối bên phải: tường vôi, mái ngói thấp hơn nhà chính. */
  kitchenShell() {
    const G = this.group;
    const cream = std('#ffffff', { map: plaster('#DCCBA2', [2, 1]) });
    const h = 2.8;
    G.add(box(4.0, h + 0.1, 0.16, cream, 5.6, FLOOR_Y + (h + 0.1) / 2, ZB));
    G.add(box(0.16, h, 1.6, cream, XR, FLOOR_Y + h / 2, -2.15));
    G.add(box(0.16, h, 3.2, cream, 7.6, FLOOR_Y + h / 2, -1.35));
    // Mái bếp bắt đầu sau chái nhà chính để không đâm xuyên mái lớn
    const r = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.1, 5.9), [std('#7A3A22'), std('#7A3A22'), std('#ffffff', { map: roofTiles([3, 4]) }), std('#ffffff', { map: wood('#5A3622', [4, 1]) }), std('#7A3A22'), std('#7A3A22')]);
    r.position.set(6.15, FLOOR_Y + 2.8, -0.55); r.rotation.x = 0.04; r.castShadow = true; r.receiveShadow = true;
    G.add(r);
    G.add(cyl(0.09, 0.1, 2.75, std('#ffffff', { map: wood('#5B2A1A') }), 7.5, FLOOR_Y + 1.37, 1.9));
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

    // Cây: cau cao vút, chuối, mít, thanh trà, hoa giấy
    [[-10.8, -4.2, 6.2], [-8.4, -5.8, 5.4], [-4.4, -4.9, 6.0], [5.4, -5.1, 6.4], [8.4, -3.9, 5.5], [-8.6, 6.8, 5.6], [5.0, 7.4, 5.1], [-11.2, 5.6, 6.0]]
      .forEach(([x, z, h]) => this.areca(x, z, h));
    [[-11.2, -0.8], [-10.4, 0.5], [8.6, 2.2], [8.8, -2.4], [7.0, 6.0]].forEach(([x, z]) => this.banana(x, z));
    this.jackfruit(-7.2, -5.0);
    this.jackfruit(2.2, -5.6);
    this.pomelo(-9.4, 5.2);
    this.pomelo(3.6, 5.3);
    this.bougainvillea(-9.4, -2.2);
    this.well(-10.2, 2.7);
    // Chậu kiểng trên bệ gạch trước hiên
    [[-4.6, 3.1], [-3.0, 3.1], [1.0, 3.1], [2.6, 3.1]].forEach(([x, z], i) => this.bonsai(x, z, i));
    // Lũy tre, vườn nhà hàng xóm ở xa làm nền
    const far = [std('#3A5A30'), std('#456B35'), std('#33502B')];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + Math.random() * 0.1, r = 24 + Math.random() * 7, s = 2.5 + Math.random() * 2.5;
      const m = blob(s, far[i % 3], Math.cos(a) * r - 1, s * 0.7, Math.sin(a) * r, 0.9);
      m.castShadow = false; G.add(m);
    }
    // Lu nước cạnh bếp
    const jar = std('#5E3B26', { roughness: 0.35 });
    for (const [x, z, r] of [[8.2, 0.4, 0.34], [8.5, -0.4, 0.28]]) {
      const j = sph(r, jar, x, r * 0.95, z, 14); j.scale.y = 1.15; G.add(j);
      G.add(cyl(r * 0.6, r * 0.6, 0.04, std('#1E2A2E', { roughness: 0.1 }), x, r * 2.05, z, 14));
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
    const water = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, D - 0.12), std('#3F6E6A', { roughness: 0.08, metalness: 0.1 }));
    water.rotation.x = -Math.PI / 2; water.position.set(x, H - 0.08, z); water.receiveShadow = true; G.add(water);
    const rock = std('#7C7A70', { roughness: 1, flatShading: true });
    const rocks = [[0, 0.35, 0, 0.42], [-0.25, 0.85, 0.05, 0.3], [0.18, 0.95, -0.05, 0.26], [-0.05, 1.3, 0, 0.18], [0.45, 0.45, 0.15, 0.22]];
    for (const [dx, y, dz, r] of rocks) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rock);
      m.position.set(x + dx, y, z + dz); m.scale.y = 1.4; m.rotation.set(Math.random(), Math.random(), 0); m.castShadow = true; G.add(m);
    }
    const leaf = std('#3E6B30');
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
    const dark = std('#2F5527'), mid = std('#3D6B30');
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
    const leaf = std('#47803A');
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
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.58, 20), std('#1B2A2C', { roughness: 0.05 }));
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
    const leaf = std(i % 2 ? '#3A6A2E' : '#4C7A34');
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

  livingRoom() {
    const G = this.group;
    const lacquer = std('#ffffff', { map: wood('#5A2318'), roughness: 0.45 });
    const gold = std('#C9A040', { metalness: 0.6, roughness: 0.35 });
    // Bàn thờ
    const ax = 2.4, az = -2.5;
    G.add(box(1.4, 0.06, 0.5, lacquer, ax, FLOOR_Y + 1.05, az));
    for (const sx of [-0.62, 0.62]) for (const sz of [-0.2, 0.2]) G.add(box(0.06, 1.03, 0.06, lacquer, ax + sx, FLOOR_Y + 0.515, az + sz));
    G.add(box(1.4, 0.12, 0.5, lacquer, ax, FLOOR_Y + 0.25, az));
    G.add(cyl(0.08, 0.06, 0.1, gold, ax, FLOOR_Y + 1.13, az + 0.05));
    const incense = std('#B3261E');
    for (const dx of [-0.02, 0, 0.02]) {
      const stick = cyl(0.003, 0.003, 0.3, incense, ax + dx, FLOOR_Y + 1.3, az + 0.05, 5);
      stick.rotation.z = dx * 6; G.add(stick);
    }
    const ember = new THREE.MeshBasicMaterial({ color: '#FF7A2E' });
    this.incenseTip = sph(0.006, ember, ax, FLOOR_Y + 1.45, az + 0.05, 6);
    G.add(this.incenseTip);
    G.add(box(0.26, 0.34, 0.03, std('#3B2A20'), ax - 0.35, FLOOR_Y + 1.25, az - 0.12));
    G.add(box(0.2, 0.26, 0.032, std('#A89A86'), ax - 0.35, FLOOR_Y + 1.25, az - 0.105));
    const fruit = ['#E4502E', '#F0C23B', '#7DB043', '#E07F2B', '#C93A5B'];
    fruit.forEach((c, i) => G.add(sph(0.045, std(c), ax + 0.25 + (i % 3) * 0.07, FLOOR_Y + 1.12 + Math.floor(i / 3) * 0.06, az + 0.03, 10)));
    // Hoành phi sơn son thếp vàng và đôi câu đối
    G.add(box(1.5, 0.42, 0.06, std('#8E1B12', { roughness: 0.4 }), ax, FLOOR_Y + 2.55, ZB + 0.1));
    G.add(box(1.36, 0.3, 0.07, gold, ax, FLOOR_Y + 2.55, ZB + 0.11));
    for (const dx of [-0.95, 0.95]) {
      G.add(box(0.2, 1.5, 0.05, std('#1E1612', { roughness: 0.4 }), ax + dx, FLOOR_Y + 1.75, ZB + 0.1));
      for (let i = 0; i < 5; i++) G.add(box(0.1, 0.1, 0.02, gold, ax + dx, FLOOR_Y + 1.15 + i * 0.28, ZB + 0.13));
    }
    for (const dx of [-0.55, 0.55]) {
      const lamp = std('#D3241A', { emissive: '#D3241A', emissiveIntensity: 0.4 });
      G.add(cyl(0.035, 0.035, 0.12, lamp, ax + dx, FLOOR_Y + 1.14, az + 0.12, 10));
      this.emissive.push({ mat: lamp, base: 0.6, night: 2.5 });
    }
    const altarLight = new THREE.PointLight('#FF5A3A', 0, 3, 2);
    altarLight.position.set(ax, FLOOR_Y + 1.4, az + 0.4);
    G.add(altarLight); this.lights.push({ light: altarLight, night: 1.6, day: 0.3 });

    // Sập gụ và bàn trà
    const wd = std('#ffffff', { map: wood('#4A2817'), roughness: 0.5 });
    G.add(box(1.5, 0.08, 0.55, wd, -0.1, FLOOR_Y + 0.45, -2.4));
    G.add(box(1.5, 0.55, 0.06, wd, -0.1, FLOOR_Y + 0.75, -2.67));
    for (const sx of [-0.7, 0.7]) G.add(box(0.07, 0.45, 0.55, wd, -0.1 + sx, FLOOR_Y + 0.225, -2.4));
    G.add(box(0.9, 0.05, 0.5, wd, -0.1, FLOOR_Y + 0.42, -1.55));
    for (const sx of [-0.4, 0.4]) for (const sz of [-0.2, 0.2]) G.add(box(0.05, 0.4, 0.05, wd, -0.1 + sx, FLOOR_Y + 0.2, -1.55 + sz));
    const teapot = std('#E9E4D8', { roughness: 0.25 });
    G.add(sph(0.06, teapot, -0.15, FLOOR_Y + 0.5, -1.55, 12));
    for (const dx of [0.05, 0.12, 0.19]) G.add(cyl(0.02, 0.016, 0.03, teapot, -0.15 + dx, FLOOR_Y + 0.46, -1.45, 10));

    const lamp = new THREE.PointLight('#FFD39A', 0, 7, 2);
    lamp.position.set(1.0, FLOOR_Y + 2.7, -1.2);
    G.add(lamp); this.lights.push({ light: lamp, night: 7, day: 1.2 }); // dưới mái lớn ban ngày hơi tối
    const bulb = std('#FFF3D6', { emissive: '#FFE2A8', emissiveIntensity: 0.1 });
    G.add(sph(0.08, bulb, 1.0, FLOOR_Y + 2.75, -1.2, 10));
    G.add(cyl(0.004, 0.004, 0.4, std('#222'), 1.0, FLOOR_Y + 3.0, -1.2, 4));
    this.emissive.push({ mat: bulb, base: 0.1, night: 3 });

    this.smokeAnchor = new THREE.Vector3(ax, FLOOR_Y + 1.48, az + 0.05);
  }

  kitchen() {
    const G = this.group;
    const tileMat = std('#E7E2D6', { roughness: 0.35 });
    G.add(box(3.6, 0.85, 0.6, std('#8A8174'), 5.6, FLOOR_Y + 0.425, -2.5));
    G.add(box(3.6, 0.04, 0.62, tileMat, 5.6, FLOOR_Y + 0.87, -2.5));
    // Bếp ga và chảo chống dính
    G.add(box(0.7, 0.1, 0.42, std('#1F1F22', { roughness: 0.4 }), 5.8, FLOOR_Y + 0.94, -2.5));
    for (const dx of [-0.17, 0.17]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 20), std('#555'));
      ring.rotation.x = Math.PI / 2; ring.position.set(5.8 + dx, FLOOR_Y + 1.0, -2.5); G.add(ring);
    }
    const pan = cyl(0.14, 0.12, 0.05, std('#2A2A2E', { roughness: 0.3 }), 5.63, FLOOR_Y + 1.03, -2.5, 20);
    G.add(pan);
    const handle = box(0.26, 0.025, 0.035, std('#1A1A1A'), 5.84, FLOOR_Y + 1.05, -2.3);
    handle.rotation.y = -0.9; G.add(handle);
    this.panPos = new THREE.Vector3(5.63, FLOOR_Y + 1.08, -2.5);
    // Kệ và hũ
    G.add(box(1.6, 0.04, 0.3, std('#7A5A3A'), 4.6, FLOOR_Y + 1.9, -2.72));
    ['#C9A27A', '#9E3E2A', '#E8DDC6', '#567A4E'].forEach((c, i) => G.add(cyl(0.07, 0.07, 0.2, std(c), 4.0 + i * 0.38, FLOOR_Y + 2.02, -2.72, 12)));
    // Cửa sổ chớp xanh nhìn ra vườn sau
    G.add(box(1.0, 0.8, 0.05, std('#BFE0EA', { emissive: '#7FB7CC', emissiveIntensity: 0.25 }), 6.6, FLOOR_Y + 1.85, ZB + 0.1));
    G.add(box(1.1, 0.9, 0.04, std('#2F6A55'), 6.6, FLOOR_Y + 1.85, ZB + 0.08));
    const kl = new THREE.PointLight('#FFE0B0', 0, 6, 2);
    kl.position.set(5.6, FLOOR_Y + 2.5, -1.4);
    G.add(kl); this.lights.push({ light: kl, night: 5, day: 0.8 });
  }

  /** night: 0 (ngày) .. 1 (đêm) */
  setNight(night) {
    for (const l of this.lights) l.light.intensity = (l.day || 0) * (1 - night) + l.night * night;
    for (const e of this.emissive) e.mat.emissiveIntensity = e.base + (e.night - e.base) * night;
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
