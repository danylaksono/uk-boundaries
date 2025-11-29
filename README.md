# UK Local Authority Boundary Visualiser

A web-based interactive map application for visualising UK local authority boundaries using data from the ONS Open Geography Portal.

## Features

- **Interactive Map**: Built with MapLibre GL JS for smooth, interactive mapping
- **Local Authority Search**: Search and select from UK local authorities
- **Multiple Boundary Types**: Visualize different boundary types:
  - Local Authority Districts (LAD)
  - Wards
  - LSOA (Lower Super Output Areas)
  - MSOA (Middle Super Output Areas)
- **GeoJSON Export**: Download boundary data as GeoJSON files


## Data Source

Boundary data is sourced dynamically from the [ONS Open Geography Portal](https://geoportal.statistics.gov.uk/) using ArcGIS FeatureServer APIs. The application uses Generalised Clipped (BGC) boundaries for optimal performance.

## Technologies

- **MapLibre GL JS**: Open-source mapping library
- **Tailwind CSS**: Utility-first CSS framework
- **Turf.js**: Geospatial analysis library for client-side spatial operations

## Browser Compatibility

Works best in modern browsers that support ES6+ and WebGL.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
