import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SyncUserDto } from './dto/sync-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('sync')
  async syncUser(@Body() syncUserDto: SyncUserDto) {
    return await this.usersService.syncUser(syncUserDto);
  }

  @Get()
  async getAllUsers(
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return await this.usersService.findAll({
      role,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':identifier')
  async getUserByIdOrClerk(@Param('identifier') identifier: string) {
    if (identifier.startsWith('user_')) {
      return await this.usersService.findByClerkId(identifier);
    }
    const user = await this.usersService.findOne(identifier);
    if (user) return user;
    return await this.usersService.findByClerkId(identifier);
  }

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  async toggleUserActive(@Param('id') id: string) {
    return await this.usersService.toggleActive(id);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }
}
