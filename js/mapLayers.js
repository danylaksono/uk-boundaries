// --- Map Layers Module ---
// Handles map layer management and styling

function updateMapData(map, geojson, type) {
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

// --- Basemap Switching ---
function switchBasemap(map, basemapControlInstance, basemapKey, currentGeoJSON, currentBoundaryType, onBasemapControlUpdate) {
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
            updateMapData(map, savedGeoJSON, savedType);
        }
        
        // Re-add controls (style switching removes controls)
        try {
            map.addControl(new maplibregl.NavigationControl(), 'top-right');
            const newBasemapControl = new BasemapControl();
            map.addControl(newBasemapControl, 'top-right');
            // Restore selected basemap value
            const select = newBasemapControl._container.querySelector('#basemap-select');
            if (select) select.value = basemapKey;
            
            // Notify main.js to update the basemap control instance reference
            if (onBasemapControlUpdate) {
                onBasemapControlUpdate(newBasemapControl);
            }
        } catch (e) {
            // Control might already exist, ignore error
        }
    });
}

