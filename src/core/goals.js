import { STAPLES } from '../data/foods.js';
import { WEATHER } from '../data/weather.js';
import { LATE_SLEEP, NEW_BIRD_DAYS } from '../config.js';
import { feederAcceptance } from './simulation.js';

/**
 * Việc nên làm hôm nay, khớp với cách chấm điểm cuối ngày (dayCycle.endDay).
 * Hàm thuần: [{ id, label, done, hint }]. Vẫn đúng lúc đang xem tổng kết ngày (S.awaitingNext).
 */
export function dailyGoals(S, sp) {
  const T = S.today;
  const ended = !!S.awaitingNext;
  // endDay đã trừ newDays khi đang xem tổng kết, nên lúc đó dựa vào số ngày
  const newBird = ended ? S.day <= NEW_BIRD_DAYS : S.newDays > 0;
  const out = [];
  const add = (id, label, done, hint) => out.push({ id, label, done: !!done, hint });

  add('staple', 'Thay thức ăn chính đúng loài', T.refill && feederAcceptance(S, sp) >= 0.8,
    `Đổ ${STAPLES[sp.best].name.toLowerCase()} mới vào máng mỗi ngày; cám để lâu dễ ẩm mốc.`);
  add('water', 'Rửa cóng, thay nước sạch', T.water, 'Nước để qua ngày dễ nhiễm khuẩn, gây tiêu chảy.');
  if (sp.needs.fresh) add('fresh', 'Cho trái cây, rau tươi', T.fresh > 0, `${sp.name} cần đồ tươi mỗi ngày; dọn phần thừa sau vài giờ.`);
  if (sp.needs.protein) add('protein', 'Cho mồi tươi (côn trùng, trứng)', T.protein > 0, 'Côn trùng hoặc trứng giúp chim sung, lông đẹp; dọn phần thừa sau vài giờ.');
  if (sp.needs.mineral && (T.mineral || S.day - S.lastMineral >= 5)) {
    add('mineral', 'Cho xương mực, đá khoáng', T.mineral, 'Vẹt cần canxi thường xuyên: bổ sung xương mực ít nhất mỗi tuần.');
  }
  if (!WEATHER[S.weather].rain) {
    add('sun', `Tắm nắng sớm ${sp.sun[0]}–${sp.sun[1]} phút`, T.sunGood >= sp.sun[0] && T.sunAll <= sp.sun[1] + 30 && T.heat < 10,
      'Mang ra sân trước 9 giờ 30; tránh nắng gắt 11–15 giờ.');
  }
  if (T.baths > 0 || S.day - S.lastBath > sp.bathGap) {
    add('bath', 'Cho tắm trước 17 giờ', T.baths > 0 && !T.lateBath, 'Tắm buổi sáng hoặc đầu giờ chiều rồi hong khô; tắm muộn dễ nhiễm lạnh.');
  }
  add('clean', 'Dọn lồng: lau ẩm, đeo găng', T.clean && !T.dryClean, 'Quét khô làm bụi phân bay lên, có thể lây bệnh sốt vẹt sang người.');
  if (newBird) add('quiet', 'Để chim mới yên tĩnh', T.talks <= 2, 'Giữ áo lồng, trò chuyện không quá 2 lần; chỉ cho ăn uống, dọn dẹp nhẹ nhàng.');
  else if (sp.skill === 'song') add('bond', 'Trò chuyện hoặc cho nghe giọng mồi', T.talks > 0 || T.tutor > 0, 'Chim dạn người, nghe giọng mồi đều đặn (tối đa 2 lần mỗi ngày) sẽ hót hay hơn.');
  else add('bond', 'Trò chuyện, dạy nói', T.talks > 0, 'Lặp lại một câu đều đặn mỗi ngày khi chim đã dạn người.');
  add('sleep', 'Trùm áo, cho ngủ trước 20:30', ended && S.covered && S.t <= LATE_SLEEP, 'Chim cần 10–12 tiếng ngủ yên tối; trùm áo lồng lúc chập tối.');
  return out;
}
