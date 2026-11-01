// Nội dung Sổ tay trong game. Nguồn đầy đủ: docs/RESEARCH.md
export const HANDBOOK = [
  {
    id: 'daily', title: 'Việc hằng ngày',
    items: [
      'Thức ăn chính đúng loài, thay mới mỗi ngày, không để ẩm mốc.',
      'Rửa cóng, thay nước sạch mỗi ngày.',
      'Dọn khay phân hằng ngày; lồng bẩn là nơi rận mạt, vi khuẩn sinh sôi.',
      'Trái cây, mồi tươi cho vừa ăn, dọn phần thừa sau vài giờ.',
      'Phơi nắng sáng sớm 10–45 phút tùy loài, tránh nắng 11–15 giờ.',
      'Tắm bằng lồng tắm riêng vào buổi sáng hoặc đầu giờ chiều, rồi hong khô lông.',
      'Chim cần khoảng 10–12 tiếng ngủ yên tối: chập tối trùm áo lồng, treo nơi yên tĩnh, kín gió.',
    ],
  },
  {
    id: 'place', title: 'Chỗ treo lồng',
    items: [
      'Không treo lồng trong hoặc sát bếp. Chảo chống dính (PTFE) bị đun quá nóng tỏa khí không màu, không mùi có thể làm chim chết rất nhanh.',
      'Hệ hô hấp của chim rất nhạy: tránh khói nhang, khói thuốc lá, bình xịt, mùi sơn.',
      'Buổi tối tránh nơi có đèn, tivi ồn ào để chim ngủ đủ.',
      'Treo lồng cao, tránh mèo, chuột; trùm áo lồng ban đêm.',
      'Với loài có tính lãnh thổ như chích chòe, giữ vị trí treo cố định.',
    ],
  },
  {
    id: 'new', title: 'Chim mới về',
    items: [
      'Trùm áo lồng, để nơi yên tĩnh trong vài ngày đầu.',
      'Hạn chế tiếp xúc, chưa vội tắm hay luyện.',
      'Cho đúng thức ăn chim đã quen ở nơi bán; đổi thức ăn phải trộn dần.',
      'Cách ly chim mới khoảng 10 ngày trước khi đặt gần chim khác.',
      'Chim dễ bị “ngã nước”: xù lông, ủ rũ, bỏ ăn. Gặp dấu hiệu này cần giữ ấm và hỏi bác sĩ thú y.',
    ],
  },
  {
    id: 'age', title: 'Tuổi chim và giọng hót',
    items: [
      'Chim non trong tổ cần đút 20–30 phút một lần suốt ngày, giữ ấm, không tắm. Đừng bắt chim non từ tổ hoang, kể cả chim "rơi tổ": báo cơ sở cứu hộ.',
      'Chim chuyền (non mới rời tổ) đang tập tự ăn: thêm mồi mềm vài lần mỗi ngày, giữ ấm, chỉ tắm khi đã đậu và mổ vững.',
      'Lần thay lông đầu đời (khoảng 1–4 tháng sau khi rời tổ) chim khoác lông trưởng thành: chào mào mới có túm đỏ sau mắt và mào dài; yến phụng hết vằn ở trán, mắt có vòng trắng.',
      'Chim biết hót học giọng qua các bước: nghe và nhớ, líu ríu nhỏ trong cổ, tập hót còn đổi, rồi giọng mới "định". Chào mào thường định giọng sau một hai mùa.',
      'Chim tơ dễ "lai giọng": treo gần chim hót dở, tiếng ồn, tiếng huýt sáo thì học sai và rất khó sửa.',
      'Giọng mồi mỗi ngày tối đa 2 lần, mỗi lần 20–30 phút, vào 6:00–7:30 hoặc 15:00–16:30, loa cách lồng 2–3 m. Không mở cả ngày.',
      'Thường chỉ chim trống hót (chích chòe, họa mi, chào mào); chim mái hót ít hoặc không.',
      'Chim lâu năm giọng đã định, hót chắc nhưng khó học thêm; cần giữ ấm, giảm cường độ luyện.',
    ],
  },
  {
    id: 'fire', title: 'Độ lửa (độ sung)',
    items: [
      'Xuống lửa: mào cụp, lông hơi xù, hót rời rạc hoặc bỏ hót. Cần ăn đủ chất, nắng sớm, ngủ đủ, để yên tĩnh.',
      'Vừa lửa: lông ép gọn, đứng thẳng, nhảy cầu đều.',
      'Căng lửa: lông ép sát, đuôi vểnh, hót to và đều. Đây là lúc chim đẹp nhất.',
      'Quá lửa: nhảy loạn lồng, đập cánh, hót gắt. Ép nhiều mồi, thuốc kích lửa làm chim suy nhược, lông mới xoắn. Bớt mồi, bớt giọng mồi, cho tắm để hạ lửa.',
      'Khàn tiếng có thể là bệnh hô hấp, không phải lỗi luyện giọng: nên đưa đi bác sĩ thú y.',
    ],
  },
  {
    id: 'sick', title: 'Dấu hiệu bệnh',
    items: [
      'Xù lông, ủ rũ, lim dim, bỏ ăn.',
      'Đứng yên mà đuôi vẫn nhấp theo từng nhịp thở, hoặc ngủ đứng cả hai chân: chim đang khó thở hoặc rất mệt.',
      'Phân lỏng, đổi màu. Phân khỏe thường khô, có phần trắng và phần đen.',
      'Thở khó, khò khè, mắt mũi bẩn, sưng.',
      'Sụt cân, tự nhổ lông hoặc rụng lông bất thường.',
      'Chim thường che giấu bệnh đến khi đã nặng. Thấy dấu hiệu: cách ly, giữ ấm, đưa đến bác sĩ thú y. Không tự ý dùng kháng sinh.',
    ],
  },
  {
    id: 'molt', title: 'Thay lông',
    items: [
      'Chim trưởng thành thay lông mỗi năm, thường vào mùa thu; chim yếu và hót ít.',
      'Tắm nắng, tắm nước đều, dinh dưỡng đủ đạm và vitamin.',
      'Không mang chim đi thi, đi chọi, không đổi lồng trong lúc thay lông.',
      'Chào mào thay lông nên tránh sâu, chuối, cám kích lửa vì lông mới dễ quăn.',
    ],
  },
  {
    id: 'human', title: 'Sức khỏe người nuôi',
    items: [
      'Bệnh sốt vẹt (psittacosis) do vi khuẩn Chlamydia psittaci lây từ chim sang người, chủ yếu qua hít bụi phân, dịch tiết khô. Chim mang mầm bệnh có thể không có triệu chứng.',
      'Dọn lồng: đeo găng tay, lau bằng khăn ẩm để bụi phân không bay, rửa tay kỹ sau đó.',
      'Bị sốt, đau đầu, ho khan sau khi tiếp xúc chim: đi khám và báo bác sĩ là bạn có nuôi chim.',
      'Không treo lồng chim trong phòng ngủ.',
    ],
  },
  {
    id: 'law', title: 'Nguồn gốc và pháp luật',
    items: [
      'Nhiều loài chim cảnh ngoài chợ (chào mào, khuyên, chích chòe, họa mi, sáo) bị bẫy từ tự nhiên.',
      'Săn bắt, mua bán chim hoang dã trái phép là vi phạm pháp luật, có thể bị xử phạt hành chính hoặc truy cứu trách nhiệm hình sự tùy loài và mức độ.',
      'Chim hoang dã thông thường được coi là hợp pháp khi: khai thác có phép, nhập khẩu hợp pháp, mua lại sau tịch thu, sinh sản từ bố mẹ hợp pháp, hoặc mua lại từ người nuôi có hồ sơ hợp lệ.',
      'Ở TP Huế, kiểm lâm yêu cầu người mang chim cảnh đến quán cà phê chứng minh được nguồn gốc hợp pháp của chim.',
      'Chỉ thị 04/CT-TTg (2022) yêu cầu các giải pháp cấp bách bảo tồn chim hoang dã, chim di cư.',
      'Mua chim để phóng sinh cũng gián tiếp nuôi nạn bẫy chim.',
      'Người mới nên chọn loài nuôi sinh sản như vẹt yến phụng, hoặc chim từ trại nuôi sinh sản có giấy tờ.',
    ],
  },
];

export const DISCLAIMER = 'Game đã rút gọn thời gian và đơn giản hóa nhiều chi tiết. Với chim thật, hãy hỏi thêm bác sĩ thú y và người nuôi lâu năm.';
