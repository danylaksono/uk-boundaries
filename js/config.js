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

