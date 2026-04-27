"use client";
import Script from "next/script";
export function FaceApiLoader() {
  return <Script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js" strategy="lazyOnload" />;
}
