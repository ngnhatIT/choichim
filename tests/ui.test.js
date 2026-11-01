// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Game } from '../src/core/Game.js';
import { Hud } from '../src/ui/Hud.js';

// Test khói cho giao diện: dựng khung HTML thật, World/Modals/SoundEngine giả, chạy Hud qua vài ngày.
// Bắt các lỗi chỉ lộ ra trên trình duyệt (dùng biến trước khi khai báo, chọn sai phần tử...).
const body = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8').match(/<body>([\s\S]*)<script/)[1];
const world = { view: 'close', setView(v) { this.view = v; }, headScreen: () => ({ x: 400, y: 200, visible: true }), pickScreen: () => ({ x: 380, y: 300, visible: true }) };
const modals = { isOpen: () => false, handbook() {}, fullLog() {}, staplePicker() {}, freshPicker() {}, cleanPicker() {}, movePicker() {}, thumbs: {} };
const audio = { muted: false, volume: 0.8, relaxNote: '', relaxClock: 420, setMuted(m) { this.muted = m; }, setVolume(v) { this.volume = v; }, unlock() {}, setRelax(on) { this.relaxOn = on; } };

describe('Giao diện - test khói', () => {
  beforeEach(() => { document.body.innerHTML = body; });

  it('vẽ được qua nhiều ngày, mọi tuổi chim, nghe chim, ngắm chim, bấm việc hôm nay', () => {
    for (const stage of ['chuyen', 'truong', 'gia']) {
      document.body.innerHTML = body;
      const g = new Game({ seed: 3, storage: null });
      const hud = new Hud(g, world, modals, audio);
      g.bus.on('change', () => hud.render());
      g.newGame('chaomao', 'T', stage);
      for (let d = 0; d < 3; d++) {
        hud.render();
        expect(document.querySelector('#goalList').children.length).toBeGreaterThan(3);
        expect(document.querySelector('#nextGoal').textContent).toMatch(/Việc tiếp theo|Đã xong/);
        document.querySelector('#goalList [data-goal]').click();
        document.querySelector('#nextGoal').click();
        g.act('staple', { food: 'cm' }); g.act('fresh', { food: 'trung' }); g.act('fresh', { food: 'trung' }); // chăm tối thiểu để chim sống qua mấy ngày
        hud.trigger('water');
        while (g.pending?.type === 'event') g.chooseEvent(0); // thao tác tốn thời gian có thể gặp sự kiện
        hud.setRelax(true); expect(document.body.classList.contains('relax')).toBe(true);
        hud.pillText();
        hud.setRelax(false); expect(document.body.classList.contains('relax')).toBe(false);
        hud.toggleFocus(true); hud.toggleFocus(false);
        while (g.S.t < 18 * 60 && g.running) { g.advance(18 * 60 - g.S.t); while (g.pending?.type === 'event') g.chooseEvent(0); }
        if (g.running) g.act('sleep');
        if (g.pending?.type === 'report') g.nextDay();
      }
      expect(g.S.day).toBe(4);
    }
  });
});
