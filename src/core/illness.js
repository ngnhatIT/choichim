import { DISEASES } from '../data/diseases.js';

/**
 * Diễn tiến bệnh như ngoài đời: ủ bệnh (dấu hiệu sớm) → phát rõ → thú y kê liệu trình, cho uống thuốc mỗi ngày.
 * S.sick = { type, since, phase: 'som' | 'ro' | 'tri', left, dosesLeft, dosedToday, relapsed }
 * Mọi chỗ kiểm `S.sick` truthy vẫn hiểu là "chim không khỏe" (không hót, không luyện giọng...).
 */
export const EARLY_MIN = 180; // số phút ủ bệnh trước khi phát rõ
const EARLY_COURSE = 3;       // bắt bệnh sớm: liệu trình ngắn
const RELAPSE_EXTRA = 2;      // tái bệnh vì bỏ liều: thêm liều (nhờn thuốc)

export const sickPhase = (S) => (S.sick ? S.sick.phase || 'ro' : null);

function showSick(S, ctx) {
  const d = DISEASES[S.sick.type];
  S.health -= 5;
  ctx.log('bad', `${S.name} có dấu hiệu bệnh: ${d.name}. ${d.sign} Nguyên nhân thường gặp: ${d.cause} Nên đưa đi bác sĩ thú y sớm.`);
}

/** Chim nhiễm bệnh. Lúc ủ bệnh chưa ghi tên bệnh vào nhật ký: người chơi phải tự nhận ra dấu hiệu sớm. */
export function catchIllness(S, ctx, key, phase = 'som') {
  S.sick = { type: key, since: S.t, phase, left: phase === 'som' ? EARLY_MIN : 0, dosesLeft: 0, dosedToday: false, relapsed: false };
  S.sickCount++;
  if (S.risk[key] !== undefined) S.risk[key] = 0;
  if (phase === 'ro') showSick(S, ctx);
}

/** Mỗi phút: ủ bệnh đếm lùi rồi phát rõ; phát rõ trừ máu; đang điều trị thì hồi dần nếu ăn uống đủ. */
export function stepIllness(S, ctx) {
  const sk = S.sick;
  if (!sk) return;
  const d = DISEASES[sk.type];
  const phase = sickPhase(S);
  if (phase === 'som') {
    S.health -= d.dmg * 0.3;
    if (--sk.left <= 0) { sk.phase = 'ro'; showSick(S, ctx); }
  } else if (phase === 'ro') {
    S.health -= d.dmg; S.mood -= 0.03; S.vigor -= 0.03;
  } else if (S.hunger > 40 && S.water.level > 0) S.health += 0.01;
}

/** Đi thú y. Trả về số phút. */
export function prescribe(S, ctx) {
  const sk = S.sick;
  const d = DISEASES[sk.type];
  if (sickPhase(S) === 'tri') {
    S.mood -= 6;
    ctx.log('info', `Bác sĩ thú y: ${d.name} đang đỡ dần. Cứ cho uống tiếp đủ ${sk.dosesLeft} ngày nữa, đừng bỏ liều. Mang chim đi lại nhiều cũng làm chim mệt.`);
    return 60;
  }
  const early = sickPhase(S) === 'som';
  const course = early ? EARLY_COURSE : d.course + (sk.relapsed ? RELAPSE_EXTRA : 0);
  Object.assign(sk, { phase: 'tri', dosesLeft: course - 1, dosedToday: true, left: 0 });
  S.health += 8; S.mood -= 4;
  ctx.log('good', `Bác sĩ thú y chẩn đoán: ${d.name}${early ? ', phát hiện sớm nên bệnh nhẹ' : ''}${sk.relapsed ? ', tái lại vì bỏ thuốc giữa chừng nên phải dùng lâu hơn' : ''}. Đã cho liều đầu. Uống thuốc ${course} ngày, mỗi sáng một liều; bỏ liều bệnh dễ tái. Giữ chim ấm, yên tĩnh. Phòng bệnh: ${d.prevent}`);
  if (sk.dosesLeft <= 0) cure(S, ctx);
  return 120;
}

function cure(S, ctx) {
  ctx.log('good', `${S.name} đã khỏi ${DISEASES[S.sick.type].name.toLowerCase()} sau khi uống đủ liệu trình thuốc.`);
  S.sick = null;
}

/** Cho uống một liều thuốc. */
export function giveDose(S, ctx) {
  const sk = S.sick;
  S.mood -= 2; sk.dosesLeft--; sk.dosedToday = true;
  if (sk.dosesLeft <= 0) cure(S, ctx);
  else ctx.log('info', `Đã nhỏ thuốc cho ${S.name}. Còn ${sk.dosesLeft} ngày thuốc nữa.`);
  return 3;
}

/** Chấm phần bệnh cuối ngày, áp hậu quả bỏ liều. `add(ok, label, note)` như endDay. */
export function nightIllness(S, ctx, add) {
  const phase = sickPhase(S);
  if (phase === 'tri') {
    if (S.today.talks > 2) { S.health -= 3; add(false, 'Chim ốm cần nghỉ', 'Đang uống thuốc, chim cần yên tĩnh: ít trò chuyện, không luyện giọng.'); }
    if (S.sick.dosedToday) add(true, 'Cho uống thuốc đúng liều', `Còn ${S.sick.dosesLeft} ngày thuốc.`);
    else {
      Object.assign(S.sick, { phase: 'ro', dosesLeft: 0, relapsed: true });
      add(false, 'Bỏ liều thuốc', 'Bỏ thuốc giữa chừng khi vi khuẩn chưa sạch, bệnh tái lại và dễ nhờn thuốc. Phải đưa đi thú y lại.');
      ctx.log('bad', `Hôm nay ${S.name} không được uống thuốc: bệnh ${DISEASES[S.sick.type].name.toLowerCase()} tái lại.`);
    }
  } else if (phase === 'ro') {
    add(false, 'Chim bệnh chưa được chữa', `${DISEASES[S.sick.type].name}: ${DISEASES[S.sick.type].sign} Đưa đi thú y càng sớm càng tốt.`);
  }
}
