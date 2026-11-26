import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/entities/user.entity';
import { ResetDatabaseDto } from './dto/reset-database.dto';
import { SystemService } from './system.service';

@Controller('system')
@Roles(UserRole.SUPER_ADMIN)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('database-stats')
  @Roles(UserRole.SUPER_ADMIN)
  async getDatabaseStats() {
    return await this.systemService.getDatabaseStats();
  }

  @Post('reset-database')
  @Roles(UserRole.SUPER_ADMIN)
  async resetDatabase(
    @Body() dto: ResetDatabaseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.systemService.resetDatabase(dto, req.dbUser!);
  }
}
