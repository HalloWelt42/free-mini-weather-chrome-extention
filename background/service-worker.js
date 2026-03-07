// ============================================================
// Free better Weather -- Background Service Worker v3.0.0
// Bright Sky API (DWD) + Nominatim Geocoding
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
  },
  cache: {},
};

let data = JSON.parse(JSON.stringify(DEFAULTS));
let currentWeather = null;

// === BADGE-FARBE (Temperaturbereich) ===
function badgeColor(temp) {
  if (temp <= -10) return '#1565C0';
  if (temp <= -5)  return '#1E88E5';
  if (temp <= 0)   return '#42A5F5';
  if (temp <= 5)   return '#4FC3F7';
  if (temp <= 10)  return '#26A69A';
  if (temp <= 15)  return '#66BB6A';
  if (temp <= 20)  return '#558B2F';
  if (temp <= 25)  return '#F9A825';
  if (temp <= 30)  return '#EF6C00';
  if (temp <= 35)  return '#E53935';
  return '#B71C1C';
}

function badgeText(temp) {
  if (temp === null || temp === undefined) return '';
  return String(Math.round(temp));
}

// === INIT ===
chrome.runtime.onInstalled.addListener((details) => {
  const version = chrome.runtime.getManifest().version;
  console.log('[Wetter] Installiert v' + version);

  // Migrate from old WeatherCache settings
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.storage.local.get('wcSettings', (old) => {
      if (old.wcSettings) {
        console.log('[Wetter] Alte wcSettings gefunden, werden entfernt');
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

// === WETTER ABRUFEN ===
async function updateWeather() {
  if (!data.settings.locations || data.settings.locations.length === 0) {
    setIcon('loading', 'symbol', null);
    chrome.action.setBadgeText({ text: '?' });
    chrome.action.setBadgeBackgroundColor({ color: '#546E7A' });
    chrome.action.setTitle({ title: i18n('appDefaultTitle') + ' -- ' + i18n('noLocation') });
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
      console.warn('[Wetter] HTTP ' + resp.status);
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

    console.log('[Wetter] Update OK: ' + weather.condition + ' ' + weather.temperature + ' C');
  } catch (err) {
    console.warn('[Wetter] Fehler: ' + err.message);
    if (cached) {
      currentWeather = cached.weather;
      applyWeather(cached.weather);
    } else {
      setIcon('error', 'symbol', null);
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#EF5350' });
      chrome.action.setTitle({ title: i18n('appDefaultTitle') + ' -- Fehler' });
    }
  }
}

// === BRIGHT SKY DATEN PARSEN ===
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

// === WETTER ANWENDEN (Icon, Badge, Tooltip) ===
function applyWeather(weather) {
  const mode = data.settings.displayMode || 'symbol-badge';

  if (mode === 'symbol-badge' || mode === 'symbol') {
    setIcon(weather.condition, 'symbol', null);
  }

  if ((mode === 'symbol-badge' || mode === 'badge-only') && weather.temperature !== null) {
    chrome.action.setBadgeText({ text: badgeText(weather.temperature) });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor(weather.temperature) });
    try { chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); } catch(e) { /* not supported in older Chrome */ }
  } else {
    chrome.action.setBadgeText({ text: '' });
  }

  if (mode === 'badge-only') {
    // Reset to default icon
    chrome.action.setIcon({ path: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    }});
  }

  chrome.action.setTitle({ title: buildTooltip(weather) });
}

// === TOOLTIP ===
function buildTooltip(w) {
  const parts = [i18n('appDefaultTitle')];
  if (w.temperature !== null) {
    parts.push(Math.round(w.temperature) + ' C');
  }
  if (w.conditionDwd) {
    parts.push(w.conditionDwd);
  }
  if (w.humidity !== null) {
    parts.push(w.humidity + '%');
  }
  if (w.windSpeed !== null) {
    parts.push(Math.round(w.windSpeed * 3.6) + ' km/h');
  }
  return parts.join(' | ');
}

// === ICON SETZEN ===
function setIcon(condition, mode, temp) {
  try {
    const imageData = createIconImageData(condition, mode, temp);
    chrome.action.setIcon({ imageData });
  } catch (err) {
    console.warn('[Wetter] Icon-Render-Fehler: ' + err.message);
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
    console.warn('[Wetter] Nominatim HTTP ' + resp.status);
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

// === i18n helper for service worker ===
function i18n(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

// === MESSAGE HANDLER ===
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'GET_SETTINGS':
      loadData().then(() => {
        // Service Worker kann von Chrome beendet werden -- currentWeather ist dann null.
        // Fallback: aus dem Cache holen.
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
        // Falls Cache stale, im Hintergrund aktualisieren
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
        // Force refresh: invalidate cache for active location
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
        console.warn('[Wetter] Stadtsuche Fehler: ' + err.message);
        sendResponse({ success: false, error: err.message });
      });
      return true;
  }
});
