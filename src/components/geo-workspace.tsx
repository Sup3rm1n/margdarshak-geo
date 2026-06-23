"use client";

import dynamic from "next/dynamic";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { categoryLabels } from "@/lib/category-meta";
import type { ExamCentre, PoiCategory } from "@/lib/types";

const MapPane = dynamic(
  () => import("./map-pane").then((module) => module.MapPane),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[420px] place-items-center bg-[#eef3f6] text-sm font-semibold text-[#52616b]">
        Loading map
      </div>
    ),
  },
);

type GeoWorkspaceProps = {
  centres: ExamCentre[];
};

type UserLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

const patnaFocusText =
  "This local build is focused on Patna exam centres, their nearest useful POIs, and the distance from the user's location.";

export function GeoWorkspace({ centres }: GeoWorkspaceProps) {
  const localCentres = centres;
  const [selectedCentreId, setSelectedCentreId] = useState(centres[0]?.id);
  const [activeCategories, setActiveCategories] = useState<PoiCategory[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [manualLocation, setManualLocation] = useState({
    latitude: "",
    longitude: "",
  });
  const [locationStatus, setLocationStatus] = useState(
    "Use your current location or enter coordinates to measure distance to the centre.",
  );
  const [isLocating, setIsLocating] = useState(false);

  const selectedCentre =
    localCentres.find((centre) => centre.id === selectedCentreId) ??
    localCentres[0];

  const categories = useMemo(
    () =>
      Array.from(
        new Set(selectedCentre?.pois.map((poi) => poi.category) ?? []),
      ).sort(),
    [selectedCentre],
  );

  const selectedCategories =
    activeCategories.length === 0 ? categories : activeCategories;

  if (!selectedCentre) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-app)] p-6">
        <p>No exam centres are available yet.</p>
      </main>
    );
  }

  const visiblePois = selectedCentre.pois
    .filter((poi) => selectedCategories.includes(poi.category))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  const nearestPois = selectedCentre.pois
    .slice()
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5);
  const verifiedPois = selectedCentre.pois.filter(
    (poi) => poi.verifiedStatus === "verified",
  );
  const userDistanceMeters =
    userLocation == null
      ? null
      : distanceBetweenMeters(
          userLocation.latitude,
          userLocation.longitude,
          selectedCentre.latitude,
          selectedCentre.longitude,
        );
  const verificationScore = Math.round(
    (verifiedPois.length / Math.max(selectedCentre.pois.length, 1)) * 100,
  );
  const nearestPoi = nearestPois[0];

  function toggleCategory(category: PoiCategory) {
    setActiveCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not available in this browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "My current location",
        });
        setLocationStatus("Current location captured successfully.");
        setIsLocating(false);
      },
      () => {
        setLocationStatus("Location access was blocked. Enter coordinates manually.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function applyManualLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const latitude = Number(manualLocation.latitude);
    const longitude = Number(manualLocation.longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setLocationStatus("Please enter valid latitude and longitude.");
      return;
    }

    setUserLocation({
      latitude,
      longitude,
      label: "Entered location",
    });
    setLocationStatus("Manual location applied.");
  }

  return (
    <main className="min-h-screen bg-[var(--color-app)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-line)] bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 xl:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-brand)] text-sm font-black text-white">
                MG
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-[var(--color-ink)]">
                    Margdarshak Geo
                  </h1>
                  <StatusPill label="Patna MVP" tone="blue" />
                </div>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-muted)]">
                  {patnaFocusText}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
              <span className="truncate text-sm font-medium text-[var(--color-muted)]">
                Patna centres and nearby POIs only
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 xl:grid-cols-[360px_minmax(0,1fr)_320px] xl:px-6">
        <aside className="flex flex-col gap-4">
          <section className="panel p-4">
            <div className="flex items-center justify-between gap-3">
              <PanelTitle icon={Building2} title="Exam centre" />
              <StatusPill
                label={selectedCentre.verifiedStatus}
                tone={
                  selectedCentre.verifiedStatus === "verified"
                    ? "green"
                    : "amber"
                }
              />
            </div>

            <div className="relative mt-3">
              <select
                aria-label="Exam centre"
                value={selectedCentre.id}
                onChange={(event) => {
                  setSelectedCentreId(event.target.value);
                  setActiveCategories([]);
                }}
                className="w-full appearance-none rounded-lg border border-[var(--color-line)] bg-white px-3 py-3 pr-10 text-sm font-bold outline-none focus:border-[var(--color-brand)]"
              >
                {localCentres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[var(--color-muted)]" />
            </div>

            <div className="mt-4 space-y-3">
              <InfoRow icon={MapPin} text={selectedCentre.address} />
              <InfoRow
                icon={ShieldCheck}
                text={`${selectedCentre.district}, ${selectedCentre.state} - ${selectedCentre.examType}`}
              />
              <InfoRow
                icon={Navigation}
                text={selectedCentre.landmark ?? "Landmark pending"}
              />
            </div>
          </section>

          <section className="panel p-4">
            <div className="flex items-center justify-between gap-3">
              <PanelTitle icon={LocateFixed} title="Your location" />
              <StatusPill
                label={userLocation ? "set" : "unset"}
                tone={userLocation ? "green" : "amber"}
              />
            </div>

            <button
              type="button"
              onClick={useBrowserLocation}
              disabled={isLocating}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              <LocateFixed className="h-4 w-4" />
              {isLocating ? "Locating..." : "Use my location"}
            </button>

            <form onSubmit={applyManualLocation} className="mt-3 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-bold text-[var(--color-ink)]">
                  Latitude
                  <input
                    type="number"
                    step="any"
                    value={manualLocation.latitude}
                    onChange={(event) =>
                      setManualLocation((current) => ({
                        ...current,
                        latitude: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-[var(--color-ink)]">
                  Longitude
                  <input
                    type="number"
                    step="any"
                    value={manualLocation.longitude}
                    onChange={(event) =>
                      setManualLocation((current) => ({
                        ...current,
                        longitude: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-bold text-[var(--color-ink)]"
              >
                Set manual location
              </button>
            </form>

            <p className="mt-3 text-sm text-[var(--color-muted)]">
              {locationStatus}
            </p>
          </section>

          <section className="panel p-4">
            <PanelTitle icon={Sparkles} title="Nearby places" />
            <div className="mt-3 space-y-3">
              {nearestPois.map((poi, index) => (
                <article
                  key={poi.id}
                  className="rounded-lg border border-[var(--color-line)] bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-[0.08em] text-[var(--color-muted)]">
                        #{index + 1} nearest
                      </div>
                      <h3 className="truncate font-bold text-[var(--color-ink)]">
                        {poi.name}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-[var(--color-brand)]">
                        {categoryLabels[poi.category]}
                      </p>
                    </div>
                    {poi.verifiedStatus === "verified" ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-success)]" />
                    ) : (
                      <CircleAlert className="h-5 w-5 shrink-0 text-[var(--color-warn)]" />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">
                    {poi.address}
                  </p>
                  {userLocation && (
                    <p className="mt-2 text-xs font-bold text-[var(--color-brand)]">
                      From you:{" "}
                      {Math.round(
                        distanceBetweenMeters(
                          userLocation.latitude,
                          userLocation.longitude,
                          poi.latitude,
                          poi.longitude,
                        ),
                      )}{" "}
                      m
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <MiniStat label="From centre" value={`${poi.distanceMeters} m`} />
                    <MiniStat label="Walk" value={`${poi.walkingTimeMinutes} min`} />
                    <MiniStat label="Drive" value={`${poi.drivingTimeMinutes} min`} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-[var(--color-ink)]">
                  {selectedCentre.name}
                </h2>
                <StatusPill label={`${selectedCentre.pois.length} POIs`} tone="blue" />
              </div>
              <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">
                {selectedCentre.gateInfo ?? "Gate information pending"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-4">
            <Metric label="Centres" value={localCentres.length.toString()} />
            <Metric label="Verified" value={`${verificationScore}%`} />
            <Metric
              label="From you"
              value={userDistanceMeters == null ? "--" : `${Math.round(userDistanceMeters / 1000 * 10) / 10} km`}
            />
            <Metric
              label="Nearest POI"
              value={nearestPoi ? `${nearestPoi.distanceMeters} m` : "--"}
            />
          </div>

          <div className="border-b border-[var(--color-line)] bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-[#8a4b08]">
            {userDistanceMeters == null
              ? "Set your location to see how far the centre is from you."
              : `You are about ${Math.round(userDistanceMeters / 100) / 10} km from this centre.`
            }
          </div>

          <div className="h-[calc(100vh-266px)] min-h-[560px]">
            <MapPane
              centre={selectedCentre}
              activeCategories={selectedCategories}
              userLocation={userLocation}
            />
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="panel p-4">
            <PanelTitle icon={ShieldCheck} title="Centre view" />
            <div className="mt-4 space-y-3">
              <QualityRow
                label="Verified nearby places"
                value={verifiedPois.length.toString()}
                tone="green"
              />
              <QualityRow
                label="Needs review"
                value={(selectedCentre.pois.length - verifiedPois.length).toString()}
                tone="amber"
              />
              <QualityRow
                label="Distance known"
                value={userDistanceMeters == null ? "No" : "Yes"}
                tone="blue"
              />
            </div>
          </section>

          <section className="panel p-4">
            <PanelTitle icon={Building2} title="POI filters" />
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => {
                const isActive = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`rounded-md border px-3 py-2 text-xs font-bold ${
                      isActive
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                        : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
                    }`}
                  >
                    {categoryLabels[category]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel p-4">
            <PanelTitle icon={CheckCircle2} title="Current list" />
            <div className="mt-3 space-y-3">
              {visiblePois.map((poi) => (
                <article
                  key={poi.id}
                  className="rounded-lg border border-[var(--color-line)] bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-[var(--color-ink)]">
                        {poi.name}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-[var(--color-brand)]">
                        {categoryLabels[poi.category]}
                      </p>
                    </div>
                    {poi.verifiedStatus === "verified" ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-success)]" />
                    ) : (
                      <CircleAlert className="h-5 w-5 shrink-0 text-[var(--color-warn)]" />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">
                    {poi.address}
                  </p>
                  {userLocation && (
                    <p className="mt-2 text-xs font-bold text-[var(--color-brand)]">
                      From you:{" "}
                      {Math.round(
                        distanceBetweenMeters(
                          userLocation.latitude,
                          userLocation.longitude,
                          poi.latitude,
                          poi.longitude,
                        ),
                      )}{" "}
                      m
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <MiniStat label="Distance" value={`${poi.distanceMeters} m`} />
                    <MiniStat label="Walk" value={`${poi.walkingTimeMinutes} min`} />
                    <MiniStat label="Drive" value={`${poi.drivingTimeMinutes} min`} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function InfoRow({
  icon: Icon,
  text,
}: {
  icon: typeof MapPin;
  text: string;
}) {
  return (
    <div className="flex gap-2 text-sm font-medium text-[var(--color-muted)]">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
      <span>{text}</span>
    </div>
  );
}

function PanelTitle({
  icon: Icon,
  title,
}: {
  icon: typeof Building2;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-sm font-black uppercase tracking-[0.08em] text-[var(--color-muted)]">
        {title}
      </h2>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="text-xl font-black text-[var(--color-ink)]">{value}</div>
      <div className="mt-0.5 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted)]">
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--color-soft)] px-2 py-2">
      <div className="font-black text-[var(--color-ink)]">{value}</div>
      <div className="mt-1 text-[var(--color-muted)]">{label}</div>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "blue" | "green" | "amber";
}) {
  const colors = {
    blue: "bg-[var(--color-brand-soft)] text-[var(--color-brand)]",
    green: "bg-[#e8f7ef] text-[var(--color-success)]",
    amber: "bg-[#fff4df] text-[var(--color-warn)]",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${colors[tone]}`}>
      {label}
    </span>
  );
}

function QualityRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "blue";
}) {
  const colors = {
    green: "text-[var(--color-success)] bg-[#e8f7ef]",
    amber: "text-[var(--color-warn)] bg-[#fff4df]",
    blue: "text-[var(--color-brand)] bg-[var(--color-brand-soft)]",
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-line)] bg-white p-3">
      <span className="text-sm font-bold text-[var(--color-ink)]">{label}</span>
      <span className={`grid min-w-12 place-items-center rounded-md px-2 py-1 text-sm font-black ${colors[tone]}`}>
        {value}
      </span>
    </div>
  );
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
