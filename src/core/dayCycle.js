import { STAPLES } from '../data/foods.js';
import { LOCATIONS } from '../data/locations.js';
import { WEATHER, rollWeather, monthOf, weatherName, sunWindow } from '../data/weather.js';
import { SONG_LEVELS, songLevel } from '../data/song.js';
import { stageOf, isYoung, moltDays } from '../data/stages.js';
import { DAY_START, LATE_SLEEP, TOTAL_DAYS } from '../config.js';
import { feederAcceptance } from './simulation.js';
import { newToday } from './state.js';
import { clamp } from './util.js';
import { scheduleDay } from './householdEvents.js';
import { nightIllness, sickPhase } from './illness.js';

/** Khung nắng tốt bằng chữ, ví dụ "6:00–9:30". */
export const sunText = (W) => sunWindow(W).map((h) => `${Math.floor(h)}:${h % 1 ? '30' : '00'}`).join('–');

/** Chấm điểm một ngày và áp dụng hệ quả qua đêm. Trả về báo cáo. */
export function endDay(S, ctx, forced) {
  const { sp, rng } = ctx;
  const T = S.today;
  const W = WEATHER[S.weather];
  const items = [];
  const add = (ok, label, note) => items.push({ ok, label, note });

  if (forced) { S.mood -= 10; add(false, 'Cho chim ngủ đúng giờ', 'Chim cần khoảng 10–12 tiếng yên tối mỗi đêm. Trùm áo lồng lúc chập tối, để nơi yên tĩnh.'); }
  else if (S.t > LATE_SLEEP) { S.mood -= 4; add(false, 'Ngủ hơi muộn', 'Nên trùm áo lồng cho chim ngủ trước khoảng 20 giờ để chim ngủ đủ 10–12 tiếng.'); }

  const avg = T.staple ? T.stapleW / T.staple : 0;
  const best = STAPLES[sp.best].name.toLowerCase();
  if (T.staple < 5) {
    const wrong = S.feeder.type && sp.staple[S.feeder.type] === 0;
    add(false, 'Thức ăn chính', wrong ? `Chim không ăn ${STAPLES[S.feeder.type].name.toLowerCase()}. Hãy dùng ${best}.` : 'Máng trống gần cả ngày. Luôn giữ máng có thức ăn chính.');
    S.health -= 6; S.vigor -= 6;
  } else if (avg < 0.8) {
    add(false, 'Thức ăn chính chưa tối ưu', `Hợp nhất với ${sp.short} là ${best}.${S.sp === 'yenphung' && S.feeder.type === 'ke' ? ' Chế độ chỉ ăn hạt dễ gây béo phì, thiếu chất; hãy trộn dần sang thức ăn viên.' : ''}`);
    S.vigor -= 4; S.feather -= 2;
  } else if (!T.refill) {
    add(false, 'Chưa thay thức ăn mới', 'Cám để qua ngày dễ ẩm mốc, chim ăn dễ đau bụng: đổ cám mới mỗi ngày.'); S.risk.tieu_chay += 10;
  } else add(true, 'Thức ăn chính đúng loài', STAPLES[sp.best].name);

  if (sp.needs.fresh) {
    if (T.fresh > 0) add(true, 'Có trái cây, rau tươi', 'Bổ sung vitamin, giúp chim khỏe và lên màu.');
    else { add(false, 'Thiếu trái cây, rau tươi', `${sp.name} cần đồ tươi hằng ngày.`); S.vigor -= 6; S.feather -= 2; }
  }
  if (isYoung(S)) {
    if (T.protein >= 2) add(true, 'Chim non được ăn mồi mềm nhiều bữa', 'Đạm dễ tiêu giúp chim chuyền lớn nhanh, thay lông đầu đẹp.');
    else { add(false, 'Chim non thiếu mồi mềm', 'Chim chuyền đang lớn cần ít nhất 2 bữa mồi mềm mỗi ngày (trứng, mồi nhỏ hợp loài).'); S.vigor -= 6; S.feather -= 3; }
  } else if (sp.needs.protein) {
    // Mồi tươi vài lần mỗi tuần là đủ (cám chuyên dụng đã có đạm); chim đang căng lửa thì bớt mồi là đúng
    if (T.protein > 0) add(true, 'Có mồi tươi giàu đạm', 'Côn trùng, trứng giúp chim sung và lông đẹp.');
    else if (S.vigor > 85) add(null, 'Bớt mồi để hạ lửa', 'Chim đang căng lửa: nghỉ mồi tươi một hôm giúp chim không bị quá lửa.');
    else if (S.day - S.lastProtein >= 3) { add(false, 'Thiếu mồi tươi', `Đã ${S.day - S.lastProtein} ngày chưa có côn trùng hoặc trứng. ${sp.name} cần mồi tươi vài lần mỗi tuần.`); S.vigor -= 8; S.feather -= 3; }
  }
  if (sp.needs.mineral) {
    if (S.day - S.lastMineral >= 7) { add(false, 'Thiếu khoáng', 'Đã một tuần chưa có xương mực hoặc đá khoáng. Vẹt cần canxi thường xuyên.'); S.health -= 4; }
    else if (T.mineral) add(true, 'Bổ sung khoáng', 'Xương mực giúp vẹt đủ canxi và mài mỏ.');
  }

  if (T.water) add(true, 'Thay nước sạch', 'Nước uống phải thay mỗi ngày.');
  else add(false, 'Chưa thay nước', 'Nước để qua ngày dễ nhiễm khuẩn, gây tiêu chảy.');

  if (T.clean) {
    if (T.dryClean) add(false, 'Dọn lồng chưa an toàn cho người', 'Quét khô làm bụi phân bay lên. Đeo găng, lau ẩm và rửa tay để phòng bệnh sốt vẹt.');
    else add(true, 'Dọn lồng an toàn', 'Lồng sạch, người dọn cũng được bảo vệ.');
  } else add(false, S.cage < 60 ? 'Lồng bẩn' : 'Chưa dọn khay phân', 'Nên dọn khay phân mỗi ngày: phân để lâu sinh rận mạt, vi khuẩn.');

  if (W.rain) add(null, 'Tắm nắng', 'Trời mưa, không phơi nắng. Giữ lồng nơi khô ráo, kín gió.');
  else if (T.sunGood < sp.sun[0]) { add(false, 'Thiếu nắng sớm', `${sp.name} cần khoảng ${sp.sun[0]}–${sp.sun[1]} phút nắng buổi sáng (${sunText(W)} là tốt nhất).`); S.vigor -= 4; S.feather -= 2; }
  else if (T.sunAll > sp.sun[1] + 30) { add(false, 'Phơi nắng quá lâu', 'Phơi quá lâu khiến chim mệt, mất nước.'); S.mood -= 6; }
  else add(true, 'Tắm nắng sáng đủ', `Khoảng ${Math.round(T.sunGood)} phút nắng tốt.`);
  if (T.heat >= 10) add(false, 'Phơi nắng trưa gắt', 'Nắng 11–15 giờ rất dễ gây sốc nhiệt.');

  const bathGap = isYoung(S) ? Math.max(2, sp.bathGap) : sp.bathGap; // chim non tắm thưa hơn
  if (T.lateBath) add(false, 'Tắm muộn', 'Tắm sau 17 giờ, lông không kịp khô trước đêm.');
  else if (T.baths > 0) add(true, 'Tắm nước đúng giờ', 'Tắm đều giúp sạch lông, ít ký sinh.');
  else if (S.day - S.lastBath > bathGap && !W.cold) { // trời mưa lạnh thì hoãn tắm là đúng
    add(false, 'Lâu chưa tắm', `${isYoung(S) ? 'Chim non' : sp.name} nên được tắm ${bathGap === 1 ? 'mỗi ngày' : 'ít nhất mỗi ' + bathGap + ' ngày'} khi trời không lạnh.`);
    S.feather -= 5; S.risk.ran_mat += 20;
  }

  if (T.bad.length) add(false, 'Cho ăn đồ không phù hợp', [...new Set(T.bad)].join(', '));
  if (S.loc === 'bep') add(false, 'Treo lồng gần bếp', 'Khói dầu mỡ và khí từ chảo chống dính quá nhiệt rất nguy hiểm cho chim.');
  if (sp.territorial && T.moves > 0) add(false, 'Đổi chỗ treo lồng', `${sp.name} có tính lãnh thổ, nên giữ vị trí cố định.`);

  if (S.newDays > 0) {
    if (T.talks > 2) { add(false, 'Chim mới bị làm phiền', 'Những ngày đầu nên để chim yên tĩnh, chỉ cho ăn uống và dọn dẹp nhẹ nhàng.'); S.mood -= 8; }
    else add(true, 'Để chim mới làm quen yên tĩnh', 'Đúng cách giúp chim tránh “ngã nước”.');
  } else if (S.sick) {
    if (T.talks <= 1) add(null, 'Để chim bệnh nghỉ ngơi', 'Chim ốm cần yên tĩnh, không luyện giọng, ít làm phiền.');
  } else if (sp.skill === 'song') { // khớp việc "bond" trong goals.js
    if (T.talks > 0 || T.tutor > 0) add(true, 'Gần gũi, luyện giọng', 'Trò chuyện, giọng mồi đều đặn giúp chim dạn người, hót hay hơn.');
    else { add(false, 'Chưa gần gũi chim hôm nay', 'Chim cảnh cần được trò chuyện hoặc nghe giọng mồi mỗi ngày để dạn người, giữ giọng.'); S.mood -= 3; }
  } else if (T.talks > 0) add(true, 'Trò chuyện, dạy nói', 'Lặp lại đều đặn là cách dạy nói hiệu quả.');
  else { add(false, 'Chưa trò chuyện với chim', 'Loài biết nói cần được trò chuyện mỗi ngày để dạn người, học nói.'); S.mood -= 3; }

  nightIllness(S, ctx, add);

  if (S.covered) add(true, 'Trùm áo lồng ban đêm', 'Giúp chim ngủ yên, tránh gió lùa, muỗi và mèo.');
  else {
    S.mood -= 10;
    let n = 'Chim ngủ không yên, dễ bị gió lùa và muỗi đốt.';
    if (W.cold) { S.risk.cam_lanh += 40; n += ' Đêm lạnh còn dễ nhiễm lạnh.'; }
    if (S.loc === 'hien' && rng() < 0.4) { S.mood -= 20; S.trust -= 5; n += ' Đêm qua mèo rình lồng làm chim hoảng loạn đập cánh.'; }
    add(false, 'Không trùm áo lồng ban đêm', n);
  }
  if (S.wet > 0) { S.risk.cam_lanh += 70; add(false, 'Đi ngủ khi lông còn ướt', 'Rất dễ nhiễm lạnh.'); }
  if (S.fresh) {
    S.fresh.spoiled = true; S.cage -= 20; S.risk.tieu_chay += 30;
    add(false, 'Đồ tươi thừa để qua đêm', 'Trái cây, mồi tươi ôi thiu là nguồn vi khuẩn. Dọn sau vài giờ.');
  }
  if (S.feeder.amt > 0) {
    S.feeder.days++;
    if (S.feeder.days >= 2) { S.risk.tieu_chay += 25; add(false, 'Thức ăn để quá lâu', 'Cám, hạt để từ hôm trước dễ ẩm mốc. Thay mới mỗi ngày.'); }
  }
  if (W.humid && !T.refill && S.feeder.amt > 0) {
    S.risk.tieu_chay += 25;
    add(false, 'Cám để qua ngày nồm', 'Trời nồm cám hút ẩm, vón cục, dễ mốc: ngày nồm phải đổ cám mới, đổ vừa đủ ăn, cất bao cám kín.');
  }
  if (S.feeder.mixFrom && S.feeder.mixLeft > 0) {
    S.feeder.mixLeft--;
    if (S.feeder.mixLeft === 0) { ctx.log('good', `Đã chuyển hẳn sang ${STAPLES[S.feeder.type].name.toLowerCase()}.`); S.feeder.mixFrom = null; }
  }

  if (S.molt) {
    let c = 0;
    if (T.baths > 0 && !T.lateBath) c++;
    if (T.sunGood >= sp.sun[0] || W.rain) c++;
    if (T.protein > 0 || T.fresh > 0) c++;
    if (T.moltBad) c -= 1.5;
    S.feather += (c - 1.6) * 4; S.vigor -= 3;
  }
  if (!S.sick && S.hunger > 30 && S.cage > 40) S.health += 4;
  for (const k of ['health', 'mood', 'vigor', 'feather', 'trust']) S[k] = clamp(S[k]);
  if (sp.skill === 'song') growSong(S, ctx);

  const ok = items.filter((i) => i.ok === true).length;
  const no = items.filter((i) => i.ok === false).length;
  const score = Math.round((100 * ok) / Math.max(1, ok + no));
  S.hist.push({ day: S.day, score, health: Math.round(S.health), mood: Math.round(S.mood), feather: Math.round(S.feather) });
  S.newDays = Math.max(0, S.newDays - 1);
  return { day: S.day, items, score, forced, last: S.day >= TOTAL_DAYS };
}

/** Giọng hót tiến bộ mỗi ngày nhờ chim sung, vui, dạn người, hót nhiều và được nghe giọng mồi. */
function songGain(S) {
  const T = S.today;
  if (S.sick && sickPhase(S) !== 'som') return -3;   // ốm thì sa sút giọng (ủ bệnh chưa ảnh hưởng)
  if (S.molt) return 0;    // thay lông: chim nghỉ hót, giọng đứng yên
  const st = stageOf(S);
  const tutor = S.newDays > 0 ? 0 : Math.min(T.tutor, 2) - Math.min(T.tutorOff || 0, 2) * 0.5; // mở sai giờ chỉ được nửa tác dụng
  // Chim non học giọng mồi rất nhanh (giai đoạn nhạy cảm); chim lâu năm giọng đã định, khó đổi
  const g = clamp((S.vigor - 40) / 8, -2, 4) + clamp((S.mood - 50) / 10, -1, 2) + clamp(S.trust / 30, 0, 2)
    + Math.min(T.sang, 8) * 0.5 + tutor * 1.8 * st.tutorK + (T.cafe ? 2 : 0);
  return (g > 0 ? g * st.songK : g) - (S.mix || 0) / 25; // lai giọng kéo giọng xuống
}

function growSong(S, ctx) {
  const lv = songLevel(S.song);
  const cap = stageOf(S).songCap;
  const was = S.song;
  S.song = Math.min(Math.max(cap, was), clamp(S.song + songGain(S)));
  if (was < cap && S.song >= cap) ctx.log('tip', `${S.name} còn non nên giọng chưa “định”: chim chuyền cần khoảng một năm, qua mùa sinh sản đầu mới hót trọn câu như chim trưởng thành.`);
  const now = songLevel(S.song);
  if (now > lv) ctx.log('good', `Giọng hót của ${S.name} lên cấp “${SONG_LEVELS[now].name}”: ${SONG_LEVELS[now].desc.toLowerCase()}`);
  else if (now < lv) ctx.log('warn', `Giọng hót của ${S.name} sa sút, chỉ còn “${SONG_LEVELS[now].name}”. Chim ốm, thiếu chăm sóc thì nản hót.`);
}

export function startDay(S, ctx) {
  const { sp, rng } = ctx;
  S.day++; S.t = DAY_START; S.weather = rollWeather(S.day, rng, S.region, monthOf(S));
  S.today = newToday(); S.pos = S.loc; S.wet = 0;
  if (S.sick) S.sick.dosedToday = false;
  S.singUntil = 0; S.sayUntil = 0; // mốc phút của hôm qua, không để chim "hót" hay bóng chữ sót sang sáng nay
  scheduleDay(S, rng);
  const [mStart, mEnd] = moltDays(S);
  if (S.day === mStart && !S.molt) {
    S.molt = true;
    ctx.log('warn', `${S.name} bắt đầu thay lông (ngoài đời kéo dài 1–2 tháng, thường vào mùa thu). Giai đoạn này chim yếu, hót ít. Tắm nắng sáng, tắm nước đều, dinh dưỡng đủ.${sp.moltAvoid.length ? ' Riêng chào mào nên tránh sâu và chuối.' : ''}`);
  }
  if (S.day === mEnd && S.molt) {
    S.molt = false;
    ctx.log(S.feather >= 75 ? 'good' : 'warn', S.feather >= 75 ? 'Thay lông xong! Bộ lông mới óng mượt nhờ chăm đúng cách.' : 'Thay lông xong nhưng lông mới chưa đẹp. Lần sau chú ý tắm, nắng sớm và dinh dưỡng đầy đủ.');
    if (S.stage === 'chuyen') ctx.log('good', `${S.name} đã khoác bộ lông trưởng thành sau lần thay lông đầu đời. Từ nay trông như chim lớn, dù giọng vẫn còn đang tập.`);
  }
  const W = WEATHER[S.weather];
  const tip = { nong: ' Ngày nóng: chim uống nhiều nước, tránh nắng trưa.', mua: ' Trời mưa lạnh: không tắm muộn, giữ lồng kín gió.',
    ret: ' Rét: phơi nắng khi nắng đã lên (8:00–10:30), che gió hiên, trùm áo sớm.', nom: ' Nồm ẩm: cám dễ mốc, đổ cám mới, dọn đồ tươi sớm.',
    rao: ' Mưa rào: không phơi nắng được, tắm vẫn bình thường.' }[S.weather] || '';
  ctx.log('info', `Trời sáng. ${weatherName(S)} ${W.temp}°C. Mở áo lồng cho chim đón ngày mới.${tip}`);
  if (S.loc === 'bep') ctx.log('warn', `Lồng vẫn đang treo ở ${LOCATIONS.bep.name.toLowerCase()}. Nên chuyển ra hiên hoặc phòng khách.`);
}

export function finalSummary(S, sp) {
  const avg = Math.round(S.hist.reduce((a, b) => a + b.score, 0) / Math.max(1, S.hist.length));
  const title = avg >= 85 ? 'Người nuôi chim tận tâm' : avg >= 70 ? 'Người nuôi chim chu đáo' : avg >= 50 ? 'Người nuôi chim đang học việc' : 'Cần học thêm nhiều';
  const ach = [];
  if (S.sangEver) ach.push(`${S.name} đã cất tiếng hót`);
  if (S.words.length) ach.push(`${S.name} nói được ${S.words.length} câu`);
  if (S.feather >= 75) ach.push('Bộ lông mới óng mượt sau mùa thay lông');
  if (S.trust >= 60) ach.push('Chim dạn và quấn người');
  if (S.ownerRisk === 0) ach.push('Luôn dọn lồng an toàn cho bản thân');
  const lv = sp.skill === 'song' ? songLevel(S.song) : -1;
  if (lv >= 2) ach.push(`Giọng hót đạt cấp “${SONG_LEVELS[lv].name}”`);
  const place = S.contest?.place;
  if (place) ach.push(`Đạt giải ${['nhất', 'nhì', 'ba'][place - 1]} hội thi chim hót`);
  return {
    avg, title, ach, tips: sp.tips.slice(0, 4), hist: S.hist,
    song: lv < 0 ? null : { v: Math.round(S.song), level: lv, name: SONG_LEVELS[lv].name }, // null với loài nói
    contest: S.contest || null,
  };
}

export { feederAcceptance };
