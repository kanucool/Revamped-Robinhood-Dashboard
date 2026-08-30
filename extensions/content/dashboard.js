// --- PER-SECTION DASHBOARD ---
function buildDashboard(section) {
    const config = SECTIONS[section];
    const sectionGroups = groups[section];
    // DataTransfer.setData lowercases its format string, so the type must already be lowercase
    // or a same-case comparison against dataTransfer.types will always fail.
    const dragTickerType = `text/ticker-${section.toLowerCase()}`;
    const dragCategoryType = `text/category-${section.toLowerCase()}`;

    const dashboard = document.createElement('div');
    dashboard.className = 'quant-dashboard';
    dashboard.id = `quant-dashboard-${section}`;

    dashboard.innerHTML = `
        <div class="q-dash-header">
            <span class="q-dash-title">${config.title}</span>
            <div class="q-header-right">
                <button class="q-btn-action q-btn-add-group" title="Add Group">+</button>
                <button class="q-btn-settings q-btn-open-settings">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>
            </div>
        </div>
        <div class="q-inline-form q-add-group-form">
            <input type="text" class="q-inline-input q-input-group-name" placeholder="Group Name">
            <button class="q-btn-save">Save</button>
            <button class="q-btn-cancel">Cancel</button>
        </div>
    `;

    dashboard.querySelector('.q-btn-open-settings').onclick = () => {
        const menu = document.getElementById('q-settings-menu');
        if (menu) menu.classList.toggle('show');
    };

    const addGroupForm = dashboard.querySelector('.q-add-group-form');
    const groupNameInput = addGroupForm.querySelector('.q-input-group-name');
    dashboard.querySelector('.q-btn-add-group').onclick = () => { addGroupForm.style.display = 'block'; groupNameInput.focus(); };
    addGroupForm.querySelector('.q-btn-cancel').onclick = () => { addGroupForm.style.display = 'none'; groupNameInput.value = ''; };
    const saveGroupBtn = addGroupForm.querySelector('.q-btn-save');
    saveGroupBtn.onclick = () => {
        const val = groupNameInput.value.trim();
        if (val && !sectionGroups[val]) { sectionGroups[val] = []; saveState(); dashboard.remove(); }
    };
    groupNameInput.addEventListener('keypress', e => { if (e.key === 'Enter') saveGroupBtn.click(); });

    Object.keys(sectionGroups).forEach(groupName => {
        const details = document.createElement('details');
        details.open = groupStates[section][groupName] !== false;
        details.className = 'q-group';
        details.draggable = true;

        details.addEventListener('toggle', () => { groupStates[section][groupName] = details.open; saveGroupStates(); });
        details.addEventListener('dragstart', e => { e.dataTransfer.setData(dragCategoryType, groupName); details.style.opacity = '0.4'; });
        details.addEventListener('dragend', () => details.style.opacity = '1');
        details.addEventListener('dragover', e => { if (e.dataTransfer.types.includes(dragCategoryType)) { e.preventDefault(); details.style.borderTop = '2px solid #00C805'; }});
        details.addEventListener('dragleave', () => details.style.borderTop = 'none');
        details.addEventListener('drop', e => {
            if (e.dataTransfer.types.includes(dragCategoryType)) { e.preventDefault(); details.style.borderTop = 'none'; reorderGroups(section, e.dataTransfer.getData(dragCategoryType), groupName); }
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
                <span class="q-cat-stats" id="q-stats-${section}-${safeId(groupName)}"></span>
            </div>
            <div class="q-summary-right">
                ${controlsHtml}
                <div class="q-caret">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 5.5L8 10L3.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
            </div>
        `;

        summary.addEventListener('dragover', e => {
            if (e.dataTransfer.types.includes(dragTickerType)) {
                e.preventDefault();
                summary.style.background = 'rgba(0, 200, 5, 0.1)';
            }
        });
        summary.addEventListener('dragleave', () => summary.style.background = '');
        summary.addEventListener('drop', e => {
            if (e.dataTransfer.types.includes(dragTickerType)) {
                e.preventDefault();
                e.stopPropagation();
                summary.style.background = '';
                const ticker = e.dataTransfer.getData(dragTickerType);
                for (let g in sectionGroups) sectionGroups[g] = sectionGroups[g].filter(t => t !== ticker);
                sectionGroups[groupName].push(ticker); saveState();
                const item = document.getElementById(`q-item-${section}-${ticker}`);
                const dz = document.getElementById(`dropzone-${section}-${safeId(groupName)}`);
                if (item && dz) dz.appendChild(item);
            }
        });

        if (groupName !== "Misc") {
            const trash = summary.querySelector('.q-btn-trash');
            const confirmUI = summary.querySelector('.q-confirm-del');
            trash.onclick = (e) => { e.preventDefault(); e.stopPropagation(); trash.style.display = 'none'; confirmUI.style.display = 'flex'; };
            summary.querySelector('.q-btn-x').onclick = (e) => { e.preventDefault(); e.stopPropagation(); trash.style.display = 'block'; confirmUI.style.display = 'none'; };
            summary.querySelector('.q-btn-check').onclick = (e) => { e.preventDefault(); e.stopPropagation(); sectionGroups["Misc"].push(...sectionGroups[groupName]); delete sectionGroups[groupName]; saveState(); dashboard.remove(); };
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
                for (let g in sectionGroups) { if (sectionGroups[g].includes(ticker)) isKnown = true; }
                if (isKnown) {
                    for (let g in sectionGroups) sectionGroups[g] = sectionGroups[g].filter(t => t !== ticker);
                    sectionGroups[groupName].push(ticker);
                    saveState();
                    dashboard.remove();
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
        dropzone.id = `dropzone-${section}-${safeId(groupName)}`;
        dropzone.addEventListener('dragover', e => { if(e.dataTransfer.types.includes(dragTickerType)) { e.preventDefault(); dropzone.classList.add('drag-over'); }});
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', e => {
            if(e.dataTransfer.types.includes(dragTickerType)) {
                e.preventDefault(); dropzone.classList.remove('drag-over');
                const ticker = e.dataTransfer.getData(dragTickerType);
                for (let g in sectionGroups) sectionGroups[g] = sectionGroups[g].filter(t => t !== ticker);
                sectionGroups[groupName].push(ticker); saveState();
                const item = document.getElementById(`q-item-${section}-${ticker}`);
                if (item) dropzone.appendChild(item);
            }
        });

        sectionGroups[groupName].forEach(ticker => {
            const item = document.createElement('div');
            item.className = 'q-item'; item.id = `q-item-${section}-${ticker}`; item.draggable = true;
            item.addEventListener('dragstart', e => { e.dataTransfer.setData(dragTickerType, ticker); item.style.opacity = '0.4'; });
            item.addEventListener('dragend', () => { item.style.opacity = '1'; item.style.borderTop = 'none'; item.style.borderBottom = 'none'; });

            item.addEventListener('mouseenter', () => showTooltip(item, ticker));
            item.addEventListener('mouseleave', hideTooltip);

            item.addEventListener('dragover', e => {
                if (!e.dataTransfer.types.includes(dragTickerType)) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = item.getBoundingClientRect();
                const isAfter = (e.clientY - rect.top) > rect.height / 2;
                item.style.borderTop = isAfter ? 'none' : '2px solid #00C805';
                item.style.borderBottom = isAfter ? '2px solid #00C805' : 'none';
            });
            item.addEventListener('dragleave', () => { item.style.borderTop = 'none'; item.style.borderBottom = 'none'; });
            item.addEventListener('drop', e => {
                if (!e.dataTransfer.types.includes(dragTickerType)) return;
                e.preventDefault();
                e.stopPropagation();
                item.style.borderTop = 'none'; item.style.borderBottom = 'none';
                dropzone.classList.remove('drag-over');

                const draggedTicker = e.dataTransfer.getData(dragTickerType);
                if (draggedTicker === ticker) return;

                const rect = item.getBoundingClientRect();
                const isAfter = (e.clientY - rect.top) > rect.height / 2;

                for (let g in sectionGroups) sectionGroups[g] = sectionGroups[g].filter(t => t !== draggedTicker);
                let idx = sectionGroups[groupName].indexOf(ticker);
                if (isAfter) idx += 1;
                sectionGroups[groupName].splice(idx, 0, draggedTicker);
                saveState();

                const draggedItem = document.getElementById(`q-item-${section}-${draggedTicker}`);
                if (draggedItem) {
                    if (isAfter) item.after(draggedItem); else item.before(draggedItem);
                }
            });

            item.innerHTML = `
                <div class="q-left"><div class="q-ticker-wrap"><a href="${config.linkHref(ticker)}" class="q-ticker">${ticker}</a></div><div class="q-shares">...</div></div>
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
                for (let g in sectionGroups) sectionGroups[g] = sectionGroups[g].filter(t => t !== ticker);
                saveState();
                dashboard.remove();
            };

            dropzone.appendChild(item);
        });

        details.appendChild(dropzone);
        dashboard.appendChild(details);
    });
    return dashboard;
}
