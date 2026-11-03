import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async onModuleInit() {
    try {
      // Sincronizar el último precio de compra para productos que no tengan cost_price asignado todavía
      await this.productRepository.query(`
        UPDATE products p
        SET cost_price = sub.cost_price
        FROM (
          SELECT DISTINCT ON (pi.product_id) pi.product_id, pi.cost_price
          FROM purchase_items pi
          JOIN purchases pur ON pur.id = pi.purchase_id
          ORDER BY pi.product_id, pur.created_at DESC
        ) sub
        WHERE p.id = sub.product_id AND (p.cost_price IS NULL OR p.cost_price = 0);
      `);
      this.logger.log('Sincronización de cost_price de productos completada.');
    } catch (err) {
      this.logger.warn(`No se pudo sincronizar cost_price inicial: ${err}`);
    }
  }

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

  async findAll(params?: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    isActive?: boolean;
  }): Promise<Product[]> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .orderBy('product.createdAt', 'DESC');

    if (params?.categoryId) {
      query.andWhere('product.categoryId = :categoryId', {
        categoryId: params.categoryId,
      });
    }

    if (params?.brandId) {
      query.andWhere('product.brandId = :brandId', {
        brandId: params.brandId,
      });
    }

    if (typeof params?.isActive === 'boolean') {
      query.andWhere('product.isActive = :isActive', {
        isActive: params.isActive,
      });
    }

    if (params?.search && params.search.trim()) {
      const search = `%${params.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(product.title) LIKE :search OR LOWER(product.slug) LIKE :search OR LOWER(COALESCE(product.sku, \'\')) LIKE :search)',
        { search },
      );
    }

    return await query.getMany();
  }

  async findOne(idOrSlug: string): Promise<Product> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    let product: Product | null = null;
    if (isUuid) {
      product = await this.productRepository.findOne({
        where: { id: idOrSlug },
        relations: { category: true, brand: true },
      });
    } else {
      product = await this.productRepository.findOne({
        where: { slug: idOrSlug },
        relations: { category: true, brand: true },
      });
    }

    if (!product) {
      throw new NotFoundException(`Producto "${idOrSlug}" no encontrado.`);
    }

    return product;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    if (!slug) return null;
    return await this.productRepository.findOne({
      where: { slug },
      relations: { category: true, brand: true },
    });
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const title = dto.title.trim();
    let baseSlug = dto.slug?.trim() ? this.slugify(dto.slug) : this.slugify(title);

    // Asegurar unicidad del slug
    let finalSlug = baseSlug;
    let counter = 1;
    while (await this.productRepository.findOne({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Calcular descuento si se especifica precio original mayor al precio venta
    let discount = dto.discount;
    if (
      discount === undefined &&
      dto.originalPrice &&
      dto.originalPrice > dto.price
    ) {
      discount = Math.round(
        ((dto.originalPrice - dto.price) / dto.originalPrice) * 100,
      );
    }

    // Resolver lista de imágenes y foto de portada
    const images = Array.isArray(dto.images) && dto.images.length > 0
      ? dto.images.map((img) => img.trim()).filter(Boolean)
      : dto.imageUrl?.trim()
      ? [dto.imageUrl.trim()]
      : [];
    const primaryImageUrl = images[0] || dto.imageUrl?.trim() || '';

    const product = this.productRepository.create({
      title,
      slug: finalSlug,
      sku: dto.sku?.trim() || null,
      price: Number(dto.price),
      costPrice: dto.costPrice !== undefined && dto.costPrice !== null ? Number(dto.costPrice) : null,
      originalPrice: dto.originalPrice ? Number(dto.originalPrice) : null,
      discount: discount ?? null,
      stock: dto.stock !== undefined ? Number(dto.stock) : 0,
      imageUrl: primaryImageUrl,
      images,
      description: dto.description?.trim() || null,
      features: Array.isArray(dto.features)
        ? dto.features.map((f) => f.trim()).filter(Boolean)
        : [],
      freeShipping: dto.freeShipping ?? false,
      full: dto.full ?? false,
      categoryId: dto.categoryId || null,
      brandId: dto.brandId || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    this.logger.log(`Creando nuevo producto: ${title} (${finalSlug})`);
    const saved = await this.productRepository.save(product);
    return await this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (dto.title && dto.title.trim() !== product.title) {
      product.title = dto.title.trim();
      if (!dto.slug) {
        let baseSlug = this.slugify(product.title);
        let finalSlug = baseSlug;
        let counter = 1;
        while (
          await this.productRepository.findOne({
            where: { slug: finalSlug },
          })
        ) {
          const found = await this.productRepository.findOne({
            where: { slug: finalSlug },
          });
          if (found && found.id === id) break;
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }
        product.slug = finalSlug;
      }
    }

    if (dto.slug && dto.slug.trim()) {
      const newSlug = this.slugify(dto.slug);
      const existing = await this.productRepository.findOne({
        where: { slug: newSlug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`El slug "${newSlug}" ya está en uso.`);
      }
      product.slug = newSlug;
    }

    if (dto.sku !== undefined) product.sku = dto.sku ? dto.sku.trim() : null;
    if (dto.price !== undefined) product.price = Number(dto.price);
    if (dto.costPrice !== undefined)
      product.costPrice = dto.costPrice !== null ? Number(dto.costPrice) : null;
    if (dto.originalPrice !== undefined)
      product.originalPrice = dto.originalPrice ? Number(dto.originalPrice) : null;
    if (dto.discount !== undefined) product.discount = dto.discount;
    if (dto.stock !== undefined) product.stock = Number(dto.stock);

    if (dto.images !== undefined) {
      const oldImages = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.imageUrl
        ? [product.imageUrl]
        : [];
      const newImages = Array.isArray(dto.images) ? dto.images : [];

      // Identificar y eliminar de Cloudinary las fotos que fueron quitadas
      const removedImages = oldImages.filter((img) => img && !newImages.includes(img));
      for (const removedUrl of removedImages) {
        this.logger.log(`Eliminando imagen quitada de Cloudinary: ${removedUrl}`);
        await this.cloudinaryService.deleteImageByUrl(removedUrl);
      }

      product.images = newImages.map((img) => img.trim()).filter(Boolean);
      if (product.images.length > 0 && !dto.imageUrl) {
        product.imageUrl = product.images[0];
      }
    }

    if (dto.imageUrl !== undefined) {
      product.imageUrl = dto.imageUrl.trim();
      if (!product.images || product.images.length === 0) {
        product.images = [product.imageUrl];
      }
    }
    if (dto.description !== undefined)
      product.description = dto.description ? dto.description.trim() : null;
    if (dto.features !== undefined) {
      product.features = Array.isArray(dto.features)
        ? dto.features.map((f) => f.trim()).filter(Boolean)
        : [];
    }
    if (dto.freeShipping !== undefined) product.freeShipping = dto.freeShipping;
    if (dto.full !== undefined) product.full = dto.full;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId || null;
    if (dto.brandId !== undefined) product.brandId = dto.brandId || null;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    this.logger.log(`Actualizando producto: ${product.title} (${product.id})`);
    await this.productRepository.save(product);
    return await this.findOne(product.id);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const product = await this.findOne(id);

    // Eliminar todas las imágenes asociadas en Cloudinary
    const imagesToDelete = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.imageUrl
      ? [product.imageUrl]
      : [];

    for (const imgUrl of imagesToDelete) {
      if (imgUrl) {
        this.logger.log(`Eliminando foto de Cloudinary al borrar producto: ${imgUrl}`);
        await this.cloudinaryService.deleteImageByUrl(imgUrl);
      }
    }

    await this.productRepository.remove(product);
    this.logger.log(`Producto eliminado: ${product.title} (${id})`);
    return {
      success: true,
      message: `El producto "${product.title}" ha sido eliminado exitosamente.`,
    };
  }
}
