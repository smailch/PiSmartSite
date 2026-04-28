"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  fetchDreamHouseGlbBlob,
  fetchDreamHousePollinationsBlob,
  getDreamHouseTripoTaskStatus,
  startDreamHouse,
} from "@/lib/api";
import { ApiError } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const GlbStage = dynamic(
  () =>
    import("@/components/dream-house/GlbStage").then((mod) => mod.GlbStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[min(56vh,520px)] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-12 text-center">
        <Loader2 className="size-10 animate-spin text-orange-400" aria-hidden />
        <p className="text-sm text-slate-400">Chargement du viewer 3D…</p>
      </div>
    ),
  },
);

/** Délai entre deux lectures du statut Tripo (côté navigateur). */
const TRIPO_CLIENT_POLL_MS = 2000;

/** Au-delà, on arrête le suivi côté client (le serveur Tripo peut encore finir plus tard). */
const TRIPO_CLIENT_MAX_MS = 90 * 60 * 1000;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** Longueur du texte fusionné (style + description + tags) au-delà de laquelle l’image peut être tronquée côté serveur (~900 car. prompt total). */
const MERGED_DESCRIPTION_SOFT_LIMIT = 520;

/** Délai entre deux vues Pollinations (même via le backend — évite 429 / pages HTML « rate limit »). */
const POLLINATIONS_PROXY_GAP_MS = 22_000;

/** Plus d’essais + pauses plus longues si Pollinations renvoie encore une erreur après le décalage entre vues. */
const POLLINATIONS_CLIENT_RETRY_BACKOFF_MS = [0, 6000, 16_000, 28_000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Plusieurs essais côté client si le proxy Nest reçoit encore une erreur Pollinations. */
async function fetchPollinationsThroughBackendWithRetries(
  url: string,
): Promise<Blob> {
  let lastErr: unknown;
  for (let a = 0; a < POLLINATIONS_CLIENT_RETRY_BACKOFF_MS.length; a++) {
    const wait = POLLINATIONS_CLIENT_RETRY_BACKOFF_MS[a];
    if (wait > 0) await sleep(wait);
    try {
      return await fetchDreamHousePollinationsBlob(url);
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr instanceof ApiError) {
    throw lastErr;
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Could not fetch the image through the server.");
}

const IMAGE_VIEW_LABELS = ["Front", "Perspective", "Context"] as const;

const ARCHITECTURE_STYLES = [
  { value: "_none", label: "Free style (no preset)", fragment: "" },
  {
    value: "contemporary",
    label: "Contemporary",
    fragment:
      "Contemporary single-family home, clean lines, sharp geometry, modern exterior materials.",
  },
  {
    value: "mediterranean",
    label: "Mediterranean",
    fragment:
      "Mediterranean villa style, warm stucco, terracotta roof hints, arched openings where fitting.",
  },
  {
    value: "scandinavian",
    label: "Scandinavian / wood",
    fragment:
      "Scandinavian residential style, natural wood cladding accents, simple gable roof, minimal warm palette.",
  },
  {
    value: "traditional",
    label: "Traditional",
    fragment:
      "Traditional suburban house, pitched roof, symmetric facade windows, classic proportions.",
  },
] as const;

const DETAIL_TAGS = [
  {
    id: "large_windows",
    label: "Large glazing",
    fragment: "Large glazed openings and sliding glass doors along the main facade.",
  },
  {
    id: "flat_roof",
    label: "Flat roof",
    fragment: "Mostly flat roof with subtle parapet or concealed gutter line.",
  },
  {
    id: "wood_facade",
    label: "Wood cladding",
    fragment: "Visible wood siding or horizontal timber accent strips on parts of the facade.",
  },
  {
    id: "terrace",
    label: "Terrace",
    fragment: "Outdoor terrace or deck visible from the street level.",
  },
  {
    id: "landscaping",
    label: "Landscaping",
    fragment: "Thoughtful front yard landscaping, paths, trees, and planting beds.",
  },
] as const;

const COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: "Orange", hex: "#ea580c" },
  { label: "Terracotta", hex: "#c2410c" },
  { label: "Slate blue", hex: "#334155" },
  { label: "Sage green", hex: "#4d7c0f" },
  { label: "Off-white", hex: "#e2e8f0" },
  { label: "Charcoal", hex: "#1e293b" },
];

function tripStatusLabelEn(status: string): string {
  switch (status) {
    case "queued":
      return "Queued at Tripo…";
    case "running":
      return "Generating mesh…";
    case "processing":
      return "Processing model…";
    case "success":
      return "Finalizing 3D file…";
    case "unknown":
      return "Task in progress (limited detail)…";
    default:
      return "Connecting to Tripo…";
  }
}

function buildMergedDescription(
  core: string,
  styleValue: string,
  tagIds: readonly string[],
): string {
  const styleFragment =
    ARCHITECTURE_STYLES.find((s) => s.value === styleValue)?.fragment ?? "";
  const tagFragments = tagIds
    .map((id) => DETAIL_TAGS.find((t) => t.id === id)?.fragment)
    .filter(Boolean) as string[];
  const parts = [styleFragment, core.trim(), tagFragments.join(" ")].filter(Boolean);
  return parts.join(" ");
}

const optionalPositiveBudget = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return undefined;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }
  return n;
}, z.number().optional());

const optionalTerrainM2 = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return undefined;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n) || n < 1) {
    return undefined;
  }
  return n;
}, z.number().optional());

const formSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required.")
    .max(8000, "Maximum 8000 characters."),
  accentColor: z
    .string()
    .regex(HEX_COLOR, "Use color format #RRGGBB (e.g. #ea580c)."),
  budgetEur: optionalPositiveBudget,
  terrainM2: optionalTerrainM2,
});

type FormValues = z.infer<typeof formSchema>;

export function DreamHouseClient() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [slideErrors, setSlideErrors] = useState<Record<number, boolean>>({});
  /** URLs `blob:` après passage par `POST /dream-house/pollinations-image`. */
  const [proxiedImageUrls, setProxiedImageUrls] = useState<(string | null)[]>([]);
  const proxiedObjectUrlsRef = useRef<string[]>([]);

  const [architectureStyle, setArchitectureStyle] = useState<string>("_none");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [modelGlbUrl, setModelGlbUrl] = useState<string | null>(null);
  const [localGlbUrl, setLocalGlbUrl] = useState<string | null>(null);
  const [glbLoadError, setGlbLoadError] = useState<string | null>(null);
  const localGlbObjectUrlRef = useRef<string | null>(null);
  const [tripoError, setTripoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tripoLive, setTripoLive] = useState<{
    status: string;
    progress?: number;
  } | null>(null);
  const [tripoStartedAt, setTripoStartedAt] = useState<number | null>(null);
  const [, setElapsedTick] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      accentColor: "#ea580c",
      budgetEur: undefined,
      terrainM2: undefined,
    },
  });

  const watchedDescription = form.watch("description");
  const mergedPreview = useMemo(
    () =>
      buildMergedDescription(watchedDescription ?? "", architectureStyle, selectedTags),
    [watchedDescription, architectureStyle, selectedTags],
  );
  const mergedLength = mergedPreview.length;
  const mergedTooLong = mergedLength > MERGED_DESCRIPTION_SOFT_LIMIT;

  const tripoPollActive = Boolean(taskId && !modelGlbUrl && !tripoError);
  const glbProxyPending = Boolean(
    modelGlbUrl && !localGlbUrl && !glbLoadError,
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCarouselIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || imageUrls.length === 0) return;
    emblaApi.reInit();
    emblaApi.scrollTo(0);
    setCarouselIndex(0);
  }, [emblaApi, imageUrls]);

  useEffect(() => {
    const revokeAll = () => {
      for (const u of proxiedObjectUrlsRef.current) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* ignore */
        }
      }
      proxiedObjectUrlsRef.current = [];
    };

    revokeAll();
    setSlideErrors({});

    if (imageUrls.length === 0) {
      setProxiedImageUrls([]);
      return;
    }

    const n = imageUrls.length;
    setProxiedImageUrls(Array.from({ length: n }, () => null));
    let cancelled = false;

    void (async () => {
      for (let i = 0; i < n; i++) {
        if (cancelled) break;
        if (i > 0) {
          await new Promise((r) => setTimeout(r, POLLINATIONS_PROXY_GAP_MS));
        }
        if (cancelled) break;
        try {
          const blob = await fetchPollinationsThroughBackendWithRetries(
            imageUrls[i],
          );
          if (cancelled) break;
          const ou = URL.createObjectURL(blob);
          proxiedObjectUrlsRef.current.push(ou);
          setProxiedImageUrls((prev) => {
            const next = [...prev];
            next[i] = ou;
            return next;
          });
        } catch {
          if (!cancelled) {
            setSlideErrors((prev) => ({ ...prev, [i]: true }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      revokeAll();
    };
  }, [imageUrls]);

  useEffect(() => {
    if (!modelGlbUrl) {
      if (localGlbObjectUrlRef.current) {
        URL.revokeObjectURL(localGlbObjectUrlRef.current);
        localGlbObjectUrlRef.current = null;
      }
      setLocalGlbUrl(null);
      setGlbLoadError(null);
      return;
    }

    let cancelled = false;
    setLocalGlbUrl(null);
    setGlbLoadError(null);

    void (async () => {
      try {
        const blob = await fetchDreamHouseGlbBlob(modelGlbUrl);
        if (cancelled) return;
        if (localGlbObjectUrlRef.current) {
          URL.revokeObjectURL(localGlbObjectUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(blob);
        localGlbObjectUrlRef.current = objectUrl;
        setLocalGlbUrl(objectUrl);
      } catch (e) {
        if (cancelled) return;
        if (localGlbObjectUrlRef.current) {
          URL.revokeObjectURL(localGlbObjectUrlRef.current);
          localGlbObjectUrlRef.current = null;
        }
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not fetch the 3D file through the server.";
        setGlbLoadError(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [modelGlbUrl]);

  useEffect(() => {
    return () => {
      if (localGlbObjectUrlRef.current) {
        URL.revokeObjectURL(localGlbObjectUrlRef.current);
        localGlbObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!tripoPollActive || !tripoStartedAt) {
      return;
    }
    const iv = setInterval(() => setElapsedTick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, [tripoPollActive, tripoStartedAt]);

  useEffect(() => {
    if (!taskId || modelGlbUrl || tripoError) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    const pollOnce = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > TRIPO_CLIENT_MAX_MS) {
        setTripoError(
          "3D generation exceeded the browser tracking limit (90 min). You can close and start again.",
        );
        return;
      }
      try {
        const s = await getDreamHouseTripoTaskStatus(taskId);
        if (cancelled) return;
        setTripoLive({ status: s.status, progress: s.progress });
        if (s.status === "success" && s.modelGlbUrl) {
          setModelGlbUrl(s.modelGlbUrl);
          return;
        }
        if (
          s.status === "failed" ||
          s.status === "cancelled" ||
          s.status === "canceled" ||
          s.status === "error"
        ) {
          setTripoError(s.message ?? "3D generation failed.");
          return;
        }
        timeoutId = setTimeout(() => void pollOnce(), TRIPO_CLIENT_POLL_MS);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Error while polling Tripo.";
        setTripoError(msg);
      }
    };

    void pollOnce();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [taskId, modelGlbUrl, tripoError]);

  const toggleTag = useCallback((id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      setSubmitError(null);
      setTripoError(null);
      setImageUrls([]);
      setSlideErrors({});
      setTaskId(null);
      setModelGlbUrl(null);
      setLocalGlbUrl(null);
      setGlbLoadError(null);
      setTripoLive(null);
      setTripoStartedAt(null);
      try {
        const description = buildMergedDescription(
          values.description,
          architectureStyle,
          selectedTags,
        );
        const payload: Parameters<typeof startDreamHouse>[0] = {
          description,
          accentColor: values.accentColor,
          architectureStyle:
            architectureStyle && architectureStyle !== "_none"
              ? architectureStyle
              : undefined,
          detailTags: selectedTags.length > 0 ? selectedTags : undefined,
        };
        if (values.budgetEur != null) payload.budgetEur = values.budgetEur;
        if (values.terrainM2 != null) payload.terrainM2 = values.terrainM2;

        const data = await startDreamHouse(payload);
        const urls =
          Array.isArray(data.imageUrls) && data.imageUrls.length > 0
            ? data.imageUrls
            : data.imageUrl
              ? [data.imageUrl]
              : [];
        setImageUrls(urls);
        setTaskId(data.taskId);
        setTripoStartedAt(Date.now());
        setTripoLive({ status: "queued" });
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : "An unexpected error occurred.";
        setSubmitError(msg);
      }
    },
    [architectureStyle, selectedTags],
  );

  const starting = form.formState.isSubmitting;
  const formDisabled = starting || tripoPollActive || glbProxyPending;

  const activeProxiedUrl = proxiedImageUrls[carouselIndex] ?? null;
  const activeOriginalUrl = imageUrls[carouselIndex] ?? null;
  const showResults = imageUrls.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white">
          <Link href="/dashboard/clients" className="gap-1.5">
            <ArrowLeft className="size-4" aria-hidden />
            Client area
          </Link>
        </Button>
      </div>

      <header className="mb-10 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
          Visualization
        </p>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
          Dream House
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
          Use presets for style, refine with tags, then run generation:{" "}
          <strong className="font-medium text-slate-300">several images</strong> (different angles)
          appear first; the{" "}
          <strong className="font-medium text-slate-300">3D model</strong> is generated by Tripo from
          the <strong className="font-medium text-slate-300">first image</strong> (Front view) when the
          API allows it; otherwise it falls back to text only.
        </p>
      </header>

      <div className="flex flex-col gap-12">
        <section className="max-w-2xl rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-lg shadow-black/20 backdrop-blur-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-100">Project</h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 flex flex-col gap-5"
            >
              <div className="space-y-2">
                <Label className="text-slate-200">Architectural style</Label>
                <Select
                  value={architectureStyle}
                  onValueChange={setArchitectureStyle}
                  disabled={formDisabled}
                >
                  <SelectTrigger
                    size="default"
                    className="h-11 w-full max-w-md border-white/15 bg-slate-950/80 text-slate-100"
                  >
                    <SelectValue placeholder="Choose a style" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-slate-900 text-slate-100">
                    {ARCHITECTURE_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Added automatically to the text sent to the models (image + 3D).
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Common details</Label>
                <div className="flex flex-wrap gap-2">
                  {DETAIL_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <Button
                        key={tag.id}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className="rounded-full border-white/15 bg-slate-950/40 text-xs hover:bg-slate-800/80 data-[variant=default]:border-orange-500/40"
                        disabled={formDisabled}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <FormLabel>Your description</FormLabel>
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          mergedTooLong ? "text-amber-400" : "text-slate-500",
                        )}
                      >
                        Merged text: {mergedLength} chars.
                        {mergedTooLong
                          ? " — image preview may truncate; shorten or remove tags."
                          : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Free text: style and tags above are appended to this when sending (you only edit
                      this box).
                    </p>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. House on a slope, double garage facing the street, enclosed south garden…"
                        className="min-h-[120px] resize-y bg-slate-950/50"
                        disabled={formDisabled}
                        maxLength={8000}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="budgetEur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200">Budget (€)</FormLabel>
                      <p className="text-xs text-slate-500">
                        Indicative — used by Groq to shape the Tripo prompt (finish level).
                      </p>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1000}
                          placeholder="ex. 250000"
                          className="h-11 border-white/15 bg-slate-950/80"
                          disabled={formDisabled}
                          value={
                            field.value === undefined || field.value === null
                              ? ""
                              : field.value
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              field.onChange(undefined);
                              return;
                            }
                            const n = Number(v);
                            field.onChange(Number.isFinite(n) ? n : undefined);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="terrainM2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200">Plot (m²)</FormLabel>
                      <p className="text-xs text-slate-500">
                        Plot area — built mass vs green space in the visuals.
                      </p>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={1}
                          step={10}
                          placeholder="ex. 450"
                          className="h-11 border-white/15 bg-slate-950/80"
                          disabled={formDisabled}
                          value={
                            field.value === undefined || field.value === null
                              ? ""
                              : field.value
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              field.onChange(undefined);
                              return;
                            }
                            const n = Number(v);
                            field.onChange(Number.isFinite(n) ? n : undefined);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="accentColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accent color (facade / joinery)</FormLabel>
                    <p className="text-xs text-slate-500">
                      Used in images and the 3D model (paint, shutters, door, etc.).
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {COLOR_PRESETS.map((p) => (
                        <button
                          key={p.hex}
                          type="button"
                          disabled={formDisabled}
                          title={p.hex}
                          onClick={() => field.onChange(p.hex)}
                          className={cn(
                            "flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition",
                            field.value.toLowerCase() === p.hex.toLowerCase()
                              ? "border-orange-400/80 bg-orange-500/15 text-orange-100"
                              : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/25",
                            "disabled:opacity-50",
                          )}
                        >
                          <span
                            className="size-4 shrink-0 rounded-full border border-white/20 shadow-inner"
                            style={{ backgroundColor: p.hex }}
                            aria-hidden
                          />
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <FormControl>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <input
                          type="color"
                          aria-label="Color picker"
                          className="h-11 w-14 cursor-pointer rounded-lg border border-white/15 bg-slate-950/80 p-1 shadow-inner disabled:opacity-50"
                          disabled={formDisabled}
                          value={HEX_COLOR.test(field.value) ? field.value : "#ea580c"}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <Input
                          type="text"
                          spellCheck={false}
                          maxLength={7}
                          placeholder="#ea580c"
                          className="h-11 max-w-[9.5rem] border-white/15 bg-slate-950/80 font-mono text-sm text-slate-100"
                          disabled={formDisabled}
                          value={field.value}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v.length <= 7) field.onChange(v);
                          }}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (HEX_COLOR.test(v)) field.onChange(v);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                >
                  {submitError}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="mt-2 w-full rounded-2xl sm:w-auto"
                disabled={formDisabled}
              >
                {starting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Preparing…
                  </>
                ) : tripoPollActive || glbProxyPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {glbProxyPending ? "Loading 3D file…" : "3D model in progress…"}
                  </>
                ) : (
                  "Generate images & 3D model"
                )}
              </Button>
              {tripoPollActive || glbProxyPending ? (
                <p className="text-xs leading-relaxed text-slate-500">
                  {glbProxyPending
                    ? "Fetching the GLB through your backend (avoids Tripo CDN CORS issues)."
                    : "Images are shown. Tripo generation can take several minutes; this page polls status automatically."}
                </p>
              ) : null}
            </form>
          </Form>
        </section>

        {!showResults ? (
          <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-900/25 px-6 py-12 text-center text-sm text-slate-500">
            Fill in the form and run generation: up to three image views appear first; the 3D model
            loads on the right when ready.
          </div>
        ) : (
          <section className="grid gap-10 lg:grid-cols-2 lg:gap-8">
            <div className="min-w-0">
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Image previews
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">
                Generated illustrations (Pollinations) — visual inspiration, not a contract drawing.
                Each view is fetched through your backend, about{" "}
                {Math.round(POLLINATIONS_PROXY_GAP_MS / 1000)} s after the previous one, to reduce
                Pollinations throttling (429 / concurrency).
              </p>
              <div className="relative">
                {imageUrls.length > 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 z-20 size-9 -translate-y-1/2 rounded-full border border-white/10 bg-slate-950/85 shadow-md"
                      aria-label="Previous image"
                      onClick={() => emblaApi?.scrollPrev()}
                    >
                      <ChevronLeft className="size-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 z-20 size-9 -translate-y-1/2 rounded-full border border-white/10 bg-slate-950/85 shadow-md"
                      aria-label="Next image"
                      onClick={() => emblaApi?.scrollNext()}
                    >
                      <ChevronRight className="size-5" />
                    </Button>
                  </>
                ) : null}
                <div
                  className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-inner"
                  ref={emblaRef}
                >
                  <div className="flex">
                    {imageUrls.map((url, i) => (
                      <div
                        className="min-w-0 shrink-0 grow-0 basis-full"
                        key={`${url}-${i}`}
                      >
                        <div className="relative aspect-video w-full">
                          {slideErrors[i] ? (
                            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
                              <p>Could not load this image (via the server).</p>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-orange-400 underline-offset-2 hover:underline"
                              >
                                <ExternalLink className="size-3.5" aria-hidden />
                                Open Pollinations URL
                              </a>
                            </div>
                          ) : !proxiedImageUrls[i] ? (
                            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 bg-slate-950/50 p-6 text-center text-sm text-slate-500">
                              <Loader2 className="size-8 animate-spin text-orange-400/80" aria-hidden />
                              <p>
                                Downloading via backend
                                {i > 0
                                  ? ` (queue ~${Math.round(POLLINATIONS_PROXY_GAP_MS / 1000)} s between views)…`
                                  : "…"}
                              </p>
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element -- blob: local après proxy
                            <img
                              src={proxiedImageUrls[i]}
                              alt={`Dream House visualization — ${IMAGE_VIEW_LABELS[i] ?? `view ${i + 1}`}`}
                              className="absolute inset-0 h-full w-full object-cover"
                              loading={i === 0 ? "eager" : "lazy"}
                              decoding="async"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {imageUrls.length > 1 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 pt-0.5">
                  {imageUrls.map((url, i) => (
                    <button
                      key={`thumb-${url}-${i}`}
                      type="button"
                      onClick={() => emblaApi?.scrollTo(i)}
                      className={cn(
                        "relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition",
                        i === carouselIndex
                          ? "border-orange-400 ring-1 ring-orange-400/40"
                          : "border-transparent opacity-80 hover:opacity-100",
                      )}
                    >
                      {proxiedImageUrls[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={proxiedImageUrls[i]}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-800/80 text-[10px] text-slate-500">
                          …
                        </div>
                      )}
                      <span className="absolute bottom-0.5 left-0.5 rounded bg-black/65 px-1 py-0.5 text-[10px] font-medium text-white">
                        {IMAGE_VIEW_LABELS[i] ?? i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {activeProxiedUrl && !slideErrors[carouselIndex] ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="border-white/15" asChild>
                    <a href={activeProxiedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" aria-hidden />
                      Full-screen preview
                    </a>
                  </Button>
                  {activeOriginalUrl ? (
                    <Button variant="ghost" size="sm" className="text-slate-400" asChild>
                      <a href={activeOriginalUrl} target="_blank" rel="noopener noreferrer">
                        Pollinations link
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
                3D model (.glb)
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">
                Tripo generation (first image → volume, or text fallback): the model mainly follows the
                main facade; other views are indicative. Server hints:{" "}
                <code className="rounded bg-slate-800 px-1 py-0.5 text-[11px]">
                  TRIPO_FACE_LIMIT
                </code>
                ,{" "}
                <code className="rounded bg-slate-800 px-1 py-0.5 text-[11px]">
                  TRIPO_TEXTURE
                </code>{" "}
                (.env backend).
              </p>
              {tripoError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                >
                  {tripoError}
                </p>
              ) : glbLoadError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                >
                  {glbLoadError}
                </p>
              ) : !modelGlbUrl ? (
                <div className="flex min-h-[min(56vh,520px)] flex-col items-center justify-center gap-5 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-12 text-center">
                  <Loader2 className="size-10 animate-spin text-orange-400" aria-hidden />
                  <div className="max-w-md space-y-2">
                    <p className="text-sm font-medium text-slate-200">
                      {tripoLive
                        ? tripStatusLabelEn(tripoLive.status)
                        : "Preparing Tripo task…"}
                    </p>
                    {tripoStartedAt ? (
                      <p className="text-xs text-slate-500">
                        Elapsed:{" "}
                        {Math.floor((Date.now() - tripoStartedAt) / 60_000)} min — duration depends
                        mainly on Tripo server load (often 5 to 20+ min).
                      </p>
                    ) : null}
                    {typeof tripoLive?.progress === "number" ? (
                      <div className="pt-1">
                        <div className="mb-1 flex justify-between text-xs text-slate-500">
                          <span>Progress</span>
                          <span>{tripoLive.progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-orange-500 transition-[width] duration-500"
                            style={{ width: `${tripoLive.progress}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : !localGlbUrl ? (
                <div className="flex min-h-[min(56vh,520px)] flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-12 text-center">
                  <Loader2 className="size-10 animate-spin text-orange-400" aria-hidden />
                  <p className="max-w-md text-sm text-slate-300">
                    Downloading the model through the server (workaround for browser restrictions on
                    the Tripo file)…
                  </p>
                </div>
              ) : (
                <>
                  <GlbStage key={localGlbUrl} url={localGlbUrl} />
                  <p className="mt-2 text-xs text-slate-500">
                    Rotate the model with the mouse (click + drag). Use Reset view below the 3D frame.
                  </p>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
