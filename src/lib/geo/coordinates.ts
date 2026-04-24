// FILE: src/lib/geo/coordinates.ts
// PURPOSE: Real geographic coordinates (lat/lng in EPSG:4326) for every
//          place the Delhi-NCR map can display as a bubble. Used by the
//          map component to project bubbles onto the same canvas as the
//          state boundary polygons so the entire map stays geographically
//          accurate.

export interface LngLat {
  lng: number;
  lat: number;
}

/**
 * State-label bubble positions. These anchor the aggregate-per-state
 * bubble roughly at the NCR-facing portion of each state (not the full
 * geographic centroid), because the Impact Dashboard talks about the
 * NCR slice of each state.
 */
export const STATE_COORDS: Record<string, LngLat> = {
  Delhi:           { lng: 77.2090, lat: 28.6139 },
  Haryana:         { lng: 76.1500, lat: 29.3500 }, // top-left label area
  'Uttar Pradesh': { lng: 77.8500, lat: 27.6000 }, // bottom-right label area
  Rajasthan:       { lng: 76.0500, lat: 27.2500 }, // bottom-left label area
};

/**
 * NCR cities. Coordinates are city-centre (standard published values),
 * used directly by the map's projection so bubbles sit on their real
 * locations.
 */
export const CITY_COORDS: Record<string, LngLat> = {
  Panipat:         { lng: 76.9635, lat: 29.3909 },
  Rohtak:          { lng: 76.6066, lat: 28.8955 },
  Gurugram:        { lng: 77.0266, lat: 28.4595 },
  Meerut:          { lng: 77.7064, lat: 28.9845 },
  Ghaziabad:       { lng: 77.4538, lat: 28.6692 },
  Noida:           { lng: 77.3910, lat: 28.5355 },
  'Greater Noida': { lng: 77.5040, lat: 28.4744 },
  Alwar:           { lng: 76.6054, lat: 27.5530 },
  Neemrana:        { lng: 76.3886, lat: 27.9893 },
  // Delhi appears as both a state and a city in the data set, so we
  // alias its city coordinates to the Delhi state coords above.
  Delhi:           { lng: 77.2090, lat: 28.6139 },
};

/**
 * Centre of the overview bubble. Roughly the NCR centroid (near
 * Faridabad/South-Delhi boundary).
 */
export const NCR_CENTER: LngLat = { lng: 77.1900, lat: 28.4000 };
