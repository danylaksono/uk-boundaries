// --- Boundary Loader Module ---
// Handles fetching boundary data from APIs

let currentLADGeometry = null;

async function fetchLADGeometry(code) {
    // Query by Attribute (LAD24CD)
    const url = `${APIs.LAD}/query?where=LAD24CD='${code}'&outFields=*&returnGeometry=true&f=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    return data.features[0];
}

async function fetchSpatialQuery(serviceUrl, geometry) {
    // ArcGIS REST API supports passing geometry for spatial filtering
    // We use the bounding box (Envelope) of the LA to fetch candidates,
    // then filter strictly on client side
    
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

async function loadBoundaries(laCode, laName, type) {
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
        const targetUrl = type === 'ward' ? APIs.WARD : (type === 'lsoa' ? APIs.LSOA : APIs.MSOA);
        displayGeoJSON = await fetchSpatialQuery(targetUrl, currentLADGeometry);
    }

    return displayGeoJSON;
}

async function fetchLocalAuthorities() {
    // Fetch list of Local Authorities for dropdown
    // We only need names and codes, not geometry (returnGeometry=false)
    const queryUrl = `${APIs.LAD}/query?where=1=1&outFields=LAD24NM,LAD24CD&returnGeometry=false&orderByFields=LAD24NM&f=json`;
    
    const response = await fetch(queryUrl);
    const data = await response.json();

    if (data.features) {
        return data.features.map(f => ({
            name: f.attributes.LAD24NM,
            code: f.attributes.LAD24CD
        }));
    } else {
        throw new Error("No features found");
    }
}

