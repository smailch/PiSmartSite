import type { Task } from "./types";

/** Entrée mock pour `/api/resources` (champ `id` numérique, comme l’ancien jobsStore). */
export type MockResourceRow = {
  id: number;
  name: string;
  type: "Human" | "Equipment";
};

/** Données mock partagées par les routes API Next (`/api/tasks`, `/api/resources`). */
export const resources: MockResourceRow[] = [
  { id: 1, name: "John Doe", type: "Human" },
  { id: 2, name: "Sarah Johnson", type: "Human" },
  { id: 3, name: "Mike Chen", type: "Human" },
  { id: 4, name: "David Martinez", type: "Human" },
  { id: 5, name: "Emma Williams", type: "Human" },
  { id: 6, name: "Alex Turner", type: "Human" },
  { id: 7, name: "Lisa Park", type: "Human" },
  { id: 8, name: "Tower Crane TC-200", type: "Equipment" },
  { id: 9, name: "Excavator CAT 320", type: "Equipment" },
  { id: 10, name: "Concrete Mixer CM-50", type: "Equipment" },
  { id: 11, name: "Bulldozer D6", type: "Equipment" },
  { id: 12, name: "Scaffolding Set A", type: "Equipment" },
  { id: 13, name: "Welding Machine WM-300", type: "Equipment" },
  { id: 14, name: "Dump Truck DT-10", type: "Equipment" },
];

export const tasksList: Task[] = [
  { _id: 1, title: "Foundation Excavation", project: "Downtown Office Complex", description: "" },
  { _id: 2, title: "Steel Frame Installation", project: "Downtown Office Complex", description: "" },
  { _id: 3, title: "Concrete Pour - Floor 3", project: "Residential Tower A", description: "" },
  { _id: 4, title: "Electrical Wiring - Phase 1", project: "Residential Tower A", description: "" },
  { _id: 5, title: "HVAC System Installation", project: "Shopping Center Renovation", description: "" },
  { _id: 6, title: "Demolition - East Wing", project: "Shopping Center Renovation", description: "" },
  { _id: 7, title: "Final Inspection", project: "Highway Expansion Project", description: "" },
  { _id: 8, title: "Medical Equipment Installation", project: "Hospital Wing Extension", description: "" },
  { _id: 9, title: "Paint & Finishing - Level 2", project: "Downtown Office Complex", description: "" },
  { _id: 10, title: "Safety Inspection", project: "Hospital Wing Extension", description: "" },
];
