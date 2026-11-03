import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

export const TOTAL_HERO_SLOTS = 15;

@Injectable()
export class BannersService {
  private readonly logger = new Logger(BannersService.name);

  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
  ) {}

  /**
   * Obtiene los 15 slots fijos para el carrusel (inicializándolos si no existen)
   */
  async getHeroSlots(): Promise<Banner[]> {
    const existing = await this.bannerRepository.find({
      where: { type: 'hero' },
      order: { order: 'ASC' },
    });

    const existingMap = new Map<number, Banner>();
    for (const b of existing) {
      existingMap.set(b.order, b);
    }

    const toCreate: Banner[] = [];
    for (let i = 1; i <= TOTAL_HERO_SLOTS; i++) {
      if (!existingMap.has(i)) {
        const slot = this.bannerRepository.create({
          title: `Banner ${i}`,
          imageUrl: null,
          linkUrl: null,
          type: 'hero',
          order: i,
          isActive: false, // inactivo hasta que se suba foto
        });
        toCreate.push(slot);
      }
    }

    if (toCreate.length > 0) {
      this.logger.log(`Inicializando ${toCreate.length} slots de banners hero en la base de datos...`);
      const saved = await this.bannerRepository.save(toCreate);
      for (const s of saved) {
        existingMap.set(s.order, s);
      }
    }

    return Array.from({ length: TOTAL_HERO_SLOTS }, (_, idx) => {
      const order = idx + 1;
      return existingMap.get(order)!;
    });
  }

  /**
   * Obtiene los banners activos con imagen para la tienda
   */
  async findActiveBanners(type = 'hero'): Promise<Banner[]> {
    return await this.bannerRepository
      .createQueryBuilder('banner')
      .where('banner.type = :type', { type })
      .andWhere('banner.isActive = :isActive', { isActive: true })
      .andWhere('banner.imageUrl IS NOT NULL')
      .andWhere("banner.imageUrl != ''")
      .orderBy('banner.order', 'ASC')
      .getMany();
  }

  async findAll(params?: { type?: string; isActive?: boolean }): Promise<Banner[]> {
    const query = this.bannerRepository
      .createQueryBuilder('banner')
      .orderBy('banner.order', 'ASC');

    if (params?.type && params.type.trim()) {
      query.andWhere('banner.type = :type', { type: params.type.trim() });
    }

    if (typeof params?.isActive === 'boolean') {
      query.andWhere('banner.isActive = :isActive', { isActive: params.isActive });
      if (params.isActive) {
        query.andWhere('banner.imageUrl IS NOT NULL');
      }
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner con ID ${id} no encontrado.`);
    }
    return banner;
  }

  async findByOrder(order: number, type = 'hero'): Promise<Banner> {
    let banner = await this.bannerRepository.findOne({
      where: { order, type },
    });
    if (!banner) {
      banner = this.bannerRepository.create({
        title: `Banner ${order}`,
        imageUrl: null,
        linkUrl: null,
        type,
        order,
        isActive: false,
      });
      banner = await this.bannerRepository.save(banner);
    }
    return banner;
  }

  async updateSlot(order: number, dto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.findByOrder(order, dto.type || 'hero');

    if (dto.title !== undefined) {
      banner.title = dto.title.trim();
    }

    if (dto.imageUrl !== undefined) {
      banner.imageUrl = dto.imageUrl ? dto.imageUrl.trim() : null;
    }

    if (dto.linkUrl !== undefined) {
      banner.linkUrl = dto.linkUrl ? dto.linkUrl.trim() : null;
    }

    if (dto.isActive !== undefined) {
      banner.isActive = dto.isActive;
    }

    this.logger.log(`Actualizando slot #${order}: ${banner.title} (Activo: ${banner.isActive})`);
    return await this.bannerRepository.save(banner);
  }

  async toggleSlot(order: number, type = 'hero'): Promise<Banner> {
    const banner = await this.findByOrder(order, type);
    banner.isActive = !banner.isActive;
    return await this.bannerRepository.save(banner);
  }

  async clearSlot(order: number, type = 'hero'): Promise<Banner> {
    const banner = await this.findByOrder(order, type);
    banner.imageUrl = null;
    banner.linkUrl = null;
    banner.isActive = false;
    this.logger.log(`Limpiando slot #${order}`);
    return await this.bannerRepository.save(banner);
  }

  async create(dto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannerRepository.create({
      title: dto.title.trim(),
      imageUrl: dto.imageUrl.trim(),
      linkUrl: dto.linkUrl ? dto.linkUrl.trim() : null,
      type: dto.type ? dto.type.trim() : 'hero',
      order: dto.order ?? 1,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return await this.bannerRepository.save(banner);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.findOne(id);
    if (dto.title !== undefined) banner.title = dto.title.trim();
    if (dto.imageUrl !== undefined) banner.imageUrl = dto.imageUrl ? dto.imageUrl.trim() : null;
    if (dto.linkUrl !== undefined) banner.linkUrl = dto.linkUrl ? dto.linkUrl.trim() : null;
    if (dto.order !== undefined) banner.order = dto.order;
    if (dto.isActive !== undefined) banner.isActive = dto.isActive;
    return await this.bannerRepository.save(banner);
  }

  async toggleActive(id: string): Promise<Banner> {
    const banner = await this.findOne(id);
    banner.isActive = !banner.isActive;
    return await this.bannerRepository.save(banner);
  }

  async reorderBanners(items: { id: string; order: number }[]): Promise<Banner[]> {
    for (const item of items) {
      await this.bannerRepository.update(item.id, { order: item.order });
    }
    return await this.getHeroSlots();
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const banner = await this.findOne(id);
    await this.bannerRepository.remove(banner);
    return {
      success: true,
      message: `El banner "${banner.title}" ha sido eliminado.`,
    };
  }
}
