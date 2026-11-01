# Nghiên cứu game cùng thể loại cho Lồng Tre

Tổng hợp từ các nguồn công khai (tháng 11/2026): đánh giá, phỏng vấn nhà phát triển, wiki, bài phân tích thiết kế. Mục tiêu: rút bài học áp dụng được cho UI/UX, hình ảnh chim 3D và vòng chơi của Lồng Tre. Nhiều nguồn là bài review ngắn, nên phần "áp dụng" là suy luận thiết kế, không phải số liệu đo được.

Hiện trạng để đối chiếu: chim dựng thủ tục trong `src/render/Bird.js` bằng `MeshStandardMaterial`/`MeshPhysicalMaterial`, mắt đã có đốm sáng (`glint`) và mí chớp; HUD (`src/ui/Hud.js`) hiển thị 8 chỉ số dạng thanh kèm số và mũi tên xu hướng, thẻ trạng thái (ốm, mới về, thay lông, đang hót), "Việc hôm nay", thông báo nổi.

## 1. Từng game: điều đáng học

### Nintendogs / Nintendogs + Cats (Nintendo, 2005 / 2011)
- Mọi việc chăm sóc làm bằng chạm trực tiếp: vuốt để cưng, kéo bát ăn, bát nước tới con chó; chó phản ứng khác nhau tùy chỗ được vuốt, có chỗ thích, có chỗ khó chịu. Được IGN trao giải dùng màn cảm ứng hay nhất trên DS.
- Micro dùng để gọi tên và dạy lệnh: con vật "nhận ra" chủ.
- Lời chê đáng nhớ: camera cố định giống "camera an ninh" hơn là góc nhìn người chủ.
- **Bài học:** tương tác trên chính con vật quan trọng hơn bấm nút; camera phải lại gần, ngang tầm mắt con vật khi tương tác.

### Tamagotchi (bản gốc, Uni, Plaza)
- Nhu cầu hiển thị bằng vài đồng hồ đơn giản (Đói, Vui, Kỷ luật); con vật tự "gọi" bằng biểu tượng chú ý khi cần.
- Trạng thái thể hiện ngay trong cảnh: phân nằm trên màn hình, có vạch bốc mùi trước khi đi vệ sinh, đầu lâu cạnh con vật khi ốm, con vật ngồi im mặt buồn.
- Chất lượng chăm quyết định hình dạng trưởng thành; mỗi lần lên giai đoạn có nhạc hiệu ngắn và đổi ngoại hình.
- Tamagotchi Plaza (2025) bị chê vì minigame lặp, thiếu hướng dẫn: hình thức dễ thương không cứu được vòng chơi mù mờ.
- **Bài học:** dấu hiệu trực quan trong cảnh (phân, ruồi, lông xù) đáng tin hơn con số; mỗi cột mốc cần một khoảnh khắc nghi lễ có âm thanh riêng.

### Neko Atsume / Neko Atsume 2 (Hit-Point)
- Thiết kế bằng phép trừ: bỏ bớt tính năng so với các app cùng loại, mỗi lần mở chỉ vài thao tác ít kỹ năng, ít thời gian. Chơi được cả kiểu ghé nhiều lần lẫn thỉnh thoảng.
- Menu đơn giản; mỗi lựa chọn có tiếng "pop/click" thỏa mãn, thỉnh thoảng một tiếng meo.
- Bản 2 (10/2024) thêm mục "Lần ghé đầu tiên" trong sổ mèo, sticker trang trí ảnh, sửa đồ cũ bằng một cú chạm.
- **Bài học:** ít nút hơn là ấm áp hơn; âm thanh UI nhỏ nhưng nhất quán; sổ sưu tập ghi "lần đầu" tạo kỷ niệm.

### Finch: Self-Care Pet
- Thú cưng là một con chim nhỏ ("birb"); người chơi chọn màu trứng, tên, tính cách lúc onboarding. Mỗi ngày hoàn thành việc thì chim lộ thêm tính cách và đi "phiêu lưu", phần thưởng chậm giúp người chơi làm hết việc trong ngày.
- Không phạt khi bỏ lỡ: không làm chim xấu đi, sáng hôm sau làm lại; thông báo mang giọng khích lệ thay vì gây tội lỗi. Nhận Editors' Choice của App Store.
- Bài phê bình Pratt: nút chính cùng vị trí, cùng màu ở mọi màn hình onboarding là điểm mạnh; trang Quests quá nhiều việc cùng lúc, đề xuất mở dần từng việc.
- **Bài học:** giọng văn không trách móc; hiện việc tiếp theo thay vì cả danh sách; tạo gắn bó ngay từ màn chọn chim (đặt tên).

### Kinder World (Lumi Interactive)
- Chăm cây nhà bằng các việc nhỏ dịu dàng (biết ơn, giãn cơ, thở); phiên chơi khoảng 2 phút; có nhà tâm lý tham gia từ đầu; chơi "khi cần", không ép vòng lặp.
- Bản cập nhật gần đây tổ chức lại phòng để giảm nhiễu thị giác, giản lược UI.
- **Bài học:** cảnh là nhân vật chính, UI lùi lại; giảm số thứ trên màn hình là một cải tiến có chủ đích.

### Stardew Valley (vật nuôi)
- Vòng chăm hằng ngày: vuốt mỗi con một lần mỗi ngày (+15 điểm thân thiết), không vuốt thì mất 5–10 điểm cuối ngày; tâm trạng 0–255 chỉ lộ qua câu thoại khi nhấp vào con vật; thân thiết hiện bằng tim (mỗi nửa tim 100 điểm, tối đa 10 tim). Ăn cỏ ngoài trời đưa tâm trạng lên tối đa.
- Thân thiết và tâm trạng quyết định chất lượng sản phẩm: chăm tốt có phần thưởng hữu hình.
- **Bài học:** một thao tác "cưng" mỗi ngày, rẻ, rõ ràng; trạng thái mô tả bằng lời con vật thay vì số.

### Animal Crossing: New Horizons
- Giao tiếp bằng ký hiệu phổ quát (bóng đèn khi có ý tưởng, biểu tượng cảm xúc trên đầu nhân vật); UI được nhận xét là một phần lý do game thành công.
- NookPhone gom chức năng vào một "điện thoại" trong thế giới game, bo tròn, màu ấm, chữ to.
- **Bài học:** biểu tượng cảm xúc nổi trên đầu con vật là cách báo trạng thái nhanh nhất; UI nên mang chất liệu của thế giới (ở đây: giấy dó, tre, sơn mài, mà Lồng Tre đã có).

### Cozy Grove (Spry Fox)
- Đồng bộ thời gian thật, mỗi ngày 30–60 phút nhiệm vụ mới, sau đó chơi tự do; game "dám bảo người chơi tắt máy". Đánh giá chia hai: có người thấy giới hạn khó chịu khi hết việc.
- Hoàn thành nhiệm vụ thì gấu linh hồn thân thiện hơn và lộ một mẩu chuyện; đảo dần có màu trở lại (phản hồi tiến bộ bằng chính cảnh).
- **Bài học:** kết thúc ngày gọn gàng là đúng hướng, nhưng phải còn việc nhẹ để làm sau khi xong "Việc hôm nay"; tiến bộ nên làm cảnh đẹp lên.

### Pocket Love (HyperBeard)
- Trang trí nhà, nhân vật và thú cưng rất dễ thương, phiên ngắn, không ép chơi lâu; bị chê lặp lại khi chỉ có trang trí.
- **Bài học:** dễ thương giữ chân lúc đầu, chiều sâu (ở Lồng Tre là hệ quả chăm sóc) giữ chân về sau.

### Ooblets (Glumberland)
- Nghệ sĩ thích "xem các nhân vật dễ thương sống cuộc đời của chúng trong luật mình đặt"; bản thử hình ảnh sớm thu hút nhiều quan tâm hơn mọi dự án khác. Hình khối tròn, màu bão hòa vừa, mỗi sinh vật có dáng đi riêng.
- **Bài học:** cá tính nằm ở hoạt ảnh nhàn rỗi (idle), không chỉ ở model.

### Unpacking (Witch Beam)
- Hơn 14.000 file âm thanh foley: mỗi đồ vật có tiếng nhấc và đặt riêng theo bề mặt. Âm thanh thực tế tương phản với hình ảnh ấn tượng, khiến thao tác nhỏ thấy "thật".
- **Bài học:** tiếng thao tác nên khác theo vật liệu (cóng sứ, máng tre, khay gỗ, áo vải) và theo chỗ đặt.

### A Short Hike (Adam Robinson-Yu)
- Nhân vật chính là một chú chim. Mục tiêu "thế giới 3D đẹp và dễ đọc với ít pixel nhất": render độ phân giải thấp, không khử răng cưa, đổ bóng phẳng, có viền mềm quanh vật thể để nổi khối; bảng màu lấy từ ảnh mùa thu thật; người chơi chỉnh được kích thước pixel.
- **Bài học:** viền mềm và bảng màu lấy từ ảnh thật cho ra phong cách đồng nhất; cho người chơi tùy chọn khi phong cách gây tranh cãi.

### Alba: A Wildlife Adventure (ustwo games)
- Low poly "một cách tự hào": khối bắt đầu từ hình nguyên thủy, không dùng normal map, chuyển normal từ lưới mịn tạm để bóng mềm liên tục; màu bằng dải gradient trên atlas (UV kéo giãn) để đổi màu nhanh; bảng màu theo ảnh thực địa và họa sĩ Sorolla; dùng boolean làm mẻ cạnh thay texture. Nhiều loài chim, mỗi loài có model riêng, được khen hoạt ảnh.
- **Bài học:** với chim thủ tục, gradient màu theo vùng cơ thể + bóng mềm đáng giá hơn texture chi tiết.

### Wingspan bản số (Monster Couch)
- Giữ tranh vẽ tay tả thực (Natalia Rojas, Ana María Martínez Jaramillo), thêm hoạt ảnh nhẹ và tiếng kêu riêng cho từng loài trên thẻ; chuyển cảnh mượt được khen. Bị chê popup chữ làm vướng thao tác và phần hướng dẫn chạm.
- **Bài học:** thẻ loài trong màn chọn chim và Sổ tay nên có hoạt ảnh nhỏ + tiếng hót; thông tin phụ không được chặn thao tác chính.

### Game chim trên Steam (Birdwatching Notebook, Bird Watcher, Look to the Birds)
- Birdwatching Notebook (pixel art, idle) được đánh giá rất tích cực (1.370/1.406); Bird Watcher có 15 chim low poly dựng riêng. Không tìm thấy phân tích sâu về kỹ thuật model; thể loại thiên về quan sát hơn chăm sóc.
- **Bài học:** người chơi thể loại này thưởng thức việc *ngắm* chim; nên có chế độ ngắm/chụp ảnh không có HUD.

### Nền tảng chung: Kindchenschema và "juice"
- Lorenz (1943): đầu to, mặt tròn, mắt to, mũi miệng nhỏ gây cảm giác dễ thương; Glocker và cộng sự (2009) xác nhận bằng thực nghiệm rằng tăng các đặc điểm này làm tăng cảm giác dễ thương và động lực chăm sóc. Hiệu ứng có cả với ảnh chó, mèo (Borgi 2014).
- Thiết kế chim stylized: khối tròn, bớt phần nhọn; con chim dài và nhọn khó dễ thương; thân hình quả trứng.
- "Juice it or lose it" (GDC Europe 2012): thêm tween/easing, hạt, âm thanh, chớp màu cho mọi phản hồi làm cùng một game vui hơn hẳn. Phản biện cùng hội nghị: lạm dụng làm mất nhập tâm.
- Three.js: `MeshToonMaterial` + `gradientMap` 2–3 pixel (lọc `NearestFilter`) cho dải sáng toon; viền bằng inverted hull (bản sao phóng to, `side: BackSide`, màu tối); rim light bằng hệ số Fresnel.

## 2. Bảng bài học theo ưu tiên cho Lồng Tre

Ưu tiên: **P1** làm ngay, chi phí thấp, tác động lớn; **P2** đáng làm; **P3** khi có thời gian.

| Ưu tiên | Nhóm | Bài học (nguồn) | Áp dụng cụ thể trong Lồng Tre |
|---|---|---|---|
| P1 | Đồ họa chim | Kindchenschema (Lorenz, Glocker) | Tăng `T.head` khoảng 12–18% và `eyeR` khoảng 20% trong `Bird.js`, giữ thân như quả trứng (`plump`); không đổi tỉ lệ mỏ để vẫn nhận ra loài. |
| P1 | Đồ họa chim | Đốm sáng mắt (AC, Ooblets) | Đã có `glint`; tăng lên ~0,3 bán kính mắt, thêm đốm phụ nhỏ đối diện; luôn hướng về camera (đặt theo không gian camera) để mắt "sống" mọi góc. |
| P1 | Đồ họa chim | Viền mềm (A Short Hike), inverted hull | Thêm vỏ `BackSide` phóng 1,03–1,05 lần cho thân, đầu, đuôi, màu = màu lông tối đi 60% (không đen tuyền); tắt khi máy yếu. Chim tách khỏi nền nhà ống bận rộn. |
| P1 | Đồ họa chim | Rim light Fresnel | Chèn rim vào shader qua `onBeforeCompile` của vật liệu lông, màu ấm theo `Sky.js` (vàng sáng, xanh lạnh ban đêm); giúp đọc dáng chim khi lồng ở chỗ tối. |
| P1 | UI/UX | Trạng thái trên chính con vật (Tamagotchi, Stardew) | Biểu tượng nổi trên đầu chim (sprite) khi có nhu cầu: hạt (đói), giọt (khát), ruồi (lồng bẩn), nốt nhạc (vui), mây xám (bất an), "z" (buồn ngủ); chạm vào biểu tượng thực hiện luôn hành động. |
| P1 | UI/UX | Bớt số (Neko Atsume, Kinder World) | Ẩn số `stat-v` mặc định, chỉ hiện khi rê chuột/nhấn giữ; thanh đổi màu theo 3 ngưỡng (ổn, cần chú ý, nguy); mũi tên xu hướng giữ lại. |
| P1 | UI/UX | Việc tiếp theo thay vì cả danh sách (Finch, Pratt) | "Việc hôm nay" thu gọn mặc định, chỉ hiện việc kế tiếp kèm gợi ý giờ; mở rộng khi chạm. |
| P1 | Juice | Phản hồi tức thì (Juice it or lose it) | Mỗi hành động: chim quay đầu nhìn tay, bóp-giãn (squash/stretch) 120 ms, vài hạt (hạt kê rơi, giọt nước bắn, lông bay khi rũ), số nổi "+ tâm trạng" nhẹ; tôn trọng chế độ giảm chuyển động. |
| P1 | Âm thanh | Tiếng theo vật liệu (Unpacking, Neko Atsume) | `sfx.js`: tiếng sứ cho cóng, tre cho máng, gỗ cho khay, vải sột soạt cho áo lồng; cao độ ngẫu nhiên ±5% để không lặp. |
| P2 | Tương tác | Vuốt trên con vật (Nintendogs) | Nhấn giữ + kéo trên chim để "trò chuyện/vuốt ve": vùng đầu, má thích (chim nghiêng đầu, nhắm mắt), vùng đuôi không thích (xù lông, nhảy sang cầu khác). Chim mới về: mọi vùng đều làm chim lùi lại, dạy bài học yên tĩnh. |
| P2 | Tương tác | Kéo thả đồ ăn (Nintendogs) | Kéo món từ bảng vào máng/cóng trong cảnh 3D thay cho chọn menu; nút vẫn giữ cho bàn phím và trợ năng. |
| P2 | Camera | Tránh "camera an ninh" (Nintendogs) | Khi tương tác với chim, camera tự lại gần ngang tầm mắt chim (ease 0,6 s), lệch 3/4 để thấy cả hai mắt; trả về góc cũ sau vài giây không thao tác. |
| P2 | Đồ họa chim | Gradient theo vùng (Alba) | Đã tô màu đỉnh trên đầu; mở rộng dải gradient lưng → bụng cho thân, cánh sẫm ở mép; bỏ bớt chi tiết texture lông ở khoảng cách xa. |
| P2 | Đồ họa chim | Toon nhẹ (Three.js) | Tùy chọn "Phong cách: Tả thực / Hoạt hình": hoạt hình dùng `MeshToonMaterial` với `gradientMap` 3 bậc; giữ cả hai như A Short Hike cho chỉnh pixel. |
| P2 | Đồ họa chim | Cá tính qua idle (Ooblets, Alba) | Mỗi loài 2–3 cử chỉ riêng khi rảnh: chào mào dựng mào, chích chòe vểnh đuôi, yến phụng gãi đầu bằng chân, khuyên nhảy liên tục; đã có `gestures`, chỉ cần thêm tần suất theo tâm trạng. |
| P2 | UI/UX | Giọng văn không trách (Finch) | Viết lại nhật ký lỗi theo dạng "Chim hơi khát. Lần sau thay nước trước 9 giờ nhé" thay vì liệt kê lỗi; bảng ✓/✗ cuối ngày đổi ✗ thành "để mai làm tốt hơn" kèm bài học. |
| P2 | Onboarding | Gắn bó từ đầu (Finch) | Màn chọn chim cho đặt tên; ngày 1 hướng dẫn từng bước bằng mũi tên chỉ vào vật thể 3D (cóng, máng), mỗi bước một việc, nút chính cố định vị trí. |
| P2 | Nghi lễ | Cột mốc có nhạc (Tamagotchi) | Lên cấp giọng hót, hết thay lông, câu nói đầu tiên: dừng camera vào chim, ánh sáng ấm, đoạn hót mẫu, ghi vào sổ "Lần đầu" (Neko Atsume 2). |
| P2 | Gameplay | Phần thưởng hữu hình (Stardew, Cozy Grove) | Chăm tốt làm cảnh đẹp lên: cây cảnh ở hiên ra hoa, nắng vàng hơn, hàng xóm ghé nghe; lông bóng hơn (tăng `gloss`) khi chỉ số lông cao. |
| P3 | Gameplay | Việc nhẹ sau khi xong ngày (Cozy Grove) | Sau khi đủ "Việc hôm nay": chế độ ngắm/chụp ảnh chim (ẩn HUD), sticker khung tre cho ảnh, ảnh vào album tổng kết ngày 14. |
| P3 | Thông báo | Nhắc nhẹ (Finch, Kinder World) | Nếu thêm thông báo trình duyệt: chỉ 1 lần/ngày, giọng chim gọi ("Chào mào đang đợi nắng sớm"), tắt mặc định. |
| P3 | Sổ tay | Thẻ loài sống động (Wingspan) | Thẻ loài trong Sổ tay và màn chọn có hoạt ảnh nhẹ (chớp mắt, nghiêng đầu) và nút nghe tiếng hót (đã có nghe thử). |

## 3. Nguồn

- Nintendogs: https://en.wikipedia.org/wiki/Nintendogs ; https://www.thetechedvocate.org/the-gameplay-mechanics-of-nintendogs-more-than-just-petting-puppies/ ; https://www.nintendoworldreport.com/review/4394 ; https://www.theglobeandmail.com/technology/nintendogs/article20425368
- Tamagotchi: https://en.wikipedia.org/wiki/Tamagotchi ; https://thetoyinsider.com/tamagotchi-uni-opens-up-the-tamaverse ; https://www.techradar.com/gaming/tamagotchi-plaza-review ; https://opencritic.com/game/18324/tamagotchi-plaza/reviews
- Neko Atsume: https://www.everyeye.it/articoli/recensione-neko-atsume-27940.html ; https://dailycollegian.com/2016/01/neko-atsume-app-offers-fun-feline-diversion ; https://avclub.com/read-this-the-new-york-times-explains-neko-atsume-s-ap-1798244391 ; https://nekoatsume.fandom.com/wiki/Neko_Atsume_2
- Finch: https://ixd.prattsi.org/2026/02/design-critique-finch-self-care-pet-ios-app/ ; https://ixd.prattsi.org/2025/09/design-critique-finch-ios-app-2/ ; https://foxdata.com/en/blogs/finch-as-app-store-editors-choice-a-self-care-companion/ ; https://habitbox.app/blog/finch-app-review
- Kinder World: https://techcrunch.com/2022/06/23/cozy-houseplants-and-self-care-how-one-startup-is-reimagining-mobile-gameplay-as-a-healing-activity ; https://apps.apple.com/hk/app/id1541796687 ; https://tvobsessive.com/2021/01/25/interview-with-lumi-interactive-on-kinder-world-and-the-wholesome-games-movement/
- Stardew Valley: https://stardewvalleywiki.com/Animals ; https://wiki.stardewvalley.net/Dog
- Animal Crossing: https://uxdesign.cc/animal-crossing-delight-by-design-e2c0a1a4d462 ; https://nookipedia.com/wiki/NookPhone
- Cozy Grove: https://www.gamespew.com/2021/04/cozy-grove-review/ ; https://broadly.vice.com/en/article/bvx9vw/cozy-grove-is-ok-telling-players-to-log-off-its-delightful
- Pocket Love: https://gamingonphone.com/reviews/pocket-love-review ; https://www.commonsensemedia.org/app-reviews/pocket-love
- Ooblets: https://gamesradar.com/reality-is-boring-the-creative-duo-behind-ooblets-talk-indie-development-and-the-timeless-appeal-of-the-town-sim ; https://gamepilgrim.com/2018/08/24/developer-interview-glumberland
- Unpacking: https://www.nme.com/news/unpacking-features-over-14000-sound-effect-files-3087521 ; https://www.gamedeveloper.com/marketing/auditory-tales-from-the-making-of-zen-puzzler-unpacking
- A Short Hike: https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/ ; https://nintendoeverything.com/interview-a-short-hike-dev-on-bringing-the-game-to-switch-inspiration-art-style-possibility-of-a-sequel-more/ ; https://en.wikipedia.org/wiki/A_Short_Hike
- Alba: https://ustwogames.co.uk/news/the-environment-art-of-alba-a-wildlife-adventure/ ; https://www.engadget.com/alba-a-wildlife-adventure-steam-apple-arcade-ustwo-review-152045112.html
- Wingspan bản số: https://toucharcade.com/2021/08/16/wingspan-review-iphone-ipad-ios-board-game-adaptation-monster-couch/ ; https://pcgamer.com/uk/birding-board-game-wingspan-comes-to-steam ; https://bigbossbattle.com/?p=72010
- Game chim: https://www.wasdland.com/game/birdwatching-notebook-4111370/ ; https://multimorphic.com/?p=6704
- Kindchenschema: https://pmc.ncbi.nlm.nih.gov/articles/PMC3105163 ; https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00411/full
- Thiết kế chim stylized: https://sites.google.com/view/knb217-scott-barley-production/preproduction ; https://madelinehusby.myportfolio.com/crowllection
- Juice: https://gdcvault.com/play/1016487/ ; https://roblog.co.uk/2024/03/juicy-games/
- Three.js toon: https://threejs.org/docs/pages/MeshToonMaterial.html ; https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/
