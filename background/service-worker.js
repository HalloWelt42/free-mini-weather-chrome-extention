// ============================================================
// Free better Weather -- Background Service Worker v3.3.0
// Open-Meteo API + Nominatim Geocoding
// (c) HalloWelt42
// ============================================================

import { createIconImageData } from '../shared/icon-renderer.js';

const OPEN_METEO_API = 'https://api.open-meteo.com/v1/forecast';
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

// WMO Weather Code -> icon condition
function wmoToCondition(code, isDay) {
  const day = isDay === 1;
  if (code === 0) return day ? 'clear-day' : 'clear-night';
  if (code <= 2) return day ? 'partly-cloudy-day' : 'partly-cloudy-night';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 55) return 'rain';
  if (code === 56 || code === 57) return 'sleet';
  if (code >= 61 && code <= 65) return 'rain';
  if (code === 66 || code === 67) return 'sleet';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'cloudy';
}

// WMO Weather Code -> i18n condition key
function wmoToConditionKey(code) {
  if (code <= 3) return 'conditionDry';
  if (code === 45 || code === 48) return 'conditionFog';
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'conditionSleet';
  if ((code >= 51 && code <= 55) || (code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return 'conditionRain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'conditionSnow';
  if (code >= 95) return 'conditionThunderstorm';
  return 'conditionDry';
}

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
    const url = OPEN_METEO_API
      + '?latitude=' + loc.lat + '&longitude=' + loc.lon
      + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,dew_point_2m,pressure_msl,is_day';
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
    const weather = parseOpenMeteoData(json);
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

// === PARSE OPEN-METEO DATA ===
function parseOpenMeteoData(json) {
  const c = json.current;
  const code = c.weather_code ?? 0;
  return {
    temperature: c.temperature_2m ?? null,
    condition: wmoToCondition(code, c.is_day),
    conditionKey: wmoToConditionKey(code),
    humidity: c.relative_humidity_2m ?? null,
    windSpeed: c.wind_speed_10m ?? null,
    windDir: c.wind_direction_10m ?? null,
    cloudCover: c.cloud_cover ?? null,
    dewPoint: c.dew_point_2m ?? null,
    pressure: c.pressure_msl ?? null,
    timestamp: c.time,
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
    setTransparentIcon();
  }

  chrome.action.setTitle({ title: buildTooltip(weather) });
}

// === TOOLTIP ===
function buildTooltip(w) {
  const parts = [];
  if (w.temperature !== null) {
    parts.push(convertTemp(w.temperature) + '°' + tempUnit());
  }
  if (w.conditionKey) {
    parts.push(i18n(w.conditionKey));
  }
  if (w.humidity !== null) {
    parts.push(w.humidity + '%');
  }
  if (w.windSpeed !== null) {
    parts.push(Math.round(w.windSpeed) + ' km/h');
  }
  return parts.join(' | ');
}

// === SET ICON ===
function setIcon(condition, mode, temp) {
  try {
    const imageData = createIconImageData(condition, mode, temp);
    chrome.action.setIcon({ imageData }).catch(function() {});
  } catch (err) {
    console.warn('[Weather] Icon render error: ' + err.message);
  }
}

function setTransparentIcon() {
  try {
    const imageData = {};
    for (const s of [16, 32]) {
      const canvas = new OffscreenCanvas(s, s);
      imageData[s] = canvas.getContext('2d').getImageData(0, 0, s, s);
    }
    chrome.action.setIcon({ imageData }).catch(function() {});
  } catch (err) {
    console.warn('[Weather] Icon error: ' + err.message);
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
