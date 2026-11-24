import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/product.entity';
import { CashRegisterService } from '../cash-register/cash-register.service';

const VALID_ORDER_STATUSES = [
  'pending',
  'paid',
  'preparing',
  'shipping',
  'delivered',
  'cancelled',
] as const;

export interface PricedOrderItem {
  productId: string;
  title: string;
  sku?: string;
  imageUrl?: string;
  quantity: number;
  price: number;
}

export interface CreateOrderInput {
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  docType?: string;
  docNumber: string;
  department: string;
  province: string;
  district: string;
  address: string;
  reference?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  currencySymbol?: string;
  paymentMethod: string;
  paymentStatus?: string;
  orderStatus?: string;
  culqiChargeId?: string;
  culqiReferenceCode?: string;
  invoiceType?: string;
  companyRuc?: string;
  companyLegalName?: string;
  notes?: string;
  items: {
    productId?: string;
    title: string;
    sku?: string;
    imageUrl?: string;
    quantity: number;
    price: number;
  }[];
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly configService: ConfigService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly dataSource: DataSource,
  ) {}

  async validateAndPriceItems(
    items: {
      productId?: string;
      id?: string;
      title?: string;
      sku?: string;
      imageUrl?: string;
      quantity: number;
      price?: number;
    }[],
    options: { applyOnlineShipping: boolean },
  ): Promise<{
    items: PricedOrderItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
  }> {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('El pedido debe contener al menos un producto.');
    }

    const qtyByProductId = new Map<string, number>();
    const normalizedInputs = items.map((it) => {
      const productId = (it.productId || it.id || '').trim();
      if (!productId) {
        throw new BadRequestException(
          `El producto "${it.title || 'desconocido'}" no tiene un identificador válido.`,
        );
      }
      const quantity = Number(it.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new BadRequestException(
          `La cantidad para el producto "${it.title || productId}" debe ser un entero mayor o igual a 1.`,
        );
      }
      qtyByProductId.set(productId, (qtyByProductId.get(productId) || 0) + quantity);
      return { productId, quantity, imageUrl: it.imageUrl };
    });

    const productIds = Array.from(qtyByProductId.keys());
    const products = await this.productRepository.find({
      where: { id: In(productIds) },
      loadEagerRelations: false,
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const [productId, requestedQty] of qtyByProductId.entries()) {
      const product = productMap.get(productId);
      if (!product || product.isActive === false) {
        throw new BadRequestException(
          `El producto con ID "${productId}" no existe o no está disponible.`,
        );
      }
      if (Number(product.stock) < requestedQty) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.title}" (disponible: ${product.stock}, solicitado: ${requestedQty}).`,
        );
      }
    }

    let subtotalSum = 0;
    const pricedItems: PricedOrderItem[] = normalizedInputs.map((it) => {
      const product = productMap.get(it.productId)!;
      const unitPrice = Number(product.price);
      subtotalSum += unitPrice * it.quantity;
      return {
        productId: product.id,
        title: product.title,
        sku: product.sku ?? undefined,
        imageUrl: product.imageUrl || it.imageUrl,
        quantity: it.quantity,
        price: unitPrice,
      };
    });

    const subtotal = Number(subtotalSum.toFixed(2));
    let shippingCost = 0;
    if (options.applyOnlineShipping) {
      const hasFreeShipping = products.some((p) => p.freeShipping === true);
      shippingCost = hasFreeShipping || subtotal >= 99 ? 0 : 10;
    }
    const total = Number((subtotal + shippingCost).toFixed(2));

    return { items: pricedItems, subtotal, shippingCost, total };
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('El pedido debe contener al menos un producto.');
    }

    const culqiEnv = (
      this.configService.get<string>('CULQI_ENV') ||
      process.env.CULQI_ENV ||
      'test'
    ).toLowerCase();

    const environment =
      culqiEnv === 'production' || culqiEnv === 'prod' || culqiEnv === 'live'
        ? 'production'
        : 'test';

    const year = new Date().getFullYear();
    const orderNumber =
      input.orderNumber ||
      input.culqiReferenceCode ||
      `ORD-${year}-${Math.floor(10000 + Math.random() * 90000)}`;

    this.logger.log(
      `[Orders] Creando nuevo pedido #${orderNumber} en entorno '${environment.toUpperCase()}'...`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        orderNumber,
        environment,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        docType: input.docType || 'DNI',
        docNumber: input.docNumber,
        department: input.department,
        province: input.province,
        district: input.district,
        address: input.address,
        reference: input.reference || null,
        subtotal: input.subtotal,
        shippingCost: input.shippingCost,
        total: input.total,
        currencySymbol: input.currencySymbol || 'S/',
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus || 'paid',
        orderStatus: input.orderStatus || 'pending',
        culqiChargeId: input.culqiChargeId || null,
        culqiReferenceCode: input.culqiReferenceCode || null,
        invoiceType: input.invoiceType || 'boleta',
        companyRuc: input.companyRuc || null,
        companyLegalName: input.companyLegalName || null,
        notes: input.notes || null,
        items: [],
      });

      const savedOrder = await queryRunner.manager.save(Order, order);
      const orderItems: OrderItem[] = [];

      for (const it of input.items) {
        const qty = Number(it.quantity);
        if (!Number.isInteger(qty) || qty < 1) {
          throw new BadRequestException(
            `La cantidad para "${it.title}" debe ser un entero mayor o igual a 1.`,
          );
        }

        if (it.productId) {
          const product = await queryRunner.manager.findOne(Product, {
            where: { id: it.productId },
            lock: { mode: 'pessimistic_write' },
            loadEagerRelations: false,
          });

          if (!product) {
            throw new BadRequestException(
              `El producto "${it.title}" (${it.productId}) no existe.`,
            );
          }

          const currentStock = Number(product.stock) || 0;
          if (currentStock < qty) {
            throw new BadRequestException(
              `Stock insuficiente para "${product.title}" (disponible: ${currentStock}, solicitado: ${qty}).`,
            );
          }

          const newStock = currentStock - qty;
          await queryRunner.manager.update(Product, product.id, { stock: newStock });
          this.logger.log(
            `[Stock] Producto '${product.title}' stock actualizado: ${currentStock} -> ${newStock}`,
          );
        }

        const itemSubtotal = Number((Number(it.price) * qty).toFixed(2));
        const orderItem = queryRunner.manager.create(OrderItem, {
          order: savedOrder,
          productId: it.productId || null,
          productTitle: it.title,
          productSku: it.sku || null,
          productImageUrl: it.imageUrl || null,
          quantity: qty,
          unitPrice: Number(it.price),
          subtotal: itemSubtotal,
        });

        const savedItem = await queryRunner.manager.save(OrderItem, orderItem);
        orderItems.push(savedItem);
      }

      if (
        savedOrder.paymentStatus === 'paid' &&
        (savedOrder.paymentMethod || '').toLowerCase().includes('efectivo')
      ) {
        await this.cashRegisterService.registerCashSale(
          Number(savedOrder.total) || 0,
          queryRunner.manager,
        );
      }

      await queryRunner.commitTransaction();
      savedOrder.items = orderItems;

      this.logger.log(
        `[Orders] Pedido #${savedOrder.orderNumber} guardado con éxito. ID: ${savedOrder.id}`,
      );

      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query?: {
    environment?: string;
    status?: string;
    search?: string;
    email?: string;
    docNumber?: string;
  }): Promise<Order[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (query?.environment) {
      qb.andWhere('order.environment = :env', { env: query.environment });
    }

    if (query?.status && query.status !== 'all') {
      qb.andWhere('order.orderStatus = :status', { status: query.status });
    }

    if (query?.email && query.email.trim() !== '') {
      qb.andWhere('LOWER(order.customerEmail) = LOWER(:email)', {
        email: query.email.trim(),
      });
    }

    if (query?.docNumber && query.docNumber.trim() !== '') {
      qb.andWhere('order.docNumber = :docNumber', {
        docNumber: query.docNumber.trim(),
      });
    }

    if (query?.search && query.search.trim() !== '') {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(order.orderNumber) LIKE :term OR LOWER(order.customerName) LIKE :term OR LOWER(order.customerEmail) LIKE :term OR LOWER(order.docNumber) LIKE :term)',
        { term },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Order> {
    const cleanId = id.trim().replace(/^#/, '');

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items');

    // Comprobar si es un UUID válido
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    if (isUuid) {
      qb.where('order.id = :cleanId', { cleanId });
    } else {
      qb.where('UPPER(order.orderNumber) = UPPER(:cleanId)', { cleanId });
    }

    const order = await qb.getOne();

    if (!order) {
      throw new NotFoundException(`Pedido con identificador '${id}' no encontrado.`);
    }

    return order;
  }

  async trackByOrderNumber(orderNumber: string) {
    const cleanCode = orderNumber.trim().replace(/^#/, '');

    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where(
        'UPPER(order.orderNumber) = UPPER(:cleanCode) OR UPPER(COALESCE(order.culqiReferenceCode, \'\')) = UPPER(:cleanCode)',
        { cleanCode },
      )
      .getOne();

    if (!order) {
      throw new NotFoundException(
        `Pedido con identificador '${orderNumber}' no encontrado.`,
      );
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
      currencySymbol: order.currencySymbol,
      department: order.department,
      province: order.province,
      district: order.district,
      address: order.address,
      reference: order.reference,
      invoiceType: order.invoiceType,
      invoiceSeries: order.invoiceSeries,
      invoiceNumber: order.invoiceNumber,
      invoicePdfUrl: order.invoicePdfUrl,
      invoiceSunatStatus: order.invoiceSunatStatus,
      items: order.items,
    };
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    if (
      !VALID_ORDER_STATUSES.includes(
        status as (typeof VALID_ORDER_STATUSES)[number],
      )
    ) {
      throw new BadRequestException(`Estado de pedido inválido: '${status}'.`);
    }

    const existing = await this.findOne(id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: existing.id },
        relations: { items: true },
      });

      if (!order) {
        throw new NotFoundException(`Pedido con identificador '${id}' no encontrado.`);
      }

      const previousStatus = order.orderStatus;
      if (previousStatus === status) {
        await queryRunner.commitTransaction();
        return order;
      }

      const isCancelling = previousStatus !== 'cancelled' && status === 'cancelled';
      const isReactivating = previousStatus === 'cancelled' && status !== 'cancelled';

      if (isCancelling || isReactivating) {
        for (const item of order.items || []) {
          if (!item.productId) continue;

          const product = await queryRunner.manager.findOne(Product, {
            where: { id: item.productId },
            lock: { mode: 'pessimistic_write' },
            loadEagerRelations: false,
          });

          if (!product) {
            if (isReactivating) {
              throw new BadRequestException(
                `No se puede reactivar el pedido porque el producto "${item.productTitle}" ya no existe.`,
              );
            }
            continue;
          }

          const currentStock = Number(product.stock) || 0;
          const qty = Number(item.quantity) || 0;

          if (isCancelling) {
            const restoredStock = currentStock + qty;
            await queryRunner.manager.update(Product, product.id, {
              stock: restoredStock,
            });
            this.logger.log(
              `[Stock] Cancelación pedido #${order.orderNumber}: '${product.title}' ${currentStock} -> ${restoredStock}`,
            );
          } else {
            if (currentStock < qty) {
              throw new BadRequestException(
                `No se puede reactivar el pedido: stock insuficiente para "${product.title}" (disponible: ${currentStock}, requerido: ${qty}).`,
              );
            }
            const updatedStock = currentStock - qty;
            await queryRunner.manager.update(Product, product.id, {
              stock: updatedStock,
            });
            this.logger.log(
              `[Stock] Reactivación pedido #${order.orderNumber}: '${product.title}' ${currentStock} -> ${updatedStock}`,
            );
          }
        }
      }

      await queryRunner.manager.update(Order, order.id, { orderStatus: status });
      await queryRunner.commitTransaction();

      order.orderStatus = status;
      return order;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
