import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CompanyModule } from './company/company.module';
import { UbigeoModule } from './ubigeo/ubigeo.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { BannersModule } from './banners/banners.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { OrdersModule } from './orders/orders.module';
import { InvoicingModule } from './invoicing/invoicing.module';
import { AuthModule } from './auth/auth.module';
import { ClaimsModule } from './claims/claims.module';
import { SystemModule } from './system/system.module';
import { DocumentLookupModule } from './document-lookup/document-lookup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    CloudinaryModule,
    CompanyModule,
    UbigeoModule,
    CashRegisterModule,
    BrandsModule,
    ProductsModule,
    BannersModule,
    PurchasesModule,
    SuppliersModule,
    PaymentsModule,
    MailModule,
    OrdersModule,
    InvoicingModule,
    ClaimsModule,
    SystemModule,
    DocumentLookupModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<number>('DB_PORT', 5432)),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'db_campeonato'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        invalidWhereValuesBehavior: {
          undefined: 'ignore',
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
