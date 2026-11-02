# Chơi chung: hội chim, chất chim và backend Supabase

Tổng hợp từ nguồn công khai (tháng 11/2026), chuẩn bị cho chế độ nhiều người chơi. Bổ sung cho `docs/RESEARCH.md` và `docs/LIFECYCLE_RESEARCH.md`, không lặp lại các mục đã có. Nguồn về tướng và tính chim là blog, diễn đàn, trang bán cám: **kinh nghiệm người chơi, không phải số liệu khoa học**, và mâu thuẫn nhau. Đây là tài liệu nghiên cứu, chưa phải thiết kế đã chốt.

## 1. Người chơi chim giao lưu thế nào

| Hoạt động | Thực tế | Gợi ý cho game |
|---|---|---|
| Cà phê chim | Quán mở từ khoảng 5:30, lúc chim hót hay nhất. Treo lồng gần nhau, nghe chim nhau, trao đổi kinh nghiệm. Chuộng chích chòe, họa mi, khuyên, chào mào. | Phòng chung: mỗi người treo chim lên giàn, ai vào cũng nghe được. Hợp với chế độ "Nghe chim" đã có. |
| Dợt giàn | Treo chim cách nhau 10–15 m cho hót đấu, không trọng tài. Luyện lửa, cho chim quen chỗ đông. | Hai người cho chim dợt: tăng sung, nhưng có nguy cơ lây bệnh và "đè lửa". Chỉ để vui, không tính hạng. |
| Hội thi | Nhiều vòng, loại dần, có hội trên 100 lồng, nhiều câu lạc bộ từ nhiều tỉnh. | Giải theo mùa, bảng chung, chấm ở server. |
| Câu lạc bộ | Hội tổ chức thi; người giỏi luyện giọng, luyện tính được gọi là nghệ nhân. | Lập hội, mượn giọng mồi của nhau, xếp hạng hội. |

**Tiêu chí chấm chào mào** (mỗi hội một khác):
- Thái độ đấu: nhảy cầu, chuyền cầu, đứng vươn mình, xòe đuôi, hướng mặt về đối thủ. Đứng ủ rũ, quay đi là không đạt.
- Giọng: miền Bắc yêu cầu vòng 6 phút ra giọng đấu ít nhất 5 lần (vòng 3 phút ít nhất 3 lần), mỗi câu ít nhất 3 âm tiết.
- Dáng và sức bền: thon gọn, rắn chắc, giữ phong độ đến vòng cuối.
- Hạ lồng ngay: xù lông, tắm, rỉa lông giữa vòng.

Game hiện chấm theo giọng, sung, sức khỏe, lông (`GAME_DESIGN.md`, mục Hội thi). Chưa có "thái độ đấu" và chưa chấm theo vòng.

## 2. Chất chim: tướng và tính

### Tướng (dấu hiệu ngoại hình)

**Chào mào** (nguồn yếu, chủ yếu Chợ Tốt và drnhan.vn):
- Đầu to: khỏe, đấu bền. Gốc mào dày là tốt; gốc mào khuyết hoặc gãy thì loại dù hót hay.
- Kiểu mào: mào đinh (nhọn, thẳng) siêng hót; mào cui (ngắn, gốc dày) lì, đấu bền; mào tê giác đấu dữ.
- Mỏ gốc to, miệng rộng: giọng to, gắt. Hầu to: bền, giọng tốt; hầu nhỏ: giọng nhỏ nhưng đanh.
- Mắt sáng, lanh là tốt; mắt lồi khó thuần.
- Chân: nguồn bất đồng. Chân cao to thì nhanh nhẹn, đấu dũng mãnh, nhưng có nguồn nói khó thuần.

**Chích chòe than:** dân chơi chia hai tướng.
- Tướng võ (chim đá): thân to mình ngắn, đầu xà, mắt chuột, mỏ dày dài, móng dài; nghe chim lạ là nhảy tìm đối thủ.
- Tướng văn (chim hót): thân gọn mình dài, ngực nở, yếm đen sâu, đuôi dài; hay xòe đuôi, múa cánh, đảo giọng. Nguồn mâu thuẫn về mỏ (mỏng ngắn hay dài mảnh).

**Họa mi:** "Nhất nhãn, nhị mao, tam đầu, tứ cước". Tia nền mắt càng rõ, càng dày thì chim càng già rừng và có lửa; mắt trong veo là chim non. Phần lớn dấu hiệu ở mắt báo tuổi và kinh nghiệm hơn là phẩm chất bẩm sinh.

**Vành khuyên, sáo, yến phụng:** chưa tìm được dữ liệu tướng. Yến phụng có di truyền màu lông, cần nghiên cứu riêng.

**Áp dụng:** tướng chỉ là gợi ý có xác suất, không phải quy tắc. Diễn đàn chaomao.org cũng nói chim đang yếu lửa thì không đoán được phong độ đỉnh, phải đem ra thử.

### Lửa và tính

- Lửa là trạng thái, không phải bẩm sinh. Chim đủ lửa: lông ôm sát, cánh hơi xệ, họng vàng chanh, nghe đối thủ là hót đáp ngay.
- Chào mào có mùa lửa tự nhiên tháng 4–8, trùng mùa sinh sản.
- Rớt lửa do: thua trận, bị đè, phơi nắng quá lâu, nước nóng, đổi lồng liên tục, thiếu ngủ. Chữa 1–2 tháng: mồi tươi, tắm đều, treo chỗ yên tĩnh không nghe chim khác, rồi dợt lại từ xa với chim yếu hơn.
- Quá lửa: tắm nhiều, cám ít "nóng", trái cây mát.
- Ép lửa: nguồn bất đồng. drnhan.vn khuyên không ép chim thuần vì hại chim.
- Họa mi căng lửa: con phá lồng, con lại nằm lì dưới sàn. Chủ phải hiểu tính từng con.
- Không có hệ phân loại chuẩn kiểu hăng / nhát / lì; các từ này chỉ rải rác trong bài viết.

### Gen và tập

Nghiên cứu trên chim sẻ Bengal: khả năng học hót có phần di truyền, nhưng thầy dạy tốt bù được thiên hướng gen. Chim nuôi cách ly hót không chuẩn. **Áp dụng:** "chất" là trần tiềm năng do gen; giọng thực tế do được nghe và tập (giọng mồi, cà phê chim, dợt giàn).

## 3. Nguồn chim hợp pháp

- Chào mào, vành khuyên là "động vật rừng thông thường": không cấm nuôi, nhưng phải chứng minh nguồn gốc hợp pháp. Huế yêu cầu người mang chim ra quán cà phê xuất trình giấy tờ.
- Nguồn hợp pháp được Kiểm lâm Huế công nhận: khai thác có phép (Huế chưa duyệt cho ai), nhập khẩu hợp pháp, mua lại sau tịch thu, con của bố mẹ hợp pháp từ trại có sổ theo dõi đàn. Kiểm lâm khuyên nguồn cuối.
- Có xử phạt thật: TP.HCM tịch thu 35 chào mào, phạt 7,5 triệu; Bắc Ninh xử 207 con.
- Khung hiện hành: Thông tư 27/2025/TT-BNNMT (chưa đọc phụ lục).
- Họa mi nằm trong Phụ lục II CITES từ năm 2000.
- Chào mào có trại sinh sản thật (Tiền Giang, hơn 600 con, chủ yếu đột biến màu; sinh sản từ 7–8 tháng, lứa 2–3 trứng). Chưa thấy trại chích chòe than, họa mi ở Việt Nam.
- Báo Nhân Dân cảnh báo hội thi có thể kéo theo nạn bẫy chào mào hoang.

**Áp dụng:** chim trong game đến từ trại có sổ (có "giấy khai sinh"), không có chim bổi để chọn. Giữ bài học số 9 ("không mua chim bẫy") ở cả phần chơi chung.

## 4. Thiết kế chống "cày là thắng"

Hiện ai chăm đủ bài cũng lên Giọng vàng ngày 13–14. Lên mạng thi thì người cày đúng công thức thắng. Cách các game khác xử lý:

| Cách | Game dùng | Áp vào Lồng Tre | Rủi ro |
|---|---|---|---|
| Chỉ số ẩn, lộ dần | Photo Finish, Chao Garden, Pokémon IV (NPC chỉ cho ước lượng) | Trần giọng, khí chất ẩn; tướng cho manh mối nhiễu; nghe nhiều buổi lộ thêm dải ước lượng | Không bán việc xem chỉ số (Rival Stars bị chê pay-to-win) |
| Trần tổng điểm luyện | Pokémon EV (510 tổng, 252 mỗi chỉ số) | Cày thêm vô ích; lựa chọn là phân bổ (hót dài, hót to, biến tấu) | Một cách phân bổ tối ưu bị chép, cần ghép các cách dưới |
| Ép quá thì hỏng | Monster Rancher (mệt, stress trừ tuổi thọ) | Dợt, nắng quá mức thì rớt lửa; ngưỡng theo tính chim | Phải có dấu hiệu nhìn thấy (xù lông, hót đứt quãng) |
| Đỉnh phong độ, căn thời điểm | Derby Stallion (chín sớm, chín muộn), Umamusume (mood) | Chim chín sớm/muộn ẩn, lửa lên xuống theo ngày; thắng là đem đi đúng lúc | Mùa cố định thành bảng tra; đổi điều kiện mỗi mùa |
| Tiêu chí đổi theo giải | Thi chim Indonesia (irama, volume, durasi, gaya), Howrse | Mỗi giải công bố trọng số; 3–5 giám khảo NPC có thiên vị nhẹ, công khai | Ngẫu nhiên quá thì bực; giữ ±10%, tính nhiều vòng |
| Khắc chế nhau | Chao Karate, Umamusume debuffer | Dợt giàn: gan lấn nhát, biến tấu thắng to khi đứng gần, bền thắng hiệp dài | Meta vẫn có thể hội tụ; cân lại theo mùa |
| Thi bất đồng bộ (snapshot) | Umamusume Team Trials, Champions Meeting | Giải mùa nộp ảnh chụp chim; thời điểm nộp là kỹ năng; quán cà phê thời gian thực để vui | Snapshot thấy thụ động; cần nghe lại giọng hót |

Phàn nàn cần tránh: pay-to-win, bán tiện ích thay vì giảm ngẫu nhiên, bắt buộc cày PvP.

**Đề xuất kết hợp:** trần điểm luyện + trần tiềm năng và kiểu chín ẩn đọc qua tướng + trọng số giám khảo đổi theo giải + giải nộp snapshot. Giờ chơi chỉ giúp tới trần; phần còn lại là chọn chim, hiểu tính, nộp đúng lúc.

## 5. Backend Supabase

**Hiện trạng:** toàn bộ trạng thái nằm trong `game.S` (`src/core/state.js`), lưu JSON vào localStorage (`src/core/save.js`), mô phỏng chạy ở client. Client sửa được mọi thứ.

**Đăng nhập:**
- `signInAnonymously()` cho khách; nâng cấp giữ `user_id` qua `updateUser({ email })` hoặc `linkIdentity({ provider: 'google' })` (manual linking còn beta).
- Đăng nhập ẩn danh giới hạn 30 lần/giờ/IP; docs khuyên bật CAPTCHA/Turnstile.
- Chỉ tài khoản thật (không ẩn danh) được thi, xếp hạng, vào hội. RLS kiểm tra `auth.jwt()->>'is_anonymous'`.

**Chống gian lận:**
- Không tin số liệu client gửi lên. Cloud save chỉ để đồng bộ, không dùng chấm điểm.
- Ở server: tố chất ẩn, chấm thi và dợt, phần thưởng, bảng xếp hạng. Giới hạn tiến độ theo giờ thật (`last_tick_at`).
- Hàm `security definer`: bắt buộc `set search_path = ''`, tự kiểm tra `auth.uid()`, `revoke execute` khỏi `anon`/`public`.
- Edge Function (gói Free: 500k lần gọi/tháng, 2 s CPU) chốt kết quả giải theo lô, gọi bằng cron.
- Tố chất ẩn ở bảng riêng, bật RLS, không policy nào. Docs không khuyên dùng column-level privileges.
- Giới hạn ghi bằng pre-request function của Data API.

**Realtime cho quán cà phê:**
- Presence: ai đang ngồi, treo chim nào. Broadcast: sự kiện "chim hót" (seed hoặc id bài hót, client tự phát âm, không gửi audio).
- Channel `private: true` kèm policy trên `realtime.messages`.
- Gói Free: 200 kết nối đồng thời, 100 msg/s, 20 presence msg/s, 2 triệu msg/tháng. Chia phòng khoảng 20 người, gửi tiếng hót theo nhịp chậm.

**Gói Free nói chung:** 50k MAU, DB 500 MB, egress 5 GB, không backup, **project tự tạm dừng sau 1 tuần không hoạt động**.

**Build một file:** supabase-js khoảng 56 KB gzip (bundlephobia), Vite nhúng được. Publishable key để lộ không sao. **Không bao giờ** đưa `service_role` / secret key vào client, và không đặt tiền tố `VITE_` cho secret. Mở bằng `file://` thì OAuth redirect và link xác nhận email gần như chắc chắn hỏng (chưa kiểm chứng): cần host bản build.

**Phác thảo bảng** (mọi bảng bật RLS):

| Bảng | Quyền |
|---|---|
| `profiles(id, display_name, club_id)` | Ai cũng đọc; chủ sửa |
| `saves(user_id, data jsonb, version, updated_at)` | Chỉ chủ đọc/ghi; không dùng chấm điểm |
| `birds(id, owner_id, species, name, stage, public_stats, last_tick_at)` | Ai cũng đọc; ghi qua RPC |
| `bird_traits_private(bird_id, genes jsonb, hidden_talent)` | Không policy; chỉ hàm server đọc |
| `cafe_rooms`, `cafe_members` | Dùng cho policy realtime |
| `contests(id, season, opens_at, closes_at, status)` | Đọc công khai; server ghi |
| `contest_entries(contest_id, bird_id, user_id, score, rank)` | Nộp qua RPC; `score`, `rank` server ghi |
| `spars(id, a_bird, b_bird, seed, result)` | Server tạo và chấm |
| `clubs`, `club_members(club_id, user_id, role)` | Thành viên đọc; chủ hội quản lý |

**Chưa kiểm chứng:** lịch dọn user ẩn danh, cách tính "không hoạt động" để tạm dừng project, phí vượt egress, xử lý `file://`.

## 6. Pháp luật Việt Nam cho phần chơi trực tuyến

Tra cứu tháng 11/2026, nguồn là bài của công ty luật và báo, **chưa đối chiếu văn bản gốc, không phải tư vấn pháp lý**. Cần hỏi luật sư trước khi phát hành.

- **Game nhiều người chơi qua máy chủ là game G1** (Nghị định 147/2024/NĐ-CP, Điều 37). G1 cần Giấy phép cung cấp dịch vụ và Quyết định phát hành cho từng game; chỉ doanh nghiệp được cấp. Điều kiện gồm hệ thống quản lý nội dung trao đổi giữa người chơi và phân loại độ tuổi. G4 (tải về, không tương tác máy chủ) chỉ cần Giấy chứng nhận và Thông báo phát hành.
- **Người chơi phải xác thực bằng số điện thoại**, và có giới hạn giờ chơi (nguồn nêu 180 phút/ngày; chưa rõ áp cho mọi người hay chỉ người dưới 18).
- **Mạng xã hội:** từ 25/12/2024 tài khoản phải xác thực số điện thoại (người nước ngoài dùng số định danh) mới được đăng bài, bình luận. Chưa rõ một góc hỏi đáp trong game có bị coi là mạng xã hội riêng không.
- **Dự thảo sửa Nghị định 147** được lấy ý kiến tháng 7/2026; cần kiểm tra đã ban hành chưa.
- **Dữ liệu cá nhân:** Luật Bảo vệ dữ liệu cá nhân 2025 (91/2025/QH15) và Nghị định 356/2025 có hiệu lực 1/1/2026. Dùng nền tảng nước ngoài (Supabase) xử lý dữ liệu người Việt là chuyển dữ liệu xuyên biên giới, phải đánh giá tác động. Hộ kinh doanh, doanh nghiệp siêu nhỏ được miễn; doanh nghiệp nhỏ và khởi nghiệp được ân hạn 5 năm (có điều kiện). Phạt tới 5% doanh thu năm trước.
- **Nội dung về chim thật:** cấm rao bán chim không rõ nguồn gốc; lời khuyên chữa bệnh chim thật cần ghi rõ không thay thế bác sĩ thú y (game đã có `DISCLAIMER`).

Nguồn: https://luatvietan.vn/giay-phep-game-online-g1.html · https://ltvlaw.com/tin-tuc/phan-loai-game-g1-g2-g3-g4 · https://gamota.com/gamota-lab/game-publishing-regulations-in-vietnam-what-foreign-studios-need-to-know-in-2026/ · https://mst.gov.vn/nguoi-choi-game-tai-viet-nam-phai-duoc-xac-thuc-bang-so-dien-thoai-di-dong-197250107155950646.htm · https://thuvienphapluat.vn/banan/tin-tuc/nghi-dinh-1472024ndcp-chinh-thuc-bat-buoc-xac-thuc-tai-khoan-mang-xa-hoi-bang-so-dien-thoai-12259 · https://tuoitre.vn/plo/yeu-cau-xac-thuc-so-dien-thoai-moi-duoc-dang-bai-binh-luan-livestream-tren-mang-xa-hoi-post819408.html · https://luatvietnam.vn/dan-su/luat-bao-ve-du-lieu-ca-nhan-2025-co-hieu-luc-khi-nao-568-103652-article.html · https://luatvietan.vn/diem-moi-cua-nghi-dinh-356-2025-so-voi-nghi-dinh-13-2023-ve-huong-dan-bao-ve-du-lieu-ca-nhan.html

## 7. Câu hỏi còn mở

Đã chốt (bàn ngày 2/11/2026): chim mua ở trại có sổ, tự xem tướng và nghe thử vài con; một ngày thật là một ngày của chim, chăm 10–15 phút mỗi ngày, vắng không chết chim; ván 14 ngày giữ làm chế độ offline; hoạt động chung đầu tiên là trao đổi kiến thức nuôi chim, cả chim thật lẫn chim trong game, tuân thủ pháp luật Việt Nam.

Giai đoạn hiện tại: game riêng cho nhóm bạn bè, không phát hành công khai, không thu tiền. Vào bằng lời mời. Khi mở rộng ra công chúng phải xem lại mục 6.

Còn mở:
- Góc trao đổi nằm trong game hay dùng nhóm chat có sẵn của nhóm bạn.

## 8. Nguồn

- Hội thi chào mào 2026, Đại Xuyên: https://daixuyen.hanoi.gov.vn/tin-tuc-su-kien/hoi-thi-tieng-hot-chim-chao-mao-nam-2026-lan-toa-thu-choi-van-minh-gan-ket-cong-dong-yeu-chim-canh-269926052117435404.htm
- Thi chào mào U Minh Hạ: https://tapchivietnamhuongsac.vn/hap-dan-hoi-thi-chim-chao-mao-dau-hot-tai-vuon-quoc-gia-u-minh-ha-224.html
- Nhân Dân về thi chim cảnh: https://nhandan.vn/co-quan-diem-xuyen-suot-dut-khoat-voi-cac-cuoc-thi-chim-canh-post864568.html
- VnExpress, Đi uống cà phê chim: https://vnexpress.net/di-uong-ca-phe-chim-2004368.html
- Báo Văn hóa, chứng minh nguồn gốc: https://baovanhoa.vn/doi-song/di-uong-ca-phe-neu-mang-theo-chim-phai-chung-minh-nguon-goc-134412.html
- Tiêu chí chấm chào mào miền Bắc: https://drnhan.vn/tieu-chi-cham-thi-chao-mao-mien-bac-364.html
- Luật chấm thi chào mào: https://meodangian.vn/2023/02/luat-cham-thi-chim-chao-mao-chuan.html
- Dợt chào mào đấu giàn: https://taichel.vn/chao-mao-hot-dau/
- Tướng chào mào: https://www.chotot.com/kinh-nghiem/?p=38082 · https://drnhan.vn/cach-chon-chim-chao-mao-hot-dau-hay-khoe-223.html · https://chimcanhviet.vn/chao-mao/tieu-chuan-lua-chon-danh-gia-chim-chao-mao-dep.html
- Chào mào đủ lửa: https://drnhan.vn/dau-hieu-nhan-biet-chim-chao-mao-du-luc-va-lua-de-thi-dau-386.html
- Rớt lửa: https://chimcanhviet.vn/chao-mao/cach-khac-phuc-chim-chao-mao-yeu-lua-nhanh-va-ben-nhat.html · https://drnhan.vn/vi-sao-chim-chao-mao-bi-rot-lua-363.html
- Tướng chích chòe than: https://chimcanhviet.vn/chich-choe-than/cach-chon-tuong-chim-chich-choe-than.html
- Tướng họa mi: https://chimcanhviet.vn/chim-hoa-mi/cach-chon-chim-hoa-mi-3.html · https://vnexpress.net/thu-choi-hoa-mi-chien-4035833.html
- Kiểm lâm Huế về nguồn gốc: https://nld.com.vn/kiem-lam-hue-len-tieng-ve-viec-chung-minh-nguon-goc-hop-phap-cua-chim-canh-khi-mang-theo-uong-ca-phe-196250515150731605.htm
- Xử phạt: https://dantri.com.vn/thoi-su/tich-thu-35-con-chim-chao-mao-khong-ro-nguon-goc-o-tphcm-20260604173105739.htm · https://danviet.vn/nuoi-nhot-207-con-chim-chao-mao-la-dong-vat-rung-khong-co-giay-to-hop-phap-mot-nguoi-bac-ninh-bi-xu-phat-may-trieu-d1402984.html
- Thông tư 27/2025/TT-BNNMT: https://mae.gov.vn/bao-ton-thien-nhien-va-da-dang-sinh-hoc/quy-dinh-moi-ve-quan-ly-loai-nguy-cap-quy-hiem-18851.htm
- Họa mi CITES: https://mcrsociety.org/2020/07/28/impact-of-a-cites-listing-on-the-chinese-hwamei-garrulax-canorus/
- Trại chào mào: https://nongnghiepmoitruong.vn/nuoi-chao-mao-bach-tang-loi-nhuan-tien-ty-d401304.html · https://vietnamnet.vn/chang-trai-mien-tay-so-huu-dan-chim-chao-mao-dot-bien-sieu-dep-2080167.html
- Di truyền học hót: https://elifesciences.org/articles/47216 · https://pmc.ncbi.nlm.nih.gov/articles/PMC5777042
- Game: https://thirdtimegames.com/?p=694 · https://chao-island.com/wiki/Type · https://kotaku.com/pokemon-scarlet-violet-what-are-ev-iv-training-1849905869 · https://legendcup.com/faq-mra1-raising-info.php · https://www.regvault.org/game/nes/best-keiba-derby-stallion · https://umamusu.wiki/Game:Conditions · https://thehowrser.blogspot.com/2012/07/choosing-competitions-for-your-horse.html · https://www.prydwen.gg/umamusume/guides/team-trials-guide · https://www.rivalstarshorseracing.com/post/mobile-update-1-41-foaling-season
- Thi chim Indonesia: https://etheses.uinsgd.ac.id/1291/4/4_bab1.pdf · https://repository.dinamika.ac.id/id/eprint/1846/3/BAB_II.pdf
- Supabase: https://supabase.com/docs/guides/auth/auth-anonymous · https://supabase.com/docs/guides/auth/auth-identity-linking · https://supabase.com/docs/guides/database/functions · https://supabase.com/docs/guides/functions/limits · https://supabase.com/docs/guides/database/postgres/column-level-security · https://supabase.com/docs/guides/api/securing-your-api · https://supabase.com/docs/guides/realtime/authorization · https://supabase.com/docs/guides/realtime/limits · https://supabase.com/pricing · https://supabase.com/docs/guides/api/api-keys
