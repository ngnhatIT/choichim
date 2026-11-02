# Nhật ký nâng cấp Lồng Tre

File này ghi lại mọi việc đã làm khi nâng cấp game, theo thứ tự thời gian. Mỗi lần làm xong một việc, thêm một mục mới ở cuối phần "Lịch sử". Nguồn thiết kế: `docs/TAI_LIEU_GAME.md`, mục 34.

## Kế hoạch

| Đợt | Hạng mục | Trạng thái |
|---|---|---|
| 1 | 34.1 Pháp lý họa mi, trường `legal` | Xong |
| 1 | 34.5 Chuối và trái cây màu đỏ khi thay lông | Xong |
| 2 | 34.6 Gửi chim nhờ hàng xóm | Chưa làm |
| 2 | 34.3 Dợt chim | Chưa làm |
| 3 | 34.4 Chim bổi và độ thuần | Chưa làm |
| 3 | 34.2 Hội thi đấu giàn (làm sau 34.3) | Chưa làm |

**Không làm lần này:** 34.7 (giọng thu âm, bỏ hẳn), 34.8 (nhiều lồng, thi trực tuyến, để đợt sau).

**Hướng chung:** nâng cấp cho cả người mới nuôi chim lẫn dân chơi chim lâu năm. Mỗi đợt có thiết kế riêng, được duyệt xong mới viết code.

## Lịch sử

### 2026-11-02
- Đọc tài liệu thiết kế, chốt chia 3 đợt như bảng trên.
- Chốt bỏ 34.7, dời 34.8.
- Tạo file nhật ký này.

### 2026-11-02, đợt 1 (34.1 và 34.5)

Bạn chọn hướng "họa mi nuôi sinh sản có giấy tờ" cho 34.1.

**34.1 Pháp lý**
- `src/data/species.js`: mọi loài có `legal { group, cites, checkedAt, note }`. Họa mi: `IIB`, CITES `II`. Họa mi thêm một mẹo chăm về giấy tờ nguồn gốc.
- `src/ui/Modals.js`: thẻ họa mi có nhãn "Loài nguy cấp, quý, hiếm nhóm IIB"; bước "Bạn nhận từ đâu?" hiện ghi chú pháp lý; Sổ tay ghi nhóm IIB và CITES II ở mục Nguồn gốc.
- `src/core/Game.js`: ván mới với loài có `legal.group` ghi nhật ký ngày 1 nhắc lưu giấy tờ và làm thủ tục với Kiểm lâm.
- `src/data/handbook.js`: mục "Nguồn gốc và pháp luật" thêm họa mi IIB, phân biệt chích chòe than với chích chòe lửa, ghi tháng đối chiếu 11/2026.

**34.5 Thay lông**
- `chaomao.moltAvoid` chỉ còn `['sauquy']`: chuối không bị chấm ✗ khi thay lông.
- `src/data/foods.js`: thêm `carot`, `thanhlong`; cờ `pigment: true` cho ớt/cà chua, táo/đu đủ, cà rốt, thanh long. Cả 6 loài có điểm cho hai món mới.
- `src/core/state.js`: `today.pigment`, `S.moltDays`, `S.pigmentDays`.
- `src/core/actions.js`: ăn món `pigment` (điểm ≥ 1) đặt `today.pigment`.
- `src/core/dayCycle.js`: thay lông có món `pigment` trong ngày thì điểm lông `c` +0,5; hết mùa thay lông, đủ món ở ít nhất nửa số ngày thì nhật ký khen lông đuôi lên màu đỏ.
- Sổ tay mục thay lông nêu cả hai luồng ý kiến về chuối.

**Test:** thêm 5 test trong `tests/game.test.js`. Kết quả: 77/77 qua, `vite build` thành công.

**Các quyết định của mình, chưa hỏi bạn**
- Bốn loài còn lại có `legal.group: null`, `checkedAt: '2026-11'` và ghi chú "chưa đối chiếu đầy đủ", vì tài liệu chưa kết luận pháp lý cho chúng.
- Bonus `pigment` áp cho mọi loài đang thay lông, không riêng chào mào (món điểm ≥ 1 mới tính).
- Code đã có sẵn bước chặn "chim bẫy ngoài chợ" ở màn chọn chim, nên không đổi cờ `wild` của họa mi; chỉ thêm nhãn và ghi chú pháp lý.

### 2026-11-02, đợt 1: làm nốt phần thiếu

- `src/core/dayCycle.js`, `actions.js`, `state.js`: chế độ Người mới, đang thay lông, cho chuối quá 2 lần trong ngày thì cuối ngày có mục `null` "Chuối nên cho vừa phải" (không phạt). Thêm `today.chuoi`.
- `S.redVent`: hết mùa thay lông, có món tạo màu ở ít nhất nửa số ngày thì đặt `true`. `src/render/World.js` tô lông dưới đuôi đỏ đậm (`#E8201A`) khi `redVent`.
- `docs/TAI_LIEU_GAME.md` (bản trong repo): sửa các dòng mô tả chuối, `moltAvoid`, món `pigment`, `redVent`. Bản này là bản cũ, không có các khối ⚠ và mục 34. Bản trong Downloads chưa sửa: khi muốn đồng bộ, xóa khối ⚠ và đề xuất 34.1, 34.5 ở đó.
- Test: thêm 3 test. Kết quả 80/80 qua, `vite build` thành công.
- Đã xem trên trình duyệt: nhãn "nhóm IIB" ở thẻ họa mi và ghi chú ở bước "Bạn nhận họa mi từ đâu?" hiện đúng, console không lỗi.
- Chưa xem bằng mắt: lông dưới đuôi đỏ đậm trong cảnh 3D (cần chơi hết một mùa thay lông).
