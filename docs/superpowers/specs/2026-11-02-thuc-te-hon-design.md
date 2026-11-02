# Lồng Tre thực tế hơn: đọc chim, bệnh có liệu trình, thời tiết theo mùa, tính cách chim

Ngày: 2026-11-02.

## 1. Ý đồ

Người dùng muốn lối chơi và phong cách chơi "giống thực tế nhất". Game hiện đã mô phỏng khá sát (đồng hồ giờ thật, nguy cơ bệnh tích dần, tuổi chim, thay lông, giọng mồi, sự kiện trong nhà). Chỗ còn "giống game" nhất:

1. Người chơi nhìn 9 thanh chỉ số và bong bóng nhu cầu; người nuôi thật chỉ có mắt và tai.
2. Bệnh bật ra tức thì khi nguy cơ chạm 100, đi thú y 2 tiếng là khỏi hẳn.
3. Thời tiết tung xúc xắc 3 loại, không theo mùa, không theo vùng.
4. Mọi con chim cùng loài, cùng tuổi đều giống hệt nhau.

Người dùng chọn làm cả bốn phần dưới đây (mục 5–8). Nguyên tắc chung giữ như cũ: hệ quả có nhân quả, suy ra được; nhật ký giải thích vì sao; game không phụ thuộc DOM trong `src/core`, test được trên Node.

## 2. Mục tiêu

- Có chế độ "Người chơi lâu năm" buộc người chơi đọc dấu hiệu của chim thay vì đọc số.
- Bệnh có giai đoạn ủ bệnh (dấu hiệu sớm), thú y kê thuốc theo liệu trình, bỏ liều thì tái bệnh.
- Thời tiết theo tháng thật và vùng (Bắc, Trung, Nam), có rét, nồm, mưa rào mùa hè; mỗi kiểu đổi cách chăm.
- Mỗi con chim có tính cách ẩn, người chơi nhận ra dần qua quan sát và chăm sóc.

## 3. Không làm

- Tiền, kho đồ, chợ chim.
- Đấu chim, sinh sản.
- Mùa thay lông theo lịch thật: vẫn giữ ngày 6–11 trong ván 14 ngày (bài học phải nằm trong ván). Chỉ sửa câu nhật ký nếu cần.
- Hành động "trùm nửa áo", lồng sưởi riêng cho chim ốm.
- Thành tựu mới (test hiện đếm đúng 11 thành tựu).
- Mô hình 3D mới cho thời tiết (tuyết, sương mù thể tích). Chỉ chỉnh tham số `Sky` sẵn có.
- Thay đổi Supabase, Club.

## 4. Quy ước chung

- Trạng thái mới đều thêm vào `createState` (`src/core/state.js`) để `migrateState` tự bù cho bản lưu cũ. Trường lồng nhau mới (ví dụ `S.traits`) cần thêm vào danh sách khóa lồng nhau trong `migrateState` hoặc tự bù ở `Game.load`.
- Bản lưu cũ mở ra: `mode = 'moi'`, `region = 'trung'`, tính cách đều "bình thường" và đã biết, bệnh đang có (`{ type, since }`) coi là giai đoạn rõ, chưa điều trị.
- Mọi ngẫu nhiên đi qua `ctx.rng` (có seed). Test phải tái lập được: `Game` đã có tham số `now`; test cũ cần cố định `now` (một ngày cố định, ví dụ 2026-10-15 08:00) và có cách ép `region`, `traits` khi tạo ván.
- `Game.newGame(sp, name, stage)` mở rộng thành `newGame(sp, name, stage, opts = {})` với `opts = { mode, region, traits }`. `traits` chỉ dùng cho test; không truyền thì tung ngẫu nhiên.
- Màn đón chim (`Modals.start`) thêm hai lựa chọn sau bước tuổi, trước bước đặt tên: vùng ("Nhà bạn ở đâu?": Bắc, Trung, Nam; mặc định Trung vì nhà trong game là nhà rường Huế) và chế độ chơi (mặc định Người mới). `onNew` truyền thêm `opts`.

## 5. Phần 1: Đọc chim, không đọc số

`S.mode`: `'moi'` (Người mới, như hiện nay) hoặc `'lau'` (Người chơi lâu năm).

Chế độ Lâu năm ẩn:
- Bảng 9 chỉ số `#stats` (và nút xem thêm `#statsMore`), số nổi `floatDeltas`.
- Bong bóng nhu cầu `#needs`.
- Hướng dẫn ngày đầu (`coach`).
- Danh sách "Việc hôm nay" trong ngày. Bảng tổng kết cuối ngày ✓/✗ vẫn giữ: đó là lúc người chơi học.
- Số phần trăm máng ăn trong bảng `#cups`: thay bằng chữ (đầy, vơi nửa, sắp hết, trống). Số phút nắng giữ nguyên (người nuôi thật biết mình phơi bao lâu).

Thay vào đó dòng dấu hiệu `describeSigns` phải đủ để chơi. Hiện nó chỉ trả một dấu hiệu ưu tiên cao nhất; đổi thành trả dấu hiệu chính cộng tối đa 2 dấu hiệu phụ, lấy từ: nước đục (`water.clean < 40`), nước gần cạn, khay phân đầy (`cage < 40`), máng sắp hết, đồ tươi đã ôi, lông xơ (`feather < 50`), dấu hiệu ủ bệnh (phần 2), chim ít hót bất thường. Giao diện hiện dấu hiệu phụ dưới dòng chính. Ở chế độ Người mới vẫn hiện như hiện nay (chỉ dòng chính) để không rối.

"Quan sát kỹ" (`observe`) giữ nguyên, là công cụ chính của chế độ Lâu năm, cộng thêm dòng về dấu hiệu ủ bệnh và tính cách (phần 2, phần 4).

Đổi chế độ giữa ván: cho phép, trong menu cài đặt sẵn có của HUD (người xây chọn chỗ đặt). Đổi không ảnh hưởng điểm.

## 6. Phần 2: Bệnh có ủ bệnh và liệu trình thuốc

`S.sick` giữ dạng đối tượng (mọi chỗ đang kiểm `S.sick` truthy vẫn hiểu là "chim không khỏe"), thêm trường:

```js
S.sick = {
  type, since,
  phase: 'som' | 'ro' | 'tri',  // ủ bệnh (dấu hiệu sớm) | phát rõ | đang điều trị
  dosesLeft: 0,                 // số liều còn lại khi đang điều trị
  dosedToday: false,
}
```

Diễn tiến:
- Nguy cơ vượt ngưỡng (công thức hiện tại) → `phase: 'som'`, không ghi nhật ký tên bệnh. Lúc này đã tính là bị bệnh: `sickCount++` và đặt lại nguy cơ như `getSick` hiện nay (bắt bệnh sớm vẫn mất thành tựu "Khỏe trọn 14 ngày"; ngoài đời chim vẫn đã ốm). Máu −5 dời sang lúc chuyển `'ro'`. Trong 180 phút game (tính theo phút mô phỏng, đêm không chạy nên không tính): sát thương máu bằng 0,3 lần `dmg`, chim ăn chậm hơn (đói giảm chậm như đang ốm), không hót. Hết 180 phút → `'ro'`, ghi nhật ký như `getSick` hiện nay.
- `ngo_doc` (ăn đồ độc) vào thẳng `'ro'` như hiện nay.
- `'ro'`: như hiện nay (sát thương đủ, cần thú y).
- Đi thú y (`vet`): giai đoạn `'som'` → chẩn đoán sớm, liệu trình 3 liều; `'ro'` → 5 liều (`ngo_doc` 2 liều). Liều đầu cho ngay tại phòng khám: `phase: 'tri'`, `dosesLeft = liệu trình − 1`, `dosedToday = true`, máu +8 như cũ. Nhật ký nói rõ: số ngày uống thuốc, cho uống mỗi sáng, bỏ liều sẽ tái.
- Đi thú y khi đang `'tri'`: không chữa lại, không rút ngắn liệu trình. Bác sĩ dặn "cứ cho uống tiếp đủ N ngày"; 60 phút, tâm trạng −6 (như đưa chim khỏe đi khám).
- Sau khi tái bệnh (bỏ liều), đi thú y lại cho liệu trình dài hơn: liệu trình gốc + 2 liều (nhờn thuốc). Lưu `S.sick.relapsed = true`.
- Đang điều trị `'tri'`: không mất máu theo phút, máu hồi +0,01/phút nếu ăn uống đủ; vẫn không hót, không luyện giọng, `talk` vẫn là làm phiền nhẹ như chim ốm.
- Hành động mới `medicine` ("Cho uống thuốc", 3 phút): chỉ mở khi `phase === 'tri' && !dosedToday`. Tâm trạng −2 (bắt chim nhỏ thuốc), `dosesLeft−−`, `dosedToday = true`. `dosesLeft` về 0 → khỏi: `S.sick = null`, nhật ký tốt.
- Cuối ngày (`endDay`): đang `'tri'` mà chưa cho thuốc hôm nay → ✗ "Bỏ liều thuốc", bệnh tái: `phase: 'ro'`, `dosesLeft = 0`, nhật ký giải thích (vi khuẩn chưa sạch, bỏ thuốc giữa chừng dễ tái và nhờn thuốc). Đã cho thuốc → ✓ "Cho uống thuốc đúng liều". Mục "Chim bệnh chưa được chữa" chỉ chấm khi `'ro'`; `'som'` thì không chấm (người chơi chưa thể biết chắc), nhưng nếu người chơi đã "Quan sát kỹ" lúc `'som'` mà không đưa đi thú y thì vẫn không phạt. Mỗi sáng `startDay` đặt lại `dosedToday = false`.
- Đang điều trị mà hôm đó luyện giọng (`tutor` bị chặn sẵn) hoặc trò chuyện quá 2 lần: ✗ "Chim ốm cần nghỉ", máu −3.

Dữ liệu (`src/data/diseases.js`): mỗi bệnh thêm `early` (dấu hiệu sớm, khác nhau từng bệnh, ví dụ tiêu chảy: "Phân hơi nhão, chim uống nước nhiều hơn"; cảm lạnh: "Chim hay xù lông, thỉnh thoảng hắt hơi khẽ") và `course` (số liều khi phát rõ).

Hiển thị:
- `describeSigns`: `'som'` → dấu hiệu `early` (không có tên bệnh); `'ro'` → như hiện nay; `'tri'` → "Đang uống thuốc, còn N ngày".
- `observe`: `'som'` → "Có dấu hiệu sớm của <tên bệnh>. Đưa đi thú y lúc này bệnh nhẹ và mau khỏi hơn."
- HUD thẻ bệnh: `'som'` không hiện tên; `'tri'` hiện "Đang điều trị".
- Bong bóng nhu cầu (chỉ chế độ Người mới): `'som'` → nút `look` "Chim có vẻ khác thường"; `'ro'` → `vet` như cũ; `'tri'` chưa uống thuốc hôm nay → `medicine`.
- Hình 3D (`World` → cờ `f.sick`): `'som'` chỉ xù lông nhẹ, chưa lim dim; `'ro'` như cũ; `'tri'` như `'som'`.
- Âm thanh, phím tắt cho `medicine`: theo mẫu các hành động khác (người xây chọn phím chưa dùng, biểu tượng có sẵn, ví dụ `drop`).

Các chỗ đang đọc `S.sick` phải rà hết (grep `\.sick`): `simulation.js` (hót, đói, sát thương), `actions.js`, `dayCycle.js` (giọng −3 khi ốm: áp dụng cho `'ro'` và `'tri'`, không cho `'som'`), `householdEvents.js`, `goals.js`, `Hud.js`, `Modals.js` (màn chim chết), `World.js`.

## 7. Phần 3: Thời tiết theo lịch thật và vùng

`S.region`: `'bac' | 'trung' | 'nam'`. `S.startAt`: mốc thời gian (ms) lúc đón chim, lấy từ `game.now()`. Tháng của ngày game thứ `d` là tháng của `startAt + (d − 1) ngày`.

Kiểu thời tiết (`src/data/weather.js`), giữ ba khóa cũ để bản lưu cũ và mã cũ vẫn đúng:

| Khóa | Tên | °C | Cờ |
|---|---|---|---|
| `mat` | Mát | 28 | |
| `nong` | Nắng nóng (Trung, tháng 5–8: "Gió Lào, nắng nóng") | 36 | `hot` |
| `mua` | Mưa lạnh | 20 | `cold`, `rain` |
| `ret` | Rét khô | 13 | `cold` |
| `nom` | Nồm ẩm | 22 | `humid` |
| `rao` | Mưa rào | 29 | `rain` |

Bảng xác suất theo vùng và tháng (người xây có thể chỉnh nhẹ cho cân bằng, giữ tinh thần):

| | Bắc | Trung (Huế) | Nam |
|---|---|---|---|
| T1–2 | ret .5, nom .15, mua .2, mat .15 | mua .5, ret .25, mat .25 | mat .5, nong .5 |
| T3–4 | nom .4, mat .4, mua .2 | mat .6, nom .15, rao .25 | nong .6, mat .4 |
| T5–8 | nong .5, rao .35, mat .15 | nong .6, mat .2, rao .2 | rao .5, nong .3, mat .2 |
| T9–10 | mat .6, nong .2, rao .2 | mua .4, rao .2, mat .4 | rao .55, mat .3, nong .15 |
| T11–12 | mat .4, ret .4, mua .2 | mua .6, ret .15, mat .25 | mat .5, rao .3, nong .2 |

Ngày 1 (chim mới về): lấy kiểu có xác suất cao nhất của tháng đó mà không phải `rain`, `hot`; không có thì `mat`.

Hệ quả mới (kiểu cũ giữ nguyên hệ quả):
- `ret` (cold): như `mua` về nguy cơ cảm lạnh khi tắm, ngủ không trùm áo, gió hiên. Có nắng: phơi được nhưng giờ nắng tốt dời sang 8:00–10:30 (sáng sớm rét quá); phơi trước 7:30 cộng nguy cơ cảm lạnh nhẹ và nhật ký nhắc. Mục "Tắm nắng" và `goals` đổi chữ theo khung giờ này.
- `nom` (humid): cám trong máng mốc nhanh: cuối ngày nồm mà hôm đó chưa đổ cám mới (`!T.refill`) thì ✗ "Cám để qua ngày nồm" và nguy cơ tiêu chảy +25 (đổ mới hôm nay thì không phạt, không cần hành động đổ bỏ cám), đồ tươi ôi sau 150 phút thay vì 240, sự kiện `nom` trong nhà dùng cờ `humid` (thay cho điều kiện `!hot` hiện nay) và chỉ xảy ra ngày nồm hoặc mưa. Lồng bẩn sinh rận mạt nhanh hơn 1,5 lần.
- `rao` (rain, không lạnh): không phơi nắng được (như mưa); tắm vẫn được bình thường; nước bẩn nhanh hơn chút do ẩm (tùy người xây, có thể bỏ).
- `nong`: đồ tươi ôi sau 150 phút.

`WEATHER_ICON` thêm: `ret` → `wind`, `nom` → `humid`, `rao` → `rain`. `Sky.update`: mây `ret` 0,6, `nom` 0,8. Nhật ký đầu ngày (`startDay`) thêm lời khuyên riêng cho `ret`, `nom`, `rao`.

## 8. Phần 4: Tính cách chim

`S.traits = { temper, appetite, fire, fav }` và `S.known = { temper: false, appetite: false, fire: false, fav: false }`. Tung khi đón chim; mỗi trục 25% thấp / 50% bình thường / 25% cao.

| Trục | Thấp | Cao | Ảnh hưởng |
|---|---|---|---|
| `temper` | `nhat` (nhát) | `dan` (dạn) | Thân thiết tăng ×0,6 / ×1,4; tâm trạng mất do làm phiền ×1,5 / ×0,6; nguy cơ ngã nước ×1,4 / ×0,6 |
| `appetite` | `ken` (kén ăn) | `ham` (ham ăn) | Đói ×0,9 / ×1,15; đồ ăn hợp (v = 1) cho tâm trạng ×0,5 / ×1,3 |
| `fire` | `cham` (chậm lửa) | `nhanh` (lên lửa nhanh) | Độ sung tăng ×0,7 / ×1,6; ngưỡng quá lửa 90 / 85 |
| `fav` | | | Một món đồ ăn thêm có `v = 1` với loài, được tính như `v = 2` (chim mê món đó) |

Trục `fire` chỉ dành cho loài hót. Loài nói luôn có `fire: 'binh'`, `known.fire = true` và không hiện thẻ, không có câu nhận ra.

Nhận ra tính cách (cả hai chế độ chơi như nhau):
- `temper`: lần "Quan sát kỹ" đầu tiên từ khi hết thời gian chim mới về.
- `appetite`: "Quan sát kỹ" ở hai ngày khác nhau.
- `fire`: "Quan sát kỹ" từ ngày 5.
- `fav`: lần đầu cho chim ăn món đó.
Mỗi lần nhận ra: nhật ký `tip` ("Bạn nhận ra Mận là con nhát: …cách chăm phù hợp"). Tính đã biết hiện thành thẻ nhỏ trên thẻ chim (`#bcSp` hoặc khu thẻ trạng thái cạnh thẻ bệnh). Trục chưa biết không hiện gì. Trục "bình thường" khi nhận ra cũng có câu nhật ký ("không nhát cũng không dạn").

## 9. Kiểm thử

- Test cũ phải chạy được: cố định `now`, `region`, `traits` bình thường. Các test cân bằng 14 ngày (giọng vàng, chăm tốt điểm cao) phải giữ kết quả.
- Test mới tối thiểu:
  - Bệnh: nguy cơ vượt ngưỡng → `'som'`, 180 phút sau → `'ro'`; thú y lúc `'som'` cho 3 liều; cho thuốc đủ ngày thì khỏi; bỏ một ngày thì tái `'ro'`; bản lưu cũ có `sick: { type, since }` mở ra là `'ro'`.
  - Thời tiết: `rollWeather` theo vùng và tháng chỉ trả kiểu có trong bảng; ngày 1 không mưa, không nóng; `ret` dời giờ nắng tốt; `nom` làm đồ tươi ôi sớm.
  - Tính cách: ép `traits` cho thấy chim nhát tăng thân thiết chậm hơn chim dạn; nhận ra `temper` sau lần quan sát đầu tiên hết thời chim mới về; `fav` lộ khi cho ăn.
  - Chế độ: `ui.test.js` kiểm chế độ Lâu năm ẩn `#stats`, `#needs` và hiện dấu hiệu phụ.
- Chạy `npm test`, rồi mở game bằng `preview_start` (`.claude/launch.json`) kiểm màn đón chim mới, cả hai chế độ, một ngày rét.

## 10. Tài liệu

Cập nhật `docs/GAME_DESIGN.md`: thêm mục chế độ chơi, diễn tiến bệnh, thời tiết theo vùng tháng, tính cách chim; sửa bảng chỉ số chỗ nhắc "bệnh chỉ khỏi khi đưa đi thú y".

## 11. Để người xây quyết định

- Chỗ đặt nút đổi chế độ trong HUD, chữ cụ thể trên giao diện, phím tắt và biểu tượng cho `medicine`.
- Cách hiện dấu hiệu phụ (dòng thứ hai, chấm, danh sách) miễn đọc được trên màn hẹp 375 px.
- Tinh chỉnh số trong bảng thời tiết và hệ số tính cách nếu test cân bằng lệch.
- Chia việc theo file; thứ tự làm.

## 12. Quyết định do người thiết kế tự chọn (người dùng chưa xác nhận từng điểm)

- Mặc định vùng Trung, chế độ Người mới.
- Mùa thay lông giữ ngày cố định, không theo lịch thật.
- Bảng xác suất thời tiết là ước lượng theo khí hậu từng vùng, không phải số liệu đo.
- Bắt bệnh sớm vẫn tính là đã bị bệnh (`sickCount`).
- Ngày nồm chỉ phạt khi chưa đổ cám mới hôm đó.
- Tái bệnh thì liệu trình +2 liều; đi thú y lúc đang điều trị không rút ngắn liệu trình.
- Tính "lửa" chỉ có ở loài hót.
