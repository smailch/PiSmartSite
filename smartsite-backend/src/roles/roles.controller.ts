import { Controller, Post, Get, Body } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {

  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(@Body() body: any) {
    return this.rolesService.create(body);
  }

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
}