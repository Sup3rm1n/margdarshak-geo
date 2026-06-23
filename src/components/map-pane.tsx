"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import { categoryLabels, categoryShortLabels } from "@/lib/category-meta";
import type { ExamCentre, PoiCategory } from "@/lib/types";

type MapPaneProps = {
  centre: ExamCentre;
  activeCategories: PoiCategory[];
};

function Recenter({ centre }: { centre: ExamCentre }) {
  const map = useMap();

  useEffect(() => {
    map.setView([centre.latitude, centre.longitude], 14, {
      animate: true,
    });
  }, [centre, map]);

  return null;
}

const centreIcon = divIcon({
  className: "",
  html: '<span class="geo-marker">C</span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function poiIcon(category: PoiCategory) {
  return divIcon({
    className: "",
    html: `<span class="geo-marker poi">${categoryShortLabels[category]}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function MapPane({ centre, activeCategories }: MapPaneProps) {
  const visiblePois = centre.pois.filter((poi) =>
    activeCategories.includes(poi.category),
  );

  return (
    <MapContainer
      center={[centre.latitude, centre.longitude]}
      zoom={14}
      scrollWheelZoom
      className="h-full min-h-[420px]"
    >
      <Recenter centre={centre} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[centre.latitude, centre.longitude]} icon={centreIcon}>
        <Popup>
          <strong>{centre.name}</strong>
          <br />
          {centre.address}
        </Popup>
      </Marker>
      {visiblePois.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.latitude, poi.longitude]}
          icon={poiIcon(poi.category)}
        >
          <Popup>
            <strong>{poi.name}</strong>
            <br />
            {categoryLabels[poi.category]} · {poi.distanceMeters} m
            <br />
            Walking: {poi.walkingTimeMinutes} min
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
