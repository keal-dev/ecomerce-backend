import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseInterceptors, 
  UploadedFile 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Get()
  async getAllCategories(): Promise<Category[]> {
    return await this.categoriesService.findAll();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCategoryImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file, 'ecomerce/categories');
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  @Public()
  @Get(':id')
  async getCategoryById(@Param('id') id: string): Promise<Category | null> {
    return await this.categoriesService.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  async createCategory(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return await this.categoriesService.create(createCategoryDto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return await this.categoriesService.update(id, updateCategoryDto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  async deleteCategory(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return await this.categoriesService.remove(id);
  }
}
