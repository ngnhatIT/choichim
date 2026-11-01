import { DAY_START, NEW_BIRD_DAYS } from '../config.js';
import { RISK_KEYS } from '../data/diseases.js';
import { SPECIES } from '../data/species.js';
import { STAGES } from '../data/stages.js';

export function newToday() {
  return {
    staple: 0, stapleW: 0, refill: false, fresh: 0, protein: 0, sauquy: 0, mineral: false,
    water: false, clean: false, dryClean: false,
    sunGood: 0, sunAll: 0, heat: 0, baths: 0, lateBath: false,
    bad: [], talks: 0, moltBad: false, moves: 0, events: {},
    tutor: 0,      // số lần nghe giọng mồi
    tutorOff: 0,   // số lần mở giọng mồi ngoài giờ chim hăng hót
    sang: 0,       // số hiệp hót
    cafe: false,   // đã đi cà phê chim hoặc hội thi (nghe chim khác hót)
    overFire: false, // đã nhắc chim quá lửa hôm nay
  };
}

export function createState({ sp, name, stage = 'truong' }) {
  const st = STAGES[stage] || STAGES.truong;
  return {
    version: 1, sp, name, stage, day: 1, t: DAY_START, weather: 'mat',
    hunger: 55, water: { level: 60, clean: 75 }, cage: 85, health: 85, mood: 40,
    trust: st.trust0, vigor: 45, feather: 75,
    song: SPECIES[sp]?.skill === 'song' ? st.song0 : 0, // giọng hót, xem data/song.js; tuổi chim: data/stages.js
    feeder: { type: null, amt: 0, days: 0, mixFrom: null, mixLeft: 0 },
    fresh: null,            // { f, age, spoiled }
    loc: 'hien',            // nơi treo cố định
    pos: 'hien',            // vị trí hiện tại ('san' khi đang phơi nắng)
    covered: true, wet: 0, sick: null, sickCount: 0,
    risk: Object.fromEntries(RISK_KEYS.map((k) => [k, 0])),
    newDays: NEW_BIRD_DAYS, lastBath: 0, lastMineral: 0, lastProtein: 0,
    words: [], talkProg: 0, sangEver: false, singUntil: 0, sayUntil: 0, say: '',
    bathFx: 0, molt: false, ownerRisk: 0, dryWarned: false,
    mix: 0,                 // "lai giọng" 0–100: chim chuyền nghe tạp âm, chim hót dở mà học sai
    coachOff: false,        // người chơi đã tắt hướng dẫn ngày đầu
    contest: null,          // kết quả hội thi { place: 0..3 (0 = không đạt giải), day }
    schedule: {}, today: newToday(), hist: [], log: [], over: false,
  };
}

/** Bổ sung trường còn thiếu cho bản lưu cũ, dùng giá trị mặc định của createState. */
export function migrateState(S) {
  const base = createState({ sp: S.sp, name: S.name });
  for (const k of Object.keys(base)) if (S[k] === undefined) S[k] = base[k];
  for (const k of ['today', 'risk', 'feeder', 'water']) {
    for (const j of Object.keys(base[k])) if (S[k][j] === undefined) S[k][j] = base[k][j];
  }
  return S;
}
