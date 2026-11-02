import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SPECIES } from '../data/species.js';
import { STAPLES, FOODS } from '../data/foods.js';
import { LOCATIONS } from '../data/locations.js';
import { WEATHER } from '../data/weather.js';
import { isNight } from '../core/util.js';
import { feederAcceptance } from '../core/simulation.js';
import { Sky } from './Sky.js';
import { House, Stand, FLOOR_Y } from './House.js';
import { Cage, CAGE } from './Cage.js';
import { Bird, stageModel } from './Bird.js';
import { adultness, isYoung } from '../data/stages.js';
import { Life } from './Life.js';
import { noteSprite, shadowBlob } from './textures.js';
import { sickPhase } from '../core/illness.js';

const damp = (dt, rate) => 1 - Math.exp(-dt * rate);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Nhịp hót dự phòng khi chưa có tiếng thật: [âm tiết], [nghỉ giữa âm], [số âm mỗi câu], [nghỉ giữa câu] (giây)
const RHYTHM = {
  chaomao: [[0.08, 0.16], [0.03, 0.07], [3, 6], [0.5, 1.1]],
  chichchoe: [[0.14, 0.38], [0.05, 0.12], [2, 5], [0.6, 1.2]],
  hoami: [[0.08, 0.18], [0.04, 0.08], [6, 12], [0.5, 0.9]],
  khuyen: [[0.04, 0.07], [0.015, 0.04], [8, 18], [0.4, 0.8]],
  talk: [[0.06, 0.12], [0.03, 0.07], [3, 7], [0.3, 0.6]],
};
// Nhịp âm tiết (Hz) để mỏ mở – khép theo từng tiếng dù biên độ giữ cao
const SYL = { chaomao: 8, chichchoe: 5.5, hoami: 9, khuyen: 13, yenphung: 10, sao: 7 };
const QUIET_EVENTS = new Set(['nhang', 'chao', 'cafe', 'thuoc', 'nom', 'thi', 'nghenoi']);

// Chỉnh màu cuối (trước tone mapping): tối góc nhẹ như ống kính, tăng chút độ bão hòa
const GRADE = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.42 }, saturation: { value: 1.07 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette; uniform float saturation; varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  vec2 q = vUv - 0.5;
  c.rgb *= 1.0 - dot(q, q) * vignette;
  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  c.rgb = max(mix(vec3(l), c.rgb, saturation), 0.0);
  gl_FragColor = c;
}`,
};

/**
 * Cảnh 3D. Chỉ đọc trạng thái game qua `sync(S)`, không thay đổi logic.
 */
export class World {
  constructor(container, { onPick } = {}) {
    this.container = container;
    this.onPick = onPick;
    this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Khử răng cưa bằng MSAA trên render target HDR của composer, nên canvas không cần antialias
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    // Máy yếu (card đồ họa tích hợp, ít nhân CPU hoặc ít RAM): độ phân giải thấp hơn, bóng thường thay bóng mềm, không AO.
    // Máy văn phòng nhiều nhân CPU vẫn hay đi với card Intel tích hợp, nên phải xét cả tên GPU
    const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const weak = (/intel|mali|adreno|powervr|swiftshader|llvmpipe|basic render/i.test(gpu) && !/\barc\b/i.test(gpu))
      || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    this.weak = weak;
    this.maxPr = Math.min(window.devicePixelRatio, weak ? 1 : 1.75);
    renderer.setPixelRatio(this.maxPr);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = weak ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.03, 200);
    this.camera.position.set(-2.7, 1.95, 1.75);
    this.initPost(weak);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.55;
    this.controls.maxDistance = 18;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minPolarAngle = Math.PI * 0.12;
    this.controls.enablePan = false;
    this.controls.target.set(-3.1, 1.75, -0.27);

    this.sky = new Sky(this.scene, { shadowSize: weak ? 2048 : 4096 });
    this.house = new House();
    this.scene.add(this.house.group);
    this.life = new Life(this.scene);

    this.stand = new Stand();
    this.scene.add(this.stand.group);
    // Lồng treo vào móc qua một khớp để đung đưa nhẹ khi gió, khi chim nhảy
    this.cagePivot = new THREE.Group();
    this.cagePivot.position.copy(this.stand.hookTop).add(new THREE.Vector3(0, 0.02, 0));
    this.stand.group.add(this.cagePivot);
    this.cage = new Cage();
    this.cage.group.position.set(0, -CAGE.HOOK, 0);
    this.cagePivot.add(this.cage.group);
    this.swing = { x: 0, z: 0, vx: 0, vz: 0 };
    this.bird = new Bird();
    this.bird.group.scale.setScalar(1.25); // phóng to nhẹ cho dễ nhìn, kiểu game
    this.cage.group.add(this.bird.group);

    // Nốt nhạc
    this.notes = [];
    const tex = [noteSprite('♪'), noteSprite('♫')];
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex[i % 2], transparent: true, depthWrite: false }));
      s.scale.setScalar(0.06); s.visible = false; s.userData.life = 0;
      this.scene.add(s); this.notes.push(s);
    }
    this.noteGap = 0;

    // Giọt nước khi tắm (tọa độ trong lồng)
    const ND = 120;
    const dropGeo = new THREE.BufferGeometry();
    dropGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ND * 3).fill(-9), 3));
    dropGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ND * 3).fill(1), 3));
    this.drops = new THREE.Points(dropGeo, new THREE.PointsMaterial({ vertexColors: true, size: 0.009, transparent: true, opacity: 0.9, depthWrite: false }));
    this.drops.frustumCulled = false;
    this.dropVel = new Float32Array(ND * 3);
    this.dropLife = new Float32Array(ND);
    this.dropNext = 0;
    this.cage.group.add(this.drops);

    // Bóng tiếp xúc mờ dưới chim trên sàn lồng
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowBlob(), transparent: true, depthWrite: false }));
    this.blob.position.y = 0.0045; this.blob.renderOrder = 1;
    this.cage.group.add(this.blob);
    this.loose = []; // lông rơi

    // Khói (nhang, chảo)
    this.smoke = [];
    const smokeGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const smokeMat = new THREE.MeshBasicMaterial({ color: '#C9C9C9', transparent: true, opacity: 0.3, depthWrite: false });
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(smokeGeo, smokeMat.clone());
      m.visible = false; m.userData.life = 0; this.scene.add(m); this.smoke.push(m);
    }

    this.view = 'close';
    this.standX = LOCATIONS.hien.x;
    this.standY = FLOOR_Y;
    this.standZ = LOCATIONS.hien.z;
    this.stand.group.position.set(this.standX, this.standY, this.standZ);
    this.lastTarget = new THREE.Vector3();
    this.cageWorld(this.lastTarget);
    this.S = null;
    this.speciesKey = null;
    this.tmp = new THREE.Vector3();
    this.now = 0;
    this.gust = 0;
    this.flags = {};
    this.vs = { level: 0, high: false, last: -9, boutUntil: 0, boutStart: 0, real: false, lastSing: null, say: '', chatUntil: 0 };
    this.fake = { on: false, t: 0, d: 0, n: 0, amp: 1 };

    this.bindPicking();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
    this.clock = new THREE.Clock();
    renderer.setAnimationLoop(() => this.frame());
  }

  /**
   * Hậu kỳ trên render target HDR (half float, MSAA 4x): cảnh → GTAO (che khuất môi trường) → bloom → chỉnh màu → tone mapping + sRGB.
   */
  initPost(weak) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: weak ? 2 : 4 });
    const composer = new EffectComposer(this.renderer, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    if (!weak) {
      const ao = new GTAOPass(this.scene, this.camera, 1, 1, undefined, { radius: 0.3, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12 });
      ao.blendIntensity = 0.85;
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      // AO nửa độ phân giải: rẻ hơn 4 lần, khử nhiễu Poisson che được chỗ mờ
      ao.setSize = (w, h) => GTAOPass.prototype.setSize.call(ao, Math.max(1, w >> 1), Math.max(1, h >> 1));
      // Vật trong suốt, cắt alpha (lá, lông tơ, khói, nốt nhạc) không ghi pháp tuyến đặc: ẩn khỏi lượt AO để khỏi quầng tối hình chữ nhật
      ao.overrideVisibility = function () {
        this.scene.traverse((o) => {
          this._visibilityCache.set(o, o.visible);
          const m = o.material;
          if (o.isPoints || o.isLine || o.isSprite || (m && (m.transparent || m.alphaTest > 0 || m.side === THREE.BackSide))) o.visible = false;
        });
      };
      composer.addPass(ao);
      this.ao = ao;
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.55, 1.1);
    composer.addPass(this.bloom);
    composer.addPass(new ShaderPass(GRADE));
    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  /** Khung hình tụt dưới ~40/giây liên tục 3 giây: tắt AO trước, rồi hạ độ phân giải từng bậc (không thấp hơn 0.75). */
  adapt(raw) {
    if (document.hidden || raw > 0.5) return; // tab ẩn hoặc vừa quay lại: bỏ qua
    this.ft = (this.ft ?? 1 / 60) * 0.95 + raw * 0.05;
    const slow = this.ft > (this.lowFps ? 2 : 1) / 40;
    this.slowFor = slow ? (this.slowFor || 0) + raw : 0;
    const pr = this.renderer.getPixelRatio();
    // AO đã tắt vì chậm thì giữ tắt, tránh bật tắt qua lại
    if (this.slowFor > 3 && this.ao?.enabled && !this.lowFps) { this.ao.enabled = false; this.aoOff = true; this.slowFor = 0; return; }
    if (this.slowFor > 3 && pr > 0.75) {
      this.renderer.setPixelRatio(Math.max(0.75, pr - 0.25));
      this.resize(); this.slowFor = 0;
    }
    // Mượt trở lại lâu (sau hộp thoại nặng, tab khác...) thì nâng dần độ phân giải về mức cũ
    this.fastFor = this.ft < (this.lowFps ? 2 : 1) / 55 ? (this.fastFor || 0) + raw : 0;
    if (this.fastFor > 10 && pr < this.maxPr) {
      this.renderer.setPixelRatio(Math.min(this.maxPr, pr + 0.25));
      this.resize(); this.fastFor = 0;
    }
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Tâm lồng (không tính đung đưa), để camera bám theo cho êm. */
  cageWorld(out) { return this.cagePivot.getWorldPosition(out).add(this.tmp2 ??= new THREE.Vector3(0, 0.22 - CAGE.HOOK, 0)); }

  bindPicking() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const targets = [...this.cage.picks, ...this.birdMeshes()];
      for (const hit of ray.intersectObjects(targets, false)) {
        if (!visibleChain(hit.object)) continue;
        let o = hit.object;
        while (o && !o.userData.pick) o = o.parent;
        if (o && this.onPick) { this.onPick(o.userData.pick); break; }
      }
    });
    el.style.cursor = 'grab';
  }

  birdMeshes() {
    const out = [];
    this.bird.group.traverse((o) => { if (o.isMesh) { o.userData.pick = 'look'; out.push(o); } });
    return out;
  }

  setView(v) {
    this.view = v;
    const c = this.cageWorld(new THREE.Vector3());
    if (v === 'wide') this.flyTo(new THREE.Vector3(-7.4, 5.0, 14.2), new THREE.Vector3(-1.2, 2.0, -0.6)); // từ cổng chếch trái nhìn vào: bình phong, bể cạn, nhà rường ba gian
    else {
      // Màn hình dọc thì lùi camera xa hơn để thấy trọn lồng
      const tall = this.camera.aspect < 1, far = tall ? 1.15 / Math.max(0.45, this.camera.aspect) : 1;
      // Màn dọc: thanh trên đè mép trên cảnh, nên nhìn cao hơn một chút để lồng nằm giữa khoảng trống thật
      const up = tall ? 0.09 : 0;
      this.flyTo(c.clone().add(new THREE.Vector3(0.28 * far, 0.1 + up, 1.05 * far)), c.clone().add(new THREE.Vector3(0, -0.04 + up, 0)));
    }
  }

  flyTo(pos, target) {
    this.fly = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos, t1: target, k: 0 };
  }

  /** Nhận trạng thái mới nhất từ game. */
  sync(S) {
    this.S = S;
    if (!S) return;
    const sp = SPECIES[S.sp];
    const age = adultness(S.stage, S.day), look = S.sp + (S.stage || '') + Math.round(age * 4);
    if (this.speciesKey !== look) { // đổi loài, hoặc chim chuyền đang thay dần sang lông trưởng thành
      this.speciesKey = look;
      this.bird.build(stageModel(sp.model, age, S.stage === 'gia'), S.sp);
      this.bird.setCage({ perches: this.cage.perches, targets: this.cage.targets, R: CAGE.R });
      this.vs.lastSing = S.singUntil; this.vs.say = S.say; this.vs.boutUntil = 0;
    }
    const c = this.cage;
    c.setFood(S.feeder.type ? STAPLES[S.feeder.type].color : null, S.feeder.amt / 100);
    c.setWater(S.water.level / 100, S.water.clean / 100);
    c.setDirt(S.cage, sickPhase(S) === 'ro' ? S.sick.type : undefined);
    c.setFresh(S.fresh ? FOODS[S.fresh.f].mesh : null, S.fresh?.spoiled);
    c.setCovered(S.covered);
    c.setMolt(S.molt);
  }

  frame() {
    if (this.lowFps && (this.skipFrame = !this.skipFrame)) return; // chế độ nghe chim: vẽ cách một khung
    const raw = this.clock.getDelta(), dt = Math.min(0.05, raw);
    this.adapt(raw);
    // Bóng đổ vẽ theo yêu cầu (lượt AO cũng gọi render, không được vẽ lại bóng): cách một khung là đủ mượt
    // cho chim nhảy, cây lay; nghe chim: 1/3 số khung (chim đứng hót ít di chuyển)
    const sm = this.renderer.shadowMap;
    sm.autoUpdate = false;
    if ((this.shadowTick = ((this.shadowTick || 0) + 1) % (this.lowFps ? 3 : 2)) === 0) sm.needsUpdate = true;
    if (this.ao) this.ao.enabled = !this.lowFps && !this.aoOff;
    this.now += dt;
    const S = this.S;
    const W = S ? WEATHER[S.weather] : WEATHER.mat;
    const hour = S ? this.tNow(S) / 60 : 8;
    this.gust = Math.max(0, this.gust - dt / 20);
    const wind = Math.min(1.4, (W.cold || W.rain ? 0.8 : 0.15) + this.gust);
    this.sky.update(hour, W, dt, wind);
    this.house.setNight(this.sky.night);
    // Mưa thấm ướt trong ~20 giây, tạnh thì khô chậm hơn (~2 phút)
    this.wet = clamp01((this.wet ?? (W.rain ? 1 : 0)) + (W.rain ? dt / 20 : -dt / 120));
    this.house.setWet(this.wet);
    if (!this.reduceMotion) this.house.update(this.now, wind);

    // Di chuyển cây treo lồng
    if (S) {
      const loc = LOCATIONS[S.pos];
      const tx = loc.x, ty = S.pos === 'san' ? 0 : FLOOR_Y;
      const k = damp(dt, this.reduceMotion ? 50 : 2.6);
      this.standX += (tx - this.standX) * k;
      this.standY += (ty - this.standY) * k;
      this.standZ += (loc.z - this.standZ) * k;
      this.stand.group.position.set(this.standX, this.standY, this.standZ);
    }
    this.updateSwing(dt, S, wind);
    if (S) {
      const loc = LOCATIONS[S.pos];
      this.updateEnv(hour, W.rain, S.pos, Math.hypot(loc.x - this.standX, loc.z - this.standZ) < 0.05);
    }

    // Camera bám theo lồng
    const target = this.cageWorld(this.tmp);
    if (this.fly) {
      this.fly.k = Math.min(1, this.fly.k + dt / (this.reduceMotion ? 0.01 : 1.1));
      const e = 1 - Math.pow(1 - this.fly.k, 3);
      this.camera.position.lerpVectors(this.fly.p0, this.fly.p1, e);
      this.controls.target.lerpVectors(this.fly.t0, this.fly.t1, e);
      if (this.fly.k >= 1) this.fly = null;
    } else if (this.view === 'close') {
      const delta = target.clone().sub(this.lastTarget);
      this.camera.position.add(delta);
      this.controls.target.add(delta);
    }
    this.lastTarget.copy(target);
    this.controls.update();

    // Chim
    if (S) {
      const f = this.birdFlags(S, W, dt);
      this.bird.update(dt, f);
      this.cage.update(dt);
      this.updateNotes(dt, f);
      this.updateDrops(dt, f);
      this.updateGround(dt, f);
      this.updateSmoke(dt, S);
    }
    this.life.update(dt, {
      hour, rain: W.rain, wind, night: this.sky.night, sun: this.sky.sunK, cam: this.camera.position,
      cage: target, close: this.view === 'close', reduceMotion: this.reduceMotion,
    });
    this.composer.render(dt);
  }

  /** Suy ra cờ hành vi của chim từ trạng thái game (chỉ đọc). */
  birdFlags(S, W, dt) {
    const rc = this.clockFn?.(), t = rc ?? S.t; // đang nghe chim: theo đồng hồ nghe
    const sp = SPECIES[S.sp], f = this.flags, h = t / 60;
    // Nghe chim: chim lên cầu ngủ từ 18 giờ như SoundEngine.relaxTick; chơi thường thì theo giờ đêm của game
    const night = rc != null ? h >= 18 || h < 5.5 : isNight(t);
    f.sleep = night && (S.covered || rc != null);
    f.drowsy = night && !f.sleep;
    f.covered = S.covered;
    const ill = sickPhase(S) === 'ro' ? S.sick : null; // ủ bệnh, đang điều trị: chỉ xù lông nhẹ, chưa lim dim
    f.sick = !!ill;
    f.itch = ill?.type === 'ran_mat';
    f.cold = ill?.type === 'cam_lanh' || (W.cold && !S.covered && S.wet > 0);
    f.molt = !!S.molt;
    f.wet = S.wet > 0;
    f.bathing = S.t < S.bathFx;
    f.fluff = !!S.sick || f.wet || (W.cold && !S.covered) || f.drowsy;
    f.eat = S.hunger < 85 && S.feeder.amt > 0 && feederAcceptance(S, sp) > 0;
    f.hungry = S.hunger < 20;
    f.peckish = S.hunger < 45;
    f.water = S.water.level > 4;
    f.fresh = !!S.fresh;
    f.hot = (S.pos === 'san' && h >= 11 && h < 15) || ill?.type === 'say_nang';
    f.nervous = S.newDays > 0 || S.mood < 35 || ill?.type === 'nga_nuoc';
    f.active = S.covered || f.sick ? 0 : clamp01((S.mood - 35) / 50);
    f.young = isYoung(S);           // chim non: đói thì rung cánh xin ăn
    f.overFire = !S.covered && S.vigor > 90; // quá lửa: nhảy loạn, đập cánh
    f.lowFire = !S.covered && !f.sick && S.vigor < 40; // xuống lửa: thu mình, xù nhẹ, cụp mào
    f.ragged = S.feather < 50;                // lông xấu: xơ, hay rỉa
    f.excited = S.mood > 70;
    f.trust = S.trust;
    f.camNear = this.view === 'close';
    f.cam = this.camera.position;
    f.reduceMotion = this.reduceMotion;
    this.updateVoice(dt, S, sp, f);
    return f;
  }

  /** Biên độ tiếng (thật từ SoundEngine, hoặc nhịp dự phòng) → f.voice, f.onset, f.sing. */
  updateVoice(dt, S, sp, f) {
    const V = this.vs, now = this.now;
    let raw = 0;
    try { raw = clamp01(Number(this.voice?.()) || 0); } catch { raw = 0; }
    if (raw > 0.03) V.last = now;
    const quiet = S.covered || f.sleep;
    // Hiệp hót mới khi S.singUntil tăng; kéo dài theo giây thật (một hiệp game < 1 giây thật)
    if (V.lastSing !== null && S.singUntil > V.lastSing && S.t < S.singUntil) {
      V.boutStart = now; V.boutUntil = now + rand(5, 7.5); V.real = false;
    }
    V.lastSing = S.singUntil;
    let sing = !quiet && sp.skill === 'song' && (S.t < S.singUntil || now < V.boutUntil || !!this.singing?.()); // singing: chế độ nghe chim
    if (sing && raw > 0.03) { V.real = true; V.boutUntil = Math.max(V.boutUntil, now + 0.6); }
    // Loài nói: câu mới → líu lo một lúc
    if (S.say !== V.say) { if (S.say && S.t < S.sayUntil) V.chatUntil = now + 1.8; V.say = S.say; }
    const chat = !quiet && now < V.chatUntil;
    let v = raw, fake = false;
    const waited = now - V.boutStart > 0.6;
    if (((sing && !V.real && waited) || chat) && now - V.last > 0.5) { v = this.fakeVoice(dt, RHYTHM[S.sp] || RHYTHM.talk); fake = true; }
    else this.fake.on = false;
    if (quiet) v = 0;
    // Hai đường bao: nhanh (từng tiếng) và chậm (độ to chung của câu hót)
    V.fast = (V.fast || 0) + (v - (V.fast || 0)) * Math.min(1, dt * 35);
    V.slow = (V.slow || 0) + (v - (V.slow || 0)) * Math.min(1, dt * 3);
    // Tiếng mới: biên độ vọt lên so với mức chung, hoặc cất tiếng sau lúc im
    f.onset = false;
    if (V.fast < 0.12) V.armed = true;
    const jump = V.fast - V.slow;
    if ((V.armed && V.fast > 0.3) || (jump > 0.16 && now - (V.lastOnset || 0) > 0.12)) {
      f.onset = true; V.armed = false; V.lastOnset = now; V.ph = 0; V.pulse = 0.4;
      V.rate = (SYL[S.sp] || 9) * rand(0.8, 1.25);
    }
    // Mỏ mở – khép theo nhịp âm tiết kể cả khi tiếng kéo dài ở mức cao; không há suốt cả câu
    V.ph = (V.ph || 0) + dt * (V.rate || 9);
    V.pulse = (V.pulse || 0) * Math.exp(-dt * 12);
    const gate = Math.pow(0.5 + 0.5 * Math.cos(V.ph * Math.PI * 2), 0.7);
    const beak = fake ? V.fast : V.fast * (0.15 + 0.7 * gate) + V.pulse * V.fast;
    V.level = clamp01(beak);
    f.voice = V.level;
    f.throat = clamp01(V.slow * 1.15);
    f.sing = sing;
  }

  fakeVoice(dt, R) {
    const F = this.fake;
    F.t += dt;
    if (F.t >= F.d) {
      F.t = 0;
      if (F.on) {
        F.on = false;
        F.n--;
        F.d = F.n > 0 ? rand(...R[1]) : rand(...R[3]);
      } else {
        if (F.n <= 0) F.n = Math.round(rand(...R[2]));
        F.on = true; F.d = rand(...R[0]); F.amp = rand(0.6, 1);
      }
    }
    return F.on ? F.amp * Math.pow(Math.sin((Math.PI * F.t) / F.d), 0.6) : 0;
  }

  /**
   * Ánh sáng môi trường (IBL): chụp cubemap cảnh thật từ chỗ treo lồng (thấy mái, cột, sân, trời) rồi lọc PMREM,
   * nên sứ, nước, lông chim phản chiếu đúng nơi đang treo và dưới mái không bị ánh trời xanh hắt lên.
   * Chỉ chụp lại khi giờ lệch 5 phút, đổi mưa/tạnh, hoặc lồng đã dời xong sang chỗ mới.
   */
  updateEnv(hour, rain, pos, settled) {
    const key = `${Math.round(hour * 12)}${rain ? 'r' : ''}${pos}`;
    if (!settled || key === this.envKey) return;
    this.envKey = key;
    if (!this.cubeCam) {
      this.cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
      this.cubeCam = new THREE.CubeCamera(0.05, 150, this.cubeRT);
      this.pmrem = new THREE.PMREMGenerator(this.renderer);
    }
    this.cageWorld(this.cubeCam.position);
    this.stand.group.visible = false; // không chụp nan lồng che kín bốn phía
    this.cubeCam.update(this.renderer, this.scene);
    this.stand.group.visible = true;
    this.envRT = this.pmrem.fromCubemap(this.cubeRT.texture, this.envRT);
    this.scene.environment = this.envRT.texture;
  }

  /** Lồng đung đưa: lò xo tắt dần, gió thổi ngoài trời, chim đáp xuống cầu. */
  updateSwing(dt, S, wind) {
    const w = this.swing;
    if (this.reduceMotion) { this.cagePivot.rotation.set(0, 0, 0); return; }
    const outdoor = S && (S.pos === 'san' || S.pos === 'hien') ? 1 : 0.15;
    const force = wind * outdoor * 0.02 * (Math.sin(this.now * 1.3) + 0.6 * Math.sin(this.now * 2.9 + 1));
    if (this.bird.imp.land > 0.95) { w.vz += (Math.random() - 0.5) * 0.06; w.vx += (Math.random() - 0.5) * 0.04; }
    w.vx += (-w.x * 9 + force * 0.6 - w.vx * 1.6) * dt;
    w.vz += (-w.z * 9 + force - w.vz * 1.6) * dt;
    w.x += w.vx * dt; w.z += w.vz * dt;
    this.cagePivot.rotation.set(w.x, 0, w.z);
  }

  updateNotes(dt, f) {
    this.noteGap -= dt;
    if (f.sing && f.onset && this.noteGap <= 0 && !this.reduceMotion) {
      this.noteGap = 0.28;
      const n = this.notes.find((s) => !s.visible);
      if (n) {
        this.bird.beakWorld(n.position);
        n.position.y += 0.04; n.userData.life = 1.6; n.userData.vx = (Math.random() - 0.3) * 0.05; n.visible = true;
        n.material.rotation = (Math.random() - 0.5) * 0.5;
      }
    }
    for (const n of this.notes) {
      if (!n.visible) continue;
      n.userData.life -= dt;
      n.position.y += dt * 0.09; n.position.x += dt * n.userData.vx;
      n.material.opacity = Math.min(1, n.userData.life / 1.6 * 1.5);
      if (n.userData.life <= 0) n.visible = false;
    }
  }

  /** Giọt nước: mưa phun khi tắm, văng ra khi chim rũ mình, bắn mạnh lúc vừa cho tắm. */
  updateDrops(dt, f) {
    const pos = this.drops.geometry.attributes.position, vel = this.dropVel, life = this.dropLife;
    const p = this.bird.group.position;
    const col = this.drops.geometry.attributes.color;
    let emit = 0, dust = 0;
    if (f.bathing) emit += dt * 35;
    if (this.bird.splash > 0) emit += dt * 110 * this.bird.splash;
    if (this.bird.dust > 0) dust = dt * 45 * this.bird.dust; // bụi lông bay ra khi rũ mình lúc khô
    if (this.splashBurst) { emit += this.splashBurst; this.splashBurst = 0; }
    if (this.reduceMotion) { emit = 0; dust = 0; }
    this.dropNext += emit + dust;
    const dustShare = dust / Math.max(1e-6, emit + dust);
    for (let i = 0; i < pos.count && this.dropNext >= 1; i++) {
      if (life[i] > 0) continue;
      this.dropNext--;
      const a = Math.random() * Math.PI * 2, isDust = Math.random() < dustShare, out = isDust || Math.random() < 0.65;
      life[i] = rand(0.5, 1.1);
      if (isDust) col.setXYZ(i, 0.82, 0.76, 0.64); else col.setXYZ(i, 0.78, 0.9, 0.98);
      if (isDust) {
        pos.setXYZ(i, p.x + Math.cos(a) * 0.03, p.y + 0.05 + Math.random() * 0.05, p.z + Math.sin(a) * 0.03);
        vel[i * 3] = Math.cos(a) * rand(0.05, 0.2); vel[i * 3 + 1] = rand(0.05, 0.25); vel[i * 3 + 2] = Math.sin(a) * rand(0.05, 0.2);
        life[i] = rand(0.6, 1.2);
      } else if (out) { // văng ra từ thân chim
        pos.setXYZ(i, p.x + Math.cos(a) * 0.02, p.y + 0.06 + Math.random() * 0.03, p.z + Math.sin(a) * 0.02);
        vel[i * 3] = Math.cos(a) * rand(0.25, 0.6); vel[i * 3 + 1] = rand(0.2, 0.7); vel[i * 3 + 2] = Math.sin(a) * rand(0.25, 0.6);
      } else { // nước phun từ trên xuống
        pos.setXYZ(i, p.x + (Math.random() - 0.5) * 0.16, p.y + 0.18 + Math.random() * 0.05, p.z + (Math.random() - 0.5) * 0.16);
        vel[i * 3] = 0; vel[i * 3 + 1] = -rand(0.2, 0.5); vel[i * 3 + 2] = 0;
      }
    }
    this.dropNext = Math.min(this.dropNext, 5);
    let any = false;
    const R2 = (CAGE.R - 0.005) ** 2;
    for (let i = 0; i < pos.count; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      vel[i * 3 + 1] -= 2.2 * dt;
      let x = pos.getX(i) + vel[i * 3] * dt, y = pos.getY(i) + vel[i * 3 + 1] * dt, z = pos.getZ(i) + vel[i * 3 + 2] * dt;
      if (x * x + z * z > R2) { vel[i * 3] *= -0.3; vel[i * 3 + 2] *= -0.3; x = pos.getX(i); z = pos.getZ(i); } // chạm nan
      if (y < 0.006 || life[i] <= 0) { life[i] = 0; y = -9; } else any = true;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    this.drops.visible = any;
  }

  /** Bóng tiếp xúc dưới chim; lông rời rơi lả tả xuống sàn lồng. */
  updateGround(dt, f) {
    const b = this.bird, p = b.group.position;
    const h = Math.max(0, p.y);
    const sz = 0.09 * (b.model?.size || 1) * (1 + h * 2.5);
    this.blob.position.set(p.x + 0.004, 0.0045, p.z);
    this.blob.scale.set(sz * 1.3, 1, sz);
    this.blob.material.opacity = 0.75 * (1 - Math.min(1, h / 0.4)) * (this.cage.coverAmt > 0.9 ? 0.3 : 1);
    if (b.loose) {
      b.loose = 0;
      if (!this.reduceMotion) {
        let m = this.loose.find((x) => !x.visible);
        if (!m && this.loose.length < 4) { m = b.looseFeather(); this.cage.group.add(m); this.loose.push(m); }
        if (m) {
          b.plumeColor(m.material.color);
          m.position.set(p.x, p.y + 0.06, p.z); m.visible = true;
          m.userData = { t: 0, rest: rand(3, 6), ph: Math.random() * 6, vx: rand(-0.03, 0.03), vz: rand(-0.03, 0.03) };
        }
      }
    }
    for (const m of this.loose) {
      if (!m.visible) continue;
      const u = m.userData;
      u.t += dt;
      if (m.position.y > 0.008) { // rơi chao lượn như chiếc lông thật
        m.position.y -= dt * 0.07;
        m.position.x += (u.vx + Math.sin(u.t * 3 + u.ph) * 0.05) * dt;
        m.position.z += (u.vz + Math.cos(u.t * 2.3 + u.ph) * 0.04) * dt;
        m.rotation.set(Math.sin(u.t * 3 + u.ph) * 0.6, u.t * 1.5, Math.cos(u.t * 2.5) * 0.4);
        const r = Math.hypot(m.position.x, m.position.z), lim = CAGE.R - 0.02;
        if (r > lim) { m.position.x *= lim / r; m.position.z *= lim / r; }
      } else { m.position.y = 0.006; m.rotation.x = 0; m.rotation.z = 0; u.rest -= dt; if (u.rest <= 0) m.visible = false; }
    }
  }

  updateSmoke(dt, S) {
    const h = this.tNow(S) / 60;
    const incense = h >= 17 && h < 19.5;
    const cooking = (h >= 10.6 && h < 11.6) || (h >= 17 && h < 18.5);
    const sources = [];
    if (incense) sources.push(this.house.smokeAnchor);
    if (cooking) sources.push(this.house.panPos);
    for (const m of this.smoke) {
      if (!m.visible && sources.length && Math.random() < dt * 3) {
        const src = sources[Math.floor(Math.random() * sources.length)];
        m.position.copy(src); m.userData.life = 2.5; m.scale.setScalar(0.3); m.visible = true;
      }
      if (!m.visible) continue;
      m.userData.life -= dt;
      m.position.y += dt * 0.25; m.position.x += dt * 0.05;
      m.scale.multiplyScalar(1 + dt * 0.5);
      m.material.opacity = 0.25 * Math.max(0, m.userData.life / 2.5);
      if (m.userData.life <= 0) m.visible = false;
    }
  }

  /** fn() -> 0..1: biên độ tiếng hót/tiếng gọi đang phát (từ SoundEngine) để mỏ, họng chim khớp tiếng. */
  setVoice(fn) { this.voice = fn; }

  /** Phản hồi hoạt ảnh khi người chơi vừa làm hành động `id` (hoặc 'event:<id>'). */
  onAct(id, payload) {
    const S = this.S, b = this.bird;
    if (!S || !b.parts) return;
    const ev = id.startsWith('event:') ? id.slice(6) : null;
    if (ev === 'meo') { b.react('panic'); return; } // mèo rình: hoảng cả khi trùm áo
    if (ev === 'gio') { this.gust = 1; if (!S.covered) b.react('grip'); return; }
    if (id === 'cover') { b.react(S.covered ? 'settle' : 'wake'); return; }
    if (S.covered) return;
    const nervous = S.newDays > 0 || S.mood < 35;
    switch (id) {
      case 'staple': b.react('food'); break;
      case 'fresh': b.react('fresh'); break;
      case 'water': b.react('water'); break;
      case 'clean': b.react('startle'); break;
      case 'bath': this.splashBurst = 70; b.react('shake'); break;
      case 'talk': case 'tutor': b.react(nervous ? 'cower' : 'attend'); break;
      case 'look': b.react(nervous ? 'alert' : 'curious'); break;
      case 'sun': case 'move': b.react('grip'); break;
      case 'vet': b.react('shake'); break;
      default:
        if (ev) b.react(QUIET_EVENTS.has(ev) ? 'alert' : 'startle');
    }
  }

  /** Tọa độ màn hình của đầu chim (cho bong bóng lời). */
  /** fn() -> phút trong ngày của đồng hồ nghe chim, hoặc null khi đang chơi bình thường (dùng giờ game). */
  setClock(fn) { this.clockFn = fn; }
  tNow(S) { return this.clockFn?.() ?? S.t; }

  /** fn() -> true khi chim đang trong hiệp hót do SoundEngine tự lên lịch (chế độ nghe chim). */
  setSinging(fn) { this.singing = fn; }

  /** Vị trí trên màn hình của vật chạm được trong lồng ('staple' | 'water' | 'clean' | 'cover' | 'look'), null nếu đang khuất. */
  pickScreen(id) {
    if (id === 'look') { const p = this.headScreen(); return p.visible ? p : null; }
    const o = this.cage.picks.find((m) => m.userData.pick === id && visibleChain(m));
    if (!o) return null;
    const v = o.getWorldPosition(new THREE.Vector3()).project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return null;
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, visible: true };
  }

  headScreen() {
    const v = this.bird.headWorld(new THREE.Vector3());
    v.y += 0.06;
    v.project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, visible: v.z < 1 };
  }
}

function visibleChain(o) {
  while (o) { if (!o.visible) return false; o = o.parent; }
  return true;
}
