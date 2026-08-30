// --- GLOBAL UI (settings menu, floating toggle, sync banner) ---
// Built once and persists across dashboard rebuilds - unlike per-section dashboards, none of
// this needs to be recreated when a group changes, so it lives outside buildDashboard entirely.
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
                    <option value="total_return_pct" ${metricState === 'total_return_pct' ? 'selected' : ''}>Total % Return</option>
                    <option value="portfolio_pct" ${metricState === 'portfolio_pct' ? 'selected' : ''}>Portfolio %</option>
                </select>
            </div>
            <div class="q-settings-item" style="border-top: 1px solid var(--q-border, #e2e2e4); padding-top: 12px; margin-top: 4px;">
                <button class="q-btn-sync" id="btn-sync-holdings">⟳ Sync Holdings</button>
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
            document.querySelectorAll('.quant-dashboard').forEach(d => d.remove());
        };

        document.getElementById('btn-sync-holdings').onclick = () => {
            isSyncing = true;
            SECTION_NAMES.forEach(s => syncTickers[s].clear());
            document.getElementById('q-sync-count').innerText = "0";
            document.getElementById('q-sync-banner').style.display = 'flex';
            viewState = 'native';
            saveViewState();
            menu.classList.remove('show');
            document.querySelectorAll('.quant-dashboard').forEach(d => d.remove());
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

    if (!document.getElementById('q-hover-tooltip')) {
        const tooltip = document.createElement('div');
        tooltip.id = 'q-hover-tooltip';
        tooltip.className = 'q-hover-tooltip';
        tooltip.innerHTML = `
            <div class="q-tt-row"><span class="q-tt-label">Equity</span><span id="q-tt-equity">--</span></div>
            <div class="q-tt-row"><span class="q-tt-label">Day's Return</span><span id="q-tt-day">--</span></div>
            <div class="q-tt-row"><span class="q-tt-label">Total Return</span><span id="q-tt-total">--</span></div>
        `;
        document.body.appendChild(tooltip);
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
            SECTION_NAMES.forEach(section => {
                Object.keys(groups[section]).forEach(g => {
                    groups[section][g] = groups[section][g].filter(t => syncTickers[section].has(t));
                });
            });
            saveState();
            isSyncing = false;
            banner.style.display = 'none';
            viewState = 'custom';
            saveViewState();
            document.querySelectorAll('.quant-dashboard').forEach(d => d.remove());
        };

        document.getElementById('q-sync-cancel').onclick = () => {
            isSyncing = false;
            banner.style.display = 'none';
            viewState = 'custom';
            saveViewState();
            document.querySelectorAll('.quant-dashboard').forEach(d => d.remove());
        };
    }

}
