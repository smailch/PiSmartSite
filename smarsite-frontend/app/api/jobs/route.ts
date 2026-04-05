import { NextResponse } from "next/server";
import { jobsStore, getNextId, resources, tasksList } from "@/lib/jobsStore";

export async function GET() {
  return NextResponse.json(jobsStore);
}

export async function POST(request: Request) {
  const body = await request.json();

  const {
    title,
    description,
    taskId,
    startDate,
    endDate,
    status,
    assignedHumans,
    assignedEquipment,
  } = body;

  // Validation
  if (!title || !taskId || !startDate || !endDate || !status) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (new Date(endDate) <= new Date(startDate)) {
    return NextResponse.json(
      { error: "End date must be after start date" },
      { status: 400 }
    );
  }

  const task = tasksList.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const newJob = {
    id: getNextId(),
    title,
    description: description || "",
    taskId,
    taskName: task.title,
    startDate,
    endDate,
    status,
    assignedHumans: assignedHumans || [],
    assignedEquipment: assignedEquipment || [],
  };

  jobsStore.push(newJob);
  return NextResponse.json(newJob, { status: 201 });
}
