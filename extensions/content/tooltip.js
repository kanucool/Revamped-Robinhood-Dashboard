// --- HOVER TOOLTIP (Equity / Day's Return / Total Return) ---
function fmtSigned(n) {
    const sign = n < 0 ? '-' : '+';
    const cls = n < 0 ? 'q-red' : 'q-green';
    const val = Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    return `<span class="${cls}">${sign}${val}</span>`;
}

function fmtSignedPct(n) {
    const sign = n < 0 ? '-' : '+';
    const cls = n < 0 ? 'q-red' : 'q-green';
    return `<span class="${cls}">${sign}${Math.abs(n).toFixed(2)}%</span>`;
}

function showTooltip(item, ticker) {
    const tooltip = document.getElementById('q-hover-tooltip');
    if (!tooltip || !document.body.contains(item)) return;

    const price = parseFloat(item.querySelector('.q-price').innerText.replace(/[^0-9.-]/g, ''));
    const qty = parseFloat(item.querySelector('.q-shares').innerText.replace(/[^0-9.-]/g, ''));
    const pct = parseFloat(item.querySelector('.q-percent').innerText.replace(/[^0-9.-]/g, '')) / 100;
    if (isNaN(price) || isNaN(qty)) return; // native data hasn't populated this row yet

    const equity = price * qty;
    tooltip.querySelector('#q-tt-equity').innerHTML = `<span class="q-green">${equity.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>`;
    tooltip.querySelector('#q-tt-day').innerHTML = !isNaN(pct) ? fmtSigned(equity - equity / (1 + pct)) : '--';

    const basis = costBasis[ticker];
    tooltip.querySelector('#q-tt-total').innerHTML = (basis && !isNaN(basis.costBasis) && basis.costBasis > 0)
        ? `${fmtSigned(equity - basis.costBasis)} ${fmtSignedPct((equity - basis.costBasis) / basis.costBasis * 100)}`
        : `<span class="q-tt-label">Unavailable</span>`;

    tooltip.classList.add('show'); // show first so its real width is measurable below
    const rect = item.getBoundingClientRect();
    const gap = 6;
    const ttWidth = tooltip.offsetWidth;
    const hasRoomRight = window.innerWidth - rect.right >= ttWidth + gap;
    tooltip.style.left = hasRoomRight ? `${rect.right + gap}px` : `${rect.left - ttWidth - gap}px`;
    tooltip.style.top = `${rect.top}px`;
}

function hideTooltip() {
    const tooltip = document.getElementById('q-hover-tooltip');
    if (tooltip) tooltip.classList.remove('show');
}

document.addEventListener('dragstart', hideTooltip);
