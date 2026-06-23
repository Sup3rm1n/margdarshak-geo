"use client";

import dynamic from "next/dynamic";
import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  Database,
  MapPin,
  Navigation,
  Route,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { categoryLabels } from "@/lib/category-meta";
import type { ExamCentre, PoiCategory } from "@/lib/types";

const MapPane = dynamic(
  () => import("./map-pane").then((module) => module.MapPane),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[420px] place-items-center bg-[#dfe7dc] text-sm font-semibold text-[#526050]">
        Loading map
      </div>
    ),
  },
);

type GeoWorkspaceProps = {
  centres: ExamCentre[];
};

export function GeoWorkspace({ centres }: GeoWorkspaceProps) {
  const [selectedCentreId, setSelectedCentreId] = useState(centres[0]?.id);
  const selectedCentre =
    centres.find((centre) => centre.id === selectedCentreId) ?? centres[0];

  const categories = useMemo(
    () =>
      Array.from(
        new Set(selectedCentre?.pois.map((poi) => poi.category) ?? []),
      ).sort(),
    [selectedCentre],
  );
  const [activeCategories, setActiveCategories] = useState<PoiCategory[]>([]);

  const selectedCategories =
    activeCategories.length === 0 ? categories : activeCategories;

  function toggleCategory(category: PoiCategory) {
    setActiveCategories((current) => {
      const base = current.length === 0 ? categories : current;
      return base.includes(category)
        ? base.filter((item) => item !== category)
        : [...base, category];
    });
  }

  if (!selectedCentre) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <p>No exam centres are available yet.</p>
      </main>
    );
  }

  const visiblePois = selectedCentre.pois.filter((poi) =>
    selectedCategories.includes(poi.category),
  );

  return (
    <main className="min-h-screen bg-[#f7f8f4]">
      <header className="border-b border-[#d9dfd4] bg-white/95 px-5 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">
              Margdarshak Geo
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#16201a] md:text-3xl">
              Exam centre map and nearby POI desk
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Metric label="Centres" value={centres.length} />
            <Metric label="POIs" value={selectedCentre.pois.length} />
            <Metric
              label="Verified"
              value={
                selectedCentre.pois.filter(
                  (poi) => poi.verifiedStatus === "verified",
                ).length
              }
            />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-[#d9dfd4] bg-white p-4">
            <label
              htmlFor="centre"
              className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c7669]"
            >
              Exam centre
            </label>
            <select
              id="centre"
              value={selectedCentre.id}
              onChange={(event) => {
                setSelectedCentreId(event.target.value);
                setActiveCategories([]);
              }}
              className="mt-2 w-full rounded-md border border-[#c8d0c1] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#0f766e]"
            >
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.name}
                </option>
              ))}
            </select>

            <div className="mt-4 space-y-3">
              <InfoRow icon={MapPin} text={selectedCentre.address} />
              <InfoRow
                icon={ShieldCheck}
                text={`${selectedCentre.district}, ${selectedCentre.state} · ${selectedCentre.examType}`}
              />
              <InfoRow
                icon={Navigation}
                text={selectedCentre.landmark ?? "Landmark not added"}
              />
            </div>
          </section>

          <section className="rounded-lg border border-[#d9dfd4] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#6c7669]">
                Categories
              </h2>
              <button
                type="button"
                onClick={() => setActiveCategories([])}
                className="rounded-md border border-[#c8d0c1] px-2 py-1 text-xs font-semibold text-[#364238]"
              >
                All
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => {
                const isActive = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                      isActive
                        ? "border-[#0f766e] bg-[#e5f3ef] text-[#0f4f49]"
                        : "border-[#d9dfd4] bg-white text-[#626d60]"
                    }`}
                  >
                    {categoryLabels[category]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[#d9dfd4] bg-white p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#6c7669]">
              Nearby places
            </h2>
            <div className="mt-3 space-y-3">
              {visiblePois.map((poi) => (
                <article
                  key={poi.id}
                  className="rounded-md border border-[#e2e6df] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#16201a]">
                        {poi.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-[#0f766e]">
                        {categoryLabels[poi.category]}
                      </p>
                    </div>
                    {poi.verifiedStatus === "verified" ? (
                      <BadgeCheck className="h-5 w-5 text-[#0f766e]" />
                    ) : (
                      <CircleAlert className="h-5 w-5 text-[#b45309]" />
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#526050]">{poi.address}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <MiniStat label="Distance" value={`${poi.distanceMeters} m`} />
                    <MiniStat
                      label="Walk"
                      value={`${poi.walkingTimeMinutes} min`}
                    />
                    <MiniStat
                      label="Drive"
                      value={`${poi.drivingTimeMinutes} min`}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="overflow-hidden rounded-lg border border-[#d9dfd4] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#d9dfd4] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#16201a]">
                {selectedCentre.name}
              </h2>
              <p className="mt-1 text-sm text-[#526050]">
                {selectedCentre.gateInfo ?? "Gate information pending"}
              </p>
            </div>
            <div className="flex gap-2">
              <ActionButton icon={Route} label="Route" />
              <ActionButton icon={Database} label="Report" />
              <ActionButton icon={Clock3} label="Suggest" />
            </div>
          </div>
          <div className="h-[calc(100vh-190px)] min-h-[520px]">
            <MapPane
              centre={selectedCentre}
              activeCategories={selectedCategories}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#d9dfd4] bg-[#fbfcf8] px-3 py-2">
      <div className="text-lg font-bold text-[#16201a]">{value}</div>
      <div className="text-xs font-semibold text-[#6c7669]">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f1f4ed] px-2 py-2">
      <div className="font-bold text-[#16201a]">{value}</div>
      <div className="mt-1 text-[#6c7669]">{label}</div>
    </div>
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
    <div className="flex gap-2 text-sm text-[#526050]">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
      <span>{text}</span>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
}: {
  icon: typeof Route;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-md bg-[#16201a] px-3 py-2 text-sm font-semibold text-white"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
