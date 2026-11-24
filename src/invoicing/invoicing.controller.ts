import { Controller, Post, Param } from '@nestjs/common';
import { InvoicingService } from './invoicing.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('invoicing')
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SELLER)
  @Post('orders/:orderId/emit')
  async emitInvoice(@Param('orderId') orderId: string) {
    return this.invoicingService.emitInvoiceForOrder(orderId);
  }
}

