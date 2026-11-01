// Thức ăn chính (đổ vào máng) và đồ ăn thêm.
// `mesh` mô tả hình dạng 3D đơn giản để render trong lồng.

export const STAPLES = {
  vien:    { name: 'Thức ăn viên cho vẹt (pellet)', em: '🟢', color: '#9C8B4E' },
  ke:      { name: 'Hạt kê trộn', em: '🌾', color: '#E2C66B' },
  cm:      { name: 'Cám chào mào', em: '🟤', color: '#9A6B3C' },
  khuyen:  { name: 'Cám khuyên (mịn)', em: '🟡', color: '#D9C25A' },
  sau:     { name: 'Cám chòe, họa mi (giàu đạm)', em: '🟠', color: '#B5763A' },
  tonghop: { name: 'Cám tổng hợp (chim ăn tạp)', em: '⚫', color: '#6F5A44' },
};

export const FOODS = {
  chuoi:    { name: 'Chuối chín', em: '🍌', cat: 'fruit', fill: 18, mesh: { shape: 'banana', color: '#F2D24B' } },
  ot:       { name: 'Ớt chín, cà chua', em: '🌶️', cat: 'fruit', fill: 12, mesh: { shape: 'chili', color: '#D23A26' } },
  tao:      { name: 'Táo, đu đủ cắt nhỏ', em: '🍎', cat: 'fruit', fill: 15, mesh: { shape: 'cube', color: '#F0C987' } },
  rau:      { name: 'Rau cải xanh', em: '🥬', cat: 'fruit', fill: 10, mesh: { shape: 'leaf', color: '#4E9A3A' } },
  caocao:   { name: 'Cào cào', em: '🦗', cat: 'protein', fill: 20, mesh: { shape: 'insect', color: '#7C9A3C' } },
  de:       { name: 'Dế', em: '🪲', cat: 'protein', fill: 20, mesh: { shape: 'insect', color: '#3B2A1E' } },
  sauquy:   { name: 'Sâu quy (sâu gạo)', em: '🐛', cat: 'protein', fill: 15, mesh: { shape: 'worm', color: '#D9B36A' } },
  trung:    { name: 'Lòng đỏ trứng luộc', em: '🥚', cat: 'protein', fill: 15, mesh: { shape: 'sphere', color: '#F2B632' } },
  xuongmuc: { name: 'Xương mực, đá khoáng', em: '🦴', cat: 'mineral', fill: 2, mesh: { shape: 'bone', color: '#F3EFE4' } },
  com:      { name: 'Cơm, bánh mì thừa', em: '🍚', cat: 'junk', fill: 15, mesh: { shape: 'grain', color: '#F6F3EA' } },
  doman:    { name: 'Đồ ăn mặn (thịt kho, snack)', em: '🍖', cat: 'junk', fill: 10, mesh: { shape: 'cube', color: '#8A4B2A' } },
  hanh:     { name: 'Hành, tỏi', em: '🧄', cat: 'toxic', fill: 3, mesh: { shape: 'sphere', color: '#EFE6D8' } },
  bo:       { name: 'Quả bơ', em: '🥑', cat: 'toxic', fill: 5, mesh: { shape: 'cube', color: '#9BC15A' } },
  socola:   { name: 'Sô cô la, bánh ngọt', em: '🍫', cat: 'toxic', fill: 5, mesh: { shape: 'cube', color: '#4A2C1C' } },
};

// Đánh giá chung, áp dụng cho mọi loài trừ khi loài ghi đè.
// Thang: 2 rất tốt, 1 tốt, 0 không hứng thú, -1 không nên, -2 có hại, -3 độc.
export const COMMON_FOOD = {
  doman:  [-2, 'Đồ ăn của người nhiều muối, gia vị: hại thận, gây tiêu chảy.'],
  hanh:   [-3, 'Hành, tỏi chứa hợp chất lưu huỳnh phá hủy hồng cầu, gây độc cho chim.'],
  bo:     [-3, 'Quả bơ chứa persin, rất độc với chim, lượng nhỏ cũng có thể gây chết.'],
  socola: [-3, 'Sô cô la chứa theobromine và caffeine, độc với chim.'],
};
