import { NextResponse } from "next/server";
import { tasksList } from "@/lib/jobsStore";

export async function GET() {
  return NextResponse.json(tasksList);
}
