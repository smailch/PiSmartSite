/**
 * Démo : job « Peinture », 5 travailleurs, pointages sur un mois (jours ouvrables uniquement).
 *
 * Usage (depuis smartsite-backend/) :
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-peinture-attendance-demo.ts
 *
 * Variables optionnelles :
 *   MONGODB_URI   — sinon URI par défaut (même base que l’app)
 *   SEED_YEAR     — ex. 2026
 *   SEED_MONTH    — 1–12, ex. 4 pour avril
 *
 * Prérequis : au moins une tâche (Task) dans la base (sinon le script s’arrête avec un message).
 */

import mongoose from 'mongoose';
import { Types } from 'mongoose';

const DEFAULT_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://mourad:mourad@smartsite.poyscqk.mongodb.net/smartsite?retryWrites=true&w=majority';

const JOB_TITLE = 'Peinture';

/** Profils démo avec noms tunisiens courants (prénom + nom de famille). */
const TUNISIAN_DEMO_WORKERS: ReadonlyArray<{
  firstName: string;
  lastName: string;
  phoneSuffix: string;
}> = [
  { firstName: 'Mohamed', lastName: 'Trabelsi', phoneSuffix: '55111234' },
  { firstName: 'Fatma', lastName: 'Bouazizi', phoneSuffix: '55222345' },
  { firstName: 'Ahmed', lastName: 'Mekni', phoneSuffix: '55333456' },
  { firstName: 'Amel', lastName: 'Jlassi', phoneSuffix: '55444567' },
  { firstName: 'Youssef', lastName: 'Ben Ammar', phoneSuffix: '55555678' },
];

function weekdaysUtc(year: number, month: number): Date[] {
  const out: Date[] = [];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= last; day++) {
    const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const w = d.getUTCDay();
    if (w >= 1 && w <= 5) out.push(d);
  }
  return out;
}

async function main(): Promise<void> {
  const year = Number(process.env.SEED_YEAR ?? 2026);
  const month = Number(process.env.SEED_MONTH ?? 4);
  if (!Number.isFinite(year) || month < 1 || month > 12) {
    throw new Error('SEED_YEAR / SEED_MONTH invalides');
  }

  const uri = DEFAULT_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection failed');

  const col = {
    projects: db.collection('projects'),
    tasks: db.collection('tasks'),
    jobs: db.collection('jobs'),
    humans: db.collection('humans'),
    attendances: db.collection('attendances'),
  };

  const stamp = Date.now();
  const humanDocs: Array<{
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    cin: string;
    birthDate: Date;
    phone: string;
    role: string;
    availability: boolean;
  }> = [];

  for (let i = 0; i < TUNISIAN_DEMO_WORKERS.length; i++) {
    const w = TUNISIAN_DEMO_WORKERS[i];
    const doc = {
      firstName: w.firstName,
      lastName: w.lastName,
      cin: `PEINTURE-${stamp}-${i + 1}`,
      birthDate: new Date('1990-01-15'),
      phone: `+216${w.phoneSuffix}`,
      role: 'Peintre',
      availability: true,
      /** DT — pour tests paie / facturation Salaires */
      monthlySalaryDt: 1500 + i * 50,
    };
    const r = await col.humans.insertOne(doc);
    humanDocs.push({ _id: r.insertedId as Types.ObjectId, ...doc });
  }

  let project = await col.projects.findOne({});
  if (!project || !project._id) {
    const ins = await col.projects.insertOne({
      name: 'Chantier démo — Peinture',
      description: 'Projet créé par le script seed (test présences)',
      startDate: new Date(Date.UTC(year, month - 1, 1)),
      endDate: new Date(Date.UTC(year, month, 0)),
      status: 'En cours',
      type: 'Rénovation',
      budget: 10000,
      spentBudget: 0,
      location: 'Tunis',
      createdBy: humanDocs[0]._id,
      createdAt: new Date(),
    });
    project = await col.projects.findOne({ _id: ins.insertedId });
  }
  if (!project || !project._id) throw new Error('Projet introuvable');
  const projectId = project._id as Types.ObjectId;

  let task = await col.tasks.findOne({ projectId });
  if (!task || !task._id) {
    const tins = await col.tasks.insertOne({
      title: 'Tâche démo — support job Peinture',
      description: 'Tâche technique pour lier le job de démo',
      projectId,
      duration: 10,
      priority: 'MEDIUM',
      status: 'En cours',
      progress: 0,
      dependsOn: [],
      spentBudget: 0,
      createdAt: new Date(),
    });
    task = await col.tasks.findOne({ _id: tins.insertedId });
  }
  if (!task || !task._id) throw new Error('Tâche introuvable');
  const taskId = task._id as Types.ObjectId;

  const assignedResources = humanDocs.map((h) => ({
    resourceId: h._id,
    type: 'Human' as const,
    name: `${h.firstName} ${h.lastName}`,
  }));

  let job = await col.jobs.findOne({ title: JOB_TITLE });
  const startTime = new Date(Date.UTC(year, month - 1, 1, 8, 0, 0));
  const endTime = new Date(Date.UTC(year, month, 0, 17, 0, 0));

  if (!job) {
    const ins = await col.jobs.insertOne({
      taskId,
      title: JOB_TITLE,
      description: 'Démo présence — peinture (données de test)',
      startTime,
      endTime,
      status: 'En cours',
      assignedResources,
    });
    job = await col.jobs.findOne({ _id: ins.insertedId });
  } else {
    await col.jobs.updateOne(
      { _id: job._id },
      {
        $set: {
          assignedResources,
          description: 'Démo présence — peinture (données de test)',
          startTime,
          endTime,
          status: 'En cours',
        },
      },
    );
    job = await col.jobs.findOne({ _id: job._id });
  }

  if (!job || !job._id) {
    throw new Error('Job Peinture introuvable après insertion');
  }
  const jobId = job._id as Types.ObjectId;

  const days = weekdaysUtc(year, month);
  const jobOid = new Types.ObjectId(String(jobId));

  await col.attendances.deleteMany({
    jobId: jobOid,
    date: {
      $gte: new Date(Date.UTC(year, month - 1, 1)),
      $lt: new Date(Date.UTC(year, month, 1)),
    },
  });

  const bulk: Record<string, unknown>[] = [];

  /**
   * Profils de test (jours ouvrables) :
   * 0 — présent tous les jours ouvrables
   * 1 — 1 absence (dernier jour ouvrable du mois)
   * 2 — 2 absences (2 derniers jours ouvrables)
   * 3 — ~5 absences réparties
   * 4 — moitié environ (un jour sur deux)
   */
  const absencePatterns: number[][] = [
    [],
    days.length >= 1 ? [days.length - 1] : [],
    days.length >= 2 ? [days.length - 1, days.length - 2] : [],
    [1, 3, 5, 7, 9].filter((i) => i < days.length),
    days.map((_, i) => i).filter((i) => i % 2 === 1),
  ];

  for (let wi = 0; wi < 5; wi++) {
    const absentIdx = new Set(absencePatterns[wi] ?? []);
    const rid = humanDocs[wi]._id;
    for (let di = 0; di < days.length; di++) {
      const day = days[di];
      const present = !absentIdx.has(di);
      bulk.push({
        jobId: jobOid,
        resourceId: rid,
        date: day,
        checkIn: present ? '08:00' : undefined,
        checkOut: present ? '17:00' : undefined,
        status: present ? 'present' : 'absent',
      });
    }
  }

  if (bulk.length) await col.attendances.insertMany(bulk);

  console.log('OK — démo Peinture');
  console.log(`  Job ID     : ${String(jobId)}`);
  console.log(`  Période    : ${month}/${year} (${days.length} jours ouvrables)`);
  console.log(`  Travailleurs : ${humanDocs.map((h) => String(h._id)).join(', ')}`);
  console.log(`  Pointages  : ${bulk.length} lignes`);
  console.log('');
  console.log('Ouvrez le job « Peinture » dans l’app → Pointage, choisissez le mois, puis « Analyser ».');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
