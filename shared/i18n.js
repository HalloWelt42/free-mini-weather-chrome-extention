// i18n helper -- (c) HalloWelt42
// Translates DOM elements using chrome.i18n API

function i18n(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

(function() {
  document.documentElement.lang = chrome.i18n.getUILanguage();

  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });

  // SECURITY NOTE: data-i18n-html content comes exclusively from the
  // extension bundle (_locales/*.json), which is bundled at build time
  // and cannot be modified by external sources. This is NOT user input.
  document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
    var msg = chrome.i18n.getMessage(el.dataset.i18nHtml);
    if (msg) el.innerHTML = msg; // safe: extension-bundled locale strings only
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var msg = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
    if (msg) el.placeholder = msg;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
    var msg = chrome.i18n.getMessage(el.dataset.i18nTitle);
    if (msg) el.title = msg;
  });
})();
