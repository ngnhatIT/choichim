import { SPECIES } from '../data/species.js';
import { STAPLES, FOODS } from '../data/foods.js';
import { LOCATIONS } from '../data/locations.js';
import { WEATHER } from '../data/weather.js';
import { DISEASES } from '../data/diseases.js';
import { SONG_LEVELS, songLevel, fireBand } from '../data/song.js';
import { stageOf, adultness, isYoung } from '../data/stages.js';
import { TOTAL_DAYS, SLEEP_FROM, DAY_START, FORCE_SLEEP } from '../config.js';
import { ACTIONS, describeSigns } from '../core/actions.js';
import { dailyGoals } from '../core/goals.js';
import { fmtTime, hourOf, isNight } from '../core/util.js';
import { icon, esc, ACTION_ICON, WEATHER_ICON, LOG_ICON, LOG_LABEL } from './icons.js';

const $ = (s) => document.querySelector(s);
// render() chạy mỗi nhịp game: chỉ ghi DOM khi nội dung thật sự đổi
const setHtml = (el, html) => { if (el._h === html) return false; el.innerHTML = html; el._h = html; return true; };
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };

const STATS = [
  ['Ăn no', 'bowl', (S) => S.hunger], ['Nước trong cóng', 'drop', (S) => S.water.level],
  ['Độ sạch nước', 'sparkdrop', (S) => S.water.clean], ['Vệ sinh lồng', 'broom', (S) => S.cage],
  ['Sức khỏe', 'heart', (S) => S.health], ['Tâm trạng', 'smile', (S) => S.mood],
  ['Thân thiết', 'trust', (S) => S.trust], ['Độ sung (lửa)', 'flame', (S) => S.vigor],
  ['Chất lượng lông', 'feather', (S) => S.feather],
];
const GROUPS = [
  ['Ăn uống', ['staple', 'fresh', 'water']], ['Vệ sinh', ['clean', 'bath']], ['Chỗ treo lồng', ['sun', 'cover', 'move']],
  ['Gắn bó', ['talk', 'tutor', 'look']], ['Khác', ['vet', 'wait', 'sleep']],
];
const KEYS = { staple: '1', fresh: '2', water: '3', clean: '4', bath: '5', sun: '6', cover: '7', move: '8', talk: '9', tutor: '0', look: 'Q', vet: 'Y', wait: 'C', sleep: 'N' };
const BY_KEY = Object.fromEntries(Object.entries(KEYS).map(([id, k]) => [k, id]));
const LABELS = {
  staple: 'Thay thức ăn chính', fresh: 'Cho ăn thêm', water: 'Thay nước', clean: 'Dọn lồng', bath: 'Cho tắm', move: 'Đổi chỗ treo',
  tutor: 'Cho nghe giọng mồi', look: 'Quan sát kỹ', vet: 'Đưa đi thú y', wait: 'Chờ 30 phút', sleep: 'Cho chim ngủ',
};
const TREND = 5; // chênh lệch trong khoảng 1 giờ game đủ để hiện mũi tên
const AFK_MS = 120000; // không thao tác 2 phút thì tự chuyển sang nghe chim
// Hướng dẫn ngày đầu: mỗi việc hôm nay → cách làm và chỗ cần chạm (vật trong cảnh 3D hoặc nút việc làm)
const btn = (id) => `#actions [data-act="${id}"]`;
const COACH = {
  staple: ['Chạm vào máng ăn trong lồng, chọn thức ăn chính đúng loài.', 'staple', 'staple'],
  water: ['Chạm vào cóng nước để rửa cóng, thay nước sạch.', 'water', 'water'],
  fresh: ['Bấm “Cho ăn thêm”, chọn trái cây hợp loài.', btn('fresh'), 'fresh'],
  protein: ['Bấm “Cho ăn thêm”, chọn mồi tươi như cào cào, dế hoặc trứng.', btn('fresh'), 'fresh'],
  soft: ['Bấm “Cho ăn thêm”, chọn lòng đỏ trứng hoặc mồi nhỏ. Chim non cần 2 bữa.', btn('fresh'), 'fresh'],
  mineral: ['Bấm “Cho ăn thêm”, chọn xương mực.', btn('fresh'), 'fresh'],
  sun: ['Bấm “Ra sân phơi nắng” trước 9 giờ 30, phơi đủ rồi mang vào.', btn('sun'), 'sun'],
  bath: ['Bấm “Cho tắm” vào buổi sáng hoặc đầu giờ chiều (chim non: sau 12 giờ).', btn('bath'), 'bath'],
  clean: ['Chạm vào khay lồng, chọn lau ẩm và đeo găng.', 'clean', 'clean'],
  bond: ['Bấm “Trò chuyện” để chim dạn người.', btn('talk'), 'talk'],
  sleep: ['Từ 18:00, bấm “Cho chim ngủ”: game sẽ trùm áo lồng giúp bạn nếu chưa trùm.', btn('sleep'), 'sleep'],
};
const PICK_OF = { staple: 'staple', water: 'water', clean: 'clean' }; // hành động → vật trong lồng để hiện chỉ số nổi
// Nhu cầu hiện thành bong bóng trên đầu chim (như Tamagotchi): [hành động, nhãn, độ gấp (càng lớn càng gấp) hoặc 0]
const NEEDS = [
  ['vet', 'Chim đang ốm, nên đưa đi thú y', (S) => (S.sick ? 100 : 0)],
  ['staple', 'Máng sắp hết thức ăn', (S) => (!S.feeder.type || S.feeder.amt < 15 ? 90 - S.hunger * 0.5 : 0)],
  ['water', 'Nước ít hoặc bẩn, cần thay', (S) => (S.water.level < 30 || S.water.clean < 40 ? 85 - Math.min(S.water.level, S.water.clean) * 0.5 : 0)],
  ['clean', 'Lồng bẩn, cần dọn', (S) => (S.cage < 40 ? 70 - S.cage * 0.5 : 0)],
  ['cover', 'Tối rồi, trùm áo cho chim ngủ', (S) => (S.t >= SLEEP_FROM && !S.covered ? 60 : 0)],
  ['fresh', 'Chim non đói, xin mồi mềm', (S) => (isYoung(S) && S.today.protein < 2 && S.hunger < 60 && S.t < SLEEP_FROM ? 78 : 0)],
  ['bath', 'Chim quá lửa, cho tắm để hạ lửa', (S) => (S.vigor > 90 && !S.today.baths ? 55 : 0)],
];

function actLabel(id, S, sp) {
  if (id === 'sun') return S.pos === 'san' ? 'Mang lồng vào' : 'Ra sân phơi nắng';
  if (id === 'cover') return S.covered ? 'Mở áo lồng' : 'Trùm áo lồng';
  if (id === 'talk') return sp.skill === 'talk' ? 'Trò chuyện, dạy nói' : 'Trò chuyện';
  return LABELS[id];
}

export function entryHtml(e) {
  return `<li class="entry ${e.type}">${icon(LOG_ICON[e.type] || 'info')}<time>N${e.d} · ${fmtTime(e.t)}</time><span class="e-tx"><span class="sr-only">${LOG_LABEL[e.type] || ''}: </span>${esc(e.text)}</span></li>`;
}

export class Hud {
  constructor(game, world, modals, audio) {
    this.game = game; this.world = world; this.modals = modals; this.audio = audio;
    this.speed = 1;
    this.samples = [];
    this.logQ = [];
    this.recent = new Map();
    this.narrow = matchMedia('(max-width: 960px)');
    this.toasts = $('#toasts');
    this.pop = $('#sndPop');

    $('#seal').innerHTML = icon('cage');
    const speedIc = ['pause', 'play', 'fast'];
    document.querySelectorAll('[data-speed]').forEach((b) => {
      b.innerHTML = icon(speedIc[b.dataset.speed]);
      b.addEventListener('click', () => this.setSpeed(+b.dataset.speed));
    });
    $('#paused').innerHTML = icon('pause') + 'Đang dừng';
    $('#hbBtn').innerHTML = icon('book') + '<span class="lbl">Sổ tay</span>';
    $('#hbBtn').setAttribute('aria-label', 'Sổ tay');
    $('#clubBtn').innerHTML = icon('chatstar') + '<span class="lbl">Hội chim</span>';
    $('#clubBtn').setAttribute('aria-label', 'Hội chim');
    $('#focusBtn').innerHTML = icon('bird') + '<span class="lbl">Ngắm chim</span>';
    $('#focusBtn').setAttribute('aria-label', 'Ngắm chim, ẩn các bảng');
    $('#focusBtn').addEventListener('click', () => this.toggleFocus());
    $('#focusPill').addEventListener('click', () => this.toggleFocus(false));
    $('#relaxBtn').innerHTML = icon('note') + '<span class="lbl">Nghe chim</span>';
    $('#relaxBtn').setAttribute('aria-label', 'Nghe chim hót, tạm dừng thời gian');
    $('#relaxBtn').addEventListener('click', () => this.setRelax(true));
    this.initAfk();
    this.needsEl = $('#needs');
    this.needsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) this.trigger(b.dataset.act);
    });
    $('#logH').innerHTML = icon('notebook') + 'Nhật ký';
    $('#hint').innerHTML = icon('bulb') + '<span>Chạm vào cóng nước, máng ăn, khay lồng hoặc con chim trong cảnh 3D để thao tác nhanh. Phím tắt ghi ở góc mỗi nút, phím cách để dừng thời gian.</span>';
    const tabIc = { stats: 'chart', actions: 'list', log: 'notebook' };
    document.querySelectorAll('.tabs [data-tab]').forEach((b) => { b.innerHTML = icon(tabIc[b.dataset.tab]) + b.textContent; });
    $('#bamboo').innerHTML = '<i></i>'.repeat(TOTAL_DAYS);
    this.segs = [...$('#bamboo').children];
    $('#stats').innerHTML = STATS.map(([l, ic]) => `<div class="stat">${icon(ic)}<span class="stat-l">${l}</span><span class="bar" aria-hidden="true"><i></i></span><b class="stat-v">0</b><span class="trend"></span></div>`).join('');
    this.statEls = [...$('#stats').children].map((row) => ({ row, v: row.querySelector('.stat-v'), bar: row.querySelector('.bar i'), tr: row.querySelector('.trend') }));

    $('#actions').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) this.trigger(b.dataset.act);
    });
    $('#viewBtn').addEventListener('click', () => this.toggleView());
    $('#hbBtn').addEventListener('click', () => this.modals.handbook());
    $('#logAll').addEventListener('click', () => this.modals.fullLog());
    this.initTabs();
    this.initSound();
    this.initTip();
    this.initKeys();
    // Toạ độ mép dưới thanh trên (thanh có thể xuống 2 dòng trên màn hình hẹp)
    const tb = $('#topbar');
    const setTop = () => { this.topY = Math.round(tb.getBoundingClientRect().bottom + 10); document.documentElement.style.setProperty('--top', this.topY + 'px'); };
    new ResizeObserver(setTop).observe(tb);
    setTop();
    // Thông báo nổi đặt ngay trên khung Nhật ký: theo dõi chiều cao khung
    const log = $('#pLog');
    new ResizeObserver(() => document.documentElement.style.setProperty('--logH', Math.round(log.offsetHeight) + 'px')).observe(log);
    // Dòng nhật ký phát ra cùng lúc với một thao tác là phản hồi cho người chơi: luôn hiện thông báo
    game.bus.on('act', ({ id }) => { this.acted = true; this.queueFlush(); this.floatDeltas(id); });
    this.coach = $('#coach');
    // "Việc tiếp theo" (điện thoại): mở danh sách, cuộn tới, đưa bàn phím vào việc đó
    $('#nextGoal').addEventListener('click', () => {
      const box = $('#goals'); box.open = true;
      box.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      const S = this.game.S, next = S && dailyGoals(S, SPECIES[S.sp]).find((x) => !x.done);
      if (next) $(`#goalList [data-goal="${next.id}"]`)?.focus({ preventScroll: true });
    });
    $('#goalList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-goal]');
      if (!b) return;
      this.openGoal = b.getAttribute('aria-expanded') === 'true' ? '' : b.dataset.goal;
      if (this.game.S) this.renderGoals(this.game.S, SPECIES[this.game.S.sp]);
      $(`#goalList [data-goal="${b.dataset.goal}"]`)?.focus(); // vẽ lại xong vẫn giữ chỗ bàn phím
    });
    $('#coachX').addEventListener('click', () => { if (this.game.S) this.game.S.coachOff = true; this.coach.hidden = true; });
    this.syncView();
    this.syncSound();
    this.bubble = $('#bubble');
    requestAnimationFrame(() => this.bubbleLoop());
  }

  /* ---------- Điều khiển ---------- */
  initTabs() {
    const tabs = [...document.querySelectorAll('.tabs [data-tab]')];
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => this.setTab(b.dataset.tab));
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const t = tabs[(i + d + tabs.length) % tabs.length];
        this.setTab(t.dataset.tab); t.focus(); e.preventDefault();
      });
    });
    this.setTab('actions');
    // Trên điện thoại các bảng là tabpanel của thanh tab; màn rộng không có thanh tab nên bỏ vai trò này
    const roles = () => document.querySelectorAll('[data-panel]').forEach((p) => {
      if (this.narrow.matches) { p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'tab-' + p.dataset.panel); }
      else { p.removeAttribute('role'); p.removeAttribute('aria-labelledby'); }
    });
    roles(); this.narrow.addEventListener('change', roles);
  }

  setTab(tab) {
    document.body.dataset.tab = tab;
    document.querySelectorAll('.tabs [data-tab]').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
  }

  setSpeed(v) {
    this.speed = v;
    document.querySelectorAll('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.speed === v)));
    $('#paused').hidden = v !== 0;
  }

  /** Chế độ ngắm chim: ẩn các bảng cho cảnh 3D và con chim làm chính (bong bóng nhu cầu vẫn hiện). */
  toggleFocus(on = !document.body.classList.contains('focus')) {
    if (!on && this.relax) { this.setRelax(false); return; }
    document.body.classList.toggle('focus', on);
    $('#focusBtn').setAttribute('aria-pressed', String(on));
    $('#focusPill').hidden = !on;
    this.pillText();
    if (on && this.world.view !== 'close') { this.world.setView('close'); this.syncView(); }
  }

  pillText() {
    const S = this.game.S;
    const html = this.relax
      ? icon('note') + `<span>${esc(this.audio.relaxNote || `Đang nghe ${S?.name || 'chim'} hót.`)} <small aria-hidden="true">Giờ nghe ${fmtTime(this.audio.relaxClock)}, thời gian chăm chim tạm dừng.</small> <b>Chạm để quay lại</b></span>`
      : icon('eye') + '<span>Đang ngắm chim. Bấm hoặc nhấn <kbd>H</kbd> để hiện lại các bảng</span>';
    setHtml($('#focusPill'), html);
  }

  /**
   * Nghe chim (treo máy): dừng thời gian để chim không đói khát khi người chơi vắng mặt, ẩn bảng,
   * SoundEngine cho chim hót theo nhịp thật. Thao tác bất kỳ thì quay lại đúng tốc độ cũ.
   */
  setRelax(on) {
    if (on === !!this.relax || (on && !this.game.running)) return;
    this.relax = on;
    document.body.classList.toggle('relax', on);
    $('#relaxBtn').setAttribute('aria-pressed', String(on));
    if (on) {
      this.relaxSpeed = this.speed; this.relaxFocus = document.body.classList.contains('focus');
      this.setSpeed(0);
      this.toggleFocus(true);
      this.audio.unlock(); this.audio.setRelax(true);
      this.world.lowFps = true; // treo máy: vẽ 30 khung hình/giây cho máy mát, đỡ tốn pin
      this.pillTimer = setInterval(() => this.pillText(), 1000);
    } else {
      clearInterval(this.pillTimer);
      this.audio.setRelax(false);
      this.world.lowFps = false;
      this.setSpeed(this.relaxSpeed ?? 1);
      this.toggleFocus(this.relaxFocus);
      this.lastInput = performance.now();
    }
  }

  initAfk() {
    this.lastInput = performance.now();
    const wake = (e) => {
      this.lastInput = performance.now();
      if (!this.relax) return;
      // Thao tác đầu tiên chỉ để thoát chế độ nghe, không bấm nhầm vào cảnh 3D hay nút
      e.preventDefault(); e.stopPropagation();
      this.setRelax(false);
    };
    for (const t of ['pointerdown', 'keydown', 'wheel']) window.addEventListener(t, wake, { capture: true, passive: false });
    // Chuyển sang tab khác quá 20 giây khi đang chơi: tự chuyển sang nghe chim (vẫn phát nền) thay vì im lặng
    let away;
    document.addEventListener('visibilitychange', () => {
      clearTimeout(away);
      if (document.hidden && !this.relax) away = setTimeout(() => { if (document.hidden && this.speed > 0 && this.game.running && !this.modals.isOpen()) this.setRelax(true); }, 20000);
    });
    setInterval(() => {
      if (!this.relax && this.speed > 0 && this.game.running && !this.modals.isOpen() && performance.now() - this.lastInput > AFK_MS) this.setRelax(true);
    }, 5000);
  }

  toggleView() {
    this.world.setView(this.world.view === 'wide' ? 'close' : 'wide');
    this.syncView();
  }

  syncView() {
    const wide = this.world.view === 'wide';
    if (wide === this.wide) return;
    this.wide = wide;
    const l = wide ? 'Cận cảnh' : 'Toàn cảnh';
    const b = $('#viewBtn');
    b.innerHTML = icon(wide ? 'zoom' : 'wide') + `<span class="lbl">${l}</span>`;
    b.setAttribute('aria-label', l);
  }

  initSound() {
    const btn = $('#sndBtn');
    btn.addEventListener('click', () => (this.pop.hidden ? this.openPop() : this.closePop()));
    $('#sndOn').addEventListener('change', (e) => { this.audio.setMuted(!e.target.checked); this.syncSound(); });
    $('#sndVol').addEventListener('input', (e) => { this.audio.setVolume(e.target.value / 100); this.syncSound(); });
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.snd')) this.closePop(); });
    $('.snd').addEventListener('focusout', (e) => { if (!e.relatedTarget?.closest?.('.snd')) this.closePop(); });
  }

  openPop() { this.pop.hidden = false; $('#sndBtn').setAttribute('aria-expanded', 'true'); this.syncSound(); $('#sndOn').focus(); }

  closePop(refocus) {
    if (this.pop.hidden) return;
    this.pop.hidden = true;
    $('#sndBtn').setAttribute('aria-expanded', 'false');
    if (refocus) $('#sndBtn').focus();
  }

  toggleMute() { this.audio.setMuted(!this.audio.muted); this.syncSound(); }

  syncSound() {
    const a = this.audio;
    const vol = Math.round((a.volume ?? 1) * 100);
    const key = `${a.muted}|${vol}`;
    if (key === this.sndKey) return;
    this.sndKey = key;
    const off = a.muted || vol === 0;
    const btn = $('#sndBtn');
    btn.innerHTML = icon(off ? 'mute' : 'volume');
    btn.classList.toggle('muted', off);
    btn.setAttribute('aria-label', a.muted ? 'Âm thanh: đang tắt' : `Âm thanh: đang bật, âm lượng ${vol}%`);
    $('#sndOn').checked = !a.muted;
    $('#sndVol').value = vol;
    $('#sndOut').textContent = vol + '%';
  }

  initKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const t = e.target;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.key === 'Escape') { this.hideTip?.(); if (!this.pop.hidden) this.closePop(true); return; }
      if (this.modals.isOpen()) return;
      if (e.code === 'Space') { e.preventDefault(); this.setSpeed(this.speed === 0 ? 1 : 0); return; }
      const k = e.code.startsWith('Digit') ? e.code.slice(5) : e.key.length === 1 ? e.key.toUpperCase() : '';
      if (k === 'M') this.toggleMute();
      else if (k === 'V') this.toggleView();
      else if (k === 'S') this.modals.handbook();
      else if (k === 'H') this.toggleFocus();
      else if (k === 'L') this.setRelax(true);
      else if (BY_KEY[k] && this.shown?.has(BY_KEY[k])) {
        const b = $(`#actions [data-act="${BY_KEY[k]}"]`);
        b?.classList.remove('flash'); void b?.offsetWidth; b?.classList.add('flash');
        this.trigger(BY_KEY[k]);
      } else return;
      e.preventDefault();
    });
  }

  initTip() {
    const tip = $('#tip');
    let anchor = null;
    const show = (el) => {
      anchor = el;
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      const w = tip.offsetWidth, h = tip.offsetHeight;
      const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
      const y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
      requestAnimationFrame(() => tip.classList.add('show'));
    };
    this.hideTip = () => { anchor = null; tip.classList.remove('show'); tip.hidden = true; };
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target.closest?.('[data-tip]');
      if (el) { if (el !== anchor) show(el); } else if (anchor) this.hideTip();
    });
    document.addEventListener('focusin', (e) => {
      const el = e.target.closest?.('[data-tip]');
      if (el && el.matches(':focus-visible')) show(el); else if (anchor) this.hideTip();
    });
    document.addEventListener('focusout', (e) => { if (e.target === anchor) this.hideTip(); });
    document.addEventListener('pointerdown', () => this.hideTip());
  }

  /** Hành động từ nút, phím tắt hoặc từ chạm vào vật thể 3D. */
  trigger(id) {
    const g = this.game;
    if (!g.running) return;
    const why = g.blocked(id);
    if (why) { g.log('warn', why); this.render(); return; }
    switch (id) {
      case 'staple': return this.modals.staplePicker();
      case 'fresh': return this.modals.freshPicker();
      case 'clean': return this.modals.cleanPicker();
      case 'move': return this.modals.movePicker();
      default: g.act(id);
    }
  }

  /* ---------- Vẽ ---------- */
  render() {
    this.syncSound();
    this.syncView();
    const S = this.game.S;
    if (!S) return;
    const sp = SPECIES[S.sp];
    if (S !== this.lastS) { this.lastS = S; this.samples = []; }
    this.renderTop(S, sp);
    this.renderBird(S, sp);
    this.renderStats(S);
    this.renderVoice(S, sp);
    this.renderActions(S, sp);
    this.renderGoals(S, sp);
    this.renderNeeds(S);
    this.introRelax(S);
    setHtml($('#ticker'), S.log.slice(0, this.narrow.matches ? 40 : 3).map(entryHtml).join(''));
  }

  renderTop(S, sp) {
    const W = WEATHER[S.weather];
    if (setHtml($('#dayLbl'), `<span class="dl-w">Ngày </span>${S.day}<small>/${TOTAL_DAYS}</small>`)) {
      $('#days').setAttribute('aria-label', `Ngày ${S.day} trên ${TOTAL_DAYS}`);
      this.segs.forEach((el, i) => { el.className = i + 1 < S.day ? 'past' : i + 1 === S.day ? 'now' : ''; });
    }
    const p = Math.max(0, Math.min(1, (S.t - DAY_START) / (FORCE_SLEEP - DAY_START))).toFixed(2);
    if (p !== this.dayP) { this.dayP = p; this.segs[S.day - 1]?.style.setProperty('--p', p); }
    setText($('#timeTxt'), fmtTime(S.t));
    const h = hourOf(S.t);
    const phase = isNight(S.t) ? 'night' : h < 7 ? 'dawn' : h >= 17.5 ? 'dusk' : 'day';
    if (phase !== this.phase) {
      this.phase = phase;
      $('#clock').dataset.phase = phase;
      $('#clockIc').innerHTML = icon({ night: 'moon', dawn: 'sunrise', dusk: 'sunset', day: 'sun' }[phase]);
    }
    if (S.weather !== this.wxKey) {
      this.wxKey = S.weather;
      $('#wx').dataset.w = S.weather;
      $('#wxIc').innerHTML = icon(WEATHER_ICON[S.weather] || 'cloudsun');
      $('#wxName').textContent = W.name;
      $('#wxTemp').textContent = `${W.temp}°C`;
    }
    setText($('#who'), `${S.name} · ${sp.name}`);
  }

  renderBird(S, sp) {
    const th = this.modals.thumbs?.[S.sp + (isYoung(S) ? ':non' : S.stage === 'gia' ? ':gia' : '')] || this.modals.thumbs?.[S.sp];
    setHtml($('#bcImg'), th ? `<img src="${th}" alt="">` : icon('bird'));
    setText($('#birdTitle'), S.name);
    const st = stageOf(S), young = S.stage === 'chuyen' && adultness(S.stage, S.day) < 1;
    setHtml($('#bcSp'), `${esc(sp.name)} · ${esc(young ? st.name : S.stage === 'chuyen' ? 'Vừa thay lông đầu' : st.name)}<i>${esc(sp.latin)}</i>`);
    const tags = [];
    if (S.sick) tags.push(`<span class="tag sick">${icon('alert')}${esc(DISEASES[S.sick.type].name)}</span>`);
    if (S.newDays > 0) tags.push(`<span class="tag new">${icon('leaf')}Mới về, còn ${S.newDays} ngày làm quen</span>`);
    if (S.molt) tags.push(`<span class="tag molt">${icon('feather')}Đang thay lông</span>`);
    if (S.t < S.singUntil) tags.push(`<span class="tag sing">${icon('note')}Đang hót</span>`);
    setHtml($('#tags'), tags.join(''));
    const sg = describeSigns(S, sp);
    const signs = $('#signs');
    if (setHtml(signs, icon(sg.strong ? 'alert' : 'eye') + `<span>${sg.strong ? `<b>${esc(sg.strong)}.</b> ` : ''}${esc(sg.text)}</span>`)) signs.dataset.lv = sg.strong ? 'alert' : '';

    const f = S.feeder;
    const feed = f.type ? `${STAPLES[f.type].name}, còn ${Math.round(f.amt)}%${f.mixFrom ? ` (đang trộn dần, còn ${f.mixLeft} ngày)` : ''}${f.days ? ' (đã cũ)' : ''}` : 'Trống';
    const fresh = S.fresh ? `${FOODS[S.fresh.f].name}${S.fresh.spoiled ? ' (đã ôi)' : ` (${Math.floor(S.fresh.age / 60)} giờ)`}` : 'Không có';
    const rows = [
      ['bowl', 'Máng', feed], ['fruit', 'Đồ tươi', fresh],
      ['pin', 'Chỗ treo', LOCATIONS[S.loc].name + (S.pos === 'san' ? ', đang ra sân phơi nắng' : '')],
      ['sun', 'Nắng sớm', `${Math.round(S.today.sunGood)} phút tốt, cần ${sp.sun[0]}–${sp.sun[1]}`],
    ];
    setHtml($('#cups'), rows.map(([ic, k, v]) => `<dt>${icon(ic)}${k}</dt><dd>${esc(v)}</dd>`).join(''));
  }

  renderStats(S) {
    const now = S.day * 1440 + S.t;
    const vals = STATS.map(([, , f]) => Math.max(0, Math.min(100, f(S))));
    this.lastVals = vals;
    const last = this.samples[this.samples.length - 1];
    if (last && now < last.at) this.samples = [];
    if (!last || now - last.at >= 10 || now < last.at) this.samples.push({ at: now, vals });
    while (this.samples.length > 1 && now - this.samples[0].at > 60) this.samples.shift();
    const base = this.samples[0];
    STATS.forEach(([label], i) => {
      const v = Math.round(vals[i]);
      const d = vals[i] - base.vals[i];
      const tr = d >= TREND ? 'up' : d <= -TREND ? 'down' : '';
      const el = this.statEls[i];
      const key = v + tr;
      if (el.key === key) return;
      el.key = key;
      el.v.textContent = v;
      el.bar.style.setProperty('--v', v / 100);
      el.row.dataset.lv = v > 60 ? 'hi' : v > 30 ? 'mid' : 'lo';
      if (i === 7) { const F = fireBand(v, SPECIES[S.sp]); el.row.dataset.lv = v > 90 ? 'mid' : el.row.dataset.lv; el.row.querySelector('.stat-l').dataset.tip = `${F.name}: ${F.sign}`; } // quá lửa cũng là cần chú ý
      el.tr.className = 'trend ' + tr;
      el.tr.innerHTML = tr ? icon(tr) + `<span class="sr-only">${tr === 'up' ? 'đang tăng' : 'đang giảm'}</span>` : '';
      if (tr) el.tr.dataset.tip = `${label} ${tr === 'up' ? 'tăng' : 'giảm'} ${Math.abs(Math.round(d))} trong khoảng 1 giờ qua`;
      else delete el.tr.dataset.tip;
    });
  }

  renderVoice(S, sp) {
    let html = '';
    if (sp.skill === 'song') {
      const v = S.song ?? 0;
      const lv = songLevel(v);
      const L = SONG_LEVELS[lv];
      const next = SONG_LEVELS[lv + 1];
      const p = next ? ((v - L.min) / (next.min - L.min)).toFixed(2) : 1;
      const steps = SONG_LEVELS.map((_, i) => (i < lv || (i === lv && !next) ? '<i class="full"></i>' : i === lv ? `<i class="part" style="--p:${p}"></i>` : '<i></i>')).join('');
      html = `<div class="v-top">${icon('note')}<span>Giọng hót</span><b>${L.name}</b></div>
        <div class="steps" role="img" aria-label="Cấp ${lv + 1} trên ${SONG_LEVELS.length}">${steps}</div>
        <p class="v-note">${next ? `Cấp ${lv + 1}/${SONG_LEVELS.length}. Còn ${Math.max(1, Math.ceil(next.min - v))} điểm để lên “${next.name}”.` : `Cấp cao nhất. ${L.desc}`}</p>`;
    } else if (sp.skill === 'talk') {
      const total = sp.words?.length || 0;
      const words = S.words.length ? `<div class="words">${S.words.map((w) => `<span>“${esc(w)}”</span>`).join('')}</div>` : '';
      let note;
      if (total && S.words.length >= total) note = 'Đã học hết các câu.';
      else if (S.trust < 35) note = 'Cần thân thiết từ 35 trở lên mới bắt đầu học nói.';
      else if (S.mood <= 50) note = `Chim cần vui hơn (tâm trạng trên 50) mới chịu học. Câu mới: ${Math.round(S.talkProg)}%.`;
      else note = `Đang học câu mới: ${Math.min(99, Math.round(S.talkProg))}%.`;
      const prog = S.trust >= 35 && S.words.length < total ? `<div class="progress" aria-hidden="true"><i style="--p:${(Math.min(99, S.talkProg) / 100).toFixed(2)}"></i></div>` : '';
      html = `<div class="v-top">${icon('talk')}<span>Đã biết nói</span><b>${S.words.length}/${total} câu</b></div>${words}${prog}<p class="v-note">${note}</p>`;
    }
    setHtml($('#voice'), html);
  }

  renderActions(S, sp) {
    const g = this.game;
    const night = S.t >= SLEEP_FROM;
    const shown = new Set();
    const html = GROUPS.map(([label, ids]) => {
      const list = ids.filter((id) => ACTIONS[id] && (id !== 'tutor' || sp.skill === 'song'));
      if (!list.length) return '';
      return `<div role="group" aria-label="${label}"><div class="group-label" aria-hidden="true">${label}</div><div class="btns">${list.map((id) => {
        shown.add(id);
        const why = g.blocked(id);
        const on = (id === 'sun' && S.pos === 'san') || (id === 'cover' && S.covered);
        const cls = 'act' + (on ? ' on' : '') + (id === 'sleep' && night && !why ? ' primary' : '');
        const sub = id === 'sleep' && !night ? '<small>từ 18:00</small>' : '';
        const dis = why ? ` aria-disabled="true" aria-describedby="why-${id}" data-tip="${esc(why)}"` : '';
        return `<button class="${cls}" data-act="${id}" aria-keyshortcuts="${KEYS[id]}"${dis}>${icon(ACTION_ICON[id])}<span>${actLabel(id, S, sp)}${sub}</span><kbd aria-hidden="true">${KEYS[id]}</kbd>${why ? `<span id="why-${id}" hidden>${esc(why)}</span>` : ''}</button>`;
      }).join('')}</div></div>`;
    }).join('');
    this.shown = shown;
    // Vẽ lại khi nút thay đổi, giữ focus bàn phím trên cùng nút
    const focused = document.activeElement?.dataset?.act;
    if (setHtml($('#actions'), html)) {
      if (focused) $(`#actions [data-act="${focused}"]`)?.focus();
      this.hideTip?.();
    }
  }

  renderGoals(S, sp) {
    let goals = [];
    try { goals = dailyGoals(S, sp) || []; } catch (e) { goals = []; } // bản lưu cũ có thể thiếu trường
    const box = $('#goals');
    box.hidden = !goals.length;
    if (!goals.length) return;
    const done = goals.filter((x) => x.done).length;
    setHtml($('#goalsSum'), `${icon('list')}<span>Việc hôm nay</span><span class="g-count">${done}/${goals.length}<span class="sr-only"> việc đã xong</span></span>${icon('chevron', 'chev')}`);
    const p = (done / goals.length).toFixed(2);
    if (p !== this.goalP) { this.goalP = p; $('#goalsBar').style.setProperty('--p', p); }
    const next = goals.find((x) => !x.done);
    setHtml($('#nextGoal'), next ? `${icon('list')}<span><small>Việc tiếp theo · ${done}/${goals.length}</small>${esc(next.label)}</span>` : `${icon('check')}<span>Đã xong việc hôm nay</span>`);
    // Gợi ý của việc tiếp theo luôn hiện; việc khác bấm vào để xem (dùng được trên điện thoại, bàn phím)
    if (this.goalDay !== S.day) { this.goalDay = S.day; this.openGoal = undefined; } // ngày mới: lại tự mở gợi ý việc tiếp theo
    const open = this.openGoal ?? next?.id;
    setHtml($('#goalList'), goals.map((x) => `<li class="goal${x.done ? ' done' : ''}${x.id === open ? ' open' : ''}"><button class="g-btn" data-goal="${x.id}" aria-expanded="${x.id === open}"><span class="ck">${icon('check')}</span><span><span class="g-label">${esc(x.label)}</span><span class="sr-only">${x.done ? ', đã xong' : ', chưa xong'}</span>${x.hint ? `<span class="g-hint">${esc(x.hint)}</span>` : ''}</span></button></li>`).join(''));
  }

  /** Từ ngày 2 (đã quen việc), giới thiệu một lần chế độ Nghe chim và Ngắm chim. */
  introRelax(S) {
    if (this.introDone || S.day < 2 || !this.game.running || this.modals.isOpen()) return;
    this.introDone = true;
    try { if (localStorage.getItem('longtre-intro-relax')) return; localStorage.setItem('longtre-intro-relax', '1'); } catch { /* không có localStorage */ }
    const el = document.createElement('div');
    el.className = 'toast tip intro';
    el.innerHTML = `<span class="t-ic">${icon('note')}</span><p class="t-text"><b>Mẹo: nghe chim hót cho thư giãn.</b> Bấm “Nghe chim” (phím <kbd>L</kbd>): thời gian dừng, chim hót theo nhịp thật, vẫn phát khi chuyển tab. Rời máy 2 phút cũng tự bật.<br><button class="btn btn-sm" data-try>${icon('play')}Thử nghe ngay</button></p><button class="t-x" aria-label="Đóng thông báo">${icon('x')}</button>`;
    el.querySelector('[data-try]').addEventListener('click', () => { this.dismiss(el); this.setRelax(true); });
    this.pushToast(el, 16000);
  }

  /** Chỉ số thay đổi do thao tác vừa làm: số nổi lên ngay tại chỗ (máng, cóng, khay hoặc đầu chim). */
  floatDeltas(id) {
    const S = this.game.S, prev = this.lastVals;
    if (!S || !prev) return;
    const out = [];
    STATS.forEach(([label, , f], i) => {
      const d = Math.round(Math.max(0, Math.min(100, f(S))) - prev[i]);
      if (Math.abs(d) >= 2) out.push([label, d]);
    });
    if (!out.length) return;
    const p = this.world.pickScreen(PICK_OF[id] || 'look') || this.world.pickScreen('look');
    if (!p) return;
    out.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).forEach(([label, d], k) => {
      const el = document.createElement('span');
      el.className = 'float ' + (d > 0 ? 'up' : 'down');
      el.textContent = `${d > 0 ? '+' : '−'}${Math.abs(d)} ${label}`;
      el.style.left = p.x + 'px'; el.style.top = (p.y - 26 - k * 24) + 'px'; el.style.animationDelay = k * 90 + 'ms';
      $('#floats').append(el);
      setTimeout(() => el.remove(), 1700 + k * 90);
    });
  }

  /** Hướng dẫn ngày đầu: việc tiếp theo, chỉ thẳng vào chỗ cần chạm. */
  coachStep() {
    if ((this.coachFrame = ((this.coachFrame || 0) + 1) % 4)) return; // đo bố cục 15 lần/giây là đủ
    const S = this.game.S, el = this.coach;
    const off = !S || S.day > 1 || S.coachOff || S.over || this.modals.isOpen() || document.body.classList.contains('focus');
    if (off) { if (!el.hidden) el.hidden = true; return; }
    let goals = [];
    try { goals = dailyGoals(S, SPECIES[S.sp]); } catch { goals = []; }
    const todo = goals.filter((x) => !x.done && COACH[x.id] && !(x.id === 'sleep' && S.t < SLEEP_FROM - 30) && !this.game.blocked(COACH[x.id][2]));
    const g = todo[0];
    if (!g) { if (!el.hidden) el.hidden = true; return; }
    const [how3d, target3d, act] = COACH[g.id];
    // Lồng đang trùm áo thì không thấy máng, cóng: chỉ vào nút việc làm thay vì vật trong lồng
    const hidden = S.covered && !target3d.startsWith('#');
    const target = hidden ? btn(act) : target3d, how = hidden ? `Lồng đang trùm áo: bấm nút “${actLabel(act, S, SPECIES[S.sp])}” (vẫn làm được khi trùm áo).` : how3d;
    const doneN = goals.filter((x) => x.done).length; // cùng con số với "Việc hôm nay"
    setHtml($('#coachTx'), `<span class="c-step">Việc tiếp theo · đã xong ${doneN}/${goals.length}</span><b>${esc(g.label)}</b>${esc(how)}`);
    let p = null, side = null;
    if (target.startsWith('#')) {
      const b = $(target), r = b?.getBoundingClientRect();
      if (b && b.offsetParent && r.width && r.bottom > 0 && r.top < innerHeight) p = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      // Nút trong bảng bên phải (màn rộng): đặt thẻ ra ngoài bảng để không che danh sách việc
      if (p && !this.narrow.matches) side = b.closest('.panel')?.getBoundingClientRect();
    } else p = this.world.pickScreen(target);
    el.hidden = false;
    el.classList.toggle('no-ring', !p);
    const card = el.querySelector('.c-card'), cw = card.offsetWidth, ch = card.offsetHeight;
    const ring = el.querySelector('.c-ring');
    if (p) {
      const size = Math.max(54, (p.w || 0) + 14, (p.h || 0) + 14);
      ring.style.cssText = `left:${p.x}px;top:${p.y}px;width:${size}px;height:${size}px`;
      // Thẻ chữ đặt phía trên vật, nếu không đủ chỗ thì xuống dưới; luôn nằm trong màn hình
      let y = side ? p.y - ch / 2 : p.y - size / 2 - ch - 12;
      if (y < (this.topY || 0)) y = side ? this.topY : p.y + size / 2 + 12;
      const x = Math.max(12, Math.min(innerWidth - cw - 12, side ? side.left - cw - 14 : p.x - cw / 2));
      card.style.left = x + 'px'; card.style.top = Math.max(8, Math.min(innerHeight - ch - 8, y)) + 'px';
    } else { card.style.left = Math.max(12, innerWidth / 2 - cw / 2) + 'px'; card.style.top = ((this.topY || 80) + 8) + 'px'; }
  }

  renderNeeds(S) {
    const list = S.over ? [] : NEEDS.map(([id, label, f]) => [id, label, f(S)]).filter(([id, , u]) => u > 0 && !this.game.blocked(id))
      .sort((a, b) => b[2] - a[2]).slice(0, 3);
    setHtml(this.needsEl, list.map(([id, label, u]) => `<button class="need${u >= 80 ? ' urgent' : ''}" data-act="${id}" aria-label="${esc(label)}" data-tip="${esc(label)}">${icon(ACTION_ICON[id])}</button>`).join(''));
  }

  /* ---------- Thông báo nổi ---------- */
  onLog(entry) { this.logQ.push(entry); this.queueFlush(); }

  queueFlush() {
    if (this.flushing) return;
    this.flushing = true;
    queueMicrotask(() => {
      this.flushing = false;
      const acted = this.acted;
      this.acted = false;
      for (const e of this.logQ.splice(0)) if (e.type !== 'info' || acted) this.toast(e);
    });
  }

  toast(e) {
    const S = this.game.S;
    if (e.type === 'tip' && S?.day === 1 && !S.coachOff) return; // đang hướng dẫn từng bước: mẹo vẫn vào nhật ký, không bật thêm thông báo cho đỡ rối
    const now = performance.now();
    if (this.recent.get(e.text) > now - 6000) return; // cùng nội dung vừa hiện thì bỏ qua
    if (this.recent.size > 60) this.recent.clear();
    this.recent.set(e.text, now);
    const el = document.createElement('div');
    el.className = 'toast ' + e.type;
    el.innerHTML = `<span class="t-ic">${icon(LOG_ICON[e.type] || 'info')}</span><p class="t-text"><span class="sr-only">${LOG_LABEL[e.type] || ''}: </span>${esc(e.text)}</p><button class="t-x" aria-label="Đóng thông báo">${icon('x')}</button>`;
    this.pushToast(el, Math.min(11000, 4000 + e.text.length * 40));
  }

  /** Chúc mừng thành tựu mới mở: [{ id, name, desc, em }]. */
  onAchievement(list) {
    for (const a of list || []) {
      this.modals.newAch?.add(a.id);
      const el = document.createElement('div');
      el.className = 'toast ach';
      el.innerHTML = `<span class="medal" aria-hidden="true">${esc(a.em || '★')}</span><p class="t-text"><span class="ach-eye">Thành tựu mới</span><span class="ach-name">${esc(a.name)}</span><span class="ach-desc">${esc(a.desc)}</span></p><button class="t-x" aria-label="Đóng thông báo">${icon('x')}</button>`;
      this.pushToast(el, 9000);
    }
  }

  pushToast(el, ms) {
    this.toasts.prepend(el);
    // Tối đa 3 thông báo; bỏ cái cũ nhất, ưu tiên giữ thông báo thành tựu
    while (this.toasts.children.length > 3) {
      const list = [...this.toasts.children].reverse();
      (list.find((x) => !x.classList.contains('ach')) || list[0]).remove();
    }
    let timer;
    const arm = (t) => { clearTimeout(timer); timer = setTimeout(() => this.dismiss(el), t); };
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => arm(2500));
    el.addEventListener('focusin', () => clearTimeout(timer));
    el.addEventListener('focusout', () => arm(2500));
    el.querySelector('.t-x').addEventListener('click', () => this.dismiss(el));
    arm(ms);
  }

  dismiss(el) {
    if (!el.isConnected || el.classList.contains('out')) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 230);
  }

  bubbleLoop() {
    if (this.relax && (this.bubbleSkip = !this.bubbleSkip)) { requestAnimationFrame(() => this.bubbleLoop()); return; } // treo máy: nửa nhịp
    const S = this.game.S;
    const show = S && S.t < S.sayUntil && S.say && !S.covered;
    if (show) {
      const p = this.world.headScreen();
      this.bubble.hidden = !p.visible;
      setText(this.bubble, S.say);
      this.bubble.style.left = p.x + 'px';
      this.bubble.style.top = p.y + 'px';
    } else if (!this.bubble.hidden) this.bubble.hidden = true;
    // Bong bóng nhu cầu bám theo đầu chim, nằm trên bong bóng lời nói nếu có
    const n = this.needsEl;
    if (S && n.childElementCount && !this.modals.isOpen()) {
      const p = this.world.headScreen();
      n.hidden = !p.visible;
      let y = Math.max(p.y - (show ? 64 : 30), (this.topY || 0) + 44); // trên đỉnh đầu, không che mặt chim; không chui dưới thanh trên
      // Thông báo đang hiện ngay phía trên: hạ bong bóng xuống dưới thông báo
      const tr = this.toasts.childElementCount && this.toasts.getBoundingClientRect(), half = n.offsetWidth / 2;
      if (tr && tr.height && p.x + half > tr.left && p.x - half < tr.right && y - n.offsetHeight < tr.bottom) y = tr.bottom + 8 + n.offsetHeight;
      n.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    } else if (!n.hidden) n.hidden = true;
    this.coachStep();
    requestAnimationFrame(() => this.bubbleLoop());
  }
}
