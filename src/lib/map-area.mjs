// The area of the self-hosted map in the "Anfahrt" section. Shared by the map component and
// scripts/build-map.mjs, which downloads exactly these tiles. Change it, then run the script again.
export const MAP_AREA = {
  /** Theaterstraße 6, 97070 Würzburg (OpenStreetMap / Nominatim). */
  restaurant: [49.7965257, 9.9340721],
  /** West, south, east, north: the old town around the restaurant (about 1.8 × 1.3 km). */
  bounds: [9.9215, 49.7905, 9.9465, 49.8025],
  minZoom: 14,
  /** The deepest zoom we have tiles for; one step further is shown by enlarging them. */
  maxNativeZoom: 17,
  maxZoom: 18,
  startZoom: 16,
};
