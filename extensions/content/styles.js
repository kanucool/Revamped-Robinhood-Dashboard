// --- DESIGN SYSTEM ---
const style = document.createElement('style');
style.innerHTML = `
    .quant-dashboard {
        position: absolute !important; left: 0 !important;
        width: 100% !important; box-sizing: border-box !important;
        background: var(--rh__bg-default) !important; color: var(--rh__text-color) !important;
        font-family: "Capsule Sans Text", -apple-system, system-ui, sans-serif !important;
        z-index: 100 !important;
        border-bottom: 1px solid var(--rh__divider-color) !important;
        overflow-y: auto; -ms-overflow-style: none; scrollbar-width: none;
    }
    .quant-dashboard::-webkit-scrollbar { display: none; }

    .q-dash-header { display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 0 24px !important; height: 52px !important; border-bottom: 1px solid var(--rh__divider-color) !important; }
    .q-dash-title { font-size: 15px !important; font-weight: 600 !important; margin: 0 !important; }

    .q-header-right { display: flex; align-items: center; gap: 8px; }
    .q-btn-action { background: transparent !important; color: #00C805 !important; border: 1px solid rgba(0, 200, 5, 0.5) !important; border-radius: 16px !important; padding: 4px 12px !important; font-size: 13px !important; font-weight: 600 !important; cursor: pointer !important; }

    .q-btn-sync { background: transparent; color: #00C805; border: 1px solid rgba(0, 200, 5, 0.5); width: 100%; padding: 6px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; }
    .q-btn-sync:hover { background: #00C805; color: var(--q-bg, #ffffff) !important; }

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
    .q-dropzone:empty::before { content: "Drag items here..."; color: var(--rh__text-muted, #888); font-size: 12px; text-align: center; padding-top: 8px; pointer-events: none; opacity: 0.5; }
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

    .q-hover-tooltip {
        display: none; position: fixed;
        background: var(--q-bg, #ffffff) !important; color: var(--q-text, #000) !important;
        border: 1px solid var(--q-border, #e2e2e4) !important; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2); padding: 10px 14px;
        font-size: 12px; font-family: "Capsule Sans Text", -apple-system, system-ui, sans-serif;
        z-index: 10001; pointer-events: none; white-space: nowrap;
    }
    .q-hover-tooltip.show { display: block; }
    .q-tt-row { display: flex; justify-content: space-between; gap: 16px; padding: 2px 0; }
    .q-tt-label { color: var(--rh__text-muted, #888); }
`;
document.head.appendChild(style);

const dynScrollStyle = document.createElement('style');
dynScrollStyle.id = 'q-dynamic-scroll';
document.head.appendChild(dynScrollStyle);

// Safety net: whichever element's drop/dragleave handler fires (or doesn't, due to
// nested-element dragleave quirks), always leave drag visuals in a clean state once
// the drag operation actually ends.
document.addEventListener('dragend', () => {
    document.querySelectorAll('.q-item').forEach(el => {
        el.style.opacity = '1';
        el.style.borderTop = 'none';
        el.style.borderBottom = 'none';
    });
    document.querySelectorAll('.q-group').forEach(el => {
        el.style.opacity = '1';
        el.style.borderTop = 'none';
    });
    document.querySelectorAll('.q-dropzone').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.q-summary').forEach(el => el.style.background = '');
});
