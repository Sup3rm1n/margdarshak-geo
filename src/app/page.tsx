import { GeoWorkspace } from "@/components/geo-workspace";
import { getCentresWithPois } from "@/lib/data";

export default async function Home() {
  const centres = await getCentresWithPois();

  return <GeoWorkspace centres={centres} />;
}
