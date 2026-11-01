import { SAVE_KEY } from '../config.js';
export function saveGame(S) { try { if (S) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* bộ nhớ không khả dụng */ } }
export function loadGame() { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
export function clearGame() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* bỏ qua */ } }
