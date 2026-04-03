import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HumanResourcesService } from './human-resources.service';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';

@Controller('humans')
export class HumanResourcesController {
  constructor(private readonly humanService: HumanResourcesService) {}

  @Post()
  create(@Body() createHumanDto: CreateHumanDto) {
    return this.humanService.create(createHumanDto);
  }

  @Get()
  findAll() {
    return this.humanService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.humanService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHumanDto: UpdateHumanDto) {
    return this.humanService.update(id, updateHumanDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.humanService.remove(id);
  }
}