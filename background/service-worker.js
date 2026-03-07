// ============================================================
// Free better Weather -- Background Service Worker v3.2.1
// Bright Sky API + Nominatim Geocoding
// (c) HalloWelt42
// ============================================================

import { createIconImageData } from '../shared/icon-renderer.js';

const BRIGHT_SKY_API = 'https://api.brightsky.dev';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const STORAGE_KEY = 'wfdData';
const ALARM_NAME = 'weatherUpdate';

const DEFAULTS = {
  settings: {
    locations: [],
    activeLocationIndex: 0,
    displayMode: 'symbol-badge',
    updateInterval: 15,
    temperatureUnit: 'C',
  },
  cache: {},
};

// Condition keys for i18n tooltip
const CONDITION_I18N = {
  'dry': 'conditionDry',
  'fog': 'conditionFog',
  'rain': 'conditionRain',
  'sleet': 'conditionSleet',
  'snow': 'conditionSnow',
  'hail': 'conditionHail',
  'thunderstorm': 'conditionThunderstorm',
};

let data = JSON.parse(JSON.stringify(DEFAULTS));
let currentWeather = null;

// === BADGE COLOR (always based on Celsius) ===
function badgeColor(tempCelsius) {
  if (tempCelsius <= -10) return '#1565C0';
  if (tempCelsius <= -5)  return '#1E88E5';
  if (tempCelsius <= 0)   return '#42A5F5';
  if (tempCelsius <= 5)   return '#4FC3F7';
  if (tempCelsius <= 10)  return '#26A69A';
  if (tempCelsius <= 15)  return '#66BB6A';
  if (tempCelsius <= 20)  return '#558B2F';
  if (tempCelsius <= 25)  return '#F9A825';
  if (tempCelsius <= 30)  return '#EF6C00';
  if (tempCelsius <= 35)  return '#E53935';
  return '#B71C1C';
}

// === TEMPERATURE CONVERSION ===
function convertTemp(celsius) {
  if (celsius === null || celsius === undefined) return null;
  if (data.settings.temperatureUnit === 'F') return Math.round(celsius * 9 / 5 + 32);
  return Math.round(celsius);
}

function tempUnit() {
  return data.settings.temperatureUnit === 'F' ? 'F' : 'C';
}

function badgeText(tempCelsius) {
  if (tempCelsius === null || tempCelsius === undefined) return '';
  return String(convertTemp(tempCelsius));
}

// === INIT ===
chrome.runtime.onInstalled.addListener((details) => {
  const version = chrome.runtime.getManifest().version;
  console.log('[Weather] Installed v' + version);

  // Migrate from old settings
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.storage.local.get('wcSettings', (old) => {
      if (old.wcSettings) {
        console.log('[Weather] Old wcSettings found, removing');
        chrome.storage.local.remove('wcSettings');
      }
    });
  }

  loadData().then(() => {
    updateWeather();
    setupAlarm();
  });
});

chrome.runtime.onStartup.addListener(() => {
  loadData().then(() => {
    updateWeather();
    setupAlarm();
  });
});

// === ALARM ===
function setupAlarm() {
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: data.settings.updateInterval,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    loadData().then(() => updateWeather());
  }
});

// === STORAGE ===
async function loadData() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (stored[STORAGE_KEY]) {
    data = {
      settings: { ...DEFAULTS.settings, ...stored[STORAGE_KEY].settings },
      cache: stored[STORAGE_KEY].cache || {},
    };
  }
}

async function saveData() {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

// === CACHE ===
function cacheKey(loc) {
  return loc.lat.toFixed(2) + '_' + loc.lon.toFixed(2);
}

function getCachedWeather(loc) {
  const key = cacheKey(loc);
  return data.cache[key] || null;
}

function setCachedWeather(loc, weather) {
  const key = cacheKey(loc);
  data.cache[key] = {
    weather: weather,
    timestamp: Date.now(),
  };
}

function removeCachedWeather(loc) {
  const key = cacheKey(loc);
  delete data.cache[key];
}

function isStale(timestamp) {
  const maxAge = data.settings.updateInterval * 60 * 1000;
  return (Date.now() - timestamp) > maxAge;
}

// === FETCH WEATHER ===
async function updateWeather() {
  if (!data.settings.locations || data.settings.locations.length === 0) {
    setIcon('loading', 'symbol', null);
    chrome.action.setBadgeText({ text: '?' });
    chrome.action.setBadgeBackgroundColor({ color: '#546E7A' });
    chrome.action.setTitle({ title: i18n('noLocation') });
    return;
  }

  const idx = data.settings.activeLocationIndex || 0;
  const loc = data.settings.locations[idx];
  if (!loc) return;

  // Check cache
  const cached = getCachedWeather(loc);
  if (cached && !isStale(cached.timestamp)) {
    currentWeather = cached.weather;
    applyWeather(cached.weather);
    return;
  }

  try {
    const url = BRIGHT_SKY_API + '/current_weather?lat=' + loc.lat + '&lon=' + loc.lon;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) {
      console.warn('[Weather] HTTP ' + resp.status);
      if (cached) {
        currentWeather = cached.weather;
        applyWeather(cached.weather);
      }
      return;
    }
    const json = await resp.json();
    const weather = parseBrightSkyData(json);
    currentWeather = weather;

    setCachedWeather(loc, weather);
    await saveData();
    applyWeather(weather);

    console.log('[Weather] OK: ' + weather.condition + ' ' + convertTemp(weather.temperature) + '°' + tempUnit());
  } catch (err) {
    console.warn('[Weather] Error: ' + err.message);
    if (cached) {
      currentWeather = cached.weather;
      applyWeather(cached.weather);
    } else {
      setIcon('error', 'symbol', null);
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#EF5350' });
      chrome.action.setTitle({ title: i18n('statusError') });
    }
  }
}

// === PARSE BRIGHT SKY DATA ===
function parseBrightSkyData(json) {
  const w = json.weather;
  return {
    temperature: w.temperature ?? null,
    condition: w.icon || 'cloudy',
    conditionDwd: w.condition || null,
    humidity: w.relative_humidity ?? null,
    windSpeed: w.wind_speed_10 ?? null,
    windDir: w.wind_direction_10 ?? null,
    cloudCover: w.cloud_cover ?? null,
    dewPoint: w.dew_point ?? null,
    pressure: w.pressure_msl ?? null,
    visibility: w.visibility ?? null,
    precipitation: w.precipitation_10 ?? null,
    timestamp: w.timestamp,
  };
}

// === APPLY WEATHER (Icon, Badge, Tooltip) ===
function applyWeather(weather) {
  const mode = data.settings.displayMode || 'symbol-badge';

  if (mode === 'symbol-badge' || mode === 'symbol') {
    setIcon(weather.condition, 'symbol', null);
  }

  if ((mode === 'symbol-badge' || mode === 'badge-only') && weather.temperature !== null) {
    chrome.action.setBadgeText({ text: badgeText(weather.temperature) });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor(weather.temperature) });
    try { chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); } catch(e) {}
  } else {
    chrome.action.setBadgeText({ text: '' });
  }

  if (mode === 'badge-only') {
    setDefaultIcon();
  }

  chrome.action.setTitle({ title: buildTooltip(weather) });
}

// === TOOLTIP ===
function buildTooltip(w) {
  const parts = [];
  if (w.temperature !== null) {
    parts.push(convertTemp(w.temperature) + '°' + tempUnit());
  }
  if (w.conditionDwd) {
    const key = CONDITION_I18N[w.conditionDwd];
    parts.push(key ? i18n(key) : w.conditionDwd);
  }
  if (w.humidity !== null) {
    parts.push(w.humidity + '%');
  }
  if (w.windSpeed !== null) {
    parts.push(Math.round(w.windSpeed * 3.6) + ' km/h');
  }
  return parts.join(' | ');
}

// === SET DEFAULT ICON (for badge-only mode) ===
async function setDefaultIcon() {
  try {
    const imageData = {};
    for (const s of [16, 32]) {
      const resp = await fetch(chrome.runtime.getURL('icons/icon-' + s + '.png'));
      const blob = await resp.blob();
      const bmp = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(s, s);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      imageData[s] = ctx.getImageData(0, 0, s, s);
    }
    chrome.action.setIcon({ imageData });
  } catch (err) {
    console.warn('[Weather] Default icon error: ' + err.message);
  }
}

// === SET ICON ===
function setIcon(condition, mode, temp) {
  try {
    const imageData = createIconImageData(condition, mode, temp);
    chrome.action.setIcon({ imageData });
  } catch (err) {
    console.warn('[Weather] Icon render error: ' + err.message);
  }
}

// === CITY SEARCH (Nominatim) ===
async function searchCity(query) {
  const version = chrome.runtime.getManifest().version;
  const url = NOMINATIM_API + '/search?q=' + encodeURIComponent(query)
    + '&format=json&limit=5';

  const resp = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      'User-Agent': 'FreeBetterWeather/' + version,
    },
  });

  if (!resp.ok) {
    console.warn('[Weather] Nominatim HTTP ' + resp.status);
    return [];
  }

  const results = await resp.json();
  return results.map(function(item) {
    const nameParts = item.display_name.split(',');
    return {
      name: nameParts[0].trim(),
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      country: (nameParts[nameParts.length - 1] || '').trim(),
    };
  });
}

// === i18n helper ===
function i18n(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

// === MESSAGE HANDLER ===
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'GET_SETTINGS':
      loadData().then(() => {
        // Service worker may be terminated by Chrome -- currentWeather resets to null.
        // Fallback: restore from cache.
        if (!currentWeather && data.settings.locations && data.settings.locations.length > 0) {
          const idx = data.settings.activeLocationIndex || 0;
          const loc = data.settings.locations[idx];
          if (loc) {
            const cached = getCachedWeather(loc);
            if (cached) {
              currentWeather = cached.weather;
              applyWeather(cached.weather);
            }
          }
        }
        sendResponse({ success: true, settings: data.settings, weather: currentWeather });
        // If cache is stale, refresh in background
        if (data.settings.locations && data.settings.locations.length > 0) {
          const idx2 = data.settings.activeLocationIndex || 0;
          const loc2 = data.settings.locations[idx2];
          if (loc2) {
            const cached2 = getCachedWeather(loc2);
            if (!cached2 || isStale(cached2.timestamp)) {
              updateWeather();
            }
          }
        }
      });
      return true;

    case 'SAVE_SETTINGS':
      data.settings = { ...data.settings, ...msg.payload };
      // Clean up cache for removed locations
      const activeKeys = data.settings.locations.map(function(loc) {
        return cacheKey(loc);
      });
      Object.keys(data.cache).forEach(function(key) {
        if (activeKeys.indexOf(key) === -1) {
          delete data.cache[key];
        }
      });
      saveData().then(() => {
        setupAlarm();
        return updateWeather();
      }).then(() => {
        sendResponse({ success: true, weather: currentWeather });
      });
      return true;

    case 'REFRESH':
      loadData().then(() => {
        const idx = data.settings.activeLocationIndex || 0;
        const loc = data.settings.locations[idx];
        if (loc) {
          removeCachedWeather(loc);
        }
        return updateWeather();
      }).then(() => {
        sendResponse({ success: true, weather: currentWeather });
      });
      return true;

    case 'SEARCH_CITY':
      searchCity(msg.payload.query).then(function(results) {
        sendResponse({ success: true, results: results });
      }).catch(function(err) {
        console.warn('[Weather] City search error: ' + err.message);
        sendResponse({ success: false, error: err.message });
      });
      return true;
  }
});
