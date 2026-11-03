import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Category | null> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoría con id ${id} no encontrada`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.href || `/category/${dto.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}`;
    const newCategory = this.categoryRepository.create({
      ...dto,
      href: slug,
    });
    return await this.categoryRepository.save(newCategory);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    if (!category) {
      throw new NotFoundException(`Categoría con id ${id} no encontrada`);
    }
    
    if (dto.name && !dto.href) {
      dto.href = `/category/${dto.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}`;
    }

    Object.assign(category, dto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const category = await this.findOne(id);
    if (!category) {
      throw new NotFoundException(`Categoría con id ${id} no encontrada`);
    }
    await this.categoryRepository.delete(id);
    return { success: true, message: 'Categoría eliminada físicamente de forma exitosa' };
  }
}
