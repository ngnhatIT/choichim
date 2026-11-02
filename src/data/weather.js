export const WEATHER = {
  mat:  { key: 'mat',  name: 'Mát',       temp: 28, hot: false, cold: false, rain: false, humid: false },
  nong: { key: 'nong', name: 'Nắng nóng', temp: 36, hot: true,  cold: false, rain: false, humid: false },
  mua:  { key: 'mua',  name: 'Mưa lạnh',  temp: 20, hot: false, cold: true,  rain: true,  humid: false },
  ret:  { key: 'ret',  name: 'Rét khô',   temp: 13, hot: false, cold: true,  rain: false, humid: false },
  nom:  { key: 'nom',  name: 'Nồm ẩm',    temp: 22, hot: false, cold: false, rain: false, humid: true  },
  rao:  { key: 'rao',  name: 'Mưa rào',   temp: 29, hot: false, cold: false, rain: true,  humid: false },
};

// Xác suất kiểu thời tiết theo vùng và tháng: ước lượng theo khí hậu từng miền, không phải số liệu đo.
const B12 = { ret: 0.5, nom: 0.15, mua: 0.2, mat: 0.15 }, B34 = { nom: 0.4, mat: 0.4, mua: 0.2 }, B58 = { nong: 0.5, rao: 0.35, mat: 0.15 },
  B910 = { mat: 0.6, nong: 0.2, rao: 0.2 }, B1112 = { mat: 0.4, ret: 0.4, mua: 0.2 };
const T12 = { mua: 0.5, ret: 0.25, mat: 0.25 }, T34 = { mat: 0.6, nom: 0.15, rao: 0.25 }, T58 = { nong: 0.6, mat: 0.2, rao: 0.2 },
  T910 = { mua: 0.4, rao: 0.2, mat: 0.4 }, T1112 = { mua: 0.6, ret: 0.15, mat: 0.25 };
const N12 = { mat: 0.5, nong: 0.5 }, N34 = { nong: 0.6, mat: 0.4 }, N58 = { rao: 0.5, nong: 0.3, mat: 0.2 },
  N910 = { rao: 0.55, mat: 0.3, nong: 0.15 }, N1112 = { mat: 0.5, rao: 0.3, nong: 0.2 };
const months = (a, b, c, d, e) => ({ 1: a, 2: a, 3: b, 4: b, 5: c, 6: c, 7: c, 8: c, 9: d, 10: d, 11: e, 12: e });
export const WEATHER_TABLE = {
  bac: months(B12, B34, B58, B910, B1112),
  trung: months(T12, T34, T58, T910, T1112),
  nam: months(N12, N34, N58, N910, N1112),
};

export const REGIONS = { bac: 'Miền Bắc', trung: 'Miền Trung', nam: 'Miền Nam' };

/** Tháng (1–12) của ngày game thứ `day`, tính từ lúc đón chim. Bản lưu cũ chưa có mốc: tháng 4. */
export function monthOf(S, day = S.day) {
  if (!S.startAt) return 4;
  return new Date(S.startAt + (day - 1) * 86400000).getMonth() + 1;
}

/** Ngày 1 (chim mới về) lấy kiểu phổ biến nhất của tháng mà không mưa, không nóng. */
export function rollWeather(day, rng, region = 'trung', month = 4) {
  const table = (WEATHER_TABLE[region] || WEATHER_TABLE.trung)[month];
  const keys = Object.keys(table);
  if (day === 1) {
    const calm = keys.filter((k) => !WEATHER[k].rain && !WEATHER[k].hot).sort((a, b) => table[b] - table[a]);
    return calm[0] || 'mat';
  }
  let r = rng();
  for (const k of keys) { r -= table[k]; if (r < 0) return k; }
  return keys[keys.length - 1];
}

/** Tên hiển thị: miền Trung mùa hè nắng nóng là gió Lào. */
export function weatherName(S) {
  const m = monthOf(S);
  if (S.region === 'trung' && S.weather === 'nong' && m >= 5 && m <= 8) return 'Gió Lào, nắng nóng';
  return WEATHER[S.weather].name;
}

/** Khung giờ nắng tốt [từ, đến): trời rét thì đợi nắng lên. */
export const sunWindow = (W) => (W.key === 'ret' ? [8, 10.5] : [6, 9.5]);
