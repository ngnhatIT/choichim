import { describe, it, expect } from 'vitest';
import { Game } from '../src/core/Game.js';
import { dailyGoals } from '../src/core/goals.js';
import { describeSigns } from '../src/core/actions.js';
import { SPECIES } from '../src/data/species.js';
import { ACHIEVEMENTS, loadAchievements, readAchievements } from '../src/core/achievements.js';
import { songLevel } from '../src/data/song.js';
import { WEATHER, WEATHER_TABLE, rollWeather, monthOf } from '../src/data/weather.js';
import { createRng } from '../src/core/rng.js';
import { sickPhase } from '../src/core/illness.js';

/** Người chơi mẫu: chăm đúng cách, chọn phương án tốt cho mọi sự kiện. */
function playGoodDay(g, opts) {
  const S = g.S;
  const resolve = () => { while (g.pending?.type === 'event') g.chooseEvent(0); };
  if (S.day > 1 && S.covered) g.act('cover'); resolve();
  if (S.feeder.type !== opts.staple) g.act('staple', { food: opts.staple }); else g.act('staple', { food: opts.staple });
  resolve();
  g.act('water'); resolve();
  if (S.day > 3) { g.act('talk'); resolve(); g.act('talk'); resolve(); }
  if (opts.tutor && S.day > 3) for (let i = 0; i < opts.tutor; i++) { if (!g.blocked('tutor')) g.act('tutor'); resolve(); }
  if (S.t < 7 * 60 + 30) { g.advance(7 * 60 + 30 - S.t); resolve(); }
  if (!g.blocked('sun')) { g.act('sun'); resolve(); g.advance(25); resolve(); if (S.pos === 'san') g.act('sun'); resolve(); }
  g.act('fresh', { food: opts.fresh }); resolve();
  if (opts.protein) { g.act('fresh', { food: opts.protein }); resolve(); }
  if (opts.mineral && S.day % 5 === 1) { g.act('fresh', { food: opts.mineral }); resolve(); }
  if (S.day > 1 && S.day % 2 === 0 && !g.blocked('bath')) { g.act('bath'); resolve(); }
  g.advance(150); resolve();
  g.act('clean', { method: 'wet' }); resolve();
  if (S.sick) { g.act('vet'); resolve(); }
  if (!g.blocked('medicine')) { g.act('medicine'); resolve(); }
  while (S.t < 18 * 60 && g.running) { g.advance(18 * 60 - S.t); resolve(); }
  if (g.running) { if (!S.covered) g.act('cover'); resolve(); }
  if (g.running) g.act('sleep');
}

function runCampaign(sp, opts, seed = 42, storage) {
  const g = new Game({ seed, storage });
  g.newGame(sp, 'Test', 'truong', { traits: { temper: 'binh', appetite: 'binh', fire: 'binh', fav: null } }); // cân bằng không phụ thuộc tính cách
  for (let i = 0; i < 14 && !g.S.over; i++) {
    playGoodDay(g, opts);
    if (g.pending?.type === 'report') g.nextDay();
  }
  return g;
}

describe('Lồng Tre - mô phỏng', () => {
  it('chăm đúng cách yến phụng 14 ngày: chim sống khỏe, điểm cao', () => {
    const g = runCampaign('yenphung', { staple: 'vien', fresh: 'rau', mineral: 'xuongmuc' });
    expect(g.pending?.type).toBe('final');
    expect(g.S.health).toBeGreaterThan(70);
    expect(g.pending.summary.avg).toBeGreaterThan(80);
  });

  it('chăm đúng cách chào mào: chim cất tiếng hót', () => {
    const g = runCampaign('chaomao', { staple: 'cm', fresh: 'ot', protein: 'caocao' }, 7);
    expect(g.S.over).toBe(true);
    expect(g.S.health).toBeGreaterThan(60);
    expect(g.S.sangEver).toBe(true);
  });

  it('bỏ bê: chim chết vì khát', () => {
    const g = new Game({ seed: 1 });
    g.newGame('yenphung', 'Bỏ');
    g.act('staple', { food: 'vien' });
    for (let i = 0; i < 4 && !g.S.over; i++) {
      while (g.running) g.advance(60);
      if (g.pending?.type === 'event') g.chooseEvent(1);
      if (g.pending?.type === 'report') g.nextDay();
    }
    expect(g.S.over).toBe(true);
    expect(g.pending.type).toBe('over');
  });

  it('cho vẹt ăn bơ gây ngộ độc ngay', () => {
    const g = new Game({ seed: 3 });
    g.newGame('yenphung', 'X');
    g.act('fresh', { food: 'bo' });
    expect(g.S.sick?.type).toBe('ngo_doc');
  });

  it('đổi thức ăn đột ngột làm loài nhạy cảm bỏ ăn, trộn dần thì không', () => {
    const a = new Game({ seed: 5 }); a.newGame('hoami', 'A');
    a.act('staple', { food: 'tonghop' }); const before = a.S.mood;
    a.act('staple', { food: 'sau', mode: 'swap' });
    expect(a.S.mood).toBeLessThan(before - 8);

    const b = new Game({ seed: 5 }); b.newGame('hoami', 'B');
    b.act('staple', { food: 'tonghop' }); const m = b.S.mood;
    b.act('staple', { food: 'sau', mode: 'mix' });
    expect(b.S.feeder.mixFrom).toBe('tonghop');
    expect(b.S.mood).toBeGreaterThan(m - 2);
  });

  it('không cho ngủ trước 18 giờ', () => {
    const g = new Game({ seed: 9 }); g.newGame('sao', 'S');
    expect(g.blocked('sleep')).toBeTruthy();
  });

  it('treo lồng gần bếp và để chảo bốc khói thì chim bị ngộ độc khí', () => {
    const g = new Game({ seed: 11 }); g.newGame('chaomao', 'K');
    g.act('move', { loc: 'bep' });
    g.S.schedule = { chao: g.S.t + 2 };
    g.advance(5);
    expect(g.pending?.type).toBe('event');
    g.chooseEvent(1);
    g.advance(1);
    expect(g.S.sick?.type).toBe('khi_doc');
  });

  it('quét khô làm tăng rủi ro cho người nuôi', () => {
    const g = new Game({ seed: 2 }); g.newGame('sao', 'S');
    g.act('clean', { method: 'dry' });
    expect(g.S.ownerRisk).toBe(1);
  });
});

const CHAOMAO = { staple: 'cm', fresh: 'ot', protein: 'caocao' };

/** Bộ nhớ giả thay localStorage. */
function fakeStorage() {
  const mem = {};
  return { mem, getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
}

/** Bắt đầu ngày mới đã qua thời gian chim mới về, lồng mở, không có sự kiện ngẫu nhiên. */
function freshDay(sp, seed = 1, setup = {}) {
  const g = new Game({ seed });
  g.newGame(sp, 'T');
  Object.assign(g.S, { newDays: 0, covered: false, schedule: {}, trust: 50, mood: 60, vigor: 60 }, setup);
  return g;
}

describe('Lồng Tre - giọng hót, giọng mồi', () => {
  it('chăm tốt lên "Hót đổ dài", thêm giọng mồi mỗi ngày lên "Giọng vàng", chăm qua loa thì không lên', () => {
    const good = runCampaign('chaomao', CHAOMAO);
    const best = runCampaign('chaomao', { ...CHAOMAO, tutor: 2 });
    expect(songLevel(good.S.song)).toBeGreaterThanOrEqual(3);
    expect(best.S.song).toBeGreaterThanOrEqual(90);
    expect(best.S.song).toBeGreaterThan(good.S.song);
    expect(good.pending.summary.song.name).toBe('Hót đổ dài');

    // Qua loa: chỉ cám, nước, dọn lồng; không đồ tươi, mồi, nắng, trò chuyện
    const g = new Game({ seed: 42 });
    g.newGame('chaomao', 'Q');
    for (let d = 0; d < 14 && !g.S.over; d++) {
      const resolve = () => { while (g.pending?.type === 'event') g.chooseEvent(0); };
      if (g.S.covered) g.act('cover'); resolve();
      g.act('staple', { food: 'cm' }); resolve();
      g.act('water'); resolve();
      g.act('clean', { method: 'wet' }); resolve();
      if (g.S.sick) { g.act('vet'); resolve(); }
      while (g.S.t < 18 * 60 && g.running) { g.advance(18 * 60 - g.S.t); resolve(); }
      if (g.running) { if (!g.S.covered) g.act('cover'); resolve(); }
      if (g.running) g.act('sleep');
      if (g.pending?.type === 'report') g.nextDay();
    }
    expect(g.S.song).toBeLessThan(20);
  });

  it('giọng mồi: chặn đúng lúc, 2 lần đầu có ích, quá 2 lần làm chim mệt', () => {
    expect(freshDay('yenphung').blocked('tutor')).toMatch(/học nói/);
    expect(freshDay('chaomao', 1, { covered: true }).blocked('tutor')).toBeTruthy();
    expect(freshDay('chaomao', 1, { t: 19 * 60 }).blocked('tutor')).toBeTruthy();
    expect(freshDay('chaomao', 1, { sick: { type: 'cam_lanh', since: 400 } }).blocked('tutor')).toBeTruthy();

    const g = freshDay('chaomao');
    const v0 = g.S.vigor;
    expect(g.act('tutor')).toBe(true);
    g.act('tutor');
    expect(g.S.vigor).toBeGreaterThan(v0 + 2);
    expect(g.S.today.tutor).toBe(2);
    const m = g.S.mood;
    g.act('tutor');
    expect(g.S.mood).toBeLessThan(m - 6);
    expect(g.S.log[0].text).toMatch(/quá nhiều/);

    // Chim mới về: bị tính là làm phiền
    const n = freshDay('chaomao', 1, { newDays: 2 });
    n.act('tutor');
    expect(n.S.today.talks).toBe(1);
    expect(n.S.mood).toBeLessThan(60);

    // Thay lông: vẫn cho nghe nhưng nhắc nhở, giọng không tăng
    const t = freshDay('chaomao', 1, { molt: true });
    const song = t.S.song;
    t.act('tutor'); t.act('tutor');
    expect(t.S.log[0].text).toMatch(/thay lông/);
    while (t.running && t.S.t < 18 * 60) t.advance(60);
    t.act('cover'); t.act('sleep');
    expect(t.S.song).toBe(song);
  });
});

describe('Lồng Tre - việc hôm nay', () => {
  it('ngày chăm tốt thì hoàn thành hết; sáng sớm thì còn việc', () => {
    const g = new Game({ seed: 42 });
    g.newGame('chaomao', 'V');
    for (let d = 1; d <= 4; d++) {
      if (d === 4) {
        const morning = dailyGoals(g.S, g.sp);
        expect(morning.find((x) => x.id === 'staple').done).toBe(false);
        expect(morning.find((x) => x.id === 'bond')).toBeTruthy();
      }
      playGoodDay(g, { ...CHAOMAO, tutor: 1 });
      if (d < 4) g.nextDay();
    }
    expect(g.pending?.type).toBe('report');
    const goals = dailyGoals(g.S, g.sp);
    expect(goals.map((x) => x.id)).toEqual(expect.arrayContaining(['staple', 'water', 'fresh', 'protein', 'clean', 'bond', 'sleep']));
    for (const x of goals) {
      expect(x.done, x.id).toBe(true);
      expect(x.label.length).toBeLessThanOrEqual(40);
      expect(x.hint).toBeTruthy();
    }
    expect(g.pending.report.score).toBe(100);
  });

  it('chim mới về: mục tiêu là giữ yên tĩnh', () => {
    const g = new Game({ seed: 1 });
    g.newGame('yenphung', 'Y');
    const quiet = () => dailyGoals(g.S, g.sp).find((x) => x.id === 'quiet');
    expect(quiet().done).toBe(true);
    g.act('talk'); g.act('talk'); g.act('talk');
    expect(quiet().done).toBe(false);
    expect(dailyGoals(g.S, g.sp).find((x) => x.id === 'mineral')).toBeUndefined();
  });
});

describe('Lồng Tre - sự kiện mới', () => {
  // Tạo tình huống cho từng sự kiện, so sánh lựa chọn 0 và 1
  const SETUP = {
    karaoke: { t: 18 * 60 },
    treem: { t: 15 * 60 },
    nom: { t: 9 * 60, weather: 'mua' },
    chuot: { t: 18 * 60 },
    matdien: { t: 13 * 60, weather: 'nong', loc: 'phongkhach', pos: 'phongkhach' },
    nghenoi: { t: 16 * 60, words: ['Xin chào'] },
  };
  const harm = (S) => Object.values(S.risk).reduce((a, b) => a + b, 0) - S.mood - S.trust;

  for (const [id, setup] of Object.entries(SETUP)) {
    it(`${id}: lựa chọn số 0 là lựa chọn tốt`, () => {
      const out = [0, 1].map((choice) => {
        const g = freshDay('yenphung', 5);
        g.act('staple', { food: 'vien' });
        Object.assign(g.S, setup, { schedule: { [id]: setup.t + 1 } });
        g.advance(2);
        expect(g.pending?.event?.id).toBe(id);
        g.chooseEvent(choice);
        return g.S;
      });
      expect(harm(out[0])).toBeLessThan(harm(out[1]));
    });
  }
});

describe('Lồng Tre - hội thi chim hót', () => {
  const contest = (setup, sp = 'chaomao') => {
    const won = [];
    const g = freshDay(sp, 3, { day: 11, t: 7 * 60 + 30, health: 100, feather: 95, ...setup });
    g.bus.on('achievement', (list) => won.push(...list.map((a) => a.id)));
    g.S.schedule = { thi: g.S.t + 1 };
    g.advance(2);
    if (g.pending?.event?.id === 'thi') g.chooseEvent(0);
    return { g, won };
  };

  it('chim sung, giọng vàng đoạt giải nhất và mở thành tựu', () => {
    const { g, won } = contest({ song: 95, vigor: 95 });
    expect(g.S.contest).toEqual({ place: 1, day: 11 });
    expect(won).toContain('champion');
  });

  it('giọng còn non thì không đạt giải; chim ốm chỉ nhận bài học nhẹ', () => {
    expect(contest({ song: 20, vigor: 60 }).g.S.contest).toEqual({ place: 0, day: 11 });
    const { g } = contest({ song: 95, vigor: 95, sick: { type: 'cam_lanh', since: 400 } });
    expect(g.S.contest).toBeNull();
    expect(g.S.health).toBeGreaterThan(90);
    expect(g.S.log.some((e) => /không nên thi/.test(e.text))).toBe(true);
  });

  it('chỉ loài hót mới đi thi, và chỉ sau mùa thay lông', () => {
    expect(contest({ song: 95 }, 'yenphung').g.pending).toBeNull();
    expect(contest({ day: 9, song: 95 }).g.pending).toBeNull();
  });
});

describe('Lồng Tre - thành tựu', () => {
  it('đủ 11 thành tựu, mỗi cái có tên, mô tả, biểu tượng', () => {
    expect(Object.keys(ACHIEVEMENTS).sort()).toEqual(['all_species', 'champion', 'chatterbox', 'first_song', 'first_word',
      'golden_voice', 'hard_species', 'molt_master', 'never_sick', 'perfect_day', 'safe_keeper']);
    for (const a of Object.values(ACHIEVEMENTS)) expect(a.name && a.desc && a.em).toBeTruthy();
  });

  it('không có localStorage cũng không lỗi', () => {
    expect(() => loadAchievements()).not.toThrow();
    expect(loadAchievements()).toEqual({});
    const g = freshDay('chaomao');
    g.S.sangEver = true;
    expect(() => g.advance(1)).not.toThrow();
  });

  it('mở một lần, lưu qua nhiều ván', () => {
    const storage = fakeStorage();
    const seen = [];
    const g = new Game({ seed: 1, storage });
    g.bus.on('achievement', (list) => seen.push(list));
    g.newGame('chaomao', 'A');
    g.S.sangEver = true;
    g.advance(1); g.advance(1);
    expect(seen).toEqual([[{ id: 'first_song', ...ACHIEVEMENTS.first_song }]]);
    expect(readAchievements(storage).got.first_song.sp).toBe('chaomao');

    const again = [];
    const g2 = new Game({ seed: 2, storage });
    g2.bus.on('achievement', (list) => again.push(...list));
    g2.newGame('chaomao', 'B');
    g2.S.sangEver = true;
    g2.advance(1);
    expect(again).toEqual([]);
  });

  it('nuôi trọn ván: thành tựu cuối ván và đủ sáu loài', () => {
    const storage = fakeStorage();
    storage.setItem('longtre-achievements-v1', JSON.stringify({ got: {}, done: { yenphung: 1, sao: 1, chichchoe: 1, khuyen: 1, hoami: 1 } }));
    const g = runCampaign('chaomao', CHAOMAO, 42, storage);
    expect(g.pending?.type).toBe('final');
    const got = readAchievements(storage);
    expect(got.done.chaomao).toBe(1);
    expect(Object.keys(got.got)).toEqual(expect.arrayContaining(['first_song', 'perfect_day', 'never_sick', 'safe_keeper', 'all_species']));
  });
});

describe('Lồng Tre - bản lưu cũ', () => {
  it('bổ sung trường còn thiếu, chơi tiếp bình thường', () => {
    const g1 = new Game({ seed: 4 });
    g1.newGame('hoami', 'Cu');
    g1.act('staple', { food: 'sau' });
    const old = JSON.parse(JSON.stringify(g1.S));
    for (const k of ['song', 'contest', 'sickCount']) delete old[k];
    for (const k of ['tutor', 'sang', 'cafe', 'refill']) delete old.today[k];
    delete old.risk.khi_doc;

    const g = new Game({ seed: 4 });
    g.load(old);
    expect(g.S.song).toBe(12);
    expect(g.S.contest).toBeNull();
    expect(g.S.today.tutor).toBe(0);
    expect(g.S.risk.khi_doc).toBe(0);
    g.S.newDays = 0;
    g.act('cover'); g.act('tutor');
    while (g.S.t < 18 * 60) { g.advance(60); if (g.pending?.type === 'event') g.chooseEvent(0); }
    if (!g.S.covered) g.act('cover');
    g.act('sleep');
    expect(g.pending?.type).toBe('report');
    for (const v of [g.S.song, g.S.mood, g.S.vigor, g.S.today.sang, ...Object.values(g.S.risk)]) expect(Number.isFinite(v)).toBe(true);
    expect(dailyGoals(g.S, g.sp).length).toBeGreaterThan(3);
  });
});

describe('Tuổi chim khi đón về', () => {
  const opts = { staple: 'cm', fresh: 'chuoi', protein: 'caocao', tutor: 2 };
  it('chim chuyền thiếu mồi mềm thì bị nhắc trong việc hôm nay', () => {
    const g = new Game({ seed: 3, storage: null });
    g.newGame('khuyen', 'K', 'chuyen');
    expect(dailyGoals(g.S, g.sp).some((x) => x.id === 'soft' && !x.done)).toBe(true);
    g.act('fresh', { food: 'trung' }); g.act('fresh', { food: 'trung' });
    expect(dailyGoals(g.S, g.sp).find((x) => x.id === 'soft').done).toBe(true);
  });
  it('chim chuyền dạn người hơn, giọng chưa định (không vượt trần), chim lâu năm giữ giọng cao', () => {
    const run = (stage) => {
      const g = new Game({ seed: 7, storage: null });
      g.newGame('chaomao', 'T', stage);
      const start = { trust: g.S.trust, song: g.S.song };
      for (let i = 0; i < 14 && !g.S.over; i++) { playGoodDay(g, opts); if (g.pending?.type === 'report') g.nextDay(); }
      return { start, S: g.S };
    };
    const juv = run('chuyen'), adult = run('truong'), old = run('gia');
    expect(juv.start.trust).toBeGreaterThan(adult.start.trust);
    expect(juv.S.song).toBeLessThanOrEqual(60);
    expect(juv.S.song).toBeGreaterThan(juv.start.song + 20); // vẫn học giọng mồi tốt
    expect(old.start.song).toBeGreaterThan(adult.start.song);
    expect(old.S.song).toBeGreaterThanOrEqual(old.start.song);
    for (const r of [juv, adult, old]) { expect(r.S.day).toBe(14); expect(r.S.health).toBeGreaterThan(50); }
  });

  it('bản lưu cũ không có tuổi thì coi là chim trưởng thành', () => {
    const g = new Game({ seed: 1, storage: null });
    g.newGame('khuyen', 'K');
    const old = JSON.parse(JSON.stringify(g.S)); delete old.stage;
    g.load(old);
    expect(g.S.stage).toBe('truong');
  });
});

describe('Lai giọng ở chim chuyền', () => {
  it('chim tơ nghe karaoke thì lai giọng; chim trưởng thành không bị', async () => {
    const { HOUSEHOLD_EVENTS } = await import('../src/core/householdEvents.js');
    const { observe } = await import('../src/core/actions.js');
    const kara = HOUSEHOLD_EVENTS.find((e) => e.id === 'karaoke');
    for (const [stage, want] of [['chuyen', 22], ['truong', 0]]) {
      const g = new Game({ seed: 2, storage: null });
      g.newGame('chaomao', 'T', stage);
      kara.choices[1].apply(g.S, g.ctx);
      expect(g.S.mix).toBe(want);
      if (want) expect(observe(g.S, g.sp)).toContain('lai giọng');
    }
  });
});

describe('Khớp giữa việc hôm nay và cách chấm (sau chấm độc lập)', () => {
  it('cho ngủ khi chưa trùm áo: game trùm áo giúp, không bị chấm lỗi', () => {
    const g = new Game({ seed: 4, storage: null });
    g.newGame('chaomao', 'T');
    g.act('cover'); // mở áo
    while (g.S.t < 18 * 60 && g.running) { g.advance(18 * 60 - g.S.t); while (g.pending?.type === 'event') g.chooseEvent(0); }
    if (g.S.covered) g.act('cover'); // sự kiện có thể đã trùm áo giúp: mở ra để kiểm tra
    expect(g.S.covered).toBe(false);
    g.act('sleep');
    expect(g.S.covered).toBe(true);
    expect(g.pending.report.items.some((x) => x.label === 'Không trùm áo lồng ban đêm')).toBe(false);
  });
  it('sâu quy không tính là mồi mềm cho chim non', () => {
    const g = new Game({ seed: 4, storage: null });
    g.newGame('chaomao', 'T', 'chuyen');
    g.act('fresh', { food: 'sauquy' }); g.act('fresh', { food: 'sauquy' });
    expect(dailyGoals(g.S, g.sp).find((x) => x.id === 'soft').done).toBe(false);
  });
  it('mồi tươi vài lần mỗi tuần là đủ: bỏ một ngày không bị chấm thiếu', () => {
    const g = new Game({ seed: 4, storage: null });
    g.newGame('chichchoe', 'T');
    g.S.lastProtein = g.S.day; // hôm qua đã cho
    g.S.day += 1;
    expect(dailyGoals(g.S, g.sp).some((x) => x.id === 'protein')).toBe(false);
  });
});

describe('Chim ốm', () => {
  it('không giao việc trò chuyện, tổng kết không phạt vì để chim nghỉ', () => {
    const g = new Game({ seed: 5, storage: null });
    g.newGame('chaomao', 'T');
    g.S.newDays = 0; g.S.sick = { type: 'cam_lanh', since: g.S.t };
    expect(dailyGoals(g.S, g.sp).some((x) => x.id === 'bond')).toBe(false);
  });
});

describe('Thay lông theo tuổi', () => {
  it('chim chuyền thay sớm hơn, chim lâu năm thay lâu hơn', () => {
    const molt = (stage) => {
      const g = new Game({ seed: 9, storage: null });
      g.newGame('khuyen', 'K', stage);
      const days = [];
      for (let i = 0; i < 14 && !g.S.over; i++) { if (g.S.molt) days.push(g.S.day); playGoodDay(g, { staple: 'khuyen', fresh: 'chuoi' }); if (g.pending?.type === 'report') g.nextDay(); }
      return days;
    };
    const juv = molt('chuyen'), adult = molt('truong'), old = molt('gia');
    expect(juv[0]).toBeLessThan(adult[0]);
    expect(old.length).toBeGreaterThan(adult.length);
  });
});

describe('Thời gian thực: đồng hồ game theo giờ máy', () => {
  const at = (d, h, m = 0) => new Date(2026, 10, d, h, m).getTime();
  const make = (start) => {
    let now = start;
    const g = new Game({ seed: 5, storage: null, realtime: true, now: () => now });
    return { g, set: (ms) => { now = ms; } };
  };

  it('ván mới bắt đầu đúng giờ thật, thời gian trôi theo phút thật, không chạy bù nửa ngày đã qua', () => {
    const { g, set } = make(at(2, 15, 0));
    g.newGame('chaomao', 'T');
    expect(g.S.t).toBe(15 * 60);
    set(at(2, 15, 30)); g.sync();
    expect(g.S.t).toBe(15 * 60 + 30);
  });

  it('tắt game qua đêm: tự tổng kết ngày, sáng hôm sau chạy tiếp tới giờ hiện tại', () => {
    const { g, set } = make(at(2, 8, 0));
    g.newGame('chaomao', 'T');
    g.act('staple', { food: 'cm' }); g.act('water');
    set(at(3, 7, 0)); g.sync();
    expect(g.S.day).toBe(2);
    expect(g.S.t).toBe(7 * 60);
    expect(g.pending).toBeNull();
  });

  it('ban đêm phải chờ trời sáng, việc dài (thú y) giữ người chơi bận đúng số phút thật', () => {
    const { g, set } = make(at(2, 23, 0));
    g.newGame('chaomao', 'T');
    expect(g.waiting).toBe(true);
    expect(g.act('water')).toBe(false);
    set(at(3, 6, 10)); g.sync();
    expect(g.waiting).toBe(false);
    expect(g.S.t).toBe(6 * 60 + 10);
    g.act('vet');
    expect(g.S.t).toBe(6 * 60 + 10); // làm xong ngay, đồng hồ không nhảy
    expect(g.blocked('water')).toMatch(/bận/);
    set(at(3, 8, 0)); g.sync();
    expect(g.blocked('water')).toBeNull();
  });
});

describe('Lồng Tre - tùy chọn ván mới', () => {
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
});

/** Tiến thời gian, tự chọn phương án đúng cho sự kiện trong nhà. */
function adv(g, n) {
  const end = g.S.t + n;
  while (g.S.t < end && !g.S.over) {
    while (g.pending?.type === 'event') g.chooseEvent(0);
    if (!g.running) break;
    g.advance(end - g.S.t);
  }
}
function toNight(g) {
  adv(g, Math.max(0, 18 * 60 - g.S.t));
  while (g.pending?.type === 'event') g.chooseEvent(0);
  if (g.running) g.act('sleep');
  return g.pending?.report;
}

describe('Lồng Tre - thời tiết theo vùng, tháng', () => {
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
    expect(monthOf({ startAt: 0 }, 5)).toBe(4);
  });

  it('rét: nắng tốt dời sang 8:00–10:30', () => {
    const sun = (from) => {
      const g = new Game({ seed: 2, storage: null });
      g.newGame('chaomao', 'R'); g.S.schedule = {}; g.S.weather = 'ret'; g.act('cover');
      adv(g, from - g.S.t); g.act('sun'); adv(g, 25);
      return g.S.today.sunGood;
    };
    expect(sun(7 * 60)).toBe(0);
    expect(sun(8 * 60)).toBeGreaterThanOrEqual(20);
  });

  it('nồm, nóng: đồ tươi ôi sau 150 phút; trời mát thì chưa', () => {
    const spoiled = (w) => {
      const g = new Game({ seed: 2, storage: null });
      g.newGame('chaomao', 'R'); g.S.schedule = {}; g.S.weather = w;
      g.act('fresh', { food: 'chuoi' }); adv(g, 146);
      return g.S.fresh.spoiled;
    };
    expect(spoiled('nom')).toBe(true);
    expect(spoiled('nong')).toBe(true);
    expect(spoiled('mat')).toBe(false);
  });

  it('ngày nồm chưa đổ cám mới thì bị phạt, đã đổ thì không', () => {
    const night2 = (refill) => {
      const g = new Game({ seed: 4, storage: null });
      g.newGame('chaomao', 'N'); g.act('staple', { food: 'cm' }); toNight(g); g.nextDay();
      g.S.weather = 'nom'; g.S.schedule = {};
      if (refill) g.act('staple', { food: 'cm' });
      return toNight(g).items.some((i) => i.label === 'Cám để qua ngày nồm');
    };
    expect(night2(false)).toBe(true);
    expect(night2(true)).toBe(false);
  });
});

describe('Lồng Tre - bệnh và liệu trình', () => {
  const mk = () => { const g = new Game({ seed: 6, storage: null }); g.newGame('chaomao', 'B'); g.S.schedule = {}; g.act('staple', { food: 'cm' }); g.act('water'); return g; };
  const catchNow = (g, key = 'tieu_chay') => { g.S.risk[key] = 101; adv(g, 1); };
  const logged = (g, s) => g.S.log.some((e) => e.text.includes(s));

  it('nguy cơ vượt ngưỡng: ủ bệnh trước, 180 phút sau mới phát rõ', () => {
    const g = mk();
    catchNow(g);
    expect(sickPhase(g.S)).toBe('som');
    expect(g.S.sickCount).toBe(1);
    expect(logged(g, 'Tiêu chảy')).toBe(false);
    adv(g, 179);
    expect(sickPhase(g.S)).toBe('som');
    adv(g, 1);
    expect(sickPhase(g.S)).toBe('ro');
    expect(logged(g, 'Tiêu chảy')).toBe(true);
  });

  it('ủ bệnh qua đêm vẫn đếm tiếp sáng hôm sau', () => {
    const g = mk();
    adv(g, 17 * 60 + 30 - g.S.t);
    catchNow(g);
    toNight(g); g.nextDay(); g.S.schedule = {};
    expect(sickPhase(g.S)).toBe('som');
    adv(g, 180 - 30 - 1);
    expect(sickPhase(g.S)).toBe('som');
    adv(g, 2);
    expect(sickPhase(g.S)).toBe('ro');
  });

  it('thú y lúc ủ bệnh: 3 liều; cho uống đủ thì khỏi', () => {
    const g = mk();
    catchNow(g);
    g.act('vet');
    expect(sickPhase(g.S)).toBe('tri');
    expect(g.S.sick.dosesLeft).toBe(2);
    expect(toNight(g).items.some((i) => i.ok && i.label === 'Cho uống thuốc đúng liều')).toBe(true);
    g.nextDay(); g.act('medicine'); expect(g.S.sick.dosesLeft).toBe(1);
    toNight(g); g.nextDay(); g.act('medicine');
    expect(g.S.sick).toBe(null);
  });

  it('bỏ một liều thì tái bệnh, đi thú y lại liệu trình dài hơn', () => {
    const g = mk();
    catchNow(g); adv(g, 180);
    expect(sickPhase(g.S)).toBe('ro');
    g.act('vet');
    expect(g.S.sick.dosesLeft).toBe(4);
    toNight(g); g.nextDay(); g.S.schedule = {};
    expect(toNight(g).items.some((i) => i.ok === false && i.label === 'Bỏ liều thuốc')).toBe(true);
    expect(sickPhase(g.S)).toBe('ro');
    g.nextDay(); g.act('vet');
    expect(g.S.sick.dosesLeft).toBe(6);
  });

  it('đi thú y khi đang điều trị không rút ngắn liệu trình', () => {
    const g = mk();
    catchNow(g); g.act('vet'); g.act('vet');
    expect(sickPhase(g.S)).toBe('tri');
    expect(g.S.sick.dosesLeft).toBe(2);
  });

  it('không cho uống thuốc khi không cần hoặc đã uống hôm nay', () => {
    const g = mk();
    expect(g.blocked('medicine')).toBeTruthy();
    catchNow(g); g.act('vet');
    expect(g.blocked('medicine')).toBeTruthy();
  });

  it('bản lưu cũ đang ốm mở ra là phát rõ, đi thú y được', () => {
    const g = mk();
    const old = JSON.parse(JSON.stringify(g.S));
    old.sick = { type: 'cam_lanh', since: 400 };
    g.load(old);
    expect(sickPhase(g.S)).toBe('ro');
    g.act('vet');
    expect(sickPhase(g.S)).toBe('tri');
  });

  it('chim chết lúc đang điều trị vẫn ra màn chim chết', () => {
    const g = mk();
    catchNow(g); g.act('vet');
    g.S.health = 1; g.S.water.level = 0; g.S.hunger = 0; g.S.feeder.amt = 0;
    adv(g, 120);
    expect(g.pending?.type).toBe('over');
    expect(g.pending.sick.type).toBe('tieu_chay');
  });
});

describe('Lồng Tre - tính cách chim', () => {
  const NORMAL = { temper: 'binh', appetite: 'binh', fire: 'binh', fav: null };
  const mk = (traits, sp = 'chaomao') => { const g = new Game({ seed: 8, storage: null }); g.newGame(sp, 'C', 'truong', { traits }); g.S.schedule = {}; return g; };

  it('chim nhát tăng thân thiết chậm hơn chim dạn', () => {
    const trust = (temper) => { const g = mk({ ...NORMAL, temper }); g.S.newDays = 0; for (let i = 0; i < 3; i++) g.act('talk'); return g.S.trust; };
    expect(trust('nhat')).toBeLessThan(trust('binh'));
    expect(trust('binh')).toBeLessThan(trust('dan'));
  });

  it('nhận ra tính nết ở lần quan sát đầu tiên sau thời chim mới về', () => {
    const g = mk({ ...NORMAL, temper: 'nhat' });
    expect(g.S.known.temper).toBe(false);
    g.act('look');
    expect(g.S.known.temper).toBe(false);
    g.S.newDays = 0; g.act('look');
    expect(g.S.known.temper).toBe(true);
    expect(g.S.log.some((e) => e.type === 'tip' && e.text.includes('nhát'))).toBe(true);
  });

  it('món khoái lộ ra khi cho ăn và được tính như món rất thích', () => {
    const g = mk({ ...NORMAL, fav: 'tao' });
    expect(g.S.known.fav).toBe(false);
    const m0 = g.S.mood;
    g.act('fresh', { food: 'tao' });
    expect(g.S.known.fav).toBe(true);
    expect(g.S.mood - m0).toBeGreaterThan(5);
  });

  it('loài nói không có trục lửa', () => {
    const g = new Game({ seed: 9, storage: null }); g.newGame('sao', 'S');
    expect(g.S.traits.fire).toBe('binh');
    expect(g.S.known.fire).toBe(true);
  });

  it('tung tính cách không đổi dòng ngẫu nhiên chính', () => {
    const a = new Game({ seed: 11, storage: null }); a.newGame('chaomao', 'A', 'truong', { traits: NORMAL });
    const b = new Game({ seed: 11, storage: null }); b.newGame('chaomao', 'A');
    expect(b.S.schedule).toEqual(a.S.schedule);
    expect(b.S.known.temper).toBe(false);
  });
});

describe('Lồng Tre - dấu hiệu phụ', () => {
  it('nước đục, khay đầy hiện thành dấu hiệu phụ; lồng sạch thì không có', () => {
    const g = new Game({ seed: 3, storage: null }); g.newGame('chaomao', 'D'); g.S.schedule = {};
    g.act('staple', { food: 'cm' }); g.act('water');
    expect(describeSigns(g.S, SPECIES.chaomao).more).toEqual([]);
    g.S.water.clean = 30; g.S.cage = 30; g.S.feather = 40;
    const { more } = describeSigns(g.S, SPECIES.chaomao);
    expect(more.length).toBe(2);
    expect(more[0]).toMatch(/đục/);
    expect(more[1]).toMatch(/Khay/);
  });
});
