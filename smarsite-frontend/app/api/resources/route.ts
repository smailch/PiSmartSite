import { NextResponse } from "next/server";
import { resources } from "@/lib/jobsStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type) {
    const filtered = resources.filter(
      (r) => r.type.toLowerCase() === type.toLowerCase()
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(resources);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, type, role } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Resource name is required" },
      { status: 400 }
    );
  }

  if (!type || !["Human", "Equipment"].includes(type)) {
    return NextResponse.json(
      { error: "Type must be Human or Equipment" },
      { status: 400 }
    );
  }

  const maxId = resources.reduce((max, r) => Math.max(max, r.id), 0);
  const newResource = {
    id: maxId + 1,
    name: type === "Human" && role ? `${name.trim()} (${role.trim()})` : name.trim(),
    type: type as "Human" | "Equipment",
  };

  resources.push(newResource);
  return NextResponse.json(newResource, { status: 201 });
}
