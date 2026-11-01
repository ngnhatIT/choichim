import * as THREE from 'three';
import { SPECIES } from '../data/species.js';
import { Bird } from './Bird.js';

const W = 184, H = 144;

/** Chụp ảnh 3D của từng loài chim (nền trong suốt, góc 3/4, đậu trên cành) cho màn hình chọn chim. */
export function renderBirdThumbnails() {
  const out = {};
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(2);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  // Ánh sáng studio: đèn chính ấm, đèn hắt viền lạnh phía sau, trời đất dịu
  scene.add(new THREE.HemisphereLight('#FFF6E8', '#7A6248', 1.25));
  const key = new THREE.DirectionalLight('#FFEBD0', 2.6); key.position.set(0.6, 1.2, 1.4); scene.add(key);
  const rim = new THREE.DirectionalLight('#CFE2FF', 2.2); rim.position.set(-1.2, 0.8, -1.4); scene.add(rim);
  const fill = new THREE.DirectionalLight('#FFFFFF', 0.5); fill.position.set(-1, 0.2, 1); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(28, W / H, 0.01, 10);

  // Cành đậu hơi cong, có mấu
  const twig = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, -0.02, -0.03), new THREE.Vector3(-0.06, -0.006, -0.004), new THREE.Vector3(0.05, -0.0045, 0.006), new THREE.Vector3(0.2, -0.016, 0.03)]), 24, 0.0055, 8),
    new THREE.MeshStandardMaterial({ color: '#7A5230', roughness: 0.85 }),
  );
  scene.add(twig);

  const box = new THREE.Box3(), size = new THREE.Vector3(), center = new THREE.Vector3();
  const pose = { hYaw: 0.45, hPitch: 0.08, hRoll: 0.08, crest: 1, eyes: 1 };
  for (const [k, sp] of Object.entries(SPECIES)) {
    const bird = new Bird();
    bird.build(sp.model, k);
    Object.assign(bird.pose, pose);
    bird.applyPose(bird.pose, bird.osc);
    bird.group.rotation.y = -0.55; // quay 3/4 về phía máy ảnh
    scene.add(bird.group);
    bird.group.updateMatrixWorld(true);
    box.setFromObject(bird.group);
    box.getSize(size); box.getCenter(center);
    // Lùi máy ảnh cho chim vừa khung, chừa lề
    const fit = Math.max(size.y / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), size.x / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect)) * 0.47;
    camera.position.set(center.x + fit * 0.18, center.y + fit * 0.22, center.z + fit);
    camera.lookAt(center.x, center.y + size.y * 0.03, center.z);
    renderer.render(scene, camera);
    out[k] = renderer.domElement.toDataURL('image/png');
    scene.remove(bird.group);
    bird.dispose();
  }
  renderer.dispose();
  return out;
}
