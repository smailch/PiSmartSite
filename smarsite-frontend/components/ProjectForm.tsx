"use client";


import { useState, useEffect } from "react";
import type { Project, ProjectType } from "@/lib/types";

const PROJECT_TYPES: ProjectType[] = [
  "Construction",
  "Rénovation",
  "Maintenance",
  "Autre",
];
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import styles from './ProjectForm.module.css';
import { toast } from '@/hooks/use-toast';


interface ProjectFormProps {
  mode: "create" | "edit";
  initialData?: Project;
  isSubmitting?: boolean;
  onSubmit: (payload: Omit<Project, "id" | "_id">) => void | Promise<void>;
}

export default function ProjectForm({
  mode,
  initialData,
  isSubmitting = false,
  onSubmit,
}: ProjectFormProps) {

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<Project["status"]>("En cours");
  const [type, setType] = useState<ProjectType>("Construction");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  // Helper pour forcer le format yyyy-MM-dd
  function toDateInputValue(dateStr?: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setStartDate(toDateInputValue(initialData.startDate));
      setEndDate(toDateInputValue(initialData.endDate));
      setStatus(initialData.status);
      setType(initialData.type ?? "Construction");
      setBudget(
        initialData.budget != null && !Number.isNaN(initialData.budget)
          ? String(initialData.budget)
          : ""
      );
      setLocation(initialData.location ?? "");
      setCreatedBy(initialData.createdBy);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Si startDate est vide, on met la date du jour au format YYYY-MM-DD
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const defaultStartDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const budgetTrim = budget.trim();
    let budgetNum: number | undefined;
    if (budgetTrim !== "") {
      const n = Number(budgetTrim);
      if (!Number.isFinite(n) || n <= 0) {
        toast({
          title: "Budget invalide",
          description:
            "Indiquez un nombre strictement positif ou laissez le champ vide.",
        });
        return;
      }
      budgetNum = n;
    }

    const payload: Omit<Project, "id" | "_id"> = {
      name,
      description,
      startDate: startDate || defaultStartDate,
      status,
      type,
      createdBy: createdBy.trim() || "",
    };
    if (endDate.trim() !== "") payload.endDate = endDate;
    if (budgetNum !== undefined) payload.budget = budgetNum;
    if (location.trim() !== "") payload.location = location.trim();

    try {
      await Promise.resolve(onSubmit(payload));
    } catch (err) {
      console.error("[ProjectForm] onSubmit error:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles['popup-form']}>
      <div className={styles['popup-header']}>
        {mode === 'create' ? 'Nouveau projet' : 'Modifier le projet'}
      </div>
      <div className={styles['popup-form-grid']}>
        <div className={styles['popup-form-group']}>
          <label htmlFor="name" className={styles['popup-label']}>Project Name</label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className={styles['popup-form-group']}>
          <label htmlFor="startDate" className={styles['popup-label']}>Start Date</label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className={styles['popup-form-group']}>
          <label htmlFor="description" className={styles['popup-label']}>Description</label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className={styles['popup-form-group']}>
          <label htmlFor="endDate" className={styles['popup-label']}>End Date</label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className={styles['popup-form-group']}>
          <label htmlFor="project-type" className={styles['popup-label']}>Type</label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as ProjectType)}
          >
            <SelectTrigger id="project-type" className={styles['select-trigger']}>
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={styles['popup-form-group']}>
          <label htmlFor="budget" className={styles['popup-label']}>Budget (optionnel)</label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="any"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Montant positif"
          />
        </div>
        <div className={styles['popup-form-group']}>
          <label htmlFor="location" className={styles['popup-label']}>Lieu (optionnel)</label>
          <Input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Adresse ou ville"
          />
        </div>
        <div className={styles['popup-form-group']}>
          <label htmlFor="status" className={styles['popup-label']}>Status</label>
          <Select value={status} onValueChange={v => setStatus(v as Project["status"])}>
            <SelectTrigger id="status" className={styles['select-trigger']}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="En cours">En cours</SelectItem>
              <SelectItem value="Terminé">Terminé</SelectItem>
              <SelectItem value="En retard">En retard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={styles['popup-form-group']}>
          <label htmlFor="createdBy" className={styles['popup-label']}>Created By</label>
          <Input
            id="createdBy"
            type="text"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className={styles["popup-submit"] + " w-full"}
      >
        {isSubmitting
          ? "Enregistrement…"
          : "Confirmer"}
      </Button>
    </form>
  );
}