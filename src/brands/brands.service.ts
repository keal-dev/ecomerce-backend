import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll(params?: { search?: string; isActive?: boolean }): Promise<Brand[]> {
    const query = this.brandRepository.createQueryBuilder('brand').orderBy('brand.name', 'ASC');

    if (typeof params?.isActive === 'boolean') {
      query.andWhere('brand.isActive = :isActive', { isActive: params.isActive });
    }

    if (params?.search && params.search.trim()) {
      const search = `%${params.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(brand.name) LIKE :search OR LOWER(brand.slug) LIKE :search OR LOWER(COALESCE(brand.description, \'\')) LIKE :search)',
        { search },
      );
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Marca con ID ${id} no encontrada.`);
    }
    return brand;
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    if (!slug) return null;
    return await this.brandRepository.findOne({ where: { slug } });
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    const name = dto.name.trim();
    const slug = dto.slug?.trim() ? this.slugify(dto.slug) : this.slugify(name);

    // Verificar si ya existe marca con mismo nombre o slug
    const existing = await this.brandRepository.findOne({
      where: [{ name }, { slug }],
    });

    if (existing) {
      throw new ConflictException(
        existing.name.toLowerCase() === name.toLowerCase()
          ? `Ya existe una marca con el nombre "${name}".`
          : `El slug "${slug}" ya está en uso por otra marca.`,
      );
    }

    const brand = this.brandRepository.create({
      name,
      slug,
      logoUrl: dto.logoUrl?.trim() || null,
      description: dto.description?.trim() || null,
      website: dto.website?.trim() || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    this.logger.log(`Creando nueva marca: ${name} (${slug})`);
    return await this.brandRepository.save(brand);
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findOne(id);

    if (dto.name && dto.name.trim() !== brand.name) {
      const newName = dto.name.trim();
      const existingName = await this.brandRepository.findOne({
        where: { name: newName },
      });
      if (existingName && existingName.id !== id) {
        throw new ConflictException(`Ya existe una marca con el nombre "${newName}".`);
      }
      brand.name = newName;

      // Si no proporcionó slug explícito, actualizar según nuevo nombre
      if (!dto.slug) {
        const newSlug = this.slugify(newName);
        const existingSlug = await this.brandRepository.findOne({
          where: { slug: newSlug },
        });
        if (existingSlug && existingSlug.id !== id) {
          throw new ConflictException(`El slug autogenerado "${newSlug}" ya está en uso.`);
        }
        brand.slug = newSlug;
      }
    }

    if (dto.slug && dto.slug.trim()) {
      const newSlug = this.slugify(dto.slug);
      if (newSlug !== brand.slug) {
        const existingSlug = await this.brandRepository.findOne({
          where: { slug: newSlug },
        });
        if (existingSlug && existingSlug.id !== id) {
          throw new ConflictException(`El slug "${newSlug}" ya está en uso.`);
        }
        brand.slug = newSlug;
      }
    }

    if (dto.logoUrl !== undefined) {
      brand.logoUrl = dto.logoUrl ? dto.logoUrl.trim() : null;
    }

    if (dto.description !== undefined) {
      brand.description = dto.description ? dto.description.trim() : null;
    }

    if (dto.website !== undefined) {
      brand.website = dto.website ? dto.website.trim() : null;
    }

    if (dto.isActive !== undefined) {
      brand.isActive = dto.isActive;
    }

    this.logger.log(`Actualizando marca: ${brand.name} (${brand.id})`);
    return await this.brandRepository.save(brand);
  }

  async toggleActive(id: string): Promise<Brand> {
    const brand = await this.findOne(id);
    brand.isActive = !brand.isActive;
    return await this.brandRepository.save(brand);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const brand = await this.findOne(id);
    await this.brandRepository.remove(brand);
    this.logger.log(`Marca eliminada: ${brand.name} (${id})`);
    return {
      success: true,
      message: `La marca "${brand.name}" ha sido eliminada exitosamente.`,
    };
  }
}
