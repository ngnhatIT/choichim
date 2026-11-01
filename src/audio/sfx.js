import { R, CHIP, CLICK, SOFT } from './songs.js';

/** Hiệu ứng thao tác, viết thành dãy nốt (định dạng như synth.js) để dùng chung bộ phát. Nhẹ nhàng, ngắn. */
export const SFX = {
  // Đổ cám: một tiếng chạm máng rồi hạt rơi lạo xạo thưa dần
  staple(r) {
    const out = [{ t: 0, d: 0.08, f: [220, 150], n: 1, ft: 'lowpass', g: 0.35 }];
    for (let i = 0, t = 0.02; i < 34; i++) {
      t += R(r, 0.008, 0.03) * (1 + i / 30);
      out.push({ t, d: R(r, 0.004, 0.009), f: [R(r, 2500, 7000)], n: 1, q: 4, e: CLICK, g: R(r, 0.2, 0.6) * (1 - i / 40) });
    }
    return out;
  },
  // Thả đồ tươi: "bộp" nhỏ
  fresh: () => [{ t: 0, d: 0.07, f: [280, 650], e: [0, 1, 0.4, 0], g: 0.45 }, { t: 0, d: 0.04, f: [1200], n: 1, ft: 'lowpass', g: 0.2 }],
  // Thay nước: róc rách và bọt nước
  water(r) {
    const out = [{ t: 0, d: 1.1, f: Array.from({ length: 12 }, () => R(r, 700, 1900)), n: 1, q: 3, e: [0, 0.7, 1, 0.9, 0.95, 0.8, 0.5, 0], g: 0.2 }];
    for (let i = 0; i < 9; i++) out.push({ t: R(r, 0.1, 1), d: R(r, 0.02, 0.04), f: [R(r, 600, 900), R(r, 1300, 2000)], e: CHIP, g: R(r, 0.15, 0.35) });
    return out;
  },
  // Dọn lồng: lau ẩm thì mềm, quét khô thì rào rạo
  clean: (r, dry) => [0, 1, 2, 3].map((i) => ({
    t: i * 0.3 + R(r, 0, 0.05), d: R(r, 0.2, 0.26), f: dry ? [3500, 5000, 3800] : [1500, 2600, 1800],
    n: 1, q: dry ? 0.6 : 1.1, am: dry ? 35 : 0, e: [0, 0.6, 1, 0.8, 0], g: dry ? 0.3 : 0.25,
  })),
  // Tắm: nước bắn, chim vẫy cánh, giọt nước
  bath(r) {
    const out = [{ t: 0, d: 0.35, f: [3000, 900], n: 1, ft: 'lowpass', e: [0, 1, 0.5, 0.2, 0], g: 0.4 }, ...SFX.flutter(r, 0.25)];
    for (let i = 0; i < 6; i++) out.push({ t: R(r, 0.2, 1), d: 0.025, f: [R(r, 1100, 1400), R(r, 2000, 2600)], e: CHIP, g: R(r, 0.1, 0.25) });
    return out;
  },
  // Mang, chuyển lồng: tre cót két, vài bước chân
  carry(r) {
    const creak = (t) => ({ t, d: R(r, 0.25, 0.4), f: [R(r, 170, 220), R(r, 230, 280), R(r, 160, 200)], h: [1, 0.8, 0.7, 0.6, 0.5, 0.4, 0.35, 0.3], fm: [R(r, 22, 32), 25], e: SOFT, g: 0.1 });
    return [creak(0), creak(0.5), ...[0.2, 0.65, 1.1].map((t) => ({ t, d: 0.07, f: [140, 90], n: 1, ft: 'lowpass', e: CHIP, g: 0.3 }))];
  },
  // Áo lồng: sột soạt vải
  cover: (r) => Array.from({ length: 7 }, (_, i) => ({ t: i * 0.08 + R(r, 0, 0.06), d: R(r, 0.06, 0.15), f: [R(r, 1500, 4500)], n: 1, q: 0.8, e: SOFT, g: R(r, 0.12, 0.25) })),
  // Chờ: đồng hồ treo tường tích tắc
  tick: () => [0, 1, 2, 3].map((i) => ({ t: i * 0.5, d: 0.012, f: [i % 2 ? 2000 : 2500], n: 1, q: 8, e: CLICK, g: 0.15 })),
  // Chim đập cánh
  flutter: (r, t = 0) => [{ t, d: R(r, 0.5, 0.7), f: [1100], n: 1, q: 0.8, am: R(r, 17, 21), e: SOFT, g: 0.35 }],
  // Mèo kêu ở xa
  meow: () => [{ t: 0, d: 0.75, f: [460, 720, 690, 430], h: [1, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2], fm: [5, 12], e: [0, 0.5, 1, 0.9, 0.6, 0], g: 0.12 }],
  // Gõ nan lồng tre
  knock: (r) => [0, 1, 2].map((i) => ({ t: i * R(r, 0.15, 0.25), d: 0.03, f: [R(r, 900, 1300)], n: 1, q: 8, e: CLICK, g: 0.45 })),
  // Bass karaoke nhà bên dội sang
  bass: () => Array.from({ length: 6 }, (_, i) => ({ t: i * 0.5, d: 0.2, f: [62, 48], h: [1, 0.3], e: [0, 1, 0.4, 0], g: 0.3 })),
  // Gió giật
  gust: () => [{ t: 0, d: 2.5, f: [300, 900, 600, 350], n: 1, q: 1.2, e: SOFT, g: 0.25 }],
};
