import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Banner } from './banner.entity';

@Controller('banners')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Obtiene los 15 slots fijos para el panel de administración
   */
  @Get('slots')
  async getSlots(): Promise<Banner[]> {
    return await this.bannersService.getHeroSlots();
  }

  /**
   * Actualiza el contenido (foto, link, estado) de un slot específico (1 al 15)
   */
  @Put('slots/:order')
  async updateSlot(
    @Param('order', ParseIntPipe) order: number,
    @Body() dto: UpdateBannerDto,
  ): Promise<Banner> {
    return await this.bannersService.updateSlot(order, dto);
  }

  /**
   * Enciende o apaga el slot específico (1 al 15)
   */
  @Patch('slots/:order/toggle')
  async toggleSlot(@Param('order', ParseIntPipe) order: number): Promise<Banner> {
    return await this.bannersService.toggleSlot(order);
  }

  /**
   * Limpia / vacía la imagen y enlace de un slot (1 al 15)
   */
  @Delete('slots/:order/clear')
  async clearSlot(@Param('order', ParseIntPipe) order: number): Promise<Banner> {
    return await this.bannersService.clearSlot(order);
  }

  /**
   * Reordena los slots (ej. mediante Drag & Drop)
   */
  @Post('reorder')
  async reorderSlots(
    @Body() body: { items: { id: string; order: number }[] },
  ): Promise<Banner[]> {
    return await this.bannersService.reorderBanners(body.items);
  }

  /**
   * Subida de imagen a Cloudinary
   */
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBannerImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file, 'ecomerce/banners');
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  /**
   * Listado general (usado por el carrusel de la tienda para obtener solo activos con foto)
   */
  @Get()
  async getAllBanners(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ): Promise<Banner[]> {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return await this.bannersService.findAll({ type, isActive: isActiveBool });
  }

  @Get(':id')
  async getBannerById(@Param('id') id: string): Promise<Banner> {
    return await this.bannersService.findOne(id);
  }

  @Post()
  async createBanner(@Body() dto: CreateBannerDto): Promise<Banner> {
    return await this.bannersService.create(dto);
  }

  @Put(':id')
  async updateBanner(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ): Promise<Banner> {
    return await this.bannersService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string): Promise<Banner> {
    return await this.bannersService.toggleActive(id);
  }

  @Delete(':id')
  async deleteBanner(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return await this.bannersService.remove(id);
  }
}
