import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MailModule } from '../mail/mail.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicingModule } from '../invoicing/invoicing.module';

@Module({
  imports: [MailModule, OrdersModule, InvoicingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

