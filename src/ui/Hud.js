import { SPECIES } from '../data/species.js';
import { STAPLES, FOODS } from '../data/foods.js';
import { LOCATIONS } from '../data/locations.js';
import { WEATHER } from '../data/weather.js';
import { DISEASES } from '../data/diseases.js';
import { SONG_LEVELS, songLevel } from '../data/song.js';
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
    const setTop = () => document.documentElement.style.setProperty('--top', Math.round(tb.getBoundingClientRect().bottom + 10) + 'px');
    new ResizeObserver(setTop).observe(tb);
    setTop();
    // Dòng nhật ký phát ra cùng lúc với một thao tác là phản hồi cho người chơi: luôn hiện thông báo
    game.bus.on('act', () => { this.acted = true; this.queueFlush(); });
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
    const th = this.modals.thumbs?.[S.sp];
    setHtml($('#bcImg'), th ? `<img src="${th}" alt="">` : icon('bird'));
    setText($('#birdTitle'), S.name);
    setHtml($('#bcSp'), `${esc(sp.name)}<i>${esc(sp.latin)}</i>`);
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
    // Chỉ hiện gợi ý của việc chưa xong đầu tiên cho gọn; các việc khác xem gợi ý khi rê chuột
    const next = goals.find((x) => !x.done);
    setHtml($('#goalList'), goals.map((x) => `<li class="goal${x.done ? ' done' : ''}"${x.hint && x !== next ? ` data-tip="${esc(x.hint)}"` : ''}><span class="ck">${icon('check')}</span><span><span class="g-label">${esc(x.label)}</span><span class="sr-only">${x.done ? ', đã xong' : ', chưa xong'}</span>${x === next && x.hint ? `<span class="g-hint">${esc(x.hint)}</span>` : x.hint ? `<span class="sr-only">. ${esc(x.hint)}</span>` : ''}</span></li>`).join(''));
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
    const S = this.game.S;
    const show = S && S.t < S.sayUntil && S.say && !S.covered;
    if (show) {
      const p = this.world.headScreen();
      this.bubble.hidden = !p.visible;
      setText(this.bubble, S.say);
      this.bubble.style.left = p.x + 'px';
      this.bubble.style.top = p.y + 'px';
    } else if (!this.bubble.hidden) this.bubble.hidden = true;
    requestAnimationFrame(() => this.bubbleLoop());
  }
}
