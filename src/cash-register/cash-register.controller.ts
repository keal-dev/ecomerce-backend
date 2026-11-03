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

@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get('current')
  getCurrentSession() {
    return this.cashRegisterService.getCurrentSession();
  }

  @Post('open')
  openSession(@Body() dto: OpenCashSessionDto) {
    return this.cashRegisterService.openSession(dto);
  }

  @Post(':id/close')
  closeSession(
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
  ) {
    return this.cashRegisterService.closeSession(id, dto);
  }

  @Get('history')
  getSessionHistory() {
    return this.cashRegisterService.getSessionHistory();
  }
}
