import type { Metadata } from "next";
import { DreamHouseClient } from "./DreamHouseClient";

export const metadata: Metadata = {
  title: "Dream House — SmartSite",
  description:
    "Générez une visualisation et un modèle 3D à partir de votre description de maison idéale.",
};

export default function DreamHousePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-orange-500/30 selection:text-white">
      <DreamHouseClient />
    </div>
  );
}
