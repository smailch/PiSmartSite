import { redirect } from "next/navigation";

/** Legacy URL: bonuses are under Invoices → Bonuses tab. */
export default function FinancePrimesRedirectPage() {
  redirect("/invoices?tab=primes");
}
