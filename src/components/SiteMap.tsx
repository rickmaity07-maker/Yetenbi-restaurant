"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { MAP_AREA } from "@/lib/map-area.mjs";

/*
  The live map in the "Anfahrt" section. Leaflet draws it from tiles on our own server (public/map-tiles,
  see scripts/build-map.mjs), so it appears straight away and sends no visitor data to Google or anyone else.
  Panning is limited to the area we have tiles for. The mouse wheel scrolls the page, not the map
  (use the + and − buttons), and on phones one finger scrolls the page too.
*/
export default function SiteMap({ label, className = "" }: { label: string; className?: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    // Leaflet touches `window` when it loads, so it is imported in the browser only.
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      const [west, south, east, north] = MAP_AREA.bounds;
      const area = L.latLngBounds([south, west], [north, east]);
      const touch = L.Browser.mobile;

      map = L.map(container.current, {
        center: MAP_AREA.restaurant as [number, number],
        zoom: MAP_AREA.startZoom,
        minZoom: MAP_AREA.minZoom,
        maxZoom: MAP_AREA.maxZoom,
        maxBounds: area,
        maxBoundsViscosity: 1,
        scrollWheelZoom: false,
        dragging: !touch,
        attributionControl: false,
      });

      L.tileLayer("/map-tiles/{z}/{x}/{y}.png", {
        minZoom: MAP_AREA.minZoom,
        maxZoom: MAP_AREA.maxZoom,
        maxNativeZoom: MAP_AREA.maxNativeZoom,
        bounds: area,
        className: "site-map-tiles",
      }).addTo(map);

      L.control
        .attribution({ prefix: false })
        .addAttribution(
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        )
        .addTo(map);

      const pin = L.divIcon({
        className: "",
        html: '<span class="site-map-pin" aria-hidden="true"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      L.marker(MAP_AREA.restaurant as [number, number], { icon: pin, title: "Yetenbi", keyboard: false }).addTo(map);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return <div ref={container} role="region" aria-label={label} className={`site-map ${className}`} />;
}
