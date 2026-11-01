import { MOLT_START, MOLT_END } from '../config.js';

/**
 * Tuổi chim khi đón về. Nguồn: docs/LIFECYCLE_RESEARCH.md.
 *
 * Chim chuyền: non mới rời tổ vài tuần đến vài tháng, nuôi tay nên dạn người, đang học giọng (líu ríu rồi tập hót),
 * lớn nhanh nên ăn nhiều bữa, sức đề kháng yếu, sợ lạnh. Mùa thay lông trong game là lần thay lông non → lông trưởng thành.
 * Chim lâu năm: giọng đã định, khó học thêm, hồi sức chậm, thay lông mệt hơn.
 *
 * song0, trust0: giọng, thân thiết lúc đón về; songCap: trần giọng trong 14 ngày (chim non chưa định giọng);
 * songK, tutorK: hệ số tiến bộ giọng và hiệu quả giọng mồi; talkK: tốc độ học nói;
 * metabK: tốc độ đói; riskK: hệ số nguy cơ bệnh; coldK: thêm cho nguy cơ cảm lạnh; vigorK: hồi độ sung.
 */
export const STAGES = {
  chuyen: {
    name: 'Chim chuyền', age: 'Khoảng 1–4 tháng tuổi',
    desc: 'Chim non mới rời tổ, nuôi tay nên dạn người. Đang tập hót, học giọng mồi rất nhanh. Ăn nhiều bữa, yếu, sợ lạnh. Mùa thay lông đầu đời sẽ khoác bộ lông trưởng thành.',
    molt: [MOLT_START - 1, MOLT_END - 1], // thay lông non sang lông trưởng thành sớm hơn
    song0: 4, trust0: 28, songCap: 60, songK: 1.1, tutorK: 1.7, talkK: 1.5, metabK: 1.15, riskK: 1.25, coldK: 1.5, vigorK: 1, featherMolt: 1,
  },
  truong: {
    name: 'Chim trưởng thành', age: 'Khoảng 1–3 năm tuổi',
    desc: 'Đã qua mùa thay lông đầu, bộ lông và tính nết ổn định. Giọng còn tiến bộ nếu chăm tốt.',
    molt: [MOLT_START, MOLT_END],
    song0: 12, trust0: 8, songCap: 100, songK: 1, tutorK: 1, talkK: 1, metabK: 1, riskK: 1, coldK: 1, vigorK: 1, featherMolt: 1,
  },
  gia: {
    name: 'Chim lâu năm', age: 'Từ 5 năm tuổi trở lên',
    desc: 'Giọng đã định, hót chắc nhưng khó học thêm. Hồi sức chậm, thay lông mệt hơn, cần giữ ấm và ăn uống đều.',
    molt: [MOLT_START, MOLT_END + 1], // chim già thay lông chậm, kéo dài hơn
    song0: 58, trust0: 18, songCap: 100, songK: 0.45, tutorK: 0.3, talkK: 0.6, metabK: 0.95, riskK: 1.2, coldK: 1.3, vigorK: 0.7, featherMolt: 0.8,
  },
};
export const STAGE_ORDER = ['chuyen', 'truong', 'gia'];
export const stageOf = (S) => STAGES[S.stage] || STAGES.truong;
/** Chim chuyền chưa thay lông đầu: còn là chim non, cần mồi mềm nhiều bữa. */
/** [ngày bắt đầu, ngày xong] mùa thay lông theo tuổi chim. */
export const moltDays = (S) => (STAGES[S.stage] || STAGES.truong).molt;
export const isYoung = (S) => S.stage === 'chuyen' && S.day < moltDays(S)[1];

/**
 * Chim tơ đang học giọng nghe phải tạp âm, chim hót dở thì học lẫn ("lai giọng"), rất khó sửa.
 * Chỉ tính với chim chuyền loài hót. Trả về số điểm lai giọng đã cộng.
 */
export function addMix(S, sp, v, ctx, why) {
  if (S.stage !== 'chuyen' || sp.skill !== 'song') return 0;
  const was = S.mix || 0;
  S.mix = Math.min(100, was + v);
  if (was < 20 && S.mix >= 20) ctx.log('warn', `${S.name} còn non đang học giọng, ${why} nên bắt đầu "lai giọng": hót lẫn tiếng tạp. Chim tơ chỉ nên nghe giọng mồi chuẩn và chỗ yên tĩnh.`);
  return v;
}

/** 0 = bộ lông non, 1 = lông trưởng thành. Chim chuyền đổi dần trong mùa thay lông. */
export function adultness(stage, day) {
  if (stage !== 'chuyen') return 1;
  const [a, b] = STAGES.chuyen.molt;
  if (day < a) return 0;
  if (day >= b) return 1;
  return (day - a + 0.5) / (b - a);
}
