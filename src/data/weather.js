export const WEATHER = {
  mat:  { key: 'mat',  name: 'Mát',       temp: 28, hot: false, cold: false, rain: false },
  nong: { key: 'nong', name: 'Nắng nóng', temp: 36, hot: true,  cold: false, rain: false },
  mua:  { key: 'mua',  name: 'Mưa lạnh',  temp: 20, hot: false, cold: true,  rain: true  },
};

export function rollWeather(day, rng) {
  if (day === 1) return 'mat';
  const r = rng();
  return r < 0.38 ? 'mat' : r < 0.7 ? 'nong' : 'mua';
}
