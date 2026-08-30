/**
 * [Quant Extractor] V30 Production Architecture
 * Split across content/*.js (loaded in manifest.json order, sharing one execution context):
 *   state.js       - state model, persistence, migrations, the page-context message bridge
 *   tooltip.js     - hover tooltip (Equity / Day's Return / Total Return)
 *   styles.js      - injected CSS, global drag-cleanup safety net
 *   global-ui.js   - settings menu, floating button, sync banner (persist across dashboard rebuilds)
 *   dashboard.js   - buildDashboard(section): the per-section dashboard DOM + drag/drop
 *   sync-engine.js - syncShadowUI(): extraction, layout, and the polling loop that drives it all
 */

console.log("[Quant Extractor] Initializing V30 Build...");

// --- PAGE-CONTEXT BRIDGE ---
// inject.js is declared in manifest.json as a "world": "MAIN" content script at document_start,
// so it patches window.fetch in the page's own JS context before Robinhood's app code runs -
// it reports intercepted data back to this (isolated-world) content script via postMessage.

// symbol -> { quantity, averageBuyPrice, costBasis }, populated from the intercepted /positions/ call
let costBasis = {};
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.type !== 'RH_POSITIONS_DATA') return;
    event.data.payload.forEach(p => { if (p.symbol) costBasis[p.symbol] = p; });
});

// --- SECTION ADAPTERS ---
// Robinhood renders every holdings row through the same component shape (symbol, quantity,
// price, %, sparkline) regardless of asset class - only the outer data-testid and the link's
// URL scheme differ. Each adapter captures just that difference; extraction/rendering is shared.
const SECTIONS = {
    Stocks: {
        title: 'Stocks',
        cellTestId: 'PositionCell',
        headerTestId: 'Header-Stocks',
        parseSymbol: href => { const m = href.match(/\/stocks\/([^/?]+)/); return m ? m[1].toUpperCase() : null; },
        linkHref: symbol => `/stocks/${symbol}?source=lists_section_position`,
    },
    Crypto: {
        title: 'Crypto',
        cellTestId: 'CryptoCell',
        headerTestId: 'Header-Crypto',
        parseSymbol: href => { const m = href.match(/\/crypto\/([^/?]+)/); return m ? m[1].toUpperCase() : null; },
        linkHref: symbol => `/crypto/${symbol}`,
    },
};
const SECTION_NAMES = Object.keys(SECTIONS);
const safeId = s => s.replace(/\s+/g, '');

// --- STATE & PERSISTENCE ---
function migrateGroups(raw) {
    if (!raw) return Object.fromEntries(SECTION_NAMES.map(s => [s, { "Misc": [] }]));
    const isLegacyFlat = Object.values(raw).some(v => Array.isArray(v));
    const migrated = isLegacyFlat ? { Stocks: raw } : raw;
    SECTION_NAMES.forEach(s => {
        if (!migrated[s]) migrated[s] = {};
        if (!migrated[s]["Misc"]) migrated[s]["Misc"] = [];
    });
    return migrated;
}
function migrateGroupStates(raw) {
    const isLegacyFlat = Object.values(raw).some(v => typeof v === 'boolean');
    const migrated = isLegacyFlat ? { Stocks: raw } : raw;
    SECTION_NAMES.forEach(s => { if (!migrated[s]) migrated[s] = {}; });
    return migrated;
}

let groups = migrateGroups(JSON.parse(localStorage.getItem('rh_quant_groups')));
let groupStates = migrateGroupStates(JSON.parse(localStorage.getItem('rh_quant_states')) || {});
let viewState = localStorage.getItem('rh_quant_view') || 'custom'; // 'custom' or 'native'
let metricState = localStorage.getItem('rh_quant_metric') || 'today_gain'; // 'today_gain', 'total_value', 'portfolio_pct'

// Sync State
let isSyncing = false;
let syncTickers = Object.fromEntries(SECTION_NAMES.map(s => [s, new Set()]));

function saveState() { localStorage.setItem('rh_quant_groups', JSON.stringify(groups)); }
function saveGroupStates() { localStorage.setItem('rh_quant_states', JSON.stringify(groupStates)); }
function saveViewState() { localStorage.setItem('rh_quant_view', viewState); }
function saveMetricState() { localStorage.setItem('rh_quant_metric', metricState); }

function reorderGroups(section, draggedGroup, targetGroup) {
    if (draggedGroup === targetGroup) return;
    const sectionGroups = groups[section];
    const keys = Object.keys(sectionGroups);
    const fromIdx = keys.indexOf(draggedGroup);
    const toIdx = keys.indexOf(targetGroup);
    keys.splice(fromIdx, 1);
    keys.splice(toIdx, 0, draggedGroup);
    const reordered = {};
    keys.forEach(k => { reordered[k] = sectionGroups[k]; });
    groups[section] = reordered;
    saveState();
    const dash = document.getElementById(`quant-dashboard-${section}`);
    if (dash) dash.remove();
}

// Reads the quantity line (shares / coin qty / contracts) from a position row's link.
// Structural, not text-keyword-based, so it works across asset classes without per-adapter config.
function getQuantityText(link) {
    const leftBlock = link.firstElementChild;
    const qtyDiv = leftBlock && leftBlock.children[1];
    let text = qtyDiv ? qtyDiv.textContent.trim() : '';
    if (!text) {
        link.querySelectorAll('span').forEach(s => { if (s.textContent.toLowerCase().includes('share')) text = s.textContent.trim(); });
    }
    return text;
}
