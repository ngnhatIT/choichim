# Thiết kế game

## Mục tiêu

Dạy người mới nuôi chim những nguyên tắc chăm sóc quan trọng nhất qua hệ quả, không qua bài giảng. Người chơi học bằng cách làm sai và đọc nhật ký giải thích.

## Vòng chơi

- Một ngày trong game chạy từ 06:00 đến khi cho chim ngủ (từ 18:00) hoặc tự kết thúc lúc 22:00.
- Tốc độ: chậm (2 phút game mỗi 0,4 giây thật, khoảng 3 phút thật mỗi ngày) và nhanh (6 phút game mỗi nhịp). Mỗi hành động tiêu tốn thời gian game.
- Cuối ngày có bảng chấm điểm ✓/✗ kèm bài học; điểm ngày = số mục đạt / (đạt + không đạt).
- "Việc hôm nay" (`core/goals.js`, `dailyGoals`) là danh sách việc khớp với cách chấm điểm: thức ăn chính đúng loài thay mới, thay nước, đồ tươi hoặc mồi tươi (tùy loài), khoáng cho vẹt khi đã 5 ngày chưa có, nắng sớm (bỏ khi mưa), tắm khi đến hạn, dọn lồng lau ẩm, trò chuyện hoặc giọng mồi (ngày chim mới về thì thay bằng "để yên tĩnh": trò chuyện không quá 2 lần), trùm áo cho ngủ trước 20:30.
- 14 ngày. Ngày 1–3: chim mới về. Ngày 6–10: thay lông. Ngày 14: tổng kết, danh hiệu, thành tựu.

## Chỉ số (0–100)

| Chỉ số | Giảm khi | Tăng khi |
|---|---|---|
| Ăn no | Theo thời gian (chim nhỏ nhanh hơn) | Tự ăn từ máng nếu thức ăn hợp; cho ăn thêm |
| Nước, độ sạch nước | Theo thời gian, nhanh hơn ngày nóng và khi phơi nắng | Thay nước |
| Vệ sinh lồng | Theo thời gian, đồ ăn ôi | Dọn lồng |
| Sức khỏe | Bệnh, đói, khát, đồ hại | Hồi dần khi ăn uống, vệ sinh tốt |
| Tâm trạng | Làm phiền chim mới, trùm áo ban ngày không cần thiết, sự kiện xấu | Ăn món thích, tắm, trò chuyện |
| Thân thiết | Sự kiện xấu | Trò chuyện (chim nhút nhát tăng chậm hơn) |
| Độ sung | Bệnh, thay lông, thiếu dinh dưỡng, nghe giọng mồi quá nhiều | Khỏe mạnh, mồi tươi, nghe giọng mồi, đi cà phê chim |
| Lông | Thiếu tắm, thiếu nắng, sâu quy quá nhiều, ăn sai khi thay lông | Tắm, chăm tốt khi thay lông |
| Giọng hót (chỉ loài hót) | Ốm (−3 mỗi ngày); đứng yên khi thay lông | Cuối ngày, theo độ sung, tâm trạng, thân thiết, số hiệp hót, giọng mồi |

## Mô hình bệnh

Mỗi bệnh có một bộ đếm nguy cơ. Điều kiện xấu cộng dồn nguy cơ theo phút; nguy cơ tự giảm 0,1% mỗi phút; vượt 100 thì phát bệnh. Cách này giúp hệ quả có tính nhân quả và tái lập được (không ngẫu nhiên thuần), người chơi có thể suy ra nguyên nhân. Bệnh trừ máu theo phút và chỉ khỏi khi đưa đi thú y. "Quan sát kỹ" cho thấy cảnh báo khi nguy cơ trên 30–40.

## Giọng hót và giọng mồi

- `S.song` 0–100, khởi đầu 12, 5 cấp (`data/song.js`): Chưa ra giọng (0), Hót rời rạc (20), Hót tròn câu (45), Hót đổ dài (70), Giọng vàng (90). Lên hay xuống cấp đều ghi nhật ký.
- Cộng cuối ngày: `(sung − 40)/8` (từ −2 đến 4) + `(tâm trạng − 50)/10` (−1 đến 2) + `thân thiết/30` (0 đến 2) + 0,5 × số hiệp hót (tối đa 8) + 1,8 × số lần giọng mồi có ích (tối đa 2, không tính ngày chim mới về) + 2 nếu đi cà phê chim hoặc hội thi. Ốm: −3. Thay lông: không đổi.
- Chim hót khi không ốm, không thay lông, không trùm áo, 6–18 giờ, sung > 62, tâm trạng > 58, sức khỏe > 70, thân thiết > 22. Cấp 0–1 dễ hơn (sung > 54, tâm trạng > 52, thân thiết > 10) để chim chăm tốt cất tiếng trong mấy ngày đầu. Xác suất mỗi phút `0,003 + 0,0015 × cấp`, nhân 2,5 lúc 6–9 giờ (chim hót nhiều nhất lúc sáng sớm); hiệp hót dài `3 + 2 × cấp` phút.
- "Cho nghe giọng mồi" (`tutor`, 20 phút): mở tiếng một con chim hót hay cho chim tập theo, cách luyện giọng phổ biến của người chơi chim. Chỉ cho loài hót; bị chặn khi trùm áo, sau 19 giờ, khi chim ốm. Hai lần đầu mỗi ngày: sung +1,5. Từ lần thứ ba: tâm trạng −8, sung −2 (chim bị "đè lửa"). Thay lông: nhắc nhở, không có tác dụng. Chim mới về: tính là làm phiền.
- Cân bằng (test 14 ngày): chăm tốt thường đạt Hót đổ dài; thêm giọng mồi 2 lần mỗi ngày đạt Giọng vàng vào ngày 13–14; chăm qua loa (không đồ tươi, nắng, trò chuyện) ở Chưa ra giọng.

## Tuổi chim (`data/stages.js`)

Người chơi chọn tuổi khi đón chim. Mỗi giai đoạn khác nhau thật sự về nhu cầu và cách học, không chỉ về hình:

| | Chim chuyền (1–4 tháng) | Trưởng thành (1–3 năm) | Lâu năm (từ 5 năm) |
|---|---|---|---|
| Thân thiết lúc về | 28 (nuôi tay, dạn người) | 8 | 18 |
| Giọng lúc về | 4 (líu ríu tập hót) | 12 | 58 (giọng đã định) |
| Trần giọng trong 14 ngày | 60 (chưa định giọng) | 100 | 100 |
| Tiến bộ giọng / giọng mồi | ×1,1 / ×1,7 (giai đoạn học nhạy) | ×1 / ×1 | ×0,45 / ×0,3 |
| Học nói (loài nói) | ×1,5 | ×1 | ×0,6 |
| Tốc độ đói | ×1,15 (đang lớn) | ×1 | ×0,95 |
| Ngưỡng phát bệnh | nguy cơ ×1,25, cảm lạnh thêm ×1,5 | ×1 | ×1,2, cảm lạnh thêm ×1,3 |
| Mùa thay lông | Lần đầu đời: lông non đổi dần sang lông trưởng thành | Bình thường | Mệt hơn (độ sung giảm nhanh hơn) |

Bộ lông non từng loài (`model.juvenile` trong `species.js`): chào mào chưa có túm đỏ sau mắt, mào ngắn, lông dưới đuôi cam hồng; chích chòe nâu xám, ngực lốm đốm; yến phụng mắt đen tuyền, vằn kéo tới trán, mũi hồng; sáo nâu xám, chỏm trán ngắn; khuyên xỉn, vòng mắt mảnh; họa mi nâu xỉn, vệt mi mờ. Giọng chim non (`compose(..., { young })`) nhỏ, cao độ chưa vững, hay bỏ dở; vững dần khi giọng tiến bộ.

## Nghe chim khi treo máy

Nút "Nghe chim" (phím L) hoặc tự bật sau 2 phút không thao tác: thời gian game dừng (chim không đói khát khi người chơi vắng), các bảng ẩn, chim hót theo nhịp thật (`SESSION`, `planBout` trong `audio/songs.js`): từng câu, nghỉ giữa câu, hết hiệp nghỉ lâu và thỉnh thoảng gọi khẽ; sáng sớm hót dày, trưa thưa; cấp giọng thấp thì câu ngắn, ngập ngừng. Chim chỉ hót khi thật sự hót được (không trùm áo, không ốm, ban ngày, đủ vui); không thì im và dòng nhắc nói lý do. Vẫn phát khi chuyển sang tab khác. Thao tác bất kỳ để quay lại.

## Sự kiện gia đình

Đầu mỗi ngày, mỗi sự kiện được tung xúc xắc theo xác suất và gán một phút ngẫu nhiên trong khung giờ của nó. Đến giờ, nếu điều kiện đúng (ví dụ lồng đang ở phòng khách khi thắp nhang), game dừng và hỏi người chơi chọn một trong hai phương án. Lựa chọn đầu tiên luôn là cách làm đúng (test tự động dựa vào điều này). Một ván chăm tốt gặp khoảng 18–21 sự kiện.

| id | Khi nào | Cách đúng | Làm sai thì |
|---|---|---|---|
| `karaoke` | 17:30–19:30 | Trùm áo, mang vào phòng khách, đóng cửa | Mất ngủ: tâm trạng, độ sung giảm |
| `treem` | 15:00–17:30, lồng mở | Cho trẻ ngắm từ xa, giải thích | Chim hoảng, giảm thân thiết, rụng lông |
| `nom` | 8:30–11:00, trời không nóng | Bỏ cám ẩm, lau khô máng, thay cám mới | Nguy cơ tiêu chảy do cám mốc |
| `chuot` | 17:30–19:30 | Trùm áo, dọn đồ ăn rơi vãi | Nguy cơ tiêu chảy do chuột |
| `matdien` | 12:30–15:00, ngày nóng, lồng trong nhà | Ra hiên râm mát, thay nước mát | Nguy cơ sốc nhiệt |
| `thi` | 7:00–9:00, loài hót, từ ngày 11 | Trùm áo, mang đi thi cẩn thận | (ở nhà: không sao) |
| `nghenoi` | 16:00–17:30, loài nói đã biết nói | Cho nói vài câu rồi để chim nghỉ | Chim mệt, sợ người |

## Hội thi chim hót

Chỉ loài hót, sau mùa thay lông, mỗi ván thi tối đa một lần. Điểm = giọng × 0,55 + sung × 0,2 + sức khỏe × 0,1 + lông × 0,15 ± 4 ngẫu nhiên; từ 85 giải nhất, 75 giải nhì, 65 giải ba. Kết quả lưu ở `S.contest = { place, day }` (place 0 là không đạt giải). Chim ốm hoặc yếu (sức khỏe dưới 60) thì được khuyên mang về, chỉ mất chút tâm trạng: bài học là chỉ mang chim khỏe đi thi, không thi khi đang thay lông. Đi thi cũng như đi cà phê chim: chim nghe chim khác hót nên sung hơn, nhưng tăng nguy cơ lây bệnh.

## Thành tựu

Lưu qua nhiều ván trong localStorage `longtre-achievements-v1` (`{ got: { id: { at, sp } }, done: { loài: số ván nuôi trọn } }`), không bị xóa khi hết ván. Game kiểm tra sau mỗi lượt chạy thời gian, cuối ngày, khi hết thay lông và khi nuôi trọn 14 ngày, rồi phát `achievement` với danh sách thành tựu mới mở. Có 11 thành tựu: tiếng hót đầu tiên, giọng vàng, câu nói đầu tiên, nói hết các câu, vô địch hội thi, khỏe trọn 14 ngày, luôn dọn lồng an toàn, ngày 100 điểm, lông từ 85 khi thay lông xong, nuôi trọn khuyên hoặc họa mi với điểm trung bình từ 80, nuôi trọn cả 6 loài.

## Bản lưu

`Game.load` bổ sung mọi trường còn thiếu (trường mới của trạng thái, của `today`, nguy cơ bệnh) bằng giá trị mặc định nên bản lưu cũ vẫn mở và chơi tiếp được.

## Các bài học cốt lõi gắn vào cơ chế

1. Thức ăn chính đúng loài, thay mỗi ngày; đổi thức ăn thì trộn dần.
2. Thay nước mỗi ngày; dọn đồ tươi thừa.
3. Nắng sớm, tránh nắng trưa; tắm sáng, không tắm muộn.
4. Chim mới về cần yên tĩnh và áo lồng.
5. Trùm áo lồng ban đêm, ngủ đủ.
6. Không treo lồng gần bếp; tránh khói nhang, khói thuốc.
7. Không cho chim ăn đồ của người; bơ, sô cô la, hành tỏi là chất độc.
8. Dọn lồng an toàn cho người.
9. Không mua chim bẫy từ tự nhiên.
10. Luyện giọng vừa phải; chỉ mang chim khỏe đi thi, không thi khi thay lông.
11. Mùa nồm giữ thức ăn khô, không để thức ăn thừa dụ chuột; trời nóng mất điện thì đưa chim ra chỗ thoáng mát.

## Hướng phát triển

- Sinh sản (bắt cặp yến phụng, ấp trứng, nuôi con).
- Tiền và cửa hàng; chi phí thú y.
- Nhiều chim cùng lúc, cách ly chim mới.
- Âm thanh tiếng hót thu âm (cần nguồn có giấy phép).
- Đa ngôn ngữ.
