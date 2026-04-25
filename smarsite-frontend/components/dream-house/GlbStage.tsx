"use client";

import "@google/model-viewer";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "camera-controls"?: boolean;
          "shadow-intensity"?: string | number;
          exposure?: string | number;
        },
        HTMLElement
      >;
    }
  }
}

type GlbStageProps = {
  url: string;
};

export function GlbStage({ url }: GlbStageProps) {
  const [viewKey, setViewKey] = useState(0);
  const resetView = useCallback(() => {
    setViewKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video min-h-[min(56vh,520px)] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/90 to-slate-950 shadow-inner">
        {/* Remonter la caméra en recréant l’élément (API stable sans typage litigeux). */}
        <model-viewer
          key={`${url}-${viewKey}`}
          src={url}
          alt="Maquette 3D Dream House"
          className="block h-full w-full"
          style={{
            width: "100%",
            height: "100%",
            background: "transparent",
          }}
          {...({
            "camera-controls": "",
            "shadow-intensity": "1",
            exposure: "1",
          } as Record<string, string>)}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-white/15 bg-slate-950/40 text-slate-200 hover:bg-slate-800/80"
        onClick={resetView}
      >
        Réinitialiser la vue
      </Button>
    </div>
  );
}
