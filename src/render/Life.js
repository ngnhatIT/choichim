import * as THREE from 'three';
import { glowDot } from './textures.js';

const rand = (a, b) => a + Math.random() * (b - a);

/**
 * Sự sống quanh nhà: chim trời bay xa, bướm ban ngày, đom đóm ban đêm, bụi nắng quanh lồng, nước mưa bắn trên sân.
 * Mọi thứ dùng chung hình học, vật liệu; ẩn hẳn khi không cần.
 */
export class Life {
  constructor(scene) {
    this.time = 0;
    const dot = glowDot();

    // Đàn chim trời (cò trắng bay chậm, hoặc én đen bay nhanh)
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0.07, 0, 0, -0.07, 0, 0, -0.05, 0, 0.36], 3));
    wingGeo.computeVertexNormals();
    this.flockMat = new THREE.MeshBasicMaterial({ color: '#F2F2EE', side: THREE.DoubleSide });
    const bodyGeo = new THREE.SphereGeometry(0.06, 6, 4).scale(2.6, 0.8, 0.8);
    this.flock = new THREE.Group();
    this.flockBirds = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group();
      b.add(new THREE.Mesh(bodyGeo, this.flockMat));
      const wr = new THREE.Mesh(wingGeo, this.flockMat), wl = new THREE.Mesh(wingGeo, this.flockMat);
      wl.scale.z = -1;
      b.add(wr, wl);
      b.userData = { wr, wl, off: new THREE.Vector3(-i * rand(0.9, 1.4), rand(-0.4, 0.4), (i % 2 ? 1 : -1) * i * 0.7), ph: Math.random() * 6 };
      this.flock.add(b); this.flockBirds.push(b);
    }
    this.flock.visible = false;
    this.flockNext = rand(4, 12);
    scene.add(this.flock);

    // Bướm quanh giàn hoa giấy ngoài sân
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(0.03, 0.005, 0.036, 0.03); wingShape.quadraticCurveTo(0.02, 0.04, 0, 0.012);
    wingShape.quadraticCurveTo(-0.02, 0.03, -0.012, 0.004); wingShape.lineTo(0, 0);
    const bfGeo = new THREE.ShapeGeometry(wingShape).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2);
    this.butterflies = ['#F2D24B', '#F4F1E6', '#E8892E', '#F2D24B'].map((c, i) => {
      const mat = new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide });
      const g = new THREE.Group();
      const r = new THREE.Mesh(bfGeo, mat), l = new THREE.Mesh(bfGeo, mat);
      l.scale.z = -1;
      g.add(r, l);
      g.userData = { r, l, ph: [rand(0, 6), rand(0, 6), rand(0, 6)], w: [rand(0.25, 0.45), rand(0.3, 0.5), rand(0.2, 0.4)], i, prev: new THREE.Vector3() };
      g.visible = false;
      scene.add(g);
      return g;
    });

    // Đom đóm: điểm sáng cộng màu, nhấp nháy bằng màu đỉnh
    const NF = 36;
    const fp = new Float32Array(NF * 3), fc = new Float32Array(NF * 3);
    this.ffBase = [];
    for (let i = 0; i < NF; i++) {
      const nearPot = i < 6; // vài con quanh chậu cây trên hiên
      this.ffBase.push(nearPot
        ? new THREE.Vector3(rand(-6.9, -6.3), rand(0.75, 1.6), rand(0.7, 1.3))
        : new THREE.Vector3(rand(-12, -8), rand(0.25, 2.2), rand(-3, 8)));
      this.ffBase[i].ph = Math.random() * 20;
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    ffGeo.setAttribute('color', new THREE.BufferAttribute(fc, 3));
    this.fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ size: 0.09, map: dot, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.fireflies.frustumCulled = false;
    this.fireflies.visible = false;
    scene.add(this.fireflies);

    // Bụi lơ lửng trong nắng quanh lồng
    const NM = 50;
    this.moteBase = new Float32Array(NM * 3);
    for (let i = 0; i < NM; i++) { this.moteBase[i * 3] = rand(-0.5, 0.5); this.moteBase[i * 3 + 1] = rand(-0.4, 0.4); this.moteBase[i * 3 + 2] = rand(-0.4, 0.4); }
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NM * 3), 3));
    this.motes = new THREE.Points(mGeo, new THREE.PointsMaterial({ size: 0.007, map: dot, color: '#FFF1C9', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.motes.frustumCulled = false;
    scene.add(this.motes);

    // Nước mưa bắn trên sân, trước thềm (vòng tròn loang)
    const NS = 70;
    this.splashes = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.75, 1, 14).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#C9D6E3', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
      NS,
    );
    this.splashes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.splashes.setColorAt(0, new THREE.Color());
    this.splashT = new Float32Array(NS).fill(-1);
    this.splashP = Array.from({ length: NS }, () => new THREE.Vector3());
    this.splashes.frustumCulled = false;
    this.splashes.visible = false;
    scene.add(this.splashes);
    this.m4 = new THREE.Matrix4(); this.col = new THREE.Color(); this.v = new THREE.Vector3();
  }

  /** c: { hour, rain, wind, night (0..1), sun (0..1), cam, cage (Vector3), close, reduceMotion } */
  update(dt, c) {
    this.time += dt;
    const t = this.time;
    const day = c.night < 0.3 && c.hour > 5.5 && c.hour < 18.6;
    const still = c.reduceMotion;

    // Chim trời
    if (!this.flock.visible) {
      this.flockNext -= dt;
      if (this.flockNext <= 0 && day && !c.rain && !still) this.startFlock(c.hour);
    } else {
      const F = this.flock.userData;
      F.x += F.dir * F.speed * dt;
      this.flock.position.set(F.x, F.y + Math.sin(t * 0.3) * 0.6, F.z);
      for (const b of this.flockBirds) {
        const u = b.userData;
        b.position.copy(u.off).multiplyScalar(F.scale);
        b.position.y += Math.sin(t * 0.9 + u.ph) * 0.15;
        const flapOn = F.glide ? Math.sin(t * 0.7 + u.ph) > -0.3 : true;
        const a = flapOn ? Math.sin(t * F.flap + u.ph) * 0.75 : 0.1;
        u.wr.rotation.x = -a; u.wl.rotation.x = a;
      }
      if (Math.abs(F.x) > 75) { this.flock.visible = false; this.flockNext = rand(15, 40); }
    }

    // Bướm
    const bfOn = day && !c.rain && c.wind < 0.6 && !still;
    for (const b of this.butterflies) {
      b.visible = bfOn;
      if (!bfOn) continue;
      const u = b.userData;
      // Một con hay lượn gần lồng khi lồng ở ngoài sân
      const inYard = c.cage.z > 3; // lồng đang phơi ngoài sân trước
      const center = u.i === 0 && inYard ? this.v.set(c.cage.x + 0.35, c.cage.y + 0.1, c.cage.z + 0.25) : this.v.set(-10 + u.i * 0.5, 0.9, 0.5 + u.i * 0.6);
      const R = u.i === 0 && inYard ? 0.45 : 1.6;
      u.prev.copy(b.position);
      b.position.set(
        center.x + Math.sin(t * u.w[0] + u.ph[0]) * R + Math.sin(t * 1.7 + u.ph[1]) * 0.15,
        center.y + Math.sin(t * u.w[1] + u.ph[1]) * 0.45 * (R > 1 ? 1 : 0.4) + Math.sin(t * 5 + u.ph[2]) * 0.04,
        center.z + Math.cos(t * u.w[2] + u.ph[2]) * R * 0.7,
      );
      const dx = b.position.x - u.prev.x, dz = b.position.z - u.prev.z;
      if (dx * dx + dz * dz > 1e-8) b.rotation.y = Math.atan2(-dz, dx);
      const a = 0.25 + 1.05 * Math.abs(Math.sin(t * 13 + u.ph[0]));
      u.r.rotation.x = -a; u.l.rotation.x = a;
    }

    // Đom đóm
    const ffOn = c.night > 0.7 && !c.rain;
    this.fireflies.visible = ffOn;
    if (ffOn) {
      const pa = this.fireflies.geometry.attributes.position, ca = this.fireflies.geometry.attributes.color;
      const k = still ? 0.2 : 1;
      this.ffBase.forEach((p, i) => {
        const w = p.ph;
        pa.setXYZ(i, p.x + Math.sin(t * 0.3 * k + w) * 0.4, p.y + Math.sin(t * 0.5 * k + w * 1.3) * 0.25, p.z + Math.cos(t * 0.27 * k + w) * 0.4);
        const blink = Math.max(0, Math.sin(t * (0.8 + (i % 5) * 0.15) + w)) ** 3;
        ca.setXYZ(i, 0.75 * blink, 1.0 * blink, 0.35 * blink);
      });
      pa.needsUpdate = true; ca.needsUpdate = true;
    }

    // Bụi nắng: chỉ khi nhìn gần, trời nắng
    const moteK = c.close && !c.rain ? Math.max(0, c.sun - 0.25) * 0.9 : 0;
    this.motes.material.opacity += (moteK - this.motes.material.opacity) * Math.min(1, dt * 2);
    this.motes.visible = this.motes.material.opacity > 0.02;
    if (this.motes.visible) {
      const pa = this.motes.geometry.attributes.position, B = this.moteBase;
      for (let i = 0; i < pa.count; i++) {
        let y = B[i * 3 + 1] - (still ? 0 : dt * 0.012);
        if (y < -0.4) y += 0.8;
        B[i * 3 + 1] = y;
        pa.setXYZ(i, c.cage.x + B[i * 3] + Math.sin(t * 0.2 + i) * 0.03, c.cage.y + y, c.cage.z + B[i * 3 + 2] + Math.cos(t * 0.17 + i * 1.7) * 0.03);
      }
      pa.needsUpdate = true;
    }

    // Mưa bắn trên sân
    this.splashes.visible = c.rain;
    if (c.rain) {
      const S = this.splashes;
      for (let i = 0; i < S.count; i++) {
        let a = this.splashT[i];
        if (a < 0 || a > 0.35) {
          a = -Math.random() * 0.3; // lệch pha để không nảy cùng lúc
          const front = Math.random() < 0.45;
          this.splashP[i].set(front ? rand(-6, 3) : rand(-11, -5.5), 0.012, front ? rand(2.1, 5) : rand(-3, 3));
        }
        a += dt; this.splashT[i] = a;
        const k = Math.max(0, a) / 0.35, s = 0.015 + 0.075 * k;
        this.m4.makeScale(s, 1, s).setPosition(this.splashP[i]);
        S.setMatrixAt(i, this.m4);
        S.setColorAt(i, this.col.setScalar(a < 0 ? 0 : 1 - k));
      }
      S.instanceMatrix.needsUpdate = true; S.instanceColor.needsUpdate = true;
    }
  }

  startFlock(hour) {
    const egret = hour < 8.5 || hour > 16 || Math.random() < 0.4; // cò bay sáng sớm, chiều về
    const dir = Math.random() < 0.5 ? 1 : -1;
    this.flockMat.color.set(egret ? '#F2F2EE' : '#2A2A30');
    this.flock.userData = { x: -dir * 70, y: rand(9, 15), z: rand(-42, -26), dir, speed: egret ? rand(4, 5.5) : rand(8, 11), flap: egret ? 9 : 20, glide: !egret, scale: egret ? 1.4 : 0.8 };
    this.flock.rotation.y = dir > 0 ? 0 : Math.PI;
    const s = egret ? 1.6 : 0.8;
    for (const b of this.flockBirds) b.scale.setScalar(s);
    this.flock.visible = true;
  }
}
