import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { Product } from '../products/product.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  private async generatePurchaseNumber(): Promise<string> {
    const count = await this.purchaseRepository.count();
    const nextNumber = count + 1;
    return `COM-${String(nextNumber).padStart(4, '0')}`;
  }

  async findAll(params?: { search?: string }): Promise<Purchase[]> {
    const query = this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .orderBy('purchase.createdAt', 'DESC');

    if (params?.search && params.search.trim()) {
      const search = `%${params.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(purchase.purchaseNumber) LIKE :search OR LOWER(purchase.supplierName) LIKE :search OR LOWER(COALESCE(purchase.documentNumber, \'\')) LIKE :search)',
        { search },
      );
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Purchase> {
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: {
        items: {
          product: true,
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Compra con ID "${id}" no encontrada.`);
    }

    return purchase;
  }

  async create(dto: CreatePurchaseDto): Promise<Purchase> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const purchaseNumber = await this.generatePurchaseNumber();
      let totalAmount = 0;
      const purchaseItems: PurchaseItem[] = [];

      for (const itemDto of dto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: itemDto.productId },
        });

        if (!product) {
          throw new BadRequestException(
            `El producto con ID "${itemDto.productId}" no existe.`,
          );
        }

        const quantity = Number(itemDto.quantity);
        const costPrice = Number(itemDto.costPrice);
        const subtotal = Math.round(quantity * costPrice * 100) / 100;
        totalAmount += subtotal;

        // Aumentar stock del producto de forma atómica y actualizar último costo de compra
        product.stock = Number(product.stock || 0) + quantity;
        product.costPrice = costPrice;

        // Actualizar precio de venta en catálogo si se especificó
        if (
          itemDto.newSalePrice !== undefined &&
          itemDto.newSalePrice !== null &&
          Number(itemDto.newSalePrice) > 0
        ) {
          product.price = Number(itemDto.newSalePrice);
        }

        await queryRunner.manager.save(product);

        const item = queryRunner.manager.create(PurchaseItem, {
          productId: product.id,
          quantity,
          costPrice,
          subtotal,
        });
        purchaseItems.push(item);
      }

      totalAmount = Math.round(totalAmount * 100) / 100;

      const purchase = queryRunner.manager.create(Purchase, {
        purchaseNumber,
        supplierName: dto.supplierName.trim(),
        documentType: dto.documentType?.trim() || null,
        documentNumber: dto.documentNumber?.trim() || null,
        notes: dto.notes?.trim() || null,
        totalAmount,
        items: purchaseItems,
      });

      const savedPurchase = await queryRunner.manager.save(purchase);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Compra ${purchaseNumber} registrada con éxito. Total: S/ ${totalAmount}`,
      );

      return await this.findOne(savedPurchase.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al registrar compra: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const purchase = await this.findOne(id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Revertir el stock ingresado por la compra
      for (const item of purchase.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });
        if (product) {
          product.stock = Math.max(0, Number(product.stock || 0) - item.quantity);
          await queryRunner.manager.save(product);
        }
      }

      await queryRunner.manager.remove(purchase);
      await queryRunner.commitTransaction();

      this.logger.log(`Compra ${purchase.purchaseNumber} eliminada y stock revertido.`);
      return {
        success: true,
        message: `La compra ${purchase.purchaseNumber} ha sido eliminada y el stock fue actualizado.`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
