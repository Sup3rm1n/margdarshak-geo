import type { PoiCategory } from "./types";

export const categoryLabels: Record<PoiCategory, string> = {
  railway_station: "Railway",
  airport: "Airport",
  bus_stop: "Bus stop",
  photocopy: "Photocopy",
  cyber_cafe: "Cyber cafe",
  restaurant: "Restaurant",
  cafe: "Cafe",
  public_toilet: "Public toilet",
  hotel: "Hotel",
  lodge: "Lodge",
  atm: "ATM",
  medical_store: "Medical",
  parking: "Parking",
  police_station: "Police",
  hospital: "Hospital",
};

export const categoryShortLabels: Record<PoiCategory, string> = {
  railway_station: "R",
  airport: "A",
  bus_stop: "B",
  photocopy: "P",
  cyber_cafe: "C",
  restaurant: "F",
  cafe: "C",
  public_toilet: "T",
  hotel: "H",
  lodge: "L",
  atm: "$",
  medical_store: "+",
  parking: "P",
  police_station: "PS",
  hospital: "H",
};
