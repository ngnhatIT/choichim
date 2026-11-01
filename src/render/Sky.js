import * as THREE from 'three';

const C = (h) => new THREE.Color(h);

// Bảng màu trời theo giờ: [giờ, đỉnh, chân trời]
const CLEAR = [
  [0, '#0E1730', '#1F2C4D'], [4.8, '#141E3A', '#2E3354'], [5.6, '#3A3F6B', '#D98A78'], [6.3, '#6F8FC0', '#FFC08A'],
  [7.5, '#6FAED6', '#F6DEC0'], [11, '#4E9BD3', '#D6EEF6'], [15, '#5EA2D2', '#E9E2C6'], [17.2, '#6A86B6', '#FFC184'],
  [18, '#4A4F86', '#FF9A5E'], [18.6, '#2C2E60', '#C8605A'], [19.3, '#141D38', '#2C3657'], [24, '#0E1730', '#1F2C4D'],
];
const RAIN = [
  [0, '#0F151E', '#1D2733'], [6, '#56636E', '#8D9AA3'], [12, '#6F7C86', '#AEB8BE'], [17.5, '#4E5964', '#7F8A93'],
  [19, '#141B25', '#26313D'], [24, '#0F151E', '#1D2733'],
];

function sample(table, h) {
  for (let i = 0; i < table.length - 1; i++) {
    const [h0, t0, b0] = table[i], [h1, t1, b1] = table[i + 1];
    if (h >= h0 && h <= h1) {
      const k = (h - h0) / (h1 - h0);
      return [C(t0).lerp(C(t1), k), C(b0).lerp(C(b1), k)];
    }
  }
  return [C(table[0][1]), C(table[0][2])];
}

// Vùng có mái (hiên, trong nhà): mưa không rơi vào
const underRoof = (x, z) => x > -5.5 && x < 7.6 && z > -3 && z < 2.05;

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.uniforms = {
      top: { value: C('#4E9BD3') }, bottom: { value: C('#D6EEF6') },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: C('#FFB070') }, glowK: { value: 0 }, stars: { value: 0 }, time: { value: 0 },
    };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(90, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, uniforms: this.uniforms,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 glow; uniform float glowK; uniform float stars; uniform float time;
varying vec3 vP;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vP);
  float h = clamp(d.y * 1.6 + 0.15, 0.0, 1.0);
  vec3 col = mix(bottom, top, pow(h, 0.8));
  float s = max(dot(d, sunDir), 0.0);
  col += glow * glowK * (pow(s, 6.0) * 0.45 + pow(s, 48.0) * 0.8 + pow(s, 2.0) * 0.25 * (1.0 - h));
  if (stars > 0.0 && d.y > 0.04) {
    float r = hash(floor(d * 520.0));
    float tw = 0.65 + 0.35 * sin(time * 2.3 + r * 60.0);
    col += vec3(step(0.9982, r) * stars * tw * smoothstep(0.04, 0.3, d.y));
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,
      }),
    );
    scene.add(dome);

    this.hemi = new THREE.HemisphereLight('#CFE6FF', '#6B5A3C', 1.0);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#FFF1D6', 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -15; sc.right = 13; sc.top = 10; sc.bottom = -6; sc.near = 1; sc.far = 90;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun); scene.add(this.sun.target);
    this.sun.target.position.set(-1, 0, -1);

    this.moon = new THREE.DirectionalLight('#9DB4FF', 0);
    this.moon.position.set(12, 20, 16);
    scene.add(this.moon);

    this.sunDisk = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), new THREE.MeshBasicMaterial({ color: '#FFE7A8', fog: false }));
    this.moonDisk = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: '#EDE7CF', fog: false }));
    scene.add(this.sunDisk); scene.add(this.moonDisk);

    // Mưa: vệt nước rơi (đoạn thẳng), không rơi dưới mái
    const N = 1600;
    const pos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      let x, z;
      do { x = -16 + Math.random() * 28; z = -4 + Math.random() * 13; } while (underRoof(x, z));
      const y = Math.random() * 10;
      pos.set([x, y, z, x, y + 0.22, z], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#C9D6E3', transparent: true, opacity: 0.38, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);

    // Sương: luôn gắn fog (tránh biên dịch lại shader), chỉ đổi khoảng cách
    this.fog = new THREE.Fog('#AEB8BE', 1000, 2000);
    scene.fog = this.fog;
    this.night = 0;
    this.sunK = 0;
    this.time = 0;
  }

  /** hour: giờ thực (0..24); weather: object WEATHER; wind: 0..1.4 */
  update(hour, weather, dt, wind = 0) {
    this.time += dt;
    const rain = weather.rain;
    const [top, bottom] = sample(rain ? RAIN : CLEAR, hour);
    this.uniforms.top.value.copy(top);
    this.uniforms.bottom.value.copy(bottom);
    this.uniforms.time.value = this.time;

    const rise = 5.6, set = 18.3;
    const p = (hour - rise) / (set - rise);
    const day = p > 0 && p < 1;
    const elev = day ? Math.sin(Math.PI * p) : 0;
    const az = Math.PI * Math.min(1, Math.max(0, p));
    const sunPos = new THREE.Vector3(-Math.cos(az) * 30, Math.max(0.5, elev * 30), 16);
    this.sun.position.copy(sunPos);
    // Nắng sớm, nắng chiều vàng cam đậm; trưa trắng
    const warm = C('#FF9A5A').lerp(C('#FFF4E0'), Math.min(1, elev * 2.2));
    this.sun.color.copy(warm);
    this.sun.intensity = day ? (rain ? 0.45 : 0.4 + 3.2 * Math.min(1, elev * 1.6)) : 0;
    this.sunK = day && !rain ? Math.min(1, elev * 2) : 0;
    this.sunDisk.visible = day && !rain;
    this.sunDisk.position.copy(sunPos).normalize().multiplyScalar(80);
    this.sunDisk.material.color.copy(warm);
    this.uniforms.sunDir.value.copy(sunPos).normalize();
    this.uniforms.glow.value.copy(warm);
    this.uniforms.glowK.value = day && !rain ? 0.35 + 0.9 * (1 - Math.min(1, elev * 3)) : 0;

    const night = day ? Math.max(0, 1 - elev * 6) : 1;
    this.night = night;
    this.uniforms.stars.value = rain ? 0 : Math.max(0, night - 0.5) * 1.6;
    this.moon.intensity = night * (rain ? 0.12 : 0.35);
    this.moonDisk.visible = night > 0.6 && !rain;
    this.moonDisk.position.set(30, 38, -40).normalize().multiplyScalar(80);

    this.hemi.intensity = rain ? 0.55 + 0.4 * (1 - night) : 0.25 + 0.95 * (1 - night);
    this.hemi.color.copy(top).lerp(C('#FFFFFF'), 0.5);
    // Đất hắt ánh ấm lúc bình minh, hoàng hôn
    this.hemi.groundColor.set('#6B5A3C').lerp(C('#8A5A3E'), day ? 1 - Math.min(1, elev * 3) : 0);

    this.rain.visible = rain;
    if (rain) {
      const a = this.rain.geometry.attributes.position;
      const slant = 0.05 + wind * 0.1, fall = dt * 9;
      for (let i = 0; i < a.count; i += 2) {
        let y = a.getY(i) - fall;
        let x = a.getX(i) + fall * slant;
        if (y < 0) { y += 10; x -= 10 * slant; }
        a.setXYZ(i, x, y, a.getZ(i));
        a.setXYZ(i + 1, x - 0.22 * slant, y + 0.22, a.getZ(i));
      }
      a.needsUpdate = true;
      this.fog.color.copy(bottom);
      this.fog.near = 14; this.fog.far = 60;
    } else {
      // Sương sớm nhẹ lúc bình minh
      const mist = Math.max(0, 1 - Math.abs(hour - 6.2) / 1.2);
      this.fog.color.copy(bottom);
      this.fog.near = mist > 0.01 ? 10 + 30 * (1 - mist) : 1000;
      this.fog.far = mist > 0.01 ? 70 + 100 * (1 - mist) : 2000;
    }
  }
}
