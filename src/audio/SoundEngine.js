import { SPECIES } from '../data/species.js';
import { songLevel } from '../data/song.js';
import { stageOf } from '../data/stages.js';
import { clamp, hourOf, isNight } from '../core/util.js';
import { play, impulse } from './synth.js';
import { compose, call, speechNotes, voiceOf, hash, R, planBout } from './songs.js';
import { SFX } from './sfx.js';
import { Ambience } from './ambience.js';

/**
 * Âm thanh của game: tiếng hót từng loài, tiếng gọi, âm thanh môi trường, hiệu ứng thao tác.
 * Tất cả tổng hợp bằng Web Audio (songs.js: ngữ pháp tiếng hót, synth.js: bộ phát nốt).
 * Trước khi người chơi chạm vào trang (unlock) mọi hàm đều im lặng, không ném lỗi.
 */

const KEY = 'longtre-audio-v1';
const BOUT = [2.5, 3, 5, 7.5, 10]; // độ dài một hiệp hót (giây thật) theo cấp giọng
const LOUD = { chaomao: 0.9, chichchoe: 1, hoami: 1, khuyen: 0.55, sao: 0.8, yenphung: 0.6 };
// Âm học từng chỗ treo lồng: [tiếng khô, vang phòng, vang ngoài trời, độ sáng dB]
const PLACE = { san: [1, 0, 0.22, 1.5], hien: [0.95, 0.1, 0.14, 0], phongkhach: [0.85, 0.32, 0, -2], bep: [0.85, 0.26, 0, -2.5] };
const rnd = (a, b) => R(Math.random, a, b);

export class SoundEngine {
  constructor() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* không có localStorage */ }
    this.muted = !!s.muted;
    this.volume = typeof s.volume === 'number' ? clamp(s.volume, 0, 1) : 0.8;
    this.ctx = null; this.S = null; this.lvl = 0;
    this.busy = 0; this.next = {}; // lúc chim rảnh tiếng, lịch các tiếng gọi
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        // Đang nghe chim (treo máy) thì vẫn phát khi chuyển sang tab khác
        if (document.hidden && !this.relaxOn) this.ctx.suspend(); else this.ctx.resume().catch(() => {});
      });
    }
  }

  /** Gọi trong thao tác của người chơi: tạo hoặc đánh thức AudioContext. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.build();
        window.speechSynthesis?.getVoices(); // nạp sẵn danh sách giọng đọc
      }
      if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {});
    } catch { /* trình duyệt không hỗ trợ: chơi không tiếng */ }
  }

  build() {
    const c = this.ctx;
    const gain = (v, to) => { const g = c.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
    const filt = (type, f) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; return x; };
    // Tổng: âm lượng -> nén chống vỡ tiếng -> loa
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -8; this.comp.knee.value = 8; this.comp.ratio.value = 12;
    this.comp.attack.value = 0.003; this.comp.release.value = 0.25;
    this.comp.connect(c.destination);
    this.master = gain(0, this.comp); this.apply();
    const verb = (buf) => { const v = c.createConvolver(); v.buffer = buf; v.connect(this.master); return v; };
    this.room = verb(impulse(c, 1.6, 3, 0.5, [[23, 0.5], [41, 0.35], [67, 0.25]])); // phòng lát gạch
    this.air = verb(impulse(c, 1.2, 4.5, 0.9, [[45, 0.3], [110, 0.15]]));           // sân, hiên: thoáng, dội tường nhẹ
    // Chim: vào -> lọc khi trùm áo -> độ sáng -> khô / vang; máy đo biên độ cho mỏ 3D
    this.an = c.createAnalyser(); this.an.fftSize = 1024; this.buf = new Float32Array(1024);
    this.birdIn = gain(0.5);
    this.muff = filt('lowpass', 20000); this.shelf = filt('highshelf', 3500);
    this.birdIn.connect(this.muff).connect(this.shelf).connect(this.an);
    this.dry = gain(1, this.master); this.toRoom = gain(0.1, this.room); this.toAir = gain(0.14, this.air);
    for (const g of [this.dry, this.toRoom, this.toAir]) this.shelf.connect(g);
    // Nghe thử: âm học cố định như ở hiên nhà
    this.prevIn = gain(0.5, this.master);
    for (const g of [this.an, gain(0.12, this.room), gain(0.15, this.air)]) this.prevIn.connect(g);
    // Hiệu ứng thao tác
    this.fxIn = gain(0.35, this.master); this.fxIn.connect(gain(0.15, this.room));
  }

  apply() {
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume ** 2, this.ctx.currentTime, 0.05);
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify({ muted: this.muted, volume: this.volume })); } catch { /* bỏ qua */ }
  }

  setMuted(m) {
    this.muted = !!m; this.save(); this.apply();
    if (this.muted) window.speechSynthesis?.cancel();
  }

  setVolume(v) { this.volume = clamp(+v || 0, 0, 1); this.save(); this.apply(); }

  get ready() { return this.ctx?.state === 'running'; }

  /** Lên lịch các nốt vào `dest`, gói trong một nút âm lượng riêng để dừng được. */
  voice(notes, dest, v = {}, gain = 1, t0 = this.ctx.currentTime + 0.08) {
    const c = this.ctx, g = c.createGain();
    g.connect(dest);
    const r = play(c, g, notes, t0, { pitch: v.pitch, tempo: v.tempo, gain });
    const mk = c.createConstantSource(); // mốc kết thúc, chạy theo đồng hồ âm thanh
    mk.offset.value = 0; mk.connect(g); mk.start(t0); mk.stop(r.end + 0.05);
    mk.addEventListener('ended', () => g.disconnect());
    return { g, mk, end: r.end, srcs: [...r.srcs, mk] };
  }

  /** Tắt dần rồi dừng một chuỗi đang phát. */
  stop(b, fade = 0.15) {
    if (!b || !this.ctx) return;
    const now = this.ctx.currentTime;
    b.g.gain.cancelScheduledValues(now);
    b.g.gain.setTargetAtTime(0, now, fade / 5);
    for (const s of b.srcs) try { s.stop(now + fade); } catch { /* đã dừng */ }
  }

  /** Chim nhà cất tiếng (hót, gọi, nói) qua đường tiếng chim. */
  bird(notes, rest = 0.3) {
    const S = this.S;
    this.stop(this.cur);
    this.cur = this.voice(notes, this.birdIn, this.v, LOUD[S.sp] ?? 0.8);
    this.vk = 1 / (LOUD[S.sp] ?? 0.8); // mỏ mở như nhau dù loài hót nhỏ hay to
    this.busy = this.cur.end + rest;
  }

  fx(notes, delay = 0) { this.voice(notes, this.fxIn, {}, 1, this.ctx.currentTime + 0.03 + delay); }

  /** Gọi mỗi khi trạng thái game đổi: bắt đầu hiệp hót, tiếng gọi, âm thanh môi trường. */
  sync(S) {
    if (!S) return;
    const sk = S.day * 2000 + (S.singUntil || 0), yk = S.day * 2000 + (S.sayUntil || 0);
    if (S !== this.S) { // ván mới hoặc vừa tải: không phát lại chuyện cũ
      this.stop(this.cur);
      Object.assign(this, { S, sk, yk, v: voiceOf(S.sp + S.name), pend: false, asleep: 0, busy: 0, next: {} });
    }
    if (sk > this.sk && S.singUntil > 0) this.pend = true; // hiệp hót mới
    const said = yk > this.yk && S.sayUntil > 0 && S.say;
    this.sk = sk; this.yk = yk;
    if (!this.ready) return; // chưa mở khóa hoặc tab đang ẩn: im lặng

    const c = this.ctx, now = c.currentTime, night = isNight(S.t);
    const key = S.pos + S.covered;
    if (this.place !== key) {
      this.place = key;
      const [dry, room, air, db] = PLACE[S.pos] || PLACE.hien;
      for (const [p, v] of [[this.dry.gain, dry], [this.toRoom.gain, room], [this.toAir.gain, air], [this.shelf.gain, db], [this.muff.frequency, S.covered ? 2200 : 20000]]) p.setTargetAtTime(v, now, 0.3);
    }
    (this.amb ||= new Ambience(c, this.master, this.air)).update(S);
    if (said) this.say(S.say);

    if (S.over || this.asleep === S.day || (S.covered && night)) { this.pend = false; return; } // ngủ: im lặng
    const canSing = !S.covered && !S.sick && !night;
    if (!canSing) this.pend = false;
    if (now < this.busy) return;
    const due = (k, a, b) => { if (now < (this.next[k] ?? 0)) return false; this.next[k] = now + rnd(a, b); return true; };
    const sp = SPECIES[S.sp];
    if (S.sick) { if (due('weak', 7, 13)) this.bird(call(S.sp, 'weak')); return; }
    if (!S.covered && (S.mood < 25 || (S.newDays > 0 && S.mood < 35))) { if (due('scare', 5, 10)) this.bird(call(S.sp, 'alarm')); return; }
    if (this.pend) { this.pend = false; this.boutNow(S); return; }
    if (S.hunger < 20 || S.water.level < 5) { if (due('beg', 2.5, 5)) this.bird(call(S.sp, 'beg')); return; }
    if (!canSing) return;
    if (sp.skill === 'talk') { // loài nói không có hiệp hót: tự líu lo khi vui
      if (S.mood > 45 && now >= (this.next.chat ?? 0)) {
        const L = clamp(Math.round((S.mood - 40) / 15), 1, 4);
        this.bird(compose(S.sp, L, { seed: this.v.seed, dur: (S.sp === 'yenphung' ? rnd(2.5, 6) : rnd(2, 4.5)) * (0.7 + 0.1 * L), young: this.young(S) }), 0.5);
        this.next.chat = this.busy + (S.sp === 'yenphung' ? rnd(4, 12) : rnd(8, 20));
      }
    } else if (due('call', 10, 25)) this.bird(call(S.sp, 'call'));
  }

  /** Độ non của giọng: chim chuyền đang tập hót, giọng vững dần theo luyện tập; chim trưởng thành đã định giọng. */
  young(S) { return S.stage === 'chuyen' ? Math.min(1, Math.max(0.25, 0.85 - 0.6 * Math.min(1, S.song / stageOf(S).songCap)) + (S.mix || 0) / 200) : 0; } // lai giọng: nghe lộn xộn hơn

  boutNow(S) {
    const L = songLevel(S.song);
    let dur = BOUT[L] * rnd(0.85, 1.15);
    if (S.sp === 'chichchoe' && hourOf(S.t) < 8) dur *= 1.25; // chích chòe hót nhiều nhất lúc sáng sớm
    this.bird(compose(S.sp, L, { seed: this.v.seed, dur, young: this.young(S) }), rnd(1.2, 3));
  }

  /** Loài nói: đọc câu bằng giọng tiếng Việt của máy nếu có, không thì nhại bằng tiếng rè theo thanh điệu. */
  say(text) {
    const ss = window.speechSynthesis, vi = ss?.getVoices().find((v) => /^vi([-_]|$)/i.test(v.lang));
    if (!vi || this.muted) { this.bird(speechNotes(text), 0.6); return; } // tắt tiếng: vẫn nhép mỏ, không đọc
    const u = new SpeechSynthesisUtterance(text);
    Object.assign(u, { voice: vi, lang: vi.lang, pitch: 1.9, rate: 1.3, volume: this.volume });
    u.onstart = () => { this.speaking = true; };
    u.onend = u.onerror = () => { this.speaking = false; };
    this.stop(this.cur); this.busy = this.ctx.currentTime + 2; // im líu lo trong lúc nói
    ss.cancel(); ss.speak(u);
  }

  /** Hiệu ứng khi người chơi làm một việc, hoặc 'event:<id>' khi có sự kiện trong nhà. */
  onAct(id, payload, S) {
    if (!this.ready || !S || S !== this.S) return;
    const r = Math.random, ev = id.startsWith('event:') && id.slice(6);
    if (ev === 'meo' || ev === 'chuot') { // hoảng: đập cánh, kêu báo động dồn dập
      this.fx(SFX.flutter(r), 0.15);
      if (ev === 'meo') this.fx(SFX.meow(r));
      if (!(S.covered && isNight(S.t))) this.bird([...call(S.sp, 'alarm'), ...call(S.sp, 'alarm').map((n) => ({ ...n, t: n.t + 0.7 }))], 1.5);
      return;
    }
    if (ev === 'treem' || ev === 'karaoke') {
      this.fx(ev === 'treem' ? SFX.knock(r) : SFX.bass(r));
      if (!S.covered) this.bird(call(S.sp, 'alarm'), 1);
      return;
    }
    if (ev === 'gio') { this.fx(SFX.gust(r)); return; }
    const fx = { staple: 'staple', fresh: 'fresh', water: 'water', bath: 'bath', sun: 'carry', move: 'carry', vet: 'carry', cover: 'cover', sleep: 'cover', wait: 'tick' }[id];
    if (fx) this.fx(SFX[fx](r));
    if (id === 'clean') this.fx(SFX.clean(r, payload?.method === 'dry'));
    if (id === 'sleep') this.asleep = S.day;
    if ((id === 'cover' && S.covered) || id === 'sleep' || id === 'vet') { this.stop(this.cur); this.pend = false; }
    if (id === 'talk') this.answer(S);
    if (id === 'tutor') this.tutor(S);
  }

  // Chim đáp lại khi được trò chuyện
  answer(S) {
    if (S.covered && isNight(S.t)) return;
    if (S.day * 2000 + S.sayUntil > this.yk && S.say) return; // sắp nói câu mới
    const k = S.newDays > 0 ? 'alarm' : S.sick ? 'weak' : 'call';
    setTimeout(() => {
      if (!this.ready || this.ctx.currentTime < this.busy) return;
      if (k === 'call' && SPECIES[S.sp].skill === 'talk') this.bird(compose(S.sp, 2, { seed: this.v.seed, dur: rnd(0.8, 1.6) }));
      else this.bird(call(S.sp, k));
    }, 450);
  }

  // Giọng mồi: phát "băng ghi âm" một con cùng loài hót hay (hơi rè, qua loa), rồi chim nhà đáp lời
  tutor(S) {
    const c = this.ctx;
    if (!this.lofi) {
      const hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), pk = c.createBiquadFilter(), sh = c.createWaveShaper(), g = c.createGain(), pn = c.createStereoPanner();
      hp.type = 'highpass'; hp.frequency.value = 450; lp.type = 'lowpass'; lp.frequency.value = 8500;
      pk.type = 'peaking'; pk.frequency.value = 2500; pk.gain.value = 4;
      sh.curve = Float32Array.from({ length: 512 }, (_, i) => Math.tanh(2.2 * ((i / 511) * 2 - 1)) / Math.tanh(2.2));
      g.gain.value = 0.75; pn.pan.value = 0.35;
      hp.connect(lp).connect(pk).connect(sh).connect(g).connect(pn).connect(this.fxIn);
      this.lofi = hp;
    }
    const t0 = c.currentTime + 0.3, notes = compose(S.sp, 4, { seed: hash('giọng mồi ' + S.sp), dur: 5 });
    const rec = this.voice(notes, this.lofi, {}, LOUD[S.sp] ?? 0.8, t0);
    this.voice([{ t: 0, d: rec.end - t0 + 0.4, f: [6000], n: 1, ft: 'highpass', e: [0, 1, 1, 1, 0], g: 0.02 }], this.lofi, {}, 1, t0 - 0.2); // tiếng xì của băng
    rec.mk.addEventListener('ended', () => {
      const S2 = this.S;
      if (S2 !== S || !this.ready || S2.covered || S2.sick || this.ctx.currentTime < this.busy) return;
      const L = songLevel(S2.song);
      this.bird(L ? compose(S2.sp, L, { seed: this.v.seed, dur: rnd(1.5, 2.5) }) : call(S2.sp, 'call'), 1);
    });
  }

  /**
   * Chế độ "Nghe chim" (treo máy): thời gian game dừng, chim hót theo nhịp thật (planBout): từng câu, nghỉ giữa câu,
   * hết hiệp thì nghỉ lâu, thỉnh thoảng gọi khẽ. Chỉ hót khi chim thật sự hót được (không trùm áo, không ốm,
   * ban ngày, đủ vui, đủ khỏe); không thì im và `relaxNote` giải thích vì sao.
   */
  setRelax(on) {
    this.relaxOn = !!on;
    clearTimeout(this.rt);
    this.plan = null; this.relaxSinging = false; this.relaxNote = '';
    // Đồng hồ nghe chim: thời gian game dừng nhưng buổi sáng vẫn trôi dần (1 phút mỗi 6 giây thật) để không hót mãi một giờ
    this.relaxAt = on ? { t: this.S?.t ?? 360, real: Date.now() } : null;
    if (on) { this.ctx?.resume().catch(() => {}); this.relaxTick(); } else if (this.ctx) this.stop(this.cur, 0.4);
  }

  /** Giờ (phút trong ngày) của đồng hồ nghe chim. */
  get relaxClock() {
    const A = this.relaxAt;
    if (!A) return this.S?.t ?? 360;
    const now = Date.now();
    let dt = (now - A.real) / 1000;
    A.real = now;
    // Ban ngày 1 phút game mỗi 6 giây thật; đêm trôi nhanh (11 tiếng chừng 3 phút) rồi sáng hôm sau chim lại hót.
    // Tính từng giây để lâu không đọc (tab ẩn) cũng không vọt qua giờ sáng.
    while (dt > 0) {
      const step = Math.min(1, dt);
      A.t += step * (isNight(A.t) || A.t >= 18.5 * 60 ? 3.5 : 1 / 6);
      if (A.t >= 1440) A.t -= 1440;
      dt -= step;
    }
    return A.t;
  }

  relaxTick() {
    if (!this.relaxOn) return;
    const S = this.S, wait = (sec) => { this.rt = setTimeout(() => this.relaxTick(), sec * 1000); };
    if (!S) { wait(1); return; }
    if (!this.ready) { this.ctx?.resume().catch(() => {}); wait(1); return; }
    const t = this.relaxClock, h = hourOf(t);
    this.amb?.update({ ...S, t });
    // Cùng điều kiện hót với mô phỏng (simulation.js): chim chỉ hót khi khỏe, no, sung, vui, dạn người, ban ngày
    const sp = SPECIES[S.sp], talk = sp.skill === 'talk', night = isNight(t) || h >= 18, easy = songLevel(S.song) < 2;
    const hungry = S.hunger <= 30 || S.water.level <= 0;
    const why = S.over ? 'Ván đã kết thúc.' : night ? 'Trời tối, chim đã ngủ. Chỉ còn tiếng dế và côn trùng đêm.'
      : S.covered ? 'Lồng đang trùm áo nên chim im lặng. Mở áo lồng để nghe chim.'
        : S.sick ? 'Chim đang ốm nên không hót, chỉ thỉnh thoảng kêu yếu.'
          : hungry ? 'Chim đói hoặc khát nên chỉ kêu đòi ăn uống, không hót. Cho ăn, thay nước rồi nghe tiếp.'
            : S.newDays > 0 ? 'Chim mới về còn nhát, chưa dám hót. Vài ngày quen nhà chim mới cất tiếng.'
              : S.health < (talk ? 50 : 70) ? 'Chim còn yếu nên không hót.'
                : S.mood < (talk ? 45 : easy ? 52 : 58) ? 'Chim chưa vui nên chưa chịu hót. Chăm cho chim vui hơn đã.'
                  : !talk && S.molt ? 'Chim đang thay lông nên ít hót, chỉ gọi khẽ.'
                    : !talk && S.vigor <= (easy ? 54 : 62) ? 'Chim đang xuống lửa nên chưa hót. Nắng sớm, mồi tươi vừa phải, ngủ đủ sẽ lên lửa.'
                      : !talk && S.trust <= (easy ? 10 : 22) ? 'Chim chưa dạn người nên chưa hót khi có người gần.' : '';
    this.relaxNote = why;
    if (why) {
      this.relaxSinging = false; this.plan = null;
      const kind = S.sick ? 'weak' : hungry ? 'beg' : 'call';
      if (!S.covered && !night && !S.over && this.ctx.currentTime >= this.busy && Math.random() < (hungry ? 0.5 : 0.2)) this.bird(call(S.sp, kind), 0.5);
      wait(2); return;
    }
    const L = talk ? clamp(Math.round((S.mood - 40) / 15), 1, 4) : songLevel(S.song);
    if (!talk && h >= 11 && h < 14.5) this.relaxNote = 'Giữa trưa chim ít hót, thường chỉ nghỉ và rỉa lông. Sáng sớm là lúc hót nhiều nhất.';
    if (!this.plan || this.plan.i >= this.plan.phrases.length) {
      if (this.plan && !this.plan.rested) { // hết hiệp: nghỉ, giữa chừng gọi khẽ một tiếng như chim thật
        this.plan.rested = true; this.relaxSinging = false;
        const rest = this.plan.rest;
        this.plan.restUntil = Date.now() + rest * 1000;
        if (!talk && Math.random() < 0.6) setTimeout(() => { if (this.relaxOn && !this.relaxSinging && this.ready && !this.relaxNote) this.bird(call(S.sp, 'call'), 0.5); }, rest * R(Math.random, 0.3, 0.7) * 1000);
      }
      // Đang nghỉ: cứ 2 giây xem lại (trời tối, trùm áo... thì dừng ngay, dòng nhắc cập nhật kịp)
      if (this.plan && Date.now() < this.plan.restUntil) { wait(Math.min(2, (this.plan.restUntil - Date.now()) / 1000)); return; }
      this.plan = { ...planBout(S.sp, L, h), i: 0 };
    }
    const p = this.plan.phrases[this.plan.i++];
    this.relaxSinging = true;
    if (S.sp === 'sao' && S.words.length && Math.random() < 0.2) this.bird(speechNotes(S.words[(Math.random() * S.words.length) | 0]), 0); // sáo chen câu đã học
    else this.bird(compose(S.sp, L, { seed: this.v.seed, dur: p.dur, young: this.young(S) }), 0);
    wait(this.cur.end - this.ctx.currentTime + p.gap);
  }

  /** Nghe thử tiếng hót một loài (màn hình chọn chim, Sổ tay). Trả về hàm dừng. */
  preview(spKey, { level = 3, onEnd } = {}) {
    this.unlock();
    this.stopPreview();
    if (!this.ctx || !LOUD[spKey]) { onEnd?.(); return () => {}; }
    const v = voiceOf(spKey), L = clamp(Math.round(level), 0, 4);
    const b = this.voice(compose(spKey, L, { seed: v.seed, dur: SPECIES[spKey].skill === 'talk' ? 5 : Math.min(8, BOUT[L]) }), this.prevIn, v, LOUD[spKey]);
    let done = false;
    const stop = () => {
      if (done) return;
      done = true; this.stop(b);
      if (this.pv === stop) this.pv = null;
      onEnd?.();
    };
    b.mk.addEventListener('ended', stop);
    this.pv = stop; this.vk = 1 / LOUD[spKey];
    return stop;
  }

  stopPreview() { this.pv?.(); }

  /** 0..1: biên độ tiếng chim đang phát (đã làm mượt), để mỏ 3D khớp tiếng. */
  voiceLevel() {
    if (!this.ready) return (this.lvl = 0);
    this.an.getFloatTimeDomainData(this.buf);
    let s = 0;
    for (let i = 0; i < this.buf.length; i++) s += this.buf[i] * this.buf[i];
    let v = Math.min(1, Math.sqrt(s / this.buf.length) * 6 * (this.vk || 1));
    if (this.speaking) { const t = performance.now(); v = Math.max(v, 0.45 + 0.35 * Math.sin(t / 47) * Math.sin(t / 19)); }
    this.lvl += (v - this.lvl) * (v > this.lvl ? 0.6 : 0.2);
    return this.lvl;
  }
}
