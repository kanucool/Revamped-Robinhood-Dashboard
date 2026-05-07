(function() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        // Intercept Robinhood's portfolio historicals endpoint
        if (args[0] && typeof args[0] === 'string' && args[0].includes('portfolio/historicals')) {
            // Clone the response so the main site doesn't crash
            response.clone().json().then(data => {
                console.log("📈 [Quant Extractor] Captured Historicals JSON:");
                console.log(data);
                
                // Make it accessible to your console or content script
                window.postMessage({ type: "RH_HISTORICAL_DATA", payload: data }, "*");
            }).catch(err => console.error("Extactor JSON parse error", err));
        }
        return response;
    };
})();