import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SELLER)
  @Get('current')
  getCurrentSession() {
    return this.cashRegisterService.getCurrentSession();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('open')
  openSession(
    @Body() dto: OpenCashSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.cashRegisterService.openSession({
      ...dto,
      openedById: user.id,
    });
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post(':id/close')
  closeSession(
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.cashRegisterService.closeSession(id, {
      ...dto,
      closedById: user.id,
    });
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('history')
  getSessionHistory() {
    return this.cashRegisterService.getSessionHistory();
  }
}
