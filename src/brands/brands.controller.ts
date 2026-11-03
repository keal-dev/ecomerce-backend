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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BrandsService } from './brands.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './brand.entity';

@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  async getAllBrands(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ): Promise<Brand[]> {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return await this.brandsService.findAll({ search, isActive: isActiveBool });
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBrandImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file, 'ecomerce/brands');
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  @Get(':id')
  async getBrandById(@Param('id') id: string): Promise<Brand> {
    return await this.brandsService.findOne(id);
  }

  @Post()
  async createBrand(@Body() dto: CreateBrandDto): Promise<Brand> {
    return await this.brandsService.create(dto);
  }

  @Put(':id')
  async updateBrand(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ): Promise<Brand> {
    return await this.brandsService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string): Promise<Brand> {
    return await this.brandsService.toggleActive(id);
  }

  @Delete(':id')
  async deleteBrand(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return await this.brandsService.remove(id);
  }
}
