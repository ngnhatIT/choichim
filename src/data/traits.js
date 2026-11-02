/**
 * Tính cách từng con chim: mỗi con một tính, người chơi chỉ nhận ra dần qua quan sát và chăm sóc.
 * k: hệ số nhân. trustK: thân thiết tăng khi trò chuyện; scareK: tâm trạng mất khi bị làm phiền lúc mới về;
 * newK: nguy cơ ngã nước; metabK: tốc độ đói; likeK: tâm trạng khi được ăn món hợp; vigorK: độ sung tăng; overAt: ngưỡng quá lửa.
 */
export const TRAITS = {
  temper: {
    nhat: { name: 'nhát', tip: 'thân người chậm, dễ hoảng. Nói khẽ, đến gần từ từ, giữ chỗ treo yên tĩnh lâu hơn.', k: { trustK: 0.6, scareK: 1.5, newK: 1.4 } },
    binh: { name: 'không nhát cũng không dạn', tip: 'quen người theo nhịp bình thường.', k: {} },
    dan: { name: 'dạn', tip: 'mau quen người, ít hoảng. Vẫn đừng chọc phá chim mấy ngày đầu.', k: { trustK: 1.4, scareK: 0.6, newK: 0.6 } },
  },
  appetite: {
    ken: { name: 'kén ăn', tip: 'ăn ít, thờ ơ với món lạ. Cho đúng món chim thích, đổi món từ từ.', k: { metabK: 0.9, likeK: 0.5 } },
    binh: { name: 'ăn uống bình thường', tip: 'không kén cũng không tham ăn.', k: {} },
    ham: { name: 'ham ăn', tip: 'đói nhanh, ăn món gì cũng hào hứng. Giữ máng luôn có cám, đừng cho đồ ngọt quá tay.', k: { metabK: 1.15, likeK: 1.3 } },
  },
  fire: {
    cham: { name: 'chậm lửa', tip: 'lâu sung, cần mồi tươi, nắng sớm, giọng mồi đều đặn và kiên nhẫn.', k: { vigorK: 0.7 } },
    binh: { name: 'lửa vừa phải', tip: 'lên lửa theo nhịp chăm bình thường.', k: {} },
    nhanh: { name: 'lên lửa nhanh', tip: 'dễ căng lửa, quá lửa. Bớt mồi, bớt giọng mồi khi thấy chim nhảy loạn; cho tắm để hạ lửa.', k: { vigorK: 1.6, overAt: 85 } },
  },
};
const AXIS_NAME = { temper: 'tính nết', appetite: 'cách ăn', fire: 'độ lửa' };

/** Mỗi trục 25% thấp, 50% bình thường, 25% cao. Loài nói không có trục lửa. Món khoái: một món chim ăn được (v = 1). */
export function rollTraits(rng, sp) {
  const pick = (lo, hi) => { const r = rng(); return r < 0.25 ? lo : r < 0.75 ? 'binh' : hi; };
  const temper = pick('nhat', 'dan'), appetite = pick('ken', 'ham'), fire = pick('cham', 'nhanh');
  const ok = Object.keys(sp.food).filter((f) => sp.food[f][0] === 1);
  const fav = ok.length ? ok[Math.floor(rng() * ok.length)] : null;
  return { temper, appetite, fire: sp.skill === 'song' ? fire : 'binh', fav };
}

/** Tích hệ số `key` của các trục tính cách (không có thì 1). */
export function traitK(S, key) {
  let k = 1;
  for (const axis of ['temper', 'appetite', 'fire']) k *= TRAITS[axis][S.traits?.[axis]]?.k[key] ?? 1;
  return k;
}

export const overFireAt = (S) => TRAITS.fire[S.traits?.fire]?.k.overAt ?? 90;

/** Người chơi nhận ra một trục tính cách (hoặc món khoái): ghi nhật ký cách chăm hợp tính. */
export function revealTrait(S, ctx, axis, foods) {
  if (!S.traits || S.known[axis]) return;
  S.known[axis] = true;
  if (axis === 'fav') {
    ctx.log('tip', `Bạn nhận ra ${S.name} mê ${foods[S.traits.fav].name.toLowerCase()}: thấy món này là sà xuống ăn ngay. Dùng món khoái để thưởng, dỗ chim lúc mệt.`);
    return;
  }
  const T = TRAITS[axis][S.traits[axis]];
  ctx.log('tip', `Bạn nhận ra ${AXIS_NAME[axis]} của ${S.name}: ${T.name}, ${T.tip}`);
}
