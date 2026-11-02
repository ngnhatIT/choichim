import { DISEASES } from '../data/diseases.js';
import { FOODS, STAPLES } from '../data/foods.js';
import { LOCATIONS } from '../data/locations.js';
import { WEATHER } from '../data/weather.js';
import { MIX_DAYS, SLEEP_FROM } from '../config.js';
import { stageOf, isYoung } from '../data/stages.js';
import { fireBand } from '../data/song.js';
import { clamp, hourOf, isNight } from './util.js';
import { catchIllness, prescribe, giveDose, sickPhase } from './illness.js';

/**
 * Mỗi hành động: { blocked(S, sp) -> lý do | null, run(S, ctx, payload) -> số phút tiêu tốn }
 * Các hành động không tự gọi UI; UI thu thập payload (chọn món, chọn cách dọn...) rồi gọi Game.act().
 */
export const ACTIONS = {
  staple: {
    run(S, ctx, { food, mode = 'swap' }) {
      const { sp } = ctx;
      const a = sp.staple[food];
      const prev = S.feeder.type;
      if (prev && prev !== food && S.feeder.amt > 0 && mode === 'mix') {
        S.feeder = { type: food, amt: 100, days: 0, mixFrom: prev, mixLeft: MIX_DAYS };
        ctx.log('good', `Bắt đầu trộn dần ${STAPLES[food].name.toLowerCase()} với thức ăn cũ trong ${MIX_DAYS} ngày. Đây là cách đổi thức ăn an toàn.`);
      } else {
        if (prev && prev !== food && S.feeder.amt > 0) {
          if (sp.foodSensitive) { S.mood -= 12; S.hunger -= 10; ctx.log('bad', `Đổi thức ăn đột ngột khiến ${S.name} bỏ ăn, hoảng. Loài này cần trộn dần cám cũ với cám mới.`); }
          else { S.mood -= 3; ctx.log('warn', 'Đổi hẳn thức ăn một lúc, chim hơi lạ miệng. Lần sau nên trộn dần.'); }
        }
        S.feeder = { type: food, amt: 100, days: 0, mixFrom: null, mixLeft: 0 };
      }
      S.today.refill = true;
      const best = STAPLES[sp.best].name.toLowerCase();
      if (a === 0) ctx.log('bad', `${S.name} không ăn ${STAPLES[food].name.toLowerCase()}. Thức ăn chính phù hợp: ${best}.`);
      else if (a < 0.8) ctx.log('warn', `Chim ăn được ${STAPLES[food].name.toLowerCase()} nhưng chưa tối ưu. Tốt nhất là ${best}.`);
      else ctx.log('good', `Đã đổ ${STAPLES[food].name.toLowerCase()} mới vào máng. Đúng thức ăn chính cho ${sp.short}.`);
      return 5;
    },
  },

  fresh: {
    run(S, ctx, { food }) {
      const { sp } = ctx;
      const F = FOODS[food];
      const T = S.today;
      let [v, note] = sp.food[food];
      const molted = S.molt && sp.moltAvoid.includes(food);
      if (molted) { v = -1; note = `Đang thay lông: không nên cho ${F.name.toLowerCase()}, lông mới dễ quăn, xấu.`; T.moltBad = true; }
      const full = S.hunger > 95;

      if (v === -3) {
        if (!S.sick) catchIllness(S, ctx, 'ngo_doc', 'ro'); // đang ốm thì giữ bệnh cũ để thú y vẫn chữa đúng, ngộ độc trừ máu ngay
        S.health -= 25; T.bad.push(F.name);
        ctx.log('bad', `${F.name}: ${note} ${S.name} có dấu hiệu ngộ độc, cần đưa đi thú y ngay!`);
        return 5;
      }
      if (v === -2) { S.health -= 6; S.risk.tieu_chay += 40; T.bad.push(F.name); ctx.log('bad', `${F.name}: ${note}`); }
      else if (v === -1) { S.hunger += F.fill * 0.5; S.mood += 1; ctx.log('warn', `${F.name}: ${note}`); if (!molted) T.bad.push(F.name); }
      else if (v === 0) { S.hunger += F.fill * 0.3; ctx.log('info', `${F.name}: ${note}`); }
      else {
        S.hunger += F.fill; S.mood += v === 2 ? 6 : 3;
        if (v === 2) { S.vigor += 2; S.trust += 1; }
        if (F.cat === 'fruit') T.fresh++;
        if (F.cat === 'protein' && !(food === 'sauquy' && isYoung(S))) { T.protein++; S.lastProtein = S.day; } // sâu quy không tính là mồi mềm cho chim non
        ctx.log('good', `${F.name}: ${note}`);
      }
      if (F.cat === 'mineral' && v > 0) { S.lastMineral = S.day; T.mineral = true; }
      if (food === 'sauquy') {
        T.sauquy++;
        if (isYoung(S)) { S.feather -= 2; ctx.log('warn', 'Sâu quy vỏ cứng, khó tiêu, không dành cho chim non. Chim chuyền nên ăn lòng đỏ trứng hoặc mồi nhỏ, mềm.'); }
        if (T.sauquy > 1) { S.feather -= 4; ctx.log('warn', 'Sâu quy hôm nay đã quá nhiều. Ăn nhiều sâu quy dễ làm lông khô, xoắn.'); }
      }
      if (full) ctx.log('info', 'Chim đang no, phần lớn đồ ăn sẽ bị bỏ thừa trong lồng.');
      if (['fruit', 'protein', 'junk'].includes(F.cat)) S.fresh = { f: food, age: 0, spoiled: false };
      S.hunger = clamp(S.hunger);
      return 5;
    },
  },

  water: {
    run(S, ctx) {
      S.water.level = 100; S.water.clean = 100; S.today.water = true; S.dryWarned = false;
      S.risk.tieu_chay *= 0.6;
      ctx.log('good', 'Đã rửa cóng và thay nước sạch.');
      return 5;
    },
  },

  clean: {
    run(S, ctx, { method = 'wet' }) {
      const had = S.fresh;
      S.cage = 100; S.fresh = null; S.today.clean = true; S.risk.ran_mat *= 0.5;
      if (S.newDays > 0) S.mood -= 3;
      if (method === 'dry') {
        S.today.dryClean = true; S.ownerRisk++;
        ctx.log('warn', `Đã quét khô khay phân${had ? ', bỏ đồ ăn thừa' : ''}. Nhanh nhưng bụi phân bay lên: vi khuẩn gây bệnh sốt vẹt lây sang người chủ yếu qua đường hít bụi phân khô.`);
        return 5;
      }
      ctx.log('good', `Đã đeo găng, lau ẩm khay phân${had ? ', bỏ đồ ăn thừa' : ''} và rửa tay. An toàn cho cả chim và người.`);
      return 15;
    },
  },

  bath: {
    blocked(S) {
      if (S.covered) return 'Mở áo lồng trước đã.';
      if (hourOf(S.t) >= 19) return 'Trời tối rồi, không cho chim tắm lúc này.';
      return null;
    },
    run(S, ctx) {
      const { sp } = ctx;
      const h = hourOf(S.t);
      const W = WEATHER[S.weather];
      const prevBath = S.lastBath;
      S.today.baths++; S.lastBath = S.day; S.wet = 40; S.bathFx = S.t + 10; S.feather += 3; S.cage -= 4;
      let msg = 'Đã cho chim sang lồng tắm.';
      let type = 'good';
      if (S.newDays === 3) { S.mood -= 10; type = 'warn'; msg += ' Chim mới về còn hoảng, ngày đầu chưa nên tắm.'; }
      else S.mood += 6;
      if (h >= 17) { S.today.lateBath = true; S.risk.cam_lanh += 35; type = 'bad'; msg += ' Tắm chiều muộn rất dễ khiến chim nhiễm lạnh vì lông không kịp khô.'; }
      else if (h < 7) { S.risk.cam_lanh += 10; type = 'warn'; msg += ' Sáng sớm nước còn lạnh, nên đợi nắng lên một chút.'; }
      else if (isYoung(S) && prevBath && S.day - prevBath < 2 && S.today.baths === 1) { S.risk.cam_lanh += 6; type = 'warn'; msg += ' Chim non mới tắm hôm qua: nên cách 2 ngày một lần, tắm dày dễ nhiễm lạnh.'; }
      else if (isYoung(S) && h < 12) { S.risk.cam_lanh += 8; type = 'warn'; msg += ' Chim non sợ lạnh: nên tắm sau 12 giờ khi trời đã ấm, cách 2 ngày một lần.'; }
      if (W.cold) { S.risk.cam_lanh += 15; if (type !== 'bad') type = 'warn'; msg += ' Trời lạnh: chỉ nên tắm nhanh và hong khô kỹ, hoặc bỏ qua hôm nay.'; }
      if (S.today.baths > sp.maxBath) { S.mood -= 4; type = 'warn'; msg += ' Một ngày tắm một lần là đủ.'; }
      if (S.molt) msg += ' Tắm đều giúp lông cũ rụng nhanh, lông mới mọc mượt.';
      if (S.vigor > 80) { S.vigor -= 4; msg += ' Tắm cũng giúp chim đang căng lửa hạ bớt.'; }
      if (type === 'good') msg += ' Sau khi tắm, để chim hong khô ở chỗ thoáng hoặc nắng nhẹ.';
      ctx.log(type, msg);
      return 10;
    },
  },

  sun: {
    blocked(S) {
      if (S.pos === 'san') return null;
      if (S.covered) return 'Mở áo lồng trước khi mang ra nắng.';
      if (WEATHER[S.weather].rain) return 'Trời đang mưa, không có nắng để phơi.';
      const h = hourOf(S.t);
      if (h >= 18 || h < 6) return 'Trời đã tối.';
      return null;
    },
    run(S, ctx) {
      if (S.pos === 'san') {
        S.pos = S.loc;
        ctx.log('info', `Đã mang lồng về ${LOCATIONS[S.loc].name.toLowerCase()}.`);
        return 2;
      }
      S.pos = 'san';
      const h = hourOf(S.t);
      let m = 'Đã mang lồng ra sân phơi nắng.';
      if (h < 9.5) m += ' Nắng sớm là tốt nhất: chim tổng hợp vitamin D, lông mượt.';
      else if (h >= 11 && h < 15) m += ' Đang là nắng trưa gắt: chim dễ bị sốc nhiệt, đừng để lâu.';
      ctx.log(h >= 11 && h < 15 ? 'warn' : 'info', m);
      return 2;
    },
  },

  cover: {
    run(S, ctx) {
      S.covered = !S.covered;
      if (S.covered && S.pos === 'san') S.pos = S.loc;
      ctx.log('info', S.covered ? 'Đã trùm áo lồng.' : 'Đã mở áo lồng.');
      return 1;
    },
  },

  move: {
    run(S, ctx, { loc }) {
      const { sp } = ctx;
      if (loc === S.loc) return 0;
      S.loc = loc; S.pos = loc; S.today.moves++;
      let type = 'info';
      let m = `Đã chuyển chỗ treo lồng tới ${LOCATIONS[loc].name.toLowerCase()}. ${LOCATIONS[loc].desc}`;
      if (sp.territorial) { S.mood -= 10; type = 'warn'; m += ` ${sp.name} có tính lãnh thổ, đổi chỗ treo khiến chim bất an.`; }
      if (loc === 'bep') type = 'warn';
      ctx.log(type, m);
      return 5;
    },
  },

  talk: {
    run(S, ctx) {
      const { sp } = ctx;
      S.today.talks++;
      if (S.newDays > 0) {
        S.mood -= 6; S.trust += 1;
        ctx.log('warn', `${S.name} còn sợ, nép vào góc lồng. Chim mới về nên để yên vài ngày.`);
        return 15;
      }
      if (S.sick) { S.mood -= 2; ctx.log('warn', 'Chim đang mệt, chỉ nên để chim nghỉ ngơi.'); return 15; }
      S.trust += sp.shy ? 2.5 : 4; S.mood += 4;
      let m;
      if (sp.skill === 'song') {
        m = S.molt ? 'Đã trò chuyện nhẹ nhàng. Mùa thay lông không nên luyện giọng nặng.'
          : 'Đã trò chuyện nhẹ nhàng. Chim dạn người hơn; muốn luyện giọng hót, hãy cho nghe giọng mồi.';
      } else if (S.trust >= 35 && S.mood > 50) {
        S.talkProg += (S.sp === 'sao' ? 14 : 11) * stageOf(S).talkK; // chim non bắt chước nhanh nhất
        if (S.talkProg >= 100 && S.words.length < sp.words.length) {
          S.talkProg = 0;
          const w = sp.words[S.words.length];
          S.words.push(w); S.say = w; S.sayUntil = S.t + 20;
          ctx.log('good', `${S.name} vừa nói được: “${w}”! Lặp lại một câu đều đặn mỗi ngày là cách dạy nói hiệu quả.`);
        }
        m = `Đã dạy ${S.name} nói. Tiến độ câu mới: ${Math.min(99, Math.round(S.talkProg))}%.`;
      } else m = 'Đã trò chuyện. Chim cần dạn người hơn (thân thiết từ 35 trở lên) mới bắt đầu học nói.';
      ctx.log('good', m);
      return 15;
    },
  },

  tutor: {
    blocked(S, sp) {
      if (sp.skill !== 'song') return `${sp.name} là loài học nói, không luyện giọng hót. Hãy trò chuyện, dạy nói.`;
      if (S.covered) return 'Mở áo lồng trước khi cho chim nghe giọng mồi.';
      if (hourOf(S.t) >= 19) return 'Trời tối rồi, để chim nghỉ. Giọng mồi nên mở vào buổi sáng.';
      if (S.sick) return 'Chim đang bệnh, cần nghỉ ngơi, chưa luyện giọng được.';
      return null;
    },
    run(S, ctx) {
      const { sp } = ctx;
      const T = S.today;
      T.tutor++;
      if (S.newDays > 0) {
        T.talks++; // chim mới về: tiếng loa lạ cũng là làm phiền
        S.mood -= 6;
        ctx.log('warn', `${S.name} mới về còn sợ, tiếng loa lạ làm chim hoảng, nép vào góc lồng. Đợi chim quen nhà rồi hãy luyện giọng.`);
      } else if (T.tutor > 2) {
        S.mood -= 8; S.vigor -= 2;
        ctx.log('warn', 'Mở giọng mồi quá nhiều khiến chim mệt, căng thẳng; nghe giọng lấn át mãi chim dễ bị “đè lửa”, nản hót. Mỗi ngày chỉ nên 1–2 lần, mỗi lần chừng 20 phút.');
      } else if (S.molt) {
        S.mood -= 2;
        ctx.log('warn', 'Đang thay lông: chim yếu, ít hót, luyện giọng lúc này không có tác dụng mà còn làm chim mệt. Nên cho nghỉ đến khi thay lông xong.');
      } else {
        const h = hourOf(S.t), good = (h >= 6 && h < 7.5) || (h >= 15 && h < 16.5);
        S.vigor += good ? 1.5 : 0.8; S.mood += 1;
        if (S.stage === 'chuyen' && S.mix > 0) S.mix = Math.max(0, S.mix - 4); // nghe giọng chuẩn đều đặn giúp chim tơ bớt lai
        if (!good) T.tutorOff = (T.tutorOff || 0) + 1;
        ctx.log(good ? 'good' : 'tip', `Đã mở giọng mồi (tiếng một con ${sp.short} hót hay) cho ${S.name} nghe chừng 20 phút, loa đặt cách lồng 2–3 m.${good ? ' Đúng giờ chim hay hót nên chim chăm chú lắng nghe; nghe đều mỗi ngày, giọng sẽ tròn và dài hơn.' : ' Người chơi chim thường mở vào sáng sớm (6:00–7:30) hoặc chiều mát (15:00–16:30), lúc chim hăng hót nhất; giờ khác chim nghe kém chú ý hơn.'}`);
      }
      return 20;
    },
  },

  look: {
    run(S, ctx) { ctx.log('info', observe(S, ctx.sp)); return 5; },
  },

  vet: {
    run(S, ctx) {
      if (S.sick) return prescribe(S, ctx);
      ctx.log('info', 'Bác sĩ thú y: chim khỏe, không cần thuốc. Đừng tự cho chim uống kháng sinh khi không có bệnh. Di chuyển nhiều cũng làm chim căng thẳng.');
      S.mood -= 6;
      return 60;
    },
  },

  medicine: {
    blocked(S) { return sickPhase(S) === 'tri' && !S.sick.dosedToday ? null : 'Chim không cần uống thuốc lúc này.'; },
    run(S, ctx) { return giveDose(S, ctx); },
  },

  wait: { run() { return 30; } },

  sleep: {
    blocked(S) { return S.t < SLEEP_FROM ? 'Chỉ cho chim ngủ từ 18:00.' : null; },
    run() { return 0; },
  },
};

export function observe(S, sp) {
  const out = [];
  const ill = sickPhase(S) === 'ro' ? S.sick : null; // ủ bệnh, đang điều trị: chưa (không còn) triệu chứng rõ
  out.push(S.hunger < 25 ? 'Chim đói, mổ máng liên tục.' : S.hunger < 60 ? 'Chim ăn uống bình thường.' : 'Diều căng, chim no.');
  if (S.feeder.type) {
    const a = sp.staple[S.feeder.type];
    if (a === 0) out.push('Cám trong máng gần như còn nguyên: chim không ăn loại này.');
    else if (S.feeder.amt < 15) out.push('Máng sắp hết thức ăn.');
    if (S.feeder.days >= 1) out.push('Thức ăn đã để từ hôm qua, nên thay mới.');
  } else out.push('Máng trống.');
  out.push(S.water.clean < 40 ? 'Nước trong cóng đục, có cặn.' : S.water.level < 20 ? 'Cóng nước gần cạn.' : 'Nước trong.');
  if (ill?.type === 'tieu_chay') out.push('Phân lỏng, nhiều nước.');
  else if (ill) out.push('Phân ít, phần trắng ngả vàng hoặc xanh: dấu hiệu chim ốm, ăn kém.');
  else out.push(S.cage < 40 ? 'Khay phân đầy, có mùi.' : 'Phân khô, có phần trắng và phần đen: tiêu hóa tốt.');
  if (S.molt) out.push('Đang thay lông: nhiều ống lông mới, lông cũ rụng dưới khay.');
  else if (ill?.type === 'ran_mat') out.push('Lông xơ, chim rỉa lông liên tục.');
  else out.push(S.feather > 75 ? 'Lông mượt, ôm sát thân.' : S.feather > 50 ? 'Lông hơi xơ.' : 'Lông xơ xác, kém bóng.');
  out.push(ill ? 'Mắt lim dim, chim đứng xù lông, có lúc ngủ cả hai chân.' : 'Mắt tròn, sáng.');
  if (ill && ['cam_lanh', 'khi_doc', 'say_nang'].includes(ill.type)) out.push('Đứng yên mà đuôi vẫn nhấp theo từng nhịp thở: chim đang khó thở.');
  if (!S.sick && sp.skill === 'song') { const F = fireBand(S.vigor, sp); out.push(`Độ lửa: ${F.name.toLowerCase()}. ${F.sign}`); }
  if (S.mix >= 20) out.push('Giọng có lẫn tiếng tạp: chim non đang "lai giọng". Cho nghe giọng mồi chuẩn, giữ chỗ yên tĩnh.');
  if (sp.skill === 'song' && S.stage === 'chuyen') out.push('Chim non đang tập giọng: hay líu ríu nhỏ trong cổ. Giọng mồi nên mở vừa phải, tránh để chim nghe tạp âm, chim hót dở kẻo "lai giọng".');
  out.push(S.trust > 60 ? 'Chim dạn, đến gần khi bạn lại gần lồng.' : S.trust > 30 ? 'Chim đã bớt sợ người.' : 'Chim còn nhát, hay nép vào góc lồng.');
  if (sickPhase(S) === 'som') out.push(`${DISEASES[S.sick.type].early} Có dấu hiệu sớm của bệnh ${DISEASES[S.sick.type].name.toLowerCase()}. Đưa đi thú y lúc này bệnh nhẹ và mau khỏi hơn.`);
  if (sickPhase(S) === 'tri') out.push(`Đang uống thuốc trị ${DISEASES[S.sick.type].name.toLowerCase()}, còn ${S.sick.dosesLeft} ngày. Giữ chim ấm, yên tĩnh.`);
  const r = S.risk;
  if (r.tieu_chay > 40) out.push('Cảnh báo: vệ sinh thức ăn, nước uống đang kém, dễ sinh bệnh đường ruột.');
  if (r.cam_lanh > 40) out.push('Cảnh báo: chim hơi run, cần giữ ấm, tránh để ướt.');
  if (r.ran_mat > 40) out.push('Cảnh báo: thấy vài con mạt li ti trên khay.');
  if (r.say_nang > 30) out.push('Cảnh báo: chim há mỏ vì nóng.');
  if (r.nga_nuoc > 40) out.push('Cảnh báo: chim hoảng sợ, cần yên tĩnh và áo lồng.');
  if (r.khi_doc > 30) out.push('Cảnh báo: chim thở nhanh, có mùi khói quanh lồng.');
  return 'Quan sát kỹ: ' + out.join(' ');
}

/** Mô tả ngắn hành vi chim hiện tại, hiển thị dưới khung cảnh. */
export function describeSigns(S, sp) {
  const h = hourOf(S.t);
  const ph = sickPhase(S);
  if (ph === 'som') return { text: DISEASES[S.sick.type].early };
  if (ph === 'tri') return { strong: 'Đang điều trị', text: `Còn ${S.sick.dosesLeft} ngày thuốc. Giữ ấm, để chim yên.` };
  if (ph) return { strong: DISEASES[S.sick.type].name, text: DISEASES[S.sick.type].sign };
  if (S.covered && isNight(S.t)) return { text: 'Chim đang ngủ yên trong áo lồng.' };
  if (S.water.level < 5) return { strong: 'Hết nước', text: 'Chim há mỏ, đi quanh cóng tìm nước.' };
  if (S.hunger < 20) return { strong: 'Chim đói', text: 'Mổ máng liên tục, kêu chiêm chiếp.' };
  if (S.pos === 'san' && h >= 11 && h < 15) return { strong: 'Nắng gắt', text: 'Chim há mỏ thở, xòe cánh vì nóng.' };
  if (S.t < S.singUntil) return { text: `${S.name} đang hót líu lo.` };
  if (S.covered) return { text: S.newDays > 0 ? 'Chim mới về đang dần quen trong áo lồng.' : 'Chim yên lặng trong áo lồng, ít vận động.' };
  if (S.molt) return { text: 'Đang thay lông: lông xơ, ít hót, cần được chăm kỹ.' };
  if (S.vigor > 90) return { strong: 'Quá lửa', text: fireBand(S.vigor, sp).sign };
  if (sp.skill === 'song' && S.vigor < 40 && S.newDays === 0) return { strong: 'Xuống lửa', text: fireBand(S.vigor, sp).sign };
  if (S.newDays > 0 || S.mood < 35) return { text: 'Chim còn nhát, đập cánh khi có người lại gần.' };
  if (S.mood > 70) return { text: 'Chim nhảy nhót, chuyền cầu liên tục.' };
  return { text: 'Chim đứng chải lông, thỉnh thoảng nhảy cầu.' };
}
