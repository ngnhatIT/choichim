import { SPECIES, SPECIES_ORDER } from '../data/species.js';
import { STAPLES, FOODS } from '../data/foods.js';
import { LOCATIONS, HOME_SPOTS } from '../data/locations.js';
import { DISEASES } from '../data/diseases.js';
import { HANDBOOK, DISCLAIMER } from '../data/handbook.js';
import { SONG_LEVELS } from '../data/song.js';
import { STAGES, STAGE_ORDER, isYoung } from '../data/stages.js';
import { MIX_DAYS, TOTAL_DAYS } from '../config.js';
import { REGIONS } from '../data/weather.js';
import { ACHIEVEMENTS, loadAchievements } from '../core/achievements.js';
import { entryHtml } from './Hud.js';
import { icon, esc, EVENT_ICON, PLACE_ICON, LOG_ICON } from './icons.js';

const $ = (s) => document.querySelector(s);
const DEFAULT_NAMES = { yenphung: 'Bông', chaomao: 'Tía', sao: 'Mực', chichchoe: 'Than', khuyen: 'Nhím', hoami: 'Mi' };
const WARM_EVENTS = new Set(['nhang', 'chao', 'thuoc', 'meo', 'gio', 'chuot', 'matdien', 'nom', 'treem']);
const PLACES = ['', 'nhất', 'nhì', 'ba'];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const lvOf = (v) => (v >= 70 ? 'hi' : v >= 50 ? 'mid' : 'lo');

// Minh họa lồng tre: đĩa son, nan vàng, chú chim bên trong
const CAGE_ART = `<svg viewBox="0 0 150 168" aria-hidden="true">
  <circle cx="75" cy="94" r="60" fill="var(--son-fill)"/>
  <circle cx="75" cy="94" r="66" fill="none" stroke="var(--gold)" stroke-width="1" opacity=".55"/>
  <path d="M48 113h54" stroke="#7E2611" stroke-width="3" stroke-linecap="round"/>
  <g transform="translate(51 80) scale(1.75)"><path d="M3.5 12.8c1.6 4 5.2 6.3 9.6 5.6 4-.6 6.5-3.6 6.5-7.6l1.9-1.5-2.3-.6c-.6-1.9-2.3-3.1-4.3-3.1-2.5 0-4.4 1.9-4.6 4.4Z" fill="#F7E4B8"/><circle cx="15.4" cy="8.3" r="1" fill="#7E2611"/></g>
  <g fill="none" stroke="var(--gold)" stroke-width="2.4" stroke-linecap="round">
    <path d="M75 26V18M75 18c-5 0-6-9 0-9s5 6 1 7"/>
    <path d="M37 142V72a38 38 0 0 1 76 0v70"/>
    <path d="M47 142V46.3M56 142V39.1M66 142V35.1M75 142V34M84 142V35.1M94 142V39.1M103 142V46.3" stroke-width="1.6"/>
    <path d="M37 82h76M37 128h76"/>
    <path d="M30 142h90M36 150h78M44 150v9M106 150v9"/>
  </g>
</svg>`;

function ring(score, label = 'điểm') {
  return `<div class="ring" data-lv="${lvOf(score)}" role="img" aria-label="${score} ${label} trên 100"><svg viewBox="0 0 120 120"><circle class="rg-bg" cx="60" cy="60" r="52"/><circle class="rg-fg" cx="60" cy="60" r="52" pathLength="100" style="stroke-dashoffset:${100 - score}"/></svg><div class="ring-num" aria-hidden="true"><b data-count="${score}">${score}</b><span>${label}</span></div></div>`;
}

function lvBadge(P) {
  const legal = P.legal.group ? `<span class="lv lv3 legal-tag" title="${esc(P.legal.note)}">Loài nguy cấp, quý, hiếm nhóm ${P.legal.group}</span>` : '';
  return `<span class="lv lv${P.lv}"><span class="pips" aria-hidden="true"><i></i><i></i><i></i></span>${P.lvText}</span>${legal}`;
}

export class Modals {
  constructor(game, audio) {
    this.game = game;
    this.audio = audio;
    this.thumbs = {};          // ảnh chim, Hud dùng lại cho thẻ chim
    this.newAch = new Set();   // thành tựu mở trong phiên này (Hud ghi vào)
    this.overlay = $('#overlay');
    this.box = $('#modal');
    this.handlers = {};
    this.dismissible = false;
    this.playing = null;
    this.box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-do]');
      if (!b) return;
      const fn = this.handlers[b.dataset.do];
      if (fn) fn(b.dataset.arg, b);
    });
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      if (e.key === 'Escape' && this.dismissible) this.close();
      else this.handlers.key?.(e);
    });
  }

  isOpen() { return this.overlay.classList.contains('show'); }

  open(html, handlers = {}, { dismissible = true, cls = '', onClose = null } = {}) {
    this.stopPreview();
    this.onClose = onClose;
    if (!this.isOpen()) this.ret = document.activeElement;
    this.handlers = { close: () => this.close(), ...handlers };
    this.dismissible = dismissible;
    this.box.className = 'modal ' + cls;
    this.box.innerHTML = (dismissible ? `<button class="close" data-do="close" aria-label="Đóng">${icon('x')}</button>` : '') + html;
    this.overlay.classList.add('show');
    this.setInert(true);
    this.overlay.scrollTop = 0;
    const f = this.box.querySelector('[data-autofocus]') || this.box.querySelector('input, button:not(.close)') || this.box.querySelector('.close');
    if (f) f.focus({ preventScroll: true });
    this.box.querySelectorAll('[data-count]').forEach((el) => this.countUp(el, +el.dataset.count));
  }

  close() {
    this.stopPreview();
    this.overlay.classList.remove('show');
    this.handlers = {};
    this.setInert(false);
    const r = this.ret;
    this.ret = null;
    if (r?.isConnected && r !== document.body) r.focus({ preventScroll: true });
    const f = this.onClose;
    this.onClose = null;
    f?.();
  }

  // Khi hộp thoại mở, phần còn lại của trang không nhận focus và bị trình đọc màn hình bỏ qua
  setInert(on) { document.querySelectorAll('#scene, .topbar, .tabs, .panel, .skip, #needs, #coach, #focusPill').forEach((el) => { el.inert = on; }); }

  countUp(el, to) {
    if (reduced() || !to) return;
    const t0 = performance.now() + 150;
    const step = (t) => {
      const k = Math.min(1, Math.max(0, (t - t0) / 1000));
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = 0;
    requestAnimationFrame(step);
  }

  /* ---------- Nghe thử tiếng hót ---------- */
  listen(k) {
    const was = this.playing;
    this.stopPreview();
    if (was === k) return;
    if (this.audio.muted) this.audio.setMuted(false); // người chơi chủ động bấm nghe thì bật tiếng
    this.playing = k;
    this.setListenUI(k, true);
    this.audio.preview(k, { onEnd: () => { if (this.playing === k) { this.playing = null; this.setListenUI(k, false); } } });
  }

  stopPreview() {
    if (!this.playing) return;
    const k = this.playing;
    this.playing = null;
    this.audio.stopPreview();
    this.setListenUI(k, false);
  }

  setListenUI(k, on) {
    this.box.querySelectorAll(`.listen[data-arg="${k}"]`).forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('svg').outerHTML = icon(on ? 'stop' : 'play');
      b.querySelector('.lt').textContent = on ? 'Dừng nghe' : 'Nghe tiếng hót';
    });
  }

  listenBtn(k) {
    return `<button class="listen" data-do="listen" data-arg="${k}" aria-pressed="false" aria-label="Nghe tiếng hót của ${SPECIES[k].short}">${icon('play')}<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="lt">Nghe tiếng hót</span></button>`;
  }

  thumb(k, cls = 'sp-stage') {
    return `<span class="${cls}">${this.thumbs[k] ? `<img alt="" src="${this.thumbs[k]}">` : icon('bird')}</span>`;
  }

  /* ---------- Thành tựu ---------- */
  achievementsHtml() {
    const ids = Object.keys(ACHIEVEMENTS);
    if (!ids.length) return '';
    const got = loadAchievements() || {};
    const n = ids.filter((id) => got[id]).length;
    const items = ids.map((id) => {
      const a = ACHIEVEMENTS[id];
      const g = got[id];
      if (!g) return `<li class="ach-item locked"><span class="medal" aria-hidden="true">${icon('lock')}</span><span><b>${esc(a.name)}</b><span>${esc(a.desc)}</span><span class="sr-only">Chưa mở.</span></span></li>`;
      const when = g.at ? new Date(g.at).toLocaleDateString('vi-VN') : '';
      const sp = SPECIES[g.sp]?.name;
      return `<li class="ach-item${this.newAch.has(id) ? ' fresh' : ''}"><span class="medal" aria-hidden="true">${esc(a.em)}</span><span><b>${esc(a.name)}</b><span>${esc(a.desc)}${sp || when ? ` <i>(${[sp, when].filter(Boolean).join(', ')})</i>` : ''}</span></span></li>`;
    }).join('');
    return `<h3>${icon('medal')}Bộ sưu tập thành tựu<span class="ach-count">${n}/${ids.length} đã mở</span></h3><ul class="ach-grid" role="list">${items}</ul>`;
  }

  /* ---------- Bắt đầu ---------- */
  start({ saved, thumbs, onNew, onContinue, onAccount, email }) {
    this.thumbs = thumbs || this.thumbs;
    let pick = null, age = 'truong', region = 'trung', mode = 'moi';
    const cards = SPECIES_ORDER.map((k) => {
      const P = SPECIES[k];
      return `<article class="sp-card">
        <button class="sp-pick" data-do="pick" data-arg="${k}" aria-pressed="false">
          ${this.thumb(k)}<span class="sp-check" aria-hidden="true">${icon('check')}</span>
          <span class="sp-body"><span class="sp-name">${P.name}</span><span class="sp-latin">${P.latin}</span><span class="sp-blurb">${P.blurb}</span></span>
        </button>${lvBadge(P)}
        <div class="sp-voice"><p><span class="sr-only">Tiếng hót: </span>${esc(P.voice || '')}</p>${this.listenBtn(k)}</div>
      </article>`;
    }).join('');
    const S0 = saved && !saved.over ? saved : null;
    const cont = S0 ? `<div class="cont">${this.thumb(S0.sp + (S0.stage === 'gia' ? ':gia' : isYoung(S0) ? ':non' : ''), 'bc-img')}<div><b>${esc(S0.name)}</b><span>${SPECIES[S0.sp]?.name || ''}, đang ở ngày ${S0.day}/${TOTAL_DAYS}</span></div><button class="btn btn-primary" data-do="continue" data-autofocus>${icon('play')}Tiếp tục nuôi</button></div>` : '';
    const acct = onAccount ? `<div class="acct"><span class="acct-ic">${icon(email ? 'check' : 'notebook')}</span><div class="acct-txt"><b>${email ? 'Đã đăng nhập' : 'Lưu ván lên mạng'}</b><span>${email ? esc(email) + ' · tải ván đã lưu về máy này.' : 'Đăng nhập hoặc tạo tài khoản để chơi tiếp trên máy khác. Không bắt buộc, vẫn chơi bình thường nếu bỏ qua.'}</span></div><button class="btn${email ? '' : ' btn-primary'}" data-do="acct">${email ? 'Mở tài khoản' : 'Đăng nhập / Tạo tài khoản'}</button></div>` : '';
    const step2 = () => {
      const P = SPECIES[pick];
      if (!P.wild) { $('#step2').innerHTML = ''; return ageStep($('#step2')); }
      $('#step2').innerHTML = `<div class="slip"><h3>${icon('pin')}Bạn nhận ${P.short} từ đâu?</h3><div class="choice">
        <button data-do="farm"><span class="ci">${icon('home')}</span><span><b>Trại nuôi sinh sản, có nguồn gốc rõ ràng</b><span class="d">Chim quen người từ nhỏ, đã ăn cám, ít sốc môi trường, có giấy tờ chứng minh.${P.legal.group ? ` <b>${esc(P.legal.note)}</b>` : ''}</span></span>${icon('chevron', 'go')}</button>
        <button data-do="wild"><span class="ci">${icon('alert')}</span><span><b>Chợ chim trời, chim bẫy ngoài tự nhiên</b><span class="d">Giá rẻ, bán nhiều ở chợ và trên mạng.</span></span>${icon('chevron', 'go')}</button></div><div id="step3"></div></div>`;
    };
    // Tuổi chim: đổi nhu cầu, sức đề kháng, cách học giọng và bộ lông (data/stages.js)
    const ageStep = (target = $('#step3')) => {
      const P = SPECIES[pick];
      const wrap = target.id === 'step2' ? (h) => `<div class="slip">${h}</div>` : (h) => `<div class="step">${h}</div>`;
      const ic = { chuyen: 'leaf', truong: 'bird', gia: 'star' };
      target.innerHTML = wrap(`<h3>${icon('calendar')}Chú ${P.short} bao nhiêu tuổi?</h3><div class="choice ages">${STAGE_ORDER.map((k) => {
        const A = STAGES[k];
        return `<button data-do="age" data-arg="${k}" aria-pressed="${k === age}"><span class="ci">${icon(ic[k])}</span><span><b>${A.name} <small>${A.age}</small></b><span class="d">${A.desc}</span></span>${icon('check', 'go')}</button>`;
      }).join('')}</div><div id="step4"></div>`);
      optStep($('#step4'));
    };
    // Vùng (thời tiết theo mùa từng miền) và cách chơi: người mới thấy chỉ số, người chơi lâu năm tự đọc dấu hiệu
    const optStep = (target) => {
      const P = SPECIES[pick];
      const rDesc = { bac: 'Đông rét, xuân nồm ẩm, hè nóng mưa rào.', trung: 'Thu đông mưa lạnh kéo dài, hè gió Lào nắng nóng.', nam: 'Hai mùa: mùa khô nắng nóng, mùa mưa rào chiều.' };
      const modes = { moi: ['Người mới', 'Thấy thanh chỉ số, bong bóng nhắc việc và danh sách việc hôm nay.', 'chart'], lau: ['Người chơi lâu năm', 'Không có thanh chỉ số, không nhắc việc. Bạn tự đọc dấu hiệu của chim như người nuôi thật. Đổi lại được giữa ván.', 'eye'] };
      target.innerHTML = `<div class="step"><h3>${icon('pin')}Nhà bạn ở miền nào?</h3><div class="choice regions">${Object.keys(REGIONS).map((k) => `<button data-do="region" data-arg="${k}" aria-pressed="${k === region}"><span class="ci">${icon('home')}</span><span><b>${REGIONS[k]}</b><span class="d">${rDesc[k]} Thời tiết theo tháng thật.</span></span>${icon('check', 'go')}</button>`).join('')}</div>
        <h3>${icon('eye')}Bạn muốn chơi kiểu nào?</h3><div class="choice modes">${Object.keys(modes).map((k) => `<button data-do="mode" data-arg="${k}" aria-pressed="${k === mode}"><span class="ci">${icon(modes[k][2])}</span><span><b>${modes[k][0]}</b><span class="d">${modes[k][1]}</span></span>${icon('check', 'go')}</button>`).join('')}</div><div id="step5"></div></div>`;
      nameStep($('#step5'), P);
    };
    const nameStep = (target = $('#step3')) => {
      const P = SPECIES[pick];
      const wrap = target.id === 'step2' ? (h) => `<div class="slip">${h}</div>` : (h) => `<div class="step">${h}</div>`;
      target.innerHTML = wrap(`<h3>${icon('feather')}Đặt tên cho chú ${P.short}</h3><div class="row" style="margin-top:8px"><input class="input" id="nm" maxlength="18" value="${DEFAULT_NAMES[pick]}" aria-label="Tên chim" autocomplete="off"><button class="btn btn-primary" data-do="go">${icon('home')}Đón chim về nhà</button></div>`);
      const inp = $('#nm');
      inp.focus(); inp.select();
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.handlers.go(); });
      target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
    };
    this.open(`<header class="start-hero"><div class="hero-art">${CAGE_ART}</div><div><span class="eyebrow">Giả lập nuôi chim cảnh 3D</span><h2 id="mTitle">Lồng Tre</h2><p class="lead">Nuôi một chú chim cảnh trong ${TOTAL_DAYS} ngày trong một ngôi nhà Việt. Cho ăn, thay nước, phơi nắng, tắm, chọn chỗ treo lồng: mỗi quyết định đều có hậu quả như ngoài đời, và nhật ký giải thích vì sao.</p></div></header>
      ${cont}${acct}<h3>${icon('bird')}${S0 ? 'Hoặc chọn một chú chim mới' : 'Chọn một chú chim'}</h3><div class="species">${cards}</div><div id="step2"></div>${this.achievementsHtml()}`, {
      pick: (k, btn) => {
        pick = k;
        this.box.querySelectorAll('.sp-pick').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        step2();
        $('#step2').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
      },
      listen: (k) => this.listen(k),
      farm: () => ageStep(),
      age: (k, btn) => {
        age = k;
        this.box.querySelectorAll('.ages button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        $('#nm')?.focus();
      },
      region: (k, btn) => { region = k; this.box.querySelectorAll('.regions button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn))); },
      mode: (k, btn) => { mode = k; this.box.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn))); },
      wild: () => {
        $('#step3').innerHTML = `<div class="warnbox"><b>${icon('alert')}Lồng Tre không cho chọn lựa này.</b><p>Chim bẫy từ tự nhiên thường bị sốc, “ngã nước”, nhiều con chết trong những ngày đầu. Săn bắt, mua bán chim hoang dã trái phép là vi phạm pháp luật, có thể bị xử phạt hành chính hoặc truy cứu trách nhiệm hình sự. Mỗi con chim được mua là thêm một lý do để người ta tiếp tục giăng lưới.</p><button class="btn btn-primary" data-do="farm" style="margin-top:6px">${icon('home')}Chọn chim từ trại nuôi sinh sản</button></div>`;
        $('#step3 .btn').focus();
      },
      go: () => { const n = ($('#nm')?.value || '').trim() || 'Chim'; this.close(); onNew(pick, n, age, { region, mode }); },
      continue: () => { this.close(); onContinue(); },
      acct: () => onAccount(),
    }, { dismissible: false, cls: 'wide' });
  }

  /* ---------- Chọn thức ăn, cách dọn, chỗ treo ---------- */
  staplePicker() {
    const g = this.game;
    const cur = g.S.feeder;
    const list = Object.entries(STAPLES).map(([k, v]) => `<button data-do="pick" data-arg="${k}"><span class="em" aria-hidden="true">${v.em}</span><span>${v.name}${cur.type === k && cur.amt > 0 ? '<small>Đang có trong máng</small>' : ''}</span></button>`).join('');
    this.open(`<h2 id="mTitle">Thay thức ăn chính</h2><p class="lead">Đổ thức ăn mới vào máng. Mỗi loài hợp với một loại thức ăn chính khác nhau.</p><div class="foods">${list}</div><div id="mix"></div>`, {
      pick: (k) => {
        const f = g.S.feeder;
        if (f.type && f.type !== k && f.amt > 0) {
          $('#mix').innerHTML = `<h3>${icon('bowl')}Máng đang có ${STAPLES[f.type].name.toLowerCase()}. Đổi thế nào?</h3><div class="choice">
            <button data-do="mode" data-arg="mix:${k}"><span class="ci">${icon('hourglass')}</span><span><b>Trộn dần trong ${MIX_DAYS} ngày</b><span class="d">Tăng dần tỉ lệ thức ăn mới mỗi ngày.</span></span>${icon('chevron', 'go')}</button>
            <button data-do="mode" data-arg="swap:${k}"><span class="ci">${icon('move')}</span><span><b>Đổi hẳn ngay</b><span class="d">Đổ bỏ thức ăn cũ, thay toàn bộ bằng thức ăn mới.</span></span>${icon('chevron', 'go')}</button></div>`;
          $('#mix button').focus({ preventScroll: true });
          $('#mix').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
          return;
        }
        this.close(); g.act('staple', { food: k });
      },
      mode: (arg) => { const [mode, food] = arg.split(':'); this.close(); g.act('staple', { food, mode }); },
    });
  }

  freshPicker() {
    const list = Object.entries(FOODS).map(([k, v]) => `<button data-do="pick" data-arg="${k}"><span class="em" aria-hidden="true">${v.em}</span><span>${v.name}</span></button>`).join('');
    this.open(`<h2 id="mTitle">Cho ăn thêm</h2><p class="lead">Trái cây, mồi tươi hay đồ ăn trong bếp: món nào tốt, món nào hại? Chọn rồi xem nhật ký để biết.</p><div class="foods">${list}</div>`, {
      pick: (k) => { this.close(); this.game.act('fresh', { food: k }); },
    });
  }

  cleanPicker() {
    this.open(`<h2 id="mTitle">Dọn lồng</h2><p class="lead">Dọn khay phân, bỏ đồ ăn thừa, lau nan lồng.</p><div class="choice">
      <button data-do="m" data-arg="wet"><span class="ci">${icon('sparkdrop')}</span><span><b>Đeo găng, lau ẩm, rửa tay</b><span class="d">Mất khoảng 15 phút.</span></span>${icon('chevron', 'go')}</button>
      <button data-do="m" data-arg="dry"><span class="ci">${icon('broom')}</span><span><b>Quét khô cho nhanh</b><span class="d">Mất khoảng 5 phút.</span></span>${icon('chevron', 'go')}</button></div>`, {
      m: (method) => { this.close(); this.game.act('clean', { method }); },
    }, { cls: 'narrow' });
  }

  movePicker() {
    const S = this.game.S;
    const list = HOME_SPOTS.map((k) => `<button data-do="m" data-arg="${k}" ${k === S.loc ? 'disabled' : ''}><span class="ci">${icon(PLACE_ICON[k])}</span><span><b>${LOCATIONS[k].name}${k === S.loc ? ' (đang treo)' : ''}</b><span class="d">${LOCATIONS[k].desc}</span></span>${k === S.loc ? '' : icon('chevron', 'go')}</button>`).join('');
    this.open(`<h2 id="mTitle">Đổi chỗ treo lồng</h2><p class="lead">Chọn nơi treo lồng cố định trong nhà.</p><div class="choice">${list}</div>`, {
      m: (loc) => { this.close(); this.game.act('move', { loc }); },
    }, { cls: 'narrow' });
  }

  /* ---------- Sự kiện ---------- */
  event(ev) {
    const S = this.game.S;
    const list = ev.choices.map((c, i) => `<button data-do="c" data-arg="${i}" aria-keyshortcuts="${i + 1}"><span class="num" aria-hidden="true">${i + 1}</span><b>${c.label}</b>${icon('chevron', 'go')}</button>`).join('');
    this.open(`<div class="ev-head"><span class="medallion${WARM_EVENTS.has(ev.id) ? ' warm' : ''}" aria-hidden="true">${icon(EVENT_ICON[ev.id] || 'bell')}</span><div><span class="eyebrow">Chuyện trong nhà</span><h2 id="mTitle">${ev.title}</h2></div></div><p class="ev-text">${esc(ev.text(S))}</p><div class="choice">${list}</div>`, {
      c: (i) => { this.close(); this.game.chooseEvent(+i); },
      key: (e) => { const i = +e.key - 1; if (ev.choices[i] && !e.repeat) { e.preventDefault(); this.close(); this.game.chooseEvent(i); } },
    }, { dismissible: false, cls: 'narrow' });
  }

  /* ---------- Tổng kết ngày ---------- */
  report(R, { onNext }) {
    const S = this.game.S;
    const ok = R.items.filter((i) => i.ok === true).length;
    const no = R.items.filter((i) => i.ok === false).length;
    const items = R.items.map((i, n) => {
      const k = i.ok === true ? 'ok' : i.ok === false ? 'no' : 'na';
      const sr = { ok: 'Đạt', no: 'Chưa đạt', na: 'Không tính' }[k];
      return `<li class="${k}" style="animation-delay:${Math.min(n, 12) * 35}ms"><span class="k" aria-hidden="true">${icon({ ok: 'check', no: 'x', na: 'info' }[k])}</span><span><b><span class="sr-only">${sr}: </span>${esc(i.label)}</b><small>${esc(i.note)}</small></span></li>`;
    }).join('');
    const chip = (ic, l, v) => `<span class="chip">${icon(ic)}${l} <b>${Math.round(v)}</b></span>`;
    this.open(`<span class="eyebrow">Ngày ${R.day}/${TOTAL_DAYS}${R.forced ? ', chim phải ngủ muộn' : ''}</span><h2 id="mTitle">Tổng kết ngày ${R.day}</h2>
      <div class="rep-head">${ring(R.score)}<div><p class="lead">Điểm chăm sóc hôm nay của ${esc(S.name)}.</p>
        <div class="tally"><span class="okc">${icon('ok')}${ok} việc tốt</span><span class="noc">${icon('warn')}${no} việc chưa tốt</span></div>
        <div class="chips">${chip('heart', 'Sức khỏe', S.health)}${chip('smile', 'Tâm trạng', S.mood)}${chip('feather', 'Lông', S.feather)}${S.song && SPECIES[S.sp].skill === 'song' ? chip('note', 'Giọng hót', S.song) : ''}</div></div></div>
      <ul class="report">${items}</ul>
      <div class="row"><button class="btn btn-primary" data-do="next" data-autofocus>${R.last ? `${icon('star')}Xem kết quả cuối cùng` : `${icon('sunrise')}Sang ngày ${R.day + 1}`}</button></div>`, {
      next: () => { this.close(); onNext(); },
    }, { dismissible: false });
  }

  /* ---------- Tổng kết cuối ---------- */
  chartsHtml(hist) {
    const n = Math.max(1, hist.length);
    const x = (i) => ((i + 0.5) / n) * 100;
    const avg = Math.round(hist.reduce((a, h) => a + h.score, 0) / n);
    const best = hist.reduce((b, h, i) => (h.score > hist[b].score ? i : b), 0);
    const cols = hist.map((h, i) => `<div class="c" style="left:${x(i)}%;height:${Math.max(1, h.score)}%">${i === best || i === n - 1 ? `<span>${h.score}</span>` : ''}</div>`).join('');
    const xl = hist.map((h, i) => `<span style="left:${x(i)}%">${h.day}</span>`).join('');
    const lines = [['health', 'Sức khỏe', 'heart'], ['mood', 'Tâm trạng', 'smile'], ['feather', 'Chất lượng lông', 'feather']];
    if (hist.some((h) => typeof h.song === 'number')) lines.push(['song', 'Giọng hót', 'note']);
    const small = lines.map(([k, l, ic]) => {
      const pts = hist.map((h, i) => `${x(i).toFixed(2)},${(100 - (h[k] ?? 0)).toFixed(1)}`);
      const lastV = hist[n - 1]?.[k] ?? 0;
      return `<div class="chart"><h4>${icon(ic)}${l}<b>${lastV}</b></h4><div class="plot sm">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line class="grid" x1="0" x2="100" y1="50" y2="50"/><polygon class="area" points="${x(0)},100 ${pts.join(' ')} ${x(n - 1)},100"/><polyline class="ln" points="${pts.join(' ')}"/></svg>
        <i class="dot" style="left:${x(n - 1)}%;top:${100 - lastV}%"></i><i class="xh"></i></div></div>`;
    }).join('');
    const rows = hist.map((h) => `<tr><td>Ngày ${h.day}</td><td>${h.score}</td>${lines.map(([k]) => `<td>${h[k] ?? ''}</td>`).join('')}</tr>`).join('');
    return `<div class="charts" style="--k:${lines.length}" tabindex="0" role="group" aria-label="Biểu đồ từng ngày. Dùng phím mũi tên trái phải để xem từng ngày.">
        <div class="chart main"><h4>${icon('chart')}Điểm chăm sóc từng ngày<b>Trung bình ${avg}</b></h4>
          <div class="plot cols" aria-hidden="true"><i class="gl" style="bottom:50%"></i><i class="gl" style="bottom:100%"></i>${cols}<i class="avg" style="bottom:${avg}%"><span>TB ${avg}</span></i><i class="xh"></i></div>
          <div class="xl" aria-hidden="true">${xl}</div></div>${small}
        <div class="ctip" hidden></div></div>
      <details class="tbl-wrap"><summary>${icon('list')}Xem bảng số liệu</summary><table><thead><tr><th>Ngày</th><th>Điểm</th>${lines.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></details>`;
  }

  bindCharts(hist) {
    const box = this.box.querySelector('.charts');
    if (!box || !hist.length) return;
    const tip = box.querySelector('.ctip');
    const keys = [['score', 'Điểm'], ['health', 'Sức khỏe'], ['mood', 'Tâm trạng'], ['feather', 'Lông'], ['song', 'Giọng hót']];
    let cur = -1;
    const show = (i, px, py) => {
      cur = i;
      const h = hist[i];
      const pct = ((i + 0.5) / hist.length) * 100 + '%';
      box.dataset.hover = '';
      box.querySelectorAll('.xh').forEach((el) => { el.style.left = pct; });
      box.querySelectorAll('.cols .c').forEach((el, j) => el.classList.toggle('dim', j !== i));
      tip.innerHTML = `<h5>Ngày ${h.day}</h5>` + keys.filter(([k]) => typeof h[k] === 'number').map(([k, l]) => `<div><i></i><span>${l}</span><b>${h[k]}</b></div>`).join('');
      tip.hidden = false;
      const r = box.getBoundingClientRect();
      tip.style.left = Math.max(80, Math.min(r.width - 80, px)) + 'px';
      tip.style.top = Math.max(70, py) + 'px';
    };
    const hide = () => { cur = -1; delete box.dataset.hover; tip.hidden = true; box.querySelectorAll('.cols .c').forEach((el) => el.classList.remove('dim')); };
    box.addEventListener('pointermove', (e) => {
      const plot = e.target.closest('.chart')?.querySelector('.plot');
      if (!plot) return hide();
      const pr = plot.getBoundingClientRect();
      const i = Math.floor(((e.clientX - pr.left) / pr.width) * hist.length);
      if (i < 0 || i >= hist.length) return hide();
      const br = box.getBoundingClientRect();
      show(i, e.clientX - br.left, e.clientY - br.top);
    });
    box.addEventListener('pointerleave', hide);
    box.addEventListener('blur', hide);
    box.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const i = Math.max(0, Math.min(hist.length - 1, cur < 0 ? (d > 0 ? 0 : hist.length - 1) : cur + d));
      const plot = box.querySelector('.cols').getBoundingClientRect();
      const br = box.getBoundingClientRect();
      show(i, plot.left - br.left + ((i + 0.5) / hist.length) * plot.width, plot.top - br.top + 10);
    });
  }

  final(sum, { onAgain }) {
    const S = this.game.S;
    const sp = SPECIES[S.sp];
    const fact = (ic, l, v) => `<div class="fact">${icon(ic)}<span>${l}</span><b>${v}</b></div>`;
    let voice = '';
    if (sum.song) {
      const steps = SONG_LEVELS.map((_, i) => `<i class="${i <= sum.song.level ? 'full' : ''}"></i>`).join('');
      voice = `<div class="song-card"><span class="medallion" aria-hidden="true">${icon('note')}</span><div><span class="eyebrow">Giọng hót sau ${TOTAL_DAYS} ngày</span><b>${esc(sum.song.name)}</b><p>${sum.song.v} điểm, cấp ${sum.song.level + 1}/${SONG_LEVELS.length}. ${esc(SONG_LEVELS[sum.song.level].desc)}</p><div class="steps" aria-hidden="true">${steps}</div></div></div>`;
    }
    if (sum.contest) {
      const c = sum.contest;
      voice += `<div class="song-card"><span class="medallion warm" aria-hidden="true">${icon('trophy')}</span><div><span class="eyebrow">Hội thi chim hót, ngày ${c.day}</span><b>${c.place ? `Đạt giải ${PLACES[c.place]}` : 'Chưa đạt giải'}</b><p>${c.place ? 'Giọng hót, độ sung và bộ lông đều được ban giám khảo khen.' : 'Thi là để học hỏi: chỉ mang chim khỏe, không thi khi đang thay lông.'}</p></div></div>`;
    }
    this.open(`<div class="final-head"><div><span class="eyebrow">Sau ${TOTAL_DAYS} ngày nuôi ${esc(S.name)}, ${sp.name.toLowerCase()}</span><h2 id="mTitle">${esc(sum.title)}</h2>
        <p class="lead">Điểm chăm sóc trung bình của bạn là <b>${sum.avg}</b>. Di chuột hoặc dùng phím mũi tên trên biểu đồ để xem từng ngày.</p></div>${ring(sum.avg, 'trung bình')}</div>
      ${this.chartsHtml(sum.hist)}
      <div class="facts">${fact('heart', 'Sức khỏe', Math.round(S.health))}${fact('trust', 'Thân thiết', Math.round(S.trust))}${fact('feather', 'Chất lượng lông', Math.round(S.feather))}${fact('broom', 'Lần dọn lồng chưa an toàn cho người', S.ownerRisk)}</div>
      ${voice}
      ${sum.ach.length ? `<h3>${icon('star')}Dấu ấn ván này</h3><ul class="hb-list">${sum.ach.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      ${this.achievementsHtml()}
      <h3>${icon('bulb')}Nhớ mang ra đời thật</h3><ul class="hb-list">${sum.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
      <div class="row"><button class="btn btn-primary" data-do="again">${icon('bird')}Nuôi một chú chim khác</button></div>`, {
      again: () => { this.newAch.clear(); this.close(); onAgain(); },
    }, { dismissible: false });
    this.bindCharts(sum.hist);
  }

  over(info, { onAgain }) {
    const S = this.game.S;
    const d = info.sick ? DISEASES[info.sick.type] : null;
    this.open(`<div class="ev-head"><span class="medallion" aria-hidden="true">${icon('feather')}</span><div><span class="eyebrow">Ngày ${S.day}/${TOTAL_DAYS}</span><h2 id="mTitle">${esc(S.name)} đã không qua khỏi</h2></div></div>
      <p class="ev-text">${d ? `Nguyên nhân: ${d.name.toLowerCase()} không được chữa kịp. ${d.cause}` : 'Chim kiệt sức vì đói, khát hoặc điều kiện sống kém kéo dài.'}</p>
      ${d ? `<div class="warnbox"><b>${icon('bulb')}Cách phòng</b><p>${d.prevent}</p></div>` : ''}
      <p class="lead" style="margin-top:14px">Ngoài đời, chim thường che giấu bệnh đến khi đã nặng. Khi thấy chim xù lông, ủ rũ, bỏ ăn, phân bất thường hoặc khó thở, hãy cách ly, giữ ấm và đưa đến bác sĩ thú y càng sớm càng tốt.</p>
      <div class="row"><button class="btn btn-primary" data-do="again">${icon('bird')}Thử lại</button></div>`, {
      again: () => { this.newAch.clear(); this.close(); onAgain(); },
    }, { dismissible: false, cls: 'narrow' });
  }

  /* ---------- Sổ tay ---------- */
  handbook(tab) {
    const cur = this.game.S?.sp || 'yenphung';
    tab = tab || 'sp:' + cur;
    const btn = ([k, l]) => `<button data-do="tab" data-arg="${k}" aria-current="${k === tab}"${k === tab ? ' data-autofocus' : ''}>${l}</button>`;
    const nav = `<nav class="hb-nav" aria-label="Mục lục sổ tay"><div><span class="grp">Loài chim</span>${SPECIES_ORDER.map((k) => btn(['sp:' + k, SPECIES[k].name])).join('')}</div><div><span class="grp">Kiến thức</span>${HANDBOOK.map((h) => btn(['g:' + h.id, h.title])).join('')}</div></nav>`;
    let body;
    if (tab.startsWith('sp:')) {
      const k = tab.slice(3);
      const P = SPECIES[k];
      const goods = Object.entries(P.food).filter(([, v]) => v[0] >= 2).map(([f]) => FOODS[f].name.toLowerCase());
      const fact = (ic, l, v) => `<div class="fact">${icon(ic)}<span>${l}</span><b>${v}</b></div>`;
      const extra = P.skill === 'song'
        ? `<ol class="levels" aria-label="Các cấp giọng hót">${SONG_LEVELS.map((L, i) => `<li><span>${i + 1}</span><b>${L.name}</b><em>${L.desc}</em></li>`).join('')}</ol>`
        : P.words ? `<p class="v-note">Có thể học nói: ${P.words.map((w) => `“${esc(w)}”`).join(', ')}.</p>` : '';
      body = `<div class="hb-sp">${this.thumb(k)}<div><h3>${P.name} <i>${P.latin}</i></h3>${lvBadge(P)}<p class="lead">${P.blurb}</p></div></div>
        <div class="voice-box"><span class="medallion" aria-hidden="true">${icon('note')}</span><div><h3>Tiếng hót</h3><p>${esc(P.voice || '')}</p>${this.listenBtn(k)}${extra}</div></div>
        <div class="facts">${fact('bowl', 'Thức ăn chính', STAPLES[P.best].name)}${fact('fruit', 'Món bổ sung tốt', goods.join(', '))}
        ${fact('sun', 'Nắng sớm mỗi ngày', `${P.sun[0]}–${P.sun[1]} phút`)}${fact('bath', 'Tắm nước', P.bathGap === 1 ? 'Mỗi ngày' : 'Ít nhất mỗi ' + P.bathGap + ' ngày')}
        ${fact('chart', 'Độ khó', P.lvText)}${fact('pin', 'Nguồn gốc', P.legal.group ? `Loài nhóm ${P.legal.group}${P.legal.cites ? `, CITES ${P.legal.cites}` : ''}: chỉ nhận chim sinh sản tại cơ sở có mã số` : P.wild ? 'Thường bị bẫy từ tự nhiên, chỉ nhận chim nuôi sinh sản' : 'Nuôi sinh sản phổ biến')}</div>
        <h3>${icon('bulb')}Kinh nghiệm chăm</h3><ul class="hb-list">${P.tips.map((t) => `<li>${t}</li>`).join('')}</ul>`;
    } else {
      const h = HANDBOOK.find((x) => x.id === tab.slice(2));
      body = `<h3>${icon('book')}${h.title}</h3><ul class="hb-list">${h.items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
    }
    this.open(`<h2 id="mTitle">Sổ tay nuôi chim</h2>${nav}<div class="hb">${body}</div><p class="note">${icon('info')}<span>${DISCLAIMER}</span></p>`, {
      tab: (k) => this.handbook(k),
      listen: (k) => this.listen(k),
    });
  }

  /* ---------- Nhật ký đầy đủ ---------- */
  fullLog() {
    const S = this.game.S;
    if (!S) return;
    const days = [];
    for (const e of S.log) {
      if (!days.length || days[days.length - 1].d !== e.d) days.push({ d: e.d, list: [] });
      days[days.length - 1].list.push(e);
    }
    const F = [['all', 'Tất cả', 'list'], ['bad', 'Nguy hiểm', LOG_ICON.bad], ['warn', 'Lưu ý', LOG_ICON.warn], ['good', 'Tốt', LOG_ICON.good], ['tip', 'Mẹo', LOG_ICON.tip]];
    this.open(`<h2 id="mTitle">Nhật ký nuôi chim</h2><p class="lead">${esc(S.name)}, ${SPECIES[S.sp].name.toLowerCase()}. Mới nhất ở trên cùng.</p>
      <div class="filters" role="group" aria-label="Lọc nhật ký">${F.map(([k, l, ic]) => `<button data-do="f" data-arg="${k}" aria-pressed="${k === 'all'}">${icon(ic)}${l}</button>`).join('')}</div>
      <div class="log-days" data-f="all">${days.map((g) => `<h4>Ngày ${g.d}</h4><ol class="fullLog">${g.list.map(entryHtml).join('')}</ol>`).join('')}</div>`, {
      f: (k, b) => {
        this.box.querySelector('.log-days').dataset.f = k;
        this.box.querySelectorAll('.filters button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      },
    });
  }
}
