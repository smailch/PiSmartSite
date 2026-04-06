import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getModelToken } from '@nestjs/mongoose';
import { Project } from './schemas/project.schema';
import { TasksService } from '../tasks/tasks.service';
import { NotFoundException } from '@nestjs/common';

const mockProjectDoc = (overrides = {}) => ({
  _id: 'project-id-1',
  name: 'Projet test',
  description: 'Description',
  startDate: null,
  endDate: null,
  status: 'En cours',
  type: 'Construction',
  budget: 10000,
  spentBudget: 0,
  location: 'Alger',
  createdBy: 'user-id-1',
  createdAt: new Date(),
  toObject: () => ({ ...mockProjectDoc(overrides) }),
  ...overrides,
});

const mockProjectModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const mockTasksService = {
  markAllTasksCompletedForProject: jest.fn().mockResolvedValue(0),
  deleteByProjectId: jest.fn().mockResolvedValue(0),
  recalculateProjectSpentBudget: jest.fn().mockResolvedValue(0),
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getModelToken(Project.name),
          useValue: mockProjectModel,
        },
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of projects with startDate/endDate normalised', async () => {
      const doc = {
        ...mockProjectDoc(),
        startDate: null,
        endDate: null,
        toObject: () => ({ ...mockProjectDoc(), startDate: null, endDate: null }),
      };
      mockProjectModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([doc]) });

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].startDate).toBeNull();
      expect(result[0].endDate).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return the project when it exists', async () => {
      const doc = mockProjectDoc();
      mockProjectModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

      const result = await service.findOne('aaaaaaaaaaaaaaaaaaaaaaaa');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findOne('aaaaaaaaaaaaaaaaaaaaaaaa')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      await expect(service.findOne('invalid-id')).rejects.toThrow();
    });
  });

  describe('update — spentBudget', () => {
    it('doit utiliser $set explicite pour ne pas écraser spentBudget', async () => {
      const doc = mockProjectDoc({ status: 'En cours', spentBudget: 5000 });
      mockProjectModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.update('aaaaaaaaaaaaaaaaaaaaaaaa', { name: 'Nouveau nom' });

      expect(mockProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'aaaaaaaaaaaaaaaaaaaaaaaa',
        { $set: { name: 'Nouveau nom' } },
        { new: true },
      );
    });

    it('should call markAllTasksCompletedForProject when status becomes Terminé', async () => {
      const doc = mockProjectDoc({ status: 'Terminé' });
      mockProjectModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.update('aaaaaaaaaaaaaaaaaaaaaaaa', { status: 'Terminé' });

      expect(mockTasksService.markAllTasksCompletedForProject).toHaveBeenCalledWith(
        'aaaaaaaaaaaaaaaaaaaaaaaa',
      );
    });

    it('should NOT call markAllTasksCompletedForProject for other status', async () => {
      const doc = mockProjectDoc({ status: 'En cours' });
      mockProjectModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.update('aaaaaaaaaaaaaaaaaaaaaaaa', { status: 'En cours' });

      expect(mockTasksService.markAllTasksCompletedForProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent project', async () => {
      mockProjectModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('aaaaaaaaaaaaaaaaaaaaaaaa', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete project and cascade-delete tasks', async () => {
      const doc = mockProjectDoc();
      mockProjectModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      mockProjectModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.remove('aaaaaaaaaaaaaaaaaaaaaaaa');

      expect(mockTasksService.deleteByProjectId).toHaveBeenCalledWith('aaaaaaaaaaaaaaaaaaaaaaaa');
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.remove('aaaaaaaaaaaaaaaaaaaaaaaa')).rejects.toThrow(NotFoundException);
    });
  });
});
