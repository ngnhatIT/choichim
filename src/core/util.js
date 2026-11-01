export const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const pad = (n) => String(n).padStart(2, '0');
export const fmtTime = (t) => `${pad(Math.floor(t / 60))}:${pad(Math.floor(t % 60))}`;
export const hourOf = (t) => t / 60;
export const isNight = (t) => t / 60 >= 19 || t / 60 < 5.5;
