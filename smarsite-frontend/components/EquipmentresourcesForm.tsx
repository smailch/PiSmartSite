"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import Link from "next/link";
import {
  createEquipment,
  updateEquipment,
  getEquipmentsKey,
} from "@/lib/api";
import { 
  Loader2, 
  ArrowLeft, 
  Save, 
  X, 
  Calendar, 
  Tag, 
  Hash, 
  Package, 
  Building, 
  MapPin, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

interface Equipment {
  _id?: string;
  name: string;
  category: string;
  serialNumber: string;
  model: string;
  brand: string;
  purchaseDate: string;
  lastMaintenanceDate: string;
  location: string;
  availability: boolean;
}

interface EquipmentFormProps {
  mode: "create" | "edit";
  initialData?: Equipment;
}

interface FormErrors {
  name?: string;
  category?: string;
  serialNumber?: string;
  model?: string;
  brand?: string;
  purchaseDate?: string;
  lastMaintenanceDate?: string;
  location?: string;
  general?: string;
}

export default function EquipmentForm({
  mode,
  initialData,
}: EquipmentFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<Equipment>({
    name: "",
    category: "",
    serialNumber: "",
    model: "",
    brand: "",
    purchaseDate: "",
    lastMaintenanceDate: "",
    location: "",
    availability: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        category: initialData.category || "",
        serialNumber: initialData.serialNumber || "",
        model: initialData.model || "",
        brand: initialData.brand || "",
        purchaseDate: initialData.purchaseDate?.slice(0, 10) || "",
        lastMaintenanceDate: initialData.lastMaintenanceDate?.slice(0, 10) || "",
        location: initialData.location || "",
        availability: initialData.availability ?? true,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (touched[name]) validateField(name, value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const fieldLabels: Record<string, string> = {
    name: "Equipment name",
    category: "Category",
    serialNumber: "Serial number",
    model: "Model",
    brand: "Brand",
    location: "Location",
    purchaseDate: "Purchase date",
    lastMaintenanceDate: "Last maintenance",
  };

  const validateField = (name: string, value: string | boolean) => {
    let error = "";
    const lbl = fieldLabels[name] ?? name;
    const s = String(value).trim();

    switch (name) {
      case "name":
      case "category":
      case "model":
      case "brand":
      case "location":
        if (!s) error = `${lbl}: required`;
        else if (s.length < 2) error = `${lbl}: at least 2 characters`;
        else if (s.length > 120) error = `${lbl}: maximum 120 characters`;
        break;
      case "serialNumber":
        if (!s) error = `${lbl}: required`;
        else if (s.length < 2) error = `${lbl}: at least 2 characters`;
        else if (s.length > 64) error = `${lbl}: maximum 64 characters`;
        break;
      case "purchaseDate":
      case "lastMaintenanceDate":
        if (!value) error = `${lbl}: date required`;
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;
    const setErr = (k: keyof FormErrors, msg: string) => {
      newErrors[k] = msg;
      isValid = false;
    };

    (
      ["name", "category", "serialNumber", "model", "brand", "location"] as const
    ).forEach((field) => {
      const s = formData[field]?.toString().trim() ?? "";
      const lbl = fieldLabels[field];
      if (!s) setErr(field, `${lbl}: required`);
      else if (field === "serialNumber") {
        if (s.length < 2) setErr(field, `${lbl}: at least 2 characters`);
        else if (s.length > 64) setErr(field, `${lbl}: maximum 64 characters`);
      } else {
        if (s.length < 2) setErr(field, `${lbl}: at least 2 characters`);
        else if (s.length > 120) setErr(field, `${lbl}: maximum 120 characters`);
      }
    });

    if (!formData.purchaseDate) {
      setErr("purchaseDate", "Purchase date is required");
    }
    if (!formData.lastMaintenanceDate) {
      setErr("lastMaintenanceDate", "Last maintenance date is required");
    }

    if (formData.purchaseDate && formData.lastMaintenanceDate) {
      const p = new Date(formData.purchaseDate);
      const m = new Date(formData.lastMaintenanceDate);
      if (!Number.isNaN(p.getTime()) && !Number.isNaN(m.getTime()) && m < p) {
        setErr(
          "lastMaintenanceDate",
          "Maintenance cannot be earlier than purchase date"
        );
      }
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (formData.purchaseDate) {
      const p = new Date(formData.purchaseDate);
      if (!Number.isNaN(p.getTime()) && p > today) {
        setErr("purchaseDate", "Purchase date cannot be in the future");
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const markAllTouched = () => {
    setTouched({
      name: true,
      category: true,
      serialNumber: true,
      model: true,
      brand: true,
      purchaseDate: true,
      lastMaintenanceDate: true,
      location: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    markAllTouched();
    if (!validate()) {
      const firstError = document.querySelector(".text-red-600");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "create") {
        await createEquipment(formData);
      } else {
        await updateEquipment(initialData!._id!, formData);
      }
      mutate(getEquipmentsKey());
      router.push("/equipment");
    } catch (err) {
      setErrors({
        general:
          err instanceof Error ? err.message : "Could not save equipment",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-2 sm:py-4 text-foreground">
      <div className="max-w-6xl mx-auto">
        {/* Header Premium */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
              {mode === "create" ? "Register New Equipment" : "Update Equipment Details"}
            </h1>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl">
              {mode === "create"
                ? "Add a new asset to your inventory with complete specifications and status."
                : "Modify existing equipment information — all fields are pre-filled."}
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/equipment"
              className="inline-flex items-center gap-3 px-7 py-4 bg-card border border-border text-foreground rounded-2xl font-medium hover:bg-muted transition shadow-sm"
            >
              <ArrowLeft size={20} />
              Cancel
            </Link>
          </div>
        </div>

        {/* Global Error */}
        {errors.general && (
          <div className="mb-10 p-6 bg-destructive/10 border border-destructive/30 rounded-2xl flex items-start gap-4 text-destructive">
            <AlertCircle size={28} className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-lg">Erreur à l’enregistrement</p>
              <p className="mt-1">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Form Card - Très spacieux & élégant */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
        >
        

          <div className="p-8 lg:p-12 xl:p-16 space-y-14">
            {/* Section 1: Identification */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Package size={28} className="text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Equipment Identification</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                {[
                  { name: "name", label: "Equipment Name", icon: <Tag size={20} />, required: true },
                  { name: "category", label: "Category", icon: <Tag size={20} />, required: true },
                  { name: "serialNumber", label: "Serial Number", icon: <Hash size={20} />, required: true },
                  { name: "model", label: "Model", icon: <Package size={20} />, required: true },
                  { name: "brand", label: "Brand / Manufacturer", icon: <Building size={20} />, required: true },
                ].map(field => (
                  <div key={field.name} className="space-y-2 relative">
                    <label
                      htmlFor={field.name}
                      className="block text-lg font-semibold text-foreground"
                    >
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        {field.icon}
                      </div>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        value={formData[field.name as keyof Equipment] as string}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-12 pr-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all duration-200 shadow-sm ${
                          errors[field.name as keyof FormErrors] && touched[field.name]
                            ? "border-red-500"
                            : "border-border"
                        }`}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    </div>
                    {errors[field.name as keyof FormErrors] && touched[field.name] && (
                      <p className="text-red-600 text-base mt-2 flex items-center gap-2">
                        <AlertCircle size={18} />
                        {errors[field.name as keyof FormErrors]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Dates & Location */}
            <div className="pt-10 border-t border-border">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                  <Calendar size={28} className="text-accent" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Timeline & Location</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                <div className="space-y-2">
                  <label htmlFor="purchaseDate" className="block text-lg font-semibold text-foreground">
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="purchaseDate"
                    name="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all duration-200 shadow-sm ${
                      errors.purchaseDate && touched.purchaseDate ? "border-red-500" : "border-border"
                    }`}
                  />
                  {errors.purchaseDate && touched.purchaseDate && (
                    <p className="text-red-600 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} />
                      {errors.purchaseDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="lastMaintenanceDate" className="block text-lg font-semibold text-foreground">
                    Last Maintenance <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastMaintenanceDate"
                    name="lastMaintenanceDate"
                    type="date"
                    value={formData.lastMaintenanceDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all duration-200 shadow-sm ${
                      errors.lastMaintenanceDate && touched.lastMaintenanceDate ? "border-red-500" : "border-border"
                    }`}
                  />
                  {errors.lastMaintenanceDate && touched.lastMaintenanceDate && (
                    <p className="text-red-600 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} />
                      {errors.lastMaintenanceDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <label htmlFor="location" className="block text-lg font-semibold text-foreground">
                    Current Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <MapPin size={20} />
                    </div>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      value={formData.location}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-12 pr-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all duration-200 shadow-sm ${
                        errors.location && touched.location ? "border-red-500" : "border-border"
                      }`}
                      placeholder="Building A - Floor 3 - Room 312"
                    />
                  </div>
                  {errors.location && touched.location && (
                    <p className="text-red-600 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} />
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Availability Toggle - Hero style */}
            <div className="pt-10 border-t border-border">
              <div className="flex items-center justify-between bg-muted/40 p-8 rounded-2xl border border-border">
                <div className="flex items-center gap-5">
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${formData.availability ? "bg-emerald-500/20" : "bg-destructive/20"}`}>
                    {formData.availability ? (
                      <CheckCircle2 size={32} className="text-emerald-400" />
                    ) : (
                      <X size={32} className="text-destructive" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">
                      Availability Status
                    </h3>
                    <p className="text-lg text-muted-foreground mt-1">
                      Mark whether this equipment is currently ready for use
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="availability"
                    checked={formData.availability}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-20 h-10 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/40 rounded-full peer peer-checked:after:translate-x-10 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-card after:border-border after:border after:rounded-full after:h-8 after:w-8 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-12 flex flex-col sm:flex-row gap-6 justify-end border-t border-border">
              <Link
                href="/equipment"
                className="px-10 py-5 bg-card border-2 border-border text-foreground text-xl font-semibold rounded-2xl hover:bg-muted transition flex items-center justify-center gap-3 shadow-sm"
              >
                <X size={22} />
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-12 py-5 bg-accent text-accent-foreground text-xl font-bold rounded-2xl shadow-sm hover:brightness-110 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-ring/40 transition-all duration-300 flex items-center justify-center gap-4 min-w-[280px] ${
                  isSubmitting ? "opacity-80 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={26} className="animate-spin" />
                    Saving Equipment...
                  </>
                ) : (
                  <>
                    <Save size={26} />
                    {mode === "create" ? "Create Equipment" : "Update Equipment"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}