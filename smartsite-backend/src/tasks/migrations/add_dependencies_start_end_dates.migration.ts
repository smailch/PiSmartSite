import mongoose, { type Types } from 'mongoose';

type ProjectRaw = {
  _id: Types.ObjectId;
  startDate?: Date | null;
  createdAt?: Date | null;
};

type TaskRaw = {
  _id: Types.ObjectId;
  projectId?: Types.ObjectId;
  createdAt?: Date;
  duration?: number;
  dependsOn?: Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  return null;
}

/**
 * Migration:
 * 1) dependsOn => [] si absent
 * 2) startDate => task.createdAt, sinon project.startDate, sinon project.createdAt, sinon now
 * 3) endDate => startDate + duration (min 1 jour)
 */
async function runMigration(): Promise<void> {
  const mongoUri =
    process.env.MONGODB_URI ??
    process.env.MONGO_URI ??
    process.env.SMARTSITE_MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'Missing MongoDB connection string. Set MONGODB_URI (or MONGO_URI / SMARTSITE_MONGODB_URI).',
    );
  }

  await mongoose.connect(mongoUri);

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error(
        'MongoDB connection is established but db handle is unavailable.',
      );
    }

    const tasksCollection = db.collection<TaskRaw>('tasks');
    const projectsCollection = db.collection<ProjectRaw>('projects');

    // Précharge les dates de projet pour calculer startDate fallback.
    const projects = await projectsCollection
      .find({}, { projection: { _id: 1, startDate: 1, createdAt: 1 } })
      .toArray();

    const projectStartById = new Map<string, Date>();
    for (const project of projects) {
      const fromStartDate = toValidDate(project.startDate);
      const fromCreatedAt = toValidDate(project.createdAt);
      const best = fromStartDate ?? fromCreatedAt;
      if (best) {
        projectStartById.set(project._id.toString(), best);
      }
    }

    const cursor = tasksCollection.find(
      {},
      {
        projection: {
          _id: 1,
          projectId: 1,
          createdAt: 1,
          duration: 1,
          dependsOn: 1,
          startDate: 1,
          endDate: 1,
        },
      },
    );

    const bulkOps: Array<{
      updateOne: {
        filter: { _id: Types.ObjectId };
        update: { $set: Partial<TaskRaw> };
      };
    }> = [];

    let scanned = 0;
    let updated = 0;

    for await (const task of cursor) {
      scanned += 1;

      const setPayload: Partial<TaskRaw> = {};

      // 1) dependsOn par défaut []
      if (!Array.isArray(task.dependsOn)) {
        setPayload.dependsOn = [];
      }

      // 2) startDate fallback chain
      const currentStart = toValidDate(task.startDate);
      let startDate = currentStart;
      if (!startDate) {
        const fromTaskCreatedAt = toValidDate(task.createdAt);
        const fromProjectStart = task.projectId
          ? (projectStartById.get(task.projectId.toString()) ?? null)
          : null;

        startDate = fromTaskCreatedAt ?? fromProjectStart ?? new Date();
        setPayload.startDate = startDate;
      }

      // 3) endDate = startDate + duration
      const currentEnd = toValidDate(task.endDate);
      if (!currentEnd) {
        const durationDays = Math.max(
          1,
          Number.isFinite(task.duration)
            ? Math.round(task.duration as number)
            : 1,
        );
        const safeStart = startDate ?? new Date();
        setPayload.endDate = new Date(
          safeStart.getTime() + durationDays * MS_PER_DAY,
        );
      }

      if (Object.keys(setPayload).length > 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: task._id },
            update: { $set: setPayload },
          },
        });
      }

      if (bulkOps.length >= 500) {
        const result = await tasksCollection.bulkWrite(bulkOps, {
          ordered: false,
        });
        updated += result.modifiedCount;
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0) {
      const result = await tasksCollection.bulkWrite(bulkOps, {
        ordered: false,
      });
      updated += result.modifiedCount;
    }

    console.info(
      `[Task Migration] Completed. scanned=${scanned}, modified=${updated}, timestamp=${new Date().toISOString()}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runMigration().catch((error: unknown) => {
    console.error('[Task Migration] Failed:', error);
    process.exitCode = 1;
  });
}

export { runMigration };
