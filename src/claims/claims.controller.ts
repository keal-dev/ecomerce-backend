import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { RespondClaimDto } from './dto/respond-claim.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Public()
  @Post()
  async create(@Body() dto: CreateClaimDto) {
    return this.claimsService.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('claimType') claimType?: string,
    @Query('search') search?: string,
  ) {
    return this.claimsService.findAll({ status, claimType, search });
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.claimsService.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id/respond')
  async respond(
    @Param('id') id: string,
    @Body() dto: RespondClaimDto,
    @CurrentUser() user: User,
  ) {
    return this.claimsService.respond(id, dto, user.id);
  }
}
