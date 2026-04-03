import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobDocument } from './jobs.schema';
import { CreateJobDto } from './create-job.dto';
import { UpdateJobDto } from './update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
  ) {}

  // ✅ CREATE
  async create(createJobDto: CreateJobDto): Promise<Job> {
    const createdJob = new this.jobModel({
      ...createJobDto,
      taskId: new Types.ObjectId(createJobDto.taskId),
      assignedResources: createJobDto.assignedResources?.map((r) => ({
        resourceId: new Types.ObjectId(r.resourceId),
        type: r.type,
      })),
    });

    return createdJob.save();
  }

  // ✅ READ ALL
  async findAll(): Promise<Job[]> {
    return this.jobModel.find().exec();
  }

  // ✅ READ ONE
  async findOne(id: string): Promise<Job> {
    const job = await this.jobModel.findById(id).exec();
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  // ✅ UPDATE
  async update(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    const updated = await this.jobModel.findByIdAndUpdate(
      id,
      {
        ...updateJobDto,
        taskId: new Types.ObjectId(updateJobDto.taskId),
        assignedResources: updateJobDto.assignedResources?.map((r) => ({
          resourceId: new Types.ObjectId(r.resourceId),
          type: r.type,
        })),
      },
      { new: true },
    );

    if (!updated) throw new NotFoundException('Job not found');

    return updated;
  }

  // ✅ DELETE
  async remove(id: string): Promise<void> {
    const deleted = await this.jobModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Job not found');
  }
}
