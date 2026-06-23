"use client";

import dynamic from "next/dynamic";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Database,
  FileWarning,
  Layers3,
  ListFilter,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
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

const navItems = ["Dashboard", "Centres", "POIs", "Reports", "Imports"];

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
      <main className="grid min-h-screen place-items-center bg-[var(--color-app)] p-6">
        <p>No exam centres are available yet.</p>
      </main>
    );
  }

  const visiblePois = selectedCentre.pois.filter((poi) =>
    selectedCategories.includes(poi.category),
  );
  const verifiedPois = selectedCentre.pois.filter(
    (poi) => poi.verifiedStatus === "verified",
  );
  const reportedPois = selectedCentre.pois.filter(
    (poi) => poi.verifiedStatus === "reported",
  );
  const verificationScore = Math.round(
    (verifiedPois.length / Math.max(selectedCentre.pois.length, 1)) * 100,
  );

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
                  <StatusPill label="Local MVP" tone="blue" />
                </div>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-muted)]">
                  Exam centre intelligence and student-focused nearby places
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                <span className="truncate text-sm font-medium text-[var(--color-muted)]">
                  Search centres, POIs, districts
                </span>
              </div>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-white">
                <Plus className="h-4 w-4" />
                Add POI
              </button>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto">
            {navItems.map((item, index) => (
              <button
                key={item}
                className={`rounded-md px-3 py-2 text-sm font-bold ${
                  index === 0
                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-soft)]"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 xl:grid-cols-[360px_minmax(0,1fr)_320px] xl:px-6">
        <aside className="flex flex-col gap-4">
          <section className="panel p-4">
            <div className="flex items-center justify-between gap-3">
              <PanelTitle icon={Building2} title="Centre" />
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
                {centres.map((centre) => (
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
              <PanelTitle icon={ListFilter} title="POI Filters" />
              <button
                type="button"
                onClick={() => setActiveCategories([])}
                className="rounded-md border border-[var(--color-line)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-ink)]"
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
            <PanelTitle icon={Database} title="Nearby POIs" />
            <div className="mt-3 space-y-3">
              {visiblePois.map((poi) => (
                <article key={poi.id} className="rounded-lg border border-[var(--color-line)] bg-white p-3">
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
                      <BadgeCheck className="h-5 w-5 shrink-0 text-[var(--color-success)]" />
                    ) : (
                      <CircleAlert className="h-5 w-5 shrink-0 text-[var(--color-warn)]" />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">
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
        </aside>

        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-[var(--color-ink)]">
                  {selectedCentre.name}
                </h2>
                <StatusPill label={`${visiblePois.length} visible`} tone="blue" />
              </div>
              <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">
                {selectedCentre.gateInfo ?? "Gate information pending"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={LocateFixed} label="Locate" variant="light" />
              <ActionButton icon={Route} label="Route" variant="dark" />
              <ActionButton icon={FileWarning} label="Report" variant="light" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-4">
            <Metric label="Centres" value={centres.length.toString()} />
            <Metric label="Total POIs" value={selectedCentre.pois.length.toString()} />
            <Metric label="Verified" value={`${verificationScore}%`} />
            <Metric label="Reports" value={reportedPois.length.toString()} />
          </div>

          <div className="h-[calc(100vh-247px)] min-h-[560px]">
            <MapPane
              centre={selectedCentre}
              activeCategories={selectedCategories}
            />
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="panel p-4">
            <PanelTitle icon={Sparkles} title="Exam-Day Summary" />
            <div className="mt-4 space-y-3">
              <QualityRow
                icon={CheckCircle2}
                label="Verified nearby places"
                value={verifiedPois.length.toString()}
                tone="green"
              />
              <QualityRow
                icon={CircleAlert}
                label="Needs review"
                value={(selectedCentre.pois.length - verifiedPois.length).toString()}
                tone="amber"
              />
              <QualityRow
                icon={Layers3}
                label="Active categories"
                value={selectedCategories.length.toString()}
                tone="blue"
              />
            </div>
          </section>

          <section className="panel p-4">
            <PanelTitle icon={Clock3} title="Priority Checks" />
            <div className="mt-4 space-y-3">
              <ChecklistItem checked label="Railway and bus access" />
              <ChecklistItem checked={verificationScore >= 50} label="Core POIs verified" />
              <ChecklistItem checked={reportedPois.length === 0} label="No open reports" />
              <ChecklistItem checked={Boolean(selectedCentre.gateInfo)} label="Gate info added" />
            </div>
          </section>

          <section className="panel p-4">
            <PanelTitle icon={Route} title="Next Modules" />
            <div className="mt-4 grid gap-2">
              <ModuleButton label="Admin CRUD" />
              <ModuleButton label="Student suggestions" />
              <ModuleButton label="Route engine" />
              <ModuleButton label="CSV import" />
            </div>
          </section>
        </aside>
      </section>
    </main>
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

function ActionButton({
  icon: Icon,
  label,
  variant,
}: {
  icon: typeof Route;
  label: string;
  variant: "dark" | "light";
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
        variant === "dark"
          ? "bg-[var(--color-brand)] text-white"
          : "border border-[var(--color-line)] bg-white text-[var(--color-ink)]"
      }`}
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
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
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
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 place-items-center rounded-md ${colors[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold text-[var(--color-ink)]">{label}</span>
      </div>
      <span className="text-lg font-black text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-[var(--color-ink)]">
      <span
        className={`grid h-5 w-5 place-items-center rounded-full border ${
          checked
            ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
            : "border-[var(--color-line)] bg-white text-transparent"
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
      {label}
    </div>
  );
}

function ModuleButton({ label }: { label: string }) {
  return (
    <button className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-left text-sm font-bold text-[var(--color-ink)]">
      {label}
    </button>
  );
}
