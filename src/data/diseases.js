export const DISEASES = {
  tieu_chay: {
    name: 'Tiêu chảy', dmg: 0.035,
    early: 'Phân hơi nhão, chim uống nước nhiều hơn thường lệ, ăn chậm lại.', course: 5, // dấu hiệu lúc ủ bệnh; số ngày thuốc khi phát rõ
    sign: 'Phân lỏng, dính bẩn quanh hậu môn, chim ủ rũ.',
    cause: 'Nước bẩn, đồ ăn ôi thiu hoặc cám để lâu bị ẩm mốc.',
    prevent: 'Thay nước và rửa cóng mỗi ngày, dọn đồ tươi thừa sau vài giờ, thay cám mới hằng ngày.',
  },
  cam_lanh: {
    name: 'Cảm lạnh, khò khè', dmg: 0.03,
    early: 'Chim hay xù lông, thỉnh thoảng hắt hơi khẽ, ít nhảy cầu.', course: 5, // dấu hiệu lúc ủ bệnh; số ngày thuốc khi phát rõ
    sign: 'Xù lông, thở khò khè, hắt hơi, rúc đầu vào lưng.',
    cause: 'Ướt lông khi trời lạnh, tắm muộn, gió lùa ban đêm.',
    prevent: 'Tắm buổi sáng hoặc đầu giờ chiều, hong khô lông, trùm áo lồng và tránh gió lùa ban đêm.',
  },
  ran_mat: {
    name: 'Rận mạt, sâu lông', dmg: 0.02,
    early: 'Chim rỉa lông nhiều hơn mọi ngày, hay gãi đầu vào nan lồng.', course: 4, // dấu hiệu lúc ủ bệnh; số ngày thuốc khi phát rõ
    sign: 'Chim ngứa ngáy, rỉa lông liên tục, lông xơ, rụng quanh mắt.',
    cause: 'Lồng bẩn lâu ngày, ít được tắm.',
    prevent: 'Dọn khay phân hằng ngày, vệ sinh lồng định kỳ, cho tắm đều.',
  },
  say_nang: {
    name: 'Sốc nhiệt', dmg: 0.06,
    early: 'Chim đứng há mỏ, hơi xòe cánh, uống nước liên tục.', course: 3, // dấu hiệu lúc ủ bệnh; số ngày thuốc khi phát rõ
    sign: 'Há mỏ thở dốc, xòe cánh, đứng lả đi.',
    cause: 'Phơi nắng trưa gắt hoặc hết nước uống ngày nóng.',
    prevent: 'Chỉ phơi nắng sáng sớm, luôn đủ nước, treo lồng nơi thoáng mát khi trời nóng.',
  },
  nga_nuoc: {
    name: 'Ngã nước (sốc môi trường)', dmg: 0.04,
    early: 'Chim ít ăn, giật mình khi có người, đứng nép một góc lồng.', course: 4, // dấu hiệu lúc ủ bệnh; số ngày thuốc khi phát rõ
    sign: 'Xù lông, ủ rũ, bỏ ăn, hoảng loạn đập lồng.',
    cause: 'Chim mới về bị làm phiền nhiều, không được trùm áo lồng, để yên tĩnh.',
    prevent: 'Vài ngày đầu trùm áo lồng, để nơi yên tĩnh, ít tiếp xúc, cho thức ăn quen thuộc.',
  },
  khi_doc: {
    name: 'Ngộ độc khí, tổn thương hô hấp', dmg: 0.08,
    early: 'Chim thở hơi nhanh, đuôi nhấp nhẹ theo nhịp thở.', course: 5, // dấu hiệu lúc ủ bệnh; số ngày thuốc khi phát rõ
    sign: 'Thở khó, há mỏ, xù lông, đứng chao đảo trên cầu.',
    cause: 'Khói từ chảo chống dính bị đun quá nóng, khói dầu mỡ, khói nhang, khói thuốc lá.',
    prevent: 'Không treo lồng trong hoặc sát bếp, không để chảo chống dính khô cạn trên lửa lớn, giữ chim xa khói nhang, khói thuốc.',
  },
  ngo_doc: {
    name: 'Ngộ độc thức ăn', dmg: 0.09,
    early: 'Chim lờ đờ, run nhẹ.', course: 2, // dấu hiệu lúc ủ bệnh; số ngày thuốc khi phát rõ
    sign: 'Run rẩy, lờ đờ, nôn trớ.',
    cause: 'Ăn thức ăn độc với chim như bơ, sô cô la, hành, tỏi.',
    prevent: 'Không bao giờ cho chim ăn bơ, sô cô la, hành, tỏi, cà phê, rượu, đồ nhiều muối.',
  },
};

export const RISK_KEYS = ['tieu_chay', 'cam_lanh', 'ran_mat', 'say_nang', 'nga_nuoc', 'khi_doc'];
