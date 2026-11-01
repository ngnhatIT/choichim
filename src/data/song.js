// Cấp giọng hót của chim hót, tính từ S.song (0–100). Dùng chung cho logic, giao diện và âm thanh.
export const SONG_LEVELS = [
  { min: 0, name: 'Chưa ra giọng', desc: 'Chỉ kêu chiêm chiếp, chưa hót thành câu.' },
  { min: 20, name: 'Hót rời rạc', desc: 'Vài tiếng ngắn, chưa tròn câu.' },
  { min: 45, name: 'Hót tròn câu', desc: 'Hót trọn một câu ngắn, rõ tiếng.' },
  { min: 70, name: 'Hót đổ dài', desc: 'Hót liền nhiều câu, giọng to và sáng.' },
  { min: 90, name: 'Giọng vàng', desc: 'Giọng vang, nhiều kiểu hót, hót bền.' },
];

/** Chỉ số cấp (0..4) ứng với điểm giọng hót. */
export function songLevel(v = 0) {
  let i = 0;
  while (i + 1 < SONG_LEVELS.length && v >= SONG_LEVELS[i + 1].min) i++;
  return i;
}

/** Độ sung ("lửa") theo cách người chơi chim gọi, kèm dấu hiệu nhìn thấy được. Nguồn: docs/LIFECYCLE_RESEARCH.md mục 4. */
export const FIRE_BANDS = [
  { min: 0, name: 'Xuống lửa', sign: 'Lông hơi xù, đứng thu mình, hót rời rạc hoặc bỏ hót, hay rỉa lông.', crest: 'Mào cụp. ' },
  { min: 40, name: 'Vừa lửa', sign: 'Lông ép gọn, đứng thẳng, nhảy cầu đều.' },
  { min: 75, name: 'Căng lửa', sign: 'Lông ép sát, đuôi vểnh, hót to và đều.' },
  { min: 90, name: 'Quá lửa', sign: 'Nhảy loạn lồng, đập cánh, hót gắt: nên bớt mồi và giọng mồi, cho tắm.' },
];
/** Mức lửa ứng với v; sp (nếu có) để chỉ nói tới mào với loài có mào. */
export const fireBand = (v, sp) => { const F = fireBandOf(v); return F.crest && (sp?.model.crest || sp?.model.tuft) ? { ...F, sign: F.crest + F.sign } : F; };
const fireBandOf = (v) => { let i = 0; while (i < FIRE_BANDS.length - 1 && v >= FIRE_BANDS[i + 1].min) i++; return FIRE_BANDS[i]; };
