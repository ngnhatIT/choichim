// Hằng số cân bằng game. Đơn vị thời gian: phút trong game.
export const TOTAL_DAYS = 14;
export const DAY_START = 6 * 60;          // 06:00
export const SLEEP_FROM = 18 * 60;        // có thể cho chim ngủ từ 18:00
export const LATE_SLEEP = 20 * 60 + 30;   // ngủ sau 20:30 là muộn
export const FORCE_SLEEP = 22 * 60;       // 22:00 tự kết thúc ngày
export const TICK_MS = 400;               // nhịp đồng hồ thật
export const SPEEDS = [0, 2, 6];          // phút game mỗi nhịp: dừng / chậm / nhanh
export const NEW_BIRD_DAYS = 3;           // số ngày chim mới về cần yên tĩnh
export const MOLT_START = 6;              // ngày bắt đầu thay lông
export const MOLT_END = 11;               // ngày thay lông xong
export const MIX_DAYS = 5;                // số ngày trộn dần thức ăn khi đổi cám
export const SAVE_KEY = 'longtre-3d-save-v1';
