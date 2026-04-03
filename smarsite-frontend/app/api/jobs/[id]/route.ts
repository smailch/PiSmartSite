import { NextResponse } from "next/server";
import { jobsStore, tasksList } from "@/lib/jobsStore";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = jobsStore.find((j) => j.id === Number(id));
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const index = jobsStore.findIndex((j) => j.id === Number(id));
  if (index === -1) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

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

  jobsStore[index] = {
    ...jobsStore[index],
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

  return NextResponse.json(jobsStore[index]);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const index = jobsStore.findIndex((j) => j.id === Number(id));
  if (index === -1) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  jobsStore.splice(index, 1);
  return NextResponse.json({ success: true });
}
