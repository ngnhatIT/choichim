import { WEATHER } from '../data/weather.js';
import { SPECIES } from '../data/species.js';
import { SONG_LEVELS, songLevel } from '../data/song.js';
import { ACTIONS } from './actions.js';
import { addMix, moltDays } from '../data/stages.js';

const skill = (S) => SPECIES[S.sp].skill;

/**
 * Sự kiện trong nhà. Mỗi ngày, mỗi sự kiện được tung xúc xắc một lần (chance) và
 * lên lịch vào một phút ngẫu nhiên trong khung giờ [from, to]. Tới giờ, nếu `when` đúng
 * thì game dừng lại và hỏi người chơi.
 */
export const HOUSEHOLD_EVENTS = [
  {
    id: 'nhang', from: 17 * 60, to: 18 * 60 + 30, chance: 0.45,
    when: (S) => S.pos === 'phongkhach',
    title: 'Thắp nhang',
    text: () => 'Nhà chuẩn bị thắp nhang trên bàn thờ, lồng chim treo cách đó vài bước chân.',
    choices: [
      {
        label: 'Mang lồng ra hiên cho thoáng', apply(S, ctx) {
          S.loc = 'hien'; S.pos = 'hien';
          ctx.log('good', 'Đã mang lồng ra hiên. Khói nhang, khói thuốc gây hại cho hệ hô hấp rất nhạy của chim.');
          return 3;
        },
      },
      {
        label: 'Không sao, chỉ một lát', apply(S, ctx) {
          S.risk.khi_doc += 45; S.mood -= 5;
          ctx.log('warn', 'Khói nhang lan quanh lồng. Chim hít khói nhiều ngày liền dễ tổn thương đường hô hấp.');
          return 0;
        },
      },
    ],
  },
  {
    id: 'chao', from: 10 * 60 + 40, to: 11 * 60 + 30, chance: 0.5,
    when: (S) => S.pos === 'bep' || S.pos === 'phongkhach',
    title: 'Chảo bốc khói',
    text: (S) => S.pos === 'bep'
      ? 'Đang chiên cá bằng chảo chống dính, chảo bị đun quá nóng và bắt đầu bốc khói. Lồng chim treo ngay cạnh bếp.'
      : 'Dưới bếp, chảo chống dính bị đun quá nóng và bốc khói. Mùi khói đang lan lên phòng khách.',
    choices: [
      {
        label: 'Tắt bếp, mở cửa, mang lồng ra hiên ngay', apply(S, ctx) {
          S.risk.khi_doc += S.pos === 'bep' ? 25 : 8;
          S.loc = 'hien'; S.pos = 'hien';
          ctx.log('good', 'Xử lý kịp thời. Lớp chống dính PTFE bị quá nhiệt tỏa khí không màu, không mùi, có thể làm chim chết rất nhanh. Nhà nuôi chim nên dùng nồi chảo inox, gang, gốm.');
          return 5;
        },
      },
      {
        label: 'Chiên nốt cho xong', apply(S, ctx) {
          S.risk.khi_doc += S.pos === 'bep' ? 120 : 50;
          ctx.log('bad', 'Khói chảo chống dính bao quanh lồng. Phổi chim trao đổi khí rất hiệu quả nên cũng hấp thụ khí độc nhanh hơn người nhiều lần.');
          return 0;
        },
      },
    ],
  },
  {
    id: 'khach', from: 9 * 60, to: 16 * 60, chance: 0.3,
    when: (S) => !S.covered,
    title: 'Khách đến chơi',
    text: () => 'Khách đến chơi thấy chim dễ thương, cầm miếng bánh quy định đút qua nan lồng.',
    choices: [
      {
        label: 'Cảm ơn, nhưng xin đừng cho chim ăn đồ của người', apply(S, ctx) {
          ctx.log('good', 'Bánh kẹo, đồ ăn của người nhiều đường, muối, chất béo. Chim chỉ nên ăn thức ăn đúng loài.');
          return 2;
        },
      },
      {
        label: 'Cho thử một miếng cũng được', apply(S, ctx) {
          return ACTIONS.fresh.run(S, ctx, { food: 'doman' });
        },
      },
    ],
  },
  {
    id: 'meo', from: 18 * 60, to: 19 * 60 + 30, chance: 0.4,
    when: (S) => (S.pos === 'hien' || S.pos === 'san') && !S.covered,
    title: 'Mèo rình lồng',
    text: () => 'Chập tối, con mèo hàng xóm nhảy lên lan can, chăm chăm nhìn vào lồng chim.',
    choices: [
      {
        label: 'Trùm áo lồng, treo cao lên', apply(S, ctx) {
          S.covered = true; S.pos = S.loc; S.mood -= 3;
          ctx.log('good', 'Đã trùm áo lồng và treo cao. Chim không còn thấy mèo nên bình tĩnh lại.');
          return 3;
        },
      },
      {
        label: 'Đuổi mèo đi rồi để đó', apply(S, ctx) {
          S.mood -= 12; S.trust -= 3; S.risk.nga_nuoc += S.newDays > 0 ? 40 : 10;
          ctx.log('warn', 'Mèo đi rồi nhưng chim vẫn hoảng, đập cánh vào nan lồng. Mèo dễ quay lại khi trời tối.');
          return 2;
        },
      },
    ],
  },
  {
    id: 'cafe', from: 7 * 60, to: 8 * 60 + 30, chance: 0.25,
    when: (S) => S.day >= 2 && !S.covered,
    title: 'Rủ đi cà phê chim',
    text: () => 'Bạn rủ mang chim ra quán cà phê chim để chim nghe các con khác hót.',
    choices: [
      {
        label: 'Đi', apply(S, ctx) {
          S.pos = S.loc; // chim đi vắng, không còn phơi ngoài sân
          if (S.newDays > 0 || S.molt || S.sick) {
            S.mood -= 15; S.risk.nga_nuoc += 25; S.risk.cam_lanh += 15;
            ctx.log('bad', 'Chim mới về, đang thay lông hoặc đang bệnh không nên mang đi đâu: di chuyển và chim lạ gây căng thẳng, dễ lây bệnh.');
          } else {
            S.mood += 6; S.vigor += 6; S.risk.tieu_chay += 15; S.risk.cam_lanh += 10; S.today.cafe = true;
            if (addMix(S, ctx.sp, 10, ctx, 'nghe lẫn đủ con hót hay hót dở ở quán')) ctx.log('tip', 'Chim tơ đi cà phê chim dễ học lẫn giọng con hót dở. Người chơi chim thường chỉ cho chim non nghe một giọng mồi chuẩn.');
            ctx.log('info', 'Nghe chim khác hót giúp chim sung hơn, nhưng tiếp xúc nhiều chim lạ cũng tăng nguy cơ lây bệnh. Ở TP Huế, kiểm lâm yêu cầu khách mang chim tới quán phải chứng minh được nguồn gốc hợp pháp.');
          }
          return 120;
        },
      },
      {
        label: 'Để chim ở nhà', apply(S, ctx) { ctx.log('info', 'Chim ở nhà nghỉ ngơi.'); return 0; },
      },
    ],
  },
  {
    id: 'gio', from: 16 * 60, to: 17 * 60 + 30, chance: 0.8,
    when: (S) => WEATHER[S.weather].cold && S.pos === 'hien' && !S.covered,
    title: 'Gió mùa về',
    text: () => 'Gió mùa thổi lùa qua hiên, trời trở lạnh nhanh.',
    choices: [
      {
        label: 'Trùm áo lồng, mang vào phòng khách', apply(S, ctx) {
          S.covered = true; S.loc = 'phongkhach'; S.pos = 'phongkhach';
          ctx.log('good', 'Chim được giữ ấm, tránh gió lùa. Chim nhỏ mất nhiệt rất nhanh khi trời lạnh.');
          return 3;
        },
      },
      {
        label: 'Kệ, chưa lạnh lắm', apply(S, ctx) {
          S.risk.cam_lanh += 40;
          ctx.log('warn', 'Gió lạnh lùa qua lồng, chim bắt đầu xù lông.');
          return 0;
        },
      },
    ],
  },
  {
    id: 'thuoc', from: 14 * 60, to: 17 * 60, chance: 0.2,
    when: (S) => S.pos === 'phongkhach' || S.pos === 'hien',
    title: 'Khói thuốc',
    text: () => 'Có khách ngồi uống trà, châm thuốc ngay cạnh lồng chim.',
    choices: [
      {
        label: 'Nhờ khách hút ra xa lồng chim', apply(S, ctx) { ctx.log('good', 'Khói thuốc gây hại cho chim cũng như người. Khách vui vẻ ra sân.'); return 2; },
      },
      {
        label: 'Ngại, không nói gì', apply(S, ctx) { S.risk.khi_doc += 35; ctx.log('warn', 'Chim hít khói thuốc suốt buổi chiều.'); return 0; },
      },
    ],
  },
  {
    id: 'karaoke', from: 17 * 60 + 30, to: 19 * 60 + 30, chance: 0.15,
    when: (S) => S.pos !== 'san',
    title: 'Hàng xóm hát karaoke',
    text: () => 'Nhà bên mở tiệc, loa karaoke bật hết cỡ, tiếng bass dội sang tận chỗ treo lồng.',
    choices: [
      {
        label: 'Trùm áo lồng, mang vào chỗ kín, xa loa', apply(S, ctx) {
          const moved = S.loc !== 'phongkhach';
          S.covered = true; S.loc = 'phongkhach'; S.pos = 'phongkhach'; S.mood -= 2;
          ctx.log('good', `Đã trùm áo lồng${moved ? ', mang vào phòng khách' : ''} và đóng cửa cho bớt ồn. Chim cần chỗ tối, yên tĩnh để ngủ đủ 10–12 tiếng; tiếng ồn lớn kéo dài làm chim căng thẳng, mất ngủ.`);
          return 3;
        },
      },
      {
        label: 'Kệ, hát một lát rồi thôi', apply(S, ctx) {
          S.mood -= 12; S.vigor -= 4; if (S.newDays > 0) S.risk.nga_nuoc += 30;
          ctx.log('warn', 'Loa ầm ĩ đến khuya, chim giật mình đập cánh, ngủ không yên. Thiếu ngủ nhiều đêm chim sẽ mệt, kém hót.');
          addMix(S, ctx.sp, 22, ctx, 'phải nghe loa karaoke ầm ĩ hàng giờ');
          return 0;
        },
      },
    ],
  },
  {
    id: 'treem', from: 15 * 60, to: 17 * 60 + 30, chance: 0.1,
    when: (S) => !S.covered,
    title: 'Trẻ con gõ lồng',
    text: () => 'Mấy đứa trẻ hàng xóm sang chơi, thích thú gõ vào nan lồng, thò tay trêu cho chim nhảy.',
    choices: [
      {
        label: 'Cho các bé đứng xa ngắm, giải thích cho bé', apply(S, ctx) {
          S.mood -= 1;
          ctx.log('good', 'Các bé đứng xa ngắm, nói khẽ và được giải thích: gõ lồng làm chim hoảng, đập cánh dễ gãy lông, va đầu. Trẻ hiểu ra sẽ biết thương chim.');
          return 10;
        },
      },
      {
        label: 'Để các bé chơi với chim', apply(S, ctx) {
          S.mood -= 12; S.trust -= 4; S.feather -= 2; S.risk.nga_nuoc += S.newDays > 0 ? 35 : 5;
          ctx.log('warn', 'Bị gõ lồng, thò tay trêu liên tục, chim hoảng loạn đập cánh vào nan, rụng cả lông. Chim sẽ sợ người lâu hơn.');
          return 15;
        },
      },
    ],
  },
  {
    id: 'nom', from: 8 * 60 + 30, to: 11 * 60, chance: 0.1,
    when: (S) => !WEATHER[S.weather].hot && S.feeder.amt > 0,
    title: 'Trời nồm ẩm',
    text: () => 'Trời nồm, nền nhà và tường đổ mồ hôi. Cám trong máng sờ thấy ẩm, bắt đầu vón cục.',
    choices: [
      {
        label: 'Bỏ cám ẩm, lau khô máng, thay cám mới', apply(S, ctx) {
          S.feeder.amt = 100; S.feeder.days = 0; S.today.refill = true;
          ctx.log('good', 'Đã bỏ cám ẩm, lau khô máng và đổ cám mới, khô. Mùa nồm cám, hạt rất dễ mốc: đổ vừa đủ ăn, thay mỗi ngày, cất bao cám kín ở nơi khô ráo.');
          return 5;
        },
      },
      {
        label: 'Cám còn nhiều, để chim ăn nốt', apply(S, ctx) {
          S.risk.tieu_chay += 35;
          ctx.log('warn', 'Cám ẩm vón cục, lấm tấm mốc. Thức ăn ẩm mốc dễ làm chim tiêu chảy, bệnh đường ruột.');
          return 0;
        },
      },
    ],
  },
  {
    id: 'chuot', from: 17 * 60 + 30, to: 19 * 60 + 30, chance: 0.12,
    when: (S) => S.pos !== 'san',
    title: 'Chuột mò tới lồng',
    text: () => 'Chập tối, một con chuột men theo tường leo lên gần lồng, đánh hơi thức ăn rơi vãi dưới máng.',
    choices: [
      {
        label: 'Trùm áo lồng, dọn sạch thức ăn rơi vãi', apply(S, ctx) {
          S.covered = true; S.fresh = null; S.cage = Math.max(S.cage, 85);
          ctx.log('good', 'Đã trùm áo lồng, dọn đồ ăn thừa và thức ăn rơi vãi quanh lồng. Chuột mang mầm bệnh qua phân, nước tiểu và có thể cắn chim; đừng để thức ăn thừa dụ chuột tới.');
          return 10;
        },
      },
      {
        label: 'Đuổi chuột đi rồi thôi', apply(S, ctx) {
          S.mood -= 6; S.risk.tieu_chay += 30;
          ctx.log('warn', 'Đêm xuống chuột quay lại, bò quanh máng ăn, cóng nước. Thức ăn, nước dính phân chuột dễ làm chim mắc bệnh đường ruột.');
          return 2;
        },
      },
    ],
  },
  {
    id: 'matdien', from: 12 * 60 + 30, to: 15 * 60, chance: 0.3,
    when: (S) => WEATHER[S.weather].hot && (S.pos === 'phongkhach' || S.pos === 'bep'),
    title: 'Mất điện giữa trưa nắng',
    text: () => 'Trưa nắng nóng, khu phố bị cắt điện. Quạt tắt, trong nhà nóng hầm hập, lồng chim treo trong phòng kín.',
    choices: [
      {
        label: 'Mang lồng ra chỗ râm mát, thay nước mát', apply(S, ctx) {
          S.loc = 'hien'; S.pos = 'hien';
          S.water.level = 100; S.water.clean = 100; S.today.water = true; S.dryWarned = false;
          ctx.log('good', 'Đã mang lồng ra hiên râm mát, thoáng gió và thay nước mát. Chim không có tuyến mồ hôi, chỉ thải nhiệt bằng cách há mỏ thở nên rất dễ sốc nhiệt trong phòng kín nóng bức.');
          return 5;
        },
      },
      {
        label: 'Chờ có điện lại', apply(S, ctx) {
          S.risk.say_nang += 50; S.mood -= 6;
          ctx.log('warn', 'Phòng kín không quạt nóng như lò, chim há mỏ thở dốc, xòe cánh vì nóng.');
          return 0;
        },
      },
    ],
  },
  {
    id: 'thi', from: 7 * 60, to: 9 * 60, chance: 0.35,
    when: (S) => skill(S) === 'song' && S.day >= moltDays(S)[1] && !S.covered && !S.contest && !S.today.cafe,
    title: 'Hội thi chim hót',
    text: (S) => `Câu lạc bộ chim cảnh trong phường tổ chức hội thi chim hót sáng nay. Mọi người rủ mang ${S.name} đi thi.`,
    choices: [
      {
        label: 'Trùm áo lồng, mang chim đi thi cẩn thận', apply(S, ctx) {
          S.pos = S.loc;
          if (S.sick || S.molt || S.newDays > 0 || S.health < 60) {
            S.mood -= 4;
            ctx.log('warn', `Tới hội thi, các nghệ nhân xem chim rồi khuyên mang về: chim đang ${S.sick ? 'bệnh' : S.molt ? 'thay lông' : 'yếu'} thì không nên thi. Đường xa, tiếng ồn và chim lạ làm chim yếu thêm, dễ lây bệnh.`);
            return 60;
          }
          // Giám khảo chấm giọng hót là chính, rồi tới độ sung, sức khỏe, bộ lông
          const score = S.song * 0.55 + S.vigor * 0.2 + S.health * 0.1 + S.feather * 0.15 + (ctx.rng() - 0.5) * 8;
          const place = score >= 85 ? 1 : score >= 75 ? 2 : score >= 65 ? 3 : 0;
          S.contest = { place, day: S.day };
          S.today.cafe = true;
          S.mood += place ? 6 : 2; S.vigor += 4; S.risk.tieu_chay += 10; S.risk.cam_lanh += 5;
          const voice = `“${SONG_LEVELS[songLevel(S.song)].name}”`;
          const res = place === 1 ? `${S.name} đoạt giải nhất! Giám khảo khen giọng hót ${voice}, chim sung, lông mượt: thành quả của những ngày chăm sóc, luyện giọng đều đặn.`
            : place ? `${S.name} đạt giải ${place === 2 ? 'nhì' : 'ba'}, giọng hót ở cấp ${voice}. Luyện giọng mồi đều đặn, chim còn tiến bộ nữa.`
              : `${S.name} chưa đạt giải: giọng mới ở cấp ${voice}. Giám khảo chấm giọng hót, độ sung và bộ lông; chim cần thêm thời gian chăm sóc, luyện giọng.`;
          ctx.log(place ? 'good' : 'info', `Trùm áo lồng suốt đường đi giúp chim bớt hoảng, tránh gió. ${res} Về nhà cho chim nghỉ, thay nước sạch: tiếp xúc nhiều chim lạ dễ lây bệnh.`);
          return 180;
        },
      },
      {
        label: 'Thôi, để chim ở nhà', apply(S, ctx) { ctx.log('info', 'Chim ở nhà nghỉ ngơi. Không đi thi cũng không sao: chim khỏe, vui mới là điều quan trọng.'); return 0; },
      },
    ],
  },
  {
    id: 'nghenoi', from: 16 * 60, to: 17 * 60 + 30, chance: 0.25,
    when: (S) => skill(S) === 'talk' && S.words.length > 0 && !S.covered,
    title: 'Hàng xóm sang nghe chim nói',
    text: (S) => `Nghe tin ${S.name} biết nói, mấy nhà hàng xóm kéo sang, ai cũng muốn nghe chim nói.`,
    choices: [
      {
        label: 'Cho chim nói vài câu rồi để chim nghỉ', apply(S, ctx) {
          S.say = S.words[Math.floor(ctx.rng() * S.words.length)]; S.sayUntil = S.t + 5;
          S.mood += 3; S.trust += 1;
          ctx.log('good', `${S.name} nói “${S.say}” khiến cả xóm thích thú. Cho chim “biểu diễn” một lúc rồi mời mọi người về để chim nghỉ: bị vây quanh, trêu chọc lâu, chim dễ căng thẳng.`);
          return 15;
        },
      },
      {
        label: 'Để mọi người trêu cho chim nói mãi', apply(S, ctx) {
          S.mood -= 12; S.trust -= 3;
          ctx.log('warn', 'Mọi người xúm quanh lồng, gõ nan, huýt sáo bắt chim nói mãi. Chim mệt, hoảng, nép vào góc lồng.');
          return 40;
        },
      },
    ],
  },
];

/** Lên lịch sự kiện cho một ngày. */
export function scheduleDay(S, rng) {
  S.schedule = {};
  for (const ev of HOUSEHOLD_EVENTS) {
    if (rng() < ev.chance) S.schedule[ev.id] = ev.from + Math.floor(rng() * (ev.to - ev.from));
  }
}

/** Trả về sự kiện đến giờ (nếu có). */
export function dueEvent(S) {
  for (const ev of HOUSEHOLD_EVENTS) {
    if (S.schedule[ev.id] === S.t && !S.today.events[ev.id] && ev.when(S)) {
      S.today.events[ev.id] = true;
      return ev;
    }
  }
  return null;
}
