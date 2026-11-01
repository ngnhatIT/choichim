import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fabric, wood } from './textures.js';

export const CAGE = { R: 0.22, H: 0.4, TOP: 0.56, HOOK: 0.62 };

const lerp = (a, b, k) => a + (b - a) * k;

/** Lồng tre tròn mái vòm kiểu lồng chào mào, đơn vị mét. Gốc tọa độ ở đáy nan. */
export class Cage {
  constructor() {
    this.group = new THREE.Group();
    this.picks = [];
    const { R, H, TOP } = CAGE;
    const bamboo = new THREE.MeshStandardMaterial({ color: '#C9A158', roughness: 0.6 });
    const bambooDark = new THREE.MeshStandardMaterial({ color: '#9C7432', roughness: 0.65 });

    // Nan lồng: đoạn thẳng rồi uốn cong về đỉnh
    const bars = [];
    const N = 46;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const cx = Math.cos(a), cz = Math.sin(a);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cx * R, 0, cz * R),
        new THREE.Vector3(cx * R, H * 0.5, cz * R),
        new THREE.Vector3(cx * R, H, cz * R),
        new THREE.Vector3(cx * R * 0.82, H + 0.09, cz * R * 0.82),
        new THREE.Vector3(cx * R * 0.4, TOP - 0.02, cz * R * 0.4),
        new THREE.Vector3(0, TOP, 0),
      ]);
      bars.push(new THREE.TubeGeometry(curve, 24, 0.0021, 5, false));
    }
    const barMesh = new THREE.Mesh(mergeGeometries(bars), bamboo);
    barMesh.castShadow = true;
    this.group.add(barMesh);

    // Vành
    for (const [y, tube] of [[0.004, 0.007], [H * 0.5, 0.004], [H, 0.006]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 8, 64), bambooDark);
      ring.rotation.x = Math.PI / 2; ring.position.y = y; ring.castShadow = true;
      this.group.add(ring);
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 10), bambooDark);
    knob.position.y = TOP; this.group.add(knob);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0035, 8, 24), new THREE.MeshStandardMaterial({ color: '#8C8C8C', metalness: 0.7, roughness: 0.35 }));
    hook.position.y = TOP + 0.04; this.group.add(hook);

    // Khay đáy
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.018, R + 0.012, 0.05, 48), new THREE.MeshStandardMaterial({ map: wood('#6E4524'), roughness: 0.7 }));
    tray.position.y = -0.022; tray.castShadow = true; tray.receiveShadow = true;
    tray.userData.pick = 'clean';
    this.group.add(tray); this.picks.push(tray);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R - 0.002, 48), new THREE.MeshStandardMaterial({ color: '#D9C9A3', roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.0035; floor.receiveShadow = true;
    floor.userData.pick = 'clean';
    this.group.add(floor); this.picks.push(floor);

    // Cầu đậu
    this.perches = [{ x: -0.065, y: 0.14 }, { x: 0.065, y: 0.21 }];
    const perchMat = new THREE.MeshStandardMaterial({ color: '#8B5E2E', roughness: 0.7 });
    for (const p of this.perches) {
      const half = Math.sqrt(R * R - p.x * p.x) - 0.004;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, half * 2, 10), perchMat);
      m.rotation.x = Math.PI / 2; m.position.set(p.x, p.y - 0.0065, 0); m.castShadow = true;
      this.group.add(m);
    }

    // Cóng thức ăn và cóng nước (sứ trắng viền lam)
    this.food = this.makeCup(-0.12, 0.1, 0.15, 'staple');
    this.waterCup = this.makeCup(0.12, 0.17, 0.15, 'water'); // ngang tầm cầu cao để chim cúi uống được
    this.foodFill = this.makeFill(this.food, new THREE.MeshStandardMaterial({ color: '#9A6B3C', roughness: 0.95 }));
    this.waterFill = this.makeFill(this.waterCup, new THREE.MeshStandardMaterial({ color: '#7DB9DA', roughness: 0.1, transparent: true, opacity: 0.85 }));

    // Chỗ chim cúi mổ: miệng cóng và đồ tươi (Bird tự chọn chỗ đứng trên cầu cho vừa tầm mỏ)
    this.targets = {
      food: { x: -0.12, y: 0.117, z: 0.15 },
      water: { x: 0.12, y: 0.187, z: 0.15 },
      fresh: { x: -0.115, y: 0.135, z: -0.125 },
    };

    // Kẹp đồ ăn tươi
    this.freshAnchor = new THREE.Group();
    this.freshAnchor.position.set(-0.115, 0.15, -0.125);
    this.group.add(this.freshAnchor);
    this.fly = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 6), new THREE.MeshBasicMaterial({ color: '#111' }));
    this.fly.visible = false; this.freshAnchor.add(this.fly);

    // Phân chim
    this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.005, 6, 5), new THREE.MeshStandardMaterial({ color: '#EDEBE3' }), 40);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) {
      const r = Math.sqrt(Math.random()) * (R - 0.03), a = Math.random() * Math.PI * 2;
      m4.makeScale(1, 0.45, 1).setPosition(Math.cos(a) * r, 0.006, Math.sin(a) * r);
      this.drops.setMatrixAt(i, m4);
    }
    this.drops.count = 0;
    this.group.add(this.drops);

    // Lông rụng mùa thay lông
    this.feathers = new THREE.Group();
    const fmat = new THREE.MeshStandardMaterial({ color: '#8C7A62', side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.008), fmat);
      f.rotation.set(-Math.PI / 2, 0, Math.random() * 3);
      f.position.set(rand(-0.15, 0.15), 0.006, rand(-0.12, 0.12));
      this.feathers.add(f);
    }
    this.feathers.visible = false;
    this.group.add(this.feathers);

    // Áo lồng: trượt từ đỉnh xuống
    const pts = [
      new THREE.Vector2(0.001, CAGE.HOOK - 0.005), new THREE.Vector2(R * 0.25, TOP + 0.01), new THREE.Vector2(R * 0.62, TOP - 0.03),
      new THREE.Vector2(R * 0.9, H + 0.08), new THREE.Vector2(R + 0.02, H), new THREE.Vector2(R + 0.026, -0.05),
    ];
    const coverGeo = new THREE.LatheGeometry(pts, 48);
    coverGeo.translate(0, -CAGE.HOOK, 0);
    const cover = new THREE.Mesh(coverGeo, new THREE.MeshStandardMaterial({ map: fabric(), roughness: 0.95, side: THREE.DoubleSide }));
    cover.castShadow = true; cover.userData.pick = 'cover';
    this.coverPivot = new THREE.Group();
    this.coverPivot.position.y = CAGE.HOOK;
    this.coverPivot.add(cover);
    this.coverPivot.scale.y = 1;
    this.group.add(this.coverPivot);
    this.picks.push(cover);
    this.coverAmt = 1;
    this.coverTarget = 1;
    this.time = 0;
  }

  makeCup(x, y, z, pick) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const porcelain = new THREE.MeshStandardMaterial({ color: '#F4F2EC', roughness: 0.25 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.034, 24, 1, true), porcelain);
    cup.material.side = THREE.DoubleSide; cup.castShadow = true;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.022, 24), porcelain);
    bottom.rotation.x = -Math.PI / 2; bottom.position.y = -0.016;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.0022, 6, 28), new THREE.MeshStandardMaterial({ color: '#2F55A0', roughness: 0.3 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.017;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0262, 0.0245, 0.006, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#2F55A0', side: THREE.DoubleSide }));
    band.position.y = 0.004; band.scale.setScalar(1.005);
    for (const m of [cup, bottom, rim, band]) { m.userData.pick = pick; this.picks.push(m); g.add(m); }
    this.group.add(g);
    return g;
  }

  makeFill(cupGroup, material) {
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.0255, 0.0215, 1, 24), material);
    fill.position.y = -0.016; fill.scale.y = 0.001;
    cupGroup.add(fill);
    return fill;
  }

  setFood(color, amount) {
    const h = 0.03 * Math.max(0, Math.min(1, amount));
    this.foodFill.visible = amount > 0.01;
    this.foodFill.scale.y = Math.max(0.001, h);
    this.foodFill.position.y = -0.016 + h / 2;
    this.foodFill.material.color.set(color || '#9A6B3C');
  }

  setWater(level, clean) {
    const h = 0.03 * Math.max(0, Math.min(1, level));
    this.waterFill.visible = level > 0.01;
    this.waterFill.scale.y = Math.max(0.001, h);
    this.waterFill.position.y = -0.016 + h / 2;
    const c = new THREE.Color('#7DB9DA').lerp(new THREE.Color('#8A7A4A'), 1 - Math.max(0, Math.min(1, clean)));
    this.waterFill.material.color.copy(c);
  }

  /** Phân trên khay: nhiều theo độ bẩn; màu báo sức khỏe (khỏe: trắng đen; tiêu chảy: lỏng xanh; ốm: mất phần trắng, ngả vàng). */
  setDirt(cageClean, sick) {
    this.drops.count = Math.max(0, Math.min(40, Math.round((100 - cageClean) / 2.4)));
    const c = sick === 'tieu_chay' ? '#9FAE6A' : sick ? '#C9B866' : '#EDEBE3';
    if (c !== this.dropColor) { this.dropColor = c; this.drops.material.color.set(c); }
  }

  setFresh(spec, spoiled) {
    const key = spec ? spec.shape + spec.color + spoiled : '';
    if (key === this.freshKey) return;
    this.freshKey = key;
    for (const c of [...this.freshAnchor.children]) if (c !== this.fly) this.freshAnchor.remove(c);
    this.fly.visible = !!spec && spoiled;
    if (!spec) return;
    const color = new THREE.Color(spec.color);
    if (spoiled) color.lerp(new THREE.Color('#4A3B22'), 0.55);
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    let mesh;
    switch (spec.shape) {
      case 'banana': mesh = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 16, Math.PI * 0.6), m); mesh.rotation.z = 1.9; break;
      case 'chili': mesh = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.05, 10), m); mesh.rotation.z = Math.PI; break;
      case 'leaf': mesh = new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide })); mesh.scale.y = 1.6; break;
      case 'insect': mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.03, 4, 8), m); mesh.rotation.z = Math.PI / 2.4; break;
      case 'worm': mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.022, 4, 8), m); mesh.rotation.z = 0.7; break;
      case 'sphere': mesh = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), m); break;
      case 'bone': mesh = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), m); mesh.scale.set(0.45, 1.2, 0.2); break;
      case 'grain': mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.016), m); break;
      default: mesh = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), m);
    }
    mesh.position.y = -0.03; mesh.castShadow = true;
    this.freshAnchor.add(mesh);
  }

  setCovered(on) { this.coverTarget = on ? 1 : 0; }
  setMolt(on) { this.feathers.visible = on; }

  update(dt) {
    this.time += dt;
    this.coverAmt = lerp(this.coverAmt, this.coverTarget, 1 - Math.exp(-dt * 5));
    const a = this.coverAmt;
    this.coverPivot.visible = a > 0.02;
    this.coverPivot.scale.y = Math.max(0.02, a);
    this.coverPivot.scale.x = this.coverPivot.scale.z = 0.92 + 0.08 * a;
    if (this.fly.visible) {
      const t = this.time * 6;
      this.fly.position.set(Math.cos(t) * 0.04, -0.02 + Math.sin(t * 1.7) * 0.015, Math.sin(t) * 0.03);
    }
  }
}

function rand(a, b) { return a + Math.random() * (b - a); }
