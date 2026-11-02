# Lồng Tre: tài liệu game chi tiết

Tài liệu này mô tả toàn bộ game như code đang chạy ở nhánh `perf/giam-giat-lag` (commit `6893532`). Mọi con số, tên khóa và công thức lấy trực tiếp từ mã nguồn trong `src/`. Khi tài liệu và code khác nhau, code là đúng.

Tài liệu thiết kế cũ (`docs/GAME_DESIGN.md`) tập trung vào ý đồ và bài học. Tài liệu này tập trung vào cơ chế, dữ liệu và kiến trúc, đủ để người mới vào dự án dựng lại, cân bằng hoặc mở rộng game.

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Vòng chơi và đồng hồ](#2-vòng-chơi-và-đồng-hồ)
3. [Bắt đầu ván mới](#3-bắt-đầu-ván-mới)
4. [Trạng thái game](#4-trạng-thái-game)
5. [Các chỉ số](#5-các-chỉ-số)
6. [Mô phỏng từng phút](#6-mô-phỏng-từng-phút)
7. [Hành động của người chơi](#7-hành-động-của-người-chơi)
8. [Sáu loài chim](#8-sáu-loài-chim)
9. [Thức ăn](#9-thức-ăn)
10. [Bệnh, nguy cơ và liệu trình](#10-bệnh-nguy-cơ-và-liệu-trình)
11. [Thời tiết theo vùng và tháng](#11-thời-tiết-theo-vùng-và-tháng)
12. [Tuổi chim](#12-tuổi-chim)
13. [Tính cách từng con chim](#13-tính-cách-từng-con-chim)
14. [Giọng hót, độ lửa, giọng mồi, lai giọng](#14-giọng-hót-độ-lửa-giọng-mồi-lai-giọng)
15. [Học nói](#15-học-nói)
16. [Thay lông](#16-thay-lông)
17. [Chỗ treo lồng](#17-chỗ-treo-lồng)
18. [Sự kiện gia đình](#18-sự-kiện-gia-đình)
19. [Hội thi chim hót](#19-hội-thi-chim-hót)
20. [Tổng kết cuối ngày và cách chấm điểm](#20-tổng-kết-cuối-ngày-và-cách-chấm-điểm)
21. ["Việc hôm nay"](#21-việc-hôm-nay)
22. [Tổng kết cuối ván và thành tựu](#22-tổng-kết-cuối-ván-và-thành-tựu)
23. [Chế độ chơi](#23-chế-độ-chơi)
24. [Giao diện](#24-giao-diện)
25. [Cảnh 3D](#25-cảnh-3d)
26. [Âm thanh](#26-âm-thanh)
27. [Lưu trữ và đồng bộ](#27-lưu-trữ-và-đồng-bộ)
28. [Hội chim (Supabase)](#28-hội-chim-supabase)
29. [Kiến trúc mã nguồn](#29-kiến-trúc-mã-nguồn)
30. [Kiểm thử](#30-kiểm-thử)
31. [Build và deploy](#31-build-và-deploy)
32. [Hướng dẫn mở rộng và cân bằng](#32-hướng-dẫn-mở-rộng-và-cân-bằng)
33. [Phụ lục: bảng tra nhanh](#33-phụ-lục-bảng-tra-nhanh)

---

## 1. Tổng quan

**Lồng Tre** là game giả lập nuôi chim cảnh 3D, chạy trên trình duyệt, dựng bằng Three.js. Người chơi nuôi một con chim trong 14 ngày tại một nhà rường Việt Nam (sân gạch, hiên, phòng khách có bàn thờ, bếp).

**Mục tiêu giáo dục.** Dạy người mới nuôi chim các nguyên tắc chăm sóc quan trọng nhất bằng hệ quả, không bằng bài giảng. Người chơi học bằng cách làm sai, rồi đọc nhật ký giải thích nguyên nhân. Nội dung dựa trên nghiên cứu ở `docs/RESEARCH.md` và `docs/LIFECYCLE_RESEARCH.md`.

**Nguyên tắc thiết kế.**

- Hệ quả có nhân quả và suy ra được. Bệnh không bật ngẫu nhiên: điều kiện xấu cộng dồn "nguy cơ" theo phút, vượt ngưỡng mới phát bệnh.
- Nhật ký luôn giải thích vì sao đúng hay sai.
- Toàn bộ luật chơi nằm trong `src/core`, không phụ thuộc DOM hay Three.js, nên test được trên Node bằng bộ sinh số ngẫu nhiên có seed.
- Không dùng file model hay file âm thanh ngoài: cảnh 3D dựng bằng thủ tục, tiếng hót tổng hợp bằng Web Audio.

**Công nghệ.** Vite 5, Three.js 0.169, Vitest 2 (môi trường Node, `happy-dom` cho test giao diện), `@supabase/supabase-js` 2.118 cho Hội chim và đồng bộ bản lưu. Cần Node.js 18 trở lên.

**Phạm vi không làm (theo thiết kế hiện tại).** Tiền và cửa hàng, nhiều chim cùng lúc, sinh sản, chọi chim, mùa thay lông theo lịch thật, đa ngôn ngữ, tiếng hót thu âm.

---

## 2. Vòng chơi và đồng hồ

### 2.1 Cấu trúc 14 ngày

Hằng số trong `src/config.js`:

| Hằng số | Giá trị | Ý nghĩa |
|---|---|---|
| `TOTAL_DAYS` | 14 | Số ngày một ván |
| `DAY_START` | 06:00 (360 phút) | Ngày bắt đầu |
| `SLEEP_FROM` | 18:00 | Từ giờ này mới cho chim ngủ được |
| `LATE_SLEEP` | 20:30 | Ngủ sau mốc này bị chấm "ngủ hơi muộn" |
| `FORCE_SLEEP` | 22:00 | Tự kết thúc ngày, bị chấm lỗi nặng hơn |
| `TICK_MS` | 400 | Nhịp `setInterval` gọi `game.sync()` (giờ thật) |
| `NEW_BIRD_DAYS` | 3 | Số ngày chim mới về cần yên tĩnh |
| `MOLT_START` / `MOLT_END` | 6 / 11 | Mốc thay lông chuẩn (xem mục 16) |
| `MIX_DAYS` | 5 | Số ngày trộn dần khi đổi thức ăn chính |
| `SAVE_KEY` | `longtre-3d-save-v1` | Khóa localStorage của ván đang chơi |

Một ngày game dài 960 phút mô phỏng (06:00 đến 22:00). Một "phút" là một bước `stepMinute`.

Diễn biến mốc quan trọng: ngày 1 đến 3 chim mới về; ngày 5 hoặc 6 đến 10, 11, 12 thay lông tùy tuổi chim; ngày 14 tổng kết, danh hiệu, thành tựu.

### 2.2 Đồng hồ giờ thật

`main.js` tạo `new Game({ realtime: true })`. Ở chế độ này **một ngày game là một ngày ngoài đời**:

- Giờ game bám giờ máy: 06:00 đến 22:00 theo giờ thật. Ban đêm chim ngủ, người chơi chờ 06:00.
- Không tua, không dừng. Tắt game thì thời gian vẫn trôi và hậu quả vẫn tính. Mở lại thì `Game.sync()` chạy bù phần đã trôi.
- Khi vắng nhà hơn 2 phút (`away`), sự kiện gia đình trôi qua không ai xử lý, và tổng kết ngày tự qua khi trời đã sáng hôm sau.
- Việc làm có hiệu lực ngay. Việc dài từ 60 phút trở lên (đi thú y, đi cà phê chim, đi thi) đặt `S.busyUntil` và giữ người chơi bận đúng số phút thật. Trong lúc bận, `blocked()` trả "Đang bận việc trước… còn N phút".
- `anchorClock()` gắn ngày game vào giờ máy lúc tạo ván: nếu đang ngoài khung 06:00–22:00 thì ngày 1 bắt đầu 06:00 sáng tới, không chạy bù nửa ngày đã qua.

Khi `realtime = false` (mặc định, dùng trong test) thời gian chỉ trôi qua `advance(mins)`.

### 2.3 Luồng một ngày

1. `startDay`: tăng ngày, đặt giờ 06:00, tung thời tiết, tạo `today` mới, lên lịch sự kiện gia đình, mở hoặc đóng mùa thay lông, ghi nhật ký thời tiết kèm lời khuyên.
2. Người chơi thao tác, thời gian chạy từng phút (`stepMinute`). Gặp sự kiện gia đình thì game dừng chờ lựa chọn.
3. Người chơi bấm "Cho ngủ" (từ 18:00) hoặc đến 22:00 tự kết thúc: `endDay` chấm điểm và áp hệ quả qua đêm.
4. Hiện bảng tổng kết ✓/✗ kèm bài học. Bấm tiếp thì sang ngày sau. Nếu lưu giữa lúc xem tổng kết (`S.awaitingNext`), mở lại sẽ hiện lại bảng tổng kết.
5. Sau ngày 14: `finalSummary`, danh hiệu, thành tựu.

Ván kết thúc sớm nếu `S.health <= 0` (chim chết, `gameOver`).

---

## 3. Bắt đầu ván mới

Màn đón chim (`Modals.start`) cho chọn lần lượt:

1. **Loài** (6 loài, có nghe thử tiếng và ảnh 3D).
2. **Tuổi chim**: chim chuyền, trưởng thành, lâu năm (mục 12).
3. **Vùng** ("Nhà bạn ở đâu?"): Bắc, Trung (mặc định), Nam. Ảnh hưởng thời tiết (mục 11).
4. **Chế độ chơi**: Người mới (mặc định) hoặc Người chơi lâu năm (mục 23).
5. **Tên chim.**

Gọi `Game.newGame(sp, name, stage, opts)` với `opts = { mode, region, traits }`. `traits` chỉ dùng cho test; không truyền thì tung ngẫu nhiên.

Khi tạo ván:

- `createState` dựng trạng thái ban đầu (mục 4).
- Tính cách tung bằng RNG riêng `traitRng` (seed `seed + 1`), giữ qua các ván trong cùng phiên trang để mỗi ván một con chim khác, và không làm xô lệch dòng ngẫu nhiên của thời tiết và sự kiện.
- `S.known` ban đầu: `temper`, `appetite` chưa biết; `fire` coi là đã biết nếu không phải loài hót; `fav` coi là đã biết nếu không có món khoái.
- `S.startAt = game.now()`: mốc để suy ra tháng của từng ngày game.
- Thời tiết ngày 1: kiểu dịu phổ biến nhất của tháng (mục 11).
- Hai dòng nhật ký mở đầu: việc đầu tiên là đổ thức ăn chính và thay nước; chim mới về cần yên tĩnh khoảng 3 ngày.

---

## 4. Trạng thái game

`createState` (`src/core/state.js`) tạo đối tượng `S`. Nhóm trường:

**Định danh và thời gian**

| Trường | Ý nghĩa |
|---|---|
| `version` | Phiên bản trạng thái (hiện là 1) |
| `sp`, `name`, `stage` | Loài (khóa), tên chim, tuổi (`chuyen` / `truong` / `gia`) |
| `day`, `t` | Ngày hiện tại, phút trong ngày (360 = 06:00) |
| `dayAt` | (chế độ giờ thật) mốc ms của 06:00 ngày game hiện tại |
| `busyUntil` | (giờ thật) mốc ms người chơi rảnh lại |
| `startAt` | Mốc ms lúc đón chim, tính tháng cho thời tiết |
| `weather` | Khóa thời tiết hôm nay |
| `mode`, `region` | `moi` / `lau`; `bac` / `trung` / `nam` |

**Chỉ số (0–100)**

`hunger` 55, `water = { level 60, clean 75 }`, `cage` 85, `health` 85, `mood` 40, `trust` (theo tuổi), `vigor` 45, `feather` 75, `song` (theo tuổi; 0 nếu loài nói).

**Thức ăn và đồ tươi**

- `feeder = { type, amt, days, mixFrom, mixLeft }`: máng thức ăn chính. `amt` 0–100, `days` số đêm đã để, `mixFrom` và `mixLeft` cho giai đoạn trộn dần.
- `fresh = { f, age, spoiled } | null`: đồ tươi đang trong lồng (một món duy nhất).

**Vị trí và trạng thái**

`loc` (nơi treo cố định), `pos` (vị trí hiện tại, `san` khi đang phơi nắng), `covered` (áo lồng), `wet` (lông ướt sau tắm), `molt` (đang thay lông).

**Bệnh**

`sick` (null hoặc `{ type, since, phase, left, dosesLeft, dosedToday, relapsed }`), `sickCount` (số lần bệnh trong ván), `risk` (6 bộ đếm nguy cơ).

**Học và tiếng**

`words` (câu đã nói được), `talkProg` (tiến độ câu mới 0–100), `sangEver`, `singUntil`, `sayUntil`, `say`, `mix` ("lai giọng" 0–100), `contest` (`{ place, day }`).

**Mốc theo dõi**

`newDays` (còn bao nhiêu ngày chim mới), `lastBath`, `lastMineral`, `lastProtein` (ngày gần nhất), `ownerRisk` (số lần dọn khô), `bathFx`, `dryWarned`, `coachOff`, `lookDays` (các ngày đã quan sát kỹ).

**Tính cách**

`traits = { temper, appetite, fire, fav }`, `known = { temper, appetite, fire, fav }` (boolean).

**Lịch và nhật ký**

`schedule` (sự kiện gia đình hôm nay: id đến phút), `today` (bộ đếm trong ngày), `hist` (điểm các ngày đã qua), `log` (tối đa 120 dòng), `over`, `awaitingNext`.

**`today` (`newToday`)**: `staple`, `stapleW` (lượng và chất lượng thức ăn chính đã ăn), `refill`, `fresh`, `protein`, `sauquy`, `mineral`, `water`, `clean`, `dryClean`, `sunGood`, `sunAll`, `heat`, `baths`, `lateBath`, `bad` (món không phù hợp), `talks`, `moltBad`, `moves`, `events`, `tutor`, `tutorOff`, `sang`, `cafe`, `overFire`, `coldSun`.

**Tương thích bản lưu cũ.** `migrateState` bù mọi trường còn thiếu bằng giá trị mặc định (kể cả trường lồng nhau của `today`, `risk`, `feeder`, `water`, `traits`, `known`). Bệnh dạng cũ `{ type, since }` được coi là đã phát rõ (`phase: 'ro'`). Bản lưu không có tuổi coi là chim trưởng thành. Bản lưu chưa có `startAt` coi tháng là tháng 4.

---

## 5. Các chỉ số

Tất cả kẹp trong khoảng 0–100 (`clamp`), trừ `water` là hai thanh riêng.

| Chỉ số | Giảm khi | Tăng khi |
|---|---|---|
| **Ăn no** (`hunger`) | Theo thời gian: `chuyển hóa loài × hệ số tuổi × hệ số tính ăn × (0,7 nếu ốm)` mỗi phút | Tự ăn từ máng nếu thức ăn hợp; cho ăn đồ tươi |
| **Nước** (`water.level`) | 0,07 mỗi phút; 0,12 ngày nóng; thêm 0,04 khi phơi nắng | Thay nước (về 100) |
| **Độ sạch nước** (`water.clean`) | 0,05 mỗi phút; thêm 0,02 khi có đồ tươi trong lồng | Thay nước (về 100) |
| **Vệ sinh lồng** (`cage`) | 0,045 mỗi phút; đồ tươi ôi trừ thêm 0,03; tắm trừ 4 | Dọn lồng (về 100) |
| **Sức khỏe** (`health`) | Bệnh, đói (≤ 10), hết nước, đồ hại, thiếu dinh dưỡng | Hồi 0,025 mỗi phút khi ăn uống, vệ sinh tốt; +4 cuối ngày nếu đủ điều kiện |
| **Tâm trạng** (`mood`) | Làm phiền chim mới, trùm áo ban ngày không cần, sự kiện xấu, ngủ muộn | Ăn món thích, tắm, trò chuyện; tự về mức 55 rất chậm |
| **Thân thiết** (`trust`) | Sự kiện xấu | Trò chuyện (chim nhút nhát tăng chậm hơn) |
| **Độ sung** (`vigor`) | Bệnh, thay lông, thiếu dinh dưỡng, nghe giọng mồi quá nhiều | Khỏe mạnh, mồi tươi, giọng mồi, cà phê chim |
| **Lông** (`feather`) | Thiếu tắm, thiếu nắng, sâu quy quá nhiều, ăn sai khi thay lông | Tắm, chăm tốt khi thay lông |
| **Giọng hót** (`song`, chỉ loài hót) | Ốm (−3 mỗi ngày), lai giọng | Cuối ngày theo độ sung, tâm trạng, thân thiết, số hiệp hót, giọng mồi |

Ngưỡng ăn: chim chỉ ăn máng khi `hunger < 85`, máng còn `amt > 0` và độ chấp nhận thức ăn `> 0`. Mỗi phút ăn trừ 0,22 `amt` (một nửa nếu ốm) và cộng `1,1 × độ chấp nhận` vào `hunger`.

Cuối ngày, nếu chim không ốm, ăn no (> 30) và lồng sạch (> 40) thì sức khỏe +4.

---

## 6. Mô phỏng từng phút

`stepMinute(S, ctx)` trong `src/core/simulation.js` chạy theo thứ tự sau mỗi phút game, rồi tăng `S.t`.

1. **Ăn uống.** Giảm đói, ăn từ máng, giảm nước, giảm độ sạch nước, giảm vệ sinh lồng.
2. **Đồ tươi ôi.** `fresh.age++`. Quá 240 phút thì ôi (150 phút nếu trời nóng hoặc nồm). Khi ôi: ghi nhật ký, lồng bẩn thêm 0,03 mỗi phút, nguy cơ tiêu chảy +0,18 mỗi phút.
3. **Nắng** (chỉ khi `pos === 'san'`).
   - `sunAll++`. Trong khung nắng tốt (`sunWindow`) thì `sunGood++`; ngoài khung nhưng không phải 11–15 giờ thì `sunGood += 0,5`.
   - Ngày rét phơi trước 7:30: nguy cơ cảm lạnh +0,3 mỗi phút, nhắc một lần trong ngày.
   - 11–15 giờ: `heat++`, nguy cơ sốc nhiệt +5 (ngày nóng) hoặc +3, tâm trạng −0,05.
   - Phơi quá `sun[1] + 20` phút: tâm trạng −0,04 mỗi phút.
4. **Lông ướt sau tắm.** `wet` giảm 1 mỗi phút (2 nếu đang phơi nắng). Trời lạnh +0,9 nguy cơ cảm; đang trùm áo +0,6; sau 17 giờ +1,2.
5. **Ảnh hưởng vị trí lồng.**
   - Hiên, trời lạnh, không trùm áo, sau 17 giờ: cảm lạnh +0,3.
   - Phòng khách, sau 19 giờ, không trùm áo: tâm trạng −0,04 (đèn, tivi).
   - Gần bếp, 10:30–12:00 và 17:00–19:00: nguy cơ ngộ độc khí +0,35 mỗi phút.
6. **Vệ sinh kém sinh nguy cơ.** Nước bẩn (`clean < 35`): tiêu chảy `+ (35 − clean)/40`. Lồng bẩn (`cage < 30`): rận mạt `+ (30 − cage)/40`, nhân 1,5 ngày nồm. Hết nước: máu −0,08, tâm trạng −0,08, ngày nóng thêm sốc nhiệt +1,2. Đói (`hunger ≤ 10`): máu −0,1, tâm trạng −0,05.
7. **Tâm trạng.**
   - Trùm áo ban ngày (trước 18 giờ): chim mới, hoặc chim nhút nhát chưa thân (`trust < 30`) thì +0,035 (thấy yên tâm); chim khác −0,03.
   - Chim mới không trùm áo: −0,025. Chim mới mà `mood < 32`: nguy cơ ngã nước `+0,5 × hệ số tính nết`.
   - Tự hồi về 55: `+ (55 − mood) × 0,0015`.
8. **Sức khỏe, độ sung.**
   - Khỏe (không ốm, `hunger > 40`, có nước, nước sạch, lồng sạch) thì máu +0,025.
   - `stepIllness` (mục 10).
   - Thay lông: độ sung `−0,008 / featherMolt`. Ngược lại nếu khỏe, vui (`health > 70`, `mood > 55`, `hunger > 40`) thì độ sung `+0,01 × hệ số tuổi × hệ số tính lửa`, giảm còn 25% khi trên 80 (gần đỉnh lên chậm).
   - **Quá lửa**: độ sung vượt ngưỡng (mặc định 90, chim lên lửa nhanh là 85) thì tâm trạng −0,01, lông −0,003 mỗi phút, nhắc một lần trong ngày.
9. **Nguy cơ bệnh.** Mỗi phút mọi bộ đếm nhân 0,999 (giảm 0,1%). Nếu chưa ốm: kiểm tra từng bệnh theo thứ tự `RISK_KEYS`; bệnh đầu tiên có `risk × riskK (× coldK với cảm lạnh) ≥ 100` thì `catchIllness`.
10. **Hót** (chỉ loài hót). Điều kiện: chưa trong hiệp hót, không ốm, không thay lông, không trùm áo, 6–18 giờ, `hunger > 30`, có nước, không còn là chim mới. Chi tiết ở mục 14.
11. **Nói** (loài nói). Đã biết câu, không trùm áo, `mood > 50`: xác suất 0,003 mỗi phút buột miệng một câu đã học.
12. Kẹp lại các chỉ số, `S.t++`.

`Game.advance(mins)` lặp các bước trên, và sau mỗi phút kiểm tra: chết (`health ≤ 0`), sự kiện đến giờ (`dueEvent`), hết ngày (`t ≥ FORCE_SLEEP`). Dừng sớm nếu gặp sự kiện, hết ngày, hoặc chim chết.

---

## 7. Hành động của người chơi

Mọi hành động đi qua `Game.act(id, payload)`. `ACTIONS[id]` có `blocked(S, sp)` (trả lý do chặn hoặc null) và `run(S, ctx, payload)` (trả số phút tiêu tốn). UI không chứa logic: nó thu thập `payload` (chọn món, cách dọn…) rồi gọi `act`.

Trước khi chạy, `Game.blocked(id)` kiểm tra: game đang chờ, ban đêm (chờ 06:00), người chơi đang bận việc dài, rồi mới đến `blocked` riêng của hành động.

| Phím | Id | Tên | Phút | Chặn khi |
|---|---|---|---|---|
| 1 | `staple` | Cho thức ăn chính | 5 | |
| 2 | `fresh` | Cho đồ tươi, mồi | 5 | |
| 3 | `water` | Thay nước | 5 | |
| 4 | `clean` | Dọn lồng | 15 (lau ẩm) hoặc 5 (quét khô) | |
| 5 | `bath` | Cho tắm | 10 | Đang trùm áo; sau 19 giờ |
| 6 | `sun` | Phơi nắng / mang về | 2 | Đang trùm áo; trời mưa; ngoài 6–18 giờ (trừ khi đang ngoài sân thì luôn mang về được) |
| 7 | `cover` | Trùm hoặc mở áo lồng | 1 | |
| 8 | `move` | Đổi chỗ treo | 5 (0 nếu cùng chỗ) | |
| 9 | `talk` | Trò chuyện, dạy nói | 15 | |
| 0 | `tutor` | Cho nghe giọng mồi | 20 | Loài nói; đang trùm áo; sau 19 giờ; đang ốm |
| Q | `look` | Quan sát kỹ | 5 | |
| Y | `vet` | Đưa đi thú y | 60 hoặc 120 | |
| T | `medicine` | Cho uống thuốc | 3 | Trừ khi đang điều trị và chưa uống hôm nay |
| C | `wait` | Chờ | 30 | |
| N | `sleep` | Cho ngủ | 0 | Trước 18:00 |

Phím khác: **M** bật tắt âm thanh, **V** đổi góc nhìn (gần, xa), **H** ngắm chim (ẩn bảng), **L** nghe chim, **S** mở Sổ tay, **Esc** đóng gợi ý.

### 7.1 Chi tiết từng hành động

**`staple` (thức ăn chính).** Chọn món và cách đổi (`swap` hoặc `mix`).
- Đổi sang món khác khi máng còn thức ăn cũ: nếu chọn `mix` thì bắt đầu trộn dần `MIX_DAYS` = 5 ngày (an toàn). Nếu đổi hẳn: loài nhạy cảm (`foodSensitive`) tâm trạng −12, đói −10 (bỏ ăn, hoảng); loài khác tâm trạng −3.
- Đổ đầy máng (`amt = 100`), đặt `today.refill = true`.
- Nhật ký đánh giá món: không ăn (độ chấp nhận 0), chưa tối ưu (< 0,8), hoặc đúng thức ăn chính.

**`fresh` (đồ tươi, mồi).** Điểm món `v` lấy từ `sp.food[món]`:
- Món khoái của con này (`traits.fav`) mà `v = 1` thì tính là `v = 2` và lộ tính cách `fav`.
- Đang thay lông mà món nằm trong `moltAvoid` (chào mào: sâu quy; chuối không còn bị cấm vì giới nuôi còn tranh cãi): ép `v = −1`, đặt `today.moltBad`.
- `v = −3` (độc): nếu chưa ốm thì vào thẳng `ngo_doc` phát rõ, máu −25, ghi vào `today.bad`.
- `v = −2` (hại): máu −6, nguy cơ tiêu chảy +40.
- `v = −1`: no bằng 50% lượng, tâm trạng +1, vào `today.bad` (trừ khi do thay lông).
- `v = 0`: no 30%.
- `v ≥ 1`: no đủ `fill`; tâm trạng `+6` (nếu `v = 2`) hoặc `+3 × hệ số ăn ngon`. Món rất thích thêm độ sung +2, thân thiết +1.
- Trái cây và rau tăng `today.fresh`. Mồi đạm tăng `today.protein` và `lastProtein` (sâu quy không tính là mồi mềm cho chim non). Khoáng cập nhật `lastMineral`.
- Sâu quy: chim non lông −2 (vỏ cứng); cho quá một lần trong ngày lông −4.
- Đồ tươi, mồi, đồ ăn người đều đặt `S.fresh` (sẽ ôi nếu để lâu).
- Chim đang no (> 95) thì phần lớn bị bỏ thừa.

**`water`.** Mực và độ sạch về 100, `today.water = true`, nguy cơ tiêu chảy ×0,6.

**`clean`.** Vệ sinh lồng về 100, bỏ đồ tươi, rận mạt ×0,5. Chim mới bị làm phiền (mood −3).
- Lau ẩm (đeo găng, rửa tay): 15 phút, an toàn.
- Quét khô: 5 phút, `ownerRisk++` và `today.dryClean = true` (bụi phân khô bay, nguy cơ sốt vẹt cho người).

**`bath`.** Tăng `lastBath`, `wet = 40`, lông +3, lồng −4.
- Chim mới ngày đầu: mood −10 ("chưa nên tắm"); ngược lại mood +6.
- Sau 17 giờ: nguy cơ cảm +35, đánh dấu `lateBath`. Trước 7 giờ: +10.
- Chim non: tắm cách dưới 2 ngày +6; tắm trước 12 giờ +8.
- Trời lạnh: +15. Tắm quá `maxBath` lần trong ngày: mood −4.
- Độ sung > 80: giảm 4 (tắm hạ lửa).

**`sun`.** Bật tắt giữa sân và chỗ treo. Ghi nhận khung giờ để nhật ký khen nắng sớm hoặc cảnh báo nắng trưa 11–15 giờ.

**`cover`.** Đổi áo lồng. Trùm áo thì mang lồng về chỗ treo nếu đang ngoài sân.

**`move`.** Đổi `loc` và `pos`. Loài có tính lãnh thổ (chích chòe) mood −10. Chọn bếp thì nhật ký cảnh báo.

**`talk`.**
- Chim mới: mood `−6 × hệ số hoảng`, thân thiết +1, nhật ký khuyên để yên.
- Đang ốm: mood −2, chỉ nên nghỉ.
- Bình thường: thân thiết `+(2,5 hoặc 4) × hệ số tính nết`, mood +4.
- Loài hót: chỉ thân thiết; muốn luyện giọng phải dùng giọng mồi.
- Loài nói: khi thân thiết ≥ 35 và mood > 50 mới học nói (mục 15).

**`tutor` (giọng mồi).** Xem mục 14.

**`look` (quan sát kỹ).** Ghi một đoạn nhật ký mô tả từ phân, lông, mắt, máng, nước đến độ lửa, tính cách đã biết, và cảnh báo khi nguy cơ trên 30 đến 40. Lưu ngày vào `lookDays`. Là cách chính để lộ tính cách (mục 13) và nhận ra bệnh sớm.

**`vet`, `medicine`.** Xem mục 10.

**`wait`.** Qua 30 phút.

**`sleep`.** Từ 18:00. Nếu chưa trùm áo thì game tự trùm giúp, đưa lồng về chỗ treo, rồi kết thúc ngày.

### 7.2 Thao tác nhanh trong giao diện

- **Chạm vào vật trong cảnh 3D** để thao tác nhanh: máng ăn, cóng nước, khay lồng, áo lồng, con chim (ánh xạ `PICK_TO_ACTION` trong `main.js`).
- **Bong bóng nhu cầu** nổi trên đầu chim (chế độ Người mới): máng sắp hết, nước bẩn, lồng bẩn, chim ốm, tối chưa trùm áo, đến giờ uống thuốc; chạm vào là làm luôn.

---

## 8. Sáu loài chim

Dữ liệu ở `src/data/species.js`. Thứ tự hiển thị `SPECIES_ORDER`: yến phụng, chào mào, sáo, chích chòe, khuyên, họa mi.

| | Vẹt yến phụng | Chào mào | Sáo mỏ ngà | Chích chòe than | Vành khuyên | Họa mi |
|---|---|---|---|---|---|---|
| Khóa | `yenphung` | `chaomao` | `sao` | `chichchoe` | `khuyen` | `hoami` |
| Tên khoa học | Melopsittacus undulatus | Pycnonotus jocosus | Acridotheres grandis | Copsychus saularis | Zosterops sp. | Garrulax canorus |
| Độ khó | 1 (dễ, hợp người mới) | 2 | 1 (dễ) | 2 | 3 (khó) | 3 (khó) |
| Nguồn gốc | Nuôi sinh sản | Bị bẫy tự nhiên | Bị bẫy tự nhiên | Bị bẫy tự nhiên | Bị bẫy tự nhiên | Bị bẫy tự nhiên |
| Kỹ năng | Nói | Hót | Nói | Hót | Hót | Hót |
| Chuyển hóa (`metab`) | 0,21 | 0,24 | 0,23 | 0,24 | 0,32 | 0,23 |
| Thức ăn chính tốt nhất | Thức ăn viên | Cám chào mào | Cám tổng hợp | Cám chòe, họa mi | Cám khuyên | Cám chòe, họa mi |
| Nắng sớm (phút) | 15–45 | 15–40 | 15–45 | 10–30 | 10–20 | 10–30 |
| Cách ngày tắm tối đa (`bathGap`) | 3 | 2 | 2 | 2 | 1 | 2 |
| Tắm tối đa mỗi ngày (`maxBath`) | 1 | 1 | 1 | 1 | 2 | 1 |
| Nhút nhát (`shy`) | không | không | không | không | có | có |
| Nhạy đổi thức ăn (`foodSensitive`) | không | không | không | có | có | có |
| Lãnh thổ (`territorial`) | không | không | không | có | không | không |
| Cần đồ tươi | có | có | có | không | có | không |
| Cần mồi đạm | không | có | không | có | không | có |
| Cần khoáng | có | không | không | không | không | không |
| Tránh khi thay lông | không | sâu quy | không | không | không | không |

### 8.1 Độ chấp nhận thức ăn chính (0 đến 1)

| Thức ăn chính | Yến phụng | Chào mào | Sáo | Chích chòe | Khuyên | Họa mi |
|---|---|---|---|---|---|---|
| Thức ăn viên (`vien`) | 1 | 0 | 0,6 | 0 | 0 | 0 |
| Hạt kê trộn (`ke`) | 0,75 | 0 | 0,2 | 0 | 0 | 0 |
| Cám chào mào (`cm`) | 0 | 1 | 0,8 | 0,5 | 0,6 | 0,5 |
| Cám khuyên (`khuyen`) | 0 | 0,6 | 0,6 | 0,4 | 1 | 0,4 |
| Cám chòe, họa mi (`sau`) | 0 | 0,55 | 0,8 | 1 | 0,3 | 1 |
| Cám tổng hợp (`tonghop`) | 0 | 0,65 | 1 | 0,6 | 0,4 | 0,7 |

### 8.2 Đánh giá đồ ăn thêm (thang −3 đến 2)

2 rất thích, 1 tốt, 0 không hứng thú, −1 không nên, −2 có hại, −3 độc.

| Món | Yến phụng | Chào mào | Sáo | Chích chòe | Khuyên | Họa mi |
|---|---|---|---|---|---|---|
| Chuối chín | 1 | 2 | 2 | 0 | 2 | 1 |
| Ớt chín, cà chua | 1 | 2 | 1 | 0 | 1 | 0 |
| Táo, đu đủ | 2 | 1 | 1 | 0 | 2 | 1 |
| Rau cải xanh | 2 | 0 | 0 | 0 | 0 | 0 |
| Cào cào | 0 | 2 | 2 | 2 | −1 | 2 |
| Dế | 0 | 1 | 2 | 2 | −1 | 2 |
| Sâu quy | 0 | 1 | 1 | 1 | 0 | 1 |
| Lòng đỏ trứng luộc | 1 | 1 | 2 | 1 | 1 | 2 |
| Xương mực, đá khoáng | 2 | 0 | 0 | 0 | 0 | 0 |
| Cơm, bánh mì | −1 | −1 | 0 | −1 | −1 | −1 |
| Đồ ăn mặn | −2 | −2 | −2 | −2 | −2 | −3 |
| Hành, tỏi | −3 | −3 | −3 | −3 | −3 | −3 |
| Quả bơ | −3 | −3 | −3 | −3 | −3 | −3 |
| Sô cô la, bánh ngọt | −3 | −3 | −3 | −3 | −3 | −3 |

(Đồ mặn, hành tỏi, bơ, sô cô la lấy đánh giá chung `COMMON_FOOD`; họa mi ghi đè đồ mặn thành −3.)

### 8.3 Câu học nói (loài nói)

- Yến phụng: Xin chào, Ăn chưa, Bé ngoan, Đẹp quá, Chíp chíp.
- Sáo: Xin chào, Có khách, Ăn cơm chưa, Sáo đây, Chào buổi sáng.

### 8.4 Mô tả tiếng (hiện trong Sổ tay, màn chọn chim)

- Yến phụng: líu lo ríu rít nhỏ nhẹ cả ngày, xen tiếng rè và "chiếp" rung.
- Chào mào: hót từng cụm ngắn 3–6 tiếng, trong và vui, luyến lên xuống.
- Sáo: lách chách, ríu rít lẫn rè, huýt và lục cục trong cổ; bắt chước tiếng người.
- Chích chòe: giọng to, huýt dài lên xuống rất ngọt xen láy nhanh; hót nhiều nhất sáng sớm.
- Khuyên: giọng cao mảnh, líu lo nhanh thành chuỗi dài; tiếng gọi "chíu".
- Họa mi: giọng vang ấm, nhiều kiểu; mỗi câu lặp 2–4 lần rồi mới đổi.

Mỗi loài còn có `blurb`, `tips` (mẹo chăm hiện ở tổng kết cuối ván, 4 mẹo đầu) và `model` (thông số dựng 3D, bộ lông non `juvenile`).

---

## 9. Thức ăn

Dữ liệu ở `src/data/foods.js`.

**Thức ăn chính** (`STAPLES`, đổ vào máng): viên cho vẹt, hạt kê trộn, cám chào mào, cám khuyên (mịn), cám chòe và họa mi (giàu đạm), cám tổng hợp.

**Đồ ăn thêm** (`FOODS`) chia theo nhóm `cat`:

| Nhóm | Món | Lượng no (`fill`) |
|---|---|---|
| `fruit` (trái cây, rau) | chuối 18, ớt/cà chua 12, táo/đu đủ 15, cà rốt hấp 12, thanh long ruột đỏ 14, rau cải 10. Món `pigment` (ớt/cà chua, táo/đu đủ, cà rốt, thanh long) giúp lông lên màu khi thay lông | |
| `protein` (đạm) | cào cào 20, dế 20, sâu quy 15, lòng đỏ trứng 15 | |
| `mineral` | xương mực, đá khoáng 2 | |
| `junk` | cơm/bánh mì 15, đồ mặn 10 | |
| `toxic` | hành tỏi 3, bơ 5, sô cô la 5 | |

**Trộn dần thức ăn.** Đổi thức ăn chính theo cách `mix`: máng đặt `mixFrom` là món cũ, `mixLeft = 5`. Độ chấp nhận trong giai đoạn trộn là nội suy giữa món mới và món cũ theo tỉ lệ cũ còn lại `mixLeft / 5`. Mỗi đêm `mixLeft` giảm 1; về 0 thì "đã chuyển hẳn".

**Thức ăn để lâu.** Mỗi đêm còn thức ăn thì `feeder.days++`. Từ 2 đêm trở lên: nguy cơ tiêu chảy +25 và bị chấm "Thức ăn để quá lâu".

---

## 10. Bệnh, nguy cơ và liệu trình

Dữ liệu ở `src/data/diseases.js`, logic ở `src/core/illness.js`.

### 10.1 Bảy bệnh

| Khóa | Bệnh | Sát thương máu mỗi phút (`dmg`) | Liệu trình (`course`, liều) | Nguyên nhân |
|---|---|---|---|---|
| `tieu_chay` | Tiêu chảy | 0,035 | 5 | Nước bẩn, đồ ăn ôi, cám để lâu ẩm mốc |
| `cam_lanh` | Cảm lạnh, khò khè | 0,03 | 5 | Ướt lông khi lạnh, tắm muộn, gió lùa đêm |
| `ran_mat` | Rận mạt, sâu lông | 0,02 | 4 | Lồng bẩn lâu, ít tắm |
| `say_nang` | Sốc nhiệt | 0,06 | 3 | Nắng trưa gắt, hết nước ngày nóng |
| `nga_nuoc` | Ngã nước (sốc môi trường) | 0,04 | 4 | Chim mới bị làm phiền, không trùm áo, thiếu yên tĩnh |
| `khi_doc` | Ngộ độc khí | 0,08 | 5 | Khói chảo chống dính, dầu mỡ, nhang, thuốc lá |
| `ngo_doc` | Ngộ độc thức ăn | 0,09 | 2 | Bơ, sô cô la, hành, tỏi |

Mỗi bệnh có `early` (dấu hiệu sớm lúc ủ bệnh), `sign` (dấu hiệu khi phát rõ), `cause`, `prevent`. Ví dụ dấu hiệu sớm: tiêu chảy "Phân hơi nhão, chim uống nước nhiều hơn thường lệ"; cảm lạnh "hay xù lông, thỉnh thoảng hắt hơi khẽ"; sốc nhiệt "đứng há mỏ, hơi xòe cánh, uống nước liên tục".

`ngo_doc` không có bộ đếm nguy cơ (`RISK_KEYS` chỉ có 6 khóa còn lại), nó chỉ xảy ra khi cho ăn đồ độc.

### 10.2 Bộ đếm nguy cơ

`S.risk` có 6 bộ đếm: `tieu_chay`, `cam_lanh`, `ran_mat`, `say_nang`, `nga_nuoc`, `khi_doc`. Điều kiện xấu cộng dồn; mỗi phút nhân 0,999; khi `risk × riskK ≥ 100` thì nhiễm bệnh (`riskK` theo tuổi, cảm lạnh nhân thêm `coldK`).

Các nguồn cộng nguy cơ chính:

| Bệnh | Nguồn |
|---|---|
| Tiêu chảy | Nước bẩn (`clean < 35`); đồ tươi ôi +0,18 mỗi phút; cho đồ hại +40; cuối ngày chưa thay thức ăn mới +10; đồ tươi thừa qua đêm +30; thức ăn để ≥ 2 đêm +25; ngày nồm chưa đổ cám mới +25; sự kiện nồm bỏ qua +35; chuột +30; đi cà phê chim +15, đi thi +10. Thay nước nhân 0,6. |
| Cảm lạnh | Tắm muộn +35; tắm sáng sớm +10; chim non tắm dày +6 hoặc tắm sớm +8; trời lạnh khi tắm +15; lông ướt khi lạnh, đang trùm áo, sau 17 giờ; hiên gió lạnh chiều; phơi sớm ngày rét; đêm lạnh không trùm áo +40; đi ngủ lông còn ướt +70; gió mùa bỏ qua +40. |
| Rận mạt | Lồng bẩn (`cage < 30`, nồm ×1,5); lâu chưa tắm +20. Dọn lồng nhân 0,5. |
| Sốc nhiệt | Phơi nắng 11–15 giờ (+5 ngày nóng, +3 ngày khác); hết nước ngày nóng +1,2 mỗi phút; mất điện bỏ qua +50. |
| Ngã nước | Chim mới và `mood < 32` (+0,5 mỗi phút × hệ số nhát); mèo, trẻ con, karaoke, cà phê chim khi chim mới. |
| Ngộ độc khí | Treo lồng gần bếp lúc nấu +0,35 mỗi phút; nhang +45; chảo bốc khói +8 đến +120; khói thuốc +35. |

Chế độ Người mới hiện cảnh báo khi nguy cơ vượt 30 hoặc 40 qua "Quan sát kỹ".

### 10.3 Diễn tiến bệnh

`S.sick.phase`:

- **`som` (ủ bệnh).** Kéo dài `EARLY_MIN` = 180 phút mô phỏng (đêm không chạy nên không tính). Nhật ký chưa ghi tên bệnh, chỉ có dấu hiệu sớm. Máu giảm `0,3 × dmg` mỗi phút. Chim không hót, ăn chậm (đói giảm 0,7×, ăn 0,5×). Đã tính là bị bệnh: `sickCount++` và bộ đếm nguy cơ bệnh đó về 0 (nên bắt bệnh sớm vẫn mất thành tựu "Khỏe trọn 14 ngày"). Hết 180 phút chuyển `ro`.
- **`ro` (phát rõ).** Nhật ký ghi tên bệnh, dấu hiệu, nguyên nhân; máu −5 một lần; mỗi phút máu `−dmg`, mood −0,03, độ sung −0,03. Cuối ngày bị chấm "Chim bệnh chưa được chữa". Ăn đồ độc (`ngo_doc`) vào thẳng giai đoạn này.
- **`tri` (đang điều trị).** Không mất máu; hồi 0,01 mỗi phút nếu `hunger > 40` và có nước. Vẫn không hót, không luyện giọng.

### 10.4 Đi thú y (`vet`)

- Chim khỏe: mood −6, 60 phút, bác sĩ dặn đừng tự cho kháng sinh.
- Giai đoạn `som` hoặc `ro`: chẩn đoán, chuyển `tri`, liều đầu cho ngay tại phòng khám (`dosedToday = true`), máu +8, mood −4, tốn 120 phút.
  - Bắt sớm (`som`): liệu trình 3 liều.
  - Phát rõ (`ro`): liệu trình `course` của bệnh; tái bệnh thêm 2 liều (`RELAPSE_EXTRA`, nhờn thuốc).
  - Nếu `dosesLeft` về 0 ngay (ví dụ `ngo_doc` 2 liều trừ 1) thì khỏi luôn.
- Đang điều trị mà đi lại: không rút ngắn liệu trình, mood −6, 60 phút, bác sĩ dặn cho uống tiếp đủ N ngày.

### 10.5 Cho uống thuốc (`medicine`)

Mở khi `phase === 'tri' && !dosedToday`. Mỗi ngày một liều: mood −2, `dosesLeft--`, `dosedToday = true`, tốn 3 phút. Hết liều thì khỏi, `S.sick = null`.

Mỗi sáng `startDay` đặt lại `dosedToday = false`.

### 10.6 Chấm điểm bệnh cuối ngày (`nightIllness`)

- Đang `tri`: trò chuyện quá 2 lần thì máu −3 và ✗ "Chim ốm cần nghỉ". Đã uống thuốc: ✓ "Cho uống thuốc đúng liều". Chưa uống: ✗ "Bỏ liều thuốc", bệnh tái về `ro`, `relapsed = true`, `dosesLeft = 0`.
- Đang `ro`: ✗ "Chim bệnh chưa được chữa".
- Đang `som`: không chấm (người chơi chưa thể chắc chắn).

### 10.7 Chim chết

`health ≤ 0` thì `gameOver`. Nếu chim đang điều trị thì màn chim chết không đổ cho bệnh (vì đang điều trị bệnh không trừ máu, chết là do đói khát).

---

## 11. Thời tiết theo vùng và tháng

Dữ liệu ở `src/data/weather.js`.

### 11.1 Sáu kiểu

| Khóa | Tên | °C | Cờ |
|---|---|---|---|
| `mat` | Mát | 28 | |
| `nong` | Nắng nóng (miền Trung tháng 5–8 gọi là "Gió Lào, nắng nóng") | 36 | `hot` |
| `mua` | Mưa lạnh | 20 | `cold`, `rain` |
| `ret` | Rét khô | 13 | `cold` |
| `nom` | Nồm ẩm | 22 | `humid` |
| `rao` | Mưa rào | 29 | `rain` |

### 11.2 Xác suất theo vùng và tháng

Ước lượng theo khí hậu, không phải số đo.

| | Bắc | Trung (Huế) | Nam |
|---|---|---|---|
| Tháng 1–2 | rét .5, nồm .15, mưa lạnh .2, mát .15 | mưa lạnh .5, rét .25, mát .25 | mát .5, nóng .5 |
| Tháng 3–4 | nồm .4, mát .4, mưa lạnh .2 | mát .6, nồm .15, mưa rào .25 | nóng .6, mát .4 |
| Tháng 5–8 | nóng .5, mưa rào .35, mát .15 | nóng .6, mát .2, mưa rào .2 | mưa rào .5, nóng .3, mát .2 |
| Tháng 9–10 | mát .6, nóng .2, mưa rào .2 | mưa lạnh .4, mưa rào .2, mát .4 | mưa rào .55, mát .3, nóng .15 |
| Tháng 11–12 | mát .4, rét .4, mưa lạnh .2 | mưa lạnh .6, rét .15, mát .25 | mát .5, mưa rào .3, nóng .2 |

**Tháng của ngày game thứ `d`** là tháng của `startAt + (d − 1) ngày` (`monthOf`). Bản lưu chưa có `startAt` coi là tháng 4.

**Ngày 1** (chim mới về): lấy kiểu có xác suất cao nhất trong tháng mà không mưa, không nóng; không có thì `mat`. Các ngày sau tung xúc xắc theo bảng bằng RNG chính.

### 11.3 Hệ quả từng kiểu

- **Nóng** (`hot`): nước cạn nhanh (0,12 mỗi phút), phơi nắng 11–15 giờ nguy hiểm hơn (+5 thay vì +3), đồ tươi ôi sau 150 phút, hết nước thêm nguy cơ sốc nhiệt.
- **Mưa lạnh** (`mua`): không phơi nắng, tắm cộng nguy cơ cảm, lông ướt lạnh dễ cảm. Hoãn tắm không bị chấm "Lâu chưa tắm". Sự kiện "Gió mùa về" xảy ra khi trời lạnh.
- **Rét khô** (`ret`): như mưa lạnh về nguy cơ cảm lạnh. Có nắng nhưng giờ nắng tốt dời sang 8:00–10:30 (`sunWindow`). Phơi trước 7:30 cộng nguy cơ cảm và nhật ký nhắc. Mục "Tắm nắng" và "Việc hôm nay" đổi chữ theo khung giờ.
- **Nồm** (`humid`): cuối ngày chưa đổ cám mới thì ✗ "Cám để qua ngày nồm" và tiêu chảy +25. Đồ tươi ôi sau 150 phút. Lồng bẩn sinh rận mạt nhanh ×1,5. Sự kiện "Trời nồm ẩm" chỉ xảy ra ngày nồm hoặc mưa lạnh (mưa rào mùa hè không phải nồm).
- **Mưa rào** (`rao`, không lạnh): không phơi nắng được; tắm vẫn bình thường.

Nhật ký đầu ngày (`startDay`) ghi tên thời tiết, nhiệt độ và một lời khuyên riêng cho nóng, mưa lạnh, rét, nồm, mưa rào.

---

## 12. Tuổi chim

Dữ liệu ở `src/data/stages.js`. Ba giai đoạn thật sự khác nhau về nhu cầu và cách học.

| | Chim chuyền (khoảng 1–4 tháng) | Trưởng thành (1–3 năm) | Lâu năm (từ 5 năm) |
|---|---|---|---|
| Thân thiết lúc về (`trust0`) | 28 | 8 | 18 |
| Giọng lúc về (`song0`) | 4 | 12 | 58 |
| Trần giọng trong 14 ngày (`songCap`) | 60 | 100 | 100 |
| Tiến bộ giọng (`songK`) | 1,1 | 1 | 0,45 |
| Hiệu quả giọng mồi (`tutorK`) | 1,7 | 1 | 0,3 |
| Học nói (`talkK`) | 1,5 | 1 | 0,6 |
| Tốc độ đói (`metabK`) | 1,15 | 1 | 0,95 |
| Hệ số nguy cơ bệnh (`riskK`) | 1,25 | 1 | 1,2 |
| Thêm cho cảm lạnh (`coldK`) | 1,5 | 1 | 1,3 |
| Hồi độ sung (`vigorK`) | 1 | 1 | 0,7 |
| Mệt khi thay lông (`featherMolt`) | 1 | 1 | 0,8 |
| Mùa thay lông (ngày) | 5 đến 9 (xong ngày 10) | 6 đến 10 (xong ngày 11) | 6 đến 11 (xong ngày 12) |

Ghi chú:

- Chim chuyền là chim non mới rời tổ, nuôi tay nên dạn người, đang tập hót. Cần ít nhất 2 bữa mồi mềm mỗi ngày (`isYoung`); sâu quy không tính; tắm thưa hơn (cách 2 ngày), tắm sau 12 giờ. Lần thay lông đầu đời đổi bộ lông non sang lông trưởng thành (`adultness`).
- Chim lâu năm giọng đã định, hót chắc nhưng khó học thêm, hồi sức chậm, thay lông mệt hơn.
- `isYoung(S)`: chim chuyền và `day < ngày xong thay lông`.
- Bộ lông non từng loài (`model.juvenile`): chào mào chưa có túm đỏ sau mắt, mào ngắn, lông dưới đuôi cam hồng; chích chòe nâu xám, ngực lốm đốm; yến phụng mắt đen, vằn kéo tới trán, mũi hồng; sáo nâu xám, chỏm ngắn; khuyên xỉn, vòng mắt mảnh; họa mi nâu xỉn, vệt mi mờ.

---

## 13. Tính cách từng con chim

Dữ liệu ở `src/data/traits.js`. Mỗi con tung khi đón, người chơi nhận ra dần.

### 13.1 Ba trục và món khoái

Mỗi trục tung 25% thấp, 50% bình thường, 25% cao.

| Trục | Thấp | Cao | Hệ số |
|---|---|---|---|
| `temper` (tính nết) | `nhat` nhát | `dan` dạn | Thân thiết khi trò chuyện ×0,6 / ×1,4; hoảng khi bị làm phiền lúc mới về ×1,5 / ×0,6; nguy cơ ngã nước ×1,4 / ×0,6 |
| `appetite` (cách ăn) | `ken` kén ăn | `ham` ham ăn | Tốc độ đói ×0,9 / ×1,15; vui khi ăn món hợp ×0,5 / ×1,3 |
| `fire` (độ lửa, chỉ loài hót) | `cham` chậm lửa | `nhanh` lên lửa nhanh | Độ sung tăng ×0,7 / ×1,6; quá lửa từ 85 thay vì 90 |
| `fav` (món khoái) | | | Một món chim ăn được (`v = 1`) tính như món rất thích (`v = 2`) |

Loài nói luôn có `fire = 'binh'`, không hiện thẻ và không có câu nhận ra.

### 13.2 Nhận ra tính cách

Cả hai chế độ chơi như nhau. Mỗi lần nhận ra có một dòng nhật ký mẹo chăm hợp tính, và tính đã biết hiện thành thẻ nhỏ trên thẻ chim.

| Trục | Khi nào lộ |
|---|---|
| `temper` | Lần "Quan sát kỹ" đầu tiên khi hết thời chim mới về |
| `appetite` | "Quan sát kỹ" ở hai ngày khác nhau |
| `fire` | "Quan sát kỹ" từ ngày 5 |
| `fav` | Lần đầu cho chim ăn món đó |

Trục "bình thường" khi nhận ra cũng có câu nhật ký ("không nhát cũng không dạn"…).

---

## 14. Giọng hót, độ lửa, giọng mồi, lai giọng

### 14.1 Điểm giọng và năm cấp

`S.song` 0–100 (loài hót). Dữ liệu `src/data/song.js`:

| Cấp | Từ điểm | Tên | Mô tả |
|---|---|---|---|
| 0 | 0 | Chưa ra giọng | Chỉ kêu chiêm chiếp, chưa hót thành câu |
| 1 | 20 | Hót rời rạc | Vài tiếng ngắn, chưa tròn câu |
| 2 | 45 | Hót tròn câu | Hót trọn một câu ngắn, rõ tiếng |
| 3 | 70 | Hót đổ dài | Hót liền nhiều câu, giọng to và sáng |
| 4 | 90 | Giọng vàng | Giọng vang, nhiều kiểu hót, hót bền |

Lên hay xuống cấp đều ghi nhật ký. Chim chuyền chạm trần 60 thì nhật ký giải thích giọng chưa "định".

### 14.2 Cộng điểm giọng cuối ngày (`songGain`)

- Ốm (giai đoạn `ro` hoặc `tri`): −3. Ủ bệnh chưa ảnh hưởng.
- Đang thay lông: 0 (đứng yên).
- Còn lại:

```
g = clamp((vigor − 40) / 8, −2, 4)
  + clamp((mood − 50) / 10, −1, 2)
  + clamp(trust / 30, 0, 2)
  + 0,5 × min(số hiệp hót, 8)
  + giọng mồi có ích × 1,8 × tutorK
  + 2 nếu hôm nay đi cà phê chim hoặc hội thi
điểm cộng = (g > 0 ? g × songK : g) − mix / 25
```

Giọng mồi có ích = `min(số lần nghe, 2) − 0,5 × min(số lần nghe sai giờ, 2)`; ngày chim mới về tính 0. Giọng chỉ tăng đến trần `songCap` của tuổi chim.

### 14.3 Khi nào chim hót

Điều kiện hót (trong `stepMinute`): không ốm, không thay lông, không trùm áo, 6–18 giờ, `hunger > 30`, có nước, hết thời chim mới, và:

- Cấp 2 trở lên: `vigor > 62`, `mood > 58`, `health > 70`, `trust > 22`.
- Cấp 0–1 ("dễ"): `vigor > 54`, `mood > 52`, `health > 70`, `trust > 10`.

Xác suất mỗi phút: `(0,003 + 0,0015 × cấp) × (2,5 nếu 6–9 giờ)`. Mỗi lần hót kéo dài `3 + 2 × cấp` phút (`singUntil`) và tăng `today.sang`. Lần đầu hót ghi nhật ký và mở thành tựu.

### 14.4 Độ lửa (độ sung)

`data/song.js` `FIRE_BANDS`:

| Từ | Tên | Dấu hiệu |
|---|---|---|
| 0 | Xuống lửa | Lông hơi xù, thu mình, hót rời rạc hoặc bỏ hót, hay rỉa lông (loài có mào: mào cụp) |
| 40 | Vừa lửa | Lông ép gọn, đứng thẳng, nhảy cầu đều |
| 75 | Căng lửa | Lông ép sát, đuôi vểnh, hót to và đều |
| 90 | Quá lửa | Nhảy loạn lồng, đập cánh, hót gắt: bớt mồi, giọng mồi, cho tắm |

Độ sung lên khi khỏe, vui, no; gần đỉnh (> 80) chỉ lên 25% tốc độ. Mồi tươi và giọng mồi tăng thêm, cà phê chim và hội thi tăng 6 và 4. Tắm hạ 4 khi trên 80.

### 14.5 Giọng mồi (`tutor`)

"Cho nghe giọng mồi" (20 phút): mở tiếng một con chim hót hay cho chim tập theo. Chỉ loài hót. Bị chặn khi trùm áo, sau 19 giờ, khi chim ốm.

| Tình huống | Hiệu ứng |
|---|---|
| Chim mới về | Mood −6, tính là làm phiền (`talks++`) |
| Từ lần thứ 3 trong ngày | Mood −8, độ sung −2 ("đè lửa") |
| Đang thay lông | Mood −2, không có tác dụng |
| Bình thường | Độ sung +1,5 (đúng giờ) hoặc +0,8 (sai giờ), mood +1 |

Giờ tốt: 6:00–7:30 hoặc 15:00–16:30 (loa cách lồng 2–3 m). Mở sai giờ tăng `tutorOff` và chỉ được nửa tác dụng. Chim chuyền nghe giọng chuẩn đều đặn thì lai giọng giảm 4.

### 14.6 Lai giọng (`mix`)

Chỉ áp cho chim chuyền loài hót. Chim tơ đang học nghe tạp âm, hay chim hót dở thì học lẫn, rất khó sửa.

- Nguồn cộng: karaoke ồn không xử lý +22; đi cà phê chim +10.
- Vượt 20 thì nhật ký cảnh báo "bắt đầu lai giọng".
- Ảnh hưởng: điểm giọng cuối ngày trừ `mix / 25`.
- Giảm: nghe giọng mồi chuẩn đúng giờ (−4 mỗi lần, chỉ chim chuyền).

### 14.7 Cân bằng đã kiểm chứng bằng test 14 ngày

Chăm tốt thường đạt Hót đổ dài. Thêm giọng mồi 2 lần mỗi ngày đạt Giọng vàng vào ngày 13–14. Chăm qua loa (không đồ tươi, nắng, trò chuyện) ở Chưa ra giọng.

---

## 15. Học nói

Chỉ loài nói (yến phụng, sáo). Khi `talk`, chim đã quen nhà, `trust ≥ 35` và `mood > 50`:

```
talkProg += (sao ? 14 : 11) × talkK của tuổi
```

Đủ 100 thì thêm câu kế tiếp trong `sp.words`, ghi nhật ký, chim nói ngay. Chim chuyền học nhanh nhất (×1,5), chim lâu năm chậm (×0,6). Thân thiết chưa đủ 35 thì chỉ trò chuyện, chưa học nói.

Chim đã biết nói thỉnh thoảng buột miệng một câu (xác suất 0,003 mỗi phút khi không trùm áo, `mood > 50`). Sự kiện "Hàng xóm sang nghe chim nói" xuất hiện khi chim đã biết ít nhất một câu.

---

## 16. Thay lông

`S.molt` bật vào ngày bắt đầu và tắt vào ngày xong theo tuổi (mục 12). Nhật ký nhắc ngoài đời thay lông kéo dài 1–2 tháng, thường vào mùa thu; trong game rút gọn để bài học nằm trong ván.

Trong lúc thay lông:

- Chim yếu, ít hót, không hót hẳn trong lúc `molt` bật; giọng đứng yên; độ sung giảm `0,008 / featherMolt` mỗi phút.
- Cuối ngày: điểm lông `c` cộng 1 mỗi khi (tắm không muộn) / (nắng đủ hoặc trời mưa) / (có đồ tươi hoặc mồi); trừ 1,5 nếu cho ăn món cấm (`moltBad`). Lông đổi `(c − 1,6) × 4`, độ sung −3.
- Giọng mồi vô tác dụng; không nên mang chim đi thi hoặc đi cà phê chim (đi thì mood −15, nguy cơ ngã nước và cảm lạnh tăng).
- Chào mào tránh sâu quy (`moltAvoid`). Chuối không cấm; cho quá 2 lần trong ngày thì chế độ Người mới thấy mục "Chuối nên cho vừa phải" (không chấm điểm).
- Món `pigment` trong ngày (đang thay lông): điểm lông `c` +0,5. Hết mùa thay lông, có món `pigment` ở ít nhất nửa số ngày thì `S.redVent = true`: nhật ký khen và cảnh 3D tô đỏ đậm lông dưới đuôi.

Thay lông xong: nhật ký khen nếu lông ≥ 75, ngược lại nhắc chú ý lần sau. Chim chuyền ghi thêm đã khoác bộ lông trưởng thành. Thành tựu "Qua mùa thay lông" cần lông ≥ 85 lúc kết thúc.

---

## 17. Chỗ treo lồng

`src/data/locations.js`:

| Khóa | Tên | Đặc điểm |
|---|---|---|
| `san` | Ngoài sân | Nắng trực tiếp; chỉ mang ra khi phơi nắng (tạm thời) |
| `hien` | Hiên trước nhà | Thoáng, nhiều ánh sáng. Đêm cần trùm áo, coi chừng mèo và gió lùa |
| `phongkhach` | Phòng khách | Kín gió, ấm. Gần bàn thờ nên cẩn thận khói nhang; tối đèn, tivi làm chim mất ngủ |
| `bep` | Gần bếp | Tiện trông nhưng nguy hiểm: khói dầu mỡ, khí độc chảo chống dính |

Chỗ treo cố định chọn được: hiên (mặc định), phòng khách, bếp. Treo bếp bị chấm ✗ "Treo lồng gần bếp" mỗi ngày và nhật ký nhắc mỗi sáng. Loài lãnh thổ bị chấm khi đổi chỗ.

---

## 18. Sự kiện gia đình

`src/core/householdEvents.js`. Đầu mỗi ngày, mỗi sự kiện tung xúc xắc theo `chance`; trúng thì gán một phút ngẫu nhiên trong khung giờ `[from, to]`. Đến phút đó, nếu điều kiện `when(S)` đúng và hôm nay chưa xảy ra, game dừng và hỏi người chơi chọn một trong hai phương án. **Phương án thứ nhất luôn là cách làm đúng** (test tự động dựa vào điều này). Một ván chăm tốt gặp khoảng 18–21 sự kiện.

| Id | Tên | Khung giờ | Xác suất | Điều kiện | Cách đúng | Làm sai thì |
|---|---|---|---|---|---|---|
| `nhang` | Thắp nhang | 17:00–18:30 | 0,45 | Lồng ở phòng khách | Mang ra hiên | Ngộ độc khí +45, mood −5 |
| `chao` | Chảo bốc khói | 10:40–11:30 | 0,5 | Lồng ở bếp hoặc phòng khách | Tắt bếp, mở cửa, mang ra hiên | Ngộ độc khí +120 (bếp) hoặc +50 |
| `khach` | Khách đến chơi | 9:00–16:00 | 0,3 | Không trùm áo | Từ chối đồ ăn người | Cho ăn đồ mặn (hại) |
| `meo` | Mèo rình lồng | 18:00–19:30 | 0,4 | Hiên hoặc sân, không trùm áo | Trùm áo, treo cao | Mood −12, thân thiết −3, ngã nước +10 (chim mới +40) |
| `cafe` | Rủ đi cà phê chim | 7:00–8:30 | 0,25 | Từ ngày 2, không trùm áo | (đi hoặc không, tùy chim) | Chim mới, thay lông, ốm đi: mood −15, ngã nước +25, cảm +15 |
| `gio` | Gió mùa về | 16:00–17:30 | 0,8 | Trời lạnh, lồng ở hiên, không trùm áo | Trùm áo, mang vào phòng khách | Cảm lạnh +40 |
| `thuoc` | Khói thuốc | 14:00–17:00 | 0,2 | Phòng khách hoặc hiên | Nhờ khách ra xa | Ngộ độc khí +35 |
| `karaoke` | Hàng xóm hát karaoke | 17:30–19:30 | 0,15 | Không ở sân | Trùm áo, vào phòng khách đóng cửa | Mood −12, độ sung −4, ngã nước +30 (chim mới), lai giọng +22 |
| `treem` | Trẻ con gõ lồng | 15:00–17:30 | 0,1 | Không trùm áo | Cho ngắm từ xa, giải thích | Mood −12, thân thiết −4, lông −2 |
| `nom` | Trời nồm ẩm | 8:30–11:00 | 0,5 | Ngày nồm hoặc mưa lạnh, máng còn cám | Bỏ cám ẩm, lau máng, thay cám mới | Tiêu chảy +35 |
| `chuot` | Chuột mò tới lồng | 17:30–19:30 | 0,12 | Không ở sân | Trùm áo, dọn đồ ăn rơi vãi | Mood −6, tiêu chảy +30 |
| `matdien` | Mất điện giữa trưa nắng | 12:30–15:00 | 0,3 | Ngày nóng, lồng ở phòng khách hoặc bếp | Ra hiên râm mát, thay nước mát | Sốc nhiệt +50, mood −6 |
| `thi` | Hội thi chim hót | 7:00–9:00 | 0,35 | Loài hót, sau thay lông, chưa thi, chưa đi cà phê | Trùm áo mang đi thi (mục 19) | (ở nhà: không sao) |
| `nghenoi` | Hàng xóm sang nghe chim nói | 16:00–17:30 | 0,25 | Loài nói biết ≥ 1 câu, không trùm áo | Cho nói vài câu rồi cho nghỉ | Mood −12, thân thiết −3 |

Ghi chú:

- `cafe`: phương án "Đi" là tốt nếu chim khỏe và không phải chim mới/thay lông: mood +6, độ sung +6, giọng cuối ngày +2, nhưng tăng nguy cơ tiêu chảy +15, cảm +10; chim tơ lai giọng +10. Mất 120 phút thật.
- Sự kiện làm bận người chơi theo số phút trả về của phương án (đi thi 180, cà phê 120…).

---

## 19. Hội thi chim hót

Chỉ loài hót, chỉ sau mùa thay lông, mỗi ván thi tối đa một lần. Điểm:

```
điểm = giọng × 0,55 + độ sung × 0,2 + sức khỏe × 0,1 + lông × 0,15 ± 4 (ngẫu nhiên)
```

Từ 85 giải nhất, từ 75 giải nhì, từ 65 giải ba, dưới đó không đạt giải. Kết quả lưu ở `S.contest = { place, day }` (`place` 0 là không đạt giải).

Chim ốm, đang thay lông, còn mới, hoặc sức khỏe dưới 60 thì các nghệ nhân khuyên mang về, chỉ mất chút tâm trạng (−4, 60 phút): bài học là chỉ mang chim khỏe đi thi, không thi khi đang thay lông.

Đi thi thành công: mood +6 (có giải) hoặc +2, độ sung +4, nguy cơ tiêu chảy +10, cảm +5, `today.cafe = true` (giọng cuối ngày +2), mất 180 phút.

---

## 20. Tổng kết cuối ngày và cách chấm điểm

`endDay` trong `src/core/dayCycle.js` tạo danh sách mục `{ ok, label, note }` với `ok` là `true` (✓), `false` (✗), hoặc `null` (không tính). Điểm ngày:

```
điểm = round(100 × số ✓ / max(1, số ✓ + số ✗))
```

Mục `null` (ví dụ "Bớt mồi để hạ lửa", "Tắm nắng" ngày mưa) không tính vào điểm. Kết quả ghi vào `S.hist`, `newDays` giảm 1.

Các mục chấm, theo thứ tự trong code:

| Mục | ✓ khi | ✗ khi (hệ quả) |
|---|---|---|
| Ngủ đúng giờ | Không có mục riêng khi ngủ trước 20:30 | Ép ngủ 22:00: mood −10. Ngủ sau 20:30: mood −4 ("Ngủ hơi muộn") |
| Thức ăn chính | Ăn đủ ≥ 5 và độ chấp nhận trung bình ≥ 0,8 và đã thay mới | Ăn < 5: máu −6, độ sung −6; chấp nhận < 0,8: sung −4, lông −2; chưa thay mới: tiêu chảy +10 |
| Đồ tươi | Có trái cây hoặc rau (loài cần) | Thiếu: sung −6, lông −2 |
| Mồi mềm (chim non) | ≥ 2 bữa đạm | Thiếu: sung −6, lông −3 |
| Mồi tươi (loài cần, không non) | Có đạm hôm nay | Đã ≥ 3 ngày chưa có (và sung ≤ 85): sung −8, lông −3. Sung > 85: mục `null` "Bớt mồi để hạ lửa" |
| Khoáng (vẹt) | Có hôm nay | Đã ≥ 7 ngày chưa có: máu −4 |
| Nước | Có thay | Chưa thay |
| Dọn lồng | Đã dọn, lau ẩm | Chưa dọn; hoặc quét khô ("chưa an toàn cho người") |
| Nắng sớm | `sunGood ≥ sun[0]` | Thiếu nắng: sung −4, lông −2; phơi quá `sun[1] + 30`: mood −6; nắng trưa ≥ 10 phút |
| Tắm | Có tắm, không muộn | Tắm muộn; hoặc lâu chưa tắm và trời không lạnh: lông −5, rận mạt +20 |
| Đồ không phù hợp | | Có món trong `today.bad` |
| Treo lồng gần bếp | | Đang treo bếp |
| Đổi chỗ treo (loài lãnh thổ) | | Có đổi |
| Chim mới | Yên tĩnh (trò chuyện ≤ 2) | Bị làm phiền (> 2): mood −8 |
| Chim ốm | (mục `null` để chim nghỉ) | |
| Gần gũi (loài hót) | Có trò chuyện hoặc giọng mồi | Không: mood −3 |
| Trò chuyện (loài nói) | Có | Không: mood −3 |
| Bệnh, thuốc | Mục 10.6 | Mục 10.6 |
| Áo lồng đêm | Có trùm | Không trùm: mood −10, đêm lạnh cảm +40, ở hiên 40% bị mèo (mood −20, thân thiết −5) |
| Lông ướt lúc ngủ | | Cảm +70 |
| Đồ tươi qua đêm | | Ôi, lồng −20, tiêu chảy +30 |
| Thức ăn để lâu | | `feeder.days ≥ 2`: tiêu chảy +25 |
| Cám ngày nồm | | Ngày nồm chưa đổ cám mới: tiêu chảy +25 |

Sau khi chấm: nếu đang thay lông thì tính lông (mục 16); sức khỏe +4 nếu đủ điều kiện; cập nhật giọng (`growSong`); kẹp chỉ số.

Nếu chim không ốm và `hunger > 30`, `cage > 40` thì máu +4 cuối ngày.

---

## 21. "Việc hôm nay"

`dailyGoals(S, sp)` trong `src/core/goals.js` là hàm thuần trả danh sách `{ id, label, done, hint }`, **khớp tiêu chí chấm điểm cuối ngày**. Chỉ hiện ở chế độ Người mới.

| Id | Nhãn | Hiện khi | Đạt khi |
|---|---|---|---|
| `staple` | Thay thức ăn chính đúng loài | Luôn | Đã thay mới và chim ăn đúng loại (≥ 0,8) |
| `water` | Rửa cóng, thay nước sạch | Luôn | Đã thay nước |
| `fresh` | Cho trái cây, rau tươi | Loài cần | `today.fresh > 0` |
| `soft` | Chim non: mồi mềm 2 bữa | Chim non | `today.protein ≥ 2` |
| `protein` | Cho mồi tươi | Loài cần, và đã ≥ 3 ngày chưa có (sung ≤ 85) | `today.protein > 0` |
| `mineral` | Cho xương mực, đá khoáng | Vẹt, đã 5 ngày chưa có | Đã cho |
| `sun` | Tắm nắng sớm | Trời không mưa | Nắng đủ, không quá lâu, không trưa gắt |
| `bath` | Cho tắm trước 17 giờ | Đã tắm hôm nay, hoặc đến hạn và trời không lạnh | Có tắm, không muộn |
| `clean` | Dọn lồng: lau ẩm, đeo găng | Luôn | Đã dọn, không quét khô |
| `quiet` | Để chim mới yên tĩnh | Chim mới | Trò chuyện ≤ 2 |
| `bond` | Trò chuyện hoặc giọng mồi / dạy nói | Chim khỏe, hết thời chim mới | Có trò chuyện hoặc giọng mồi |
| `medicine` | Cho chim uống thuốc | Đang điều trị | Đã uống hôm nay |
| `sleep` | Trùm áo, cho ngủ trước 20:30 | Luôn | Chỉ đạt khi đã xem tổng kết, có áo, ngủ trước 20:30 |

Chim ốm không bị giao việc trò chuyện.

---

## 22. Tổng kết cuối ván và thành tựu

### 22.1 Tổng kết (`finalSummary`)

Điểm trung bình `avg` của các ngày, và danh hiệu:

| Điểm | Danh hiệu |
|---|---|
| ≥ 85 | Người nuôi chim tận tâm |
| ≥ 70 | Người nuôi chim chu đáo |
| ≥ 50 | Người nuôi chim đang học việc |
| < 50 | Cần học thêm nhiều |

Kèm danh sách thành quả (đã hót, số câu nói được, lông mượt, chim dạn, luôn dọn an toàn, giọng đạt cấp ≥ 2, giải hội thi), 4 mẹo đầu của loài, biểu đồ điểm các ngày, mức giọng cuối, kết quả hội thi.

### 22.2 Mười một thành tựu

Lưu qua nhiều ván trong localStorage khóa `longtre-achievements-v1`, dạng `{ got: { id: { at, sp } }, done: { loài: số ván nuôi trọn } }`. Không bị xóa khi hết ván. Game kiểm tra sau mỗi lượt chạy thời gian, cuối ngày, khi hết thay lông, và khi nuôi trọn 14 ngày; mỗi lần phát sự kiện `achievement` với danh sách mới mở.

| Id | Tên | Điều kiện |
|---|---|---|
| `first_song` | Tiếng hót đầu tiên | Chim cất tiếng hót lần đầu |
| `golden_voice` | Giọng vàng | Giọng ≥ 90 |
| `first_word` | Câu nói đầu tiên | Nói được câu đầu |
| `chatterbox` | Chim lắm lời | Nói hết các câu |
| `champion` | Vô địch hội thi | Giải nhất |
| `never_sick` | Khỏe trọn 14 ngày | Nuôi trọn ván, `sickCount = 0` (tính cả ủ bệnh) |
| `safe_keeper` | Người nuôi cẩn thận | Nuôi trọn ván, `ownerRisk = 0` (không quét khô) |
| `perfect_day` | Ngày trọn vẹn | Một ngày 100 điểm |
| `molt_master` | Qua mùa thay lông | Lông ≥ 85 lúc hết thay lông |
| `hard_species` | Tay nuôi lành nghề | Nuôi trọn khuyên hoặc họa mi, điểm trung bình ≥ 80 |
| `all_species` | Đủ sáu loài | Nuôi trọn ván với cả 6 loài |

Nếu không có localStorage (Node, chế độ riêng tư) thì thành tựu chỉ giữ trong bộ nhớ, không lỗi.

---

## 23. Chế độ chơi

`S.mode`, đổi được giữa ván bằng nút trên thanh trên cùng (`#modeBtn`), không ảnh hưởng điểm.

**Người mới** (`moi`, mặc định): thấy thanh chỉ số, bong bóng nhu cầu, hướng dẫn ngày đầu (`coach`), "Việc hôm nay", số phần trăm máng ăn, dòng dấu hiệu dưới thẻ chim chỉ có dấu hiệu chính.

**Người chơi lâu năm** (`lau`): ẩn bảng 9 chỉ số (`#stats`, `#statsMore`), số nổi `floatDeltas`, bong bóng nhu cầu (`#needs`), hướng dẫn ngày đầu, danh sách "Việc hôm nay". Máng ăn ghi bằng chữ (đầy, vơi nửa, sắp hết, trống); số phút nắng giữ nguyên. Bảng chấm điểm cuối ngày vẫn giữ (đó là lúc người chơi học). Dòng dấu hiệu dưới thẻ chim hiện thêm **tối đa 2 dấu hiệu phụ** (`describeSigns().more`): nước đục, nước gần cạn, khay đầy, máng vơi hoặc trống, đồ tươi ôi, lông xơ, chim chưa hót cả buổi sáng.

Công cụ chính của chế độ này là "Quan sát kỹ" (`observe`).

`describeSigns` (dấu hiệu chính) ưu tiên theo thứ tự: ủ bệnh (dấu hiệu sớm), đang điều trị, phát rõ, đang ngủ trong áo lồng, hết nước, đói, nắng gắt, đang hót, trùm áo, thay lông, quá lửa, xuống lửa, chim còn nhát hoặc mood thấp, mood cao, bình thường.

---

## 24. Giao diện

Giao diện DOM, không dùng framework (`src/ui/`).

- **`Hud.js`**: thanh trên (ngày, giờ, thời tiết, âm thanh, chế độ, góc nhìn, ngắm chim, nghe chim), thẻ chim (tên, cấp giọng, thẻ tính cách, thẻ bệnh), chỉ số, nhật ký nổi, bảng hành động có phím tắt, "Việc hôm nay", bong bóng nhu cầu, gợi ý (`data-tip`), thông báo thành tựu. Desktop có bảng nổi hai bên; điện thoại có bảng tab phía dưới.
- **`Modals.js`**: màn đón chim (chọn loài, tuổi, vùng, chế độ, tên), các màn chọn (thức ăn chính, đồ tươi, cách dọn, chỗ treo), hộp thoại sự kiện, tổng kết ngày (kèm biểu đồ), tổng kết cuối ván, màn chim chết, Sổ tay, nhật ký đầy đủ, danh sách thành tựu.
- **`Club.js`**: Hội chim (mục 28).
- **`icons.js`**: biểu tượng SVG (`icon(name)`, `ACTION_ICON`, `WEATHER_ICON`, `LOG_ICON`).
- **`styles.css`**: phong cách Việt (giấy dó, tre, sơn mài, chàm). Hỗ trợ chế độ sáng tối, giảm chuyển động (`prefers-reduced-motion`), lớp `lite` cho card đồ họa yếu (bỏ kính mờ).

**Sổ tay** (`data/handbook.js`, phím S): chín mục kiến thức thật: việc hằng ngày, chỗ treo lồng, chim mới về, tuổi chim và giọng hót, độ lửa, dấu hiệu bệnh, thay lông, sức khỏe người nuôi (sốt vẹt), nguồn gốc và pháp luật. Kèm lời khuyên hỏi bác sĩ thú y.

**Nghe chim khi treo máy** (phím L, hoặc tự bật sau `AFK_MS` = 2 phút không thao tác): các bảng ẩn, chim hót theo nhịp thật (mục 26.4). Chỉ vào được khi game đang chạy. Thao tác bất kỳ để quay lại. Ở chế độ giờ thật, đồng hồ chăm chim vẫn trôi như thường.

**Chế độ Ngắm chim** (phím H): ẩn các bảng để ngắm cảnh.

**Phím tắt**: bảng ở mục 7.

---

## 25. Cảnh 3D

Dựng thủ tục bằng Three.js, không file model ngoài (`src/render/`).

| File | Vai trò |
|---|---|
| `World.js` | Renderer, camera (góc `close` và `wide`), picking, hậu kỳ, đồng bộ trạng thái game, hoạt ảnh phản hồi hành động và sự kiện |
| `House.js` | Nhà rường ba gian, hiên, sân, bể cạn, bình phong, bếp; cây treo lồng (`Stand`); gộp mesh tĩnh để giảm draw call |
| `Cage.js` | Lồng tre mái vòm, cóng, máng, áo lồng |
| `Bird.js` | Chim dựng thủ tục: lông tơ nhiều lớp (shell), viền sáng mép dáng, mắt hai đốm sáng, mỏ, đuôi; hoạt ảnh nhảy cầu, hót, ngủ, xù lông, rũ nước |
| `Sky.js` | Bầu trời, mặt trời chạy theo giờ, ánh sáng, bóng đổ, mưa, mây theo thời tiết |
| `Life.js` | Sinh vật nền (chim trời, côn trùng…) |
| `textures.js` | Texture vẽ bằng canvas (gạch bông, ngói, vải chàm…) |
| `thumbnails.js` | Ảnh 3D các loài cho màn chọn chim |

**Tối ưu cho card đồ họa yếu** (`World.weak`): phát hiện bằng chuỗi GPU (Intel, Mali, Adreno, PowerVR, SwiftShader, llvmpipe, Basic Render; ngoại trừ Intel Arc). Khi `weak`: tỉ lệ điểm ảnh tối đa 1 (thay vì 1,75), bóng đổ `PCFShadowMap` kích thước 2048 (thay vì 4096 và mềm), hậu kỳ dùng 2 mẫu MSAA (thay vì 4), bỏ vài hiệu ứng hậu kỳ, và `body.lite` bỏ kính mờ trên giao diện. Đây là nội dung của commit `6893532`.

Mô hình chim nhận thông số từ `species.js` (`model`) kèm bộ lông non (`stageModel`, `adultness`), nên chim chuyền đổi dần sang lông trưởng thành trong mùa thay lông. Cờ trạng thái (`f.sick`…) quyết định tư thế: ủ bệnh và đang điều trị chỉ xù lông nhẹ, phát rõ mới lim dim.

---

## 26. Âm thanh

Toàn bộ tổng hợp bằng Web Audio, không dùng file ghi âm (`src/audio/`). Trình duyệt chỉ cho phát âm thanh sau thao tác đầu tiên (`audio.unlock()`).

### 26.1 Thành phần

| File | Vai trò |
|---|---|
| `SoundEngine.js` | Đường tín hiệu, hiệp hót, tiếng gọi, nghe thử, nghe chim, cài đặt âm lượng (lưu `longtre-audio-v1`), vang theo chỗ treo (`PLACE`), độ to từng loài (`LOUD`) |
| `songs.js` | **Ngữ pháp tiếng hót** từng loài, hàm thuần (test được trên Node): `compose`, `call`, `speechNotes`, `planBout`, `voiceOf` |
| `synth.js` | Bộ phát nốt (`play`), vang phòng (`impulse`), bộ đệm tiếng ồn |
| `ambience.js` | Âm thanh môi trường: mưa, gió, ve sầu, dế, côn trùng; chim trời xa (`WILD`: sẻ, cu gáy, chào mào, chích chòe, bìm bịp) |
| `sfx.js` | Tiếng thao tác (đổ cám, rót nước, tắm, khiêng lồng…) |

### 26.2 Tiếng hót từng loài

Âm tiết là dữ liệu, ghép thành câu theo "ngữ pháp" mô phỏng cách hót thật. Cấp giọng 0–4: cấp 0 chỉ kêu lí nhí, cấp 1 hót rời rạc, cấp càng cao câu càng dài, nhiều kiểu, to và sáng. Mỗi con một giọng hơi khác (cao độ lệch ±5%, nhịp ±8%, cùng tên cùng giọng, `voiceOf`). Chào mào mỗi con thuộc 10 câu riêng. Họa mi lặp mỗi motif 2–4 lần rồi đổi. Vành khuyên líu nhanh 12–18 nốt mỗi giây.

**Giọng chim non** (`compose(..., { young })`): nhỏ, cao độ chưa vững, hay bỏ dở; vững dần khi giọng tiến bộ.

### 26.3 Tiếng gọi và tiếng người

- Tiếng gọi (`CALLS`): gọi thường, đòi ăn, báo động (hoảng), yếu (ốm). Phát khi chim đói, hoảng, ốm.
- Loài nói đọc câu đã học: dùng giọng đọc tiếng Việt của máy nếu có, kèm biến điệu dấu thanh (`speechNotes`).

### 26.4 Nhịp hót khi nghe chim (`SESSION`, `planBout`)

Chim thật không hót liên tục: hót thành hiệp, nghỉ, rỉa lông, hót tiếp. Mỗi loài có thông số `phrase` (độ dài câu), `gap` (nghỉ giữa câu), `n` (số câu mỗi hiệp), `rest` (nghỉ giữa hiệp), đo theo tài liệu `docs/LIFECYCLE_RESEARCH.md`. Sáng sớm (5:30–9:00) hót dày, 9–11 giờ thưa, trưa (11–14:30) rất thưa (nghỉ ×4), chiều vừa. Cấp giọng thấp thì câu ngắn, ngập ngừng, hiệp ngắn, nghỉ lâu.

Chim chỉ hót khi thật sự hót được (không trùm áo, không ốm, ban ngày, đủ vui); không thì im và dòng nhắc nói lý do. Vẫn phát khi chuyển sang tab khác. Đồng hồ nghe chim: ban ngày trôi chậm, đêm trôi nhanh rồi sáng lại.

---

## 27. Lưu trữ và đồng bộ

| Dữ liệu | Nơi | Khóa |
|---|---|---|
| Ván đang chơi | localStorage | `longtre-3d-save-v1` |
| Thành tựu | localStorage | `longtre-achievements-v1` |
| Cài đặt âm thanh | localStorage | `longtre-audio-v1` |
| Bản lưu trên mạng | Supabase bảng `saves` | một dòng mỗi tài khoản |

- **Tự lưu**: mỗi 15 giây khi đang chơi, khi ẩn trang (`pagehide`), và cuối mỗi ngày (khi hiện tổng kết). Hết ván hoặc chim chết thì xóa bản lưu (`clearGame`).
- Mọi thao tác localStorage bọc `try/catch`, chạy được khi bộ nhớ bị chặn.
- **Đồng bộ mạng**: cuối mỗi ngày game đẩy bản lưu lên nếu đã đăng nhập (`pushSave`, lỗi thì bỏ qua). Mở màn Tài khoản của Hội chim để đẩy tay hoặc tải về máy khác. Bản lưu chỉ để chơi tiếp giữa các máy, **không dùng chấm điểm** (client sửa được).
- Giới hạn bản lưu 1 MB mỗi tài khoản (migration `save_limit_1mb`).
- Mở bản lưu cũ: `Game.load` gọi `migrateState` bù trường thiếu (mục 4).

---

## 28. Hội chim (Supabase)

`src/ui/Club.js`, `src/net/supabase.js`, `supabase/migrations/`.

**Chức năng**

- Đăng nhập bằng email, mã 6 số gửi qua email (OTP), không mật khẩu. Có thể bật CAPTCHA Cloudflare Turnstile bằng cách điền `CAPTCHA_SITE_KEY`.
- **Tài khoản**: đổi tên hiển thị, đẩy và tải bản lưu, đăng xuất. Ai cũng tạo được tài khoản để đồng bộ ván.
- **Hỏi đáp**: chỉ email nằm trong danh sách mời `private.invites` mới thấy và đăng được. Chủ đề "Chim thật" hoặc "Chim trong game", tiêu đề 3–120 ký tự, nội dung tới 4000 ký tự, trả lời, xóa bài và trả lời của mình. Chủ đề chim thật kèm lưu ý game không thay bác sĩ thú y.

**Cơ sở dữ liệu** (RLS bật trên mọi bảng, quyền do chính sách quyết định):

| Bảng | Nội dung |
|---|---|
| `private.invites` | Danh sách email được mời (không mở qua API) |
| `public.profiles` | `id`, `display_name` (1–40 ký tự) |
| `public.saves` | `user_id`, `data` jsonb (< 1 MB), `updated_at` |
| `public.posts` | `author_id`, `topic`, `title`, `body` |
| `public.replies` | `post_id`, `author_id`, `body` |

Hàm: `private.handle_new_user` (trigger tạo hồ sơ; chặn tài khoản không có email), `private.is_member`, `public.is_club_member`. Ba migration theo thứ tự: `social_base` (lúc đầu chỉ email được mời mới đăng ký), `open_sync_signup` (ai cũng đăng ký để đồng bộ; Hỏi đáp vẫn riêng cho hội), `save_limit_1mb`.

**An toàn.** Khóa publishable nằm ở client được phép; quyền thật do RLS. Không bao giờ đưa secret hoặc `service_role` key vào client.

---

## 29. Kiến trúc mã nguồn

```
src/
  main.js              Khởi động: tạo Game, World, Hud, Modals, Club; nối sự kiện; vòng sync
  config.js            Hằng số cân bằng game
  data/                Dữ liệu thuần, không logic
    species.js         6 loài: dinh dưỡng, tập tính, thông số mô hình 3D
    foods.js           Thức ăn chính, món ăn thêm, đồ độc
    diseases.js        Bệnh: dấu hiệu, nguyên nhân, cách phòng, liệu trình
    locations.js       Chỗ treo lồng (tọa độ trong cảnh 3D)
    weather.js         Thời tiết, bảng xác suất theo vùng và tháng
    stages.js          Tuổi chim: hệ số, mùa thay lông, lông non, lai giọng
    traits.js          Tính cách ẩn, tung và lộ dần
    song.js            5 cấp giọng hót, 4 mức độ lửa
    handbook.js        Nội dung Sổ tay
  core/                Logic game, không phụ thuộc DOM hay Three.js
    Game.js            Điều phối: thời gian, hành động, sự kiện, ngày, thành tựu
    state.js           createState, migrateState, newToday
    simulation.js      Mô phỏng từng phút (stepMinute)
    actions.js         Hành động người chơi, observe, describeSigns
    illness.js         Diễn tiến bệnh, thú y, thuốc
    householdEvents.js Sự kiện gia đình có lựa chọn
    dayCycle.js        endDay, startDay, finalSummary, growSong
    goals.js           Việc hôm nay
    achievements.js    Thành tựu lưu qua nhiều ván
    EventBus.js, rng.js (mulberry32), save.js, util.js
  audio/               Web Audio
  render/              Three.js
  ui/                  Giao diện DOM
  net/supabase.js      Client Supabase, pushSave, pullSave
supabase/migrations/   3 file SQL
tests/                 audio.test.js, game.test.js, ui.test.js, setup.js
docs/                  Tài liệu thiết kế và nghiên cứu
```

### 29.1 Luồng dữ liệu một chiều

```
UI (nút, phím, chạm 3D)  ──game.act(id, payload)──▶  Game
                                                      │ chạy logic (core)
                                                      ▼
                            EventBus: change, act, log, event, report, final, over, achievement
                                                      │
                     World (đọc S để vẽ)  ◀───────────┤───────────▶  Hud, Modals (đọc S để hiển thị)
                     SoundEngine (phát tiếng)  ◀──────┘
```

Sự kiện `EventBus` (`Game.js`):

| Sự kiện | Khi nào |
|---|---|
| `change` | Trạng thái đổi: World, Hud, Audio đồng bộ |
| `act` | Người chơi vừa làm xong một hành động `{ id, payload }`: âm thanh và hoạt ảnh phản hồi |
| `log` | Dòng nhật ký mới |
| `event` | Sự kiện gia đình cần chọn |
| `report` | Tổng kết cuối ngày: lưu, đẩy mạng, hiện bảng |
| `final` | Hết 14 ngày |
| `over` | Chim chết |
| `achievement` | Có thành tựu mới mở |

`Game.pending` (`event`, `report`, `final`, `over`) khóa mô phỏng trong lúc chờ người chơi quyết định (`Game.running` là false).

### 29.2 Điểm vào và gỡ lỗi

`main.js` nối mọi thứ và chạy `setInterval(() => game.sync(), TICK_MS)`. Mở trang với `#debug` (hoặc chạy ở môi trường dev) để dùng `window.lt = { game, world, hud, modals, audio }` từ console.

---

## 30. Kiểm thử

Chạy bằng `npm test` (Vitest, `tests/**/*.test.js`, môi trường Node, `tests/setup.js`). Nhờ tách lớp `core`, toàn bộ luật chơi test được trên Node với RNG có seed và `now` cố định.

| File | Phạm vi |
|---|---|
| `tests/game.test.js` | Mô phỏng 14 ngày (yến phụng, chào mào), bỏ bê (chết vì khát), ngộ độc, đổi thức ăn, ngủ, chảo bốc khói, dọn khô, giọng hót và giọng mồi, việc hôm nay, 14 sự kiện (phương án 0 luôn là tốt), hội thi, thành tựu (đủ 11, không localStorage, lưu qua ván), bản lưu cũ, tuổi chim, lai giọng, khớp "việc hôm nay" với cách chấm, thay lông theo tuổi, đồng hồ giờ thật, tùy chọn ván mới, thời tiết theo vùng, bệnh và liệu trình, tính cách, dấu hiệu phụ |
| `tests/audio.test.js` | Ngữ pháp tiếng hót (nốt hợp lệ, dải tần, cấp cao dày hơn, khuyên 12–18 nốt/giây, họa mi lặp motif 2–4 lần, giọng riêng theo tên), tiếng gọi, nhịp hót khi ngồi nghe, giọng chim non, đồng hồ nghe chim |
| `tests/ui.test.js` | Test khói giao diện (`happy-dom`): vẽ qua nhiều ngày, mọi tuổi chim, nghe chim, ngắm chim, bấm việc hôm nay; chế độ lâu năm ẩn chỉ số và hiện dấu hiệu phụ; chim đang điều trị có nút thuốc |

Quy ước khi thêm test: cố định `now` (ví dụ một ngày trong tháng 10), `region`, `traits` bình thường để kết quả tái lập; các test cân bằng 14 ngày phải giữ nguyên kết quả.

---

## 31. Build và deploy

```bash
npm install
npm run dev            # máy chủ phát triển, http://localhost:5173
npm test               # bộ test Vitest
npm run build          # bản nhiều file -> dist/
npm run build:single   # bản 1 file HTML duy nhất -> dist-single/index.html
npm run preview        # xem bản build
```

`vite.config.js`: `base: './'` (chạy được từ thư mục con), chế độ `single` dùng `vite-plugin-singlefile`, cảnh báo kích thước chunk nâng lên 1500 kB.

**Deploy**: workflow `.github/workflows/deploy.yml` chạy khi đẩy lên `main` (hoặc chạy tay): `npm ci`, `npm test`, `npm run build`, rồi đưa `dist/` lên GitHub Pages. Test lỗi thì không deploy.

---

## 32. Hướng dẫn mở rộng và cân bằng

**Thêm loài.** Thêm một mục vào `src/data/species.js` (độ chấp nhận thức ăn chính `staple`, đánh giá `food`, nhu cầu `needs`, thông số `model` 3D, bộ lông non `juvenile`) và vào `SPECIES_ORDER`. Với loài hót, thêm ngữ pháp tiếng vào `src/audio/songs.js` (`SONGS`, `SESSION`) và độ to vào `SoundEngine` (`LOUD`). Cập nhật thành tựu `all_species` (tự động theo `SPECIES_ORDER`) và test đếm loài.

**Thêm sự kiện.** Thêm một mục vào `HOUSEHOLD_EVENTS` trong `src/core/householdEvents.js` với `id`, khung giờ, `chance`, `when`, `title`, `text`, `choices`. **Lựa chọn đầu phải là cách đúng** (test kiểm tra điều này). Thêm id vào `QUIET_EVENTS` trong `World.js` nếu cần tạm lặng tiếng.

**Thêm món ăn.** Thêm vào `FOODS` và đánh giá `[điểm, giải thích]` trong `food` của từng loài (không ghi thì lấy `COMMON_FOOD`).

**Thêm bệnh.** Thêm vào `DISEASES` (`dmg`, `early`, `course`, `sign`, `cause`, `prevent`) và `RISK_KEYS` nếu có bộ đếm nguy cơ; thêm nguồn cộng nguy cơ ở `simulation.js` hoặc `actions.js`.

**Thêm thời tiết.** Thêm vào `WEATHER`, bảng `WEATHER_TABLE`, `WEATHER_ICON`, khung mây trong `Sky`, và lời khuyên trong `startDay`.

**Thêm trạng thái mới.** Thêm vào `createState` để `migrateState` tự bù cho bản lưu cũ. Trường lồng nhau thì thêm khóa vào danh sách trong `migrateState`.

**Cân bằng.** Chỉnh `src/config.js` và các hệ số trong `simulation.js`, `dayCycle.js`, `stages.js`, `traits.js`; rồi chạy `npm test` (đặc biệt các test cân bằng 14 ngày: giọng vàng, chăm tốt điểm cao, chăm qua loa không lên cấp).

---

## 33. Phụ lục: bảng tra nhanh

### 33.1 Mốc giờ trong ngày

| Giờ | Ý nghĩa |
|---|---|
| 6:00 | Ngày bắt đầu; chim hót nhiều nhất 6–9 |
| 6:00–7:30 hoặc 15:00–16:30 | Giờ tốt cho giọng mồi |
| 6:00–9:30 | Khung nắng tốt (ngày rét: 8:00–10:30) |
| 11:00–15:00 | Nắng trưa gắt, dễ sốc nhiệt |
| 12:00 | Chim non nên tắm sau mốc này |
| 17:00 | Tắm sau mốc này là tắm muộn |
| 18:00 | Từ giờ này mới cho ngủ |
| 19:00 | Không tắm, không giọng mồi sau mốc này |
| 20:30 | Ngủ sau mốc này bị chấm muộn |
| 22:00 | Tự kết thúc ngày |

### 33.2 Hệ số tính cách

| | Nhát / Kén / Chậm lửa | Dạn / Ham / Lên lửa nhanh |
|---|---|---|
| Thân thiết khi trò chuyện | ×0,6 | ×1,4 |
| Hoảng lúc mới về | ×1,5 | ×0,6 |
| Nguy cơ ngã nước | ×1,4 | ×0,6 |
| Tốc độ đói | ×0,9 | ×1,15 |
| Vui khi ăn món hợp | ×0,5 | ×1,3 |
| Độ sung tăng | ×0,7 | ×1,6 |
| Ngưỡng quá lửa | 90 | 85 |

### 33.3 Thời gian các việc

Thú y 120 phút (60 nếu chim khỏe hoặc đang điều trị), đi thi 180, cà phê chim 120, dọn lồng ướt 15, trò chuyện 15, giọng mồi 20, tắm 10, thức ăn 5, nước 5, uống thuốc 3, phơi nắng 2, trùm áo 1, chờ 30.

### 33.4 Tài liệu liên quan

| File | Nội dung |
|---|---|
| `README.md` | Giới thiệu, chạy thử, tính năng |
| `docs/GAME_DESIGN.md` | Ý đồ thiết kế và bài học cốt lõi |
| `docs/RESEARCH.md` | Nghiên cứu cách nuôi chim |
| `docs/LIFECYCLE_RESEARCH.md` | Vòng đời, tuổi, giọng hót, độ lửa |
| `docs/GAME_RESEARCH.md` | Bài học từ game cùng thể loại |
| `docs/SOCIAL_RESEARCH.md` | Nghiên cứu chơi chung, Hội chim |
| `docs/SCORECARD.md` | Bảng đánh giá |
| `docs/superpowers/specs/`, `docs/superpowers/plans/` | Đặc tả và kế hoạch các đợt nâng cấp |

### 33.5 Lưu ý

Game rút gọn thời gian (thay lông ngoài đời kéo dài 1–2 tháng) và đơn giản hóa nhiều chi tiết sinh học. Các con số như số phút phơi nắng là xấp xỉ để chơi được. Với chim thật, hãy hỏi bác sĩ thú y và người nuôi lâu năm.
