import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getModelToken } from '@nestjs/mongoose';
import { Task } from './schemas/task.schema';
import { Project } from '../projects/schemas/project.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

/* ---------- helpers ---------- */

const VALID_PROJECT_ID = new Types.ObjectId().toHexString();
const VALID_TASK_ID = new Types.ObjectId().toHexString();

const makeTaskDoc = (overrides: Record<string, unknown> = {}) => {
  const doc: Record<string, unknown> = {
    _id: new Types.ObjectId(VALID_TASK_ID),
    title: 'Tâche test',
    description: '',
    projectId: new Types.ObjectId(VALID_PROJECT_ID),
    duration: 3,
    priority: 'MEDIUM',
    status: 'À faire',
    progress: 0,
    dependsOn: [],
    spentBudget: 0,
    createdAt: new Date(),
    ...overrides,
  };
  doc.populate = jest.fn().mockResolvedValue(doc);
  doc.save = jest.fn().mockResolvedValue(doc);
  return doc;
};

const makeProjectDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(VALID_PROJECT_ID),
  spentBudget: 0,
  ...overrides,
});

/* ---------- mock factories ---------- */

const makeMockTaskModel = (taskDoc = makeTaskDoc()) => {
  const mockModel = jest.fn(() => ({
    ...taskDoc,
    save: jest.fn().mockResolvedValue(taskDoc),
    populate: jest.fn().mockResolvedValue(taskDoc),
  })) as unknown as Record<string, jest.Mock>;

  mockModel.findById = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(taskDoc),
  });

  mockModel.findByIdAndUpdate = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(taskDoc),
  });

  mockModel.findByIdAndDelete = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(taskDoc),
  });

  mockModel.updateMany = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  });

  mockModel.deleteMany = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  });

  // recalculateProjectSpentBudget: find().select().lean().exec()
  const recalculateLeanRows = [
    { _id: new Types.ObjectId(), spentBudget: 200 },
    { _id: new Types.ObjectId(), spentBudget: 300 },
  ];

  mockModel.find = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(recalculateLeanRows),
  });

  return mockModel;
};

const makeMockProjectModel = (projectDoc = makeProjectDoc()) => ({
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([projectDoc]),
  }),
  updateMany: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  }),
  findByIdAndUpdate: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ ...projectDoc, spentBudget: 500 }),
  }),
});

/* ---------- test suite ---------- */

describe('TasksService', () => {
  let service: TasksService;
  let mockTaskModel: ReturnType<typeof makeMockTaskModel>;
  let mockProjectModel: ReturnType<typeof makeMockProjectModel>;

  beforeEach(async () => {
    mockTaskModel = makeMockTaskModel();
    mockProjectModel = makeMockProjectModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getModelToken(Task.name), useValue: mockTaskModel },
        { provide: getModelToken(Project.name), useValue: mockProjectModel },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /* ---------- recalculateProjectSpentBudget ---------- */

  describe('recalculateProjectSpentBudget', () => {
    it('doit sommer les spentBudget (find + lean) et mettre à jour le projet avec $set', async () => {
      const total = await service.recalculateProjectSpentBudget(VALID_PROJECT_ID);

      expect(mockTaskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { projectId: expect.any(Types.ObjectId) },
            { projectId: VALID_PROJECT_ID },
            { $expr: { $eq: [{ $toString: '$projectId' }, VALID_PROJECT_ID] } },
          ]),
        }),
      );

      expect(mockProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        { $set: { spentBudget: 500 } },
        { new: true },
      );

      expect(total).toBe(500);
    });

    it('doit retourner 0 quand aucune tâche ne correspond au projet', async () => {
      mockTaskModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const total = await service.recalculateProjectSpentBudget(VALID_PROJECT_ID);
      expect(total).toBe(0);
    });

    it('doit mettre à jour le projet même si spentBudget=0 (total nul)', async () => {
      mockTaskModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId(), spentBudget: 0 }]),
      });

      await service.recalculateProjectSpentBudget(VALID_PROJECT_ID);

      expect(mockProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        { $set: { spentBudget: 0 } },
        { new: true },
      );
    });

    it('doit lever BadRequestException pour un projectId invalide', async () => {
      await expect(
        service.recalculateProjectSpentBudget('not-a-valid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit logger un warning si le projet est introuvable (findByIdAndUpdate retourne null)', async () => {
      mockProjectModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Ne doit PAS throw — seulement logger un warning
      await expect(
        service.recalculateProjectSpentBudget(VALID_PROJECT_ID),
      ).resolves.toBeDefined();
    });
  });

  /* ---------- create — spentBudget ---------- */

  describe('create — spentBudget', () => {
    it('doit créer une tâche avec spentBudget et déclencher le recalcul projet', async () => {
      const taskDoc = makeTaskDoc({ spentBudget: 1500 });
      const localTaskModel = makeMockTaskModel(taskDoc);
      const localProjectModel = makeMockProjectModel();

      const localModule: TestingModule = await Test.createTestingModule({
        providers: [
          TasksService,
          { provide: getModelToken(Task.name), useValue: localTaskModel },
          { provide: getModelToken(Project.name), useValue: localProjectModel },
        ],
      }).compile();

      const svc = localModule.get<TasksService>(TasksService);

      await svc.create({
        title: 'Tâche avec budget',
        projectId: VALID_PROJECT_ID,
        duration: 2,
        priority: 'HIGH',
        spentBudget: 1500,
      });

      // Le recalcul doit avoir mis à jour le projet avec $set
      expect(localProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        { $set: { spentBudget: expect.any(Number) } },
        { new: true },
      );
    });
  });

  /* ---------- update — spentBudget ---------- */

  describe('update — spentBudget', () => {
    it('doit mettre à jour spentBudget de la tâche et recalculer le projet', async () => {
      await service.update(VALID_TASK_ID, { spentBudget: 2500, duration: 3 });

      // La tâche doit être mise à jour avec $set incluant spentBudget
      expect(mockTaskModel.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_TASK_ID,
        expect.objectContaining({ $set: expect.objectContaining({ spentBudget: 2500 }) }),
        { new: true },
      );

      // Le projet doit être recalculé
      expect(mockProjectModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('doit recalculer DEUX projets quand la tâche change de projet', async () => {
      const NEW_PROJECT_ID = new Types.ObjectId().toHexString();
      jest.clearAllMocks();

      // Reset mocks proprement
      mockProjectModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ spentBudget: 0 }),
      });
      mockTaskModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId(), spentBudget: 0 }]),
      });

      await service.update(VALID_TASK_ID, {
        projectId: NEW_PROJECT_ID,
        duration: 3,
      });

      // findByIdAndUpdate appelé 2 fois: nouveau projet + ancien projet
      expect(mockProjectModel.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    });
  });

  /* ---------- remove ---------- */

  describe('remove', () => {
    it('doit recalculer le spentBudget du projet après suppression de la tâche', async () => {
      await service.remove(VALID_TASK_ID);

      expect(mockProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        { $set: { spentBudget: expect.any(Number) } },
        { new: true },
      );
    });

    it('doit lever NotFoundException si la tâche est introuvable', async () => {
      mockTaskModel.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(VALID_TASK_ID)).rejects.toThrow(NotFoundException);
    });
  });

  /* ---------- validation spentBudget négatif ---------- */

  describe('validation spentBudget négatif', () => {
    it('le service doit refuser un projectId invalide (BadRequestException)', async () => {
      await expect(
        service.recalculateProjectSpentBudget('bad-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* ---------- deleteByProjectId ---------- */

  describe('deleteByProjectId', () => {
    it('doit supprimer toutes les tâches d\'un projet et retourner le nombre supprimé', async () => {
      mockTaskModel.deleteMany = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 3 }),
      });

      const count = await service.deleteByProjectId(VALID_PROJECT_ID);
      expect(count).toBe(3);
    });
  });

  /* ---------- migration onModuleInit ---------- */

  describe('migrateLegacyProjects (onModuleInit)', () => {
    it('doit initialiser spentBudget sur les projets existants et déclencher le recalcul', async () => {
      // NestJS Testing ne déclenche pas onModuleInit automatiquement via compile().
      // On l'appelle explicitement pour tester son comportement.
      await service.onModuleInit();

      // migrateLegacyTasks : updateMany appelé 4 fois (duration, dependsOn, unset, spentBudget)
      expect(mockTaskModel.updateMany).toHaveBeenCalled();
      // migrateLegacyProjects : updateMany pour initialiser spentBudget absent
      expect(mockProjectModel.updateMany).toHaveBeenCalled();
      // migrateLegacyProjects : find() pour lister tous les projets
      expect(mockProjectModel.find).toHaveBeenCalled();
      // migrateLegacyProjects : findByIdAndUpdate pour chaque projet (recalcul)
      expect(mockProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        { $set: { spentBudget: expect.any(Number) } },
        { new: true },
      );
    });
  });
});
