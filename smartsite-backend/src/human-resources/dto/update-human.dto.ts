import { PartialType } from '@nestjs/mapped-types';
import { CreateHumanDto } from './create-human.dto';

export class UpdateHumanDto extends PartialType(CreateHumanDto) {}
