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
