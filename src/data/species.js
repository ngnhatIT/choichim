import { COMMON_FOOD } from './foods.js';

/**
 * Dữ liệu từng loài. Nguồn tham khảo xem docs/RESEARCH.md.
 *
 * staple   : mức chấp nhận thức ăn chính (0 = không ăn, 1 = tối ưu)
 * food     : [điểm, giải thích] cho từng món ăn thêm (thang -3..2)
 * needs    : nhu cầu hằng ngày (fresh = trái cây/rau, protein = mồi/trứng, mineral = khoáng mỗi tuần)
 * sun      : [tối thiểu, tối đa] số phút nắng sớm mỗi ngày
 * bathGap  : số ngày tối đa giữa hai lần tắm
 * voice    : mô tả tiếng hót, tiếng kêu (hiện trong Sổ tay, màn hình chọn chim)
 * model    : thông số dựng hình 3D (màu, hình dáng, kích thước so với chào mào)
 *            juvenile: bộ lông chim non (chim chuyền) ghi đè lên model, xem data/stages.js stageModel()
 */
export const SPECIES = {
  yenphung: {
    name: 'Vẹt yến phụng', short: 'yến phụng', latin: 'Melopsittacus undulatus',
    lv: 1, lvText: 'Dễ, hợp người mới', wild: false,
    blurb: 'Vẹt nhỏ gốc Úc, hiền, thích bầu bạn. Được nuôi sinh sản rộng rãi, không lấy từ tự nhiên.',
    voice: 'Líu lo ríu rít nhỏ nhẹ gần như cả ngày, xen tiếng rè rè và tiếng "chiếp" rung rung. Có con bắt chước được vài từ.',
    metab: 0.21, skill: 'talk', best: 'vien',
    staple: { vien: 1, ke: 0.75, cm: 0, khuyen: 0, sau: 0, tonghop: 0 },
    food: {
      chuoi: [1, 'Ăn được, nhưng trái cây nhiều đường nên chỉ cho ít.'],
      ot: [1, 'Ớt chín ăn được. Riêng cà chua có tính axit, chỉ cho rất ít, không cho lá và cuống.'],
      tao: [2, 'Táo bỏ hạt là món vẹt thích. Hạt táo có chất độc, phải bỏ.'],
      rau: [2, 'Rau xanh rửa sạch là nguồn vitamin rất tốt; nên chiếm phần lớn đồ tươi của vẹt.'],
      caocao: [0, 'Yến phụng ăn hạt và rau, gần như không ăn côn trùng.'],
      de: [0, 'Yến phụng gần như không ăn côn trùng.'],
      sauquy: [0, 'Yến phụng gần như không ăn côn trùng.'],
      trung: [1, 'Lòng đỏ trứng luộc bổ đạm, tốt mùa thay lông. Cho lượng nhỏ.'],
      xuongmuc: [2, 'Xương mực cung cấp canxi và giúp vẹt mài mỏ.'],
      com: [-1, 'Cơm, bánh mì nghèo dinh dưỡng, dễ chua. Không nên thành thói quen.'],
    },
    needs: { fresh: true, protein: false, mineral: true },
    sun: [15, 45], bathGap: 3, maxBath: 1, shy: false, foodSensitive: false, territorial: false, moltAvoid: [],
    words: ['Xin chào', 'Ăn chưa', 'Bé ngoan', 'Đẹp quá', 'Chíp chíp'],
    tips: [
      'Bác sĩ thú y khuyên thức ăn viên chiếm khoảng 60–80% khẩu phần; rau quả tối đa khoảng 20–25%. Chế độ chỉ có hạt dễ gây béo phì, thiếu chất.',
      'Muốn chuyển từ hạt sang thức ăn viên phải trộn dần trong nhiều ngày, thậm chí nhiều tuần.',
      'Luôn có xương mực hoặc đá khoáng để bổ sung canxi và mài mỏ.',
      'Tuyệt đối không cho ăn bơ, sô cô la, hành, tỏi, đồ mặn.',
      'Vẹt sống theo đàn: nên nuôi theo cặp, không nhốt chung với loài chim khác.',
      'Trò chuyện đều đặn giúp vẹt dạn người, có con bắt chước được vài từ.',
    ],
    model: {
      size: 0.9, tail: 1.3,
      colors: { body: '#6BBF4E', belly: '#86CF62', head: '#F0DA45', wing: '#58A443', tail: '#3E7FA8', bill: '#E8D7A2', legs: '#A99DB8', cheek: '#3E5FC4' },
      parrot: true, barring: true,
      // Non: vằn đen kéo tới sát mũi, mắt đen tuyền chưa có vòng mống mắt trắng, mũi hồng nhạt, đốm cổ nhỏ, đuôi ngắn
      juvenile: { colors: { head: '#DCCB52', cere: '#D9AFC0', cheek: '#6F84C8' }, darkEye: true, foreheadBars: true },
    },
  },

  chaomao: {
    name: 'Chào mào', short: 'chào mào', latin: 'Pycnonotus jocosus',
    lv: 2, lvText: 'Trung bình', wild: true,
    blurb: 'Loài chim cảnh phổ biến nhất Việt Nam: mào đen nhọn, má đỏ, giọng hót trong.',
    voice: 'Hót từng cụm ngắn 3–6 tiếng, trong và vui, luyến lên xuống liên tục. Chim sung hót "đổ" dài, giọng sáng.',
    metab: 0.24, skill: 'song', best: 'cm',
    staple: { vien: 0, ke: 0, cm: 1, khuyen: 0.6, sau: 0.55, tonghop: 0.65 },
    food: {
      chuoi: [2, 'Chuối chín là món khoái khẩu của chào mào.'],
      ot: [2, 'Ớt chín, cà chua bổ sung vitamin, giúp chim lên màu.'],
      tao: [1, 'Ăn được, nên cắt nhỏ.'],
      rau: [0, 'Chào mào ít ăn rau lá.'],
      caocao: [2, 'Cào cào là mồi tươi rất tốt, giúp chim sung.'],
      de: [1, 'Ăn được, cho lượng vừa phải.'],
      sauquy: [1, 'Ăn được nhưng chỉ nên ít. Sâu quy nhiều dễ làm khô, xoắn lông.'],
      trung: [1, 'Lòng đỏ trứng bổ đạm, cho lượng nhỏ.'],
      xuongmuc: [0, 'Không cần thiết với chào mào.'],
      com: [-1, 'Cơm, bánh mì không phải thức ăn của chào mào, dễ chua, gây rối loạn tiêu hóa.'],
    },
    needs: { fresh: true, protein: true, mineral: false },
    sun: [15, 40], bathGap: 2, maxBath: 1, shy: false, foodSensitive: false, territorial: false,
    moltAvoid: ['sauquy', 'chuoi'],
    tips: [
      'Thức ăn chính là cám chuyên dụng cho chào mào, thay mới hằng ngày.',
      'Bổ sung trái cây (chuối, ớt chín, cà chua) và mồi tươi như cào cào.',
      'Sâu quy chỉ cho ít: ăn nhiều dễ làm lông khô, xoắn.',
      'Phơi nắng sáng khoảng 15–30 phút, tránh nắng trưa.',
      'Mùa thay lông: tắm nắng, tắm nước đều; tránh sâu, chuối, cám kích lửa; không mang đi thi; không đổi lồng.',
      'Phần lớn chào mào ngoài chợ bị bẫy từ tự nhiên. Chỉ nhận chim nuôi sinh sản có nguồn gốc rõ ràng.',
    ],
    model: {
      size: 1, tail: 1.1,
      colors: { body: '#6E5E4A', belly: '#EFEBE1', head: '#1B1A1A', wing: '#5E503E', tail: '#5A4B39', bill: '#151515', legs: '#3A3230', cheek: '#C8302A', whiteCheek: '#F3F0E8', vent: '#C8302A' },
      crest: true,
      // Non: chưa có túm lông đỏ sau mắt, mào ngắn, lông dưới đuôi cam hồng nhạt thay vì đỏ, lưng nâu nhạt hơn
      juvenile: { colors: { body: '#7D6C56', wing: '#6B5C48', cheek: null, vent: '#E5A27C' }, crestK: 0.55 },
    },
  },

  sao: {
    name: 'Sáo mỏ ngà', short: 'sáo', latin: 'Acridotheres grandis',
    lv: 1, lvText: 'Dễ', wild: true,
    blurb: 'Thông minh, ăn tạp, có thể bắt chước tiếng người. Hơi dữ, cần kiên nhẫn để thuần.',
    voice: 'Kêu lách chách, ríu rít lẫn tiếng rè, tiếng huýt và tiếng lục cục trong cổ. Bắt chước được tiếng người.',
    metab: 0.23, skill: 'talk', best: 'tonghop',
    staple: { vien: 0.6, ke: 0.2, cm: 0.8, khuyen: 0.6, sau: 0.8, tonghop: 1 },
    food: {
      chuoi: [2, 'Sáo rất thích chuối chín.'],
      ot: [1, 'Ăn được.'],
      tao: [1, 'Ăn được, cắt nhỏ.'],
      rau: [0, 'Sáo ít ăn rau.'],
      caocao: [2, 'Cào cào giàu đạm, sáo rất thích.'],
      de: [2, 'Dế là mồi tốt cho sáo.'],
      sauquy: [1, 'Ăn được, không nên quá nhiều.'],
      trung: [2, 'Trứng luộc là món bổ cho sáo.'],
      xuongmuc: [0, 'Không cần thiết.'],
      com: [0, 'Sáo ăn tạp nên ăn được chút cơm, nhưng không thay được cám và mồi.'],
    },
    needs: { fresh: true, protein: false, mineral: false },
    sun: [15, 45], bathGap: 2, maxBath: 1, shy: false, foodSensitive: false, territorial: false, moltAvoid: [],
    words: ['Xin chào', 'Có khách', 'Ăn cơm chưa', 'Sáo đây', 'Chào buổi sáng'],
    tips: [
      'Ăn tạp: cám tổng hợp làm nền, thêm chuối, trứng, cào cào, dế.',
      'Thích tắm, nên cho tắm thường xuyên vào buổi sáng.',
      'Muốn sáo nói được cần trò chuyện đều đặn khi chim đã dạn người.',
      'Sáo khá dữ: tiếp cận từ từ, không bắt nắm khi chim còn sợ.',
      'Sáo hoang dã cũng bị bẫy bán nhiều; chọn nguồn nuôi sinh sản.',
    ],
    model: {
      size: 1.15, tail: 0.9,
      colors: { body: '#28282E', belly: '#303038', head: '#1E1E23', wing: '#222228', tail: '#1F1F25', tailTip: '#EFEBE0', bill: '#EFE5C3', legs: '#D9B64A', wingPatch: '#EFEBE0' },
      tuft: true,
      // Non: lông nâu xám chưa đen tuyền, chỏm lông trán còn ngắn, mỏ và chân nhạt màu
      juvenile: { colors: { body: '#4A433D', head: '#433D38', wing: '#45403A', belly: '#57504A', tail: '#3D3833', bill: '#E9E0BE', legs: '#CDB66A' }, crestK: 0.4 },
    },
  },

  chichchoe: {
    name: 'Chích chòe than', short: 'chích chòe', latin: 'Copsychus saularis',
    lv: 2, lvText: 'Trung bình', wild: true,
    blurb: 'Đuôi dài vểnh, lông đen trắng. Hót hay, tính lãnh thổ mạnh, cần mồi côn trùng.',
    voice: 'Giọng to, nhiều kiểu: tiếng huýt dài lên xuống rất ngọt xen tiếng láy nhanh; hót nhiều nhất lúc sáng sớm.',
    metab: 0.24, skill: 'song', best: 'sau',
    staple: { vien: 0, ke: 0, cm: 0.5, khuyen: 0.4, sau: 1, tonghop: 0.6 },
    food: {
      chuoi: [0, 'Chích chòe ăn côn trùng là chính, ít ăn trái cây.'],
      ot: [0, 'Không phải thức ăn của chích chòe.'],
      tao: [0, 'Chích chòe ít ăn trái cây.'],
      rau: [0, 'Chích chòe không ăn rau.'],
      caocao: [2, 'Cào cào là mồi tươi rất tốt cho chích chòe.'],
      de: [2, 'Dế là mồi chính, giúp chim sung.'],
      sauquy: [1, 'Ăn được, cho vừa phải.'],
      trung: [1, 'Bổ sung đạm, lượng nhỏ.'],
      xuongmuc: [0, 'Không cần thiết.'],
      com: [-1, 'Chích chòe là chim ăn côn trùng, cơm gây rối loạn tiêu hóa.'],
    },
    needs: { fresh: false, protein: true, mineral: false },
    sun: [10, 30], bathGap: 2, maxBath: 1, shy: false, foodSensitive: true, territorial: true, moltAvoid: [],
    tips: [
      'Là chim ăn côn trùng: cám giàu đạm kèm mồi sống (dế, cào cào) mỗi ngày.',
      'Đổi cám phải trộn dần cám cũ và mới, đổi đột ngột chim dễ bỏ ăn.',
      'Tính lãnh thổ cao: chọn vị trí treo lồng cố định, không di chuyển tùy tiện.',
      'Tắm mỗi ngày hoặc cách ngày; sau tắm hong lông nơi thoáng mát.',
      'Không cần phơi nắng lâu, tránh nắng gắt.',
      'Kiểm tra phân: phân khô, có phần trắng và phần đen là tiêu hóa tốt.',
    ],
    model: {
      size: 1, tail: 1.6,
      colors: { body: '#1C1D22', belly: '#F1F0EB', head: '#17181C', wing: '#1E1F24', wingBar: '#F1F0EB', tail: '#141519', tailEdge: '#F1F0EB', bill: '#111111', legs: '#2C2C30' },
      lowBelly: true, tailUp: true,
      // Non: lưng đầu nâu xám chưa đen bóng, ngực lốm đốm vảy nâu cam; vạch cánh trắng đã có
      juvenile: { colors: { body: '#4C4540', head: '#4F4741', wing: '#433D38', belly: '#E6D9C3', throat: '#B88F63', tail: '#2E2A27' }, scalyBreast: true },
    },
  },

  khuyen: {
    name: 'Vành khuyên', short: 'vành khuyên', latin: 'Zosterops sp.',
    lv: 3, lvText: 'Khó', wild: true,
    blurb: 'Chim nhỏ lông vàng lục, vòng mắt trắng, giọng líu lo. Nhỏ nên rất nhạy cảm.',
    voice: 'Giọng cao, mảnh, líu lo rất nhanh thành chuỗi dài liền mạch; tiếng gọi "chíu" mảnh và trong.',
    metab: 0.32, skill: 'song', best: 'khuyen',
    staple: { vien: 0, ke: 0, cm: 0.6, khuyen: 1, sau: 0.3, tonghop: 0.4 },
    food: {
      chuoi: [2, 'Chuối chín nghiền là món khuyên rất thích.'],
      ot: [1, 'Ăn được, cắt thật nhỏ.'],
      tao: [2, 'Đu đủ, táo mềm rất hợp với khuyên.'],
      rau: [0, 'Khuyên ít ăn rau lá.'],
      caocao: [-1, 'Cào cào quá to so với mỏ khuyên.'],
      de: [-1, 'Dế quá to so với khuyên.'],
      sauquy: [0, 'Chỉ ăn được sâu nhỏ, cắt nhỏ, rất ít.'],
      trung: [1, 'Lòng đỏ trứng trộn cám bổ đạm.'],
      xuongmuc: [0, 'Không cần thiết.'],
      com: [-1, 'Cơm, bánh mì không hợp, dễ gây rối loạn tiêu hóa.'],
    },
    needs: { fresh: true, protein: false, mineral: false },
    sun: [10, 20], bathGap: 1, maxBath: 2, shy: true, foodSensitive: true, territorial: false, moltAvoid: [],
    tips: [
      'Cám khuyên loại mịn làm nền, bổ sung trái cây mềm (chuối, đu đủ) hằng ngày.',
      'Chim nhỏ, trao đổi chất nhanh: máng không bao giờ được trống.',
      'Rất thích tắm, có thể tắm mỗi ngày vào buổi sáng.',
      'Nhạy cảm với lạnh và gió lùa: trùm áo lồng ban đêm.',
      'Có hai loại phổ biến là khuyên xanh và khuyên vàng; đa số bị bẫy từ tự nhiên.',
    ],
    model: {
      size: 0.62, tail: 0.85,
      colors: { body: '#8DAE3A', belly: '#DCE1B0', head: '#93B43E', throat: '#E8CF2E', wing: '#7A9A30', tail: '#6E8A2C', bill: '#2B2B2B', legs: '#5A5A5A', eyeRing: '#FFFFFF' },
      // Non: xanh xỉn hơn, họng vàng nhạt, vòng mắt trắng còn mảnh, chưa khép kín
      juvenile: { colors: { body: '#93A852', head: '#97AC55', throat: '#DCCF6E', wing: '#82974A', eyeRing: '#E4E6D8' }, ringK: 0.45 },
    },
  },

  hoami: {
    name: 'Họa mi', short: 'họa mi', latin: 'Garrulax canorus',
    lv: 3, lvText: 'Khó', wild: true,
    blurb: 'Lông nâu, viền mắt trắng kéo dài như vẽ mi. Giọng hót vang, tính nhát.',
    voice: 'Giọng vang, ấm, rất nhiều kiểu; mỗi câu thường lặp lại 2–4 lần rồi mới đổi sang câu khác.',
    metab: 0.23, skill: 'song', best: 'sau',
    staple: { vien: 0, ke: 0, cm: 0.5, khuyen: 0.4, sau: 1, tonghop: 0.7 },
    food: {
      chuoi: [1, 'Ăn được, lượng vừa phải.'],
      ot: [0, 'Họa mi ít hứng thú.'],
      tao: [1, 'Ăn được, cắt nhỏ.'],
      rau: [0, 'Họa mi không ăn rau.'],
      caocao: [2, 'Cào cào là mồi tốt cho họa mi.'],
      de: [2, 'Dế giúp họa mi sung, hót nhiều.'],
      sauquy: [1, 'Ăn được, vừa phải.'],
      trung: [2, 'Trứng luộc rất bổ cho họa mi.'],
      xuongmuc: [0, 'Không cần thiết.'],
      com: [-1, 'Không hợp, dễ chua, rối loạn tiêu hóa.'],
      doman: [-3, 'Họa mi rất kỵ đồ mặn.'],
    },
    needs: { fresh: false, protein: true, mineral: false },
    sun: [10, 30], bathGap: 2, maxBath: 1, shy: true, foodSensitive: true, territorial: false, moltAvoid: [],
    tips: [
      'Cám giàu đạm làm nền, thêm mồi tươi và trứng.',
      'Không đổi thức ăn đột ngột: chim dễ bỏ ăn, suy nhược.',
      'Rất kỵ đồ mặn; thức ăn phải sạch, không nấm mốc, nước thay mỗi ngày.',
      'Chim mới về dễ “ngã nước”: xù lông, ủ rũ. Trùm áo lồng, để yên tĩnh vài ngày.',
      'Sau mùa hót là mùa thay lông, chim yếu nhất: không mang đi chọi, đi thi.',
    ],
    model: {
      size: 1.05, tail: 1.2,
      colors: { body: '#9E6B37', belly: '#C59B63', head: '#93622F', wing: '#875A2C', tail: '#7E5428', bill: '#D8B03C', legs: '#C9A86A', eyeRing: '#F4F0E6' },
      brow: true,
      // Non: nâu xỉn, vệt mi trắng sau mắt còn mờ, mỏ nhạt
      juvenile: { colors: { body: '#A47C52', head: '#9A7450', belly: '#BFA07A', eyeRing: '#C9B79A', bill: '#D9C27A' } },
    },
  },
};

// Bổ sung đánh giá chung (đồ mặn, đồ độc) cho loài nào chưa ghi đè.
for (const sp of Object.values(SPECIES)) {
  for (const [k, v] of Object.entries(COMMON_FOOD)) if (!sp.food[k]) sp.food[k] = v;
}

export const SPECIES_ORDER = ['yenphung', 'chaomao', 'sao', 'chichchoe', 'khuyen', 'hoami'];
