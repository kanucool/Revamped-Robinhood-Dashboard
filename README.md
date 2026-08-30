# Revamped Robinhood Dashboard

A Chrome extension that replaces Robinhood web's holdings list with a custom, groupable
dashboard — organize stocks and crypto into your own folders, see per-group aggregate stats,
and get an Equity / Day's Return / Total Return tooltip on hover.

## Why

Robinhood's native holdings list is a flat, ungrouped list per asset class with limited
display options. This overlays a custom UI on top of it (native data stays untouched
underneath — you can toggle back to native view any time) that adds:

- **Custom groups/folders** — drag stocks or crypto into user-defined categories, reorder
  groups and items via drag-and-drop.
- **Per-group aggregate stats** — Today's $ Gain, Total $ Value, or Portfolio % (selectable).
- **Multi-asset-class support** — stocks and crypto each get their own dashboard, driven by
  a shared implementation parameterized per asset class (see "How it works" below).
- **Hover tooltip** — Equity, Day's Return, and Total Return for any holding, sourced from
  Robinhood's own position/cost-basis data.
- **Sync** — reconcile your groups against currently-held tickers (catches sold positions)
  by scrolling through the native list once.
- **Theme-aware** — follows Robinhood's light/dark mode.

## Install (unpacked, for development)

1. `chrome://extensions`, enable **Developer mode** (top right).
2. **Load unpacked** → select the `extensions/` folder.
3. Open robinhood.com — the dashboard replaces the native Stocks/Crypto sections automatically.
4. After editing any file, reload the extension from `chrome://extensions` (a page refresh
   alone won't pick up `manifest.json` or `world: "MAIN"` script changes).

## How it works

- **`extensions/manifest.json`** declares two content scripts:
  - `inject.js` runs in the page's own JS context (`"world": "MAIN"`) at `document_start`,
    before Robinhood's app code runs. It patches `window.fetch` and `XMLHttpRequest` to
    observe (not modify) responses from Robinhood's own `/positions/` and
    `nummus.robinhood.com/holdings` endpoints, relaying position quantity/cost-basis data
    back via `postMessage`.
  - `extensions/content/*.js` (isolated world, `document_idle`) build and maintain the
    dashboard UI, polling the native DOM every 500ms to stay in sync with Robinhood's
    virtualized list. Files load in dependency order:
    - `state.js` — state model, persistence, localStorage migrations, the message bridge
      that receives data from `inject.js`.
    - `tooltip.js` — the hover tooltip.
    - `styles.js` — injected CSS and a global drag-cleanup safety net.
    - `global-ui.js` — settings menu, floating toggle, sync banner (persist across
      dashboard rebuilds).
    - `dashboard.js` — `buildDashboard(section)`: builds one section's dashboard DOM,
      including all drag/drop wiring.
    - `sync-engine.js` — `syncShadowUI()`: extracts data from the native DOM, drives the
      layout math, and the `setInterval` that keeps everything current.
- **Section adapters** (`SECTIONS` in `state.js`) let stocks and crypto share one dashboard
  implementation — each adapter just specifies which `data-testid` identifies its native rows/
  header and how to build its link, since Robinhood renders every asset class through the same
  underlying row component.
- No build step — plain JS files, loaded directly by Chrome (multiple content script files
  in the same manifest entry share one execution context, so no bundler is needed to have
  `dashboard.js` reference functions defined in `state.js`).

## Notes

- This only reads data Robinhood's own page was already fetching — it doesn't make its own
  authenticated requests or touch credentials.
- All state (your groups, view preferences) is stored in `localStorage`, scoped to
  robinhood.com — nothing leaves your browser.
