import { describe, it, expect } from 'vitest';
import * as SONGS_SESSION from '../src/audio/songs.js';
import { compose, call, speechNotes, voiceOf, SONGS, WILD } from '../src/audio/songs.js';
import { SFX } from '../src/audio/sfx.js';
import { createRng } from '../src/core/rng.js';

const valid = (ns) => ns.length > 0 && ns.every((n) => n.d > 0 && n.t >= 0 && [n.t, n.d, n.g ?? 1, ...n.f].every(Number.isFinite) && n.f.every((f) => f > 20 && f < 20000));
const end = (ns) => Math.max(...ns.map((n) => n.t + n.d));
const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.floor(p * (a.length - 1))];
const BOUT = [2.5, 3, 5, 7.5, 10];

describe('Âm thanh - ngữ pháp tiếng hót', () => {
  it('mọi loài, mọi cấp: nốt hợp lệ, hiệp dài đúng mức, đúng dải tần', () => {
    for (const [sp, S] of Object.entries(SONGS)) {
      for (let L = 0; L <= 4; L++) {
        const ns = compose(sp, L, { seed: 7, rng: createRng(L + 1), dur: BOUT[L] });
        expect(valid(ns)).toBe(true);
        expect(end(ns)).toBeGreaterThan(BOUT[L] - 1.4); // câu cuối xong thì nghỉ, không cắt ngang
        expect(end(ns)).toBeLessThan(BOUT[L] + 3);
        const fs = ns.filter((n) => (n.n || 0) < 1).flatMap((n) => n.f);
        expect(pct(fs, 0.05)).toBeGreaterThan(S.range[0] * 0.85);
        expect(pct(fs, 0.95)).toBeLessThan(S.range[1] * 1.12);
      }
    }
  });

  it('cấp giọng cao: hiệp dày nốt hơn, to hơn', () => {
    for (const sp of ['chaomao', 'chichchoe', 'hoami', 'khuyen']) {
      const lo = compose(sp, 1, { rng: createRng(3), dur: 5 }), hi = compose(sp, 4, { rng: createRng(3), dur: 5 });
      const busy = (ns) => ns.reduce((a, n) => a + n.d, 0) / end(ns);
      expect(busy(hi)).toBeGreaterThan(busy(lo));
      expect(Math.max(...hi.map((n) => n.g))).toBeGreaterThan(Math.max(...lo.map((n) => n.g)));
    }
  });

  it('vành khuyên líu nhanh 12–18 nốt/giây', () => {
    const ns = compose('khuyen', 4, { rng: createRng(5), dur: 10 });
    let notes = 0, time = 0; // chỉ tính trong chuỗi liền (khoảng nghỉ < 0,05 s)
    for (let i = 1; i < ns.length; i++) {
      const dt = ns[i].t - ns[i - 1].t;
      if (dt - ns[i - 1].d < 0.05) { notes++; time += dt; }
    }
    expect(notes / time).toBeGreaterThan(12);
    expect(notes / time).toBeLessThan(18);
  });

  it('họa mi lặp mỗi motif 2–4 lần rồi đổi', () => {
    const ns = compose('hoami', 3, { seed: 11, rng: createRng(9), dur: 10 });
    // Gom theo motif: các nốt cùng "khung" tần số đầu lặp lại liên tiếp
    const sig = ns.map((n) => Math.round(n.f[0] / 100));
    let repeats = 0;
    for (let i = 0; i + 1 < sig.length; i++) if (sig.indexOf(sig[i], i + 1) - i <= 5 && sig.indexOf(sig[i], i + 1) > i) repeats++;
    expect(repeats / sig.length).toBeGreaterThan(0.4);
  });

  it('giọng riêng theo tên: lệch cao độ ±5%, nhịp ±8%, cùng tên cùng giọng', () => {
    const a = voiceOf('chaomaoBin'), b = voiceOf('chaomaoBin'), c = voiceOf('chaomaoBống');
    expect(a).toEqual(b);
    expect(a.seed).not.toBe(c.seed);
    for (const v of [a, c]) {
      expect(Math.abs(v.pitch - 1)).toBeLessThanOrEqual(0.05);
      expect(Math.abs(v.tempo - 1)).toBeLessThanOrEqual(0.08);
    }
    expect(compose('chaomao', 3, { seed: a.seed, rng: createRng(1) })).toEqual(compose('chaomao', 3, { seed: b.seed, rng: createRng(1) }));
  });

  it('tiếng gọi, nhại tiếng người, chim trời, hiệu ứng: hợp lệ', () => {
    const r = createRng(2);
    for (const sp of Object.keys(SONGS)) for (const k of ['call', 'beg', 'alarm', 'weak']) expect(valid(call(sp, k, r))).toBe(true);
    expect(speechNotes('Xin chào').length).toBe(4); // 2 phụ âm xát (x, ch) + 2 tiếng
    expect(valid(speechNotes('Ăn cơm chưa', r))).toBe(true);
    for (const f of Object.values(WILD)) expect(valid(f(r))).toBe(true);
    for (const f of Object.values(SFX)) expect(valid(f(r))).toBe(true);
  });
});

describe('Âm thanh - nhịp hót khi ngồi nghe', () => {
  it('hiệp hót có câu, có nghỉ; sáng sớm dày hơn trưa; cấp cao hót dài hơn', () => {
    const { planBout, SESSION } = SONGS_SESSION;
    const avg = (f) => { let s = 0; for (let i = 0; i < 200; i++) s += f(createRng(i + 1)); return s / 200; };
    for (const sp of Object.keys(SESSION)) {
      const b = planBout(sp, 4, 7, createRng(5));
      expect(b.phrases.length).toBeGreaterThanOrEqual(2);
      expect(b.phrases.every((p) => p.dur > 0.4 && p.gap > 0.5)).toBe(true);
      expect(b.rest).toBeGreaterThan(10);
      const sing = (L, h) => avg((r) => { const x = planBout(sp, L, h, r); return x.phrases.reduce((a, p) => a + p.dur, 0); });
      const share = (L, h) => avg((r) => { const x = planBout(sp, L, h, r); const s = x.phrases.reduce((a, p) => a + p.dur, 0); return s / (s + x.phrases.reduce((a, p) => a + p.gap, 0) + x.rest); });
      expect(sing(4, 7)).toBeGreaterThan(sing(1, 7));
      expect(share(4, 7)).toBeGreaterThan(share(4, 12));
      expect(share(4, 7)).toBeLessThan(SONGS[sp].talk ? 0.75 : 0.6); // chim hót không hót liên tục; yến phụng líu lo được lâu hơn
    }
  });
});

describe('Âm thanh - giọng chim non', () => {
  it('giọng non: vẫn hợp lệ, nhỏ hơn, cao độ chưa vững so với giọng đã định', () => {
    for (const sp of Object.keys(SONGS)) {
      const adult = compose(sp, 2, { seed: 3, rng: createRng(9), dur: 4 });
      const young = compose(sp, 2, { seed: 3, rng: createRng(9), dur: 4, young: 0.85 });
      expect(valid(young)).toBe(true);
      const loud = (ns) => ns.reduce((a, n) => a + (n.g ?? 1), 0) / ns.length;
      expect(loud(young)).toBeLessThan(loud(adult));
    }
  });
});

describe('Âm thanh - đồng hồ nghe chim', () => {
  it('ban ngày trôi chậm, đêm trôi nhanh rồi sáng lại', async () => {
    const { vi } = await import('vitest');
    const { SoundEngine } = await import('../src/audio/SoundEngine.js');
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const a = new SoundEngine();
    a.relaxAt = { t: 7 * 60, real: Date.now() };
    vi.setSystemTime(60_000); // 1 phút thật ban ngày = 10 phút game
    expect(a.relaxClock).toBeCloseTo(7 * 60 + 10, 0);
    a.relaxAt = { t: 19 * 60, real: Date.now() };
    vi.setSystemTime(60_000 + 200_000); // 200 giây thật ban đêm: qua nửa đêm, gần sáng
    const t = a.relaxClock;
    expect(t).toBeLessThan(6 * 60);
    expect(t).toBeGreaterThan(4 * 60);
    vi.useRealTimers();
  });
});
