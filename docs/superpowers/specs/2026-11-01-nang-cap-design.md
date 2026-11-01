# Nâng cấp Lồng Tre: giao diện, tiếng hót, gameplay, đồ họa 3D

Ngày 01/11/2026. Người dùng yêu cầu: "nâng cấp toàn bộ giao diện, nâng cấp tiếng hót của từng loại chim, nâng cấp triệt để game; đừng hỏi gì cả". Mọi quyết định thiết kế trong tài liệu này là do Claude tự chọn.

## 1. Ý đồ

Lồng Tre là game giáo dục: người chơi học chăm chim cảnh qua hệ quả. Bản nâng cấp giữ nguyên tinh thần đó (mọi cơ chế mới đều phải dạy một điều đúng ngoài đời) và làm game:

- **Có tiếng**: mỗi loài có tiếng hót tổng hợp riêng, dựa trên cấu trúc tiếng hót thật; có tiếng gọi, âm thanh môi trường, hiệu ứng thao tác. Trước đây game câm hoàn toàn.
- **Đẹp và rõ hơn**: giao diện mang chất Việt (tre, sơn mài, vải chàm, gạch bông), có biểu tượng, hướng dẫn việc trong ngày, thông báo nổi, phím tắt.
- **Sâu hơn**: chỉ số giọng hót và luyện giọng mồi, hội thi chim hót, sự kiện gia đình mới, thành tựu qua nhiều ván.
- **Sống động hơn**: chim 3D mổ thức ăn, uống nước, rỉa lông, hót khớp với tiếng, mỗi loài có dáng điệu riêng.

## 2. Không làm (non-goals)

- Không dùng file ghi âm tiếng chim ngoài (bản quyền, phải tải về); tiếng hót **tổng hợp bằng Web Audio**.
- Không thêm thư viện npm mới. Three.js đã có (gồm `three/addons`).
- Không làm sinh sản, tiền/cửa hàng, nhiều chim cùng lúc, đa ngôn ngữ (ghi ở GAME_DESIGN "Hướng phát triển").
- Không phá save cũ: bản lưu cũ phải mở được (bổ sung trường còn thiếu).

## 3. Phân công và quyền sở hữu file

Bốn mảng làm song song trong cùng thư mục. **Mỗi mảng chỉ sửa file của mình.** Cần thay đổi ở file của mảng khác thì ghi vào báo cáo cuối để người tích hợp làm.

| Mảng | Sở hữu |
|---|---|
| Giao diện (UI) | `index.html`, `src/ui/**` (được thêm file mới trong `src/ui/`) |
| Âm thanh (Audio) | `src/audio/**` |
| Gameplay (Core) | `src/core/**`, `src/data/**`, `src/config.js`, `tests/**`, `docs/GAME_DESIGN.md` |
| Đồ họa 3D (Render) | `src/render/**` |
| Người tích hợp | `src/main.js`, `README.md`, `vite.config.js`, `package.json`, tài liệu này |

## 4. Hợp đồng chung (đã nối dây sẵn trong `src/main.js`)

### 4.1 Trạng thái và dữ liệu mới

- `S.song` (0–100): giọng hót của chim hót (`sp.skill === 'song'`), khởi tạo 12; loài nói (`'talk'`) giữ 0. Đã thêm vào `createState`.
- `src/data/song.js`: `SONG_LEVELS` (5 cấp: tên, mô tả, ngưỡng `min`) và `songLevel(v) -> 0..4`. Dùng chung cho cả 3 mảng.
- `sp.voice` (chuỗi): mô tả tiếng hót mỗi loài trong `src/data/species.js`.
- Core sẽ thêm: `S.today.tutor` (số lần nghe giọng mồi hôm nay), `S.today.sang` (số lần hót hôm nay), `S.contest` (kết quả hội thi, `null` nếu chưa thi).

### 4.2 Sự kiện trên `game.bus`

| Sự kiện | Dữ liệu | Ai phát | Ai nghe (main.js) |
|---|---|---|---|
| `change` | – | Game | `world.sync(S)`, `hud.render()`, `audio.sync(S)` |
| `act` | `{ id, payload }` | `Game.act` sau khi hành động chạy xong (đã làm) | `audio.onAct(id, payload, S)`, `world.onAct(id, payload)` |
| `event` | sự kiện gia đình | Game | `modals.event(ev)`, `audio.onAct('event:'+ev.id, null, S)`, `world.onAct('event:'+ev.id)` |
| `log` | `{ d, t, type, text }` | Game | `hud.onLog(entry)` |
| `achievement` | `[{ id, name, desc, em }]` thành tựu **mới** mở | Core thêm | `hud.onAchievement(list)` |
| `report`, `final`, `over` | như cũ | Game | Modals như cũ |

### 4.3 `SoundEngine` (`src/audio/SoundEngine.js`)

```js
const audio = new SoundEngine();
audio.unlock();                 // gọi trong thao tác người dùng (main.js gọi ở mọi pointerdown/keydown); tạo hoặc resume AudioContext
audio.muted; audio.setMuted(b); // lưu localStorage 'longtre-audio-v1'
audio.volume; audio.setVolume(v)// 0..1, lưu như trên
audio.sync(S);                  // gọi mỗi 'change': tiếng hót, tiếng gọi, âm thanh môi trường
audio.onAct(id, payload, S);    // hiệu ứng thao tác; id có thể là 'event:<id>'
audio.preview(spKey, { level, onEnd }) -> stop()  // nghe thử tiếng hót một loài (màn hình chọn chim, Sổ tay)
audio.stopPreview();
audio.voiceLevel() -> 0..1      // biên độ tiếng hót/tiếng gọi chim đang phát, để mỏ 3D khớp tiếng
```

### 4.4 `World` (`src/render/World.js`), thêm

```js
world.setVoice(fn)        // fn() -> 0..1; main.js đã nối với audio.voiceLevel()
world.onAct(id, payload)  // hoạt ảnh phản hồi hành động hoặc 'event:<id>'
```

`renderBirdThumbnails()` vẫn trả `{ spKey: dataURL }`.

### 4.5 Giao diện

- `new Hud(game, world, modals, audio)` và `new Modals(game, audio)` (main.js đã truyền `audio`).
- `hud.onLog(entry)`: hiện thông báo nổi cho dòng nhật ký quan trọng.
- `hud.onAchievement(list)`: chúc mừng thành tựu mới.
- `window.lt = { game, world, hud, modals, audio }` khi chạy dev hoặc `#debug`.

### 4.6 Core, thêm

- `src/core/goals.js`: `dailyGoals(S, sp) -> [{ id, label, done, hint }]`, khớp cách chấm điểm của `endDay`.
- `src/core/achievements.js`: `ACHIEVEMENTS` (id -> `{ name, desc, em }`), `loadAchievements()` (id -> `{ at, sp }`), lưu localStorage riêng, không bị xóa khi hết ván.
- Hành động mới `tutor` ("Cho nghe giọng mồi"): chỉ cho loài hót.
- id sự kiện mới (giữ đúng id để UI gắn biểu tượng): `karaoke`, `treem`, `nom`, `chuot`, `matdien`, `thi` (hội thi chim hót, chỉ loài hót), `nghenoi` (khoe chim nói, chỉ loài nói).
- Không đổi chữ ký các API UI đang dùng: `Game` (`newGame`, `load`, `act`, `blocked`, `chooseEvent`, `nextDay`, `running`, `S`, `sp`, `pending`), `describeSigns`, `observe`, id hành động cũ, các export trong `src/data/`.

## 5. Chi tiết từng mảng

### 5.1 Âm thanh

- Mỗi loài một "ngữ pháp tiếng hót": các loại âm tiết (đường tần số, đường biên độ, âm sắc: huýt thuần, có họa âm, láy rung, lẫn tiếng ồn) ghép thành câu theo cách hót thật:
  - **Chào mào**: cụm 3–6 tiếng trong, luyến lên xuống, khoảng 1,5–3,5 kHz; con sung hót "đổ" dài.
  - **Chích chòe than**: tiếng huýt dài, ngọt, lên xuống 1,5–5 kHz xen tiếng láy; rất nhiều kiểu, ít lặp.
  - **Họa mi**: giọng vang ấm 1,2–4 kHz; mỗi motif lặp 2–4 lần rồi đổi.
  - **Vành khuyên**: cao, mảnh 3,5–7,5 kHz, chuỗi nốt rất nhanh liền mạch ("líu").
  - **Sáo mỏ ngà**: lách chách, rè, lục cục, xen tiếng huýt, 0,8–3 kHz, nhiều thành phần ồn.
  - **Yến phụng**: líu lo ríu rít liên tục, tiếng rè giàu họa âm, tiếng gọi "chiếp" điều tần.
- Cấp giọng (`songLevel(S.song)`) quyết định độ dài, độ phong phú, độ vang. Mỗi cá thể có giọng hơi khác (lấy theo tên chim).
- Hiệp hót bắt đầu khi `S.singUntil` tăng; độ dài tính theo giây thật (một hiệp game chỉ vài phút game, dưới 1 giây thật).
- Tiếng gọi suy ra từ trạng thái: đói, khát kêu chiêm chiếp; hoảng khi mèo rình; yếu khi ốm; im khi trùm áo ban đêm.
- Loài nói: khi có câu mới (`S.say`, `S.sayUntil`), đọc bằng `speechSynthesis` (giọng vi-VN, cao, nhanh) nếu có; không có thì phát tiếng líu lo giả giọng.
- Môi trường: mưa, gió lạnh, ve sầu trưa nóng, dế đêm, chim trời xa buổi sáng; trong nhà nghe khác ngoài sân (lọc và vang).
- Hiệu ứng thao tác nhẹ nhàng: đổ cám, đổ nước, dọn lồng, tắm, áo lồng, mang lồng.
- Tạm ngưng khi tab ẩn; tôn trọng tắt tiếng.

### 5.2 Gameplay

- Giọng hót tăng qua chăm sóc: cuối ngày cộng theo độ sung, tâm trạng, thân thiết, số lần hót, giọng mồi; giảm khi ốm; đứng yên khi thay lông.
- `tutor`: 20 phút; tối đa khoảng 2 lần/ngày có ích, nhiều hơn làm chim mệt; bị chặn khi trùm áo, ban đêm; thay lông thì nhắc không nên luyện nặng.
- Cấp giọng càng cao hót càng thường, hiệp càng dài; sáng sớm hót nhiều hơn.
- Việc hôm nay (`dailyGoals`), thành tựu, sự kiện mới, hội thi (sau mùa thay lông, kết quả theo giọng, độ sung, sức khỏe, lông; bài học: chỉ mang chim khỏe, không thi khi thay lông).
- Bản lưu cũ: `Game.load` bổ sung trường thiếu.
- Lựa chọn số 0 của mọi sự kiện là lựa chọn tốt (test tự động dựa vào điều này).

### 5.3 Giao diện

- Ngôn ngữ thiết kế Việt hiện đại: giấy dó, tre, sơn mài đỏ son và vàng, chàm; giữ chế độ sáng tối, giảm chuyển động, bàn phím, màn hình hẹp.
- Thanh trên: tiến độ 14 ngày, đồng hồ có mặt trời/mặt trăng, thời tiết có biểu tượng, tốc độ có biểu tượng, bật tắt âm thanh và âm lượng.
- Bảng chỉ số: thẻ chim, cấp giọng hót (loài hót) hoặc từ đã biết (loài nói), thanh chỉ số có biểu tượng và mũi tên tăng giảm.
- Bảng việc làm: nút có biểu tượng, phím tắt, "Việc hôm nay" có đánh dấu.
- Thông báo nổi cho nhật ký quan trọng và thành tựu.
- Màn hình chọn chim: nút nghe thử tiếng hót, mô tả giọng; Sổ tay có mục tiếng hót; tổng kết ngày có vòng điểm; tổng kết cuối có biểu đồ và bộ sưu tập thành tựu.

### 5.4 Đồ họa 3D

- Mỏ, họng, thân, đuôi chuyển động khớp `voice` khi hót.
- Hành vi: mổ máng khi ăn, uống cóng, rỉa lông, duỗi cánh; dáng điệu riêng từng loài (chích chòe vểnh đuôi, chào mào dựng mào, yến phụng gật gù, khuyên nhảy liên tục...).
- Phản hồi `onAct` và `event:meo` (hoảng, đập cánh).
- Cảnh: chim trời bay xa, bướm ban ngày, đom đóm ban đêm, bụi nắng, cây lay khi gió; giữ khung hình mượt trên máy yếu.
- Mô hình chim đẹp hơn nếu kịp, ảnh thu nhỏ màn hình chọn chim đẹp hơn.

## 6. Ràng buộc chung

- Chữ trong game bằng tiếng Việt có dấu, giọng văn như hiện tại.
- Code theo phong cách sẵn có: ES module, không TypeScript, chú thích tiếng Việt ngắn, đặt tên như code xung quanh.
- `npm test` phải xanh; `npm run build` phải thành công.
- Không để lại file thử nghiệm tạm trong dự án.
