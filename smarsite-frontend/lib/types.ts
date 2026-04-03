// ---------- MongoDB-backed types (matching NestJS schema) ----------

export interface AssignedResource {
  resourceId: string;
  type: "Human" | "Equipment";
}

export interface Job {
  _id: string;
  taskId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: "Planifié" | "En cours" | "Terminé";
  assignedResources: AssignedResource[];
  createdAt: string;
  updatedAt: string;
}

export type CreateJobPayload = Omit<Job, "_id" | "createdAt" | "updatedAt">;
export type UpdateJobPayload = Partial<CreateJobPayload>;

// ---------- Auxiliary types (kept for resources/tasks pages) ----------


export interface Resource {
  _id: string;
  type: "Human" | "Equipment";
  name: string;
  role: string;
  availability: boolean;
  createdAt: string;
}

export interface CreateResourcePayload {
  type: "Human" | "Equipment";
  name: string;
  role: string;
  availability: boolean;
}

export interface UpdateResourcePayload {
  type?: "Human" | "Equipment";
  name?: string;
  role?: string;
  availability?: boolean;
}

export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export type TaskStatus = "À faire" | "En cours" | "Terminé";

/** Représentation frontend d'un ObjectId MongoDB. */
export type ObjectId = string;

export interface BackendTask {
  _id: ObjectId;
  title: string;
  description?: string;
  projectId: ObjectId;
  duration: number;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  /** Budget consommé par cette tâche (en DH). */
  spentBudget?: number;
  /** Peut être peuplé par l’API (`name`) ou seulement l’id */
  assignedTo?: ObjectId | { _id: ObjectId; name: string; email?: string } | null;
  /** Identifiants des tâches dont celle-ci dépend. */
  dependsOn?: ObjectId[];
  /** Dates optionnelles (peuvent être calculées côté frontend pour le Gantt). */
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface BackendUser {
  _id: string;
  name: string;
  email?: string;
  createdAt?: string;
}

export type ProjectType =
  | "Construction"
  | "Rénovation"
  | "Maintenance"
  | "Autre";

export interface Project {
  _id: string; // MongoDB ObjectId
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  status: "En cours" | "Terminé" | "En retard";
  type: ProjectType;
  budget?: number;
  /** Budget total consommé par les tâches du projet (en DH). */
  spentBudget?: number;
  location?: string;
  createdBy: string;
}

/** Réponse POST /projects/:id/analysis/ai-insights (NestJS). */
export type ProjectAiInsightsSource = "groq" | "fallback";

export type AiBudgetDelayMode = "economique" | "equilibre" | "accelere";

export interface ProjectAiInsightsResponse {
  projectId: string;
  generatedAt: string;
  source: ProjectAiInsightsSource;
  analysis: {
    summary: string;
    topRisks: Array<{
      title: string;
      impact: "low" | "medium" | "high";
      action: string;
      relatedTaskIds: string[];
      relatedTasks: Array<{ id: string; title: string }>;
    }>;
    nextActions: string[];
    budgetDelayTradeoff: {
      recommendedMode: AiBudgetDelayMode;
      estimatedDelayDays: number;
      /** Calcul serveur ; null si budget non défini ou nul. */
      estimatedBudgetDeltaPercent: number | null;
      rationale: string;
    };
    confidence: number;
  };
}

/** Réponse POST /projects/:id/analysis/assistant/chat */
export interface ProjectAssistantChatResponse {
  reply: string;
}

/** Réponse POST /projects/:id/analysis/assistant/initial-report */
export interface ProjectAssistantInitialReportResponse {
  report: string;
}

// ---------- API error type ----------





















// ---------- MongoDB-backed types (matching NestJS schema) ----------

export interface AssignedResource {
  resourceId: string;
  type: "Human" | "Equipment";
  name:string;
  role:string;
}

export interface Job {
  _id: string;
  taskId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: "Planifié" | "En cours" | "Terminé";
  assignedResources: AssignedResource[];
  createdAt: string;
  updatedAt: string;
}


// ---------- Auxiliary types (kept for resources/tasks pages) ----------
export interface Equipment {
  _id?: string;
  name: string;
  category: string;
  serialNumber: string;
  model: string;
  brand: string;
  purchaseDate: string;        // ISO date string
  lastMaintenanceDate: string; // ISO date string
  location: string;
  availability: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Resource {
  _id: string;
  type: "Human" | "Equipment";
  name: string;
  role: string;
  availability: boolean;
  createdAt: string;
}

export interface CreateResourcePayload {
  type: "Human" | "Equipment";
  name: string;
  role: string;
  availability: boolean;
}
export interface Human {
  _id: string;
  firstName: string;
  lastName: string;
  cin: string;
  birthDate: string; // ISO date string
  phone: string;
  role: string;
  cvUrl?: string;
  imageUrl?: string;
  availability: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface UpdateResourcePayload {
  type?: "Human" | "Equipment";
  name?: string;
  role?: string;
  availability?: boolean;
}
export interface Task {
  _id: number;
  title: string;
  project: string;
  description:string;
}

// ---------- API error type ----------

export class ApiError extends Error {
  status: number;
  info: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.status = status;
    this.info = info;
  }
}