import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Get()
  async getAllProducts(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<Product[]> {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return await this.productsService.findAll({
      search,
      categoryId,
      brandId,
      isActive: isActiveBool,
    });
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file, 'ecomerce/products');
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadProductImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se han proporcionado archivos para subir.');
    }
    const uploadPromises = files.map((file) =>
      this.cloudinaryService.uploadFile(file, 'ecomerce/products'),
    );
    const results = await Promise.all(uploadPromises);
    return results.map((r) => ({
      url: r.secure_url,
      publicId: r.public_id,
    }));
  }

  @Public()
  @Get(':id')
  async getProductById(@Param('id') id: string): Promise<Product> {
    return await this.productsService.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  async createProduct(@Body() dto: CreateProductDto): Promise<Product> {
    return await this.productsService.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: User,
  ): Promise<Product> {
    if (user.role === UserRole.ADMIN) {
      const allowedFields = new Set(['stock', 'costPrice']);
      const providedFields = Object.entries(dto)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => key);
      const hasDisallowed = providedFields.some(
        (key) => !allowedFields.has(key),
      );
      if (hasDisallowed) {
        throw new ForbiddenException(
          'Solo el Super Administrador puede modificar los datos del catálogo de productos.',
        );
      }
    }
    return await this.productsService.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return await this.productsService.remove(id);
  }
}
