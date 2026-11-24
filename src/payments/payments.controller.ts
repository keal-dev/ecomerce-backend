import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('culqi/charge')
  @HttpCode(HttpStatus.OK)
  async processCulqiCharge(@Body() dto: CreateChargeDto) {
    return this.paymentsService.processCulqiCharge(dto);
  }
}

