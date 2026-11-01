import { SPECIES } from '../data/species.js';
import { FORCE_SLEEP, TOTAL_DAYS } from '../config.js';
import { EventBus } from './EventBus.js';
import { moltDays } from '../data/stages.js';
import { createRng } from './rng.js';
import { createState, migrateState } from './state.js';
import { ACHIEVEMENTS, earnedAchievements, readAchievements, saveAchievements } from './achievements.js';
import { stepMinute } from './simulation.js';
import { ACTIONS } from './actions.js';
import { dueEvent, scheduleDay } from './householdEvents.js';
import { endDay, finalSummary, startDay } from './dayCycle.js';

/**
 * Điều phối toàn bộ logic. Không phụ thuộc DOM hay Three.js nên test được trên Node.
 *
 * Sự kiện phát ra qua `bus`:
 *  change  — trạng thái thay đổi (UI và 3D cập nhật)
 *  act     — người chơi vừa làm xong một hành động { id, payload } (âm thanh, hoạt ảnh phản hồi)
 *  log     — có dòng nhật ký mới
 *  event   — sự kiện trong nhà cần người chơi chọn
 *  report  — tổng kết cuối ngày
 *  final   — hết 14 ngày
 *  over    — chim chết
 *  achievement — [{ id, name, desc, em }] các thành tựu vừa mở
 *
 * `storage`: nơi lưu thành tựu (mặc định localStorage; null = chỉ giữ trong bộ nhớ, dùng cho test).
 */
export class Game {
  constructor({ seed = Date.now(), bus = new EventBus(), storage } = {}) {
    this.bus = bus;
    this.rng = createRng(seed);
    this.storage = storage;
    this.ach = readAchievements(storage);
    this.S = null;
    this.pending = null; // { type: 'event' | 'report' | 'final' | 'over', ... }
  }

  get sp() { return SPECIES[this.S.sp]; }

  get ctx() {
    return { sp: this.sp, rng: this.rng, log: (type, text) => this.log(type, text) };
  }

  log(type, text) {
    const S = this.S;
    const entry = { d: S.day, t: S.t, type, text };
    S.log.unshift(entry);
    if (S.log.length > 120) S.log.pop();
    this.bus.emit('log', entry);
  }

  newGame(sp, name, stage = 'truong') {
    this.S = createState({ sp, name, stage });
    this.pending = null;
    scheduleDay(this.S, this.rng);
    this.log('info', `${name} vừa về nhà. Lồng đang trùm áo để chim bớt sợ. Việc đầu tiên: cho thức ăn chính vào máng và thay nước sạch.`);
    this.log('tip', 'Chim mới về cần yên tĩnh khoảng 3 ngày: giữ áo lồng, hạn chế trò chuyện, chưa nên tắm ngay ngày đầu.');
    this.bus.emit('change');
  }

  load(S) {
    this.S = migrateState(S);
    this.pending = null;
    this.bus.emit('change');
    // Lưu lúc đang xem tổng kết ngày: mở lại tổng kết thay vì chơi lại buổi tối
    if (S.awaitingNext) {
      this.pending = { type: 'report', report: S.awaitingNext };
      this.bus.emit('report', S.awaitingNext);
    }
  }

  get running() { return !!this.S && !this.S.over && !this.pending; }

  /** Tiến `mins` phút. Dừng sớm khi có sự kiện, hết ngày hoặc chim chết. */
  advance(mins) {
    const S = this.S;
    for (let i = 0; i < mins; i++) {
      if (!this.running) break;
      stepMinute(S, this.ctx);
      if (S.health <= 0) { this.gameOver(); break; }
      const ev = dueEvent(S);
      if (ev) { this.pending = { type: 'event', event: ev }; this.bus.emit('event', ev); break; }
      if (S.t >= FORCE_SLEEP) { this.finishDay(true); break; }
    }
    this.unlock(earnedAchievements(S, this.sp));
    this.bus.emit('change');
  }

  blocked(id) {
    if (!this.running) return 'Đang chờ.';
    const a = ACTIONS[id];
    return a.blocked ? a.blocked(this.S, this.sp) : null;
  }

  act(id, payload = {}) {
    const why = this.blocked(id);
    if (why) { this.log('warn', why); this.bus.emit('change'); return false; }
    if (id === 'sleep') {
      const S = this.S;
      if (!S.covered) { S.covered = true; S.pos = S.loc; this.log('info', 'Đã mang lồng về chỗ treo và trùm áo cho chim ngủ.'); }
      this.bus.emit('act', { id, payload }); this.finishDay(false); return true;
    }
    const mins = ACTIONS[id].run(this.S, this.ctx, payload) || 0;
    this.bus.emit('act', { id, payload });
    if (this.S.health <= 0) { this.gameOver(); return true; }
    this.advance(mins);
    return true;
  }

  chooseEvent(index) {
    if (this.pending?.type !== 'event') return;
    const ev = this.pending.event;
    this.pending = null;
    const mins = ev.choices[index].apply(this.S, this.ctx) || 0;
    if (this.S.health <= 0) { this.gameOver(); return; }
    this.advance(mins);
  }

  finishDay(forced) {
    const report = endDay(this.S, this.ctx, forced);
    if (this.S.health <= 0) { this.gameOver(); return; }
    this.unlock(earnedAchievements(this.S, this.sp));
    this.pending = { type: 'report', report };
    this.S.awaitingNext = report;
    this.bus.emit('report', report);
    this.bus.emit('change');
  }

  nextDay() {
    if (this.pending?.type !== 'report') return;
    this.S.awaitingNext = null;
    if (this.S.day >= TOTAL_DAYS) {
      this.S.over = true;
      const summary = finalSummary(this.S, this.sp);
      const done = this.ach.done;
      done[this.S.sp] = (done[this.S.sp] || 0) + 1;
      this.unlock(earnedAchievements(this.S, this.sp, { final: { avg: summary.avg, done } }), true);
      this.pending = { type: 'final', summary };
      this.bus.emit('final', summary);
    } else {
      this.pending = null;
      startDay(this.S, this.ctx);
      this.unlock(earnedAchievements(this.S, this.sp, { moltEnded: this.S.day === moltDays(this.S)[1] }));
    }
    this.bus.emit('change');
  }

  /** Mở các thành tựu mới (lưu qua nhiều ván) và báo cho giao diện. */
  unlock(ids, save = false) {
    const fresh = ids.filter((id) => !this.ach.got[id]);
    for (const id of fresh) this.ach.got[id] = { at: Date.now(), sp: this.S.sp };
    if (fresh.length || save) saveAchievements(this.ach, this.storage);
    if (fresh.length) this.bus.emit('achievement', fresh.map((id) => ({ id, ...ACHIEVEMENTS[id] })));
  }

  gameOver() {
    this.S.over = true;
    this.pending = { type: 'over', sick: this.S.sick };
    this.bus.emit('over', this.pending);
    this.bus.emit('change');
  }
}
