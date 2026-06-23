export type PoiCategory =
  | "railway_station"
  | "airport"
  | "bus_stop"
  | "photocopy"
  | "cyber_cafe"
  | "restaurant"
  | "cafe"
  | "public_toilet"
  | "hotel"
  | "lodge"
  | "atm"
  | "medical_store"
  | "parking"
  | "police_station"
  | "hospital";

export type VerificationStatus = "verified" | "unverified" | "reported";

export type Poi = {
  id: string;
  name: string;
  category: PoiCategory;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  openingHours?: string | null;
  verifiedStatus: VerificationStatus;
  source: "manual" | "osm" | "student" | "coaching_centre" | "google_fallback";
  distanceMeters: number;
  walkingTimeMinutes: number;
  drivingTimeMinutes: number;
  priorityRank: number;
};

export type ExamCentre = {
  id: string;
  name: string;
  address: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  landmark?: string | null;
  examType: string;
  gateInfo?: string | null;
  adminNotes?: string | null;
  verifiedStatus: VerificationStatus;
  pois: Poi[];
};
