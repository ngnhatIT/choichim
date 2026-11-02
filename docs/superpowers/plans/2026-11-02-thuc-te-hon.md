# Lồng Tre thực tế hơn: kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chế độ "Người chơi lâu năm", bệnh có ủ bệnh và liệu trình thuốc, thời tiết theo vùng và tháng thật, tính cách chim ẩn.

**Architecture:** Logic mới nằm trong `src/core` và `src/data` (không đụng DOM, test trên Node). Bệnh gom vào file mới `src/core/illness.js`, tính cách vào `src/data/traits.js`; phần còn lại sửa tại chỗ theo mẫu sẵn có. Giao diện chỉ đọc trạng thái mới.

**Tech Stack:** JavaScript ES module, Vite 5, Vitest 2 (happy-dom cho `tests/ui.test.js`), Three.js.

**Spec:** `docs/superpowers/specs/2026-11-02-thuc-te-hon-design.md`

## Global Constraints

- Chữ hiển thị, nhật ký, comment: tiếng Việt, cùng giọng văn với code hiện có.
- `src/core`, `src/data` không import DOM, Three.js.
- Mọi ngẫu nhiên qua `ctx.rng` hoặc RNG có seed (`createRng`). Không dùng `Math.random` trong core.
- Trạng thái mới khai báo trong `createState`; bản lưu cũ mở được (`migrateState`).
- Bản lưu cũ: `mode = 'moi'`, `region = 'trung'`, tính cách bình thường và đã biết, bệnh cũ `{ type, since }` là `phase: 'ro'`.
- Không thêm thành tựu; test "đủ 11 thành tựu" giữ nguyên.
- Không thêm dependency.
- Chạy test: `npm test`.

## Review Focus

1. Bản lưu cũ đang có chim ốm (`sick: { type, since }`) phải mở ra chơi tiếp, đi thú y được. Test ở Task 3.
2. Chim đang `'som'` qua đêm: 180 phút đếm theo phút mô phỏng, đêm không chạy; sáng hôm sau vẫn tiếp tục đếm, không kẹt. Test ở Task 3.
3. Chim chết khi đang điều trị (máu cạn do đói khát) vẫn ra màn chim chết bình thường, màn đó đọc `DISEASES[S.sick.type]` không lỗi. Test ở Task 3.
4. Đổi chế độ giữa ván không làm mất trạng thái hay vỡ HUD (bảng ẩn hiện lại đúng). Test ở Task 6.
5. Chạy game ở realtime vắng nhà lâu (`sync` chạy bù qua nhiều ngày): `startDay` vẫn tính tháng đúng cho từng ngày. Test ở Task 2 (tháng của ngày `d` tính từ `startAt`, không từ `now`).

---

### Task 1: Ván mới nhận tùy chọn, trạng thái mới, test cố định ngày

**Files:**
- Create: `tests/setup.js`
- Modify: `vite.config.js:13`, `src/core/state.js`, `src/core/Game.js` (`constructor`, `newGame`)
- Test: `tests/game.test.js`

**Interfaces:**
- Produces:
  - `createState({ sp, name, stage, mode = 'moi', region = 'trung', startAt = 0, traits = null })`. Trạng thái thêm: `mode`, `region`, `startAt`, `traits` (`{ temper:'binh', appetite:'binh', fire:'binh', fav:null }` mặc định), `known` (`{ temper:true, appetite:true, fire:true, fav:true }` mặc định, tức bản lưu cũ coi như đã biết), `lookDays: []`.
  - `migrateState` thêm `traits`, `known` vào danh sách khóa lồng nhau được bù.
  - `Game.constructor` lưu `this.seed = seed`.
  - `Game.newGame(sp, name, stage = 'truong', opts = {})`, `opts = { mode, region, traits }`. Đặt `startAt = this.now()`. Task 4 sẽ thêm việc tung tính cách khi `opts.traits` không có.
  - `tests/setup.js`: `vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 3, 15, 8, 0));` trong `beforeEach`, `vi.useRealTimers()` trong `afterEach`.

- [ ] **Step 1: Viết test hỏng** trong `tests/game.test.js`, `describe('Lồng Tre - tùy chọn ván mới')`:

```js
it('ván mới nhận chế độ, vùng, mốc ngày; bản lưu cũ được bù mặc định', () => {
  const g = new Game({ seed: 1, storage: null });
  g.newGame('chaomao', 'A', 'truong', { mode: 'lau', region: 'bac' });
  expect(g.S.mode).toBe('lau');
  expect(g.S.region).toBe('bac');
  expect(g.S.startAt).toBe(new Date(2026, 3, 15, 8, 0).getTime());
  const old = JSON.parse(JSON.stringify(g.S));
  for (const k of ['mode', 'region', 'startAt', 'traits', 'known', 'lookDays']) delete old[k];
  g.load(old);
  expect(g.S.mode).toBe('moi');
  expect(g.S.region).toBe('trung');
  expect(g.S.known.temper).toBe(true);
});
```

- [ ] **Step 2: Chạy** `npx vitest run tests/game.test.js -t "tùy chọn ván mới"`. Mong đợi: FAIL (`S.mode` undefined).
- [ ] **Step 3: Thêm `tests/setup.js`, khai báo `setupFiles: ['tests/setup.js']` trong `vite.config.js` (khóa `test`), sửa `state.js`, `Game.js` như Interfaces.**
- [ ] **Step 4: Chạy** `npm test`. Mong đợi: tất cả PASS (test cũ chưa đổi hành vi).
- [ ] **Step 5: Commit** `feat: ván mới nhận chế độ, vùng, mốc ngày; test cố định ngày`.

### Task 2: Thời tiết theo vùng và tháng

**Files:**
- Modify: `src/data/weather.js`, `src/core/dayCycle.js` (`startDay`, chấm "Tắm nắng", nồm), `src/core/simulation.js` (nắng, đồ tươi ôi, rận mạt), `src/core/goals.js` (mục `sun`), `src/core/householdEvents.js` (sự kiện `nom`), `src/core/state.js` (ngày 1)
- Test: `tests/game.test.js`

**Interfaces:**
- Consumes: `S.region`, `S.startAt` (Task 1).
- Produces:
  - `WEATHER` thêm `ret` (Rét khô, 13, `cold`), `nom` (Nồm ẩm, 22, `humid`), `rao` (Mưa rào, 29, `rain`); mọi kiểu có đủ cờ `hot, cold, rain, humid`.
  - `WEATHER_TABLE[region][month 1..12] -> { key: weight }` theo bảng mục 7 của spec.
  - `monthOf(S, day = S.day) -> 1..12`: tháng của `S.startAt + (day − 1) × 86 400 000`; `startAt` bằng 0 (bản lưu cũ) thì dùng tháng 4.
  - `rollWeather(day, rng, region = 'trung', month = 4) -> key`. Ngày 1: kiểu có trọng số lớn nhất không `rain`, không `hot`; không có thì `'mat'`.
  - `weatherName(S) -> string`: `'Gió Lào, nắng nóng'` khi `region === 'trung'`, `weather === 'nong'`, tháng 5–8; còn lại `WEATHER[key].name`.
  - `sunWindow(W) -> [từ giờ, đến giờ]`: `[8, 10.5]` khi `W.key === 'ret'`, còn lại `[6, 9.5]`.
  - `newGame` đặt `S.weather = rollWeather(1, …, S.region, monthOf(S, 1))`.

- [ ] **Step 1: Viết test hỏng:**

```js
it('thời tiết theo vùng, tháng: chỉ ra kiểu trong bảng, ngày 1 dịu', () => {
  const rng = createRng(5);
  for (const r of ['bac', 'trung', 'nam']) for (let m = 1; m <= 12; m++) {
    const keys = Object.keys(WEATHER_TABLE[r][m]);
    for (let i = 0; i < 30; i++) expect(keys).toContain(rollWeather(2, rng, r, m));
    const d1 = WEATHER[rollWeather(1, rng, r, m)];
    expect(d1.rain || d1.hot).toBe(false);
  }
});
it('tháng tính từ ngày đón chim, không từ giờ hiện tại', () => {
  const S = { startAt: new Date(2026, 0, 30).getTime() };
  expect(monthOf(S, 1)).toBe(1);
  expect(monthOf(S, 3)).toBe(2);
});
it('rét: nắng tốt dời sang 8:00–10:30; nồm, nóng: đồ tươi ôi sau 150 phút', () => {
  // dựng ván, ép S.weather = 'ret', phơi nắng 7:00–7:25 → T.sunGood === 0; phơi 8:00–8:25 → T.sunGood >= 20
  // ép S.weather = 'nom', cho ăn chuối, advance(151) → S.fresh.spoiled === true; với 'mat' advance(151) → false
});
it('ngày nồm chưa đổ cám mới thì bị phạt, đã đổ thì không', () => {
  // hai ván ép 'nom': một ván act('staple') hôm đó, một ván không; cuối ngày tìm mục 'Cám để qua ngày nồm' trong report.items
});
```

(Phần comment trong hai test cuối viết thành code thật với `Game` ở chế độ không realtime, theo mẫu `playGoodDay`.)

- [ ] **Step 2: Chạy** `npx vitest run tests/game.test.js -t "thời tiết|tháng|rét|nồm"`. Mong đợi: FAIL.
- [ ] **Step 3: Sửa `weather.js` theo Interfaces.** Bảng trọng số là bảng mục 7 spec, giữ nguyên số.
- [ ] **Step 4: Áp hệ quả:**
  - `startDay`: `rollWeather(S.day, rng, S.region, monthOf(S))`; nhật ký đầu ngày dùng `weatherName(S)` và thêm lời khuyên: `ret` "Rét: phơi nắng khi nắng đã lên (8:00–10:30), che gió hiên, trùm áo sớm.", `nom` "Nồm ẩm: cám dễ mốc, đổ cám mới, dọn đồ tươi sớm.", `rao` "Mưa rào: không phơi nắng được, tắm vẫn bình thường."
  - `simulation.js`: khung nắng tốt dùng `sunWindow(W)` (trong khung: `sunGood++`; nửa điểm giữ quy tắc cũ ngoài khung trước 11 giờ và sau 15 giờ); `ret` phơi trước 7:30 thì `risk.cam_lanh += 0.3`/phút và một lần nhật ký `warn`. Đồ tươi ôi khi `age > (W.hot || W.humid ? 150 : 240)`. `W.humid` thì rận mạt từ lồng bẩn ×1,5.
  - `endDay`: `W.humid && !T.refill` → `add(false, 'Cám để qua ngày nồm', …)`, `risk.tieu_chay += 25`. Chữ "Thiếu nắng sớm" và `goals` mục `sun` lấy giờ từ `sunWindow`.
  - `householdEvents.js` sự kiện `nom`: điều kiện đổi thành `(W.humid || W.rain) && S.feeder.amt > 0`.
- [ ] **Step 5: Chạy** `npm test`. Mong đợi: PASS. Nếu test cân bằng 14 ngày lệch, chỉnh nhẹ trọng số bảng (ghi lại trong commit), không sửa test cân bằng.
- [ ] **Step 6: Commit** `feat: thời tiết theo vùng và tháng thật (rét, nồm, mưa rào)`.

### Task 3: Bệnh có ủ bệnh, thú y kê liệu trình, cho uống thuốc

**Files:**
- Create: `src/core/illness.js`
- Modify: `src/data/diseases.js`, `src/core/simulation.js` (bỏ `getSick`, gọi `illness.js`), `src/core/actions.js` (`vet`, thêm `medicine`, `observe`, `describeSigns`, `fresh` ngộ độc), `src/core/dayCycle.js` (chấm điểm, `startDay`, `songGain`), `src/core/goals.js`, `src/core/householdEvents.js`, `src/core/state.js` (`migrateState`)
- Test: `tests/game.test.js`

**Interfaces:**
- Produces (`src/core/illness.js`):
  - `EARLY_MIN = 180`.
  - `catchIllness(S, ctx, key, phase = 'som')`: đặt `S.sick = { type, since: S.t, phase, left: phase === 'som' ? EARLY_MIN : 0, dosesLeft: 0, dosedToday: false, relapsed: false }`, `sickCount++`, `risk[key] = 0`. `phase === 'ro'` thì máu −5 và nhật ký như `getSick` cũ.
  - `stepIllness(S, ctx)`: gọi mỗi phút từ `stepMinute`. `'som'`: `left−−`, máu −0,3×`dmg`; `left` về 0 → chuyển `'ro'`, máu −5, nhật ký `bad` như cũ. `'ro'`: máu −`dmg`, tâm trạng −0,03, sung −0,03 (như cũ). `'tri'`: máu +0,01 nếu `hunger > 40 && water.level > 0`.
  - `sickPhase(S) -> null | 'som' | 'ro' | 'tri'`.
  - `prescribe(S, ctx) -> số phút`: thú y. `'tri'` → nhật ký "cứ cho uống tiếp đủ N ngày", tâm trạng −6, trả 60. `'som'` → liệu trình 3; `'ro'` → `DISEASES[type].course` (+2 nếu `relapsed`). Đặt `phase 'tri'`, `dosesLeft = liệu trình − 1`, `dosedToday = true`, máu +8, tâm trạng −4, trả 120. `dosesLeft` bằng 0 ngay (liệu trình 1) thì khỏi luôn.
  - `giveDose(S, ctx) -> 3`: tâm trạng −2, `dosesLeft−−`, `dosedToday = true`; về 0 → `S.sick = null`, nhật ký `good`.
  - `nightIllness(S, ctx, add)`: gọi trong `endDay`. `'tri'` chưa uống hôm nay → `add(false, 'Bỏ liều thuốc', …)`, `phase 'ro'`, `relapsed = true`, `dosesLeft = 0`. `'tri'` đã uống → `add(true, 'Cho uống thuốc đúng liều', …)`. `'tri'` và `T.talks > 2` → `add(false, 'Chim ốm cần nghỉ', …)`, máu −3. `'ro'` → mục "Chim bệnh chưa được chữa" cũ. `'som'` → không chấm.
- `DISEASES[k]` thêm `early` (chuỗi) và `course` (số): `tieu_chay` 5, `cam_lanh` 5, `ran_mat` 4, `say_nang` 3, `nga_nuoc` 4, `khi_doc` 5, `ngo_doc` 2. Chữ `early` theo ví dụ trong spec mục 6, mỗi bệnh một câu riêng.
- `ACTIONS.medicine = { blocked(S) -> 'Chim không cần uống thuốc lúc này.' khi không phải 'tri' hoặc đã uống hôm nay, run -> giveDose }`.
- `migrateState`: `S.sick` có mà thiếu `phase` → bù `{ phase: 'ro', left: 0, dosesLeft: 0, dosedToday: false, relapsed: false }`.
- Ngữ nghĩa các chỗ đang đọc `S.sick`: hót, giọng mồi, trò chuyện, đói chậm lại: mọi phase (chim không khỏe). `songGain −3`: `'ro'` và `'tri'`. Hình 3D, thẻ HUD: Task 6.

- [ ] **Step 1: Viết test hỏng:**

```js
describe('Lồng Tre - bệnh và liệu trình', () => {
  it('nguy cơ vượt ngưỡng: ủ bệnh trước, 180 phút sau mới phát rõ', () => {
    // g.S.risk.tieu_chay = 100; g.advance(1) → sickPhase 'som', sickCount 1, nhật ký chưa có 'Tiêu chảy'
    // g.advance(180) → 'ro', nhật ký có 'Tiêu chảy'
  });
  it('ủ bệnh qua đêm vẫn đếm tiếp sáng hôm sau', () => { /* catch lúc 17:30, ngủ, nextDay, advance tới khi 'ro'; tổng phút ≈ 180 */ });
  it('thú y lúc ủ bệnh: 3 liều; cho uống đủ thì khỏi', () => {
    // 'som' → act('vet') → phase 'tri', dosesLeft 2; hai ngày sau mỗi sáng act('medicine') → S.sick === null
  });
  it('bỏ một liều thì tái bệnh, đi thú y lại liệu trình dài hơn', () => {
    // 'ro' tieu_chay → vet → dosesLeft 4; qua đêm không uống → phase 'ro', report có 'Bỏ liều thuốc'; vet → dosesLeft 6
  });
  it('đi thú y khi đang điều trị không rút ngắn liệu trình', () => { /* 'tri' dosesLeft 2 → vet → vẫn 2 */ });
  it('không cho uống thuốc khi không cần hoặc đã uống hôm nay', () => { /* g.blocked('medicine') là chuỗi */ });
  it('bản lưu cũ đang ốm mở ra là phát rõ, đi thú y được', () => {
    // old.sick = { type: 'cam_lanh', since: 400 }; g.load(old) → sickPhase 'ro'; act('vet') → 'tri'
  });
  it('chim chết lúc đang điều trị vẫn ra màn chim chết', () => { /* 'tri', health 1, water 0 → advance → pending.type 'over', pending.sick.type có */ });
});
```

(Viết các comment thành code thật. Test cũ `cho vẹt ăn bơ gây ngộ độc ngay` phải vẫn PASS: `ngo_doc` vào thẳng `'ro'`.)

- [ ] **Step 2: Chạy** `npx vitest run tests/game.test.js -t "bệnh và liệu trình"`. Mong đợi: FAIL.
- [ ] **Step 3: Viết `illness.js`, sửa `diseases.js`, nối vào `simulation.js` (`stepIllness` thay đoạn trừ máu khi ốm; vượt ngưỡng gọi `catchIllness`), `actions.js` (`vet` gọi `prescribe`; `fresh` v = −3 gọi `catchIllness(S, ctx, 'ngo_doc', 'ro')` khi chưa ốm), `dayCycle.js` (`nightIllness` thay mục "Chim bệnh chưa được chữa"; `startDay` đặt `dosedToday = false`), `state.js`.**
- [ ] **Step 4: Hiển thị core:**
  - `describeSigns`: `'som'` → `{ text: DISEASES[type].early }` (không `strong`); `'ro'` như cũ; `'tri'` → `{ strong: 'Đang điều trị', text: 'Còn N ngày thuốc. Giữ ấm, để chim yên.' }`.
  - `observe`: `'som'` → thêm "Có dấu hiệu sớm của <tên bệnh>. Đưa đi thú y lúc này bệnh nhẹ và mau khỏi hơn."
  - `goals.js`: `'tri'` → `add('medicine', 'Cho chim uống thuốc', S.sick.dosedToday, 'Uống đủ liệu trình mỗi sáng; bỏ liều dễ tái bệnh.')`, cùng thứ tự với `nightIllness` trong `endDay`.
  - `householdEvents.js`: chỗ kiểm `S.sick` giữ nguyên (mọi phase đều là chim không khỏe).
- [ ] **Step 5: Chạy** `npm test`. Mong đợi: PASS. `playGoodDay` trong test có `if (S.sick) g.act('vet')`: thêm `if (!g.blocked('medicine')) g.act('medicine')` ngay sau đó để người chơi mẫu vẫn chăm đúng.
- [ ] **Step 6: Commit** `feat: bệnh có ủ bệnh, thú y kê liệu trình, cho uống thuốc`.

### Task 4: Tính cách chim

**Files:**
- Create: `src/data/traits.js`
- Modify: `src/core/Game.js` (`newGame`), `src/core/simulation.js`, `src/core/actions.js` (`talk`, `fresh`, `look`, `observe`), `src/core/householdEvents.js` (tâm trạng mất do làm phiền nếu có hệ số chung), `src/core/dayCycle.js` (không bắt buộc)
- Test: `tests/game.test.js`

**Interfaces:**
- Consumes: `S.traits`, `S.known`, `S.lookDays`, `Game.seed` (Task 1).
- Produces (`src/data/traits.js`):
  - `TRAITS = { temper: { nhat, binh, dan }, appetite: { ken, binh, ham }, fire: { cham, binh, nhanh } }`, mỗi giá trị `{ name, tip, k: {...} }`. Hệ số theo bảng mục 8 spec: `temper` → `trustK` 0,6 / 1 / 1,4, `scareK` 1,5 / 1 / 0,6, `newK` (nguy cơ ngã nước) 1,4 / 1 / 0,6; `appetite` → `metabK` 0,9 / 1 / 1,15, `likeK` 0,5 / 1 / 1,3; `fire` → `vigorK` 0,7 / 1 / 1,6, `overAt` 90 / 90 / 85.
  - `rollTraits(rng, sp) -> { temper, appetite, fire, fav }`: mỗi trục 25% thấp, 50% `binh`, 25% cao; loài `sp.skill !== 'song'` thì `fire = 'binh'`; `fav` = một khóa ngẫu nhiên trong `sp.food` có `v === 1`, không có thì `null`.
  - `traitK(S, key) -> number`: nhân hệ số `key` của ba trục (thiếu thì 1).
  - `revealTrait(S, ctx, axis)`: đặt `known[axis] = true`, ghi `ctx.log('tip', …)` dùng `name`, `tip`. Trục `binh` có câu riêng ("không nhát cũng không dạn", …).
- `newGame`: không có `opts.traits` → `rollTraits(createRng(this.seed + 1), sp)` (RNG riêng để không xô dòng ngẫu nhiên chính); `known` = tất cả `false`, riêng `fire` `true` khi loài không hót, `fav` `true` khi `fav` là `null`. Có `opts.traits` → dùng nguyên, `known` tất cả `false` (trừ hai trường hợp trên).

- [ ] **Step 1: Viết test hỏng:**

```js
const NORMAL = { temper: 'binh', appetite: 'binh', fire: 'binh', fav: null };
describe('Lồng Tre - tính cách chim', () => {
  it('chim nhát tăng thân thiết chậm hơn chim dạn', () => {
    // hai ván chaomao truong, traits temper 'nhat' và 'dan'; bỏ qua 3 ngày chim mới về bằng S.newDays = 0;
    // act('talk') ×3 → trust(nhat) < trust(dan)
  });
  it('nhận ra tính nết ở lần quan sát đầu tiên sau thời chim mới về', () => {
    // S.newDays = 1 → act('look') → known.temper false; S.newDays = 0 → act('look') → true, nhật ký 'tip' có tên tính
  });
  it('món khoái lộ ra khi cho ăn và được tính như món rất thích', () => {
    // traits fav 'tao' (chaomao: tao v = 1) → act('fresh', { food: 'tao' }) → known.fav true, mood tăng 6 (như v = 2)
  });
  it('loài nói không có trục lửa', () => {
    const g = new Game({ seed: 9, storage: null }); g.newGame('sao', 'S');
    expect(g.S.traits.fire).toBe('binh'); expect(g.S.known.fire).toBe(true);
  });
  it('tung tính cách không đổi dòng ngẫu nhiên chính', () => {
    // hai Game cùng seed, một có opts.traits NORMAL, một tung ngẫu nhiên → g.S.schedule giống nhau
  });
});
```

- [ ] **Step 2: Chạy** `npx vitest run tests/game.test.js -t "tính cách"`. Mong đợi: FAIL.
- [ ] **Step 3: Viết `traits.js`, nối vào `newGame`.**
- [ ] **Step 4: Áp hệ số:** `simulation.js` đói × `traitK(S,'metabK')`, sung tăng × `traitK(S,'vigorK')`, ngưỡng quá lửa `TRAITS.fire[S.traits.fire].k.overAt`, nguy cơ `nga_nuoc` × `traitK(S,'newK')`; `talk` thân thiết × `trustK`, tâm trạng mất (chim mới về) × `scareK`; `fresh` `v === 1` tâm trạng × `likeK`, món `fav` coi như `v = 2` và gọi `revealTrait(…, 'fav')` lần đầu. `look`: thêm `S.day` vào `lookDays` nếu chưa có; `temper` lộ khi `S.newDays === 0`; `appetite` lộ khi `lookDays.length >= 2`; `fire` lộ khi `S.day >= 5`. `observe` thêm một câu cho mỗi trục đã biết.
- [ ] **Step 5: Chạy** `npm test`. Mong đợi: PASS. `runCampaign` trong test truyền `{ traits: NORMAL }` để test cân bằng không phụ thuộc tính cách.
- [ ] **Step 6: Commit** `feat: tính cách chim ẩn, nhận ra dần qua quan sát`.

### Task 5: Dấu hiệu phụ cho chế độ đọc chim

**Files:**
- Modify: `src/core/actions.js` (`describeSigns`)
- Test: `tests/game.test.js`

**Interfaces:**
- Produces: `describeSigns(S, sp) -> { strong?, text, more: string[] }`, `more` tối đa 2 câu, không trùng ý với dòng chính, ưu tiên theo thứ tự: nước đục (`water.clean < 40`), nước gần cạn (`water.level < 20`), khay phân đầy (`cage < 40`), máng sắp hết (`feeder.amt < 15` hoặc trống), đồ tươi đã ôi, lông xơ (`feather < 50`), loài hót ít hót (`T.sang === 0` sau 10 giờ, không ốm, không thay lông, hết chim mới về). Mọi nhánh trả về đều có `more` (mảng, có thể rỗng).

- [ ] **Step 1: Viết test hỏng:** `S.water.clean = 30; S.cage = 30; S.feather = 40;` → `more.length === 2`, `more[0]` chứa "đục", `more[1]` chứa "Khay"; trạng thái sạch sẽ → `more` rỗng.
- [ ] **Step 2: Chạy**, mong đợi FAIL.
- [ ] **Step 3: Sửa `describeSigns`.**
- [ ] **Step 4: Chạy** `npm test`, mong đợi PASS.
- [ ] **Step 5: Commit** `feat: dấu hiệu phụ khi quan sát chim`.

### Task 6: Giao diện: màn đón chim, chế độ Lâu năm, thuốc, tính cách, thời tiết

**Files:**
- Modify: `src/ui/Modals.js` (`start`), `src/main.js` (`onNew`), `src/ui/Hud.js`, `src/ui/icons.js`, `src/ui/styles.css`, `index.html` (nếu cần chỗ cho dấu hiệu phụ hoặc nút đổi chế độ), `src/render/Sky.js`, `src/render/World.js`
- Test: `tests/ui.test.js`

**Interfaces:**
- Consumes: mọi trạng thái từ Task 1–5, `sickPhase`, `weatherName`, `TRAITS`, `describeSigns().more`.
- Produces:
  - `Modals.start`: sau bước tuổi, hai bước chọn: vùng (Bắc, Trung, Nam; mặc định Trung) và chế độ (Người mới, mặc định; Người chơi lâu năm, mô tả: "Không có thanh chỉ số, không nhắc việc. Bạn tự đọc dấu hiệu của chim như người nuôi thật."). `onNew(sp, name, stage, { region, mode })`; `main.js` chuyển tiếp vào `game.newGame`.
  - `Hud.setMode(mode)`: đặt `S.mode`, `document.body.classList.toggle('lau', mode === 'lau')`, render lại. Gọi mỗi lần render khi lớp chưa khớp `S.mode`.
  - CSS `body.lau`: ẩn `#stats`, `#statsMore`, `#needs`, `#floats`, khung "Việc hôm nay" trong ngày, thẻ hướng dẫn `coach`. `coachStep`, `renderNeeds`, `floatDeltas` cũng thoát sớm khi `S.mode === 'lau'`.
  - `#cups` máng ăn ở chế độ Lâu năm: chữ theo `amt` (`> 70` "đầy", `> 35` "vơi nửa", `> 0` "sắp hết", 0 "trống").
  - Dòng `#signs`: chế độ Lâu năm vẽ thêm `more` (người xây chọn cách hiện, đọc được ở 375 px).
  - Nút đổi chế độ đặt trong khu cài đặt sẵn có của HUD (người xây chọn chỗ).
  - Hành động `medicine`: `LABELS.medicine = 'Cho uống thuốc'`, nhóm `Khác` cạnh `vet`, phím chưa dùng (ví dụ `T`), `ACTION_ICON.medicine = 'drop'`. Bong bóng `NEEDS`: `'som'` → `look` "Chim có vẻ khác thường", `'ro'` → `vet`, `'tri'` chưa uống → `medicine`.
  - Thẻ chim `#tags`: `'som'` không hiện thẻ bệnh; `'ro'` như cũ; `'tri'` "Đang điều trị". Tính đã biết (khác `binh`, và món khoái) thành thẻ nhỏ.
  - `WEATHER_ICON`: `ret: 'wind'`, `nom: 'humid'`, `rao: 'rain'`. `#wxName` dùng `weatherName(S)`.
  - `Sky.update`: mây `ret` 0,6, `nom` 0,8 (giữ `rain` 0,92, `hot` 0,28, còn lại 0,46).
  - `World`: `f.sick` đúng cho `'ro'`; `'som'`, `'tri'` chỉ bật `f.fluff`, không bật lim dim.

- [ ] **Step 1: Viết test hỏng** trong `tests/ui.test.js`: ván `{ mode: 'lau' }` → sau `hud.render()`, `document.body.classList.contains('lau')`, `getComputedStyle` không cần; kiểm `#needs` rỗng và `#signs` chứa câu `more` khi `S.water.clean = 30`. Gọi `hud.setMode('moi')` → lớp `lau` mất, `#stats` có con. Ván ốm `'tri'` chế độ Người mới → `#actions [data-act="medicine"]` tồn tại, `#needs [data-act="medicine"]` tồn tại.
- [ ] **Step 2: Chạy** `npx vitest run tests/ui.test.js`, mong đợi FAIL.
- [ ] **Step 3: Sửa các file giao diện theo Interfaces.**
- [ ] **Step 4: Chạy** `npm test`, mong đợi PASS.
- [ ] **Step 5: Kiểm trên trình duyệt:** `preview_start` cấu hình trong `.claude/launch.json`. Đón chim mới: thấy bước vùng và chế độ; chế độ Lâu năm không thấy thanh số, bong bóng; đổi về Người mới thấy lại. Ở console ép `game.S.weather = 'ret'` (nếu `game` lộ ra `window`; không thì bỏ) để xem biểu tượng. Màn rộng và 375 px. Không lỗi console.
- [ ] **Step 6: Commit** `feat: giao diện chế độ lâu năm, thuốc, tính cách, thời tiết mới`.

### Task 7: Tài liệu thiết kế game

**Files:**
- Modify: `docs/GAME_DESIGN.md`

- [ ] **Step 1:** Thêm mục "Chế độ chơi", "Diễn tiến bệnh và liệu trình", "Thời tiết theo vùng, tháng", "Tính cách chim" theo spec; sửa dòng "Bệnh trừ máu theo phút và chỉ khỏi khi đưa đi thú y" trong mục "Mô hình bệnh".
- [ ] **Step 2:** `npm test` lần cuối, mong đợi PASS; `npm run build` mong đợi build xong không lỗi.
- [ ] **Step 3: Commit** `docs: cập nhật thiết kế game cho bản thực tế hơn`.
