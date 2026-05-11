/**
 * [Quant Extractor] V29 Production Architecture
 * * CORE LOGIC:
 * 1. State Management: Persists user groups, folder states, and view preferences.
 * 2. View Toggle: Seamlessly switch between Custom Dashboard and Native Robinhood views.
 * 3. Dynamic Aggregates: Select between Today's $, Total Value, and Portfolio %.
 * 4. Hybrid Layout Engine: Dynamic bounding box prevents overlapping with Options/Crypto.
 * 5. Design Fidelity: Native typography, explicit theme syncing, and inline UI interactions.
 */

console.log("[Quant Extractor] Initializing V29 Build...");

// --- 1. STATE & PERSISTENCE ---
let groups = JSON.parse(localStorage.getItem('rh_quant_groups')) || { "Misc": [] };
if (!groups["Misc"]) groups["Misc"] = []; 

let groupStates = JSON.parse(localStorage.getItem('rh_quant_states')) || {};
let viewState = localStorage.getItem('rh_quant_view') || 'custom'; // 'custom' or 'native'
let metricState = localStorage.getItem('rh_quant_metric') || 'today_gain'; // 'today_gain', 'total_value', 'portfolio_pct'

// Sync State
let isSyncing = false;
let syncTickers = new Set();

function saveState() { localStorage.setItem('rh_quant_groups', JSON.stringify(groups)); }
function saveGroupStates() { localStorage.setItem('rh_quant_states', JSON.stringify(groupStates)); }
function saveViewState() { localStorage.setItem('rh_quant_view', viewState); }
function saveMetricState() { localStorage.setItem('rh_quant_metric', metricState); }

function reorderGroups(draggedGroup, targetGroup) {
    if (draggedGroup === targetGroup) return;
    const keys = Object.keys(groups);
    const fromIdx = keys.indexOf(draggedGroup);
    const toIdx = keys.indexOf(targetGroup);
    keys.splice(fromIdx, 1);
    keys.splice(toIdx, 0, draggedGroup);
    const newGroups = {};
    keys.forEach(k => { newGroups[k] = groups[k]; });
    groups = newGroups;
    saveState();
    const dash = document.getElementById('quant-dashboard');
    if (dash) dash.remove();
}

// --- 2. DESIGN SYSTEM ---
const style = document.createElement('style');
style.innerHTML = `
    #quant-dashboard { 
        position: absolute !important; left: 0 !important; 
        width: 100% !important; box-sizing: border-box !important; 
        background: var(--rh__bg-default) !important; color: var(--rh__text-color) !important; 
        font-family: "Capsule Sans Text", -apple-system, system-ui, sans-serif !important; 
        z-index: 100 !important; 
        overflow-y: auto; -ms-overflow-style: none; scrollbar-width: none;
    }
    #quant-dashboard::-webkit-scrollbar { display: none; }
    
    .q-dash-header { display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 0 24px !important; height: 52px !important; border-bottom: 1px solid var(--rh__divider-color) !important; }
    .q-dash-title { font-size: 15px !important; font-weight: 600 !important; margin: 0 !important; }
    
    .q-header-right { display: flex; align-items: center; gap: 8px; }
    .q-btn-action { background: transparent !important; color: #00C805 !important; border: 1px solid rgba(0, 200, 5, 0.5) !important; border-radius: 16px !important; padding: 4px 12px !important; font-size: 13px !important; font-weight: 600 !important; cursor: pointer !important; }
    
    #btn-sync-holdings {
        display: none; 
        border: 2px solid #00C805 !important;
        font-weight: 800 !important;
        margin-right: 4px !important;
        padding: 4px 8px !important;
    }

    .q-btn-settings { background: transparent; border: none; color: var(--rh__text-color); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; }
    .q-btn-settings:hover { opacity: 0.7; }

    /* GLOBAL THEMED ELEMENTS (Uses Explicit Hex Variables Synced from Robinhood via JS) */
    .q-settings-menu { display: none; position: fixed; top: 70px; right: 24px; background: var(--q-bg, #ffffff) !important; border: 1px solid var(--q-border, #e2e2e4) !important; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px; z-index: 9999; width: 220px; }
    .q-settings-menu.show { display: block; }
    .q-settings-item { display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }
    .q-settings-label { font-size: 13px; font-weight: 600; color: var(--q-text, #000) !important; cursor: default; }
    
    .q-settings-select { background: var(--q-bg, #ffffff) !important; color: var(--q-text, #000) !important; border: 1px solid var(--q-border, #e2e2e4) !important; padding: 6px 8px; border-radius: 4px; font-size: 13px; font-family: inherit; width: 100%; outline: none; cursor: pointer; }
    .q-settings-select option { background: var(--q-bg, #ffffff) !important; color: var(--q-text, #000) !important; }

    .q-btn-danger { background: transparent; color: #FF5000; border: 1px solid rgba(255, 80, 0, 0.5); margin-top: 4px; width: 100%; padding: 6px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; }
    .q-btn-danger:hover { background: #FF5000; color: var(--q-bg, #ffffff) !important; }

    .q-floating-settings { display: none; position: fixed; top: 80px; right: 24px; background: var(--q-bg, #ffffff) !important; color: var(--q-text, #000) !important; border: 1px solid var(--q-border, #e2e2e4) !important; border-radius: 50%; width: 40px; height: 40px; align-items: center; justify-content: center; cursor: pointer; z-index: 9998; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: opacity 0.2s; }
    .q-floating-settings svg { width: 20px; height: 20px; }
    .q-floating-settings:hover { opacity: 0.8; }

    .q-inline-form { display: none; padding: 12px 24px; border-bottom: 1px solid var(--rh__divider-color); }
    .q-inline-input { background: var(--rh__bg-subtle); border: 1px solid var(--rh__divider-color); color: var(--rh__text-color); padding: 8px 12px; border-radius: 6px; outline: none; font-size: 14px; width: 140px; font-family: inherit; }
    .q-btn-save { background: #00C805; color: var(--rh__bg-default, #ffffff); border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: 700; margin-left: 8px; font-size: 13px; }
    .q-btn-cancel { background: transparent; color: var(--rh__text-muted, #888); border: none; cursor: pointer; font-size: 13px; margin-left: 8px; }

    .q-group { margin: 0 !important; display: block !important;}
    .q-summary { display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 0 24px !important; height: 36px !important; cursor: grab !important; list-style: none !important; outline: none !important; border-bottom: 1px solid var(--rh__divider-color); transition: background 0.2s; }
    .q-summary::-webkit-details-marker { display: none !important; }
    .q-summary:hover { background: rgba(174, 174, 174, 0.21) !important; }
    
    .q-cat-wrap { display: flex; align-items: center; gap: 12px; pointer-events: none; }
    .q-cat-name { font-weight: 400 !important; font-size: 13px !important; color: var(--rh__text-color) !important; text-transform: uppercase; letter-spacing: -0.2px !important; }
    .q-cat-stats { font-size: 13px !important; font-weight: 500 !important; display: flex; gap: 6px; }
    
    .q-summary-right { display: flex; align-items: center; gap: 12px; pointer-events: auto; }
    .q-caret { display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease; }
    details[open] > .q-summary .q-caret { transform: rotate(180deg); }

    .q-controls { display: flex; align-items: center; }
    .q-confirm-del { display: none; align-items: center; gap: 10px; }
    .q-btn-check { color: #00C805; cursor: pointer; font-size: 15px; font-weight: bold; background:none; border:none; padding: 0;}
    .q-btn-x { color: #FF5000; cursor: pointer; font-size: 15px; font-weight: bold; background:none; border:none; padding: 0;}
    .q-btn-trash { background: transparent; border: none; color: var(--rh__text-muted, #888); cursor: pointer; font-size: 14px; padding: 0 4px; }
    .q-btn-trash:hover { color: #FF5000; }
    .q-btn-plus { background: transparent; border: none; color: var(--rh__text-muted, #888); cursor: pointer; font-size: 16px; font-weight: 600; padding: 0 4px; margin-left: 4px; }
    .q-btn-plus:hover { color: #00C805; }

    .q-dropzone { min-height: 28px !important; display: flex !important; flex-direction: column !important; padding-bottom: 4px; transition: background 0.2s; }
    .q-dropzone:empty::before { content: "Drag stocks here..."; color: var(--rh__text-muted, #888); font-size: 12px; text-align: center; padding-top: 8px; pointer-events: none; opacity: 0.5; }
    .q-dropzone.drag-over { background: rgba(0, 200, 5, 0.05) !important; border-left: 2px solid #00C805; }
    
    .q-item { 
        display: flex !important; justify-content: space-between !important; align-items: center !important; 
        padding: 0 24px !important; margin-bottom: 4px !important; height: 50px !important; cursor: grab !important; 
        background: transparent !important; box-sizing: border-box !important; width: 100% !important; overflow: hidden; 
    }
    
    .q-left { display: flex !important; flex-direction: column !important; flex-basis: 30% !important; align-items: flex-start !important; pointer-events: none; justify-content: center; gap: 2px !important; }
    .q-ticker-wrap { display: flex; align-items: center; pointer-events: auto; }
    .q-ticker { font-weight: 600 !important; font-size: 13px !important; letter-spacing: -0.4px !important; color: var(--rh__text-color) !important; text-decoration: none !important; pointer-events: auto !important; }
    .q-shares { font-size: 13px !important; font-weight: 400 !important; letter-spacing: -0.2px !important; color: var(--rh__text-muted, #888) !important; }
    
    .q-chart { display: flex !important; justify-content: center !important; align-items: center !important; flex-basis: 35% !important; pointer-events: none; }
    
    .q-right { display: flex !important; flex-direction: row !important; flex-basis: 30% !important; align-items: center !important; justify-content: flex-end !important; text-align: right !important; pointer-events: auto !important; gap: 8px !important; }
    .q-price-col { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 2px; pointer-events: none; }
    .q-btn-remove-stock { display: none; background: transparent; border: none; color: var(--rh__text-muted, #888); cursor: pointer; font-size: 14px; padding: 4px; border-radius: 4px; }
    .q-item:hover .q-btn-remove-stock { display: block; }
    .q-btn-remove-stock:hover { color: #FF5000; background: rgba(255, 80, 0, 0.1); }

    .q-price { font-weight: 400 !important; font-size: 13px !important; letter-spacing: -0.3px !important; }
    .q-percent { font-size: 13px !important; font-weight: 400 !important; letter-spacing: -0.2px !important; }
    
    .q-green { color: #00C805 !important; }
    .q-red { color: #FF5000 !important; }
`;
document.head.appendChild(style);

const dynScrollStyle = document.createElement('style');
dynScrollStyle.id = 'q-dynamic-scroll';
document.head.appendChild(dynScrollStyle);

// --- 3. UI BUILDER ---

function initGlobalUI() {
    if (!document.getElementById('q-settings-menu')) {
        const menu = document.createElement('div');
        menu.className = 'q-settings-menu';
        menu.id = 'q-settings-menu';
        menu.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--q-border, #e2e2e4); padding-bottom: 8px; margin-bottom: 8px;">
                <span style="font-weight: 600; font-size: 14px; color: var(--q-text, #000);">Settings</span>
                <button id="btn-close-settings" style="background: transparent; border: none; color: var(--rh__text-muted, #888); cursor: pointer; font-size: 16px; padding: 0;">✕</button>
            </div>
            <div class="q-settings-item">
                <span class="q-settings-label">View Mode</span>
                <select class="q-settings-select" id="q-select-view">
                    <option value="custom" ${viewState === 'custom' ? 'selected' : ''}>Quant Dashboard</option>
                    <option value="native" ${viewState === 'native' ? 'selected' : ''}>Robinhood Native</option>
                </select>
            </div>
            <div class="q-settings-item">
                <span class="q-settings-label">Group Metric</span>
                <select class="q-settings-select" id="q-select-metric">
                    <option value="today_gain" ${metricState === 'today_gain' ? 'selected' : ''}>Today's $ Gain</option>
                    <option value="total_value" ${metricState === 'total_value' ? 'selected' : ''}>Total $ Value</option>
                    <option value="portfolio_pct" ${metricState === 'portfolio_pct' ? 'selected' : ''}>Portfolio %</option>
                </select>
            </div>
            <div class="q-settings-item" style="border-top: 1px solid var(--q-border, #e2e2e4); padding-top: 12px; margin-top: 4px;">
                <button class="q-btn-danger" id="btn-reset-data">Reset Dashboard</button>
                <div class="q-confirm-del" id="ui-reset-confirm" style="justify-content: center; gap: 16px; padding: 4px 0;">
                    <button class="q-btn-check" id="btn-reset-yes">✓</button>
                    <button class="q-btn-x" id="btn-reset-no">✕</button>
                </div>
            </div>
        `;
        document.body.appendChild(menu);

        document.getElementById('btn-close-settings').onclick = () => menu.classList.remove('show');

        document.getElementById('q-select-view').onchange = (e) => { 
            viewState = e.target.value; 
            saveViewState(); 
            menu.classList.remove('show'); 
        };
        
        document.getElementById('q-select-metric').onchange = (e) => { 
            metricState = e.target.value; 
            saveMetricState(); 
            menu.classList.remove('show'); 
            const dash = document.getElementById('quant-dashboard');
            if(dash) dash.remove(); 
        };

        const resetBtn = document.getElementById('btn-reset-data');
        const resetConfirm = document.getElementById('ui-reset-confirm');
        
        resetBtn.onclick = () => { 
            resetBtn.style.display = 'none'; 
            resetConfirm.style.display = 'flex'; 
        };
        document.getElementById('btn-reset-no').onclick = () => { 
            resetConfirm.style.display = 'none'; 
            resetBtn.style.display = 'block'; 
        };
        document.getElementById('btn-reset-yes').onclick = () => {
            localStorage.removeItem('rh_quant_groups');
            localStorage.removeItem('rh_quant_states');
            localStorage.removeItem('rh_quant_view');
            localStorage.removeItem('rh_quant_metric');
            window.location.reload();
        };
    }

    if (!document.getElementById('q-floating-settings')) {
        const floatingBtn = document.createElement('div');
        floatingBtn.className = 'q-floating-settings';
        floatingBtn.id = 'q-floating-settings';
        floatingBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>`;
        document.body.appendChild(floatingBtn);

        floatingBtn.onclick = () => {
            const menu = document.getElementById('q-settings-menu');
            menu.classList.toggle('show');
        };
    }

    if (!document.getElementById('q-sync-banner')) {
        const banner = document.createElement('div');
        banner.id = 'q-sync-banner';
        banner.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; background: #00C805; color: #000; z-index: 10000; padding: 12px; justify-content: center; align-items: center; gap: 16px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        banner.innerHTML = `
            <span>Scroll through your entire native list to scan holdings. Found: <span id="q-sync-count">0</span></span>
            <button id="q-sync-complete" style="background: #000; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Finish Sync</button>
            <button id="q-sync-cancel" style="background: transparent; color: #000; border: 1px solid #000; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Cancel</button>
        `;
        document.body.appendChild(banner);

        document.getElementById('q-sync-complete').onclick = () => {
            Object.keys(groups).forEach(g => {
                groups[g] = groups[g].filter(t => syncTickers.has(t));
            });
            saveState();
            isSyncing = false;
            banner.style.display = 'none';
            viewState = 'custom';
            saveViewState();
            const dash = document.getElementById('quant-dashboard');
            if (dash) dash.remove();
        };

        document.getElementById('q-sync-cancel').onclick = () => {
            isSyncing = false;
            banner.style.display = 'none';
            viewState = 'custom';
            saveViewState();
            const dash = document.getElementById('quant-dashboard');
            if (dash) dash.remove();
        };
    }
}

function buildDashboard() {
    const dashboard = document.createElement('div');
    dashboard.id = 'quant-dashboard';
    
    dashboard.innerHTML = `
        <div class="q-dash-header">
            <span class="q-dash-title">Stocks</span>
            <div class="q-header-right">
                <button class="q-btn-action" id="btn-sync-holdings" title="Resync Sold Stocks">⟳ Sync</button>
                <button class="q-btn-action" id="btn-show-add-group">+ Add Group</button>
                <button class="q-btn-settings" id="btn-q-settings">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>
            </div>
        </div>
        <div class="q-inline-form" id="ui-add-group">
            <input type="text" class="q-inline-input" id="input-group-name" placeholder="Group Name">
            <button class="q-btn-save" id="btn-save-group">Save</button>
            <button class="q-btn-cancel" id="btn-cancel-group">Cancel</button>
        </div>
    `;

    Object.keys(groups).forEach(groupName => {
        const details = document.createElement('details');
        details.open = groupStates[groupName] !== false; 
        details.className = 'q-group';
        details.draggable = true;

        details.addEventListener('toggle', () => { groupStates[groupName] = details.open; saveGroupStates(); });
        details.addEventListener('dragstart', e => { e.dataTransfer.setData('text/category', groupName); details.style.opacity = '0.4'; });
        details.addEventListener('dragend', () => details.style.opacity = '1');
        details.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('text/category')) { e.preventDefault(); details.style.borderTop = '2px solid #00C805'; }});
        details.addEventListener('dragleave', () => details.style.borderTop = 'none');
        details.addEventListener('drop', e => {
            if (e.dataTransfer.types.includes('text/category')) { e.preventDefault(); details.style.borderTop = 'none'; reorderGroups(e.dataTransfer.getData('text/category'), groupName); }
        });

        const summary = document.createElement('summary');
        summary.className = 'q-summary';
        
        let controlsHtml = `<div class="q-controls">`;
        if (groupName !== "Misc") {
            controlsHtml += `<button class="q-btn-trash">✕</button><div class="q-confirm-del"><button class="q-btn-check">✓</button><button class="q-btn-x">✕</button></div>`;
        }
        controlsHtml += `<button class="q-btn-plus">+</button></div>`;
        
        summary.innerHTML = `
            <div class="q-cat-wrap">
                <span class="q-cat-name">${groupName}</span>
                <span class="q-cat-stats" id="q-stats-${groupName.replace(/\s+/g, '')}"></span>
            </div>
            <div class="q-summary-right">
                ${controlsHtml}
                <div class="q-caret">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 5.5L8 10L3.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
            </div>
        `;
        
        summary.addEventListener('dragover', e => {
            if (e.dataTransfer.types.includes('text/ticker')) {
                e.preventDefault();
                summary.style.background = 'rgba(0, 200, 5, 0.1)';
            }
        });
        summary.addEventListener('dragleave', () => summary.style.background = '');
        summary.addEventListener('drop', e => {
            if (e.dataTransfer.types.includes('text/ticker')) {
                e.preventDefault();
                e.stopPropagation(); 
                summary.style.background = '';
                const ticker = e.dataTransfer.getData('text/ticker');
                for (let g in groups) groups[g] = groups[g].filter(t => t !== ticker);
                groups[groupName].push(ticker); saveState();
                const item = document.getElementById(`q-item-${ticker}`);
                const dropzone = document.getElementById(`dropzone-${groupName.replace(/\s+/g, '')}`);
                if (item && dropzone) dropzone.appendChild(item);
            }
        });

        if (groupName !== "Misc") {
            const trash = summary.querySelector('.q-btn-trash');
            const confirmUI = summary.querySelector('.q-confirm-del');
            trash.onclick = (e) => { e.preventDefault(); e.stopPropagation(); trash.style.display = 'none'; confirmUI.style.display = 'flex'; };
            summary.querySelector('.q-btn-x').onclick = (e) => { e.preventDefault(); e.stopPropagation(); trash.style.display = 'block'; confirmUI.style.display = 'none'; };
            summary.querySelector('.q-btn-check').onclick = (e) => { e.preventDefault(); e.stopPropagation(); groups["Misc"].push(...groups[groupName]); delete groups[groupName]; saveState(); dashboard.remove(); };
        }
        
        details.appendChild(summary);

        const addTickerForm = document.createElement('div');
        addTickerForm.className = 'q-inline-form';
        addTickerForm.style.padding = '8px 24px';
        addTickerForm.style.background = 'rgba(0,0,0,0.02)';
        addTickerForm.innerHTML = `
            <input type="text" class="q-inline-input" placeholder="Ticker" style="width: 80px; padding: 4px 8px;">
            <button class="q-btn-save">Add</button>
            <button class="q-btn-cancel">✕</button>
        `;
        
        const plusBtn = summary.querySelector('.q-btn-plus');
        plusBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            details.open = true;
            addTickerForm.style.display = 'block';
            addTickerForm.querySelector('input').focus();
        };

        const tkrInput = addTickerForm.querySelector('input');
        const saveTkr = addTickerForm.querySelectorAll('button')[0];
        const cancelTkr = addTickerForm.querySelectorAll('button')[1];

        const doSaveTicker = (e) => {
            if(e) e.preventDefault();
            const ticker = tkrInput.value.toUpperCase().trim();
            if (ticker) {
                let isKnown = false;
                for (let g in groups) { if (groups[g].includes(ticker)) isKnown = true; }
                if (isKnown) {
                    for (let g in groups) groups[g] = groups[g].filter(t => t !== ticker);
                    groups[groupName].push(ticker);
                    saveState();
                    const dash = document.getElementById('quant-dashboard');
                    if(dash) dash.remove(); 
                }
            }
            addTickerForm.style.display = 'none';
            tkrInput.value = '';
        };

        saveTkr.onclick = doSaveTicker;
        tkrInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') doSaveTicker(e); });
        cancelTkr.onclick = (e) => { e.preventDefault(); addTickerForm.style.display = 'none'; tkrInput.value = ''; };

        details.appendChild(addTickerForm);

        const dropzone = document.createElement('div');
        dropzone.className = 'q-dropzone';
        dropzone.id = `dropzone-${groupName.replace(/\s+/g, '')}`;
        dropzone.addEventListener('dragover', e => { if(e.dataTransfer.types.includes('text/ticker')) { e.preventDefault(); dropzone.classList.add('drag-over'); }});
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', e => {
            if(e.dataTransfer.types.includes('text/ticker')) {
                e.preventDefault(); dropzone.classList.remove('drag-over');
                const ticker = e.dataTransfer.getData('text/ticker');
                for (let g in groups) groups[g] = groups[g].filter(t => t !== ticker);
                groups[groupName].push(ticker); saveState();
                const item = document.getElementById(`q-item-${ticker}`);
                if (item) dropzone.appendChild(item);
            }
        });

        groups[groupName].forEach(ticker => {
            const item = document.createElement('div');
            item.className = 'q-item'; item.id = `q-item-${ticker}`; item.draggable = true;
            item.addEventListener('dragstart', e => { e.dataTransfer.setData('text/ticker', ticker); item.style.opacity = '0.4'; });
            item.addEventListener('dragend', () => item.style.opacity = '1');
            
            item.innerHTML = `
                <div class="q-left"><div class="q-ticker-wrap"><a href="/stocks/${ticker}?source=lists_section_position" class="q-ticker">${ticker}</a></div><div class="q-shares">...</div></div>
                <div class="q-chart"></div>
                <div class="q-right">
                    <div class="q-price-col">
                        <div class="q-price">...</div>
                        <div class="q-percent">...</div>
                    </div>
                    <button class="q-btn-remove-stock" title="Remove from Dashboard">✕</button>
                </div>
            `;
            
            const rmBtn = item.querySelector('.q-btn-remove-stock');
            rmBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                for (let g in groups) groups[g] = groups[g].filter(t => t !== ticker);
                saveState();
                const dash = document.getElementById('quant-dashboard');
                if(dash) dash.remove(); 
            };

            dropzone.appendChild(item);
        });

        details.appendChild(dropzone);
        dashboard.appendChild(details);
    });
    return dashboard;
}

function syncShadowUI() {
    // --- SPA URL GUARD --- 
    // Safely disable on internal pages like /stocks/AAPL to prevent layout bugs
    if (window.location.pathname !== '/' && window.location.pathname !== '/portfolio') {
        const dash = document.getElementById('quant-dashboard');
        if (dash) dash.style.display = 'none';
        const floatingBtn = document.getElementById('q-floating-settings');
        if (floatingBtn) floatingBtn.style.display = 'none';
        return; 
    }

    initGlobalUI();

    const innerScroll = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
    if (!innerScroll) return;

    let dashboard = document.getElementById('quant-dashboard');
    if (!dashboard) {
        dashboard = buildDashboard();
        innerScroll.appendChild(dashboard); 
        
        const settingsBtn = document.getElementById('btn-q-settings');
        const settingsMenu = document.getElementById('q-settings-menu');
        if(settingsBtn) settingsBtn.onclick = () => settingsMenu.classList.toggle('show');

        document.getElementById('btn-sync-holdings').onclick = () => {
            isSyncing = true;
            syncTickers.clear();
            document.getElementById('q-sync-count').innerText = "0";
            document.getElementById('q-sync-banner').style.display = 'flex';
            viewState = 'native';
            saveViewState();
            const dash = document.getElementById('quant-dashboard');
            if (dash) dash.remove(); 
        };

        document.getElementById('btn-show-add-group').onclick = () => { document.getElementById('ui-add-group').style.display = 'block'; document.getElementById('input-group-name').focus(); };
        document.getElementById('btn-cancel-group').onclick = () => { document.getElementById('ui-add-group').style.display = 'none'; document.getElementById('input-group-name').value = ''; };
        document.getElementById('btn-save-group').onclick = () => {
            const val = document.getElementById('input-group-name').value.trim();
            if (val && !groups[val]) { groups[val] = []; saveState(); dashboard.remove(); }
        };
        document.getElementById('input-group-name').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('btn-save-group').click(); });
    }

    // --- THEME SYNC ---
    if (dashboard) {
        let dummy = document.getElementById('q-theme-dummy');
        if (!dummy) {
            dummy = document.createElement('div');
            dummy.id = 'q-theme-dummy';
            dummy.style.color = 'var(--rh__text-color)';
            dummy.style.display = 'none';
            dashboard.appendChild(dummy);
        }
        const rgb = getComputedStyle(dummy).color;
        let isDark = false;
        const match = rgb.match(/\d+/g);
        if (match && match.length >= 3) {
            isDark = parseInt(match[0]) > 128; 
        }
        document.documentElement.style.setProperty('--q-bg', isDark ? '#131315' : '#ffffff');
        document.documentElement.style.setProperty('--q-text', isDark ? '#ffffff' : '#000000');
        document.documentElement.style.setProperty('--q-border', isDark ? '#333333' : '#e2e2e4');
    }

    // --- SYNC BUTTON VISIBILITY LOGIC ---
    const syncBtn = document.getElementById('btn-sync-holdings');
    if (syncBtn && !isSyncing) {
        const prices = dashboard.querySelectorAll('.q-price');
        let ghostDetected = false;
        for (let p of prices) {
            if (p.textContent.includes('...')) {
                ghostDetected = true;
                break;
            }
        }
        syncBtn.style.display = ghostDetected ? 'inline-block' : 'none';
    }

    // --- VIEW STATE TOGGLE LOGIC ---
    const floatingBtn = document.getElementById('q-floating-settings');

    if (viewState === 'native') {
        dashboard.style.display = 'none';
        if(floatingBtn && !isSyncing) floatingBtn.style.display = 'flex';
        else if (floatingBtn) floatingBtn.style.display = 'none';

        let spacer = document.getElementById('q-phantom-spacer');
        if (spacer) spacer.style.height = '0px';
        document.getElementById('q-dynamic-scroll').innerHTML = '';
        
        Array.from(innerScroll.children).forEach(child => {
            if (child.id === 'quant-dashboard' || child.id === 'q-phantom-spacer' || child.id === 'q-theme-dummy') return;
            child.style.opacity = '1';
            child.style.pointerEvents = 'auto';
            child.style.transform = 'none';
        });
        
        if (!isSyncing) return; 
    } else {
        dashboard.style.display = 'block';
        if(floatingBtn) floatingBtn.style.display = 'none';
    }

    // --- DYNAMIC BOUNDING BOX LOGIC ---
    let stocksTop = 0;
    const stocksHeader = Array.from(innerScroll.children).find(c => c.querySelector('header') && c.innerText && c.innerText.includes('Stocks'));
    if (stocksHeader) stocksTop = parseInt(stocksHeader.style.top || '0', 10);

    let sectionBoundary = 10000;
    Array.from(innerScroll.children).forEach(c => {
        if (c === stocksHeader || c.id === 'quant-dashboard' || c.id === 'q-theme-dummy') return;
        if (c.querySelector('header')) {
            const top = parseInt(c.style.top || '0', 10);
            if (top > stocksTop && top < sectionBoundary) {
                sectionBoundary = top;
            }
        }
    });

    if (dashboard) {
        dashboard.style.setProperty('top', `${stocksTop}px`, 'important');
        if (sectionBoundary < 10000 && sectionBoundary > stocksTop) {
            dashboard.style.maxHeight = `${sectionBoundary - stocksTop}px`;
        }
    }

    const dashHeight = dashboard ? dashboard.offsetHeight : 0;
    const shift = dashHeight - (sectionBoundary - stocksTop);

    let catStats = {};
    Object.keys(groups).forEach(g => { catStats[g] = { current: 0, previous: 0, hasData: false }; });

    Array.from(innerScroll.children).forEach(child => {
        if (child.id === 'quant-dashboard' || child.id === 'q-theme-dummy') return;

        const isStocksHeader = child === stocksHeader;
        let isPortfolioPosition = false;
        
        const link = child.querySelector('a');
        if (link && link.href.includes('/stocks/') && link.href.includes('lists_section_position')) {
            isPortfolioPosition = true;
        }

        const childTop = parseInt(child.style.top || '0', 10);

        if (isStocksHeader || isPortfolioPosition) {
            
            if (viewState === 'custom') {
                child.style.opacity = '0.001';
                child.style.pointerEvents = 'none';
                child.style.transform = 'none';
            }

            if (isPortfolioPosition) {
                const ticker = link.href.split('/stocks/')[1].split('?')[0].toUpperCase();
                
                if (isSyncing) {
                    syncTickers.add(ticker);
                    document.getElementById('q-sync-count').innerText = syncTickers.size;
                    return; 
                }

                if (viewState === 'native') return;

                let sharesText = "";
                child.querySelectorAll('span').forEach(s => { 
                    if (s.innerText.toLowerCase().includes('share')) sharesText = s.innerText; 
                });
                if (sharesText === "") return; 
                
                let activeG = "Misc";
                let isKnown = false;
                for (let g in groups) { if (groups[g].includes(ticker)) { isKnown = true; activeG = g; } }
                if (!isKnown) { groups["Misc"].push(ticker); saveState(); dashboard.remove(); return; }

                const item = document.getElementById(`q-item-${ticker}`);
                if (item) {
                    const priceNode = child.querySelector('[data-testid="PriceChangeQuoteWrapper"]');
                    const pctNode = child.querySelector('[data-testid="PriceChangeValueWrapper"]');
                    
                    let price = priceNode ? priceNode.textContent : null;
                    let pct = pctNode ? pctNode.textContent : null;
                    let isFallback = false;

                    if (!price) {
                        const rightCol = child.querySelector('a').lastElementChild;
                        if(rightCol) {
                            price = rightCol.textContent; 
                            isFallback = true;
                        }
                    }

                    if (price) item.querySelector('.q-price').innerText = price;
                    else item.querySelector('.q-price').innerText = '...';

                    item.querySelector('.q-shares').innerText = sharesText;
                    
                    const pctEl = item.querySelector('.q-percent');
                    const chartContainer = item.querySelector('.q-chart');
                    const nativeSvg = child.querySelector('svg[data-testid="VisualizationsWrapper"]');

                    if (pct && !isFallback) {
                        pctEl.innerText = pct;
                        const isRed = pct.includes('-');
                        pctEl.className = `q-percent ${isRed ? 'q-red' : 'q-green'}`;
                        const colorCode = isRed ? '#FF5000' : '#00C805';

                        if (nativeSvg && chartContainer && !nativeSvg.closest('button')) {
                            let cloned = nativeSvg.cloneNode(true);
                            cloned.querySelectorAll('path').forEach(p => { if (p.getAttribute('fill') === 'none') { p.style.stroke = colorCode; p.style.strokeWidth = '1.5px'; }});
                            cloned.querySelectorAll('circle').forEach(c => c.style.fill = colorCode);
                            cloned.querySelectorAll('line').forEach(l => { l.style.stroke = 'rgba(138, 138, 142, 0.6)'; l.style.opacity = '1'; });
                            if (chartContainer.innerHTML !== cloned.outerHTML) chartContainer.innerHTML = cloned.outerHTML;
                        }
                    } else {
                        pctEl.className = 'q-percent'; 
                        if (nativeSvg && chartContainer && !nativeSvg.closest('button')) {
                            let cloned = nativeSvg.cloneNode(true);
                            cloned.querySelectorAll('path').forEach(p => { if (p.getAttribute('fill') === 'none') { p.style.stroke = 'var(--rh__text-muted, #888)'; p.style.strokeWidth = '1.5px'; }});
                            cloned.querySelectorAll('line').forEach(l => { l.style.stroke = 'rgba(138, 138, 142, 0.6)'; l.style.opacity = '1'; });
                            if (chartContainer.innerHTML !== cloned.outerHTML) chartContainer.innerHTML = cloned.outerHTML;
                        }
                    }

                    if (price && pct && !isFallback && sharesText) {
                        let p = parseFloat(price.replace(/[^0-9.-]/g, ''));
                        let s = parseFloat(sharesText.replace(/[^0-9.-]/g, ''));
                        let prc = parseFloat(pct.replace(/[^0-9.-]/g, '')) / 100;
                        if (!isNaN(p) && !isNaN(s) && !isNaN(prc)) {
                            catStats[activeG].current += (p * s);
                            catStats[activeG].previous += (p * s) / (1 + prc);
                            catStats[activeG].hasData = true;
                        }
                    }
                }
            }
        } else {
            if (viewState === 'custom') {
                if (childTop >= sectionBoundary && sectionBoundary < 10000 && shift <= 0) {
                    child.style.transform = `translateY(${shift}px)`;
                } else {
                    child.style.transform = 'none';
                }
            } else {
                child.style.transform = 'none';
            }
        }
    });

    if (viewState === 'native' || isSyncing) return;

    // --- CALCULATE DENOMINATOR FOR PORTFOLIO % ---
    let totalTrackedEquity = 0;
    Object.keys(groups).forEach(g => {
        if (catStats[g].hasData) totalTrackedEquity += catStats[g].current;
    });

    let truePortfolioValue = null;
    const mainAreaNodes = document.querySelectorAll('main header span, main h1');
    for (let node of mainAreaNodes) {
        let txt = node.textContent.trim();
        if (txt.startsWith('$')) {
            let val = parseFloat(txt.replace(/[^0-9.-]/g, ''));
            if (!isNaN(val) && val > 0) {
                truePortfolioValue = val;
                break; 
            }
        }
    }

    const denominator = truePortfolioValue || totalTrackedEquity;

    // --- UPDATE HEADER UI ---
    Object.keys(groups).forEach(g => {
        const statsEl = document.getElementById(`q-stats-${g.replace(/\s+/g, '')}`);
        if (statsEl && catStats[g].hasData) {
            let diff = catStats[g].current - catStats[g].previous;
            let pDiff = (diff / catStats[g].previous) * 100;
            let isR = diff < 0;
            let sign = isR ? '-' : '+';
            
            let primaryMetricHtml = '';
            
            if (metricState === 'today_gain') {
                let valStr = Math.abs(diff).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                primaryMetricHtml = `<span class="${isR ? 'q-red' : 'q-green'}">${sign}${valStr}</span>`;
            } else if (metricState === 'total_value') {
                let totalStr = catStats[g].current.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                primaryMetricHtml = `<span class="q-green">${totalStr}</span>`;
            } else if (metricState === 'portfolio_pct') {
                if (denominator > 0) {
                    let portPct = (catStats[g].current / denominator) * 100;
                    primaryMetricHtml = `<span class="q-green">${portPct.toFixed(2)}% of Port</span>`;
                } else {
                    primaryMetricHtml = `<span class="q-green">--.--% of Port</span>`;
                }
            }
            
            statsEl.innerHTML = `${primaryMetricHtml} <span class="${isR ? 'q-red' : 'q-green'}">${sign}${Math.abs(pDiff).toFixed(2)}%</span>`;
        } else if (statsEl && !catStats[g].hasData) {
             statsEl.innerHTML = ``; 
        }
    });
}

setInterval(syncShadowUI, 500);