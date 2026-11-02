import { beforeEach, afterEach, vi } from 'vitest';

// Thời tiết theo tháng thật: cố định ngày để test không đổi kết quả theo tháng chạy test.
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 3, 15, 8, 0)); });
afterEach(() => { vi.useRealTimers(); });
