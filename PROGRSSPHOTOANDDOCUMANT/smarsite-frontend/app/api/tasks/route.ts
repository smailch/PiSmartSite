import { NextResponse } from "next/server";
import { tasksList } from "@/lib/mockStore";

export async function GET() {
  return NextResponse.json(tasksList);
}
