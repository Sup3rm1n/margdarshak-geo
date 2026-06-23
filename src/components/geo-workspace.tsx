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
  X,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { categoryLabels } from "@/lib/category-meta";
import type { ExamCentre, Poi, PoiCategory } from "@/lib/types";

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

type ModalMode = "centre" | "poi" | "suggestion" | "report" | null;

type Report = {
  id: string;
  centreId: string;
  title: string;
  details: string;
};

const navItems = ["Dashboard", "Centres", "POIs", "Reports", "Imports"];
const allCategories = Object.keys(categoryLabels) as PoiCategory[];

const emptyCentreForm = {
  name: "",
  address: "",
  district: "Patna",
  state: "Bihar",
  latitude: "",
  longitude: "",
  landmark: "",
  examType: "",
  gateInfo: "",
};

const emptyPoiForm = {
  name: "",
  category: "photocopy" as PoiCategory,
  address: "",
  latitude: "",
  longitude: "",
  phone: "",
  openingHours: "",
};

const emptyReportForm = {
  title: "",
  details: "",
};

export function GeoWorkspace({ centres }: GeoWorkspaceProps) {
  const [localCentres, setLocalCentres] = useState(centres);
  const [selectedCentreId, setSelectedCentreId] = useState(centres[0]?.id);
  const [activeCategories, setActiveCategories] = useState<PoiCategory[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [centreForm, setCentreForm] = useState(emptyCentreForm);
  const [poiForm, setPoiForm] = useState(emptyPoiForm);
  const [reportForm, setReportForm] = useState(emptyReportForm);
  const [reports, setReports] = useState<Report[]>([]);
  const [notice, setNotice] = useState("Local mode: changes are stored in memory until Supabase write APIs are connected.");

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

  function toggleCategory(category: PoiCategory) {
    setActiveCategories((current) => {
      const base = current.length === 0 ? categories : current;
      return base.includes(category)
        ? base.filter((item) => item !== category)
        : [...base, category];
    });
  }

  function openModal(mode: ModalMode) {
    setModalMode(mode);
    setNotice("Fill the form and submit. This local build updates instantly without touching production data.");
  }

  function closeModal() {
    setModalMode(null);
    setCentreForm(emptyCentreForm);
    setPoiForm(emptyPoiForm);
    setReportForm(emptyReportForm);
  }

  function addCentre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const centre: ExamCentre = {
      id: slugId(centreForm.name),
      name: centreForm.name,
      address: centreForm.address,
      district: centreForm.district,
      state: centreForm.state,
      latitude: Number(centreForm.latitude),
      longitude: Number(centreForm.longitude),
      landmark: centreForm.landmark || null,
      examType: centreForm.examType,
      gateInfo: centreForm.gateInfo || null,
      verifiedStatus: "unverified",
      pois: [],
    };

    setLocalCentres((current) => [...current, centre]);
    setSelectedCentreId(centre.id);
    setActiveCategories([]);
    setNotice(`${centre.name} added locally. Add nearby POIs next.`);
    closeModal();
  }

  function addPoi(event: FormEvent<HTMLFormElement>, source: Poi["source"]) {
    event.preventDefault();

    if (!selectedCentre) {
      return;
    }

    const distanceMeters = distanceBetweenMeters(
      selectedCentre.latitude,
      selectedCentre.longitude,
      Number(poiForm.latitude),
      Number(poiForm.longitude),
    );
    const poi: Poi = {
      id: slugId(`${selectedCentre.id}-${poiForm.name}`),
      name: poiForm.name,
      category: poiForm.category,
      address: poiForm.address,
      latitude: Number(poiForm.latitude),
      longitude: Number(poiForm.longitude),
      phone: poiForm.phone || null,
      openingHours: poiForm.openingHours || null,
      verifiedStatus: source === "manual" ? "verified" : "unverified",
      source,
      distanceMeters,
      walkingTimeMinutes: Math.max(1, Math.round(distanceMeters / 80)),
      drivingTimeMinutes: Math.max(1, Math.round(distanceMeters / 250)),
      priorityRank: selectedCentre.pois.length + 1,
    };

    setLocalCentres((current) =>
      current.map((centre) =>
        centre.id === selectedCentre.id
          ? { ...centre, pois: [...centre.pois, poi] }
          : centre,
      ),
    );
    setActiveCategories([]);
    setNotice(`${poi.name} added locally as ${categoryLabels[poi.category]}.`);
    closeModal();
  }

  function addReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCentre) {
      return;
    }

    setReports((current) => [
      ...current,
      {
        id: slugId(`${selectedCentre.id}-${reportForm.title}`),
        centreId: selectedCentre.id,
        title: reportForm.title,
        details: reportForm.details,
      },
    ]);
    setNotice(`Report saved locally for ${selectedCentre.name}.`);
    closeModal();
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
  const centreReports = reports.filter(
    (report) => report.centreId === selectedCentre.id,
  );
  const reportedPois = selectedCentre.pois.filter(
    (poi) => poi.verifiedStatus === "reported",
  );
  const reportCount = reportedPois.length + centreReports.length;
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
              <button
                type="button"
                onClick={() => openModal("poi")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Add POI
              </button>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto">
            {navItems.map((item, index) => (
              <button
                key={item}
                type="button"
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionButton
                icon={Plus}
                label="Add Centre"
                variant="light"
                onClick={() => openModal("centre")}
              />
              <ActionButton
                icon={Plus}
                label="Add POI"
                variant="dark"
                onClick={() => openModal("poi")}
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
              <ActionButton
                icon={LocateFixed}
                label="Locate"
                variant="light"
                onClick={() => setNotice("Locate action ready for browser geolocation integration.")}
              />
              <ActionButton
                icon={Route}
                label="Route"
                variant="dark"
                onClick={() => setNotice("Route engine placeholder ready. Next: OSRM or GraphHopper API.")}
              />
              <ActionButton
                icon={FileWarning}
                label="Report"
                variant="light"
                onClick={() => openModal("report")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-4">
            <Metric label="Centres" value={localCentres.length.toString()} />
            <Metric label="Total POIs" value={selectedCentre.pois.length.toString()} />
            <Metric label="Verified" value={`${verificationScore}%`} />
            <Metric label="Reports" value={reportCount.toString()} />
          </div>

          <div className="border-b border-[var(--color-line)] bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-[#8a4b08]">
            {notice}
          </div>

          <div className="h-[calc(100vh-286px)] min-h-[560px]">
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
              <ChecklistItem checked={reportCount === 0} label="No open reports" />
              <ChecklistItem checked={Boolean(selectedCentre.gateInfo)} label="Gate info added" />
            </div>
          </section>

          <section className="panel p-4">
            <PanelTitle icon={Route} title="Next Modules" />
            <div className="mt-4 grid gap-2">
              <ModuleButton label="Suggest place" onClick={() => openModal("suggestion")} />
              <ModuleButton label="Report wrong info" onClick={() => openModal("report")} />
              <ModuleButton label="Route engine" onClick={() => setNotice("Routing will use OSRM/GraphHopper after the DB flow is stable.")} />
              <ModuleButton label="CSV import" onClick={() => setNotice("CSV import can map columns into exam_centres and pois tables.")} />
            </div>
          </section>
        </aside>
      </section>

      {modalMode && (
        <Modal title={modalTitle(modalMode)} onClose={closeModal}>
          {modalMode === "centre" && (
            <form onSubmit={addCentre} className="grid gap-3">
              <Field label="Centre name" value={centreForm.name} onChange={(name) => setCentreForm((form) => ({ ...form, name }))} required />
              <Field label="Address" value={centreForm.address} onChange={(address) => setCentreForm((form) => ({ ...form, address }))} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="District" value={centreForm.district} onChange={(district) => setCentreForm((form) => ({ ...form, district }))} required />
                <Field label="State" value={centreForm.state} onChange={(state) => setCentreForm((form) => ({ ...form, state }))} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Latitude" type="number" step="any" value={centreForm.latitude} onChange={(latitude) => setCentreForm((form) => ({ ...form, latitude }))} required />
                <Field label="Longitude" type="number" step="any" value={centreForm.longitude} onChange={(longitude) => setCentreForm((form) => ({ ...form, longitude }))} required />
              </div>
              <Field label="Exam type" value={centreForm.examType} onChange={(examType) => setCentreForm((form) => ({ ...form, examType }))} required />
              <Field label="Landmark" value={centreForm.landmark} onChange={(landmark) => setCentreForm((form) => ({ ...form, landmark }))} />
              <Field label="Gate info" value={centreForm.gateInfo} onChange={(gateInfo) => setCentreForm((form) => ({ ...form, gateInfo }))} />
              <FormActions onCancel={closeModal} submitLabel="Add centre" />
            </form>
          )}

          {(modalMode === "poi" || modalMode === "suggestion") && (
            <form
              onSubmit={(event) =>
                addPoi(event, modalMode === "poi" ? "manual" : "student")
              }
              className="grid gap-3"
            >
              <Field label="Place name" value={poiForm.name} onChange={(name) => setPoiForm((form) => ({ ...form, name }))} required />
              <label className="grid gap-1 text-sm font-bold text-[var(--color-ink)]">
                Category
                <select
                  value={poiForm.category}
                  onChange={(event) =>
                    setPoiForm((form) => ({
                      ...form,
                      category: event.target.value as PoiCategory,
                    }))
                  }
                  className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                >
                  {allCategories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Address" value={poiForm.address} onChange={(address) => setPoiForm((form) => ({ ...form, address }))} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Latitude" type="number" step="any" value={poiForm.latitude} onChange={(latitude) => setPoiForm((form) => ({ ...form, latitude }))} required />
                <Field label="Longitude" type="number" step="any" value={poiForm.longitude} onChange={(longitude) => setPoiForm((form) => ({ ...form, longitude }))} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Phone" value={poiForm.phone} onChange={(phone) => setPoiForm((form) => ({ ...form, phone }))} />
                <Field label="Opening hours" value={poiForm.openingHours} onChange={(openingHours) => setPoiForm((form) => ({ ...form, openingHours }))} />
              </div>
              <FormActions
                onCancel={closeModal}
                submitLabel={modalMode === "poi" ? "Add verified POI" : "Send suggestion"}
              />
            </form>
          )}

          {modalMode === "report" && (
            <form onSubmit={addReport} className="grid gap-3">
              <Field label="Issue title" value={reportForm.title} onChange={(title) => setReportForm((form) => ({ ...form, title }))} required />
              <label className="grid gap-1 text-sm font-bold text-[var(--color-ink)]">
                Details
                <textarea
                  value={reportForm.details}
                  onChange={(event) =>
                    setReportForm((form) => ({
                      ...form,
                      details: event.target.value,
                    }))
                  }
                  required
                  rows={4}
                  className="resize-none rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                />
              </label>
              <FormActions onCancel={closeModal} submitLabel="Save report" />
            </form>
          )}
        </Modal>
      )}
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
  onClick,
}: {
  icon: typeof Route;
  label: string;
  variant: "dark" | "light";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function ModuleButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-left text-sm font-bold text-[var(--color-ink)]"
    >
      {label}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#142132]/50 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-4">
          <h2 className="text-lg font-black text-[var(--color-ink)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-line)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-[var(--color-ink)]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        step={step}
        required={required}
        className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
      />
    </label>
  );
}

function FormActions({
  onCancel,
  submitLabel,
}: {
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-bold"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-white"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function modalTitle(mode: Exclude<ModalMode, null>) {
  const titles = {
    centre: "Add exam centre",
    poi: "Add verified POI",
    suggestion: "Suggest nearby place",
    report: "Report wrong information",
  };

  return titles[mode];
}

function slugId(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "item"}-${Date.now()}`;
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
