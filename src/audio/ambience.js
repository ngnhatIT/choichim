import { WEATHER } from '../data/weather.js';
import { hourOf } from '../core/util.js';
import { noiseBuffer, play } from './synth.js';
import { WILD, R, pick } from './songs.js';

// Đường cổng cho tiếng dế: chỉ phần đỉnh của sóng sin lọt qua, thành từng chuỗi xung
const GATE = Float32Array.from({ length: 256 }, (_, i) => { const x = (i / 255) * 2 - 1; return x > 0.55 ? Math.sqrt((x - 0.55) / 0.45) : 0; });
const OUTSIDE = ['rain', 'wind', 'cicada', 'cricket', 'insect'];

/**
 * Âm thanh môi trường: mưa, gió lạnh, ve sầu trưa nóng, dế và côn trùng đêm, chim trời xa, xèo xèo bếp.
 * Tiếng ngoài trời đi qua bộ lọc: ra sân nghe rõ, ở hiên vừa, trong nhà nghe nghẹt.
 */
export class Ambience {
  constructor(ctx, out, verb) {
    this.ctx = ctx; this.verb = verb; this.next = 0; this.last = {};
    const gain = (v = 0, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
    const filt = (type, f, q = 0.7) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
    const noise = (at) => { const b = ctx.createBufferSource(); b.buffer = noiseBuffer(ctx); b.loop = true; b.start(0, at); return b; };
    const lfo = (param, rate, depth) => { const o = ctx.createOscillator(); o.frequency.value = rate; o.connect(gain(depth, param)); o.start(); };

    this.lp = filt('lowpass', 9000);
    this.bus = gain(1, this.lp); this.lp.connect(out);
    for (const k of OUTSIDE) this[k] = gain(0, this.bus);
    this.sizzle = gain(0, out); // ở ngay bếp, không qua lọc

    // Mưa: rào rào trên lá, ầm ầm trên mái, to nhỏ theo đợt
    const rw = gain(0.8, this.rain);
    noise(0).connect(filt('highpass', 600)).connect(filt('lowpass', 7000)).connect(rw);
    noise(0.5).connect(filt('lowpass', 400)).connect(gain(0.6, rw));
    lfo(rw.gain, 0.13, 0.2);
    // Gió: ồn lọc dải, tần số và độ lớn trôi chậm thành từng cơn
    const wf = filt('bandpass', 500, 1.4), wg = gain(0.6, this.wind);
    noise(1).connect(wf).connect(wg);
    lfo(wf.frequency, 0.07, 250); lfo(wg.gain, 0.11, 0.4);
    // Ve sầu: ồn cao rung nhanh, dâng lên rồi lặng theo đợt
    const c1 = gain(0.5), c2 = gain(0.6, this.cicada);
    noise(1.3).connect(filt('bandpass', 5200, 3)).connect(c1).connect(c2);
    lfo(c1.gain, 47, 0.5); lfo(c2.gain, 0.17, 0.4);
    // Dế: tiếng ri ri quanh 4,5 kHz, mỗi chuỗi 3–4 xung; hai con hai bên
    for (const [f, rate, pan] of [[4400, 1.45, -0.5], [4950, 1.9, 0.55]]) {
      const o = ctx.createOscillator(), pulse = gain(0.5), g = gain(0), sh = ctx.createWaveShaper(), so = ctx.createOscillator(), pn = ctx.createStereoPanner();
      o.frequency.value = f; so.frequency.value = rate; sh.curve = GATE; pn.pan.value = pan;
      o.connect(pulse).connect(g).connect(pn).connect(this.cricket);
      lfo(pulse.gain, 30, 0.5);
      so.connect(sh).connect(g.gain);
      o.start(); so.start();
    }
    // Côn trùng đêm: rỉ rả cao
    const ig = gain(0.6, this.insect);
    noise(0.7).connect(filt('bandpass', 6800, 5)).connect(ig);
    lfo(ig.gain, 9, 0.3);
    // Xèo xèo chảo dầu: ồn cao, lách tách ngẫu nhiên
    const sg = gain(0.3, this.sizzle);
    noise(1.7).connect(filt('highpass', 2800)).connect(sg);
    noise(0.2).connect(filt('lowpass', 25)).connect(gain(8, sg.gain));
  }

  update(S) {
    const now = this.ctx.currentTime, h = hourOf(S.t), W = WEATHER[S.weather] || {}, pos = S.pos;
    const out = pos === 'san' ? 1 : pos === 'hien' ? 0.75 : 0.35; // mức "ngoài trời"
    const night = h >= 18.5 || h < 5.3, cook = (h >= 10.6 && h < 11.6) || (h >= 17 && h < 18.5);
    const set = (k, v, param = this[k].gain) => {
      v = Math.round(v * 1000) / 1000;
      if (this.last[k] !== v) { this.last[k] = v; param.setTargetAtTime(v, now, 1.2); }
    };
    set('lp', pos === 'san' ? 15000 : pos === 'hien' ? 9000 : 1800, this.lp.frequency);
    set('bus', S.over ? 0 : 1);
    set('rain', W.rain ? 0.12 * (0.6 + 0.4 * out) : 0);
    set('wind', (W.cold ? 0.45 : 0.06) * out);
    set('cicada', (W.hot && h >= 9.5 && h < 16.5 ? 0.22 : !W.rain && h >= 11 && h < 14.5 ? 0.05 : 0) * out);
    set('cricket', night ? (W.rain ? 0.03 : 0.09) * (0.5 + 0.5 * out) : 0);
    set('insect', night ? 0.03 * out : 0);
    set('sizzle', cook && !S.over ? (pos === 'bep' ? 0.11 : pos === 'phongkhach' ? 0.02 : 0) : 0);

    // Chim trời xa: rộn nhất lúc sáng sớm, thưa ban ngày, chiều tối có bìm bịp
    if (now < this.next || S.over) return;
    const kinds = h >= 5.3 && h < 9 ? ['se', 'se', 'chaomao', 'chichchoe', 'cugay'] : h >= 9 && h < 16.5 ? ['cugay', 'se', 'chaomao'] : h >= 16.5 && h < 18.6 ? ['bimbip', 'se', 'cugay'] : null;
    this.next = now + (!kinds ? 5 : h < 9 ? R(Math.random, 1.5, 4.5) : R(Math.random, 7, 18));
    if (!kinds) return;
    const c = this.ctx, g = c.createGain(), f = c.createBiquadFilter(), pn = c.createStereoPanner();
    g.gain.value = R(Math.random, 0.06, 0.14) * (W.rain ? 0.4 : 1) * (0.4 + 0.6 * out);
    f.type = 'lowpass'; f.frequency.value = R(Math.random, 2500, 4500); // ở xa: mất tiếng cao
    pn.pan.value = R(Math.random, -0.8, 0.8);
    g.connect(f).connect(pn).connect(this.bus); pn.connect(this.verb);
    const { end } = play(c, g, WILD[pick(Math.random, kinds)](Math.random), now + 0.05, { pitch: R(Math.random, 0.95, 1.05) });
    setTimeout(() => pn.disconnect(), (end - now + 1) * 1000);
  }
}
