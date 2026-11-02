import { DISEASES, RISK_KEYS } from '../data/diseases.js';
import { FOODS } from '../data/foods.js';
import { WEATHER, sunWindow } from '../data/weather.js';
import { songLevel } from '../data/song.js';
import { MIX_DAYS } from '../config.js';
import { stageOf } from '../data/stages.js';
import { clamp, hourOf } from './util.js';

/** Mức chấp nhận thức ăn đang có trong máng (tính cả giai đoạn trộn dần). */
export function feederAcceptance(S, sp) {
  const f = S.feeder;
  if (!f.type) return 0;
  const now = sp.staple[f.type] ?? 0;
  if (f.mixFrom && f.mixLeft > 0) {
    const w = f.mixLeft / MIX_DAYS; // tỉ lệ thức ăn cũ còn trong máng
    return now * (1 - w) + (sp.staple[f.mixFrom] ?? 0) * w;
  }
  return now;
}

export function getSick(S, ctx, key) {
  const d = DISEASES[key];
  S.sick = { type: key, since: S.t };
  S.sickCount++;
  S.risk[key] = 0;
  S.health -= 5;
  ctx.log('bad', `${S.name} có dấu hiệu bệnh: ${d.name}. ${d.sign} Nguyên nhân thường gặp: ${d.cause} Nên đưa đi bác sĩ thú y sớm.`);
}

/** Tiến một phút trong game. Không đụng tới UI. */
export function stepMinute(S, ctx) {
  const { sp, rng } = ctx;
  const W = WEATHER[S.weather];
  const h = hourOf(S.t);
  const T = S.today;
  const inSun = S.pos === 'san';
  const st = stageOf(S);

  // Ăn uống
  S.hunger -= sp.metab * st.metabK * (S.sick ? 0.7 : 1); // chim non đang lớn đói nhanh hơn
  const acc = feederAcceptance(S, sp);
  if (S.hunger < 85 && S.feeder.amt > 0 && acc > 0) {
    const r = S.sick ? 0.5 : 1;
    S.feeder.amt = Math.max(0, S.feeder.amt - 0.22 * r);
    const g = 1.1 * acc * r;
    S.hunger += g; T.staple += g; T.stapleW += g * acc;
  }
  S.water.level = Math.max(0, S.water.level - (W.hot ? 0.12 : 0.07) - (inSun ? 0.04 : 0));
  S.water.clean = Math.max(0, S.water.clean - 0.05 - (S.fresh ? 0.02 : 0));
  S.cage -= 0.045;

  // Đồ tươi để lâu sẽ ôi
  if (S.fresh) {
    S.fresh.age++;
    if (!S.fresh.spoiled && S.fresh.age > (W.hot || W.humid ? 150 : 240)) { // nóng, nồm: đồ tươi mau ôi
      S.fresh.spoiled = true;
      ctx.log('warn', `${FOODS[S.fresh.f].name} để trong lồng đã ôi, ruồi bắt đầu bu. Nên dọn lồng.`);
    }
    if (S.fresh.spoiled) { S.cage -= 0.03; S.risk.tieu_chay += 0.18; }
  }

  // Nắng
  if (inSun) {
    T.sunAll++;
    const [s0, s1] = sunWindow(W); // trời rét: nắng tốt từ 8 giờ, sớm hơn chỉ thêm lạnh
    if (h >= s0 && h < s1) T.sunGood++;
    else if (h >= s1 && (h < 11 || h >= 15)) T.sunGood += 0.5;
    if (W.key === 'ret' && h < 7.5) {
      S.risk.cam_lanh += 0.3;
      if (!T.coldSun) { T.coldSun = true; ctx.log('warn', 'Trời rét, sáng sớm chưa có nắng ấm mà gió lạnh: đợi khoảng 8 giờ nắng lên rồi hẵng mang chim ra.'); }
    }
    if (h >= 11 && h < 15) { T.heat++; S.risk.say_nang += W.hot ? 5 : 3; S.mood -= 0.05; }
    if (T.sunAll > sp.sun[1] + 20) S.mood -= 0.04;
  }

  // Lông ướt sau khi tắm
  if (S.wet > 0) {
    S.wet -= inSun ? 2 : 1;
    if (W.cold) S.risk.cam_lanh += 0.9;
    if (S.covered) S.risk.cam_lanh += 0.6;
    if (h >= 17) S.risk.cam_lanh += 1.2;
  }

  // Ảnh hưởng của vị trí treo lồng
  if (S.pos === 'hien' && W.cold && !S.covered && h >= 17) S.risk.cam_lanh += 0.3;
  if (S.pos === 'phongkhach' && h >= 19 && !S.covered) S.mood -= 0.04;
  if (S.pos === 'bep' && ((h >= 10.5 && h < 12) || (h >= 17 && h < 19))) S.risk.khi_doc += 0.35;

  // Vệ sinh kém sinh nguy cơ bệnh
  if (S.water.clean < 35) S.risk.tieu_chay += (35 - S.water.clean) / 40;
  if (S.cage < 30) S.risk.ran_mat += ((30 - S.cage) / 40) * (W.humid ? 1.5 : 1); // nồm ẩm, mạt sinh sôi nhanh
  if (S.water.level <= 0) {
    if (!S.dryWarned) { S.dryWarned = true; ctx.log('bad', 'Cóng nước đã cạn! Chim nhỏ mất nước rất nhanh, thay nước ngay.'); }
    S.health -= 0.08; S.mood -= 0.08;
    if (W.hot) S.risk.say_nang += 1.2;
  }
  if (S.hunger <= 10) { S.health -= 0.1; S.mood -= 0.05; }

  // Tâm trạng
  if (S.covered && h < 18) {
    if (S.newDays > 0 || (sp.shy && S.trust < 30)) S.mood += 0.035; else S.mood -= 0.03;
  }
  if (S.newDays > 0 && !S.covered) S.mood -= 0.025;
  if (S.newDays > 0 && S.mood < 32) S.risk.nga_nuoc += 0.5;
  S.mood += (55 - S.mood) * 0.0015;

  // Sức khỏe, độ sung
  if (!S.sick && S.hunger > 40 && S.water.level > 0 && S.water.clean > 40 && S.cage > 40) S.health += 0.025;
  if (S.sick) {
    S.health -= DISEASES[S.sick.type].dmg; S.mood -= 0.03; S.vigor -= 0.03;
  }
  if (S.molt) S.vigor -= 0.008 / st.featherMolt; // chim lâu năm thay lông mệt hơn
  else if (!S.sick && S.health > 70 && S.mood > 55 && S.hunger > 40) S.vigor += 0.01 * st.vigorK * (S.vigor > 80 ? 0.25 : 1); // gần đỉnh lên chậm: không ép thì lửa không tự vọt
  // Quá lửa (ép mồi, giọng mồi dồn dập): chim nhảy loạn lồng, căng thẳng, lông mới dễ xoắn
  if (S.vigor > 90) {
    S.mood -= 0.01; S.feather -= 0.003;
    if (!T.overFire) { T.overFire = true; ctx.log('warn', `${S.name} đang quá lửa: nhảy loạn lồng, đập cánh, hót gắt. Nên bớt mồi tươi và giọng mồi vài hôm, cho tắm để hạ lửa.`); }
  }

  // Nguy cơ giảm dần theo thời gian, vượt ngưỡng thì phát bệnh
  for (const k of RISK_KEYS) S.risk[k] *= 0.999;
  if (!S.sick) {
    // Chim non, chim già sức đề kháng kém: phát bệnh ở ngưỡng nguy cơ thấp hơn (chim non đặc biệt sợ lạnh)
    for (const k of RISK_KEYS) if (S.risk[k] * st.riskK * (k === 'cam_lanh' ? st.coldK : 1) >= 100) { getSick(S, ctx, k); break; }
  }

  // Hót: chỉ khi khỏe, sung, vui, dạn người. Giọng càng lên cấp hót càng thường, hiệp càng dài;
  // sáng sớm (6–9 giờ) hót nhiều nhất. Chim mới tập hót (cấp 0–1) dễ cất tiếng hơn một chút.
  if (sp.skill === 'song' && S.t >= S.singUntil && !S.sick && !S.molt && !S.covered && h >= 6 && h < 18 && S.hunger > 30 && S.water.level > 0 && S.newDays === 0) {
    const lv = songLevel(S.song);
    const easy = lv < 2;
    if (S.vigor > (easy ? 54 : 62) && S.mood > (easy ? 52 : 58) && S.health > 70 && S.trust > (easy ? 10 : 22) &&
        rng() < (0.003 + 0.0015 * lv) * (h < 9 ? 2.5 : 1)) {
      S.singUntil = S.t + 3 + 2 * lv;
      T.sang++;
      if (!S.sangEver) {
        S.sangEver = true;
        ctx.log('good', `Lần đầu tiên ${S.name} cất tiếng hót! Chim chỉ hót khi khỏe, no, sung và cảm thấy an toàn.`);
      }
    }
  }
  if (sp.skill === 'talk' && S.words.length && !S.covered && S.mood > 50 && rng() < 0.003) {
    S.say = S.words[Math.floor(rng() * S.words.length)];
    S.sayUntil = S.t + 5;
  }

  for (const k of ['hunger', 'cage', 'health', 'mood', 'vigor', 'trust', 'feather']) S[k] = clamp(S[k]);
  S.t++;
}
