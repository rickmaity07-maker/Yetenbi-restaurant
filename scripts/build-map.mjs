// Downloads the map tiles for the "Anfahrt" map into public/map-tiles/{z}/{x}/{y}.png.
// The map on the website then loads only from our own server, so it shows immediately without sending
// visitor data to anyone (no consent needed). The area and zoom levels are in src/lib/map-area.mjs.
// Run once, or again after changing the area: node scripts/build-map.mjs   (under 100 tiles, politely paced)
// Map data © OpenStreetMap contributors (ODbL); the map shows the attribution.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { MAP_AREA } from "../src/lib/map-area.mjs";

// Web Mercator tile numbers, as used by every web map.
const tileX = (lon, zoom) => Math.floor(((lon + 180) / 360) * 2 ** zoom);
const tileY = (lat, zoom) => {
  const radians = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * 2 ** zoom);
};

const [west, south, east, north] = MAP_AREA.bounds;
let fetched = 0;
for (let zoom = MAP_AREA.minZoom; zoom <= MAP_AREA.maxNativeZoom; zoom++) {
  for (let x = tileX(west, zoom); x <= tileX(east, zoom); x++) {
    for (let y = tileY(north, zoom); y <= tileY(south, zoom); y++) {
      const folder = `public/map-tiles/${zoom}/${x}`;
      const file = `${folder}/${y}.png`;
      if (existsSync(file)) continue;
      const response = await fetch(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`, {
        headers: { "User-Agent": "Yetenbi restaurant website, one-time download for a self-hosted map" },
      });
      if (!response.ok) throw new Error(`Tile ${zoom}/${x}/${y}: ${response.status}`);
      mkdirSync(folder, { recursive: true });
      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
      fetched++;
      await new Promise((resolve) => setTimeout(resolve, 150)); // the tile server is run by volunteers
    }
  }
}
console.log(`Done: ${fetched} new tiles in public/map-tiles`);
