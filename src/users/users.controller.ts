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
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
import { UsersService } from './users.service';
import { SyncUserDto } from './dto/sync-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClerkUserId, CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('sync')
  async syncUser(
    @ClerkUserId() clerkUserId: string | null,
    @Body() syncUserDto: SyncUserDto,
  ) {
    if (!clerkUserId) {
      throw new UnauthorizedException('Token de autenticación requerido.');
    }

    const secretKey =
      this.configService.get<string>('CLERK_SECRET_KEY') ||
      process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      throw new InternalServerErrorException(
        'CLERK_SECRET_KEY no configurado en el servidor.',
      );
    }

    const clerkClient = createClerkClient({ secretKey });
    const clerkUser = await clerkClient.users.getUser(clerkUserId);

    const primaryEmail =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new BadRequestException(
        'Tu cuenta de Clerk no tiene un correo electrónico verificado.',
      );
    }

    return await this.usersService.syncUser({
      clerkId: clerkUserId,
      email: primaryEmail,
      firstName: clerkUser.firstName ?? syncUserDto.firstName,
      lastName: clerkUser.lastName ?? syncUserDto.lastName,
      imageUrl: clerkUser.imageUrl ?? syncUserDto.imageUrl,
    });
  }

  @Get('me')
  async getMe(@CurrentUser() user: User | null) {
    return user;
  }

  @Roles(UserRole.SUPER_ADMIN)
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

  @Roles(UserRole.SUPER_ADMIN)
  @Get(':identifier')
  async getUserByIdOrClerk(@Param('identifier') identifier: string) {
    if (identifier.startsWith('user_')) {
      return await this.usersService.findByClerkId(identifier);
    }
    const user = await this.usersService.findOne(identifier);
    if (user) return user;
    return await this.usersService.findByClerkId(identifier);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id/toggle-active')
  async toggleUserActive(@Param('id') id: string) {
    return await this.usersService.toggleActive(id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }
}
