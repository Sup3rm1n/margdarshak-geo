import { seedCentres } from "./seed-data";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { ExamCentre, Poi } from "./types";

type PoiRow = {
  id: string;
  name: string;
  category: Poi["category"];
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  opening_hours: string | null;
  verified_status: Poi["verifiedStatus"];
  source: Poi["source"];
};

type CentreRow = {
  id: string;
  name: string;
  address: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  landmark: string | null;
  exam_type: string;
  gate_info: string | null;
  admin_notes: string | null;
  verified_status: ExamCentre["verifiedStatus"];
  centre_nearby_pois?: Array<{
    distance_meters: number;
    walking_time_minutes: number;
    driving_time_minutes: number;
    priority_rank: number;
    pois: PoiRow | PoiRow[] | null;
  }>;
};

function mapNearbyPois(nearbyPois: CentreRow["centre_nearby_pois"]): Poi[] {
  const pois: Poi[] = [];

  for (const nearby of nearbyPois ?? []) {
    const poi = Array.isArray(nearby.pois) ? nearby.pois[0] : nearby.pois;

    if (!poi) {
      continue;
    }

    pois.push({
      id: poi.id,
      name: poi.name,
      category: poi.category,
      address: poi.address,
      latitude: poi.latitude,
      longitude: poi.longitude,
      phone: poi.phone,
      openingHours: poi.opening_hours,
      verifiedStatus: poi.verified_status,
      source: poi.source,
      distanceMeters: nearby.distance_meters,
      walkingTimeMinutes: nearby.walking_time_minutes,
      drivingTimeMinutes: nearby.driving_time_minutes,
      priorityRank: nearby.priority_rank,
    });
  }

  return pois.sort((a, b) => a.priorityRank - b.priorityRank);
}

export async function getCentresWithPois(): Promise<ExamCentre[]> {
  if (!isSupabaseConfigured || !supabase) {
    return seedCentres;
  }

  const { data, error } = await supabase
    .from("exam_centres")
    .select(
      `
      id,
      name,
      address,
      district,
      state,
      latitude,
      longitude,
      landmark,
      exam_type,
      gate_info,
      admin_notes,
      verified_status,
      centre_nearby_pois (
        distance_meters,
        walking_time_minutes,
        driving_time_minutes,
        priority_rank,
        pois (
          id,
          name,
          category,
          address,
          latitude,
          longitude,
          phone,
          opening_hours,
          verified_status,
          source
        )
      )
    `,
    )
    .order("name");

  if (error) {
    console.error("Supabase read failed, falling back to seed data.", error);
    return seedCentres;
  }

  return (data as unknown as CentreRow[]).map((centre): ExamCentre => ({
    id: centre.id,
    name: centre.name,
    address: centre.address,
    district: centre.district,
    state: centre.state,
    latitude: centre.latitude,
    longitude: centre.longitude,
    landmark: centre.landmark,
    examType: centre.exam_type,
    gateInfo: centre.gate_info,
    adminNotes: centre.admin_notes,
    verifiedStatus: centre.verified_status,
    pois: mapNearbyPois(centre.centre_nearby_pois),
  }));
}
