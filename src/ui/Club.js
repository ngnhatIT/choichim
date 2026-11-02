import { sb, pushSave, pullSave, CAPTCHA_SITE_KEY } from '../net/supabase.js';
import { DISCLAIMER } from '../data/handbook.js';
import { icon, esc } from './icons.js';

const $ = (s) => document.querySelector(s);
let turnstile = null;
const loadTurnstile = () => (turnstile ||= new Promise((ok, fail) => {
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.onload = () => ok(window.turnstile);
  s.onerror = () => { turnstile = null; fail(); };
  document.head.append(s);
}));
const TOPICS = { that: 'Chim thật', game: 'Chim trong game' };
const when = (t) => new Date(t).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Hội chim: góc hỏi đáp giữa nhóm bạn và đồng bộ bản lưu qua Supabase.
 * Chỉ email có trong danh sách mời đăng ký được (xem supabase/migrations).
 */
export class Club {
  constructor(modals, { getState, onLoad }) {
    this.m = modals;
    this.getState = getState;
    this.onLoad = onLoad;
    this.email = '';
    this.back = null; // màn cần quay lại khi đóng hộp thoại (màn bắt đầu)
    this.seq = 0; // bỏ kết quả mạng về muộn khi người chơi đã chuyển màn khác
  }

  async user() { return (await sb.auth.getSession()).data.session?.user || null; }

  show(body, handlers = {}, msg = '') {
    const tabs = this.member ? [['posts', 'Hỏi đáp'], ['account', 'Tài khoản']] : [['account', 'Tài khoản']];
    const nav = this.signedIn
      ? `<nav class="hb-nav" aria-label="Hội chim"><div>${tabs.map(([k, l]) => `<button data-do="tab" data-arg="${k}" aria-current="${k === this.tab}">${l}</button>`).join('')}</div></nav>`
      : '';
    this.m.open(`<h2 id="mTitle">${this.signedIn ? 'Hội chim' : 'Đăng nhập / Tạo tài khoản'}</h2>${nav}<div class="hb">${body}</div><p class="note" role="status" id="clubMsg">${msg ? icon('info') + `<span>${esc(msg)}</span>` : ''}</p>`, {
      tab: (k) => this.open(k, this.back),
      ...handlers,
    }, { onClose: () => this.back?.() });
  }

  say(msg) { const el = $('#clubMsg'); if (el) el.innerHTML = icon('info') + `<span>${esc(msg)}</span>`; }

  /** Chạy một yêu cầu mạng; trả null nếu người chơi đã rời màn này hoặc có lỗi (đã báo). */
  async net(p) {
    const my = ++this.seq;
    this.say('Đang kết nối…');
    try {
      const r = await p;
      if (my !== this.seq || !this.m.isOpen()) return null;
      if (r?.error) { this.say('Lỗi: ' + r.error.message); return null; }
      return r || {};
    } catch (e) {
      if (my === this.seq) this.say('Không kết nối được. Kiểm tra mạng rồi thử lại.');
      return null;
    }
  }

  async open(tab = this.tab || 'posts', back = null) {
    this.back = back;
    this.tab = tab;
    this.show('<p class="lead">Đang tải…</p>');
    const u = await this.net(this.user());
    if (u === null && !this.m.isOpen()) return;
    this.signedIn = !!(u && u.id);
    if (!this.signedIn) return this.login();
    // Ai cũng có tài khoản đồng bộ; mục Hỏi đáp chỉ dành cho email trong danh sách mời
    const m = await this.net(sb.rpc('is_club_member'));
    if (!m) return;
    this.member = m.data === true;
    if (!this.member) this.tab = 'account';
    return this.tab === 'account' ? this.account() : this.posts();
  }

  /* ---------- Đăng nhập / tạo tài khoản bằng email + mật khẩu ---------- */
  login() {
    this.show(`<p class="lead">Đăng nhập để chơi tiếp ván của mình trên máy khác. Chưa có tài khoản thì bấm Tạo tài khoản. Mục Hỏi đáp chỉ dành cho nhóm bạn được mời.</p>
      <div class="club-form"><input class="input" id="em" type="email" autocomplete="email" placeholder="Email" aria-label="Email" value="${esc(this.email)}" data-autofocus>
      <input class="input" id="pw" type="password" autocomplete="current-password" placeholder="Mật khẩu (ít nhất 6 ký tự)" aria-label="Mật khẩu">
      <div class="row"><button class="btn btn-primary" data-do="signin">${icon('check')}Đăng nhập</button><button class="btn btn-ghost" data-do="signup">Tạo tài khoản</button></div></div>${CAPTCHA_SITE_KEY ? '<div id="cf"></div>' : ''}`, {
      signin: () => this.auth('signInWithPassword'),
      signup: () => this.auth('signUp'),
      key: (e) => { if (e.key === 'Enter') this.m.handlers.signin(); },
    });
    if (CAPTCHA_SITE_KEY) {
      loadTurnstile().then((ts) => {
        if ($('#cf')) ts.render('#cf', { sitekey: CAPTCHA_SITE_KEY, callback: (t) => { this.captcha = t; } });
      }).catch(() => this.say('Không tải được bước xác minh chống spam. Kiểm tra mạng rồi mở lại.'));
    }
  }

  async auth(method) {
    this.email = $('#em').value.trim().toLowerCase();
    const password = $('#pw').value;
    if (!/^\S+@\S+\.\S+$/.test(this.email)) return this.say('Email chưa đúng.');
    if (password.length < 6) return this.say('Mật khẩu cần ít nhất 6 ký tự.');
    if (CAPTCHA_SITE_KEY && !this.captcha) return this.say('Chờ xác minh chống spam xong rồi bấm lại.');
    const r = await this.net(sb.auth[method]({ email: this.email, password, options: { captchaToken: this.captcha || undefined } }));
    this.captcha = null; // mỗi mã Turnstile chỉ dùng được một lần
    if (r?.data?.session) this.open('posts', this.back);
    else if (r) this.say('Tài khoản đã tạo nhưng cần xác nhận email. Tắt "Confirm email" trong Supabase để đăng nhập ngay.');
    else if (CAPTCHA_SITE_KEY) this.login();
  }

  /* ---------- Hỏi đáp ---------- */
  async posts() {
    const r = await this.net(sb.from('posts').select('id, topic, title, created_at, profiles(display_name), replies(count)').order('created_at', { ascending: false }).limit(50));
    if (!r) return;
    const list = r.data.length
      ? `<ul class="club-list">${r.data.map((p) => `<li><button data-do="post" data-arg="${p.id}"><b>${esc(p.title)}</b><span>${TOPICS[p.topic]} · ${esc(p.profiles?.display_name || '?')} · ${when(p.created_at)} · ${p.replies[0]?.count || 0} trả lời</span></button></li>`).join('')}</ul>`
      : '<p class="lead">Chưa có câu hỏi nào. Hỏi câu đầu tiên đi.</p>';
    this.show(`<h3>${icon('chatstar')}Hỏi mới</h3>
      <div class="club-form"><select class="input" id="tp" aria-label="Chủ đề">${Object.entries(TOPICS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <input class="input" id="tt" maxlength="120" placeholder="Tiêu đề" aria-label="Tiêu đề">
      <textarea class="input" id="bd" maxlength="4000" rows="3" placeholder="Nội dung" aria-label="Nội dung"></textarea>
      <button class="btn btn-primary" data-do="ask">${icon('check')}Đăng</button></div>
      <h3>${icon('list')}Câu hỏi gần đây</h3>${list}<p class="note">${icon('info')}<span>${DISCLAIMER}</span></p>`, {
      post: (id) => this.post(+id),
      ask: async () => {
        const row = { topic: $('#tp').value, title: $('#tt').value.trim(), body: $('#bd').value.trim() };
        if (row.title.length < 3 || !row.body) return this.say('Cần tiêu đề (ít nhất 3 chữ) và nội dung.');
        if (await this.net(sb.from('posts').insert(row))) this.posts();
      },
    });
  }

  async post(id) {
    const r = await this.net(sb.from('posts').select('id, author_id, topic, title, body, created_at, profiles(display_name), replies(id, author_id, body, created_at, profiles(display_name))').eq('id', id).order('created_at', { referencedTable: 'replies' }).single());
    if (!r) return;
    const p = r.data;
    const me = (await this.user())?.id;
    const del = (kind, rid, author) => (author === me ? `<button class="btn btn-sm btn-ghost" data-do="${kind}" data-arg="${rid}">${icon('x')}Xóa</button>` : '');
    const item = (x) => `<div class="club-item"><p class="club-meta">${esc(x.profiles?.display_name || '?')} · ${when(x.created_at)}</p><p class="club-body">${esc(x.body)}</p></div>`;
    this.show(`<button class="btn btn-sm btn-ghost" data-do="list">${icon('chevron')}Danh sách</button>
      <h3>${esc(p.title)}</h3><p class="club-meta">${TOPICS[p.topic]}</p>${item(p)}${del('delPost', p.id, p.author_id)}
      <h3>${icon('talk')}Trả lời (${p.replies.length})</h3>
      ${p.replies.map((x) => item(x) + del('delReply', x.id, x.author_id)).join('')}
      <div class="club-form"><textarea class="input" id="rp" maxlength="4000" rows="3" placeholder="Viết trả lời" aria-label="Trả lời"></textarea>
      <button class="btn btn-primary" data-do="reply">${icon('check')}Gửi</button></div>
      ${p.topic === 'that' ? `<p class="note">${icon('info')}<span>${DISCLAIMER}</span></p>` : ''}`, {
      list: () => this.posts(),
      reply: async () => {
        const body = $('#rp').value.trim();
        if (!body) return this.say('Chưa có nội dung.');
        if (await this.net(sb.from('replies').insert({ post_id: id, body }))) this.post(id);
      },
      delPost: async () => { if (confirm('Xóa câu hỏi này cùng mọi trả lời?') && await this.net(sb.from('posts').delete().eq('id', id))) this.posts(); },
      delReply: async (rid) => { if (await this.net(sb.from('replies').delete().eq('id', +rid))) this.post(id); },
    });
  }

  /* ---------- Tài khoản và bản lưu ---------- */
  async account() {
    const u = await this.user();
    const r = await this.net(sb.from('profiles').select('display_name').eq('id', u.id).single());
    if (!r) return;
    const S = this.getState();
    this.show(`<p class="lead">Đăng nhập bằng <b>${esc(u.email)}</b>.${this.member ? '' : ' Mục Hỏi đáp chỉ dành cho nhóm bạn được mời; muốn vào, nhờ chủ hội thêm email này.'}</p>
      <h3>${icon('feather')}Tên trong hội</h3>
      <div class="row"><input class="input" id="dn" maxlength="40" value="${esc(r.data.display_name)}" aria-label="Tên trong hội"><button class="btn" data-do="name">${icon('check')}Lưu tên</button></div>
      <h3>${icon('notebook')}Bản lưu trên mạng</h3>
      <p>Dùng để chơi tiếp trên máy khác. Cuối mỗi ngày trong game, bản lưu tự đẩy lên.</p>
      <div class="row"><button class="btn" data-do="up"${S && !S.over ? '' : ' disabled'}>${icon('up')}Đẩy bản lưu lên</button><button class="btn" data-do="down">${icon('down')}Tải bản lưu về máy này</button></div>
      <div class="row"><button class="btn btn-ghost" data-do="out">${icon('poweroff')}Đăng xuất</button></div>`, {
      name: async () => {
        const display_name = $('#dn').value.trim();
        if (!display_name) return this.say('Tên không được trống.');
        if (await this.net(sb.from('profiles').update({ display_name }).eq('id', u.id))) this.say('Đã lưu tên.');
      },
      up: async () => { if (await this.net(pushSave(this.getState()))) this.say('Đã đẩy bản lưu lên.'); },
      down: async () => {
        const s = await this.net(pullSave());
        if (!s) return;
        if (!s.data) return this.say('Chưa có bản lưu nào trên mạng.');
        if (!confirm(`Thay ván đang chơi bằng bản lưu ngày ${s.data.data.day} của ${s.data.data.name} (lưu lúc ${when(s.data.updated_at)})?`)) return;
        this.back = null;
        this.m.close();
        this.onLoad(s.data.data);
      },
      out: async () => { if (await this.net(sb.auth.signOut())) this.open(undefined, this.back); },
    });
  }
}
