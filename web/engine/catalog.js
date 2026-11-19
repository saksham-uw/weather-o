// Cities available to the engine and the state space each one is rendered in.
export const CITIES = ['toronto', 'mississauga', 'delhi', 'udaipur'];
export const TIMES = ['dawn', 'day', 'dusk', 'night'];
export const WEATHERS = ['clear', 'partly_cloudy', 'overcast', 'rain', 'thunderstorm', 'snow', 'fog'];

// Snow only where it actually snows; those cities also get "winter" variants (snow on the ground,
// frosted trees, frozen rinks) for the non-precipitating weathers.
export const SNOWY = new Set(['toronto', 'mississauga']);
const WINTER_WEATHERS = ['clear', 'partly_cloudy', 'overcast', 'fog'];

export const weathersFor = (city) => WEATHERS.filter((w) => w !== 'snow' || SNOWY.has(city));

// Every render job for a city: { time, weather, season }.
export function combos(city) {
  const out = [];
  for (const time of TIMES) {
    for (const weather of weathersFor(city)) out.push({ time, weather, season: 'normal' });
    if (SNOWY.has(city)) for (const weather of WINTER_WEATHERS) out.push({ time, weather, season: 'winter' });
  }
  return out;
}

export const fileStem = (city, { time, weather, season }) => `${city}_${time}_${weather}${season === 'winter' ? '_winter' : ''}`;

// Location data used by the Shortcut to pick the nearest city.
export const LOCATIONS = {
  toronto: { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
  mississauga: { name: 'Mississauga', lat: 43.589, lon: -79.6441 },
  delhi: { name: 'Delhi', lat: 28.6139, lon: 77.209 },
  udaipur: { name: 'Udaipur', lat: 24.5854, lon: 73.7125 },
};
