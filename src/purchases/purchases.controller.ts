import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { Purchase } from './entities/purchase.entity';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  async getAllPurchases(
    @Query('search') search?: string,
  ): Promise<Purchase[]> {
    return await this.purchasesService.findAll({ search });
  }

  @Get(':id')
  async getPurchaseById(@Param('id') id: string): Promise<Purchase> {
    return await this.purchasesService.findOne(id);
  }

  @Post()
  async createPurchase(@Body() dto: CreatePurchaseDto): Promise<Purchase> {
    return await this.purchasesService.create(dto);
  }

  @Delete(':id')
  async deletePurchase(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return await this.purchasesService.remove(id);
  }
}
