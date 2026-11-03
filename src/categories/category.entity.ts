import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  href: string;

  @Column({ type: 'text', nullable: true })
  icon?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  badge?: string;
}
