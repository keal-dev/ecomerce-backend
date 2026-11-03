import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('ubigeos')
export class Ubigeo {
  @PrimaryColumn({ type: 'varchar', length: 6 })
  code: string; // Código oficial INEI de 6 dígitos (ej. "150101" para Lima Cercado)

  @Column({ type: 'varchar', length: 100 })
  department: string; // Nombre del departamento (ej. "LIMA")

  @Column({ type: 'varchar', length: 100 })
  province: string; // Nombre de la provincia (ej. "LIMA")

  @Column({ type: 'varchar', length: 100 })
  district: string; // Nombre del distrito (ej. "MIRAFLORES")

  @Index()
  @Column({ type: 'varchar', length: 2 })
  departmentCode: string; // Primeros 2 dígitos (ej. "15")

  @Index()
  @Column({ type: 'varchar', length: 4 })
  provinceCode: string; // Primeros 4 dígitos (ej. "1501")

  @Column({ type: 'varchar', length: 6, nullable: true })
  reniecCode?: string; // Código RENIEC si difiere del INEI

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName?: string; // "LIMA - LIMA - MIRAFLORES" para autocompletado y búsqueda rápida
}
