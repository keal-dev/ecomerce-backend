import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, default: 'Banner' })
  title: string;

  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'link_url' })
  linkUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: 'image', name: 'link_mode' })
  linkMode: 'image' | 'button';

  @Column({ type: 'varchar', length: 60, nullable: true, name: 'button_text' })
  buttonText: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'bottom-left',
    name: 'button_position',
  })
  buttonPosition: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center';

  @Column({ type: 'varchar', length: 50, default: 'hero' })
  type: string; // 'hero', 'announcement', 'promo'

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
