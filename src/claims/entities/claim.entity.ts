import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ClaimStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
}

@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @Column({ type: 'boolean', default: false, name: 'is_minor' })
  isMinor: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'tutor_name' })
  tutorName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'tutor_doc_type' })
  tutorDocType: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tutor_doc_number' })
  tutorDocNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tutor_phone' })
  tutorPhone: string | null;

  @Column({ type: 'varchar', length: 20, default: 'DNI', name: 'doc_type' })
  docType: string;

  @Column({ type: 'varchar', length: 50, name: 'doc_number' })
  docNumber: string;

  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100 })
  department: string;

  @Column({ type: 'varchar', length: 100 })
  province: string;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 20, default: 'producto', name: 'contract_type' })
  contractType: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'claimed_amount',
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value !== null ? parseFloat(value) : null),
    },
  })
  claimedAmount: number | null;

  @Column({ type: 'varchar', length: 60, nullable: true, name: 'order_number' })
  orderNumber: string | null;

  @Column({ type: 'text', name: 'contract_description' })
  contractDescription: string;

  @Column({ type: 'varchar', length: 20, default: 'reclamo', name: 'claim_type' })
  claimType: string;

  @Column({ type: 'text', name: 'claim_detail' })
  claimDetail: string;

  @Column({ type: 'text', name: 'claim_request' })
  claimRequest: string;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.PENDING,
  })
  status: ClaimStatus;

  @Column({ type: 'text', nullable: true, name: 'admin_response' })
  adminResponse: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'responded_at' })
  respondedAt: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'responded_by_id' })
  respondedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
