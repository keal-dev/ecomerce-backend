import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('company')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, default: 'MercadoAdmin' })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'legal_name' })
  legalName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tax_id' })
  taxId?: string;

  @Column({ type: 'text', nullable: true, name: 'logo_url' })
  logoUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'logo_public_id' })
  logoPublicId?: string;

  @Column({ type: 'varchar', length: 20, default: '#ffe600', name: 'primary_color' })
  primaryColor: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slogan?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 20, default: 'PEN' })
  currency: string;

  @Column({ type: 'varchar', length: 10, default: 'S/', name: 'currency_symbol' })
  currencySymbol: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'facebook_url' })
  facebookUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'instagram_url' })
  instagramUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'tiktok_url' })
  tiktokUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
