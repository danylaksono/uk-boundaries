// --- Main Application ---
// Orchestrates the application using modular components

// --- State ---
let map = null;
let basemapControlInstance = null;
let currentGeoJSON = null; // Store current GeoJSON data for download
let currentBoundaryType = null; // Store current boundary type for basemap switching
let laSearch = null;

// --- Map Initialization ---
const { map: mapInstance, basemapControlInstance: basemapControl } = initMap();
map = mapInstance;
basemapControlInstance = basemapControl;

// Make switchBasemap available globally for basemap control
window.switchBasemap = (basemapKey) => {
    if (window.switchBasemapFunction) {
        window.switchBasemapFunction(map, basemapControlInstance, basemapKey, currentGeoJSON, currentBoundaryType, (newControl) => {
            basemapControlInstance = newControl;
        });
    }
};

map.on('load', () => {
    initApp();
});

// --- App Logic ---
async function initApp() {
    try {
        // Fetch list of Local Authorities
        const authorities = await fetchLocalAuthorities();
        
        // Initialize search component
        laSearch = new LocalAuthoritySearch('la-search-container', (authority) => {
            // Optional: Auto-load when authority is selected
            // Uncomment if desired:
            // document.getElementById('load-btn').click();
        });
        laSearch.init();
        laSearch.setAuthorities(authorities);
        
        // Set default to Oxford if exists
        const oxford = authorities.find(a => a.name.includes('Oxford'));
        if (oxford) {
            laSearch.input.value = oxford.name;
        }
        
        document.getElementById('loading-initial').classList.add('hidden');
        document.getElementById('controls').classList.remove('hidden');
    } catch (error) {
        console.error("Init Error:", error);
        document.getElementById('loading-initial').innerHTML = `<span class="text-red-500">Error loading data. Please refresh.</span>`;
    }
}

// --- Main Load Function ---
document.getElementById('load-btn').addEventListener('click', async () => {
    const laCode = laSearch.getSelectedValue();
    const laName = laSearch.getSelectedName();
    const type = document.getElementById('type-select').value;
    const btn = document.getElementById('load-btn');
    const status = document.getElementById('status-msg');

    if (!laCode) {
        status.innerHTML = `<span class="text-red-600">Please select a valid local authority.</span>`;
        return;
    }

    // UI State: Loading
    btn.disabled = true;
    btn.innerHTML = `<svg class="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Loading...`;
    status.textContent = `Fetching ${type.toUpperCase()} data for ${laName}...`;

    try {
        // Load boundaries
        const displayGeoJSON = await loadBoundaries(laCode, laName, type);
        
        // Store GeoJSON and type for download/basemap switching
        currentGeoJSON = displayGeoJSON;
        currentBoundaryType = type;

        // Update Map
        updateMapData(map, displayGeoJSON, type);
        
        // Zoom to bounds
        const bbox = turf.bbox(displayGeoJSON);
        map.fitBounds(bbox, { padding: 40 });

        status.textContent = `Loaded ${displayGeoJSON.features.length} features.`;

    } catch (err) {
        console.error(err);
        status.innerHTML = `<span class="text-red-600">Error: ${err.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Load Boundaries';
    }
});

// --- GeoJSON Download ---
function downloadGeoJSON() {
    if (!currentGeoJSON) {
        alert('No data loaded. Please load boundaries first.');
        return;
    }

    const laName = laSearch.getSelectedName() || 'boundaries';
    const type = document.getElementById('type-select').value || 'lad';
    const filename = `${laName.replace(/\s+/g, '_')}_${type}_${new Date().toISOString().split('T')[0]}.geojson`;
    
    const dataStr = JSON.stringify(currentGeoJSON, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// --- Event Listeners ---
// Set up event listeners when script loads (script is at end of body, so DOM is ready)
(function setupEventListeners() {
    // Download button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadGeoJSON);
    }
})();
