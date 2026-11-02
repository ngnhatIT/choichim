import './ui/styles.css';
import { Game } from './core/Game.js';
import { saveGame, loadGame, clearGame } from './core/save.js';
import { TICK_MS } from './config.js';
import { World } from './render/World.js';
import { renderBirdThumbnails } from './render/thumbnails.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { Hud } from './ui/Hud.js';
import { Modals } from './ui/Modals.js';
import { Club } from './ui/Club.js';
import { pushSave } from './net/supabase.js';

const game = new Game({ realtime: true });
const audio = new SoundEngine();
audio.realClock = game.realtime;
const modals = new Modals(game, audio);
const PICK_TO_ACTION = { staple: 'staple', water: 'water', clean: 'clean', cover: 'cover', look: 'look' };
const world = new World(document.getElementById('scene'), {
  onPick: (id) => { if (!modals.isOpen() && PICK_TO_ACTION[id]) hud.trigger(PICK_TO_ACTION[id]); },
});
document.body.classList.toggle('lite', world.weak); // card yếu: bỏ kính mờ trên cảnh 3D
world.setVoice(() => audio.voiceLevel());
world.setSinging(() => audio.relaxSinging);
world.setClock(() => (audio.relaxOn ? audio.relaxClock : null));
const hud = new Hud(game, world, modals, audio);
let thumbs = null;

game.bus.on('change', () => { world.sync(game.S); hud.render(); audio.sync(game.S); });
game.bus.on('act', ({ id, payload }) => { audio.onAct(id, payload, game.S); world.onAct(id, payload); });
game.bus.on('log', (entry) => hud.onLog?.(entry));
game.bus.on('achievement', (list) => hud.onAchievement?.(list));
game.bus.on('event', (ev) => {
  modals.event(ev);
  audio.onAct('event:' + ev.id, null, game.S);
  world.onAct('event:' + ev.id);
});
const club = new Club(modals, {
  getState: () => game.S,
  onLoad: (S) => { game.load(S); world.setView('close'); saveGame(game.S); },
});
document.getElementById('clubBtn').addEventListener('click', () => club.open());

game.bus.on('report', (rep) => { saveGame(game.S); pushSave(game.S).catch(() => {}); modals.report(rep, { onNext: () => game.nextDay() }); });
game.bus.on('final', (sum) => { clearGame(); modals.final(sum, { onAgain: showStart }); });
game.bus.on('over', (info) => { clearGame(); modals.over(info, { onAgain: showStart }); });

// Trình duyệt chỉ cho phát âm thanh sau thao tác đầu tiên của người chơi
for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => audio.unlock(), { capture: true });

function showStart() {
  if (!thumbs) thumbs = renderBirdThumbnails();
  modals.start({
    saved: loadGame(), thumbs,
    onNew: (sp, name, stage, opts) => { game.newGame(sp, name, stage, opts); world.setView('close'); saveGame(game.S); },
    onContinue: () => {
      game.load(loadGame());
      world.setView('close');
    },
  });
}

// Đồng hồ game theo giờ máy: mỗi nhịp chạy bù phần đã trôi (kể cả lúc tắt game hay để tab nền)
setInterval(() => game.sync(), TICK_MS);
setInterval(() => { if (game.S && !game.S.over) saveGame(game.S); }, 15000);
window.addEventListener('pagehide', () => { if (game.S && !game.S.over) saveGame(game.S); });

showStart();

// Công cụ gỡ lỗi: mở trang với #debug để truy cập window.lt từ console
if (import.meta.env.DEV || location.hash === '#debug') window.lt = { game, world, hud, modals, audio };
