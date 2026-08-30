(function() {
    function handlePositions(data) {
        try {
            const positions = (data.results || []).map(r => {
                const quantity = parseFloat(r.quantity);
                const averageBuyPrice = parseFloat(r.average_buy_price);
                const parsedCostBasis = parseFloat(r.clearing_cost_basis);
                return {
                    symbol: r.symbol,
                    quantity,
                    averageBuyPrice,
                    costBasis: !isNaN(parsedCostBasis) ? parsedCostBasis : averageBuyPrice * quantity,
                };
            });
            window.postMessage({ type: "RH_POSITIONS_DATA", payload: positions }, window.location.origin);
        } catch (err) {
            console.error("[Quant Extractor] positions parse error", err);
        }
    }

    function handleCryptoHoldings(data) {
        try {
            const positions = (data.results || []).map(r => {
                const quantity = parseFloat(r.quantity);
                // Total cost basis lives per tax lot, not as a single aggregate field like stocks have.
                const costBasis = (r.tax_lot_cost_bases || [])
                    .reduce((sum, lot) => sum + (parseFloat(lot.clearing_book_cost_basis) || 0), 0);
                return { symbol: r.currency && r.currency.code, quantity, costBasis };
            }).filter(p => p.symbol);
            window.postMessage({ type: "RH_POSITIONS_DATA", payload: positions }, window.location.origin);
        } catch (err) {
            console.error("[Quant Extractor] crypto holdings parse error", err);
        }
    }

    function handleHistoricals(data) {
        try {
            window.postMessage({ type: "RH_HISTORICAL_DATA", payload: data }, window.location.origin);
        } catch (err) {
            console.error("[Quant Extractor] historicals parse error", err);
        }
    }

    function routeJson(url, data) {
        if (url.includes('/positions/') && url.includes('nonzero=true')) {
            handlePositions(data);
        }
        if (url.includes('nummus.robinhood.com/holdings')) {
            handleCryptoHoldings(data);
        }
        if (url.includes('portfolio/historicals')) {
            handleHistoricals(data);
        }
    }

    // --- fetch() ---
    // .then(), not async/await: a rejected fetch (network error, CSP block, adblock, etc.)
    // must propagate to the caller as the exact same rejection it would without this wrapper -
    // we only want to observe successful responses, never change failure behavior.
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
            try {
                const request = args[0];
                const url = typeof request === 'string' ? request : (request && request.url) || '';
                if (url.includes('/positions/') || url.includes('nummus.robinhood.com/holdings') || url.includes('portfolio/historicals')) {
                    response.clone().json().then(data => routeJson(url, data))
                        .catch(err => console.error("[Quant Extractor] fetch JSON parse error", err));
                }
            } catch (err) {
                console.error("[Quant Extractor] fetch inspection error", err);
            }
            return response;
        });
    };

    // --- XMLHttpRequest ---
    // Robinhood's web app may issue some API calls via XHR (e.g. through axios, which defaults
    // to XHR in browsers) rather than fetch - those never pass through the wrapper above.
    const xhrOpen = XMLHttpRequest.prototype.open;
    const xhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this.__qeUrl = url;
        return xhrOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        this.addEventListener('load', function() {
            try {
                const url = this.__qeUrl;
                if (typeof url === 'string' && (url.includes('/positions/') || url.includes('nummus.robinhood.com/holdings') || url.includes('portfolio/historicals'))) {
                    routeJson(url, JSON.parse(this.responseText));
                }
            } catch (err) {
                console.error("[Quant Extractor] XHR inspection error", err);
            }
        });
        return xhrSend.apply(this, args);
    };
})();
