import './ui/styles.css';
import { Game } from './core/Game.js';
import { saveGame, loadGame, clearGame } from './core/save.js';
import { TICK_MS, SPEEDS } from './config.js';
import { World } from './render/World.js';
import { renderBirdThumbnails } from './render/thumbnails.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { Hud } from './ui/Hud.js';
import { Modals } from './ui/Modals.js';

const game = new Game();
const audio = new SoundEngine();
const modals = new Modals(game, audio);
const PICK_TO_ACTION = { staple: 'staple', water: 'water', clean: 'clean', cover: 'cover', look: 'look' };
const world = new World(document.getElementById('scene'), {
  onPick: (id) => { if (!modals.isOpen() && PICK_TO_ACTION[id]) hud.trigger(PICK_TO_ACTION[id]); },
});
world.setVoice(() => audio.voiceLevel());
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
game.bus.on('report', (rep) => { saveGame(game.S); modals.report(rep, { onNext: () => game.nextDay() }); });
game.bus.on('final', (sum) => { clearGame(); modals.final(sum, { onAgain: showStart }); });
game.bus.on('over', (info) => { clearGame(); modals.over(info, { onAgain: showStart }); });

// Trình duyệt chỉ cho phát âm thanh sau thao tác đầu tiên của người chơi
for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => audio.unlock(), { capture: true });

function showStart() {
  if (!thumbs) thumbs = renderBirdThumbnails();
  modals.start({
    saved: loadGame(), thumbs,
    onNew: (sp, name) => { game.newGame(sp, name); world.setView('close'); saveGame(game.S); },
    onContinue: () => {
      game.load(loadGame());
      world.setView('close');
    },
  });
}

setInterval(() => {
  if (game.running && !modals.isOpen() && !document.hidden && hud.speed > 0) game.advance(SPEEDS[hud.speed]);
}, TICK_MS);
setInterval(() => { if (game.S && !game.S.over) saveGame(game.S); }, 15000);
window.addEventListener('pagehide', () => { if (game.S && !game.S.over) saveGame(game.S); });

showStart();

// Công cụ gỡ lỗi: mở trang với #debug để truy cập window.lt từ console
if (import.meta.env.DEV || location.hash === '#debug') window.lt = { game, world, hud, modals, audio };
