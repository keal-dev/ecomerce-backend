import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @Query('environment') environment?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('email') email?: string,
    @Query('docNumber') docNumber?: string,
  ) {
    return this.ordersService.findAll({ environment, status, search, email, docNumber });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  async create(@Body() input: CreateOrderDto) {
    return this.ordersService.createOrder(input);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateStatus(id, status);
  }
}
