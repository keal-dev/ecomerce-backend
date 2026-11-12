import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/product.entity';

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
  ) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
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

    const order = this.orderRepository.create({
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

    const savedOrder = await this.orderRepository.save(order);

    // Guardar items y descontar stock
    if (input.items && input.items.length > 0) {
      const orderItems: OrderItem[] = [];

      for (const it of input.items) {
        const itemSubtotal = Number(it.price) * Number(it.quantity);

        const orderItem = this.orderItemRepository.create({
          order: savedOrder,
          productId: it.productId || null,
          productTitle: it.title,
          productSku: it.sku || null,
          productImageUrl: it.imageUrl || null,
          quantity: it.quantity,
          unitPrice: it.price,
          subtotal: itemSubtotal,
        });

        const savedItem = await this.orderItemRepository.save(orderItem);
        orderItems.push(savedItem);

        // Descontar stock del producto si existe
        if (it.productId) {
          try {
            const product = await this.productRepository.findOne({
              where: { id: it.productId },
            });
            if (product && typeof product.stock === 'number') {
              const newStock = Math.max(0, product.stock - it.quantity);
              await this.productRepository.update(product.id, { stock: newStock });
              this.logger.log(
                `[Stock] Producto '${product.title}' stock actualizado: ${product.stock} -> ${newStock}`,
              );
            }
          } catch (err: any) {
            this.logger.warn(
              `[Stock] No se pudo actualizar el stock del producto ${it.productId}: ${err.message}`,
            );
          }
        }
      }

      savedOrder.items = orderItems;
    }

    this.logger.log(
      `[Orders] Pedido #${savedOrder.orderNumber} guardado con éxito. ID: ${savedOrder.id}`,
    );

    return savedOrder;
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

  async updateStatus(id: string, status: string): Promise<Order> {
    const order = await this.findOne(id);
    order.orderStatus = status;
    return this.orderRepository.save(order);
  }
}
