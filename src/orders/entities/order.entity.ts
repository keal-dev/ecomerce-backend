import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'order_number' })
  orderNumber: string;

  @Column({ type: 'varchar', length: 20, default: 'test' })
  environment: string; // 'test' | 'production'

  @Column({ type: 'varchar', length: 255, name: 'customer_name' })
  customerName: string;

  @Column({ type: 'varchar', length: 255, name: 'customer_email' })
  customerEmail: string;

  @Column({ type: 'varchar', length: 50, name: 'customer_phone' })
  customerPhone: string;

  @Column({ type: 'varchar', length: 20, default: 'DNI', name: 'doc_type' })
  docType: string;

  @Column({ type: 'varchar', length: 50, name: 'doc_number' })
  docNumber: string;

  @Column({ type: 'varchar', length: 100 })
  department: string;

  @Column({ type: 'varchar', length: 100 })
  province: string;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0,
    },
  })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'shipping_cost',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0,
    },
  })
  shippingCost: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0,
    },
  })
  total: number;

  @Column({ type: 'varchar', length: 10, default: 'S/', name: 'currency_symbol' })
  currencySymbol: string;

  @Column({ type: 'varchar', length: 50, name: 'payment_method' })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 30, default: 'paid', name: 'payment_status' })
  paymentStatus: string; // 'paid' | 'pending' | 'failed'

  @Column({ type: 'varchar', length: 30, default: 'pending', name: 'order_status' })
  orderStatus: string; // 'pending' | 'shipping' | 'delivered' | 'cancelled'

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'culqi_charge_id' })
  culqiChargeId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'culqi_reference_code' })
  culqiReferenceCode: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'invoice_type' })
  invoiceType: string | null; // 'boleta' | 'factura'

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'company_ruc' })
  companyRuc: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'company_legal_name' })
  companyLegalName: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'invoice_series' })
  invoiceSeries: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'invoice_number' })
  invoiceNumber: string | null;

  @Column({ type: 'text', nullable: true, name: 'invoice_pdf_url' })
  invoicePdfUrl: string | null;

  @Column({ type: 'text', nullable: true, name: 'invoice_xml_url' })
  invoiceXmlUrl: string | null;

  @Column({ type: 'text', nullable: true, name: 'invoice_cdr_url' })
  invoiceCdrUrl: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'invoice_sunat_status' })
  invoiceSunatStatus: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'invoice_environment' })
  invoiceEnvironment: string | null; // 'demo' | 'production'

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

