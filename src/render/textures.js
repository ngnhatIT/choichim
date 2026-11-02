import * as THREE from 'three';

const cache = new Map();

function canvasTexture(key, w, h, draw, repeat = [1, 1]) {
  const k = key + repeat.join('x');
  if (cache.has(k)) return cache.get(k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(k, t);
  return t;
}

function noise(g, w, h, alpha = 0.06, n = 2200) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

/** Gạch bông xi măng: hoa bốn cánh đỏ đất, nhụy xanh rêu, góc ghép thành hoa lớn. */
export function encausticTile(repeat) {
  return canvasTexture('tile', 256, 256, (g, w) => {
    g.fillStyle = '#EAE0CA'; g.fillRect(0, 0, w, w);
    const terracotta = '#B4532E', teal = '#2E6A63', ochre = '#D7A443';
    // góc: phần tư hình tròn ghép thành hoa ở chỗ 4 viên giao nhau
    g.fillStyle = teal;
    for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) { g.beginPath(); g.arc(x, y, 46, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = ochre;
    for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) { g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2); g.fill(); }
    // bốn cánh
    g.fillStyle = terracotta;
    const c = w / 2;
    for (let i = 0; i < 4; i++) {
      g.save(); g.translate(c, c); g.rotate((i * Math.PI) / 2);
      g.beginPath(); g.ellipse(0, -46, 26, 44, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.fillStyle = teal;
    for (let i = 0; i < 4; i++) {
      g.save(); g.translate(c, c); g.rotate((i * Math.PI) / 2 + Math.PI / 4);
      g.beginPath(); g.ellipse(0, -58, 9, 20, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.fillStyle = ochre; g.beginPath(); g.arc(c, c, 18, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#CDBF9F'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, w - 3);
    noise(g, w, w, 0.05);
  }, repeat);
}

export function terracottaFloor(repeat) {
  return canvasTexture('tfloor', 128, 128, (g, w) => {
    g.fillStyle = '#B9643D'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#8E4528'; g.lineWidth = 4; g.strokeRect(0, 0, w, w);
    noise(g, w, w, 0.08);
  }, repeat);
}

/** Ngói âm dương đỏ đất. */
export function roofTiles(repeat) {
  return canvasTexture('roof', 256, 256, (g, w) => {
    g.fillStyle = '#9D4526'; g.fillRect(0, 0, w, w);
    for (let y = 0; y < w; y += 32) {
      for (let x = -16 + ((y / 32) % 2) * 16; x < w + 32; x += 32) {
        const grd = g.createLinearGradient(x, y, x + 32, y);
        grd.addColorStop(0, '#8A3A1F'); grd.addColorStop(0.5, '#C2643A'); grd.addColorStop(1, '#8A3A1F');
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(x, y + 30); g.quadraticCurveTo(x + 16, y - 4, x + 32, y + 30); g.fill();
      }
    }
    noise(g, w, w, 0.06);
  }, repeat);
}

/** Vải áo lồng màu chàm có sọc. */
export function fabric() {
  return canvasTexture('fabric', 128, 128, (g, w) => {
    g.fillStyle = '#25386A'; g.fillRect(0, 0, w, w);
    g.fillStyle = '#34508F';
    for (let y = 0; y < w; y += 16) g.fillRect(0, y, w, 5);
    g.fillStyle = '#B23B2A'; g.fillRect(0, w - 10, w, 6);
    noise(g, w, w, 0.07, 1200);
  }, [6, 2]);
}

export function wood(base = '#6B3A22', repeat = [1, 1]) {
  return canvasTexture('wood' + base, 128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`;
      g.lineWidth = 1 + Math.random() * 2;
      const x = Math.random() * w;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, h * 0.3, x - 6, h * 0.6, x + 3, h); g.stroke();
    }
  }, repeat);
}

/** Tường vôi vàng kiểu nhà cũ. */
export function plaster(base, repeat = [3, 1]) {
  return canvasTexture('plaster' + base, 256, 256, (g, w) => {
    g.fillStyle = base; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(120,80,20,${Math.random() * 0.05})`;
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * w, 10 + Math.random() * 40, 6 + Math.random() * 20, Math.random() * 3, 0, Math.PI * 2); g.fill();
    }
    noise(g, w, w, 0.04);
  }, repeat);
}

/** Vân lông sóng của vẹt yến phụng. */
export function budgieBarring() {
  return canvasTexture('barring', 128, 128, (g, w) => {
    g.fillStyle = '#7CC453'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#1C2A12'; g.lineWidth = 3;
    for (let y = 6; y < w; y += 12) {
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.quadraticCurveTo(x + 8, y - 7, x + 16, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(240,218,69,.35)'; g.fillRect(0, 0, w, w * 0.25);
  }, [1, 1]);
}

export function grass() {
  return canvasTexture('grass', 256, 256, (g, w) => {
    g.fillStyle = '#6C8A45'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = ['#5E7C3B', '#7D9B50', '#6A8642', '#86A55A'][i % 4];
      g.fillRect(Math.random() * w, Math.random() * w, 1.5, 4);
    }
  }, [18, 18]);
}

/** Sân gạch Bát Tràng lát so le, rêu bám mạch. */
export function brickPaving(repeat) {
  return canvasTexture('brick', 256, 256, (g, w) => {
    g.fillStyle = '#6E4A35'; g.fillRect(0, 0, w, w);
    const reds = ['#A8603F', '#9C5536', '#B26C49', '#94503A'];
    for (let y = 0; y < w; y += 32) {
      for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) {
        g.fillStyle = reds[Math.floor(Math.random() * reds.length)];
        g.fillRect(x + 2, y + 2, 60, 28);
      }
    }
    for (let i = 0; i < 160; i++) { // rêu xanh trong mạch gạch
      g.fillStyle = `rgba(70,95,45,${0.15 + Math.random() * 0.25})`;
      g.fillRect(Math.random() * w, Math.floor(Math.random() * 8) * 32, 3 + Math.random() * 8, 2);
    }
    noise(g, w, w, 0.06);
  }, repeat);
}

/** Vách gỗ nhà rường kiểu "thượng song hạ bản": trên chấn song, dưới ván kín. */
export function woodPanel(repeat) {
  return canvasTexture('wpanel', 256, 256, (g, w) => {
    g.fillStyle = '#5A3220'; g.fillRect(0, 0, w, w);
    g.fillStyle = '#6E3E26'; g.fillRect(14, 140, w - 28, 104); // ván dưới
    g.strokeStyle = '#3F2214'; g.lineWidth = 3; g.strokeRect(24, 150, w - 48, 84);
    g.fillStyle = '#24140C'; g.fillRect(14, 14, w - 28, 112); // khoảng tối sau song
    g.fillStyle = '#7A4A2E';
    for (let x = 20; x < w - 14; x += 22) g.fillRect(x, 14, 9, 112);
    g.fillStyle = '#4A2818'; g.fillRect(0, 126, w, 14); g.fillRect(0, 0, w, 14); g.fillRect(0, 244, w, 12);
    noise(g, w, w, 0.05);
  }, repeat);
}

/** Lá cây xén (chè tàu, bụi rậm): xanh đậm lốm đốm. */
export function leafy(base = '#3E6B2F', repeat = [1, 1]) {
  return canvasTexture('leafy' + base, 128, 128, (g, w) => {
    g.fillStyle = base; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = ['rgba(20,40,15,.35)', 'rgba(120,160,70,.35)', 'rgba(60,100,40,.4)'][i % 3];
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * w, 2 + Math.random() * 3, 1.2 + Math.random() * 2, Math.random() * 3, 0, Math.PI * 2); g.fill();
    }
  }, repeat);
}

/** Tàu lá cau: sống lá giữa, lá chét xẻ hai bên (nền trong suốt, dùng alphaTest). */
export function palmFrond() {
  return canvasTexture('frond', 64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#4E6E2A'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
    for (let y = 8; y < h - 10; y += 7) {
      const len = (w / 2 - 2) * Math.sin((y / h) * Math.PI) + 4;
      g.strokeStyle = ['#5F8A33', '#6F9A3C', '#53792C'][(y / 7) % 3 | 0]; g.lineWidth = 3;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + s * len, y + 10); g.stroke(); }
    }
  });
}

/** Lá chuối: phiến lớn, gân song song, mép rách nhẹ (nền trong suốt). */
export function bananaLeaf() {
  return canvasTexture('banana', 128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#6E9E3A';
    g.beginPath(); g.moveTo(w / 2, h);
    g.bezierCurveTo(4, h * 0.75, 2, h * 0.2, w / 2, 0);
    g.bezierCurveTo(w - 2, h * 0.2, w - 4, h * 0.75, w / 2, h); g.fill();
    g.strokeStyle = 'rgba(40,70,20,.35)'; g.lineWidth = 1;
    for (let y = 10; y < h; y += 6) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(4, y - 14); g.moveTo(w / 2, y); g.lineTo(w - 4, y - 14); g.stroke(); }
    g.strokeStyle = '#C9D98A'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 4); g.stroke();
    g.globalCompositeOperation = 'destination-out'; // mép rách do gió
    for (let i = 0; i < 7; i++) { const y = 30 + Math.random() * (h - 60), s = Math.random() < 0.5; g.fillRect(s ? 0 : w / 2 + 6, y, w / 2 - 6, 2); }
    g.globalCompositeOperation = 'source-over';
  });
}

export function noteSprite(symbol) {
  return canvasTexture('note' + symbol, 64, 64, (g, w) => {
    g.font = 'bold 52px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.strokeText(symbol, w / 2, w / 2 + 2);
    g.fillStyle = '#2A2A2A'; g.fillText(symbol, w / 2, w / 2 + 2);
  });
}

/** Chấm sáng tròn mờ dần (đom đóm, bụi nắng). */
export function glowDot() {
  return canvasTexture('glowdot', 64, 64, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}

// ---- Lông chim ----
function plainTexture(key, w, h, draw, srgb = true) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h, c);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/**
 * Một chiếc lông bay/lông đuôi: phiến lông (alpha) có cuống ở giữa và các tơ lông xiên về ngọn.
 * Trục u: gốc (0) → ngọn (1); trục v: ngang phiến lông. Màu trắng xám để nhân với màu vật liệu.
 */
export function featherTexture() {
  return plainTexture('feather', 256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const mid = h / 2;
    // Đường bao phiến lông: hẹp ở gốc, rộng ở 40%, thuôn tròn ở ngọn; phiến trước hẹp hơn phiến sau
    const half = (u, side) => {
      const base = Math.min(1, u / 0.12);
      const tip = u > 0.82 ? Math.sqrt(Math.max(0, 1 - ((u - 0.82) / 0.18) ** 2)) : 1;
      return (h / 2 - 3) * base * tip * (side < 0 ? 0.72 : 1) * (0.88 + 0.12 * Math.sin(Math.PI * u));
    };
    g.beginPath();
    g.moveTo(0, mid);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, mid - half(x / w, -1));
    for (let x = w; x >= 0; x -= 4) g.lineTo(x, mid + half(x / w, 1));
    g.closePath();
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#b8b8b8'); grad.addColorStop(0.2, '#f2f2f2'); grad.addColorStop(1, '#ffffff');
    g.fillStyle = grad; g.fill();
    g.save(); g.clip();
    // Tơ lông xiên
    g.lineWidth = 1;
    for (let x = 6; x < w + 40; x += 3) {
      const a = 0.05 + Math.random() * 0.1;
      g.strokeStyle = `rgba(0,0,0,${a})`;
      g.beginPath(); g.moveTo(x - 26, 0); g.lineTo(x, mid); g.lineTo(x - 26, h); g.stroke();
    }
    // Vài chỗ tơ lông tách ra (khe sáng)
    for (let i = 0; i < 5; i++) {
      const x = 40 + Math.random() * (w - 60), s = Math.random() < 0.5 ? -1 : 1;
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, mid + s * 3); g.lineTo(x - 22, mid + s * (h / 2)); g.stroke();
    }
    // Mép ngọn hơi sẫm
    const eg = g.createLinearGradient(0, 0, w, 0);
    eg.addColorStop(0.75, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = eg; g.fillRect(0, 0, w, h);
    g.restore();
    // Cuống lông
    const sg = g.createLinearGradient(0, 0, w, 0);
    sg.addColorStop(0, 'rgba(255,255,240,0.95)'); sg.addColorStop(1, 'rgba(255,255,240,0.35)');
    g.strokeStyle = sg; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(0, mid); g.quadraticCurveTo(w * 0.5, mid - 1.5, w * 0.98, mid); g.stroke();
  });
}

/**
 * Mật độ lông tơ cho các lớp vỏ (shell): mỗi texel một giá trị ngẫu nhiên, lọc tuyến tính thành
 * các chóp nhọn; lớp càng ngoài chỉ giữ chỗ có giá trị cao nên sợi lông thon dần về ngọn.
 */
export function fuzzTexture() {
  return plainTexture('fuzz', 48, 48, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = Math.random() ** 0.8 * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
}

/** Lớp lông vảy cá phủ thân (màu) và bản đồ pháp tuyến tương ứng. */
export function contourTextures() {
  if (cache.has('contour')) return cache.get('contour');
  const S = 128;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, S, S);
  const R = 13;
  for (let row = -1; row < S / (R * 0.8) + 2; row++) {
    for (let col = -1; col < S / (R * 1.6) + 2; col++) {
      const x = col * R * 1.6 + (row % 2) * R * 0.8, y = row * R * 0.8;
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        const gr = g.createRadialGradient(x + dx, y + dy - R * 0.3, 1, x + dx, y + dy, R);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.75, '#f0f0f0'); gr.addColorStop(1, '#c4c4c4');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x + dx, y + dy, R, 0, Math.PI); g.fill();
      }
    }
  }
  const color = new THREE.CanvasTexture(c);
  color.colorSpace = THREE.SRGBColorSpace; color.wrapS = color.wrapT = THREE.RepeatWrapping;
  // Pháp tuyến suy từ độ sáng (coi như độ cao)
  const src = g.getImageData(0, 0, S, S).data;
  const n = document.createElement('canvas'); n.width = n.height = S;
  const ng = n.getContext('2d'), out = ng.createImageData(S, S);
  const hAt = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * 2.2, dy = (hAt(x, y + 1) - hAt(x, y - 1)) * 2.2;
    const l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  ng.putImageData(out, 0, 0);
  const normal = new THREE.CanvasTexture(n);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  const res = { color, normal };
  cache.set('contour', res);
  return res;
}

/** Vảy sừng trên cẳng và ngón chân. */
export function scaleTexture() {
  return canvasTexture('legscale', 32, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, y, w, 1.5);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      for (let x = (y / 8) % 2 ? 0 : 8; x < w; x += 16) g.fillRect(x, y, 1.2, 8);
    }
  }, [1, 3]);
}

/** Gợn nước: pháp tuyến từ vài sóng sin lệch hướng, số sóng nguyên nên lặp liền mép. */
export function waterNormal() {
  const t = plainTexture('waterN', 128, 128, (g, w, h) => {
    const img = g.createImageData(w, h), T = (Math.PI * 2) / w, k = 0.12;
    const waves = [[1, 2, 0.3], [3, -1, 1.1], [-2, 3, 2.0], [5, 4, 0.7], [-6, 1, 2.6], [7, -5, 4.1]]; // [kx, ky, pha]
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let dx = 0, dy = 0;
      for (const [kx, ky, p] of waves) { const c = Math.cos((kx * x + ky * y) * T + p) / Math.hypot(kx, ky); dx += kx * c * k; dy += ky * c * k; }
      const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

/** Bóng mờ tròn dưới chim. */
export function shadowBlob() {
  return plainTexture('shadowblob', 64, 64, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(0.5, 'rgba(0,0,0,0.25)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}
