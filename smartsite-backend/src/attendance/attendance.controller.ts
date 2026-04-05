import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { Attendance } from './schemas/attendance.schema';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  async create(@Body() dto: CreateAttendanceDto): Promise<Attendance> {
    return this.attendanceService.create(dto);
  }

  @Get('job/:jobId')
  async listByJob(@Param('jobId') jobId: string): Promise<Attendance[]> {
    return this.attendanceService.findByJob(jobId);
  }

  @Get('resource/:id')
  async listByResource(@Param('id') id: string): Promise<Attendance[]> {
    return this.attendanceService.findByResource(id);
  }
}
