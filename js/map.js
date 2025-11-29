// --- Map Module ---
// Handles map initialization and basemap control

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
            if (window.switchBasemap) {
                window.switchBasemap(e.target.value);
            }
        });
        
        this._container.appendChild(select);
        return this._container;
    }
    
    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
}

// --- Map Initialization ---
function initMap() {
    const map = new maplibregl.Map({
        container: 'map',
        // Free vector tile style (Carto Light)
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [-1.2577, 51.7520], // Oxford coordinates
        zoom: 6
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const basemapControlInstance = new BasemapControl();
    map.addControl(basemapControlInstance, 'top-right');

    return { map, basemapControlInstance };
}

