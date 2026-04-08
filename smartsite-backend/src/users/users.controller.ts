import { AuthService } from './../auth/auth.service';
import { Controller, Get, Post, Body, Param, Put, Delete, NotFoundException } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-users.dto';
import { UsersService } from '../users/users.service';


@Controller('users')
export class UsersController {

 constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post('register')
register(@Body() body: CreateUserDto) {
  return this.usersService.create(body);
}

  @UseGuards(JwtAuthGuard)
@Get('auth')
findAllAuth() {
  return this.usersService.findAll();
}
@Post('forgot-password')
async forgotPassword(@Body('email') email: string) {
  try {
    return await this.usersService.forgotPassword(email);
  }  catch (err: unknown) {
  if (err instanceof Error && err.message === 'EMAIL_NOT_FOUND') {
    throw new NotFoundException('Ce mail n\'est pas valide');
  }
  throw err;
}
}
@Post('reset-password')
resetPassword(
  @Body('token') token: string,
  @Body('password') password: string,
) {
  return this.usersService.resetPassword(token, password);
}


}