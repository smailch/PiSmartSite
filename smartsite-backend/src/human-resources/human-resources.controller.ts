import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Delete,
  Body,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HumanResourcesService } from './human-resources.service';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';
import { humanMulterOptions } from './multer-human.config';

function field(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (Array.isArray(v)) return String(v[0] ?? '');
  if (v === undefined || v === null) return '';
  return String(v);
}

function validationMessage(errs: import('class-validator').ValidationError[]): string {
  return errs
    .flatMap((e) => (e.constraints ? Object.values(e.constraints) : []))
    .join(' · ');
}

@Controller('humans')
export class HumanResourcesController {
  constructor(private readonly humanService: HumanResourcesService) {}

  private buildCreateDto(body: Record<string, unknown>): CreateHumanDto {
    const availabilityRaw = field(body, 'availability');
    const availability =
      availabilityRaw === ''
        ? true
        : availabilityRaw === 'true' || availabilityRaw === '1' || availabilityRaw === 'on';
    const cvUrl = field(body, 'cvUrl').trim();
    const imageUrl = field(body, 'imageUrl').trim();
    return {
      firstName: field(body, 'firstName').trim(),
      lastName: field(body, 'lastName').trim(),
      cin: field(body, 'cin').trim(),
      birthDate: field(body, 'birthDate'),
      phone: field(body, 'phone').trim(),
      role: field(body, 'role').trim(),
      cvUrl: cvUrl || undefined,
      imageUrl: imageUrl || undefined,
      availability,
    };
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cv', maxCount: 1 },
        { name: 'image', maxCount: 1 },
      ],
      humanMulterOptions,
    ),
  )
  async create(
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    files?: { cv?: Express.Multer.File[]; image?: Express.Multer.File[] },
  ) {
    const dto = this.buildCreateDto(body);
    if (files?.cv?.[0]) dto.cvUrl = `/uploads/humans/${files.cv[0].filename}`;
    if (files?.image?.[0]) dto.imageUrl = `/uploads/humans/${files.image[0].filename}`;

    const instance = plainToInstance(CreateHumanDto, dto);
    const errors = await validate(instance);
    if (errors.length) {
      throw new BadRequestException(validationMessage(errors));
    }
    return this.humanService.create(instance);
  }

  @Get()
  findAll(@Query('role') role?: string) {
    return this.humanService.findAll(role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.humanService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cv', maxCount: 1 },
        { name: 'image', maxCount: 1 },
      ],
      humanMulterOptions,
    ),
  )
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    files?: { cv?: Express.Multer.File[]; image?: Express.Multer.File[] },
  ) {
    const dto = this.buildCreateDto(body) as UpdateHumanDto;
    if (files?.cv?.[0]) dto.cvUrl = `/uploads/humans/${files.cv[0].filename}`;
    if (files?.image?.[0]) dto.imageUrl = `/uploads/humans/${files.image[0].filename}`;

    const instance = plainToInstance(UpdateHumanDto, dto);
    const errors = await validate(instance, { skipMissingProperties: true });
    if (errors.length) {
      throw new BadRequestException(validationMessage(errors));
    }
    return this.humanService.update(id, instance);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.humanService.remove(id);
  }
}
