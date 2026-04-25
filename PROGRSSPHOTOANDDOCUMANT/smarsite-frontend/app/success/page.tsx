"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");

    if (!sessionId) {
      router.push("/invoices");
      return;
    }

    const confirm = async () => {
      try {
        await fetch("http://localhost:3200/payments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        // 🔥 Save flag for toast
        localStorage.setItem("paymentSuccess", "true");

      } catch (err) {
        console.error("Confirm failed:", err);
      }

      // 🔥 redirect to invoices
      router.push("/invoices");
    };

    confirm();
  }, [router]);

  return <p className="p-10">Processing payment...</p>;
}