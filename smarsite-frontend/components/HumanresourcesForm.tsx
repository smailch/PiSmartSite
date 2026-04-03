"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import Link from "next/link";
import {
  createHuman,
  updateHuman,
  getHumansKey,
} from "@/lib/api";
import {
  Loader2,
  ArrowLeft,
  Save,
  X,
  User,
  Users,
  Hash,
  Calendar,
  Phone,
  Briefcase,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Human {
  _id?: string;
  firstName: string;
  lastName: string;
  cin: string;
  birthDate: string;
  phone: string;
  role: string;
  cvUrl?: string;
  imageUrl?: string;
  availability: boolean;
}

interface HumanFormProps {
  mode: "create" | "edit";
  initialData?: Human;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  cin?: string;
  birthDate?: string;
  phone?: string;
  role?: string;
  general?: string;
}

export default function HumanForm({ mode, initialData }: HumanFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<Human>({
    firstName: "",
    lastName: "",
    cin: "",
    birthDate: "",
    phone: "",
    role: "",
    cvUrl: undefined,
    imageUrl: undefined,
    availability: true,
  });
const [human, setHuman] = useState<Human>({
    _id: undefined,
    firstName: "",
    lastName: "",
    cin: "",
    birthDate: "",
    phone: "",
    role: "",
    cvUrl: undefined,
    imageUrl: undefined,
    availability: true,
  });
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
        cvUrl: initialData.cvUrl || "",
        imageUrl: initialData.imageUrl || "",
        availability: initialData.availability ?? true,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (touched[name]) validateField(name, value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const validateField = (name: string, value: string | boolean) => {
    let error = "";
    switch (name) {
      case "firstName":
      case "lastName":
      case "cin":
      case "phone":
      case "role":
        if (!String(value).trim()) error = `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
        break;
      case "birthDate":
        if (!value) error = "Birth date is required";
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    ["firstName", "lastName", "cin", "phone", "role"].forEach((field) => {
      if (!formData[field as keyof Human]?.toString().trim()) {
        newErrors[field as keyof FormErrors] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        isValid = false;
      }
    });

    if (!formData.birthDate) {
      newErrors.birthDate = "Birth date is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const firstError = document.querySelector(".text-red-600");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "create") {
        await createHuman(formData);
      } else {
        await updateHuman(initialData!._id!, formData);
      }
      mutate(getHumansKey());
      router.push("/humans");
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Failed to save human",
      });
    } finally {
      setIsSubmitting(false);
    }



  };
   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHuman({
        ...human,
        imageUrl: URL.createObjectURL(file),
      });
    }
  };

  // Sélection du CV local
  const handleCVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHuman({
        ...human,
        cvUrl: URL.createObjectURL(file),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-[#0b4f6c] tracking-tight">
              {mode === "create" ? "Register New Person" : "Update Person Details"}
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl">
              {mode === "create"
                ? "Add a new human resource with complete profile information."
                : "Modify existing person record — all fields are pre-filled."}
            </p>
          </div>

          <Link
            href="/humans"
            className="inline-flex items-center gap-3 px-7 py-4 bg-white border border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 hover:border-gray-400 transition shadow-sm"
          >
            <ArrowLeft size={20} />
            Cancel
          </Link>
        </div>

        {/* Global error */}
        {errors.general && (
          <div className="mb-10 p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 text-red-800">
            <AlertCircle size={28} className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-lg">Error during save</p>
              <p className="mt-1">{errors.general}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200/80 rounded-3xl shadow-2xl overflow-hidden"
        >

          <div className="p-8 lg:p-12 xl:p-16 space-y-14">
            {/* Section Identification */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-[#0b4f6c]/10 flex items-center justify-center">
                  <Users size={28} className="text-[#0b4f6c]" />
                </div>
                <h2 className="text-3xl font-bold text-[#0b4f6c]">Personal Information</h2>
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
                    <label htmlFor={field.name} className="block text-lg font-semibold text-gray-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                        {field.icon}
                      </div>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        value={formData[field.name as keyof Human] as string}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-12 pr-5 py-5 border-2 rounded-2xl text-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all duration-200 shadow-sm ${
                          errors[field.name as keyof FormErrors] && touched[field.name]
                            ? "border-red-500"
                            : "border-gray-300"
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

                {/* Birth Date */}
                <div className="space-y-2">
                  <label htmlFor="birthDate" className="block text-lg font-semibold text-gray-700">
                    Birth Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all duration-200 shadow-sm ${
                      errors.birthDate && touched.birthDate ? "border-red-500" : "border-gray-300"
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

            {/* Section Documents & Status */} <div className="pt-10 border-t border-gray-100"> <div className="flex items-center gap-4 mb-8"> <div className="h-14 w-14 rounded-2xl bg-[#f28c28]/10 flex items-center justify-center"> <FileText size={28} className="text-[#f28c28]" /> </div> <h2 className="text-3xl font-bold text-[#0b4f6c]">Documents & Status</h2> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10"> <div className="space-y-2"> <label htmlFor="cvUrl" className="block text-lg font-semibold text-gray-700"> CV URL </label> <div className="relative"> <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500"> <FileText size={20} /> </div> <input id="cvUrl" name="cvUrl" type="url" value={formData.cvUrl} onChange={handleChange} className="w-full pl-12 pr-5 py-5 border-2 rounded-2xl text-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all duration-200 shadow-sm" placeholder="https://..." /> </div> </div> <div className="space-y-2"> <label htmlFor="imageUrl" className="block text-lg font-semibold text-gray-700"> Profile Image URL </label> <div className="relative"> <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500"> <ImageIcon size={20} /> </div> <input id="imageUrl" name="imageUrl" type="url" value={formData.imageUrl} onChange={handleChange} className="w-full pl-12 pr-5 py-5 border-2 rounded-2xl text-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all duration-200 shadow-sm" placeholder="https://..." /> </div> </div> </div> </div>
            {/* Availability Toggle */}
            <div className="pt-10 border-t border-gray-100">
              <div className="flex items-center justify-between bg-gray-50/70 p-8 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-5">
                  <div
                    className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
                      formData.availability ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {formData.availability ? (
                      <CheckCircle2 size={32} className="text-green-600" />
                    ) : (
                      <X size={32} className="text-red-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Availability Status</h3>
                    <p className="text-lg text-gray-600 mt-1">
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
                  <div className="w-20 h-10 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#f28c28]/30 rounded-full peer peer-checked:after:translate-x-10 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-8 after:w-8 after:transition-all peer-checked:bg-[#0b4f6c]"></div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-12 flex flex-col sm:flex-row gap-6 justify-end border-t border-gray-100">
              <Link
                href="/humans"
                className="px-10 py-5 bg-white border-2 border-gray-300 text-gray-700 text-xl font-semibold rounded-2xl hover:bg-gray-50 transition flex items-center justify-center gap-3 shadow-sm"
              >
                <X size={22} />
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-12 py-5 bg-[#0b4f6c] text-white text-xl font-bold rounded-2xl shadow-xl hover:bg-[#0b4f6c]/95 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-[#f28c28]/50 transition-all duration-300 flex items-center justify-center gap-4 min-w-[280px] ${
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