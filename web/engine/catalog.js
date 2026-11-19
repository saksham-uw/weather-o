// Cities available to the engine and the state space each one is rendered in.
export const CITIES = ['delhi', 'udaipur'];
export const TIMES = ['dawn', 'day', 'dusk', 'night'];
export const WEATHERS = ['clear', 'partly_cloudy', 'overcast', 'rain', 'thunderstorm', 'snow', 'fog'];

// Snow is skipped where it never happens.
export const NO_SNOW = new Set(['delhi', 'udaipur']);
export const weathersFor = (city) => WEATHERS.filter((w) => w !== 'snow' || !NO_SNOW.has(city));

// Location data used by the Shortcut / picker.
export const LOCATIONS = {
  delhi: { name: 'Delhi', lat: 28.6139, lon: 77.209 },
  udaipur: { name: 'Udaipur', lat: 24.5854, lon: 73.7125 },
};
