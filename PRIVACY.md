# Datenschutzerklärung / Privacy Policy

## Free better Weather -- Chrome Extension

---

### Deutsch

**Zusammenfassung:** Alle Daten werden lokal gespeichert. Kein Tracking, keine Analytics. Der Entwickler erhält keine Daten.

#### Gespeicherte Daten

Folgende Daten werden lokal in Chrome Storage gespeichert:

| Datentyp | Zweck | Speicherort |
|---|---|---|
| Standort-Einstellungen | Gesuchte Städte (Name, Koordinaten) | chrome.storage.local |
| Gecachte Wetterdaten | Temperatur, Wetterlage, Wind, etc. | chrome.storage.local |
| Anzeige-Einstellungen | Display-Modus, Update-Intervall | chrome.storage.local |

**Keine** dieser Daten wird an den Entwickler oder Dritte übermittelt.

#### Netzwerk-Anfragen

Die Extension kontaktiert ausschließlich zwei Dienste:

| Dienst | URL | Zweck | Häufigkeit |
|---|---|---|---|
| Bright Sky API | api.brightsky.dev | Wetterdaten (offene DWD-Daten) | Alle 5-60 Min (einstellbar) |
| Nominatim | nominatim.openstreetmap.org | Geocoding (Stadt -> Koordinaten) | Nur bei manueller Suche |

- Beide Dienste sind kostenlos, offen und benötigen keinen API-Key
- Es werden **keine** Cookies, Tracker oder Analytics verwendet
- Es wird **kein** ausführbarer Code von externen Servern geladen

#### Berechtigungen

| Berechtigung | Grund |
|---|---|
| `storage` | Lokale Speicherung von Einstellungen und gecachten Wetterdaten |
| `alarms` | Periodische Wetter-Updates im Hintergrund (Standard: 15 Min) |
| `host_permissions: api.brightsky.dev` | Abruf aktueller Wetterdaten (DWD Open Data) |
| `host_permissions: nominatim.openstreetmap.org` | Geocoding von Städtenamen zu Koordinaten |

#### Quellcode

Der vollständige Quellcode ist auf GitHub einsehbar und prüfbar.

---

### English

**Summary:** All data is stored locally. No tracking, no analytics. The developer receives no data.

#### Stored Data

The following data is stored locally in Chrome Storage:

| Data Type | Purpose | Storage |
|---|---|---|
| Location settings | Searched cities (name, coordinates) | chrome.storage.local |
| Cached weather data | Temperature, conditions, wind, etc. | chrome.storage.local |
| Display settings | Display mode, update interval | chrome.storage.local |

**None** of this data is transmitted to the developer or third parties.

#### Network Requests

The extension contacts only two services:

| Service | URL | Purpose | Frequency |
|---|---|---|---|
| Bright Sky API | api.brightsky.dev | Weather data (open DWD data) | Every 5-60 min (configurable) |
| Nominatim | nominatim.openstreetmap.org | Geocoding (city -> coordinates) | Only on manual search |

- Both services are free, open, and require no API key
- **No** cookies, trackers, or analytics are used
- **No** executable code is loaded from external servers

#### Permissions

| Permission | Reason |
|---|---|
| `storage` | Local storage of settings and cached weather data |
| `alarms` | Periodic weather updates in background (default: 15 min) |
| `host_permissions: api.brightsky.dev` | Fetching current weather data (DWD Open Data) |
| `host_permissions: nominatim.openstreetmap.org` | Geocoding city names to coordinates |

#### Source Code

The full source code is available and auditable on GitHub.
