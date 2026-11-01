import { SPECIES_ORDER } from '../data/species.js';

/** Thành tựu lưu qua nhiều ván chơi (không bị xóa khi hết ván). */
export const ACHIEVEMENTS = {
  first_song: { name: 'Tiếng hót đầu tiên', desc: 'Chim cất tiếng hót lần đầu nhờ được chăm tốt.', em: '🎵' },
  golden_voice: { name: 'Giọng vàng', desc: 'Giọng hót đạt 90 điểm trở lên.', em: '🎶' },
  first_word: { name: 'Câu nói đầu tiên', desc: 'Chim nói được câu đầu tiên.', em: '💬' },
  chatterbox: { name: 'Chim lắm lời', desc: 'Dạy chim nói được hết các câu.', em: '🗣️' },
  champion: { name: 'Vô địch hội thi', desc: 'Đoạt giải nhất hội thi chim hót.', em: '🏆' },
  never_sick: { name: 'Khỏe trọn 14 ngày', desc: 'Nuôi trọn ván mà chim chưa ốm lần nào.', em: '💚' },
  safe_keeper: { name: 'Người nuôi cẩn thận', desc: 'Nuôi trọn ván, luôn đeo găng, lau ẩm khi dọn lồng.', em: '🧤' },
  perfect_day: { name: 'Ngày trọn vẹn', desc: 'Một ngày đạt 100 điểm.', em: '⭐' },
  molt_master: { name: 'Qua mùa thay lông', desc: 'Lông đạt 85 trở lên khi thay lông xong.', em: '🪶' },
  hard_species: { name: 'Tay nuôi lành nghề', desc: 'Nuôi trọn ván vành khuyên hoặc họa mi, điểm trung bình từ 80.', em: '🎖️' },
  all_species: { name: 'Đủ sáu loài', desc: 'Nuôi trọn ván với cả 6 loài chim.', em: '🌈' },
};

const KEY = 'longtre-achievements-v1';

// Không có localStorage (Node, chế độ riêng tư bị chặn) thì trả null: thành tựu chỉ giữ trong bộ nhớ.
function local() { try { return globalThis.localStorage || null; } catch (e) { return null; } }

/** Kho thành tựu: { got: { id: { at, sp } }, done: { sp: số ván đã nuôi trọn } }. */
export function readAchievements(storage = local()) {
  try {
    const d = JSON.parse(storage?.getItem(KEY) || 'null');
    if (d && typeof d === 'object') return { got: d.got || {}, done: d.done || {} };
  } catch (e) { /* bộ nhớ không khả dụng hoặc dữ liệu hỏng */ }
  return { got: {}, done: {} };
}

export function saveAchievements(store, storage = local()) {
  try { storage?.setItem(KEY, JSON.stringify(store)); } catch (e) { /* bỏ qua */ }
}

/** id -> { at, sp } các thành tựu đã mở. */
export function loadAchievements() { return readAchievements().got; }

/**
 * id các thành tựu đang đạt theo trạng thái (kể cả cái đã mở trước đó, Game tự lọc).
 * moltEnded: vừa thay lông xong; final: { avg, done } khi vừa nuôi trọn 14 ngày.
 */
export function earnedAchievements(S, sp, { moltEnded = false, final = null } = {}) {
  const ids = [];
  if (S.sangEver) ids.push('first_song');
  if (S.song >= 90) ids.push('golden_voice');
  if (S.words.length) ids.push('first_word');
  if (sp.words && S.words.length >= sp.words.length) ids.push('chatterbox');
  if (S.contest?.place === 1) ids.push('champion');
  if (S.hist.some((h) => h.score === 100)) ids.push('perfect_day');
  if (moltEnded && S.feather >= 85) ids.push('molt_master');
  if (final) {
    if (!S.sickCount) ids.push('never_sick');
    if (!S.ownerRisk) ids.push('safe_keeper');
    if ((S.sp === 'khuyen' || S.sp === 'hoami') && final.avg >= 80) ids.push('hard_species');
    if (SPECIES_ORDER.every((k) => final.done[k])) ids.push('all_species');
  }
  return ids;
}
