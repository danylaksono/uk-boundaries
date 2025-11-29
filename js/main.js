// --- Configuration ---
// Using "Generalised Clipped (BGC)" layers for performance (smaller file sizes than BFE)
// Note: URL indexes (/0) are standard for FeatureServers.
const APIs = {
    // Local Authority Districts (May 2024)
    LAD: "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_May_2024_Boundaries_UK_BGC/FeatureServer/0",
    // Wards (May 2024)
    WARD: "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Wards_May_2024_Boundaries_UK_BGC/FeatureServer/0",
    // LSOA (Dec 2021) - Latest Census
    LSOA: "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Lower_layer_Super_Output_Areas_December_2021_Boundaries_EW_BGC_V5/FeatureServer/0",
    // MSOA (Dec 2021) - Latest Census
    MSOA: "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Middle_Layer_Super_Output_Areas_December_2021_Boundaries_EW_BGC_V3/FeatureServer/0"
};

// --- State ---
let currentLADGeometry = null;
let currentGeoJSON = null; // Store current GeoJSON data for download
let currentBoundaryType = null; // Store current boundary type for basemap switching
let basemapControlInstance = null; // Store basemap control instance

// --- Map Initialization ---
const map = new maplibregl.Map({
    container: 'map',
    // Free vector tile style (Carto Light)
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-1.2577, 51.7520], // Oxford coordinates
    zoom: 6
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

// --- Custom Basemap Control ---
class BasemapControl {
    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this._container.style.background = 'white';
        this._container.style.borderRadius = '4px';
        this._container.style.boxShadow = '0 0 0 2px rgba(0,0,0,.1)';
        
        const select = document.createElement('select');
        select.id = 'basemap-select';
        select.className = 'maplibregl-ctrl-select';
        select.style.cssText = 'padding: 6px 8px; border: none; background: white; font-size: 12px; cursor: pointer; outline: none; border-radius: 4px;';
        
        // Add options
        const options = [
            { value: 'positron', label: 'Positron' },
            { value: 'dark', label: 'Dark Matter' },
            { value: 'osm', label: 'OpenStreetMap' },
            { value: 'voyager', label: 'Voyager' }
        ];
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === 'positron') option.selected = true;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            switchBasemap(e.target.value);
        });
        
        this._container.appendChild(select);
        return this._container;
    }
    
    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
}

basemapControlInstance = new BasemapControl();
map.addControl(basemapControlInstance, 'top-right');

map.on('load', () => {
    initApp();
});

// --- App Logic ---

async function initApp() {
    try {
        // Fetch list of Local Authorities for dropdown
        // We only need names and codes, not geometry (returnGeometry=false)
        const queryUrl = `${APIs.LAD}/query?where=1=1&outFields=LAD24NM,LAD24CD&returnGeometry=false&orderByFields=LAD24NM&f=json`;
        
        const response = await fetch(queryUrl);
        const data = await response.json();

        if (data.features) {
            populateDropdown(data.features);
            document.getElementById('loading-initial').classList.add('hidden');
            document.getElementById('controls').classList.remove('hidden');
        } else {
            throw new Error("No features found");
        }
    } catch (error) {
        console.error("Init Error:", error);
        document.getElementById('loading-initial').innerHTML = `<span class="text-red-500">Error loading data. Please refresh.</span>`;
    }
}

function populateDropdown(features) {
    const select = document.getElementById('la-select');
    
    // Filter distinct names just in case, though API distincts usually
    features.forEach(feature => {
        const name = feature.attributes.LAD24NM;
        const code = feature.attributes.LAD24CD;
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        select.appendChild(option);
    });
    
    // Set default to Oxford if exists (just for demo purposes)
    const oxford = Array.from(select.options).find(opt => opt.text.includes('Oxford'));
    if(oxford) select.value = oxford.value;
}

// --- Main Load Function ---
document.getElementById('load-btn').addEventListener('click', async () => {
    const laCode = document.getElementById('la-select').value;
    const laName = document.getElementById('la-select').options[document.getElementById('la-select').selectedIndex].text;
    const type = document.getElementById('type-select').value;
    const btn = document.getElementById('load-btn');
    const status = document.getElementById('status-msg');

    if (!laCode) return;

    // UI State: Loading
    btn.disabled = true;
    btn.innerHTML = `<svg class="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Loading...`;
    status.textContent = `Fetching ${type.toUpperCase()} data for ${laName}...`;

    try {
        // 1. Always fetch the LAD Geometry first. 
        // We need this for the camera bounds and for spatial querying sub-layers.
        const ladGeoJSON = await fetchLADGeometry(laCode);
        
        if (!ladGeoJSON) throw new Error("Could not find Local Authority geometry.");

        currentLADGeometry = ladGeoJSON.geometry;

        // 2. Determine what to show
        let displayGeoJSON = null;

        if (type === 'lad') {
            // If user just wants the LA boundary, we already have it.
            displayGeoJSON = {
                type: "FeatureCollection",
                features: [ladGeoJSON]
            };
        } else {
            // 3. Spatial Query for Sub-layers (Wards, LSOA, MSOA)
            // We use the LAD geometry to find features that intersect/are contained by it.
            // This is robust against code changes (e.g. LAD24 vs LAD21 codes).
            const targetUrl = type === 'ward' ? APIs.WARD : (type === 'lsoa' ? APIs.LSOA : APIs.MSOA);
            displayGeoJSON = await fetchSpatialQuery(targetUrl, currentLADGeometry);
        }

        // 4. Store GeoJSON and type for download/basemap switching
        currentGeoJSON = displayGeoJSON;
        currentBoundaryType = type;

        // 5. Update Map
        updateMapData(displayGeoJSON, type);
        
        // 6. Zoom to bounds
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

async function fetchLADGeometry(code) {
    // Query by Attribute (LAD24CD)
    const url = `${APIs.LAD}/query?where=LAD24CD='${code}'&outFields=*&returnGeometry=true&f=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    return data.features[0];
}

async function fetchSpatialQuery(serviceUrl, geometry) {
    // ArcGIS REST API supports passing geometry for spatial filtering
    // We must stringify the geometry for the URL parameter.
    // Note: Complex geometries might hit URL length limits. 
    // If the LA is huge, we might need to simplify, but usually Districts are fine for GET requests.
    
    // Use Turf to get the envelope (bounding box) for a lighter query first, 
    // or pass the polygon geometry directly formatted for ArcGIS.
    // ArcGIS expects geometryType=esriGeometryPolygon&geometry={...}
    
    // To be safe with URL length, we will use the bounding box (Envelope) of the LA 
    // to fetch candidates, then filter strictly on client side if needed, 
    // OR use the 'geometry' param if supported by the server via standard GeoJSON.
    // ONS APIs support standard GeoJSON input in 'geometry' param usually, but let's be safe.
    
    // Strategy: Convert GeoJSON Polygon to ArcGIS Ring format is complex without a library.
    // Simpler Strategy: Query by 'LAD24CD' attribute first (if available in target layer).
    // If that fails (columns mismatch), we fallback to Bounding Box spatial query.
    
    // Let's try Attribute Query first (Faster & Safer for URL length)
    // LSOA/MSOA/Ward layers usually have a parent code column.
    // 2024 Wards have LAD24CD. 2021 LSOA have LAD22CD (usually).
    // We will try a wildcard or flexible query if possible.
    
    // ACTUALLY: The most robust way for a generic app is:
    // 1. Get bbox of LAD.
    // 2. Request features within that bbox.
    // 3. Client-side filter using Turf.intersect (optional, for precise clipping).
    
    const bbox = turf.bbox(currentLADGeometry);
    const bboxString = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
    
    const url = `${serviceUrl}/query?geometry=${bboxString}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&inSR=4326&outFields=*&returnGeometry=true&f=geojson`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    // Optional: Client-side strict containment check to remove neighbors in the square bbox
    // This ensures "clean" borders.
    const cleanFeatures = data.features.filter(f => {
        // Check if feature's centroid is inside the LAD polygon
        const centroid = turf.centroid(f);
        return turf.booleanPointInPolygon(centroid, currentLADGeometry);
    });

    return { type: "FeatureCollection", features: cleanFeatures };
}

function updateMapData(geojson, type) {
    const sourceId = 'boundary-source';
    const fillLayerId = 'boundary-fill';
    const lineLayerId = 'boundary-line';

    // Remove existing layers if they exist
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add Source
    map.addSource(sourceId, {
        type: 'geojson',
        data: geojson
    });

    // Styling based on type
    let fillColor = '#3b82f6'; // blue-500
    let fillOpacity = 0.2;
    
    if (type === 'ward') { fillColor = '#10b981'; fillOpacity = 0.3; } // green
    else if (type === 'lsoa') { fillColor = '#f59e0b'; fillOpacity = 0.4; } // amber
    else if (type === 'msoa') { fillColor = '#8b5cf6'; fillOpacity = 0.3; } // purple

    // Add Fill Layer
    map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
            'fill-color': fillColor,
            'fill-opacity': fillOpacity
        }
    });

    // Add Line Layer (Borders)
    map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
            'line-color': '#1e3a8a', // dark blue
            'line-width': type === 'lad' ? 3 : 1,
            'line-opacity': 0.8
        }
    });

    // Popup logic
    map.on('click', fillLayerId, (e) => {
        const props = e.features[0].properties;
        // Try to find a Name property (fields vary by layer: LAD24NM, WD24NM, LSOA21NM, etc.)
        const name = props.LAD24NM || props.WD24NM || props.LSOA21NM || props.MSOA21NM || "Unknown";
        const code = props.LAD24CD || props.WD24CD || props.LSOA21CD || props.MSOA21CD || "";
        
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <div class="p-2">
                    <h3 class="font-bold">${name}</h3>
                    <p class="text-sm text-gray-500">${code}</p>
                    <p class="text-xs text-gray-400 mt-1 uppercase">${type}</p>
                </div>
            `)
            .addTo(map);
    });

    // Mouse cursor
    map.on('mouseenter', fillLayerId, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', fillLayerId, () => map.getCanvas().style.cursor = '');
}

// --- Basemap Configuration ---
const basemaps = {
    positron: {
        name: 'Positron',
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
    },
    dark: {
        name: 'Dark Matter',
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    },
    osm: {
        name: 'OpenStreetMap',
        style: {
            version: 8,
            sources: {
                'osm-tiles': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors'
                }
            },
            layers: [{
                id: 'osm-tiles',
                type: 'raster',
                source: 'osm-tiles',
                minzoom: 0,
                maxzoom: 22
            }]
        }
    },
    voyager: {
        name: 'Voyager',
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
    }
};

// --- Basemap Switching ---
function switchBasemap(basemapKey) {
    const basemap = basemaps[basemapKey];
    if (!basemap) return;

    // Store current data before switching
    const sourceId = 'boundary-source';
    const hasData = map.getSource(sourceId);
    const savedGeoJSON = hasData ? currentGeoJSON : null;
    const savedType = hasData ? currentBoundaryType : null;

    // Change basemap style
    map.setStyle(basemap.style);

    // Wait for style to load, then restore data layers
    map.once('style.load', () => {
        if (savedGeoJSON && savedType) {
            // Restore the data layers
            updateMapData(savedGeoJSON, savedType);
        }
        
        // Re-add controls (style switching removes controls)
        try {
            map.addControl(new maplibregl.NavigationControl(), 'top-right');
            basemapControlInstance = new BasemapControl();
            map.addControl(basemapControlInstance, 'top-right');
            // Restore selected basemap value
            const select = basemapControlInstance._container.querySelector('#basemap-select');
            if (select) select.value = basemapKey;
        } catch (e) {
            // Control might already exist, ignore error
        }
    });
}

// --- GeoJSON Download ---
function downloadGeoJSON() {
    if (!currentGeoJSON) {
        alert('No data loaded. Please load boundaries first.');
        return;
    }

    const laName = document.getElementById('la-select').options[document.getElementById('la-select').selectedIndex]?.text || 'boundaries';
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

