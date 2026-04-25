"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import Link from "next/link";
import { createHuman, updateHuman, getHumansKey } from "@/lib/api";
import {
  Loader2,
  ArrowLeft,
  Save,
  X,
  User,
  Users,
  Hash,
  Phone,
  Briefcase,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Upload,
  Banknote,
} from "lucide-react";

const API_ORIGIN =
  typeof process.env.NEXT_PUBLIC_API_URL === "string"
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "";

interface HumanModel {
  _id?: string;
  firstName: string;
  lastName: string;
  cin: string;
  birthDate: string;
  phone: string;
  role: string;
  /** Salaire mensuel (TND) */
  monthlySalaryDt: number;
  cvUrl?: string;
  imageUrl?: string;
  availability: boolean;
}

interface HumanFormProps {
  mode: "create" | "edit";
  initialData?: HumanModel;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  cin?: string;
  birthDate?: string;
  phone?: string;
  role?: string;
  monthlySalaryDt?: string;
  general?: string;
}

const CV_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export default function HumanForm({ mode, initialData }: HumanFormProps) {
  const router = useRouter();
  const cvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<HumanModel>({
    firstName: "",
    lastName: "",
    cin: "",
    birthDate: "",
    phone: "",
    role: "",
    monthlySalaryDt: 0,
    cvUrl: undefined,
    imageUrl: undefined,
    availability: true,
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        cin: initialData.cin || "",
        birthDate: initialData.birthDate?.split("T")[0] || "",
        phone: initialData.phone || "",
        role: initialData.role || "",
        monthlySalaryDt: initialData.monthlySalaryDt ?? 0,
        cvUrl: initialData.cvUrl || undefined,
        imageUrl: initialData.imageUrl || undefined,
        availability: initialData.availability ?? true,
      });
      setCvFile(null);
      setImageFile(null);
    }
  }, [initialData]);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (mode === "edit" && formData.imageUrl) {
      const path = formData.imageUrl.startsWith("http")
        ? formData.imageUrl
        : API_ORIGIN
          ? `${API_ORIGIN}${formData.imageUrl}`
          : formData.imageUrl;
      setImagePreview(path);
      return;
    }
    setImagePreview(null);
  }, [imageFile, formData.imageUrl, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === "monthlySalaryDt") {
      const raw = value.trim();
      const n = raw === "" || raw === "-" ? 0 : Math.max(0, parseFloat(raw.replace(",", ".")) || 0);
      setFormData((prev) => ({ ...prev, monthlySalaryDt: n }));
      if (touched[name]) validateField(name, n);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (touched[name]) validateField(name, type === "checkbox" ? checked : value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (name === "monthlySalaryDt") {
      const raw = value.trim();
      const n = raw === "" || raw === "-" ? 0 : Math.max(0, parseFloat(raw.replace(",", ".")) || 0);
      validateField(name, n);
    } else {
      validateField(name, value);
    }
  };

  const validateField = (name: string, value: string | boolean | number) => {
    let error = "";
    if (name === "monthlySalaryDt") {
      const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
      if (Number.isNaN(n) || n < 0) error = "Salaire invalide (≥ 0)";
      setErrors((prev) => ({ ...prev, monthlySalaryDt: error }));
      return;
    }
    const s = String(value).trim();
    switch (name) {
      case "firstName":
      case "lastName":
        if (!s) error = "Champ obligatoire";
        else if (s.length < 2) error = "Au moins 2 caractères";
        else if (s.length > 80) error = "Maximum 80 caractères";
        break;
      case "cin":
        if (!s) error = "CIN obligatoire";
        else if (s.length < 3) error = "Au moins 3 caractères";
        else if (s.length > 32) error = "Maximum 32 caractères";
        else if (!/^[a-zA-Z0-9\s\-]+$/.test(s)) error = "Caractères autorisés : lettres, chiffres, espaces, tiret";
        break;
      case "phone":
        if (!s) error = "Téléphone obligatoire";
        else if (!/^[\d\s+().\-]{8,24}$/.test(s)) error = "Numéro de téléphone invalide";
        break;
      case "role":
        if (!s) error = "Rôle obligatoire";
        else if (s.length < 2) error = "Au moins 2 caractères";
        else if (s.length > 120) error = "Maximum 120 caractères";
        break;
      case "birthDate":
        if (!value) error = "Date de naissance obligatoire";
        else {
          const d = new Date(String(value));
          if (Number.isNaN(d.getTime())) error = "Date invalide";
          else {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (d > today) error = "La date ne peut pas être dans le futur";
            if (d.getFullYear() < 1900) error = "Date trop ancienne";
          }
        }
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;
    const setE = (k: keyof FormErrors, msg: string) => {
      newErrors[k] = msg;
      isValid = false;
    };

    if (!formData.firstName.trim()) setE("firstName", "Prénom obligatoire");
    else if (formData.firstName.trim().length < 2) setE("firstName", "Au moins 2 caractères");

    if (!formData.lastName.trim()) setE("lastName", "Nom obligatoire");
    else if (formData.lastName.trim().length < 2) setE("lastName", "Au moins 2 caractères");

    const cin = formData.cin.trim();
    if (!cin) setE("cin", "CIN obligatoire");
    else if (cin.length < 3 || cin.length > 32) setE("cin", "Le CIN doit contenir entre 3 et 32 caractères");
    else if (!/^[a-zA-Z0-9\s\-]+$/.test(cin)) setE("cin", "CIN invalide (lettres, chiffres, espaces, tiret)");

    const phone = formData.phone.trim();
    if (!phone) setE("phone", "Téléphone obligatoire");
    else if (!/^[\d\s+().\-]{8,24}$/.test(phone)) setE("phone", "Numéro de téléphone invalide");

    const role = formData.role.trim();
    if (!role) setE("role", "Rôle obligatoire");
    else if (role.length < 2) setE("role", "Au moins 2 caractères");

    if (!formData.birthDate) setE("birthDate", "Date de naissance obligatoire");
    else {
      const d = new Date(formData.birthDate);
      if (Number.isNaN(d.getTime())) setE("birthDate", "Date invalide");
      else {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d > today) setE("birthDate", "La date ne peut pas être dans le futur");
        if (d.getFullYear() < 1900) setE("birthDate", "Date trop ancienne");
      }
    }

    if (Number.isNaN(formData.monthlySalaryDt) || formData.monthlySalaryDt < 0) {
      setE("monthlySalaryDt", "Salaire invalide (≥ 0)");
    }

    setErrors(newErrors);
    return isValid;
  };

  const markAllTouched = () => {
    setTouched({
      firstName: true,
      lastName: true,
      cin: true,
      birthDate: true,
      phone: true,
      role: true,
      monthlySalaryDt: true,
    });
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append("firstName", formData.firstName.trim());
    fd.append("lastName", formData.lastName.trim());
    fd.append("cin", formData.cin.trim());
    fd.append("birthDate", formData.birthDate);
    fd.append("phone", formData.phone.trim());
    fd.append("role", formData.role.trim());
    fd.append("monthlySalaryDt", String(formData.monthlySalaryDt));
    fd.append("availability", formData.availability ? "true" : "false");

    if (cvFile) fd.append("cv", cvFile);
    else if (mode === "edit") fd.append("cvUrl", formData.cvUrl ?? "");

    if (imageFile) fd.append("image", imageFile);
    else if (mode === "edit") fd.append("imageUrl", formData.imageUrl ?? "");

    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    markAllTouched();
    if (!validate()) {
      document.querySelector(".text-red-600")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = buildFormData();
      if (mode === "create") {
        await createHuman(fd);
      } else {
        await updateHuman(initialData!._id!, fd);
      }
      mutate(getHumansKey());
      router.push("/humans");
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Impossible d’enregistrer la personne",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-4 text-foreground">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
              {mode === "create" ? "Register New Person" : "Update Person Details"}
            </h1>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl">
              {mode === "create"
                ? "Add a new human resource. Upload CV and profile photo from your computer."
                : "Update the record. Choose new files only if you want to replace CV or photo."}
            </p>
          </div>

          <Link
            href="/humans"
            className="inline-flex items-center gap-3 px-7 py-4 bg-card border border-border text-foreground rounded-2xl font-medium hover:bg-muted transition shadow-sm"
          >
            <ArrowLeft size={20} />
            Cancel
          </Link>
        </div>

        {errors.general && (
          <div className="mb-10 p-6 bg-destructive/10 border border-destructive/30 rounded-2xl flex items-start gap-4 text-destructive">
            <AlertCircle size={28} className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-lg">Erreur à l’enregistrement</p>
              <p className="mt-1">{errors.general}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
        >
          <div className="p-8 lg:p-12 xl:p-16 space-y-14">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Users size={28} className="text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Personal Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                {[
                  { name: "firstName", label: "First Name", icon: <User size={20} />, required: true },
                  { name: "lastName", label: "Last Name", icon: <User size={20} />, required: true },
                  { name: "cin", label: "CIN / ID Number", icon: <Hash size={20} />, required: true },
                  { name: "phone", label: "Phone Number", icon: <Phone size={20} />, required: true },
                  { name: "role", label: "Role / Position", icon: <Briefcase size={20} />, required: true },
                ].map((field) => (
                  <div key={field.name} className="space-y-2 relative">
                    <label htmlFor={field.name} className="block text-lg font-semibold text-foreground">
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
                        value={formData[field.name as keyof HumanModel] as string}
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

                <div className="space-y-2 relative">
                  <label htmlFor="monthlySalaryDt" className="block text-lg font-semibold text-foreground">
                    Salaire (TND / mois)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <Banknote size={20} />
                    </div>
                    <input
                      id="monthlySalaryDt"
                      name="monthlySalaryDt"
                      type="number"
                      min={0}
                      step="0.001"
                      inputMode="decimal"
                      value={formData.monthlySalaryDt}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-12 pr-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all duration-200 shadow-sm ${
                        errors.monthlySalaryDt && touched.monthlySalaryDt
                          ? "border-red-500"
                          : "border-border"
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {errors.monthlySalaryDt && touched.monthlySalaryDt && (
                    <p className="text-red-600 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} />
                      {errors.monthlySalaryDt}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="birthDate" className="block text-lg font-semibold text-foreground">
                    Birth Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all duration-200 shadow-sm ${
                      errors.birthDate && touched.birthDate ? "border-red-500" : "border-border"
                    }`}
                  />
                  {errors.birthDate && touched.birthDate && (
                    <p className="text-red-600 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} />
                      {errors.birthDate}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-border">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                  <FileText size={28} className="text-accent" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Documents & Status</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                <div className="space-y-3">
                  <span className="block text-lg font-semibold text-foreground">CV (file from your PC)</span>
                  <p className="text-sm text-muted-foreground">PDF or Word — max. 12 MB</p>
                  <input
                    ref={cvInputRef}
                    type="file"
                    accept={CV_ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      setCvFile(e.target.files?.[0] ?? null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => cvInputRef.current?.click()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-muted/50 px-5 py-4 text-lg font-medium text-foreground hover:border-ring/50 hover:bg-muted transition shadow-sm"
                  >
                    <Upload size={22} className="text-primary" />
                    Choose CV file
                  </button>
                  <p className="text-sm text-muted-foreground break-all">
                    {cvFile?.name ??
                      (formData.cvUrl
                        ? `Current: ${formData.cvUrl.split("/").pop() ?? formData.cvUrl}`
                        : "No file selected (optional)")}
                  </p>
                  {(cvFile || formData.cvUrl) && (
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => {
                        setCvFile(null);
                        if (cvInputRef.current) cvInputRef.current.value = "";
                        setFormData((p) => ({ ...p, cvUrl: undefined }));
                      }}
                    >
                      Remove CV
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <span className="block text-lg font-semibold text-foreground">
                    Profile photo (file from your PC)
                  </span>
                  <p className="text-sm text-muted-foreground">JPEG, PNG, WebP or GIF — max. 12 MB</p>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      setImageFile(e.target.files?.[0] ?? null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-muted/50 px-5 py-4 text-lg font-medium text-foreground hover:border-ring/50 hover:bg-muted transition shadow-sm"
                  >
                    <ImageIcon size={22} className="text-primary" />
                    Choose image
                  </button>
                  {imagePreview && (
                    <div className="mt-3 h-40 w-40 overflow-hidden rounded-2xl border-2 border-border">
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                  {(imageFile || (mode === "edit" && formData.imageUrl)) && (
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => {
                        setImageFile(null);
                        if (imageInputRef.current) imageInputRef.current.value = "";
                        setFormData((p) => ({ ...p, imageUrl: undefined }));
                        setImagePreview(null);
                      }}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-border">
              <div className="flex items-center justify-between bg-muted/40 p-8 rounded-2xl border border-border">
                <div className="flex items-center gap-5">
                  <div
                    className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
                      formData.availability ? "bg-emerald-500/20" : "bg-destructive/20"
                    }`}
                  >
                    {formData.availability ? (
                      <CheckCircle2 size={32} className="text-emerald-400" />
                    ) : (
                      <X size={32} className="text-destructive" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">Availability Status</h3>
                    <p className="text-lg text-muted-foreground mt-1">
                      Indicate if this person is currently available
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
                  <div className="w-20 h-10 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/40 rounded-full peer peer-checked:after:translate-x-10 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-card after:border-border after:border after:rounded-full after:h-8 after:w-8 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            </div>

            <div className="pt-12 flex flex-col sm:flex-row gap-6 justify-end border-t border-border">
              <Link
                href="/humans"
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={26} />
                    {mode === "create" ? "Create Person" : "Update Person"}
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
