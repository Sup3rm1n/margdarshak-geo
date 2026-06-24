"use client";

import maplibregl, {
  type Map as MapLibreMap,
  type Marker,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { categoryLabels, categoryShortLabels } from "@/lib/category-meta";
import type { ExamCentre, PoiCategory } from "@/lib/types";

type LocationPoint = {
  latitude: number;
  longitude: number;
  label: string;
};

type MapPaneProps = {
  centre: ExamCentre;
  activeCategories: PoiCategory[];
  userLocation?: LocationPoint | null;
  mapMode?: "road" | "satellite";
};

const roadStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [
    {
      id: "esri",
      type: "raster",
      source: "esri",
    },
  ],
};

function markerElement(label: string, variant: "centre" | "poi" | "user") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `geo-marker ${variant}`;
  element.textContent = label;
  return element;
}

function popupHtml(title: string, lines: string[]) {
  return `
    <div class="geo-popup">
      <strong>${title}</strong>
      ${lines.map((line) => `<span>${line}</span>`).join("")}
    </div>
  `;
}

export function MapPane({
  centre,
  activeCategories,
  userLocation,
  mapMode = "road",
}: MapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const visiblePois = useMemo(
    () =>
      centre.pois.filter((poi) => activeCategories.includes(poi.category)),
    [activeCategories, centre.pois],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: mapMode === "satellite" ? satelliteStyle : roadStyle,
      center: [centre.longitude, centre.latitude],
      zoom: 14,
      attributionControl: false,
    });

    mapRef.current.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    mapRef.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [centre.latitude, centre.longitude, mapMode]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    map.easeTo({
      center: [centre.longitude, centre.latitude],
      zoom: 14,
      duration: 600,
    });

    const centreMarker = new maplibregl.Marker({
      element: markerElement("C", "centre"),
      anchor: "center",
    })
      .setLngLat([centre.longitude, centre.latitude])
      .setPopup(
        new maplibregl.Popup({ offset: 22 }).setHTML(
          popupHtml(centre.name, [centre.address]),
        ),
      )
      .addTo(map);

    markersRef.current.push(centreMarker);

    if (userLocation) {
      const userMarker = new maplibregl.Marker({
        element: markerElement("U", "user"),
        anchor: "center",
      })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 18 }).setHTML(
            popupHtml(userLocation.label, ["Current location selected"]),
          ),
        )
        .addTo(map);

      markersRef.current.push(userMarker);
    }

    for (const poi of visiblePois) {
      const poiMarker = new maplibregl.Marker({
        element: markerElement(categoryShortLabels[poi.category], "poi"),
        anchor: "center",
      })
        .setLngLat([poi.longitude, poi.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 18 }).setHTML(
            popupHtml(poi.name, [
              `${categoryLabels[poi.category]} • ${poi.distanceMeters} m`,
              `Walking: ${poi.walkingTimeMinutes} min`,
            ]),
          ),
        )
        .addTo(map);

      markersRef.current.push(poiMarker);
    }
  }, [centre, userLocation, visiblePois]);

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-b-xl">
      <div ref={containerRef} className="h-full min-h-[420px] w-full" />

      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[320px]">
        <div className="pointer-events-auto rounded-xl border border-[rgba(255,255,255,0.14)] bg-[rgba(7,16,28,0.72)] px-4 py-3 text-[var(--color-ink)] backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
            Centre confirmed
          </div>
          <div className="mt-1 text-base font-black leading-tight">
            {centre.name}
          </div>
          <div className="mt-1 text-sm text-[var(--color-muted)]">
            {centre.district}, {centre.state}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-xs font-bold text-[var(--color-ink)]">
              {mapMode === "satellite" ? "Satellite view" : "Road view"}
            </span>
            <span className="rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-xs font-bold text-[var(--color-ink)]">
              {activeCategories.length} categories
            </span>
            {userLocation && (
              <span className="rounded-full border border-[var(--color-line)] bg-[rgba(121,230,187,0.12)] px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
                Location set
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
