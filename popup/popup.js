// ============================================================
// Free better Weather -- Popup v3.0.0
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
  const elBtnSave = document.getElementById('btnSave');
  const elBtnRefresh = document.getElementById('btnRefresh');
  const elStatusMsg = document.getElementById('statusMsg');
  const elFooterCopyright = document.getElementById('footerCopyright');
  const elLinkDonate = document.getElementById('linkDonate');
  const elLinkPrivacy = document.getElementById('linkPrivacy');
  const elModeBtns = document.querySelectorAll('.mode-btn');

  // State
  let settings = {
    locations: [],
    activeLocationIndex: 0,
    displayMode: 'symbol-badge',
    updateInterval: 15,
  };
  let weather = null;

  // Condition display names
  const CONDITION_LABELS = {
    'dry': 'conditionDry',
    'fog': 'conditionFog',
    'rain': 'conditionRain',
    'sleet': 'conditionSleet',
    'snow': 'conditionSnow',
    'hail': 'conditionHail',
    'thunderstorm': 'conditionThunderstorm',
  };

  // === INIT ===
  function init() {
    elVersion.textContent = 'v' + chrome.runtime.getManifest().version;

    // Footer copyright with dynamic year
    var year = new Date().getFullYear();
    elFooterCopyright.textContent = i18n('footerCopyright', [String(year)]);

    // Footer links
    elLinkDonate.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('pages/donate.html') });
    });
    elLinkPrivacy.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('pages/privacy.html') });
    });

    // Event listeners
    elBtnSearch.addEventListener('click', doSearch);
    elSearchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doSearch();
    });
    elBtnSave.addEventListener('click', doSave);
    elBtnRefresh.addEventListener('click', doRefresh);

    // Mode buttons
    elModeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        elModeBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        settings.displayMode = btn.dataset.mode;
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
    renderInterval();
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
      elWeatherTemp.textContent = Math.round(weather.temperature) + ' C';
    } else {
      elWeatherTemp.textContent = '--';
    }

    // Condition text
    var condText = '';
    if (weather.conditionDwd) {
      var key = CONDITION_LABELS[weather.conditionDwd];
      condText = key ? i18n(key) : weather.conditionDwd;
    }
    elWeatherCondition.textContent = condText;

    // Details
    if (weather.humidity !== null && weather.humidity !== undefined) {
      elDetailHumidity.textContent = i18n('humidity') + ' ' + weather.humidity + '%';
    }
    if (weather.windSpeed !== null && weather.windSpeed !== undefined) {
      elDetailWind.textContent = i18n('wind') + ' ' + Math.round(weather.windSpeed * 3.6) + ' km/h';
    }
    if (weather.cloudCover !== null && weather.cloudCover !== undefined) {
      elDetailClouds.textContent = i18n('clouds') + ' ' + weather.cloudCover + '%';
    }

    // Canvas icon
    renderCanvasIcon(elWeatherCanvas, 48, weather.condition || 'cloudy');

    // Mode previews
    renderModePreviews();
  }

  function renderCanvasIcon(canvas, size, condition) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    // Import icon renderer dynamically - since we are in popup context
    // we use a simple approach: draw directly using the service worker's rendered data
    // For the popup preview, we do a simpler approach using the canvas
    try {
      // We need to dynamically import the renderer
      import('../shared/icon-renderer.js').then(function(module) {
        module.renderIcon(ctx, size, condition, 'symbol', null);
      });
    } catch (e) {
      // Fallback: simple text
      ctx.fillStyle = '#78909C';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', size / 2, size / 2);
    }
  }

  function renderModePreviews() {
    var condition = (weather && weather.condition) ? weather.condition : 'partly-cloudy-day';
    elModeBtns.forEach(function(btn) {
      var canvas = btn.querySelector('.mode-preview');
      if (canvas) {
        renderCanvasIcon(canvas, 24, condition);
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
    // Check for duplicate (same lat/lon rounded)
    var isDuplicate = settings.locations.some(function(existing) {
      return existing.lat.toFixed(2) === loc.lat.toFixed(2)
          && existing.lon.toFixed(2) === loc.lon.toFixed(2);
    });
    if (isDuplicate) return;

    settings.locations.push(loc);
    settings.activeLocationIndex = settings.locations.length - 1;
    renderLocationChips();
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
        showStatus(i18n('statusSaved'));
      } else {
        showStatus(i18n('statusError'), true);
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

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
