"use client";

import maplibregl, {
  type Map as MapLibreMap,
  type Marker,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
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

const routeSourceId = "centre-route";
const routeCasingLayerId = "centre-route-casing";
const routeLayerId = "centre-route-line";

function markerElement(label: string, variant: "centre" | "poi" | "user") {
  const element = document.createElement("button");
  element.type = "button";
  element.className =
    variant === "centre"
      ? "grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[var(--color-brand)] text-[15px] font-extrabold text-[#05101c] shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
      : variant === "poi"
        ? "grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[var(--color-accent)] text-[12px] font-extrabold text-[#05101c] shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
        : "grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[var(--color-success)] text-[13px] font-extrabold text-[#05101c] shadow-[0_10px_24px_rgba(0,0,0,0.24)]";
  element.textContent = label;
  return element;
}

function popupHtml(title: string, lines: string[]) {
  return `
    <div class="grid gap-1 text-[13px] leading-[1.35] text-[#0d1521]">
      <strong class="text-sm">${title}</strong>
      ${lines.map((line) => `<span>${line}</span>`).join("")}
    </div>
  `;
}

function fallbackRouteFeature(
  userLocation: LocationPoint,
  centre: ExamCentre,
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [userLocation.longitude, userLocation.latitude],
        [centre.longitude, centre.latitude],
      ],
    },
  };
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
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(
    null,
  );
  const initialZoom = mapMode === "satellite" ? 17 : 14;

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
      zoom: initialZoom,
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

    mapRef.current.on("load", () => {
      const map = mapRef.current;

      if (!map || map.getSource(routeSourceId)) {
        return;
      }

      map.addSource(routeSourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: routeCasingLayerId,
        type: "line",
        source: routeSourceId,
        paint: {
          "line-color": "rgba(255, 255, 255, 0.95)",
          "line-width": 16,
          "line-opacity": 0.92,
          "line-blur": 0.6,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      map.addLayer({
        id: routeLayerId,
        type: "line",
        source: routeSourceId,
        paint: {
          "line-color": "#148cff",
          "line-width": 9,
          "line-opacity": 1,
          "line-blur": 0.15,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      setIsMapLoaded(true);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [centre.latitude, centre.longitude, initialZoom, mapMode]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    map.easeTo({
      center: [centre.longitude, centre.latitude],
      zoom: initialZoom,
      duration: 600,
    });

    const centreMarker = new maplibregl.Marker({
      element: markerElement("C", "centre"),
      anchor: "center",
    })
      .setLngLat([centre.longitude, centre.latitude])
      .setPopup(
        new maplibregl.Popup({ offset: 22 }).setHTML(
          popupHtml("Selected exam centre", [centre.name, centre.address]),
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
              `${categoryLabels[poi.category]} - ${poi.distanceMeters} m`,
              `Walking: ${poi.walkingTimeMinutes} min`,
            ]),
          ),
        )
        .addTo(map);

      markersRef.current.push(poiMarker);
    }
  }, [centre, initialZoom, userLocation, visiblePois]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapLoaded) {
      return;
    }

    const routeSource = map.getSource(routeSourceId) as
      | maplibregl.GeoJSONSource
      | undefined;

    if (!routeSource) {
      return;
    }

    if (!userLocation) {
      routeSource.setData({
        type: "FeatureCollection",
        features: [],
      });
      return;
    }

    void fetchRouteGeometry(userLocation, centre)
      .then(({ feature, distanceMeters }) => {
        setRouteDistanceMeters(distanceMeters);
        routeSource.setData({
          type: "FeatureCollection",
          features: [feature],
        });

        map.fitBounds(
          [
            [userLocation.longitude, userLocation.latitude],
            [centre.longitude, centre.latitude],
          ],
          {
            padding: mapMode === "satellite" ? 40 : 80,
            maxZoom: mapMode === "satellite" ? 17 : 15,
            duration: 700,
          },
        );
      })
      .catch(() => {
        setRouteDistanceMeters(
          Math.round(
            distanceBetweenMeters(
              userLocation.latitude,
              userLocation.longitude,
              centre.latitude,
              centre.longitude,
            ) * 1.28,
          ),
        );
        routeSource.setData({
          type: "FeatureCollection",
          features: [fallbackRouteFeature(userLocation, centre)],
        });

        map.fitBounds(
          [
            [userLocation.longitude, userLocation.latitude],
            [centre.longitude, centre.latitude],
          ],
          {
            padding: mapMode === "satellite" ? 40 : 80,
            maxZoom: mapMode === "satellite" ? 17 : 15,
            duration: 700,
          },
        );
      });
  }, [centre, isMapLoaded, mapMode, userLocation]);

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-b-xl">
      <div ref={containerRef} className="h-full min-h-[420px] w-full" />

      <div className="pointer-events-none absolute right-4 top-4 z-10">
        <div className="pointer-events-auto rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(7,16,28,0.82)] px-2 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <label className="sr-only" htmlFor="map-mode">
            Map mode
          </label>
          <select
            id="map-mode"
            value={mapMode}
            onChange={(event) => {
              const nextMode = event.target.value as
                | "road"
                | "satellite"
                | "street";

              if (nextMode === "street") {
                const url = new URL("https://www.google.com/maps/@");
                url.searchParams.set("api", "1");
                url.searchParams.set("map_action", "pano");
                url.searchParams.set(
                  "viewpoint",
                  `${centre.latitude},${centre.longitude}`,
                );
                window.open(url.toString(), "_blank", "noopener,noreferrer");
                return;
              }

              const map = mapRef.current;

              if (map) {
                map.setStyle(nextMode === "satellite" ? satelliteStyle : roadStyle);
              }
            }}
            className="rounded-full border-0 bg-transparent px-2 py-1 text-sm font-black text-[var(--color-ink)] outline-none"
          >
            <option value="road">Road</option>
            <option value="satellite">Satellite</option>
            <option value="street">Street view</option>
          </select>
        </div>
      </div>

      {userLocation && routeDistanceMeters != null && (
        <div className="pointer-events-none absolute left-4 bottom-4 z-10">
          <div className="rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(7,16,28,0.82)] px-3 py-2 text-sm font-black text-[var(--color-ink)] backdrop-blur-xl">
            Total distance: {formatDistance(routeDistanceMeters)}
          </div>
        </div>
      )}
    </div>
  );
}

async function fetchRouteGeometry(
  userLocation: LocationPoint,
  centre: ExamCentre,
): Promise<{
  feature: GeoJSON.Feature<GeoJSON.LineString>;
  distanceMeters: number;
}> {
  const endpoint = new URL(
    `https://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${centre.longitude},${centre.latitude}`,
  );
  endpoint.searchParams.set("overview", "full");
  endpoint.searchParams.set("geometries", "geojson");

  const response = await fetch(endpoint.toString());

  if (!response.ok) {
    throw new Error(`Route request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    routes?: Array<{
      geometry?: GeoJSON.LineString;
      distance?: number;
    }>;
  };

  const geometry = data.routes?.[0]?.geometry;
  const distanceMeters = data.routes?.[0]?.distance;

  if (!geometry || distanceMeters == null) {
    throw new Error("No route geometry returned");
  }

  return {
    feature: {
      type: "Feature",
      properties: {},
      geometry,
    },
    distanceMeters,
  };
}

function distanceBetweenMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return Math.round(
    earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${distanceMeters} m`;
}
