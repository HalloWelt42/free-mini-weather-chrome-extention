// ============================================================
// Free better Weather -- Popup v3.3.0
// (c) HalloWelt42
// ============================================================

(function() {
  'use strict';

  // DOM refs
  const elVersion = document.getElementById('version');
  const elWeatherCard = document.getElementById('weatherCard');
  const elWeatherCanvas = document.getElementById('weatherCanvas');
  const elWeatherTemp = document.getElementById('weatherTemp');
  const elWeatherCondition = document.getElementById('weatherCondition');
  const elDetailHumidity = document.getElementById('detailHumidity');
  const elDetailWind = document.getElementById('detailWind');
  const elDetailClouds = document.getElementById('detailClouds');
  const elNoLocationMsg = document.getElementById('noLocationMsg');
  const elLocationChips = document.getElementById('locationChips');
  const elSearchInput = document.getElementById('searchInput');
  const elBtnSearch = document.getElementById('btnSearch');
  const elSearchResults = document.getElementById('searchResults');
  const elIntervalSelect = document.getElementById('intervalSelect');
  const elBtnRefresh = document.getElementById('btnRefresh');
  const elStatusMsg = document.getElementById('statusMsg');
  const elFooterCopyright = document.getElementById('footerCopyright');
  const elLinkDonate = document.getElementById('linkDonate');
  const elLinkPrivacy = document.getElementById('linkPrivacy');
  const elLinkGithub = document.getElementById('linkGithub');
  const elModeBtns = document.querySelectorAll('.mode-btn');
  const elUnitBtns = document.querySelectorAll('.unit-btn');

  // State
  let settings = {
    locations: [],
    activeLocationIndex: 0,
    displayMode: 'symbol-badge',
    updateInterval: 15,
    temperatureUnit: 'C',
  };
  let weather = null;


  // === TEMPERATURE ===
  function convertTemp(celsius) {
    if (celsius === null || celsius === undefined) return null;
    if (settings.temperatureUnit === 'F') return Math.round(celsius * 9 / 5 + 32);
    return Math.round(celsius);
  }

  function tempUnit() {
    return settings.temperatureUnit === 'F' ? 'F' : 'C';
  }

  // === INIT ===
  function init() {
    elVersion.textContent = 'v' + chrome.runtime.getManifest().version;

    var year = new Date().getFullYear();
    elFooterCopyright.textContent = i18n('footerCopyright', [String(year)]);

    elLinkDonate.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('pages/donate.html') });
    });
    elLinkPrivacy.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('pages/privacy.html') });
    });
    elLinkGithub.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/HalloWelt42/claude-limit-chrome-addon' });
    });

    elBtnSearch.addEventListener('click', doSearch);
    elSearchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doSearch();
    });

    // Auto-search as user types
    var searchTimer = null;
    elSearchInput.addEventListener('input', function() {
      clearTimeout(searchTimer);
      var val = elSearchInput.value.trim();
      if (val.length < 2) {
        elSearchResults.classList.add('hidden');
        return;
      }
      searchTimer = setTimeout(doSearch, 400);
    });

    elBtnRefresh.addEventListener('click', doRefresh);

    // Auto-save on interval change
    elIntervalSelect.addEventListener('change', function() {
      settings.updateInterval = parseInt(elIntervalSelect.value, 10) || 15;
      doSave();
    });

    // Mode buttons -- auto-save
    elModeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        elModeBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        settings.displayMode = btn.dataset.mode;
        doSave();
      });
    });

    // Unit buttons -- auto-save
    elUnitBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        elUnitBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        settings.temperatureUnit = btn.dataset.unit;
        renderWeather();
        doSave();
      });
    });

    // Load settings from background
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, function(resp) {
      if (resp && resp.success) {
        settings = { ...settings, ...resp.settings };
        weather = resp.weather;
        renderAll();
      }
    });
  }

  // === RENDER ===
  function renderAll() {
    renderWeather();
    renderLocationChips();
    renderModeButtons();
    renderUnitButtons();
    renderInterval();
    renderModePreviews();
  }

  function renderWeather() {
    if (!weather || !settings.locations || settings.locations.length === 0) {
      elWeatherTemp.textContent = '--';
      elWeatherCondition.textContent = '--';
      elDetailHumidity.textContent = '';
      elDetailWind.textContent = '';
      elDetailClouds.textContent = '';
      elNoLocationMsg.classList.remove('hidden');
      document.querySelector('.weather-main').classList.add('hidden');
      document.querySelector('.weather-details').classList.add('hidden');
      return;
    }

    elNoLocationMsg.classList.add('hidden');
    document.querySelector('.weather-main').classList.remove('hidden');
    document.querySelector('.weather-details').classList.remove('hidden');

    // Temperature
    if (weather.temperature !== null && weather.temperature !== undefined) {
      elWeatherTemp.textContent = convertTemp(weather.temperature) + '°' + tempUnit();
    } else {
      elWeatherTemp.textContent = '--';
    }

    // Condition text
    var condText = '';
    if (weather.conditionKey) {
      condText = i18n(weather.conditionKey);
    }
    elWeatherCondition.textContent = condText;

    // Details
    if (weather.humidity !== null && weather.humidity !== undefined) {
      elDetailHumidity.textContent = i18n('humidity') + ' ' + weather.humidity + '%';
    }
    if (weather.windSpeed !== null && weather.windSpeed !== undefined) {
      elDetailWind.textContent = i18n('wind') + ' ' + Math.round(weather.windSpeed) + ' km/h';
    }
    if (weather.cloudCover !== null && weather.cloudCover !== undefined) {
      elDetailClouds.textContent = i18n('clouds') + ' ' + weather.cloudCover + '%';
    }

    // Canvas icon
    renderCanvasIcon(elWeatherCanvas, 48, weather.condition || 'cloudy');
  }

  function renderCanvasIcon(canvas, size, condition, mode, temp) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    try {
      import('../shared/icon-renderer.js').then(function(module) {
        module.renderIcon(ctx, size, condition, mode || 'symbol', temp || null);
      });
    } catch (e) {
      ctx.fillStyle = '#78909C';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', size / 2, size / 2);
    }
  }

  function renderModePreviews() {
    var condition = (weather && weather.condition) ? weather.condition : 'partly-cloudy-day';
    var temp = (weather && weather.temperature !== null && weather.temperature !== undefined)
      ? convertTemp(weather.temperature) : 18;

    elModeBtns.forEach(function(btn) {
      var canvas = btn.querySelector('.mode-preview');
      if (!canvas) return;
      var mode = btn.dataset.mode;

      if (mode === 'symbol-badge') {
        renderCanvasIcon(canvas, 24, condition, 'symbol-temp', temp);
      } else if (mode === 'symbol') {
        renderCanvasIcon(canvas, 24, condition, 'symbol', null);
      } else if (mode === 'badge-only') {
        // No custom icon in badge-only mode -- leave canvas transparent
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 24, 24);
      }
    });
  }

  function renderLocationChips() {
    elLocationChips.textContent = '';
    if (!settings.locations || settings.locations.length === 0) return;

    settings.locations.forEach(function(loc, idx) {
      var chip = document.createElement('span');
      chip.className = 'location-chip' + (idx === settings.activeLocationIndex ? ' active' : '');
      chip.textContent = loc.name;

      chip.addEventListener('click', function(e) {
        if (e.target.classList.contains('chip-remove')) return;
        settings.activeLocationIndex = idx;
        renderLocationChips();
        doSave();
      });

      var remove = document.createElement('span');
      remove.className = 'chip-remove';
      remove.textContent = 'x';
      remove.addEventListener('click', function(e) {
        e.stopPropagation();
        settings.locations.splice(idx, 1);
        if (settings.activeLocationIndex >= settings.locations.length) {
          settings.activeLocationIndex = Math.max(0, settings.locations.length - 1);
        }
        renderLocationChips();
        doSave();
      });

      chip.appendChild(remove);
      elLocationChips.appendChild(chip);
    });
  }

  function renderModeButtons() {
    elModeBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === settings.displayMode);
    });
  }

  function renderUnitButtons() {
    elUnitBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.unit === settings.temperatureUnit);
    });
  }

  function renderInterval() {
    elIntervalSelect.value = String(settings.updateInterval);
  }

  // === ACTIONS ===
  function doSearch() {
    var query = elSearchInput.value.trim();
    if (!query) return;

    elBtnSearch.disabled = true;
    elBtnSearch.textContent = i18n('searchingCity');
    elSearchResults.classList.add('hidden');

    chrome.runtime.sendMessage({ type: 'SEARCH_CITY', payload: { query: query } }, function(resp) {
      elBtnSearch.disabled = false;
      elBtnSearch.textContent = i18n('btnSearch');

      if (!resp || !resp.success || !resp.results || resp.results.length === 0) {
        elSearchResults.textContent = '';
        var noRes = document.createElement('div');
        noRes.className = 'search-result-item';
        noRes.textContent = i18n('searchNoResults');
        noRes.style.color = 'var(--text-muted)';
        noRes.style.cursor = 'default';
        elSearchResults.appendChild(noRes);
        elSearchResults.classList.remove('hidden');
        return;
      }

      elSearchResults.textContent = '';
      resp.results.forEach(function(result) {
        var item = document.createElement('div');
        item.className = 'search-result-item';

        var name = document.createElement('div');
        name.className = 'result-name';
        name.textContent = result.name;
        item.appendChild(name);

        var detail = document.createElement('div');
        detail.className = 'result-detail';
        detail.textContent = result.displayName;
        item.appendChild(detail);

        item.addEventListener('click', function() {
          addLocation({
            name: result.name,
            lat: result.lat,
            lon: result.lon,
            country: result.country,
          });
          elSearchResults.classList.add('hidden');
          elSearchInput.value = '';
        });

        elSearchResults.appendChild(item);
      });
      elSearchResults.classList.remove('hidden');
    });
  }

  function addLocation(loc) {
    var isDuplicate = settings.locations.some(function(existing) {
      return existing.lat.toFixed(2) === loc.lat.toFixed(2)
          && existing.lon.toFixed(2) === loc.lon.toFixed(2);
    });
    if (isDuplicate) return;

    settings.locations.push(loc);
    settings.activeLocationIndex = settings.locations.length - 1;
    renderLocationChips();
    doSave();
  }

  function doSave() {
    settings.updateInterval = parseInt(elIntervalSelect.value, 10) || 15;

    chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      payload: settings,
    }, function(resp) {
      if (resp && resp.success) {
        weather = resp.weather;
        renderWeather();
        renderModePreviews();
      }
    });
  }

  function doRefresh() {
    elBtnRefresh.classList.add('spinning');

    chrome.runtime.sendMessage({ type: 'REFRESH' }, function(resp) {
      elBtnRefresh.classList.remove('spinning');
      if (resp && resp.success && resp.weather) {
        weather = resp.weather;
        renderWeather();
        showStatus(i18n('statusUpdated'));
      }
    });
  }

  function showStatus(msg, isError) {
    elStatusMsg.textContent = msg;
    elStatusMsg.className = 'status-msg' + (isError ? ' error' : '');
    elStatusMsg.classList.remove('hidden');
    setTimeout(function() {
      elStatusMsg.classList.add('hidden');
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
