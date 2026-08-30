// --- EXTRACTION, LAYOUT, AND THE POLLING LOOP THAT DRIVES IT ALL ---
function syncShadowUI() {
    // --- SPA URL GUARD ---
    if (window.location.pathname !== '/' && window.location.pathname !== '/portfolio') {
        document.querySelectorAll('.quant-dashboard').forEach(d => d.style.display = 'none');
        const floatingBtn = document.getElementById('q-floating-settings');
        if (floatingBtn) floatingBtn.style.display = 'none';
        return;
    }

    initGlobalUI();

    const innerScroll = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
    if (!innerScroll) return;

    // Ensure a dashboard exists for each section currently present in the native list.
    SECTION_NAMES.forEach(section => {
        const hasHeader = innerScroll.querySelector(`[data-testid="${SECTIONS[section].headerTestId}"]`);
        const existing = document.getElementById(`quant-dashboard-${section}`);
        if (hasHeader && !existing) {
            innerScroll.appendChild(buildDashboard(section));
        }
    });

    const dashboards = Object.fromEntries(SECTION_NAMES.map(s => [s, document.getElementById(`quant-dashboard-${s}`)]).filter(([, el]) => el));

    // --- THEME SYNC ---
    // Lives inside the native innerScroll container (not document.body) so it inherits
    // --rh__text-color from wherever Robinhood actually scopes its theme variables, and
    // persists across dashboard rebuilds since innerScroll itself is never removed.
    let dummy = document.getElementById('q-theme-dummy');
    if (!dummy) {
        dummy = document.createElement('div');
        dummy.id = 'q-theme-dummy';
        dummy.style.color = 'var(--rh__text-color)';
        dummy.style.display = 'none';
        innerScroll.appendChild(dummy);
    }
    if (dummy) {
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

    // --- VIEW STATE TOGGLE LOGIC ---
    const floatingBtn = document.getElementById('q-floating-settings');

    if (viewState === 'native') {
        Object.values(dashboards).forEach(d => d.style.display = 'none');
        if(floatingBtn && !isSyncing) floatingBtn.style.display = 'flex';
        else if (floatingBtn) floatingBtn.style.display = 'none';

        document.getElementById('q-dynamic-scroll').innerHTML = '';

        Array.from(innerScroll.children).forEach(child => {
            if (child.classList.contains('quant-dashboard') || child.id === 'q-theme-dummy') return;
            child.style.opacity = '1';
            child.style.pointerEvents = 'auto';
            child.style.transform = 'none';
        });

        if (!isSyncing) return;
    } else {
        Object.values(dashboards).forEach(d => d.style.display = 'block');
        if(floatingBtn) floatingBtn.style.display = 'none';
    }

    // --- MULTI-SECTION BOUNDING BOX LOGIC ---
    const getTop = el => parseInt(el.style.top || '0', 10);

    const allHeaders = Array.from(innerScroll.children)
        .filter(c => c.dataset && c.dataset.testid && c.dataset.testid.startsWith('Header-'))
        .sort((a, b) => getTop(a) - getTop(b));

    let catStats = {};
    SECTION_NAMES.forEach(section => {
        catStats[section] = {};
        Object.keys(groups[section]).forEach(g => { catStats[section][g] = { current: 0, previous: 0, hasData: false }; });
    });

    // Cumulative vertical shift introduced by custom dashboards that are shorter than the
    // native section they replace; breakpoints apply it to everything past that section.
    const managedHeaderEls = new Set();
    const breakpoints = [];
    let runningShift = 0;

    allHeaders.forEach((header, i) => {
        const name = header.dataset.testid.replace('Header-', '');
        const top = getTop(header);
        const boundary = (i + 1 < allHeaders.length) ? getTop(allHeaders[i + 1]) : 10000;

        if (SECTIONS[name]) {
            managedHeaderEls.add(header);
            const dash = dashboards[name];
            if (dash && viewState === 'custom') {
                dash.style.setProperty('top', `${top + runningShift}px`, 'important');
                // No maxHeight cap: a section's dashboard grows to fit its expanded content
                // (folders can need more room than the native row count implies) and pushes
                // everything below it down/up via the shift below, rather than clipping/scrolling.
                dash.style.maxHeight = 'none';
                const delta = dash.offsetHeight - (boundary - top);
                runningShift += delta;
                breakpoints.push({ after: boundary, shift: runningShift });
            }
        }
    });

    function shiftFor(top) {
        let s = 0;
        for (const bp of breakpoints) { if (top >= bp.after) s = bp.shift; }
        return s;
    }

    Array.from(innerScroll.children).forEach(child => {
        if (child.classList.contains('quant-dashboard') || child.id === 'q-theme-dummy') return;

        const childTop = getTop(child);
        const isManagedHeader = managedHeaderEls.has(child);
        const testid = child.dataset && child.dataset.testid;
        const matchedSection = testid ? SECTION_NAMES.find(n => SECTIONS[n].cellTestId === testid) : null;

        if (isManagedHeader || matchedSection) {

            if (viewState === 'custom') {
                child.style.opacity = '0.001';
                child.style.pointerEvents = 'none';
                child.style.transform = 'none';
            }

            if (matchedSection) {
                const link = child.querySelector('a');
                const symbol = link ? SECTIONS[matchedSection].parseSymbol(link.href) : null;
                if (!symbol) return;

                if (isSyncing) {
                    syncTickers[matchedSection].add(symbol);
                    document.getElementById('q-sync-count').innerText = SECTION_NAMES.reduce((sum, s) => sum + syncTickers[s].size, 0);
                    return;
                }

                if (viewState === 'native') return;

                const quantityText = getQuantityText(link);
                if (!quantityText) return;

                const sectionGroups = groups[matchedSection];
                let activeG = "Misc";
                let isKnown = false;
                for (let g in sectionGroups) { if (sectionGroups[g].includes(symbol)) { isKnown = true; activeG = g; } }
                if (!isKnown) {
                    sectionGroups["Misc"].push(symbol); saveState();
                    const dash = document.getElementById(`quant-dashboard-${matchedSection}`);
                    if (dash) dash.remove();
                    return;
                }

                const item = document.getElementById(`q-item-${matchedSection}-${symbol}`);
                if (item) {
                    const priceNode = child.querySelector('[data-testid="PriceChangeQuoteWrapper"]');
                    const pctNode = child.querySelector('[data-testid="PriceChangeValueWrapper"]');

                    let price = priceNode ? priceNode.textContent : null;
                    let pct = pctNode ? pctNode.textContent : null;
                    let isFallback = false;

                    if (!price) {
                        const rightCol = link.lastElementChild;
                        if(rightCol) {
                            price = rightCol.textContent;
                            isFallback = true;
                        }
                    }

                    if (price) item.querySelector('.q-price').innerText = price;
                    else item.querySelector('.q-price').innerText = '...';

                    item.querySelector('.q-shares').innerText = quantityText;

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

                    if (price && pct && !isFallback && quantityText) {
                        let p = parseFloat(price.replace(/[^0-9.-]/g, ''));
                        let s = parseFloat(quantityText.replace(/[^0-9.-]/g, ''));
                        let prc = parseFloat(pct.replace(/[^0-9.-]/g, '')) / 100;
                        if (!isNaN(p) && !isNaN(s) && !isNaN(prc)) {
                            catStats[matchedSection][activeG].current += (p * s);
                            catStats[matchedSection][activeG].previous += (p * s) / (1 + prc);
                            catStats[matchedSection][activeG].hasData = true;
                        }
                    }
                }
            }
        } else {
            if (viewState === 'custom') {
                const s = shiftFor(childTop);
                child.style.transform = s !== 0 ? `translateY(${s}px)` : 'none';
            } else {
                child.style.transform = 'none';
            }
        }
    });

    if (viewState === 'native' || isSyncing) return;

    // --- CALCULATE DENOMINATOR FOR PORTFOLIO % (across all sections) ---
    let totalTrackedEquity = 0;
    SECTION_NAMES.forEach(section => {
        Object.keys(catStats[section]).forEach(g => {
            if (catStats[section][g].hasData) totalTrackedEquity += catStats[section][g].current;
        });
    });

    let buyingPower = 0;
    const mainAreaNodes = document.querySelectorAll('main header span, main h1');
    for (let node of mainAreaNodes) {
        let txt = node.textContent.trim();
        // Skip Robinhood's single-character odometer spans by ensuring string length > 2
        if (txt.startsWith('$') && txt.length > 2) {
            let val = parseFloat(txt.replace(/[^0-9.-]/g, ''));
            if (!isNaN(val) && val > 0) {
                buyingPower = val;
                break;
            }
        }
    }

    const denominator = totalTrackedEquity + buyingPower;

    // --- UPDATE HEADER UI ---
    SECTION_NAMES.forEach(section => {
        Object.keys(groups[section]).forEach(g => {
            const statsEl = document.getElementById(`q-stats-${section}-${safeId(g)}`);
            const stat = catStats[section][g];
            if (statsEl && stat && stat.hasData) {
                let diff = stat.current - stat.previous;
                let pDiff = (diff / stat.previous) * 100;
                let isR = diff < 0;
                let sign = isR ? '-' : '+';

                let primaryMetricHtml = '';

                if (metricState === 'today_gain') {
                    let valStr = Math.abs(diff).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                    primaryMetricHtml = `<span class="${isR ? 'q-red' : 'q-green'}">${sign}${valStr}</span>`;
                } else if (metricState === 'total_value') {
                    let totalStr = stat.current.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                    primaryMetricHtml = `<span class="q-green">${totalStr}</span>`;
                } else if (metricState === 'portfolio_pct') {
                    if (denominator > 0) {
                        let portPct = (stat.current / denominator) * 100;
                        primaryMetricHtml = `<span class="q-green">${portPct.toFixed(2)}%</span>`;
                    } else {
                        primaryMetricHtml = `<span class="q-green">--.--%</span>`;
                    }
                }

                statsEl.innerHTML = `${primaryMetricHtml} <span class="${isR ? 'q-red' : 'q-green'}">${sign}${Math.abs(pDiff).toFixed(2)}%</span>`;
            } else if (statsEl && (!stat || !stat.hasData)) {
                statsEl.innerHTML = ``;
            }
        });
    });
}

setInterval(syncShadowUI, 500);
