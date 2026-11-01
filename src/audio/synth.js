/**
 * Bộ phát nốt bằng Web Audio, dùng chung cho tiếng hót, tiếng gọi, âm thanh môi trường và hiệu ứng.
 *
 * Một nốt là dữ liệu thuần:
 *   t, d : thời điểm bắt đầu (tính từ đầu dãy) và độ dài, giây
 *   f    : đường tần số (Hz), các điểm trải đều trên d, nội suy mượt
 *   g    : âm lượng 0..1 (mặc định 1);  e: đường biên độ (mặc định ENV), luôn bắt đầu và kết thúc ở 0
 *   h    : họa âm [1, a2, a3, ...] (mặc định huýt thuần)
 *   am   : láy rung, tần số điều biên (Hz);  fm: [tần số, độ sâu Hz] cho tiếng rè hoặc rung giọng
 *   n    : tỉ lệ tiếng ồn 0..1 (1 = chỉ ồn), lọc quanh f với độ hẹp q; ft: kiểu lọc (mặc định 'bandpass')
 */

const ENV = [0, 0.8, 1, 0.92, 0.75, 0.45, 0];
const cache = new WeakMap(); // ctx -> { noise, waves }

function store(ctx) {
  let c = cache.get(ctx);
  if (!c) {
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    cache.set(ctx, (c = { noise: b, waves: new Map() }));
  }
  return c;
}

/** Bộ đệm ồn trắng 2 giây (lặp vòng được). */
export const noiseBuffer = (ctx) => store(ctx).noise;

function wave(ctx, h) {
  const m = store(ctx).waves, k = h.join();
  if (!m.has(k)) {
    const re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1);
    h.forEach((a, i) => { im[i + 1] = a; });
    m.set(k, ctx.createPeriodicWave(re, im));
  }
  return m.get(k);
}

// Nội suy Catmull-Rom các điểm điều khiển thành đường cong mượt (nhân k, kẹp [lo, hi])
function curve(p, k, lo, hi, n = 24) {
  const out = new Float32Array(n), m = p.length - 1;
  for (let i = 0; i < n; i++) {
    const x = m ? (i / (n - 1)) * m : 0, j = Math.min(Math.max(m - 1, 0), Math.floor(x)), u = x - j;
    const p0 = p[Math.max(0, j - 1)], p1 = p[j], p2 = p[Math.min(m, j + 1)], p3 = p[Math.min(m, j + 2)];
    const v = 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
    out[i] = Math.min(hi, Math.max(lo, v * k));
  }
  if (lo === 0) { out[0] = 0; out[n - 1] = 0; } // đường biên độ: chắc chắn mở và tắt từ 0, không lụp bụp
  return out;
}

function lfo(ctx, param, rate, depth, t, d) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = rate; g.gain.value = depth;
  o.connect(g).connect(param);
  o.start(t); o.stop(t + d);
  return o;
}

/**
 * Lên lịch phát `notes` vào nút `out` bắt đầu từ thời điểm t0 (giây của ctx).
 * pitch, tempo: giọng riêng từng cá thể; gain: nhân âm lượng. Trả về { srcs, end } để dừng sớm.
 */
export function play(ctx, out, notes, t0, { pitch = 1, tempo = 1, gain = 1 } = {}) {
  const srcs = [], nyq = ctx.sampleRate / 2 - 500;
  let end = t0;
  for (const s of notes) {
    const t = t0 + s.t / tempo, d = s.d / tempo, nz = s.n || 0;
    const env = ctx.createGain();
    env.gain.setValueCurveAtTime(curve(s.e || ENV, (s.g ?? 1) * gain, 0, 4), t, d);
    env.connect(out);
    let dst = env;
    if (s.am) {
      dst = ctx.createGain(); dst.gain.value = 0.5; dst.connect(env);
      srcs.push(lfo(ctx, dst.gain, s.am, 0.5, t, d));
    }
    const f = curve(s.f, pitch, 20, nyq);
    if (nz < 1) {
      const o = ctx.createOscillator();
      if (s.h?.length > 1) o.setPeriodicWave(wave(ctx, s.h));
      o.frequency.setValueCurveAtTime(f, t, d);
      if (s.fm) srcs.push(lfo(ctx, o.frequency, s.fm[0], s.fm[1] * pitch, t, d));
      if (nz) { const m = ctx.createGain(); m.gain.value = 1 - nz; o.connect(m).connect(dst); } else o.connect(dst);
      o.start(t); o.stop(t + d); srcs.push(o);
    }
    if (nz > 0) {
      const b = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), m = ctx.createGain();
      b.buffer = noiseBuffer(ctx); b.loop = true;
      fl.type = s.ft || 'bandpass';
      const q = fl.type === 'bandpass' ? s.q ?? 5 : 1, fa = (pitch * s.f.reduce((a, x) => a + x, 0)) / s.f.length;
      if (fl.type === 'bandpass') fl.Q.value = q;
      fl.frequency.setValueCurveAtTime(f, t, d);
      // Bù năng lượng bị lọc mất; ồn nghe chói hơn tiếng huýt cùng độ lớn nên để nhỏ hơn chừng 3,5 dB
      m.gain.value = nz * (fl.type === 'highpass' ? 0.8 : Math.min(14, 0.4 * Math.sqrt((1.5 * ctx.sampleRate * q) / fa)));
      b.connect(fl).connect(m).connect(dst);
      b.start(t, Math.random() * 1.5); b.stop(t + d); srcs.push(b);
    }
    if (t + d > end) end = t + d;
  }
  return { srcs, end };
}

/** Đáp ứng xung giả lập phòng: ồn tắt dần, càng về cuối càng tối; taps = [[ms, biên độ]] tiếng dội sớm. */
export function impulse(ctx, sec, decay, bright, taps = []) {
  const sr = ctx.sampleRate, n = Math.floor(sr * sec), b = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let y = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n;
      y += (bright * (1 - x) + 0.04) * (Math.random() * 2 - 1 - y);
      d[i] = y * Math.pow(1 - x, decay);
    }
    for (const [ms, a] of taps) {
      const i = Math.floor((ms * sr) / 1000) + ch * 11;
      if (i < n) d[i] += ch ? -a : a;
    }
  }
  return b;
}
