import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { Job, JobDocument } from '../jobs/jobs.schema';
import { Human, HumanDocument } from '../human-resources/schemas/human.schema';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Human.name) private humanModel: Model<HumanDocument>,
  ) {}

  async create(dto: CreateAttendanceDto): Promise<Attendance> {
    const job = await this.jobModel.findById(dto.jobId).exec();
    if (!job) throw new NotFoundException('Job not found');

    const human = await this.humanModel.findById(dto.resourceId).exec();
    if (!human) throw new NotFoundException('Travailleur introuvable');

    const onJob = (job.assignedResources ?? []).some(
      (ar) =>
        ar.type === 'Human' &&
        String(ar.resourceId) === String(dto.resourceId),
    );
    if (!onJob) {
      throw new BadRequestException(
        'Ce travailleur n’est pas assigné à ce job',
      );
    }

    const day = new Date(dto.date);
    day.setUTCHours(0, 0, 0, 0);

    try {
      return await this.attendanceModel.create({
        jobId: new Types.ObjectId(dto.jobId),
        resourceId: new Types.ObjectId(dto.resourceId),
        date: day,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        status: dto.status ?? 'present',
      });
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err?.code === 11000) {
        throw new BadRequestException(
          'Attendance already exists for this job, worker and date',
        );
      }
      throw e;
    }
  }

  async findByJob(jobId: string): Promise<Attendance[]> {
    const exists = await this.jobModel.exists({ _id: jobId });
    if (!exists) throw new NotFoundException('Job not found');

    return this.attendanceModel
      .find({ jobId: new Types.ObjectId(jobId) })
      .populate('resourceId')
      .sort({ date: -1 })
      .exec();
  }

  async findByResource(resourceId: string): Promise<Attendance[]> {
    const human = await this.humanModel.findById(resourceId).exec();
    if (!human) throw new NotFoundException('Travailleur introuvable');

    return this.attendanceModel
      .find({ resourceId: new Types.ObjectId(resourceId) })
      .populate('jobId')
      .sort({ date: -1 })
      .exec();
  }
}
