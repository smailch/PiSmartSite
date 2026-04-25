export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:3200/invoices");

    const text = await res.text();
    const data = text ? JSON.parse(text) : [];

    return Response.json(data);
  } catch (err) {
    console.error("GET ERROR:", err);
    return Response.json({ error: "GET failed" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";

// ✅ THIS IS WHAT YOU ARE MISSING
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch("http://127.0.0.1:3200/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("POST ERROR:", err);
    return Response.json({ error: "POST failed" }, { status: 500 });
  }
}