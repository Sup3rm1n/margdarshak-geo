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
};

const defaultRasterStyle: StyleSpecification = {
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
      style: defaultRasterStyle,
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
  }, [centre.latitude, centre.longitude]);

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
    <div
      ref={containerRef}
      className="h-full min-h-[420px] w-full overflow-hidden rounded-b-xl"
    />
  );
}
