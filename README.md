# Lồng Tre: giả lập nuôi chim cảnh 3D

Game giáo dục giúp người Việt học cách chăm chim cảnh đúng cách. Người chơi nuôi một chú chim trong 14 ngày, trong một nhà ống Việt Nam dựng bằng Three.js (sân, hiên, phòng khách có bàn thờ, bếp). Mọi quyết định (cho ăn gì, phơi nắng lúc nào, treo lồng ở đâu, dọn lồng ra sao) đều có hệ quả, và nhật ký giải thích vì sao đúng hay sai dựa trên nghiên cứu ở `docs/RESEARCH.md`.

## Chạy thử

Cần Node.js 18 trở lên.

```bash
npm install
npm run dev            # máy chủ phát triển, mở http://localhost:5173
npm test               # chạy bộ test logic (Vitest)
npm run build          # bản deploy nhiều file  -> dist/
npm run build:single   # bản 1 file HTML duy nhất -> dist-single/index.html
```

Mở trang với `#debug` (ví dụ `http://localhost:5173/#debug`) để truy cập `window.lt` (game, world, hud, modals) từ console.

## Tính năng

- 6 loài: vẹt yến phụng, chào mào, sáo mỏ ngà, chích chòe than, vành khuyên, họa mi. Mỗi loài có thức ăn chính, món ăn thêm, nhu cầu nắng, tắm, tính cách khác nhau.
- Mô phỏng theo từng phút: đói, khát, độ sạch nước, vệ sinh lồng, sức khỏe, tâm trạng, độ thân thiết, độ sung, chất lượng lông.
- 7 bệnh phát sinh từ nguyên nhân thật: tiêu chảy, cảm lạnh, rận mạt, sốc nhiệt, ngã nước, ngộ độc khí, ngộ độc thức ăn.
- Sự kiện gia đình có lựa chọn: thắp nhang, chảo chống dính bốc khói, khách cho ăn bánh, mèo rình, rủ đi cà phê chim, gió mùa, khói thuốc, karaoke hàng xóm, trẻ con gõ lồng, trời nồm, chuột, mất điện ngày nóng, hội thi chim hót, hàng xóm sang nghe chim nói.
- Giọng hót 5 cấp (từ "Chưa ra giọng" đến "Giọng vàng") tăng theo cách chăm; "Cho nghe giọng mồi" để luyện giọng (vừa phải, tối đa 2 lần mỗi ngày); hội thi chim hót sau mùa thay lông.
- "Việc hôm nay" khớp với cách chấm điểm cuối ngày; 11 thành tựu lưu qua nhiều ván.
- Chim mới về cần yên tĩnh 3 ngày; mùa thay lông từ ngày 6 đến ngày 10; đổi thức ăn có thể trộn dần.
- Chấm điểm an toàn cho người nuôi (phòng bệnh sốt vẹt khi dọn lồng).
- Tiếng hót tổng hợp bằng Web Audio, không dùng file ghi âm: mỗi loài một "ngữ pháp" tiếng hót riêng theo cách hót thật, mỗi con một giọng hơi khác, hay hơn khi lên cấp; có tiếng gọi khi đói, hoảng, ốm; loài nói đọc câu đã học (giọng đọc tiếng Việt của máy nếu có); âm thanh mưa, gió, ve sầu, dế; tiếng thao tác. Nghe thử từng loài ở màn hình chọn chim và Sổ tay.
- Cảnh 3D thủ tục, không dùng file model ngoài: chim có lông tơ nhiều lớp (shell) mềm như lông thật, viền sáng ở mép dáng, mắt to long lanh hai đốm sáng, mỏ trơn, đuôi có khối; hoạt ảnh nhảy cầu, hót, ngủ, xù lông, rũ nước; mặt trời chạy theo giờ, bóng đổ, mưa, đèn ban đêm.
- Bong bóng nhu cầu nổi trên đầu chim (máng sắp hết, nước bẩn, lồng bẩn, chim ốm, tối chưa trùm áo); chạm vào là làm luôn. Chế độ "Ngắm chim" ẩn các bảng để ngắm cảnh.
- Chạm vào cóng nước, máng ăn, khay lồng, áo lồng hoặc con chim trong cảnh 3D để thao tác nhanh.
- Giao diện phong cách Việt (giấy dó, tre, sơn mài, chàm), biểu tượng SVG, thông báo nổi, biểu đồ tổng kết. Desktop có bảng nổi hai bên, điện thoại có bảng tab phía dưới. Hỗ trợ chế độ sáng tối, giảm chuyển động.
- Phím tắt: 1–0 các việc chính, Q quan sát, Y thú y, C chờ, N ngủ, phím cách tạm dừng, M âm thanh, V góc nhìn, H ngắm chim (ẩn bảng), S Sổ tay.
- Tự lưu tiến trình vào localStorage.

## Kiến trúc

```
src/
  config.js            Hằng số cân bằng game
  data/                Dữ liệu thuần, không logic
    species.js         6 loài: dinh dưỡng, tập tính, thông số mô hình 3D
    foods.js           Thức ăn chính, món ăn thêm, đồ độc
    diseases.js        Bệnh: dấu hiệu, nguyên nhân, cách phòng
    locations.js       Chỗ treo lồng (tọa độ trong cảnh 3D)
    weather.js         Thời tiết
    handbook.js        Nội dung Sổ tay
    song.js            5 cấp giọng hót
  core/                Logic game, không phụ thuộc DOM hay Three.js
    Game.js            Điều phối: thời gian, hành động, sự kiện, ngày
    simulation.js      Mô phỏng từng phút
    actions.js         Hành động người chơi
    householdEvents.js Sự kiện gia đình có lựa chọn
    dayCycle.js        Tổng kết ngày, bắt đầu ngày, tổng kết cuối game
    goals.js           Việc hôm nay
    achievements.js    Thành tựu lưu qua nhiều ván
    state.js, rng.js, EventBus.js, save.js, util.js
  audio/               Web Audio, không phụ thuộc DOM ngoài AudioContext
    SoundEngine.js     Đường tín hiệu, hiệp hót, tiếng gọi, nghe thử, cài đặt âm lượng
    songs.js           Ngữ pháp tiếng hót từng loài, tiếng gọi (hàm thuần, test được)
    synth.js           Bộ phát nốt, vang phòng
    ambience.js        Âm thanh môi trường
    sfx.js             Tiếng thao tác
  render/              Three.js
    World.js           Renderer, camera, picking, đồng bộ trạng thái
    House.js           Nhà ống cắt lớp và cây treo lồng
    Cage.js            Lồng tre mái vòm, cóng, áo lồng
    Bird.js            Chim dựng thủ tục và hoạt ảnh
    Sky.js             Bầu trời, mặt trời, ánh sáng, mưa
    textures.js        Texture vẽ bằng canvas (gạch bông, ngói, vải chàm...)
    thumbnails.js      Ảnh 3D các loài cho màn hình chọn chim
  ui/                  Giao diện DOM
    Hud.js, Modals.js, icons.js, styles.css
tests/                 Kịch bản chơi tự động, test ngữ pháp tiếng hót
docs/                  RESEARCH.md, GAME_DESIGN.md, GAME_RESEARCH.md (bài học từ game cùng thể loại)
```

Luồng dữ liệu một chiều: UI gọi `game.act(id, payload)`; `Game` chạy logic rồi phát sự kiện `change`, `log`, `event`, `report`, `final`, `over` qua `EventBus`; `World` và `Hud` chỉ đọc trạng thái để vẽ. Nhờ tách lớp `core`, toàn bộ luật chơi test được trên Node bằng RNG có seed.

## Mở rộng

- Thêm loài: thêm một mục vào `src/data/species.js` (dinh dưỡng và `model` 3D) và vào `SPECIES_ORDER`.
- Thêm sự kiện: thêm một mục vào `HOUSEHOLD_EVENTS` trong `src/core/householdEvents.js`.
- Thêm món ăn: thêm vào `FOODS` và đánh giá trong `food` của từng loài.
- Cân bằng: chỉnh `src/config.js` và hệ số trong `simulation.js`, rồi chạy `npm test`.

## Lưu ý

Game rút gọn thời gian (thay lông ngoài đời kéo dài 1–2 tháng) và đơn giản hóa nhiều chi tiết sinh học. Các con số như số phút phơi nắng là xấp xỉ để chơi được. Với chim thật, hãy hỏi bác sĩ thú y và người nuôi lâu năm.
