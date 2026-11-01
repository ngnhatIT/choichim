import * as THREE from 'three';
import { encausticTile, grass, plaster, roofTiles, terracottaFloor, wood } from './textures.js';

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

/**
 * Nhà ống cắt lớp nhìn từ phía trước, trải theo trục x:
 * sân (x < -5.2) | hiên (-5.2..-1.2) | phòng khách (-1.2..3.4) | bếp (3.4..7.4)
 */
export class House {
  constructor() {
    this.group = new THREE.Group();
    this.lights = [];
    this.emissive = [];
    this.smoke = [];
    this.sway = [];
    const G = this.group;

    // Mặt đất sân
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), std('#ffffff', { map: grass() }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    G.add(ground);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.6), std('#B9A889'));
    path.rotation.x = -Math.PI / 2; path.position.set(-7.6, 0.005, 0.2); path.receiveShadow = true;
    G.add(path);

    // Nền nhà
    G.add(box(12.6, FLOOR_Y, 4.4, std('#8E7B62'), 1.1, FLOOR_Y / 2, -0.6));
    const tileVer = new THREE.Mesh(new THREE.PlaneGeometry(4, 4.4), std('#ffffff', { map: encausticTile([7, 7.7]), roughness: 0.55 }));
    tileVer.rotation.x = -Math.PI / 2; tileVer.position.set(-3.2, FLOOR_Y + 0.002, -0.6); tileVer.receiveShadow = true;
    G.add(tileVer);
    const tileLiv = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.4), std('#ffffff', { map: encausticTile([8, 7.7]), roughness: 0.55 }));
    tileLiv.rotation.x = -Math.PI / 2; tileLiv.position.set(1.1, FLOOR_Y + 0.002, -0.6); tileLiv.receiveShadow = true;
    G.add(tileLiv);
    const tileKit = new THREE.Mesh(new THREE.PlaneGeometry(4, 4.4), std('#ffffff', { map: terracottaFloor([8, 9]) }));
    tileKit.rotation.x = -Math.PI / 2; tileKit.position.set(5.4, FLOOR_Y + 0.002, -0.6); tileKit.receiveShadow = true;
    G.add(tileKit);
    // Bậc thềm
    G.add(box(4, 0.08, 0.35, std('#A2917A'), -3.2, 0.04, 1.78));

    // Tường
    const ochre = std('#ffffff', { map: plaster('#D9A84E', [4, 1]) });
    const cream = std('#ffffff', { map: plaster('#E6D3A8', [2, 1]) });
    const wallH = 3.2;
    G.add(box(4.6, wallH, 0.18, cream, 1.1, FLOOR_Y + wallH / 2, -2.8));        // phòng khách
    G.add(box(4.0, wallH, 0.18, std('#ffffff', { map: plaster('#DCCBA2', [2, 1]) }), 5.4, FLOOR_Y + wallH / 2, -2.8)); // bếp
    // Mặt tiền giữa hiên và phòng khách, có cửa
    const facade = new THREE.Group();
    facade.add(box(0.2, wallH, 0.75, ochre, -1.2, FLOOR_Y + wallH / 2, -2.43));
    facade.add(box(0.2, 0.75, 1.3, ochre, -1.2, FLOOR_Y + wallH - 0.375, -1.42));
    facade.add(box(0.2, wallH, 0.35, ochre, -1.2, FLOOR_Y + wallH / 2, -0.6));
    G.add(facade);
    // Tường sau của hiên: cửa sổ chớp xanh
    G.add(box(4.0, wallH, 0.18, ochre, -3.2, FLOOR_Y + wallH / 2, -2.8));
    this.shutters(-3.2, -2.69);
    // Vách bếp
    G.add(box(0.16, wallH, 1.5, cream, 3.4, FLOOR_Y + wallH / 2, -2.05));
    G.add(box(0.16, wallH, 2.6, cream, 7.4, FLOOR_Y + wallH / 2, -1.5));

    // Cánh cửa gỗ mở
    const doorMat = std('#ffffff', { map: wood('#2F5A4C') });
    const d1 = box(0.06, 2.4, 0.62, doorMat, -1.05, FLOOR_Y + 1.2, -2.0); d1.rotation.y = 0.9; G.add(d1);
    const d2 = box(0.06, 2.4, 0.62, doorMat, -1.05, FLOOR_Y + 1.2, -0.85); d2.rotation.y = -0.9; G.add(d2);

    // Mái hiên ngói
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 4.9), std('#ffffff', { map: roofTiles([4, 4]) }));
    roof.position.set(-3.2, FLOOR_Y + 3.05, -0.55); roof.rotation.x = 0.13; roof.castShadow = true; roof.receiveShadow = true;
    G.add(roof);
    G.add(box(4.5, 0.18, 0.08, std('#5B3420'), -3.2, FLOOR_Y + 2.7, 1.85));
    const colMat = std('#ffffff', { map: wood('#6B2E1E') });
    G.add(cyl(0.09, 0.1, 2.75, colMat, -5.0, FLOOR_Y + 1.37, 1.6));
    G.add(cyl(0.09, 0.1, 2.75, colMat, -1.45, FLOOR_Y + 1.37, 1.6));
    G.add(box(0.3, 0.12, 0.3, std('#7F6A52'), -5.0, FLOOR_Y + 0.06, 1.6));
    G.add(box(0.3, 0.12, 0.3, std('#7F6A52'), -1.45, FLOOR_Y + 0.06, 1.6));

    // Đèn lồng đỏ dưới hiên
    this.lantern(-4.3, FLOOR_Y + 2.35, 0.9);
    this.lantern(-2.0, FLOOR_Y + 2.35, 0.9);

    // Chậu cây trên hiên
    this.pot(-4.6, -2.3, 0.55, '#2E5B2E');
    this.pot(-1.8, -2.35, 0.42, '#3C6B34');

    // Sân: hoa giấy, cây, tường rào
    this.bougainvillea(-9.4, -2.2);
    this.tree(-10.5, 1.6);
    for (let x = -13; x < -5.4; x += 0.9) G.add(box(0.85, 0.7, 0.2, std('#C9B38B'), x, 0.35, -3.3));

    this.livingRoom();
    this.kitchen();
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

  tree(x, z) {
    this.group.add(cyl(0.12, 0.18, 2.6, std('#5D4630'), x, 1.3, z));
    const g = this.swayGroup(x, 2.3, z, 0.03);
    const lm = std('#3D6B35');
    for (let i = 0; i < 12; i++) g.add(sph(0.6 + Math.random() * 0.4, lm, rand(-0.9, 0.9), 0.4 + Math.random() * 1.0, rand(-0.7, 0.7), 10));
  }

  /** Cây cỏ lay theo gió. wind: 0 (lặng) .. 1.4 (gió mạnh) */
  update(t, wind) {
    for (const s of this.sway) {
      const a = s.amp * wind;
      s.g.rotation.z = Math.sin(t * s.f * 1.7 + s.ph) * a + Math.sin(t * s.f * 4.1 + s.ph * 2) * a * 0.3;
      s.g.rotation.x = Math.sin(t * s.f * 1.3 + s.ph * 1.7) * a * 0.6;
    }
  }

  livingRoom() {
    const G = this.group;
    const lacquer = std('#ffffff', { map: wood('#5A2318'), roughness: 0.45 });
    const gold = std('#C9A040', { metalness: 0.6, roughness: 0.35 });
    // Bàn thờ
    const ax = 2.4, az = -2.45;
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
    G.add(box(1.5, 0.42, 0.06, std('#8E1B12', { roughness: 0.4 }), ax, FLOOR_Y + 2.45, -2.68));
    G.add(box(1.36, 0.3, 0.07, gold, ax, FLOOR_Y + 2.45, -2.67));
    for (const dx of [-0.55, 0.55]) {
      const lamp = std('#D3241A', { emissive: '#D3241A', emissiveIntensity: 0.4 });
      G.add(cyl(0.035, 0.035, 0.12, lamp, ax + dx, FLOOR_Y + 1.14, az + 0.12, 10));
      this.emissive.push({ mat: lamp, base: 0.6, night: 2.5 });
    }
    const altarLight = new THREE.PointLight('#FF5A3A', 0, 3, 2);
    altarLight.position.set(ax, FLOOR_Y + 1.4, az + 0.4);
    G.add(altarLight); this.lights.push({ light: altarLight, night: 1.6, day: 0.3 });

    // Trường kỷ và bàn trà
    const wd = std('#ffffff', { map: wood('#4A2817'), roughness: 0.5 });
    G.add(box(1.5, 0.08, 0.55, wd, -0.1, FLOOR_Y + 0.45, -2.35));
    G.add(box(1.5, 0.55, 0.06, wd, -0.1, FLOOR_Y + 0.75, -2.62));
    for (const sx of [-0.7, 0.7]) G.add(box(0.07, 0.45, 0.55, wd, -0.1 + sx, FLOOR_Y + 0.225, -2.35));
    G.add(box(0.9, 0.05, 0.5, wd, -0.1, FLOOR_Y + 0.42, -1.55));
    for (const sx of [-0.4, 0.4]) for (const sz of [-0.2, 0.2]) G.add(box(0.05, 0.4, 0.05, wd, -0.1 + sx, FLOOR_Y + 0.2, -1.55 + sz));
    const teapot = std('#E9E4D8', { roughness: 0.25 });
    G.add(sph(0.06, teapot, -0.15, FLOOR_Y + 0.5, -1.55, 12));
    for (const dx of [0.05, 0.12, 0.19]) G.add(cyl(0.02, 0.016, 0.03, teapot, -0.15 + dx, FLOOR_Y + 0.46, -1.45, 10));

    const lamp = new THREE.PointLight('#FFD39A', 0, 7, 2);
    lamp.position.set(1.0, FLOOR_Y + 2.7, -1.2);
    G.add(lamp); this.lights.push({ light: lamp, night: 7 });
    const bulb = std('#FFF3D6', { emissive: '#FFE2A8', emissiveIntensity: 0.1 });
    G.add(sph(0.08, bulb, 1.0, FLOOR_Y + 2.75, -1.2, 10));
    G.add(cyl(0.004, 0.004, 0.5, std('#222'), 1.0, FLOOR_Y + 3.05, -1.2, 4));
    this.emissive.push({ mat: bulb, base: 0.1, night: 3 });

    this.smokeAnchor = new THREE.Vector3(ax, FLOOR_Y + 1.48, az + 0.05);
  }

  kitchen() {
    const G = this.group;
    const tileMat = std('#E7E2D6', { roughness: 0.35 });
    G.add(box(3.6, 0.85, 0.6, std('#8A8174'), 5.4, FLOOR_Y + 0.425, -2.4));
    G.add(box(3.6, 0.04, 0.62, tileMat, 5.4, FLOOR_Y + 0.87, -2.4));
    // Bếp ga và chảo chống dính
    G.add(box(0.7, 0.1, 0.42, std('#1F1F22', { roughness: 0.4 }), 5.8, FLOOR_Y + 0.94, -2.4));
    for (const dx of [-0.17, 0.17]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 20), std('#555'));
      ring.rotation.x = Math.PI / 2; ring.position.set(5.8 + dx, FLOOR_Y + 1.0, -2.4); G.add(ring);
    }
    const pan = cyl(0.14, 0.12, 0.05, std('#2A2A2E', { roughness: 0.3 }), 5.63, FLOOR_Y + 1.03, -2.4, 20);
    G.add(pan);
    const handle = box(0.26, 0.025, 0.035, std('#1A1A1A'), 5.84, FLOOR_Y + 1.05, -2.2);
    handle.rotation.y = -0.9; G.add(handle);
    this.panPos = new THREE.Vector3(5.63, FLOOR_Y + 1.08, -2.4);
    // Kệ và hũ
    G.add(box(1.6, 0.04, 0.3, std('#7A5A3A'), 4.6, FLOOR_Y + 1.9, -2.6));
    ['#C9A27A', '#9E3E2A', '#E8DDC6', '#567A4E'].forEach((c, i) => G.add(cyl(0.07, 0.07, 0.2, std(c), 4.0 + i * 0.38, FLOOR_Y + 2.02, -2.6, 12)));
    // Cửa sổ
    G.add(box(1.0, 0.8, 0.05, std('#BFE0EA', { emissive: '#7FB7CC', emissiveIntensity: 0.25 }), 6.4, FLOOR_Y + 1.85, -2.7));
    G.add(box(1.1, 0.9, 0.04, std('#2F6A55'), 6.4, FLOOR_Y + 1.85, -2.72));
    const kl = new THREE.PointLight('#FFE0B0', 0, 6, 2);
    kl.position.set(5.4, FLOOR_Y + 2.7, -1.4);
    G.add(kl); this.lights.push({ light: kl, night: 5 });
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
