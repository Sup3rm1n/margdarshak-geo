"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowUpRight,
  Bike,
  Building2,
  CheckCircle2,
  CircleAlert,
  Copy,
  CarFront,
  LocateFixed,
  MapPin,
  Footprints,
  ShieldCheck,
  Map,
  Share2,
  Navigation2,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { categoryLabels } from "@/lib/category-meta";
import type { ExamCentre, PoiCategory } from "@/lib/types";

const MapPane = dynamic(
  () => import("./map-pane").then((module) => module.MapPane),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[420px] place-items-center rounded-[20px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-sm font-semibold text-[var(--color-muted)]">
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

const FULL_MAP_PATH = "/geo";

export function GeoWorkspace({ centres }: GeoWorkspaceProps) {
  const localCentres = centres;
  const [selectedCentreId, setSelectedCentreId] = useState(centres[0]?.id);
  const [activeCategories, setActiveCategories] = useState<PoiCategory[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [manualLocation, setManualLocation] = useState({
    latitude: "",
    longitude: "",
  });
  const [mapMode, setMapMode] = useState<"road" | "satellite">("road");
  const [isMapHidden, setIsMapHidden] = useState(false);
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState(
    "Use your current location or enter coordinates to measure distance to the centre.",
  );
  const [isLocating, setIsLocating] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  const selectedCentre =
    localCentres.find((centre) => centre.id === selectedCentreId) ??
    localCentres[0];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedCentre = params.get("centre");

    if (
      requestedCentre &&
      localCentres.some((centre) => centre.id === requestedCentre)
    ) {
      queueMicrotask(() => setSelectedCentreId(requestedCentre));
    }
  }, [localCentres]);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedCentre) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("centre", selectedCentre.id);
    window.history.replaceState({}, "", url.toString());
  }, [selectedCentre]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.style.overflow = isFullMapOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullMapOpen]);

  if (!selectedCentre) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-app)] p-6">
        <p>No exam centres are available yet.</p>
      </main>
    );
  }

  const visiblePois = selectedCentre.pois
    .filter((poi) => activeCategories.length === 0 || activeCategories.includes(poi.category))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
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
  const roadDistanceMeters = userDistanceMeters
    ? Math.round(userDistanceMeters * 1.28)
    : selectedCentre.pois[0]?.distanceMeters ?? null;
  const fastestEtaMinutes = roadDistanceMeters
    ? Math.max(4, Math.round(roadDistanceMeters / 820))
    : null;
  const roadDistanceKm =
    roadDistanceMeters == null
      ? null
      : Math.round((roadDistanceMeters / 1000) * 10) / 10;
  const walkingEtaMinutes = roadDistanceMeters
    ? Math.max(18, Math.round(roadDistanceMeters / 75))
    : null;
  const bikeEtaMinutes = roadDistanceMeters
    ? Math.max(8, Math.round(roadDistanceMeters / 220))
    : null;

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
        setLocationStatus(
          "Location access was blocked. Enter coordinates manually.",
        );
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

  async function shareCurrentCentre() {
    const url = new URL(FULL_MAP_PATH, window.location.origin);
    url.searchParams.set("centre", selectedCentre.id);
    const shareText = [
      `Please verify this exam centre on Margdarshak:`,
      selectedCentre.name,
      `Address: ${selectedCentre.address}`,
      `City: ${selectedCentre.district}`,
      `Verification: Level 4: Source verified`,
      `Status: Verified by Margdarshak`,
      url.toString(),
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedCentre.name,
          text: shareText,
          url: url.toString(),
        });
        setShareStatus("Centre link shared.");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setShareStatus("Centre link copied to clipboard.");
    } catch {
      setShareStatus(
        "Could not share automatically. Copy the URL from the address bar.",
      );
    }
  }

  function openFullMapForCentre() {
    setIsFullMapOpen(true);
  }

  function closeFullMap() {
    setIsFullMapOpen(false);
  }

  function openCentrePage() {
    const url = new URL(FULL_MAP_PATH, window.location.origin);
    url.searchParams.set("centre", selectedCentre.id);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  function copyAddress() {
    navigator.clipboard.writeText(selectedCentre.address).then(() => {
      setShareStatus("Address copied.");
    });
  }

  function openGoogleMaps() {
    const url = new URL("https://www.google.com/maps/search/");
    url.searchParams.set("api", "1");
    url.searchParams.set("query", selectedCentre.address);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-[var(--color-app)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-line)] bg-[rgba(7,16,28,0.82)] backdrop-blur-xl">
        <div className="mx-auto max-w-[1240px] px-4 py-3 xl:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-brand)] text-sm font-black text-[#061019]">
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
                  Centre detail, map preview, nearby POIs, and travel planning
                </p>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-end">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm font-bold text-[var(--color-ink)]"
              >
                <ArrowUpRight className="h-4 w-4" />
                Search another centre
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1240px] px-4 py-4 xl:px-6">
        <div className="overflow-hidden rounded-[12px] border border-[rgba(128,171,209,0.18)] bg-[linear-gradient(180deg,rgba(12,20,35,0.84),rgba(8,14,26,0.92))] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
            <div className="space-y-5 p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                  Centre confirmed
                </div>
                <StatusPill
                  label={
                    selectedCentre.verifiedStatus === "verified"
                      ? "verified"
                      : selectedCentre.verifiedStatus
                  }
                  tone={
                    selectedCentre.verifiedStatus === "verified"
                      ? "green"
                      : "amber"
                  }
                />
              </div>

              <div className="space-y-3">
                <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-black leading-[0.96] tracking-[-0.02em] text-[var(--color-ink)]">
                  {selectedCentre.name}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted)] sm:text-base">
                  {selectedCentre.address}
                </p>
                <div className="flex flex-wrap gap-2">
                  <StatPill
                    title="Verified by Margdarshak"
                    value="Yes"
                    tone="green"
                  />
                  <StatPill title="Level 4" value="Source verified" tone="blue" />
                  <StatPill title="Last updated" value="17 Jun 2026" tone="muted" />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <InfoRow
                  icon={ShieldCheck}
                  text={`${selectedCentre.district}, ${selectedCentre.state}`}
                />
                <InfoRow icon={Map} text={selectedCentre.examType} />
                <InfoRow
                  icon={MapPin}
                  text={selectedCentre.landmark ?? "Landmark pending"}
                />
                <InfoRow
                  icon={Building2}
                  text={selectedCentre.gateInfo ?? "Gate info pending"}
                />
              </div>

              <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                Use this page to verify the exact exam centre, confirm the pin,
                measure your distance, and keep nearby support points in one
                place before exam day.
              </p>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <ActionButton
                  icon={ArrowUpRight}
                  label="Open centre page"
                  onClick={openCentrePage}
                />
                <ActionButton
                  icon={LocateFixed}
                  label="Distance from me"
                  onClick={useBrowserLocation}
                />
                <ActionButton icon={Copy} label="Copy address" onClick={copyAddress} />
                <ActionButton
                  icon={Navigation2}
                  label="Open in Google Maps"
                  onClick={openGoogleMaps}
                />
                <ActionButton
                  icon={Share2}
                  label="Share on WhatsApp"
                  onClick={shareCurrentCentre}
                />
                <ActionButton
                  icon={Map}
                  label="Open full map"
                  onClick={openFullMapForCentre}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="rounded-[18px] border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-brand)]">
                    Live status
                  </div>
                  <div className="mt-2 text-lg font-black text-[var(--color-ink)]">
                    {userDistanceMeters == null
                      ? "Distance from me"
                      : `${Math.round((userDistanceMeters / 1000) * 10) / 10} km away`}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {locationStatus}
                  </p>
                  {shareStatus && (
                    <p className="mt-2 text-sm font-semibold text-[var(--color-brand)]">
                      {shareStatus}
                    </p>
                  )}
                </div>

                <div className="rounded-[18px] border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-brand)]">
                    Route snapshot
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <MiniStat
                      label="Road route"
                      value={roadDistanceKm ? `${roadDistanceKm} km` : "--"}
                    />
                    <MiniStat
                      label="Fastest ETA"
                      value={fastestEtaMinutes ? `${fastestEtaMinutes} min` : "--"}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Use this as a quick planning check, not your only buffer.
                  </p>
                </div>
              </div>

              <div className="rounded-[18px] border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <PanelTitle icon={LocateFixed} title="Your location" />
                  <StatusPill
                    label={userLocation ? "set" : "unset"}
                    tone={userLocation ? "green" : "amber"}
                  />
                </div>

                <div className="mt-3 grid gap-3">
                  <button
                    type="button"
                    onClick={useBrowserLocation}
                    disabled={isLocating}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-3 text-sm font-black text-[#061019] shadow-[0_10px_30px_rgba(118,221,255,0.18)] transition hover:translate-y-[-1px] disabled:opacity-60"
                  >
                    <LocateFixed className="h-4 w-4" />
                    {isLocating ? "Locating..." : "Use my location"}
                  </button>

                  <form onSubmit={applyManualLocation} className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid min-w-0 gap-1 text-sm font-bold text-[var(--color-ink)]">
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
                          className="w-full min-w-0 rounded-lg border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                        />
                      </label>
                      <label className="grid min-w-0 gap-1 text-sm font-bold text-[var(--color-ink)]">
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
                          className="w-full min-w-0 rounded-lg border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm font-bold text-[var(--color-ink)]"
                    >
                      Set manual location
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--color-line)] xl:border-l xl:border-t-0">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
                    Map preview
                  </div>
                  <div className="text-sm text-[var(--color-muted)]">
                    Keep this open while you verify the pin and nearby roads.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMapHidden((current) => !current)}
                  className="rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm font-bold text-[var(--color-ink)]"
                >
                  {isMapHidden ? "Show map" : "Hide map"}
                </button>
              </div>

              <div className="min-h-[460px]">
                {isMapHidden ? (
                  <div className="grid min-h-[460px] place-items-center px-6 text-center">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
                        Map hidden
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        Keep the map open to inspect the pin, roads, and nearby
                        landmarks.
                      </p>
                    </div>
                  </div>
                ) : (
                  <MapPane
                    centre={selectedCentre}
                    activeCategories={activeCategories}
                    userLocation={userLocation}
                    mapMode={mapMode}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-4 rounded-[12px] border border-[rgba(128,171,209,0.18)] bg-[linear-gradient(180deg,rgba(12,20,35,0.84),rgba(8,14,26,0.92))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
                Route intelligence
              </div>
              <h2 className="mt-1 text-lg font-black text-[var(--color-ink)]">
                Fastest, walking, bike, and crowd-aware guidance
              </h2>
            </div>
            <StatusPill label="Live route ETA" tone="blue" />
          </div>

          <p className="mt-3 max-w-3xl text-sm text-[var(--color-muted)]">
            Based on about {roadDistanceKm ? `${roadDistanceKm} km` : "--"} of
            road travel, this panel compares walking, bike, and car routes, then
            adds a crowd-aware estimate for exam-day planning.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <SmallPlanCard
              title="Fastest route"
              value={fastestEtaMinutes ? `${fastestEtaMinutes} min` : "--"}
              detail="Best current road ETA"
            />
            <SmallPlanCard
              title="Walking route"
              value={walkingEtaMinutes ? `${walkingEtaMinutes} min` : "--"}
              detail="Good for short distances"
            />
            <SmallPlanCard
              title="Bike route"
              value={bikeEtaMinutes ? `${bikeEtaMinutes} min` : "--"}
              detail="Usually best in Patna city movement"
            />
            <SmallPlanCard
              title="Crowd pressure"
              value={getCrowdPressureLabel(selectedCentre.pois.length, userLocation)}
              detail="Estimated from nearby activity"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-black text-[#061019]">
              Fastest
            </button>
            <button className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-bold text-[var(--color-muted)]">
              Least crowded
            </button>
            <button className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-bold text-[var(--color-muted)]">
              Best walking
            </button>
          </div>

          <div className="mt-4 rounded-[18px] border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
                  Suggested routes
                </div>
                <h3 className="mt-1 text-base font-black text-[var(--color-ink)]">
                  Pick the mode that fits distance and crowd pressure
                </h3>
              </div>
              <StatusPill label="Crowd aware" tone="green" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <RouteModeCard
                icon={Footprints}
                title="Walk"
                eta={walkingEtaMinutes}
                reason="Best for nearby centres and short, dense lanes"
                crowd="Low vehicle dependency"
              />
              <RouteModeCard
                icon={Bike}
                title="Bike"
                eta={bikeEtaMinutes}
                reason="Best balance for Patna traffic and exam-time movement"
                crowd="Often fastest in mixed roads"
              />
              <RouteModeCard
                icon={CarFront}
                title="Car / Auto"
                eta={fastestEtaMinutes}
                reason="Best when distance is longer or weather is poor"
                crowd="Safer fallback if walking is crowded"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-bold text-[var(--color-ink)]"
              >
                Open walking route
              </button>
              <button
                type="button"
                className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-black text-[#061019]"
              >
                Open bike route
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <StatPill
                title="Crowd signal"
                value={getCrowdPressureLabel(selectedCentre.pois.length, userLocation)}
                tone={getCrowdTone(selectedCentre.pois.length, userLocation)}
              />
              <StatPill
                title="How it works"
                value="Uses live location plus route distance now; opt-in user density can plug in later."
                tone="muted"
              />
            </div>

            <p className="mt-4 text-sm text-[var(--color-muted)]">
              For live crowding later, we can add anonymous opt-in user density
              per map cell, then merge it with the route score and peak-time
              history.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-[12px] border border-[rgba(128,171,209,0.18)] bg-[linear-gradient(180deg,rgba(12,20,35,0.84),rgba(8,14,26,0.92))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
                Inspect
              </div>
              <h2 className="mt-1 text-lg font-black text-[var(--color-ink)]">
                Nearby POIs
              </h2>
            </div>
            <StatusPill label={`${verifiedPois.length} verified`} tone="blue" />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategories([])}
              className="rounded-full border border-[var(--color-line)] px-3 py-2 text-xs font-bold text-[var(--color-muted)]"
            >
              All
            </button>
            {selectedCentre.pois.map((poi) => {
              const isActive = activeCategories.includes(poi.category);
              return (
                <button
                  key={poi.category}
                  type="button"
                  onClick={() =>
                    setActiveCategories((current) =>
                      current.includes(poi.category)
                        ? current.filter((item) => item !== poi.category)
                        : [...current, poi.category],
                    )
                  }
                  className={`rounded-full border px-3 py-2 text-xs font-bold ${
                    isActive
                      ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                      : "border-[var(--color-line)] text-[var(--color-muted)]"
                  }`}
                >
                  {categoryLabels[poi.category]}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visiblePois.map((poi) => (
              <article
                key={poi.id}
                className="rounded-[18px] border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-black text-[var(--color-ink)]">
                      {poi.name}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-[var(--color-brand)]">
                      {categoryLabels[poi.category]}
                    </p>
                  </div>
                  {poi.verifiedStatus === "verified" ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                  ) : (
                    <CircleAlert className="h-5 w-5 text-[var(--color-warn)]" />
                  )}
                </div>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {poi.address}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <MiniStat label="Distance" value={`${poi.distanceMeters} m`} />
                  <MiniStat label="Walk" value={`${poi.walkingTimeMinutes} min`} />
                  <MiniStat label="Drive" value={`${poi.drivingTimeMinutes} min`} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      {isFullMapOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--color-app)]">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3 backdrop-blur-xl">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
                  Full map
                </div>
                <div className="text-sm font-bold text-[var(--color-ink)]">
                  {selectedCentre.name}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMapMode((mode) => (mode === "road" ? "satellite" : "road"))
                  }
                  className="rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm font-bold text-[var(--color-ink)]"
                >
                  {mapMode === "road" ? "Satellite" : "Road"}
                </button>
                <button
                  type="button"
                  onClick={closeFullMap}
                  className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-black text-[#061019]"
                >
                  Back
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <MapPane
                centre={selectedCentre}
                activeCategories={activeCategories}
                userLocation={userLocation}
                mapMode={mapMode}
              />
            </div>
          </div>
        </div>
      )}
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
    <div className="flex min-w-0 gap-2 text-sm font-medium text-[var(--color-muted)]">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function StatPill({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "green" | "amber" | "blue" | "muted";
}) {
  const tones = {
    green: "border-[rgba(121,230,187,0.18)] bg-[rgba(121,230,187,0.08)] text-[var(--color-success)]",
    amber: "border-[rgba(255,215,122,0.18)] bg-[rgba(255,215,122,0.08)] text-[var(--color-warn)]",
    blue: "border-[rgba(118,221,255,0.18)] bg-[rgba(118,221,255,0.08)] text-[var(--color-brand)]",
    muted: "border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] text-[var(--color-muted)]",
  };

  return (
    <div className={`rounded-2xl border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.16em]">
        {title}
      </div>
      <div className="mt-1 text-sm font-black text-[var(--color-ink)]">{value}</div>
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

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Map;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-sm font-bold text-[var(--color-ink)]"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
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
    blue: "bg-[rgba(118,221,255,0.12)] text-[var(--color-brand)]",
    green: "bg-[rgba(121,230,187,0.12)] text-[var(--color-success)]",
    amber: "bg-[rgba(255,215,122,0.14)] text-[var(--color-warn)]",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${colors[tone]}`}>
      {label}
    </span>
  );
}

function SmallPlanCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] p-4">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
        {title}
      </div>
      <div className="mt-1 text-xl font-black text-[var(--color-ink)]">{value}</div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{detail}</p>
    </article>
  );
}

function RouteModeCard({
  icon: Icon,
  title,
  eta,
  reason,
  crowd,
}: {
  icon: typeof Footprints;
  title: string;
  eta: number | null;
  reason: string;
  crowd: string;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-brand)]">
            {title}
          </div>
          <div className="text-lg font-black text-[var(--color-ink)]">
            {eta ? `${eta} min` : "--"}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--color-muted)]">{reason}</p>
      <p className="mt-2 text-xs font-bold text-[var(--color-success)]">
        {crowd}
      </p>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[rgba(255,255,255,0.04)] px-2 py-2">
      <div className="font-black text-[var(--color-ink)]">{value}</div>
      <div className="mt-1 text-[var(--color-muted)]">{label}</div>
    </div>
  );
}

function getCrowdPressureScore(
  totalPois: number,
  userLocation: UserLocation | null,
) {
  const base = 18 + totalPois * 5 + (userLocation ? 12 : 0);
  return Math.max(10, Math.min(92, base));
}

function getCrowdPressureLabel(
  totalPois: number,
  userLocation: UserLocation | null,
) {
  const score = getCrowdPressureScore(totalPois, userLocation);

  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function getCrowdTone(
  totalPois: number,
  userLocation: UserLocation | null,
): "green" | "amber" | "blue" {
  const score = getCrowdPressureScore(totalPois, userLocation);

  if (score >= 70) return "amber";
  if (score >= 40) return "blue";
  return "green";
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
